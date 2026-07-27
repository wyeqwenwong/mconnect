// ============================================================
// Data layer. Two interchangeable backends behind one interface:
//
//   • Local (default)  — localStorage + BroadcastChannel. Opening the game in
//     several browser tabs simulates multiple kiosks sharing one leaderboard,
//     with live cross-tab updates (stands in for Supabase Realtime).
//   • Remote            — talks directly to Supabase (Postgres + Realtime) from
//     the browser with the public anon key. Enabled when VITE_SUPABASE_URL /
//     VITE_SUPABASE_ANON_KEY are set (baked in at build time on Vercel).
//
// Settings + question pool are pulled fresh at the START OF EACH GAME, so admin
// changes propagate to all panels on the next game (GDD §4).
// ============================================================
import { DEFAULT_SETTINGS, SEED_QUESTIONS } from './seed';
import { supa } from './supabase';
import type { GameSettings, LeaderboardRow, Question, Score } from './types';

// Remote mode = a Supabase client is configured (VITE_SUPABASE_URL/ANON_KEY).
const REMOTE = !!supa;
const KEYS = {
  settings: 'mcc.settings',
  questions: 'mcc.questions',
  scores: 'mcc.scores',
  panels: 'mcc.panels',
  seedVersion: 'mcc.seedVersion',
};
// Bump when the seed/question shape changes so stale local pools re-seed.
const SEED_VERSION = '5-one-random-per-icon';

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

// ---- Supabase row mappers (snake_case DB <-> camelCase app) --------------
type SettingsRow = {
  mode: GameSettings['mode'];
  questions_per_game: number;
  speed_bonus: boolean;
  speedrun_bonus: number;
  per_question_score_display: boolean;
  randomize: boolean;
  sound: boolean;
};
const settingsFromRow = (r: SettingsRow): GameSettings => ({
  mode: r.mode,
  questionsPerGame: r.questions_per_game,
  speedBonus: r.speed_bonus,
  speedrunBonus: r.speedrun_bonus,
  perQuestionScoreDisplay: r.per_question_score_display,
  randomize: r.randomize,
  sound: r.sound,
});
const settingsToRow = (s: GameSettings) => ({
  mode: s.mode,
  questions_per_game: s.questionsPerGame,
  speed_bonus: s.speedBonus,
  speedrun_bonus: s.speedrunBonus,
  per_question_score_display: s.perQuestionScoreDisplay,
  randomize: s.randomize,
  sound: s.sound,
  updated_at: new Date().toISOString(),
});
const questionToRow = (q: Question) => ({
  id: q.id,
  kind: q.kind,
  points: q.points,
  active: q.active,
  text: q.text ?? null,
  explanation: q.explanation ?? null,
  multi: !!q.multi,
  icon: q.icon ?? null,
  choices: q.choices ?? [],
  prompt: q.prompt ?? null,
  types: q.types ?? [],
  answers: q.answers ?? [],
});

// Live leaderboard across kiosks: any change to `scores` re-notifies listeners.
if (supa) {
  supa
    .channel('mcc-scores')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => emitLocal('leaderboard'))
    .subscribe();
}

// ======================================================================
//  Public API
// ======================================================================
export const store = {
  isRemote: REMOTE,

  // --- settings ---
  async getSettings(): Promise<GameSettings> {
    if (supa) {
      const { data, error } = await supa.from('settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return { ...DEFAULT_SETTINGS, ...settingsFromRow(data as SettingsRow) };
    }
    ensureSeed();
    return { ...DEFAULT_SETTINGS, ...read<GameSettings>(KEYS.settings, DEFAULT_SETTINGS) };
  },
  async saveSettings(s: GameSettings): Promise<void> {
    if (supa) {
      const { error } = await supa.from('settings').update(settingsToRow(s)).eq('id', 1);
      if (error) throw error;
    } else {
      write(KEYS.settings, s);
    }
    emit('settings');
  },

  // --- questions ---
  async getAllQuestions(): Promise<Question[]> {
    if (supa) {
      const { data, error } = await supa.from('questions').select('*').order('created_at');
      if (error) throw error;
      return (data ?? []) as Question[];
    }
    ensureSeed();
    return read<Question[]>(KEYS.questions, SEED_QUESTIONS);
  },
  /** Active pool only — what the game draws from. */
  async getActiveQuestions(): Promise<Question[]> {
    const all = await this.getAllQuestions();
    return all.filter((q) => q.active);
  },
  async saveQuestion(q: Question): Promise<void> {
    if (supa) {
      const { error } = await supa.from('questions').upsert(questionToRow(q));
      if (error) throw error;
      // Only one match question may be active at a time (Mix & Match = 1 question).
      if (q.kind === 'match' && q.active) {
        await supa.from('questions').update({ active: false }).eq('kind', 'match').neq('id', q.id);
      }
    } else {
      const all = read<Question[]>(KEYS.questions, SEED_QUESTIONS);
      const idx = all.findIndex((x) => x.id === q.id);
      if (idx >= 0) all[idx] = q;
      else all.push(q);
      if (q.kind === 'match' && q.active) {
        for (const x of all) if (x.kind === 'match' && x.id !== q.id) x.active = false;
      }
      write(KEYS.questions, all);
    }
    emit('questions');
  },
  async deleteQuestion(id: string): Promise<void> {
    if (supa) {
      const { error } = await supa.from('questions').delete().eq('id', id);
      if (error) throw error;
    } else {
      const all = read<Question[]>(KEYS.questions, SEED_QUESTIONS).filter((q) => q.id !== id);
      write(KEYS.questions, all);
    }
    emit('questions');
  },

  // --- scores / leaderboard ---
  async submitScore(score: Omit<Score, 'id' | 'createdAt'>): Promise<Score> {
    const full: Score = { ...score, id: 's' + Date.now() + Math.random().toString(36).slice(2, 6), createdAt: Date.now() };
    if (supa) {
      const { data, error } = await supa
        .from('scores')
        .insert({
          name: score.name,
          total: score.total,
          perfect_speedrun: score.perfectSpeedrun,
          panel_id: score.panelId,
          breakdown: score.breakdown,
        })
        .select('id')
        .single();
      if (error) throw error;
      emit('leaderboard');
      return { ...full, id: (data as { id: string }).id };
    }
    const scores = read<Score[]>(KEYS.scores, []);
    scores.push(full);
    write(KEYS.scores, scores);
    emit('leaderboard');
    return full;
  },
  async getLeaderboard(limit = 100): Promise<LeaderboardRow[]> {
    if (supa) {
      const { data, error } = await supa
        .from('scores')
        .select('id,name,total')
        .order('total', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r, i) => ({ id: r.id as string, rank: i + 1, name: r.name as string, total: r.total as number }));
    }
    const scores = read<Score[]>(KEYS.scores, []);
    return scores
      .slice()
      .sort((a, b) => b.total - a.total || a.createdAt - b.createdAt)
      .slice(0, limit)
      .map((s, i) => ({ id: s.id, rank: i + 1, name: s.name, total: s.total }));
  },
  async resetLeaderboard(): Promise<void> {
    if (supa) {
      const { error } = await supa.from('scores').delete().not('id', 'is', null);
      if (error) throw error;
    } else {
      write(KEYS.scores, []);
    }
    emit('leaderboard');
  },

  // --- panels heartbeat (for "K panels online") ---
  heartbeat() {
    if (supa) {
      void supa.from('panels').upsert({ panel_id: PANEL_ID, last_seen: new Date().toISOString() }).then(() => {});
      return;
    }
    const panels = read<Record<string, number>>(KEYS.panels, {});
    panels[PANEL_ID] = Date.now();
    write(KEYS.panels, panels);
    emit('panels');
  },
  async getOnlinePanels(): Promise<number> {
    if (supa) {
      const cutoff = new Date(Date.now() - 15_000).toISOString();
      const { count } = await supa.from('panels').select('*', { count: 'exact', head: true }).gt('last_seen', cutoff);
      return count ?? 0;
    }
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
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Match play is one-to-one on screen: each icon shows exactly ONE answer. The
 * pool may store several answers per icon — we pick one at random per round —
 * plus any irrelevant decoys (which match no icon and should be left unlinked).
 */
function drawMatchAnswers(q: Question): NonNullable<Question['answers']> {
  const answers = q.answers ?? [];
  const chosen = (q.types ?? [])
    .map((t) => {
      const pool = answers.filter((a) => a.typeId === t.id);
      return pool.length ? pick(pool) : null;
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);
  const decoys = answers.filter((a) => a.typeId === null);
  return [...chosen, ...decoys];
}

/**
 * Build the question set for one game: pull latest settings + active pool,
 * keep only questions of the active MODE, draw N (random if enabled). Match
 * questions always show one random answer per icon; ordering is shuffled when
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
    if (q.kind === 'quiz') {
      return settings.randomize ? { ...q, choices: shuffle(q.choices ?? []) } : q;
    }
    // match: one random answer per icon (+ decoys), then shuffle both columns
    const answers = drawMatchAnswers(q);
    return {
      ...q,
      types: settings.randomize ? shuffle(q.types ?? []) : q.types,
      answers: settings.randomize ? shuffle(answers) : answers,
    };
  });
  return { settings, questions };
}
