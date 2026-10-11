import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  getDatabase,
  SafeUser,
  validateRegistrationInput,
  validateLoginInput,
  verifyPassword,
} from './server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to initialize Gemini safely
  function getGeminiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  }

  // API 1: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // Database Service Initialization
  const db = getDatabase();

  // Types for authenticated requests
  interface AuthenticatedRequest extends express.Request {
    user?: SafeUser;
    sessionToken?: string;
  }

  // Authentication Middleware: Validates cryptographically random session tokens
  function requireAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
      token = String(req.headers['x-auth-token']).trim();
    }

    if (!token) {
      res.status(401).json({ error: 'Authentication required. Please log in.' });
      return;
    }

    const user = db.validateSession(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      return;
    }

    req.user = user;
    req.sessionToken = token;
    next();
  }

  // Auth API: Register new user with strict input validation and crypto.scrypt password hashing
  app.post('/api/auth/register', async (req, res) => {
    const validation = validateRegistrationInput(req.body);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed. Please check the entered fields.',
        details: validation.errors,
      });
      return;
    }

    const { username, name, email, password, studyMajor, dailyGoalMinutes } = req.body;
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const existing = db.findUserByUsernameOrEmail(cleanUsername) || db.findUserByUsernameOrEmail(cleanEmail);
    if (existing) {
      res.status(409).json({
        error: 'An account with that username or email already exists.',
        details: {
          username: existing.username === cleanUsername ? 'Username is already registered.' : undefined,
          email: existing.email === cleanEmail ? 'Email is already registered.' : undefined,
        },
      });
      return;
    }

    try {
      // Securely hash password using crypto.scrypt
      const newUser = await db.createUser({
        username: cleanUsername,
        name: String(name).trim(),
        email: cleanEmail,
        password: String(password),
        studyMajor: studyMajor ? String(studyMajor).trim() : undefined,
        dailyGoalMinutes: Number(dailyGoalMinutes) || 45,
      });

      // Generate cryptographically random session token and store in database
      const userAgent = req.headers['user-agent'] || undefined;
      const { token } = db.createSession(newUser.id, userAgent);

      res.status(201).json({
        user: newUser,
        token,
        message: 'Account created and secured successfully with crypto.scrypt!',
      });
    } catch (err: any) {
      console.error('Registration database error:', err);
      res.status(500).json({ error: 'Internal server error while creating account.' });
    }
  });

  // Auth API: Login with timing-safe crypto.scrypt password verification
  app.post('/api/auth/login', async (req, res) => {
    const validation = validateLoginInput(req.body);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed. Please provide your username/email and password.',
        details: validation.errors,
      });
      return;
    }

    const { identifier, password } = req.body;
    const userRecord = db.findUserByUsernameOrEmail(String(identifier).trim());

    if (!userRecord) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    // Timing-safe crypto.scrypt password verification
    const isValidPassword = await verifyPassword(
      String(password),
      userRecord.password_salt,
      userRecord.password_hash
    );

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    // Create cryptographically random session in database
    const userAgent = req.headers['user-agent'] || undefined;
    const { token } = db.createSession(userRecord.id, userAgent);
    const safeUser = db.toSafeUser(userRecord);

    res.json({
      user: safeUser,
      token,
      message: 'Logged in successfully!',
    });
  });

  // Auth API: Verify currently active session
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({
      user: req.user,
      token: req.sessionToken,
    });
  });

  // Auth API: Logout (invalidates and removes session record from database)
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
      token = String(req.headers['x-auth-token']).trim();
    }

    if (token) {
      db.deleteSession(token);
    }

    res.json({ success: true, message: 'Logged out successfully. Session revoked.' });
  });

  // Auth API: Demo users list for quick prototype testing
  app.get('/api/auth/demo-users', (req, res) => {
    const demo = db.getDemoUsers().map((u) => ({
      username: u.username,
      name: u.name,
      email: u.email,
      studyMajor: u.studyMajor,
      demoPassword: 'password123',
    }));
    res.json({ demoUsers: demo });
  });

  // Protected API: Get User Tasks
  app.get('/api/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const tasks = db.getUserTasks(req.user!.id);
      res.json({ tasks });
    } catch (err) {
      console.error('Error fetching tasks:', err);
      res.status(500).json({ error: 'Failed to retrieve tasks.' });
    }
  });

  // Protected API: Sync/Save All User Tasks
  app.post('/api/tasks/sync', requireAuth, (req: AuthenticatedRequest, res) => {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      res.status(400).json({ error: 'tasks array is required' });
      return;
    }

    try {
      db.saveAllUserTasks(req.user!.id, tasks);
      res.json({ success: true, count: tasks.length });
    } catch (err) {
      console.error('Error saving tasks:', err);
      res.status(500).json({ error: 'Failed to save tasks.' });
    }
  });

  // Protected API: Get User Routines
  app.get('/api/routines', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const routines = db.getUserRoutines(req.user!.id);
      res.json({ routines });
    } catch (err) {
      console.error('Error fetching routines:', err);
      res.status(500).json({ error: 'Failed to retrieve routines.' });
    }
  });

  // Protected API: Sync/Save All User Routines
  app.post('/api/routines/sync', requireAuth, (req: AuthenticatedRequest, res) => {
    const { routines } = req.body;
    if (!Array.isArray(routines)) {
      res.status(400).json({ error: 'routines array is required' });
      return;
    }

    try {
      db.saveAllUserRoutines(req.user!.id, routines);
      res.json({ success: true, count: routines.length });
    } catch (err) {
      console.error('Error saving routines:', err);
      res.status(500).json({ error: 'Failed to save routines.' });
    }
  });

  // Protected API: Get Companion Data
  app.get('/api/user/state', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const state = db.getUserCompanionData(req.user!.id);
      res.json({ state });
    } catch (err) {
      console.error('Error fetching companion state:', err);
      res.status(500).json({ error: 'Failed to retrieve state.' });
    }
  });

  // Protected API: Save Companion Data
  app.post('/api/user/state', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      db.saveUserCompanionData(req.user!.id, req.body);
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving companion state:', err);
      res.status(500).json({ error: 'Failed to save state.' });
    }
  });


  // API 2: Task breakdown (converts large/vague task into 3-5 actionable micro-steps)
  app.post('/api/breakdown', async (req, res) => {
    const { taskTitle, totalMinutes, availableTime } = req.body;
    if (!taskTitle || typeof taskTitle !== 'string') {
      res.status(400).json({ error: 'taskTitle is required' });
      return;
    }

    // Try Gemini if key is available
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `You are an ADHD productivity assistant for the "focus.os" focus companion app.
Break down this large or vague task into 3 to 5 tiny, concrete, actionable, low-friction micro-steps designed to overcome task paralysis and initiation friction.
Task: "${taskTitle}"
Estimated total time: ${totalMinutes || 45} minutes.
User's available time right now: ${availableTime || 30} minutes.

Respond ONLY with a JSON array of objects with the following schema:
[
  {
    "title": "Clear, very specific first action (starts with a verb, e.g. Open doc & write 1 heading)",
    "estimatedMinutes": 10,
    "staminaPoints": 1
  }
]
No extra text, markdown ticks or formatting outside the JSON array.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text ? response.text.trim() : '';
        const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          res.json({ subtasks: parsed, source: 'gemini' });
          return;
        }
      } catch (err) {
        console.error('Gemini breakdown error, falling back to heuristic:', err);
      }
    }

    // Smart heuristic fallback
    const lower = taskTitle.toLowerCase();
    let fallbackSteps = [
      { title: `Step 1: Open workspace and gather materials for "${taskTitle}"`, estimatedMinutes: 5, staminaPoints: 1 },
      { title: `Step 2: Outline the first 3 bullet points or key requirements`, estimatedMinutes: 10, staminaPoints: 1 },
      { title: `Step 3: Draft the core section without worrying about perfection`, estimatedMinutes: 15, staminaPoints: 2 },
      { title: `Step 4: Quick review and tidy up the next action step`, estimatedMinutes: 10, staminaPoints: 1 },
    ];

    if (lower.includes('study') || lower.includes('exam') || lower.includes('read')) {
      fallbackSteps = [
        { title: 'Open book/slides to the specific chapter', estimatedMinutes: 5, staminaPoints: 1 },
        { title: 'Skim headings, bold terms, and summary questions', estimatedMinutes: 10, staminaPoints: 1 },
        { title: 'Read 3 key pages and write 2 bullet point notes', estimatedMinutes: 15, staminaPoints: 2 },
        { title: 'Quick self-quiz on the 2 notes you just took', estimatedMinutes: 10, staminaPoints: 1 },
      ];
    } else if (lower.includes('code') || lower.includes('project') || lower.includes('assignment') || lower.includes('software')) {
      fallbackSteps = [
        { title: 'Review requirements and write down 1 test scenario', estimatedMinutes: 10, staminaPoints: 1 },
        { title: 'Set up file structure or create function skeleton', estimatedMinutes: 15, staminaPoints: 2 },
        { title: 'Implement minimal working prototype for 1 feature', estimatedMinutes: 20, staminaPoints: 2 },
        { title: 'Run and verify the first test case', estimatedMinutes: 10, staminaPoints: 1 },
      ];
    } else if (lower.includes('clean') || lower.includes('tidy') || lower.includes('room')) {
      fallbackSteps = [
        { title: 'Pick up 5 items off the floor or desk', estimatedMinutes: 5, staminaPoints: 1 },
        { title: 'Throw away any wrappers or trash', estimatedMinutes: 5, staminaPoints: 1 },
        { title: 'Wipe down the main surface with a cloth', estimatedMinutes: 5, staminaPoints: 1 },
      ];
    }

    res.json({ subtasks: fallbackSteps, source: 'heuristic' });
  });

  // Vite middleware in dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`focus.os server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
