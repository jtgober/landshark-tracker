import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// Use DATABASE_PATH if set (e.g. on Render with a persistent disk), otherwise
// a path under process.cwd() so the DB works when run from dist/ on any host
const dbDir = process.env.DATABASE_PATH
  ? path.dirname(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data');
const dbFile = process.env.DATABASE_PATH ?? path.join(dbDir, 'database.sqlite');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = createClient({
  url: `file:${dbFile}`,
});

export const databasePath = dbFile
export const isPersistent = Boolean(process.env.DATABASE_PATH)

export const initDb = async () => {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatarColor TEXT NOT NULL,
      status TEXT NOT NULL,
      lastAction TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      event_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      status TEXT NOT NULL,
      PRIMARY KEY (event_id, member_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      avatar_url TEXT
    );

    CREATE TABLE IF NOT EXISTS user_attendance (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_locations (
      user_id TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Lightweight migration: ensure avatar columns exist on existing databases
  try {
    const usersInfo = await db.execute(
      "SELECT name FROM pragma_table_info('users') WHERE name = 'avatar_url'",
    );
    if (usersInfo.rows.length === 0) {
      await db.execute('ALTER TABLE users ADD COLUMN avatar_url TEXT');
    }
    const avatarUpdatedInfo = await db.execute(
      "SELECT name FROM pragma_table_info('users') WHERE name = 'avatar_updated_at'",
    );
    if (avatarUpdatedInfo.rows.length === 0) {
      await db.execute('ALTER TABLE users ADD COLUMN avatar_updated_at TEXT');
    }
    const phoneInfo = await db.execute(
      "SELECT name FROM pragma_table_info('users') WHERE name = 'phone'",
    );
    if (phoneInfo.rows.length === 0) {
      await db.execute('ALTER TABLE users ADD COLUMN phone TEXT');
    }
  } catch {
    // If this fails, we just skip; app will fall back to default avatar
  }

  // One-time cleanup of original dummy member/activity rows
  try {
    await db.executeMultiple(`
      DELETE FROM attendance WHERE member_id IN ('m1','m2','m3');
      DELETE FROM members WHERE id IN ('m1','m2','m3');
      DELETE FROM activity WHERE id IN ('a1','a2','a3');
    `);
  } catch {
    // Safe to ignore if these rows never existed
  }

  // Seed default data only when BOTH members and events are empty.
  // This avoids UNIQUE constraint errors if events were already created earlier.
  const membersCount = await db.execute('SELECT COUNT(*) as count FROM members');
  const eventsCount = await db.execute('SELECT COUNT(*) as count FROM events');
  if (
    Number(membersCount.rows[0].count) === 0 &&
    Number(eventsCount.rows[0].count) === 0
  ) {
    console.log('Seeding default data...');
    
    await db.executeMultiple(`
      INSERT INTO members (id, name, avatarColor, status, lastAction) VALUES 
      ('m1', 'Jordan Lee', '#ffb703', 'in', 'Checked in 3 min ago'),
      ('m2', 'Sam Patel', '#219ebc', 'out', 'Checked out 20 min ago'),
      ('m3', 'Alex Kim', '#ff6b6b', 'in', 'Checked in 1 hr ago');

      INSERT INTO activity (id, time, description, type) VALUES 
      ('a1', '2:14 PM', 'Jordan checked in', 'in'),
      ('a2', '1:58 PM', 'Sam checked out', 'out'),
      ('a3', '1:20 PM', 'Alex checked in', 'out');

      INSERT INTO events (id, name, date, time, location, type, description) VALUES 
      ('e1', 'Sunrise Harbor Ride', 'Sat · Mar 21', '6:15 AM', 'Harbor Lot B → Coastal Loop', 'cycling', 'Easy-paced 30km coastal spin with coffee stop after.'),
      ('e2', 'Open Water Swim Set', 'Tue · Mar 24', '5:45 PM', 'North Pier Beach', 'swimming', 'Buoy-to-buoy intervals with kayak support on the course.');
      
      INSERT INTO attendance (event_id, member_id, status) VALUES 
      ('e1', 'm1', 'out'), ('e1', 'm2', 'out'), ('e1', 'm3', 'out'),
      ('e2', 'm1', 'out'), ('e2', 'm2', 'out'), ('e2', 'm3', 'out');
    `);
  }
};
