// Turn stored game results into downloadable files for the admin/web portal.
// Two formats: a spreadsheet-friendly CSV (one row per game, with per-question
// detail folded into a JSON cell) and a raw JSON dump (full fidelity).
import type { Score } from './types';

function aggregate(s: Score) {
  const b = s.breakdown ?? [];
  const answered = b.length;
  const correct = b.filter((q) => q.correct).length;
  const timeMs = b.reduce((t, q) => t + (q.timeTakenMs ?? 0), 0);
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  return { answered, correct, timeMs, accuracy };
}

// RFC-4180 field escaping. Prefix a leading =/+/-/@ with a quote+space guard so
// spreadsheet apps don't interpret a player name as a formula.
function cell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/** One row per game result. Chronological, with a rank-by-score column. */
export function resultsToCsv(scores: Score[]): string {
  const byScore = [...scores].sort((a, b) => b.total - a.total || a.createdAt - b.createdAt);
  const rankOf = new Map(byScore.map((s, i) => [s.id, i + 1]));
  const chronological = [...scores].sort((a, b) => a.createdAt - b.createdAt);

  const headers = [
    'played_at_iso',
    'played_at_local',
    'rank_by_score',
    'player_name',
    'total_score',
    'perfect_speedrun',
    'panel_id',
    'questions_answered',
    'questions_correct',
    'accuracy_pct',
    'total_time_seconds',
    'breakdown_json',
  ];

  const rows = chronological.map((s) => {
    const a = aggregate(s);
    const d = new Date(s.createdAt);
    return [
      d.toISOString(),
      d.toLocaleString(),
      rankOf.get(s.id) ?? '',
      s.name,
      s.total,
      s.perfectSpeedrun ? 'yes' : 'no',
      s.panelId ?? '',
      a.answered,
      a.correct,
      a.accuracy,
      (a.timeMs / 1000).toFixed(1),
      JSON.stringify(s.breakdown ?? []),
    ]
      .map(cell)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function resultsToJson(scores: Score[]): string {
  const chronological = [...scores].sort((a, b) => a.createdAt - b.createdAt);
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), count: chronological.length, results: chronological },
    null,
    2,
  );
}

/** Trigger a browser download of a text file. */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** yyyymmdd-hhmm stamp for filenames. */
export function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
