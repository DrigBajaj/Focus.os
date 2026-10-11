import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import util from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

const scryptAsync = util.promisify(crypto.scrypt);

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  study_major: string;
  daily_goal_minutes: number;
  created_at: number;
  updated_at: number;
}

export interface SafeUser {
  id: string;
  username: string;
  name: string;
  email: string;
  studyMajor: string;
  dailyGoalMinutes: number;
  createdAt: number;
}

export interface SessionRecord {
  token: string;
  user_id: string;
  created_at: number;
  expires_at: number;
  user_agent?: string;
}

export interface TaskRecord {
  id: string;
  user_id: string;
  title: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  deadline: string;
  estimated_minutes: number;
  remaining_minutes: number | null;
  stamina_points: number;
  completed: number;
  category: 'academic' | 'project' | 'life' | 'wellness';
  status: 'pending' | 'in_progress' | 'interrupted' | 'postponed' | 'completed';
  postpone_count: number;
  last_postponed_at: number | null;
  interrupted_at: number | null;
  actual_minutes_spent: number;
  last_interruption_elapsed: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface SubtaskRecord {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  estimated_minutes: number;
  stamina_points: number;
  completed: number;
  sort_order: number;
}

export interface RoutineRecord {
  id: string;
  user_id: string;
  title: string;
  time_of_day: 'morning' | 'afternoon' | 'evening';
  icon_name: string;
  streak: number;
  completed_today: number;
  stamina_reward: number;
  created_at: number;
}

export interface CompanionDataRecord {
  user_id: string;
  available_minutes: number;
  pet_data: string;
  activity_log: string;
  scratchpad: string | null;
  updated_at: number;
}

// ---------------------------------------------------------------------------
// Security & Cryptographic Helpers using crypto.scrypt
// ---------------------------------------------------------------------------

/**
 * Hash password asynchronously using Node.js crypto.scrypt with a 128-bit random salt
 */
export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return { salt, hash: derivedKey.toString('hex') };
}

/**
 * Synchronous hash password helper using crypto.scryptSync
 */
export function hashPasswordSync(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

/**
 * Timing-safe password verification using async crypto.scrypt to protect against timing attacks
 */
export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (derivedKey.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Synchronous timing-safe password verification using crypto.scryptSync
 */
export function verifyPasswordSync(
  password: string,
  salt: string,
  expectedHash: string
): boolean {
  try {
    const actualHash = crypto.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (actualHash.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(actualHash, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Generate cryptographically random 256-bit session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 hex characters
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateRegistrationInput(body: any): ValidationResult {
  const errors: Record<string, string> = {};

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const studyMajor = typeof body.studyMajor === 'string' ? body.studyMajor.trim() : '';
  const dailyGoalMinutes = Number(body.dailyGoalMinutes);

  // Username validation: 3-30 characters, alphanumeric + underscore + hyphen
  if (!username) {
    errors.username = 'Username is required.';
  } else if (username.length < 3 || username.length > 30) {
    errors.username = 'Username must be between 3 and 30 characters.';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.username = 'Username can only contain letters, numbers, underscores, and hyphens.';
  }

  // Name validation: 2-50 characters
  if (!name) {
    errors.name = 'Full name is required.';
  } else if (name.length < 2 || name.length > 50) {
    errors.name = 'Name must be between 2 and 50 characters.';
  }

  // Email validation: standard email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!emailRegex.test(email) || email.length > 120) {
    errors.email = 'Please provide a valid email address.';
  }

  // Password validation: at least 6 characters
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters long.';
  } else if (password.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  }

  // Optional daily goal validation
  if (body.dailyGoalMinutes !== undefined && (isNaN(dailyGoalMinutes) || dailyGoalMinutes < 5 || dailyGoalMinutes > 720)) {
    errors.dailyGoalMinutes = 'Daily focus goal must be between 5 and 720 minutes.';
  }

  // Optional study major length
  if (studyMajor && studyMajor.length > 100) {
    errors.studyMajor = 'Field of study cannot exceed 100 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLoginInput(body: any): ValidationResult {
  const errors: Record<string, string> = {};

  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identifier) {
    errors.identifier = 'Username or email is required.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Database Class
// ---------------------------------------------------------------------------

export class DatabaseService {
  private db: DatabaseSync;

  constructor(dbPath: string = path.resolve(process.cwd(), 'focus_os.sqlite')) {
    // If directory doesn't exist, create it
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.initTables();
    this.seedDemoUsers();
  }

  private initTables(): void {
    // Enable WAL mode & foreign keys
    this.db.exec('PRAGMA foreign_keys = ON;');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        study_major TEXT DEFAULT 'General Studies',
        daily_goal_minutes INTEGER DEFAULT 45,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        user_agent TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        priority TEXT NOT NULL,
        deadline TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        remaining_minutes INTEGER,
        stamina_points INTEGER NOT NULL DEFAULT 1,
        completed INTEGER NOT NULL DEFAULT 0,
        category TEXT NOT NULL DEFAULT 'academic',
        status TEXT NOT NULL DEFAULT 'pending',
        postpone_count INTEGER NOT NULL DEFAULT 0,
        last_postponed_at INTEGER,
        interrupted_at INTEGER,
        actual_minutes_spent INTEGER NOT NULL DEFAULT 0,
        last_interruption_elapsed INTEGER,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

      CREATE TABLE IF NOT EXISTS subtasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL DEFAULT 10,
        stamina_points INTEGER NOT NULL DEFAULT 1,
        completed INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);

      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        time_of_day TEXT NOT NULL,
        icon_name TEXT NOT NULL DEFAULT 'sparkles',
        streak INTEGER NOT NULL DEFAULT 0,
        completed_today INTEGER NOT NULL DEFAULT 0,
        stamina_reward INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_routines_user_id ON routines(user_id);

      CREATE TABLE IF NOT EXISTS user_companion_data (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        available_minutes INTEGER NOT NULL DEFAULT 30,
        pet_data TEXT NOT NULL,
        activity_log TEXT NOT NULL,
        scratchpad TEXT,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  private seedDemoUsers(): void {
    const demoUsers = [
      {
        id: 'usr-demo-0',
        username: 'student',
        name: 'Taylor Reed (Newbie)',
        email: 'student@study.local',
        password: 'password123',
        studyMajor: 'Cognitive Science & Psychology',
        dailyGoalMinutes: 30,
      },
      {
        id: 'usr-demo-1',
        username: 'alex',
        name: 'Alex Chen',
        email: 'alex@example.com',
        password: 'password123',
        studyMajor: 'Computer Science (B.Tech)',
        dailyGoalMinutes: 60,
      },
      {
        id: 'usr-demo-2',
        username: 'sam',
        name: 'Sam Rivera',
        email: 'sam@example.com',
        password: 'password123',
        studyMajor: 'Design & Engineering',
        dailyGoalMinutes: 45,
      },
    ];

    const checkStmt = this.db.prepare('SELECT id FROM users WHERE id = ?');
    const insertStmt = this.db.prepare(`
      INSERT INTO users (id, username, name, email, password_hash, password_salt, study_major, daily_goal_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const demo of demoUsers) {
      const existing = checkStmt.get(demo.id);
      if (!existing) {
        const { salt, hash } = hashPasswordSync(demo.password);
        const now = Date.now();
        insertStmt.run(
          demo.id,
          demo.username,
          demo.name,
          demo.email,
          hash,
          salt,
          demo.studyMajor,
          demo.dailyGoalMinutes,
          now,
          now
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // User Management
  // -------------------------------------------------------------------------

  public findUserById(id: string): UserRecord | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id);
    return (row as unknown as UserRecord) || null;
  }

  public findUserByUsernameOrEmail(identifier: string): UserRecord | null {
    const clean = identifier.trim().toLowerCase();
    const stmt = this.db.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?');
    const row = stmt.get(clean, clean);
    return (row as unknown as UserRecord) || null;
  }

  public async createUser(params: {
    username: string;
    name: string;
    email: string;
    password: string;
    studyMajor?: string;
    dailyGoalMinutes?: number;
  }): Promise<SafeUser> {
    const id = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const cleanUsername = params.username.trim().toLowerCase();
    const cleanEmail = params.email.trim().toLowerCase();
    const { salt, hash } = await hashPassword(params.password);
    const now = Date.now();
    const major = params.studyMajor ? params.studyMajor.trim() : 'General Studies';
    const goal = Number(params.dailyGoalMinutes) || 45;

    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, name, email, password_hash, password_salt, study_major, daily_goal_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, cleanUsername, params.name.trim(), cleanEmail, hash, salt, major, goal, now, now);

    return {
      id,
      username: cleanUsername,
      name: params.name.trim(),
      email: cleanEmail,
      studyMajor: major,
      dailyGoalMinutes: goal,
      createdAt: now,
    };
  }

  public createUserSync(params: {
    username: string;
    name: string;
    email: string;
    password: string;
    studyMajor?: string;
    dailyGoalMinutes?: number;
  }): SafeUser {
    const id = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const cleanUsername = params.username.trim().toLowerCase();
    const cleanEmail = params.email.trim().toLowerCase();
    const { salt, hash } = hashPasswordSync(params.password);
    const now = Date.now();
    const major = params.studyMajor ? params.studyMajor.trim() : 'General Studies';
    const goal = Number(params.dailyGoalMinutes) || 45;

    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, name, email, password_hash, password_salt, study_major, daily_goal_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, cleanUsername, params.name.trim(), cleanEmail, hash, salt, major, goal, now, now);

    return {
      id,
      username: cleanUsername,
      name: params.name.trim(),
      email: cleanEmail,
      studyMajor: major,
      dailyGoalMinutes: goal,
      createdAt: now,
    };
  }

  public toSafeUser(user: UserRecord): SafeUser {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      studyMajor: user.study_major,
      dailyGoalMinutes: user.daily_goal_minutes,
      createdAt: user.created_at,
    };
  }

  public getDemoUsers(): { username: string; name: string; email: string; studyMajor: string }[] {
    const stmt = this.db.prepare(`
      SELECT username, name, email, study_major as studyMajor
      FROM users
      WHERE id IN ('usr-demo-0', 'usr-demo-1', 'usr-demo-2')
      ORDER BY id ASC
    `);
    return stmt.all() as any[];
  }

  // -------------------------------------------------------------------------
  // Session Management
  // -------------------------------------------------------------------------

  public createSession(userId: string, userAgent?: string, durationDays = 30): { token: string; expiresAt: number } {
    const token = generateSessionToken();
    const now = Date.now();
    const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(token, userId, now, expiresAt, userAgent || null);

    return { token, expiresAt };
  }

  public validateSession(token: string): SafeUser | null {
    if (!token || typeof token !== 'string') return null;

    const stmt = this.db.prepare(`
      SELECT s.token, s.expires_at, u.*
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `);

    const row = stmt.get(token) as any;
    if (!row) return null;

    const now = Date.now();
    if (row.expires_at < now) {
      // Session expired, delete it
      this.deleteSession(token);
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      studyMajor: row.study_major,
      dailyGoalMinutes: row.daily_goal_minutes,
      createdAt: row.created_at,
    };
  }

  public deleteSession(token: string): boolean {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE token = ?');
    stmt.run(token);
    return true;
  }

  public deleteUserSessions(userId: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE user_id = ?');
    stmt.run(userId);
  }

  public cleanExpiredSessions(): number {
    const now = Date.now();
    const stmt = this.db.prepare('DELETE FROM sessions WHERE expires_at < ?');
    stmt.run(now);
    return 0;
  }

  // -------------------------------------------------------------------------
  // Tasks & Subtasks Management
  // -------------------------------------------------------------------------

  public getUserTasks(userId: string): any[] {
    const taskStmt = this.db.prepare(`
      SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at ASC
    `);
    const subtaskStmt = this.db.prepare(`
      SELECT * FROM subtasks WHERE user_id = ? ORDER BY sort_order ASC
    `);

    const taskRows = taskStmt.all(userId) as unknown as TaskRecord[];
    const subtaskRows = subtaskStmt.all(userId) as unknown as SubtaskRecord[];

    const subtasksByTask = new Map<string, any[]>();
    for (const s of subtaskRows) {
      if (!subtasksByTask.has(s.task_id)) {
        subtasksByTask.set(s.task_id, []);
      }
      subtasksByTask.get(s.task_id)!.push({
        id: s.id,
        title: s.title,
        estimatedMinutes: s.estimated_minutes,
        staminaPoints: s.stamina_points,
        completed: Boolean(s.completed),
      });
    }

    return taskRows.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      deadline: t.deadline,
      estimatedMinutes: t.estimated_minutes,
      remainingMinutes: t.remaining_minutes !== null ? t.remaining_minutes : undefined,
      staminaPoints: t.stamina_points,
      completed: Boolean(t.completed),
      category: t.category,
      status: t.status,
      postponeCount: t.postpone_count,
      lastPostponedAt: t.last_postponed_at !== null ? t.last_postponed_at : undefined,
      interruptedAt: t.interrupted_at !== null ? t.interrupted_at : undefined,
      actualMinutesSpent: t.actual_minutes_spent,
      lastInterruptionElapsed: t.last_interruption_elapsed !== null ? t.last_interruption_elapsed : undefined,
      notes: t.notes !== null ? t.notes : undefined,
      createdAt: t.created_at,
      subtasks: subtasksByTask.get(t.id) || [],
    }));
  }

  public saveUserTask(userId: string, task: any): void {
    const now = Date.now();
    const taskStmt = this.db.prepare(`
      INSERT INTO tasks (
        id, user_id, title, priority, deadline, estimated_minutes, remaining_minutes,
        stamina_points, completed, category, status, postpone_count, last_postponed_at,
        interrupted_at, actual_minutes_spent, last_interruption_elapsed, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        priority = excluded.priority,
        deadline = excluded.deadline,
        estimated_minutes = excluded.estimated_minutes,
        remaining_minutes = excluded.remaining_minutes,
        stamina_points = excluded.stamina_points,
        completed = excluded.completed,
        category = excluded.category,
        status = excluded.status,
        postpone_count = excluded.postpone_count,
        last_postponed_at = excluded.last_postponed_at,
        interrupted_at = excluded.interrupted_at,
        actual_minutes_spent = excluded.actual_minutes_spent,
        last_interruption_elapsed = excluded.last_interruption_elapsed,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `);

    taskStmt.run(
      task.id,
      userId,
      task.title,
      task.priority || 'normal',
      task.deadline || 'Today',
      task.estimatedMinutes || 25,
      task.remainingMinutes !== undefined ? task.remainingMinutes : null,
      task.staminaPoints || 1,
      task.completed ? 1 : 0,
      task.category || 'academic',
      task.status || (task.completed ? 'completed' : 'pending'),
      task.postponeCount || 0,
      task.lastPostponedAt || null,
      task.interruptedAt || null,
      task.actualMinutesSpent || 0,
      task.lastInterruptionElapsed || null,
      task.notes || null,
      task.createdAt || now,
      now
    );

    // Sync subtasks
    if (Array.isArray(task.subtasks)) {
      this.db.prepare('DELETE FROM subtasks WHERE task_id = ? AND user_id = ?').run(task.id, userId);
      const subtaskStmt = this.db.prepare(`
        INSERT INTO subtasks (id, task_id, user_id, title, estimated_minutes, stamina_points, completed, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      task.subtasks.forEach((st: any, idx: number) => {
        subtaskStmt.run(
          st.id || `sub-${Date.now()}-${idx}`,
          task.id,
          userId,
          st.title,
          st.estimatedMinutes || 10,
          st.staminaPoints || 1,
          st.completed ? 1 : 0,
          idx
        );
      });
    }
  }

  public deleteUserTask(userId: string, taskId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
    stmt.run(taskId, userId);
    return true;
  }

  public saveAllUserTasks(userId: string, tasks: any[]): void {
    const existingIds = new Set(tasks.map((t) => t.id));
    const currentTasks = this.getUserTasks(userId);
    for (const ct of currentTasks) {
      if (!existingIds.has(ct.id)) {
        this.deleteUserTask(userId, ct.id);
      }
    }
    for (const t of tasks) {
      this.saveUserTask(userId, t);
    }
  }

  // -------------------------------------------------------------------------
  // Routines Management
  // -------------------------------------------------------------------------

  public getUserRoutines(userId: string): any[] {
    const stmt = this.db.prepare('SELECT * FROM routines WHERE user_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(userId) as unknown as RoutineRecord[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      timeOfDay: r.time_of_day,
      iconName: r.icon_name,
      streak: r.streak,
      completedToday: Boolean(r.completed_today),
      staminaReward: r.stamina_reward,
    }));
  }

  public saveUserRoutine(userId: string, routine: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO routines (id, user_id, title, time_of_day, icon_name, streak, completed_today, stamina_reward, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        time_of_day = excluded.time_of_day,
        icon_name = excluded.icon_name,
        streak = excluded.streak,
        completed_today = excluded.completed_today,
        stamina_reward = excluded.stamina_reward
    `);

    stmt.run(
      routine.id,
      userId,
      routine.title,
      routine.timeOfDay,
      routine.iconName || 'sparkles',
      routine.streak || 0,
      routine.completedToday ? 1 : 0,
      routine.staminaReward || 1,
      routine.createdAt || Date.now()
    );
  }

  public deleteUserRoutine(userId: string, routineId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM routines WHERE id = ? AND user_id = ?');
    stmt.run(routineId, userId);
    return true;
  }

  public saveAllUserRoutines(userId: string, routines: any[]): void {
    const existingIds = new Set(routines.map((r) => r.id));
    const current = this.getUserRoutines(userId);
    for (const cr of current) {
      if (!existingIds.has(cr.id)) {
        this.deleteUserRoutine(userId, cr.id);
      }
    }
    for (const r of routines) {
      this.saveUserRoutine(userId, r);
    }
  }

  // -------------------------------------------------------------------------
  // User Companion State (Pet, Activity Log, Available Window, Scratchpad)
  // -------------------------------------------------------------------------

  public getUserCompanionData(userId: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM user_companion_data WHERE user_id = ?');
    const row = stmt.get(userId) as CompanionDataRecord | undefined;
    if (!row) return null;

    try {
      return {
        availableMinutes: row.available_minutes,
        pet: JSON.parse(row.pet_data),
        activityLog: JSON.parse(row.activity_log),
        scratchpad: row.scratchpad,
      };
    } catch {
      return null;
    }
  }

  public saveUserCompanionData(
    userId: string,
    data: { availableMinutes?: number; pet?: any; activityLog?: any[]; scratchpad?: string }
  ): void {
    const now = Date.now();
    const existing = this.getUserCompanionData(userId);

    const availableMinutes = data.availableMinutes !== undefined ? data.availableMinutes : (existing?.availableMinutes ?? 30);
    const petStr = data.pet ? JSON.stringify(data.pet) : JSON.stringify(existing?.pet || { id: 'sprout', name: 'Sprout', level: 1, exp: 0, maxExp: 100, mood: 'happy', berriesAvailable: 2, berriesFed: 0 });
    const actStr = data.activityLog ? JSON.stringify(data.activityLog) : JSON.stringify(existing?.activityLog || []);
    const scratch = data.scratchpad !== undefined ? data.scratchpad : (existing?.scratchpad ?? '');

    const stmt = this.db.prepare(`
      INSERT INTO user_companion_data (user_id, available_minutes, pet_data, activity_log, scratchpad, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        available_minutes = excluded.available_minutes,
        pet_data = excluded.pet_data,
        activity_log = excluded.activity_log,
        scratchpad = excluded.scratchpad,
        updated_at = excluded.updated_at
    `);

    stmt.run(userId, availableMinutes, petStr, actStr, scratch, now);
  }
}

// Global singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabase(): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
  }
  return dbInstance;
}
