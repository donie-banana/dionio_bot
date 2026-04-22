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

const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Servers table
      db.run(`
        CREATE TABLE IF NOT EXISTS servers (
          id TEXT PRIMARY KEY,
          server_name TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          icon_url TEXT,
          created_at DATETIME NOT NULL,
          joined_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          is_active BOOLEAN DEFAULT 1
        )
      `, (err) => {
        if (err) console.error('Error creating servers table:', err);
      });

      // Channels table
      db.run(`
        CREATE TABLE IF NOT EXISTS channels (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          name TEXT NOT NULL,
          channel_type TEXT,
          description TEXT,
          position INTEGER,
          total_messages INTEGER DEFAULT 0,
          last_message TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          FOREIGN KEY (server_id) REFERENCES servers(id),
          FOREIGN KEY (last_message) REFERENCES messages(id)
        )
      `, (err) => {
        if (err) console.error('Error creating channels table:', err);
      });

      // Roles table
      db.run(`
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
      `, (err) => {
        if (err) console.error('Error creating roles table:', err);
      });

      // Members table
      db.run(`
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          username TEXT NOT NULL,
          display_name TEXT,
          global_name TEXT,
          avatar_url TEXT,
          bot BOOLEAN DEFAULT 0,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          last_seen DATETIME,
          FOREIGN KEY (server_id) REFERENCES servers(id)
        )
      `, (err) => {
        if (err) console.error('Error creating members table:', err);
      });

      // Member_roles junction table
      db.run(`
        CREATE TABLE IF NOT EXISTS member_roles (
          member_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          PRIMARY KEY (member_id, role_id),
          FOREIGN KEY (member_id) REFERENCES members(id),
          FOREIGN KEY (role_id) REFERENCES roles(id)
        )
      `, (err) => {
        if (err) console.error('Error creating member_roles table:', err);
      });

      // Messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          channel_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          og_id TEXT,
          content TEXT NOT NULL,
          is_edited BOOLEAN DEFAULT 0,
          is_deleted BOOLEAN,
          created_at DATETIME NOT NULL,
          edited_at DATETIME,
          FOREIGN KEY (channel_id) REFERENCES channels(id),
          FOREIGN KEY (user_id) REFERENCES members(id),
          FOREIGN KEY (og_id) REFERENCES messages(id)
        )
      `, (err) => {
        if (err) console.error('Error creating messages table:', err);
      });

      // AFK table
      db.run(`
        CREATE TABLE IF NOT EXISTS afk (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          since DATETIME NOT NULL,
          until DATETIME,
          FOREIGN KEY (user_id) REFERENCES members(id)
        )
      `, (err) => {
        if (err) console.error('Error creating afk table:', err);
      });

      // Auto_kick_rules table
      db.run(`
        CREATE TABLE IF NOT EXISTS auto_kick_rules (
          id TEXT PRIMARY KEY,
          server_id TEXT NOT NULL,
          turned_on BOOLEAN DEFAULT 1,
          allowed_roles TEXT,
          cooldown INTEGER,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          FOREIGN KEY (server_id) REFERENCES servers(id)
        )
      `, (err) => {
        if (err) console.error('Error creating auto_kick_rules table:', err);
      });

      // Auto_kick_blacklist table
      db.run(`
        CREATE TABLE IF NOT EXISTS auto_kick_blacklist (
          id TEXT PRIMARY KEY,
          type TINYINT NOT NULL,
          reference_id TEXT NOT NULL
        )
      `, (err) => {
        if (err) console.error('Error creating auto_kick_blacklist table:', err);
      });

      // Auto_kick_whitelist table
      db.run(`
        CREATE TABLE IF NOT EXISTS auto_kick_whitelist (
          id TEXT PRIMARY KEY,
          type TINYINT NOT NULL,
          reference_id TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating auto_kick_whitelist table:', err);
          reject(err);
        } else {
          console.log('✓ All tables created successfully');
          resolve();
        }
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
