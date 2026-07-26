// ============================================================
// Shared domain types for the game client + admin console.
// These mirror the backend / Supabase schema (see supabase/schema.sql).
//
// Two question kinds share one pool:
//   • 'quiz'  — multiple choice (single/multi), rendered as tappable bubbles.
//   • 'match' — draw-a-line matching: answers → type icons, with optional
//               irrelevant (match-nowhere) decoy answers.
// The active game MODE (settings.mode) decides which kind is drawn.
// ============================================================

export type QuestionKind = 'quiz' | 'match';
export type GameMode = QuestionKind;

// ---- quiz ----
export interface Choice {
  id: string;
  label: string;
  emoji: string;
  correct: boolean;
}

// ---- match ----
/** A "type" the player matches answers to — shown as an A+ icon. */
export interface MatchType {
  id: string;
  /** Strategy icon key (see lib/assets STRATEGY_ICONS). */
  icon: string;
  label: string;
}

/** An answer bubble. typeId = the correct type, or null when irrelevant. */
export interface MatchAnswer {
  id: string;
  text: string;
  /** null => irrelevant decoy that matches no type. */
  typeId: string | null;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  points: number;
  active: boolean;

  // quiz fields
  text?: string;
  explanation?: string;
  multi?: boolean;
  choices?: Choice[];
  icon?: string;

  // match fields
  prompt?: string;
  types?: MatchType[];
  answers?: MatchAnswer[];
}

export interface GameSettings {
  /** Which question kind this event runs. */
  mode: GameMode;
  questionsPerGame: number;
  speedBonus: boolean;
  speedrunBonus: number;
  perQuestionScoreDisplay: boolean;
  randomize: boolean;
  sound: boolean;
}

export interface QuestionResult {
  questionId: string;
  /** quiz: chosen choice ids. match: not used (see matchedPairs). */
  selectedChoiceIds: string[];
  /** match: answerId -> typeId the player connected it to. */
  matchedPairs?: Record<string, string>;
  correct: boolean;
  /** 0..1 fraction correct (multi-select / match partial credit). */
  fraction: number;
  /** quiz: matches-correct count for display; match: correct match count. */
  correctCount?: number;
  totalCount?: number;
  timeTakenMs: number;
  pointsEarned: number;
}

export interface Score {
  id: string;
  name: string;
  total: number;
  perfectSpeedrun: boolean;
  panelId: string;
  createdAt: number;
  breakdown: QuestionResult[];
}

export interface LeaderboardRow {
  id: string;
  rank: number;
  name: string;
  total: number;
}

export const TIME_PER_QUESTION_MS = 30_000;
export const FULL_POINTS_WINDOW_MS = 20_000;
