const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bot.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON', (err) => {
  if (err) console.error('Error enabling foreign keys:', err);
});

const tableStatements = [
  `
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      server_name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      icon_url TEXT,
      created_at DATETIME NOT NULL,
      joined_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      is_active TINYINT DEFAULT 1
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      channel_type TEXT,
      description TEXT,
      position INTEGER,
      last_message TEXT,
      is_active TINYINT DEFAULT 1,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (last_message) REFERENCES messages(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      position INTEGER,
      permissions TEXT,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (server_id) REFERENCES servers(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT,
      global_name TEXT,
      avatar_url TEXT,
      bot TINYINT DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      last_seen DATETIME
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS server_members (
      member_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      joined_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (member_id, server_id),
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (server_id) REFERENCES servers(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS member_roles (
      member_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (member_id, server_id, role_id),
      FOREIGN KEY (member_id, server_id) REFERENCES server_members(member_id, server_id),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      og_id TEXT,
      content TEXT NOT NULL,
      is_edited TINYINT DEFAULT 0,
      is_deleted TINYINT DEFAULT 0,
      created_at DATETIME NOT NULL,
      edited_at DATETIME,
      reply_to TEXT,
      attachment TEXT,
      FOREIGN KEY (server_id) REFERENCES servers(id),
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      FOREIGN KEY (user_id, server_id) REFERENCES server_members(member_id, server_id),
      FOREIGN KEY (og_id) REFERENCES messages(id),
      FOREIGN KEY (reply_to) REFERENCES messages(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      is_deleted TINYINT DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      is_active TINYINT DEFAULT 1,
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (user_id) REFERENCES members(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS afk (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      since DATETIME NOT NULL,
      until DATETIME,
      FOREIGN KEY (user_id, server_id) REFERENCES server_members(member_id, server_id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS auto_kick_rules (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      turned_on TINYINT DEFAULT 1,
      allowed_roles TEXT,
      cooldown INTEGER,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (server_id) REFERENCES servers(id)
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS auto_kick_blacklist (
      id TEXT PRIMARY KEY,
      type TINYINT NOT NULL,
      reference_id TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS auto_kick_whitelist (
      id TEXT PRIMARY KEY,
      type TINYINT NOT NULL,
      reference_id TEXT NOT NULL
    )
  `,
];

const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let pending = tableStatements.length;

      tableStatements.forEach((statement, index) => {
        db.run(statement, (err) => {
          if (err) {
            console.error(`Error creating table ${index + 1}:`, err);
            reject(err);
            return;
          }

          pending -= 1;

          if (pending === 0) {
            console.log('✓ All tables created successfully');
            resolve();
          }
        });
      });
    });
  });
};

initDatabase()
  .then(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database initialized and connection closed');
      }
    });
  })
  .catch((err) => {
    console.error('Initialization failed:', err);
    process.exit(1);
  });
