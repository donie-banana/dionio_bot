const sqlite3 = require('sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');

let connection = null;
let activeDbType = null;

// Cache normalized SQL per DB type to avoid repeated parsing work.
const sqlCache = new Map();

const getDbType = () => (process.env.DB_TYPE || 'sqlite').toLowerCase();

const initDatabase = async () => {
  if (connection) return connection;

  activeDbType = getDbType();

  try {
    if (activeDbType === 'sqlite') {
      connection = await initSQLite();
      console.log('✓ Connected to SQLite database');
    } else if (activeDbType === 'mysql') {
      connection = await initMySQL();
      console.log('✓ Connected to MySQL database');
    } else if (activeDbType === 'postgres') {
      connection = await initPostgres();
      console.log('✓ Connected to PostgreSQL database');
    } else {
      throw new Error(`Unsupported database type: ${activeDbType}`);
    }
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    process.exit(1);
  }

  return connection;
};

const initSQLite = () => new Promise((resolve, reject) => {
  const dbPath = path.join(__dirname, 'bot.db');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      reject(err);
      return;
    }

    db.run('PRAGMA foreign_keys = ON', (fkErr) => {
      if (fkErr) reject(fkErr);
      else resolve(db);
    });
  });
});

const initMySQL = async () => mysql.createConnection({
  host: process.env.DB_HOSTNAME || 'localhost',
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
});

const initPostgres = async () => {
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.DB_HOSTNAME || 'localhost',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });

  await client.connect();
  return client;
};

const convertQuestionParamsToPostgres = (sql) => {
  let out = '';
  let index = 1;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';

    if (ch === "'" && !inDouble && prev !== '\\') {
      inSingle = !inSingle;
      out += ch;
      continue;
    }

    if (ch === '"' && !inSingle && prev !== '\\') {
      inDouble = !inDouble;
      out += ch;
      continue;
    }

    if (ch === '?' && !inSingle && !inDouble) {
      out += `$${index}`;
      index += 1;
      continue;
    }

    out += ch;
  }

  return out;
};

const normalizeSqlForDriver = (dbType, sql) => {
  const cacheKey = `${dbType}::${sql}`;
  const cached = sqlCache.get(cacheKey);
  if (cached) return cached;

  let normalized = sql;
  const hadInsertIgnore = /\bINSERT\s+IGNORE\s+INTO\b/i.test(sql);

  if (dbType === 'postgres') {
    normalized = convertQuestionParamsToPostgres(normalized);
    normalized = normalized.replace(/`([^`]+)`/g, '"$1"');
    normalized = normalized.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT INTO');

    if (hadInsertIgnore && /\bON\s+CONFLICT\b/i.test(normalized) === false) {
      // Best-effort compatibility for MySQL-style INSERT IGNORE usage.
      normalized = normalized.replace(/;\s*$/, '');
      normalized += ' ON CONFLICT DO NOTHING';
    }
  }

  if (dbType === 'sqlite') {
    normalized = normalized.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
    normalized = normalized.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT OR IGNORE INTO');
  }

  sqlCache.set(cacheKey, normalized);
  return normalized;
};

const normalizeParamsForDriver = (dbType, params) => {
  if (!Array.isArray(params) || params.length === 0) return [];

  if (dbType === 'sqlite' || dbType === 'mysql') {
    return params.map((value) => {
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value;
    });
  }

  return params;
};

const ensureConnection = async () => {
  if (!connection) await initDatabase();
  return connection;
};

const isReadQuery = (sql) => /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);

const querySqlite = (db, sql, params) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const executeSqlite = (db, sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) {
      reject(err);
      return;
    }

    resolve({
      affectedRows: this.changes,
      lastInsertId: this.lastID,
    });
  });
});

const sql = async (rawSql, params = []) => {
  const db = await ensureConnection();
  const dbType = activeDbType || getDbType();
  const normalizedSql = normalizeSqlForDriver(dbType, rawSql);
  const normalizedParams = normalizeParamsForDriver(dbType, params);

  if (dbType === 'sqlite') {
    if (isReadQuery(normalizedSql)) {
      return querySqlite(db, normalizedSql, normalizedParams);
    }
    return executeSqlite(db, normalizedSql, normalizedParams);
  }

  if (dbType === 'mysql') {
    const [rows] = await db.execute(normalizedSql, normalizedParams);
    return rows;
  }

  if (dbType === 'postgres') {
    const result = await db.query(normalizedSql, normalizedParams);
    if (isReadQuery(normalizedSql)) return result.rows;
    return {
      affectedRows: result.rowCount,
      rows: result.rows,
    };
  }

  throw new Error(`Unsupported database type: ${dbType}`);
};

const query = async (rawSql, params = []) => {
  const rows = await sql(rawSql, params);
  return Array.isArray(rows) ? rows : rows.rows || [];
};

const execute = async (rawSql, params = []) => {
  const result = await sql(rawSql, params);
  if (Array.isArray(result)) {
    return {
      affectedRows: 0,
      rows: result,
    };
  }
  return result;
};

const closeDatabase = async () => {
  if (!connection) return;

  if (activeDbType === 'sqlite') {
    await new Promise((resolve, reject) => {
      connection.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } else if (activeDbType === 'mysql') {
    await connection.end();
  } else if (activeDbType === 'postgres') {
    await connection.end();
  }

  connection = null;
};

const getConnection = () => connection;

module.exports = {
  initDatabase,
  closeDatabase,
  getConnection,
  query,
  execute,
  sql,
};
