/**
 * SQLite-backed credential store.
 *
 * Deliberately simple on purpose: passwords are salted + SHA-256 hashed and
 * sessions are random opaque tokens, both stored in a single SQLite database
 * that lives entirely inside this project. Nothing here touches a network.
 *
 * The database file is created next to the app as `nexus-auth.db` (gitignored)
 * the first time any auth code runs.
 */
import Database from "better-sqlite3";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";

const DB_PATH =
  process.env.AUTH_DB_PATH ?? path.join(process.cwd(), "nexus-auth.db");

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  return _db;
}

/* ── password hashing (salted SHA-256 — deliberately not fancy) ──────────── */

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

/* ── types ────────────────────────────────────────────────────────────────── */

export interface User {
  id: string;
  email: string;
  name: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name };
}

/* ── public API ───────────────────────────────────────────────────────────── */

export function createUser(
  email: string,
  name: string,
  password: string,
): User {
  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  // The salt is embedded in the stored hash (salt:hex) so verify can split it.
  db()
    .prepare(
      "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
    )
    .run(id, normalizeEmail(email), name.trim() || email, `${salt}:${hashPassword(password, salt)}`);
  return { id, email: normalizeEmail(email), name: name.trim() || email };
}

export function findUserByEmail(email: string): User | null {
  const row = db()
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(normalizeEmail(email)) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function verifyCredentials(email: string, password: string): User | null {
  const row = db()
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(normalizeEmail(email)) as UserRow | undefined;
  if (!row) return null;
  const [salt, hash] = row.password_hash.split(":");
  if (!salt || !hash) return null;
  const candidate = hashPassword(password, salt);
  if (candidate !== hash) return null;
  return toUser(row);
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("hex");
  db().prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  return token;
}

export function userForToken(token: string): User | null {
  const row = db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.password_hash
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function destroySession(token: string): void {
  db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
