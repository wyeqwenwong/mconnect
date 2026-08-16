// ============================================================
// Scoring rules — GDD §3 "Scoring System" & §10 "Game Balance".
// Quiz + match questions both earn a per-question base (default 100) with the
// same speed-bonus tiers; scores are never negative.
// ============================================================
import {
  FULL_POINTS_WINDOW_MS,
  MATCH_POINTS_PER_CORRECT,
  SPEED_BONUS_POINTS,
  SPEED_BONUS_UNIT_MS,
  TIME_PER_QUESTION_MS,
  type GameSettings,
  type Question,
  type QuestionResult,
} from './types';

/** Apply the speed-bonus tiers to an already-earned base amount. */
function applySpeedTier(base: number, timeTakenMs: number, settings: GameSettings): number {
  if (base <= 0) return 0;
  if (!settings.speedBonus) return base; // full base points regardless of time
  if (timeTakenMs <= FULL_POINTS_WINDOW_MS) return base; // <20s: full
  if (timeTakenMs <= TIME_PER_QUESTION_MS) return base * 0.75; // 20-30s: 75%
  return 0; // timed out
}

/**
 * Score a quiz question.
 * Single-select: correct = the one chosen choice is the correct one.
 * Multi-select:  proportional credit, wrong picks cancel correct picks, never
 *   below zero. "correct" is true only on a fully-correct selection.
 */
export function scoreQuiz(
  question: Question,
  selectedChoiceIds: string[],
  timeTakenMs: number,
  settings: GameSettings,
): QuestionResult {
  const choices = question.choices ?? [];
  const correctIds = choices.filter((c) => c.correct).map((c) => c.id);
  const picked = new Set(selectedChoiceIds);

  let fraction: number;
  let fullyCorrect: boolean;

  if (question.multi) {
    const correctPicks = correctIds.filter((id) => picked.has(id)).length;
    const wrongPicks = selectedChoiceIds.filter((id) => !correctIds.includes(id)).length;
    const net = Math.max(0, correctPicks - wrongPicks);
    fraction = correctIds.length === 0 ? 0 : net / correctIds.length;
    fullyCorrect = correctPicks === correctIds.length && wrongPicks === 0;
  } else {
    fullyCorrect = selectedChoiceIds.length === 1 && correctIds.includes(selectedChoiceIds[0]);
    fraction = fullyCorrect ? 1 : 0;
  }

  return {
    questionId: question.id,
    selectedChoiceIds,
    correct: fullyCorrect,
    fraction,
    correctCount: choices.filter((c) => c.correct && picked.has(c.id)).length,
    totalCount: correctIds.length,
    timeTakenMs,
    pointsEarned: Math.round(applySpeedTier(question.points * fraction, timeTakenMs, settings)),
  };
}

/**
 * Score a match question.
 * `pairs` maps answerId -> the typeId the player connected it to (absent = left
 * unconnected). An answer is correct when connected to its own typeId; an
 * irrelevant answer (typeId null) is correct when left unconnected.
 *
 * Points = 20 per correct match, plus a speed bonus of 5 points for every whole
 * 5 seconds still on the clock at submit (only when at least one match is right,
 * and only while the speed-bonus setting is on).
 */
export function scoreMatch(
  question: Question,
  pairs: Record<string, string>,
  timeTakenMs: number,
  settings: GameSettings,
): QuestionResult {
  const answers = question.answers ?? [];
  const total = answers.length;

  let correctCount = 0;
  for (const a of answers) {
    const connectedTo = pairs[a.id];
    if (a.typeId === null) {
      if (!connectedTo) correctCount++; // decoy correctly left unmatched
    } else if (connectedTo === a.typeId) {
      correctCount++; // matched to its correct type
    }
  }

  const fraction = total === 0 ? 0 : correctCount / total;
  const fullyCorrect = correctCount === total && total > 0;

  const base = correctCount * MATCH_POINTS_PER_CORRECT;
  const remainingMs = Math.max(0, TIME_PER_QUESTION_MS - timeTakenMs);
  const speedBonus =
    settings.speedBonus && correctCount > 0
      ? Math.floor(remainingMs / SPEED_BONUS_UNIT_MS) * SPEED_BONUS_POINTS
      : 0;

  return {
    questionId: question.id,
    selectedChoiceIds: [],
    matchedPairs: pairs,
    correct: fullyCorrect,
    fraction,
    correctCount,
    totalCount: total,
    timeTakenMs,
    pointsEarned: base + speedBonus,
  };
}

/** Perfect speedrun = every question fully correct, each answered under 20s. */
export function isPerfectSpeedrun(results: QuestionResult[]): boolean {
  return (
    results.length > 0 &&
    results.every((r) => r.correct && r.timeTakenMs <= FULL_POINTS_WINDOW_MS)
  );
}

export function totalScore(results: QuestionResult[], settings: GameSettings): number {
  const base = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const bonus = settings.speedBonus && isPerfectSpeedrun(results) ? settings.speedrunBonus : 0;
  return base + bonus;
}
