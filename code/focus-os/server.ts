import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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

  // User storage for prototype
  interface StoredUser {
    id: string;
    username: string;
    name: string;
    email: string;
    passwordHash: string;
    studyMajor?: string;
    dailyGoalMinutes?: number;
    createdAt: number;
  }

  const USERS: StoredUser[] = [
    {
      id: 'usr-demo-0',
      username: 'student',
      name: 'Taylor Reed (Newbie)',
      email: 'student@study.local',
      passwordHash: 'password123',
      studyMajor: 'Cognitive Science & Psychology',
      dailyGoalMinutes: 30,
      createdAt: Date.now(),
    },
    {
      id: 'usr-demo-1',
      username: 'alex',
      name: 'Alex Chen',
      email: 'alex@example.com',
      passwordHash: 'password123',
      studyMajor: 'Computer Science (B.Tech)',
      dailyGoalMinutes: 60,
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'usr-demo-2',
      username: 'sam',
      name: 'Sam Rivera',
      email: 'sam@example.com',
      passwordHash: 'password123',
      studyMajor: 'Design & Engineering',
      dailyGoalMinutes: 45,
      createdAt: Date.now() - 86400000 * 3,
    },
  ];

  // Auth API: Register new user
  app.post('/api/auth/register', (req, res) => {
    const { username, name, email, password, studyMajor, dailyGoalMinutes } = req.body;
    if (!username || !password || !name) {
      res.status(400).json({ error: 'Username, name, and password are required' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = email ? String(email).trim().toLowerCase() : `${cleanUsername}@study.local`;

    // Check if user already exists
    const existing = USERS.find(
      (u) => u.username === cleanUsername || (email && u.email === cleanEmail)
    );
    if (existing) {
      res.status(409).json({ error: 'An account with that username or email already exists.' });
      return;
    }

    const newUser: StoredUser = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash: String(password),
      studyMajor: studyMajor ? String(studyMajor).trim() : 'General Studies',
      dailyGoalMinutes: Number(dailyGoalMinutes) || 45,
      createdAt: Date.now(),
    };

    USERS.push(newUser);

    const safeUser = {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      studyMajor: newUser.studyMajor,
      dailyGoalMinutes: newUser.dailyGoalMinutes,
      createdAt: newUser.createdAt,
    };

    res.status(201).json({
      user: safeUser,
      token: `tok-${newUser.id}-${Date.now()}`,
      message: 'Account created successfully!',
    });
  });

  // Auth API: Login
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required' });
      return;
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const user = USERS.find(
      (u) => (u.username === cleanId || u.email === cleanId) && u.passwordHash === String(password)
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      studyMajor: user.studyMajor,
      dailyGoalMinutes: user.dailyGoalMinutes,
      createdAt: user.createdAt,
    };

    res.json({
      user: safeUser,
      token: `tok-${user.id}-${Date.now()}`,
      message: 'Logged in successfully!',
    });
  });

  // Auth API: Logout
  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // Auth API: Demo users list for quick prototype testing
  app.get('/api/auth/demo-users', (req, res) => {
    const demo = USERS.map((u) => ({
      username: u.username,
      name: u.name,
      email: u.email,
      studyMajor: u.studyMajor,
      demoPassword: u.passwordHash,
    }));
    res.json({ demoUsers: demo });
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
