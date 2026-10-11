import { AuthUser, TaskItem, RoutineItem, PetState, DayActivity } from '../types';

const TOKEN_KEY = 'cozy_pixel_auth_token';
const USER_KEY = 'cozy_pixel_current_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser(): AuthUser | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  message?: string;
  error?: string;
  details?: Record<string, string>;
}

export const authApi = {
  async register(params: {
    username: string;
    name: string;
    email: string;
    password: string;
    studyMajor?: string;
    dailyGoalMinutes?: number;
  }): Promise<{ ok: boolean; data?: AuthResponse; error?: string; details?: Record<string, string> }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Registration failed.', details: data.details };
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      if (data.user) {
        setStoredUser(data.user);
      }
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error during registration.' };
    }
  },

  async login(identifier: string, password: string): Promise<{ ok: boolean; data?: AuthResponse; error?: string; details?: Record<string, string> }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Login failed.', details: data.details };
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      if (data.user) {
        setStoredUser(data.user);
      }
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error during login.' };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setStoredToken(null);
      setStoredUser(null);
    }
  },

  async verifySession(): Promise<{ ok: boolean; user?: AuthUser }> {
    const token = getStoredToken();
    if (!token) return { ok: false };

    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setStoredToken(null);
        setStoredUser(null);
        return { ok: false };
      }
      const data = await res.json();
      if (data.user) {
        setStoredUser(data.user);
        return { ok: true, user: data.user };
      }
      return { ok: false };
    } catch {
      return { ok: false };
    }
  },

  async getDemoUsers(): Promise<{ username: string; name: string; email: string; studyMajor: string; demoPassword?: string }[]> {
    try {
      const res = await fetch('/api/auth/demo-users');
      if (res.ok) {
        const data = await res.json();
        return data.demoUsers || [];
      }
    } catch {
      // Fallback
    }
    return [
      { username: 'student', name: 'Taylor Reed (Newbie)', email: 'student@study.local', studyMajor: 'Cognitive Science' },
      { username: 'alex', name: 'Alex Chen', email: 'alex@example.com', studyMajor: 'Computer Science' },
      { username: 'sam', name: 'Sam Rivera', email: 'sam@example.com', studyMajor: 'Design & Engineering' },
    ];
  },
};

export const dataApi = {
  async fetchTasks(): Promise<TaskItem[] | null> {
    try {
      const res = await fetch('/api/tasks', { headers: getAuthHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data.tasks) ? data.tasks : null;
    } catch {
      return null;
    }
  },

  async syncTasks(tasks: TaskItem[]): Promise<boolean> {
    try {
      const res = await fetch('/api/tasks/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tasks }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchRoutines(): Promise<RoutineItem[] | null> {
    try {
      const res = await fetch('/api/routines', { headers: getAuthHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data.routines) ? data.routines : null;
    } catch {
      return null;
    }
  },

  async syncRoutines(routines: RoutineItem[]): Promise<boolean> {
    try {
      const res = await fetch('/api/routines/sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ routines }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchCompanionState(): Promise<{
    availableMinutes?: number;
    pet?: PetState;
    activityLog?: DayActivity[];
    scratchpad?: string;
  } | null> {
    try {
      const res = await fetch('/api/user/state', { headers: getAuthHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.state || null;
    } catch {
      return null;
    }
  },

  async saveCompanionState(state: {
    availableMinutes?: number;
    pet?: PetState;
    activityLog?: DayActivity[];
    scratchpad?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/user/state', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(state),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
