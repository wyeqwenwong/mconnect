// ============================================================
// Data layer. Two interchangeable backends behind one interface:
//
//   • Local (default)  — localStorage + BroadcastChannel. Opening the game in
//     several browser tabs simulates multiple kiosks sharing one leaderboard,
//     with live cross-tab updates (stands in for Supabase Realtime).
//   • Remote            — talks to the Vercel serverless API (backed by
//     Supabase). Enabled when VITE_REMOTE=1 (same-origin /api, the deployed
//     default) or when VITE_API_BASE points at another origin.
//
// Settings + question pool are pulled fresh at the START OF EACH GAME, so admin
// changes propagate to all panels on the next game (GDD §4).
// ============================================================
import { DEFAULT_SETTINGS, SEED_QUESTIONS } from './seed';
import type { GameSettings, LeaderboardRow, Question, Score } from './types';

// '' = same-origin /api (the deployed default). REMOTE gates local vs remote.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const REMOTE = import.meta.env.VITE_REMOTE === '1' || !!import.meta.env.VITE_API_BASE;
const KEYS = {
  settings: 'mcc.settings',
  questions: 'mcc.questions',
  scores: 'mcc.scores',
  panels: 'mcc.panels',
  seedVersion: 'mcc.seedVersion',
};
// Bump when the seed/question shape changes so stale local pools re-seed.
const SEED_VERSION = '3-single-match';

export const PANEL_ID = getPanelId();
function getPanelId(): string {
  if (typeof sessionStorage === 'undefined') return 'panel-server';
  let id = sessionStorage.getItem('mcc.panelId');
  if (!id) {
    id = 'panel-' + Math.random().toString(36).slice(2, 7);
    sessionStorage.setItem('mcc.panelId', id);
  }
  return id;
}

// ---- change notification (local realtime) -------------------------------
type Channel = 'leaderboard' | 'settings' | 'questions' | 'panels';
const listeners: Record<Channel, Set<() => void>> = {
  leaderboard: new Set(),
  settings: new Set(),
  questions: new Set(),
  panels: new Set(),
};
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('meta-connect') : null;
bc?.addEventListener('message', (e) => emitLocal(e.data as Channel));

function emitLocal(ch: Channel) {
  listeners[ch].forEach((fn) => fn());
}
function emit(ch: Channel) {
  emitLocal(ch);
  bc?.postMessage(ch);
}

export function subscribe(ch: Channel, fn: () => void): () => void {
  listeners[ch].add(fn);
  return () => listeners[ch].delete(fn);
}

// ---- localStorage helpers ----------------------------------------------
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeed() {
  // Re-seed the question pool when the stored shape predates this build.
  if (localStorage.getItem(KEYS.seedVersion) !== SEED_VERSION) {
    write(KEYS.questions, SEED_QUESTIONS);
    localStorage.setItem(KEYS.seedVersion, SEED_VERSION);
  }
  if (localStorage.getItem(KEYS.settings) == null) write(KEYS.settings, DEFAULT_SETTINGS);
  if (localStorage.getItem(KEYS.questions) == null) write(KEYS.questions, SEED_QUESTIONS);
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}
async function apiSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

// ======================================================================
//  Public API
// ======================================================================
export const store = {
  isRemote: REMOTE,

  // --- settings ---
  async getSettings(): Promise<GameSettings> {
    if (REMOTE) return apiGet<GameSettings>('/api/settings');
    ensureSeed();
    return { ...DEFAULT_SETTINGS, ...read<GameSettings>(KEYS.settings, DEFAULT_SETTINGS) };
  },
  async saveSettings(s: GameSettings): Promise<void> {
    if (REMOTE) {
      await apiSend('PUT', '/api/admin/settings', s);
    } else {
      write(KEYS.settings, s);
    }
    emit('settings');
  },

  // --- questions ---
  async getAllQuestions(): Promise<Question[]> {
    if (REMOTE) return apiGet<Question[]>('/api/questions');
    ensureSeed();
    return read<Question[]>(KEYS.questions, SEED_QUESTIONS);
  },
  /** Active pool only — what the game draws from. */
  async getActiveQuestions(): Promise<Question[]> {
    const all = await this.getAllQuestions();
    return all.filter((q) => q.active);
  },
  async saveQuestion(q: Question): Promise<void> {
    if (REMOTE) {
      await apiSend('PUT', `/api/questions`, q);
      // Enforce a single active match question server-side too.
      if (q.kind === 'match' && q.active) await apiSend('POST', '/api/admin/exclusive-match', { id: q.id });
    } else {
      const all = read<Question[]>(KEYS.questions, SEED_QUESTIONS);
      const idx = all.findIndex((x) => x.id === q.id);
      if (idx >= 0) all[idx] = q;
      else all.push(q);
      // Only one match question may be active at a time (Mix & Match = 1 question).
      if (q.kind === 'match' && q.active) {
        for (const x of all) if (x.kind === 'match' && x.id !== q.id) x.active = false;
      }
      write(KEYS.questions, all);
    }
    emit('questions');
  },
  async deleteQuestion(id: string): Promise<void> {
    if (REMOTE) {
      await apiSend('DELETE', `/api/questions?id=${encodeURIComponent(id)}`);
    } else {
      const all = read<Question[]>(KEYS.questions, SEED_QUESTIONS).filter((q) => q.id !== id);
      write(KEYS.questions, all);
    }
    emit('questions');
  },

  // --- scores / leaderboard ---
  async submitScore(score: Omit<Score, 'id' | 'createdAt'>): Promise<Score> {
    const full: Score = { ...score, id: 's' + Date.now() + Math.random().toString(36).slice(2, 6), createdAt: Date.now() };
    if (REMOTE) {
      const saved = await apiSend<Score>('POST', '/api/scores', full);
      emit('leaderboard');
      return saved;
    }
    const scores = read<Score[]>(KEYS.scores, []);
    scores.push(full);
    write(KEYS.scores, scores);
    emit('leaderboard');
    return full;
  },
  async getLeaderboard(limit = 100): Promise<LeaderboardRow[]> {
    if (REMOTE) return apiGet<LeaderboardRow[]>(`/api/leaderboard?limit=${limit}`);
    const scores = read<Score[]>(KEYS.scores, []);
    return scores
      .slice()
      .sort((a, b) => b.total - a.total || a.createdAt - b.createdAt)
      .slice(0, limit)
      .map((s, i) => ({ id: s.id, rank: i + 1, name: s.name, total: s.total }));
  },
  async resetLeaderboard(): Promise<void> {
    if (REMOTE) {
      await apiSend('POST', '/api/admin/reset-leaderboard');
    } else {
      write(KEYS.scores, []);
    }
    emit('leaderboard');
  },

  // --- panels heartbeat (for "K panels online") ---
  heartbeat() {
    if (REMOTE) {
      void apiSend('POST', '/api/panels', { panelId: PANEL_ID }).catch(() => {});
      return;
    }
    const panels = read<Record<string, number>>(KEYS.panels, {});
    panels[PANEL_ID] = Date.now();
    write(KEYS.panels, panels);
    emit('panels');
  },
  async getOnlinePanels(): Promise<number> {
    if (REMOTE) return apiGet<{ count: number }>('/api/panels').then((r) => r.count);
    const panels = read<Record<string, number>>(KEYS.panels, {});
    const cutoff = Date.now() - 15_000;
    return Object.values(panels).filter((t) => t > cutoff).length;
  },
};

// ---- game helpers -------------------------------------------------------
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build the question set for one game: pull latest settings + active pool,
 * keep only questions of the active MODE, draw N (random if enabled), and
 * shuffle answer order (quiz) / icon + answer arrangement (match) when
 * randomization is on. Called at game start so admin edits propagate.
 */
export async function drawGame(): Promise<{ settings: GameSettings; questions: Question[] }> {
  const [settings, pool] = await Promise.all([store.getSettings(), store.getActiveQuestions()]);
  const ofMode = pool.filter((q) => q.kind === settings.mode);
  // Mix & Match always plays exactly one question; quiz draws N.
  const want = settings.mode === 'match' ? 1 : settings.questionsPerGame;
  const n = Math.min(want, ofMode.length);
  const drawn = (settings.randomize ? shuffle(ofMode) : ofMode).slice(0, n);
  const questions = drawn.map((q) => {
    if (!settings.randomize) return q;
    if (q.kind === 'quiz') return { ...q, choices: shuffle(q.choices ?? []) };
    // match: randomize both the icon column and the answer-bubble column
    return { ...q, types: shuffle(q.types ?? []), answers: shuffle(q.answers ?? []) };
  });
  return { settings, questions };
}
