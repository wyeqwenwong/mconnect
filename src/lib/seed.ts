// ============================================================
// Default settings + launch question pool (quiz + match).
// Content is placeholder per handoff §8 — the event owner replaces it via the
// admin console. Pool holds both kinds; settings.mode picks which is played.
// ============================================================
import type { GameSettings, Question } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  mode: 'match',
  questionsPerGame: 5,
  speedBonus: true,
  speedrunBonus: 0, // match speed reward is now +5 per 5s left (see scoreMatch)
  perQuestionScoreDisplay: true,
  randomize: true,
  sound: true,
};

const STRATEGIES = {
  placements: { icon: 'placements', label: 'A+ Placement' },
  audience: { icon: 'audience', label: 'A+ Audience' },
  creative: { icon: 'creative', label: 'A+ Creative' },
  shopping: { icon: 'shopping', label: 'A+ Shopping' },
  budget: { icon: 'budget', label: 'A+ Budget' },
} as const;

type StratKey = keyof typeof STRATEGIES;

let cid = 0;
function choice(key: StratKey, correct: boolean) {
  const s = STRATEGIES[key];
  return { id: `c${++cid}`, label: s.label, emoji: '', correct };
}

/** Single-select quiz question with one correct strategy among the five. */
function single(
  id: string,
  text: string,
  correctKey: StratKey,
  explanation: string,
  points = 100,
): Question {
  const keys: StratKey[] = ['placements', 'audience', 'creative', 'shopping', 'budget'];
  return {
    id,
    kind: 'quiz',
    text,
    explanation,
    points,
    multi: false,
    active: true,
    choices: keys.map((k) => choice(k, k === correctKey)),
  };
}

// -------- quiz pool --------
const QUIZ: Question[] = [
  single('q1', 'My CPM is too high.', 'placements', 'A+ Placements — optimize where ads appear to lower CPM.'),
  single('q2', 'I’m not reaching new customers.', 'audience', 'A+ Audience — refine targeting to expand reach.'),
  single('q3', 'I’m spending too much time on creative.', 'creative', 'A+ Creative — streamline and strengthen creative.'),
  single('q4', 'I need better ROAS on my catalog.', 'shopping', 'A+ Shopping — leverage catalog and shopping features.'),
  single('q5', 'My budget isn’t distributed efficiently.', 'budget', 'A+ Budget — optimize allocation and bidding.', 150),
  single('q6', 'People see my ad but the message doesn’t land.', 'creative', 'A+ Creative — stronger creative improves resonance.'),
  single('q7', 'I keep hitting the same saturated audience.', 'audience', 'A+ Audience — broaden and refine targeting.'),
  single('q8', 'My ads show in the wrong formats and placements.', 'placements', 'A+ Placements — optimize placements across Meta.'),
  {
    id: 'q9',
    kind: 'quiz',
    text: 'Launching a new e-commerce store — which A+ Strategies should I lead with?',
    explanation: 'Shopping powers the catalog; Creative earns the click on cold traffic.',
    points: 120,
    multi: true,
    active: true,
    choices: [
      choice('placements', false),
      choice('audience', false),
      choice('creative', true),
      choice('shopping', true),
      choice('budget', false),
    ],
  },
  single('q10', 'My video ads get views but few clicks.', 'creative', 'A+ Creative — a sharper hook and CTA lifts CTR.'),
];

// -------- match pool --------
let tid = 0;
let aid = 0;
const t = (icon: StratKey) => ({ id: `t${++tid}`, icon: STRATEGIES[icon].icon, label: STRATEGIES[icon].label });

const MATCH: Question[] = [
  (() => {
    const types = { pl: t('placements'), au: t('audience'), cr: t('creative'), sh: t('shopping'), bu: t('budget') };
    return {
      id: 'm1',
      kind: 'match' as const,
      prompt: 'Match each problem to the A+ Strategy that solves it',
      points: 100,
      active: true,
      types: [types.pl, types.au, types.cr, types.sh, types.bu],
      answers: [
        { id: `a${++aid}`, text: '“I’m not reaching new customers”', typeId: types.au.id },
        { id: `a${++aid}`, text: '“I’m spending too much time on creative”', typeId: types.cr.id },
        { id: `a${++aid}`, text: '“I need better ROAS on my catalog”', typeId: types.sh.id },
        { id: `a${++aid}`, text: '“My budget isn’t distributed efficiently”', typeId: types.bu.id },
        { id: `a${++aid}`, text: '“My CPM is too high”', typeId: types.pl.id },
      ],
    };
  })(),
  (() => {
    // Demonstrates multiple answers per type + an irrelevant decoy.
    const types = { au: t('audience'), cr: t('creative'), bu: t('budget'), sh: t('shopping') };
    return {
      id: 'm2',
      kind: 'match' as const,
      prompt: 'Match each problem to the A+ Strategy that solves it',
      points: 120,
      active: false, // only one match question active at a time

      types: [types.au, types.cr, types.bu, types.sh],
      answers: [
        // Audience has two possible answers — the game shows one at random per round.
        { id: `a${++aid}`, text: '“My ads reach the same people again and again”', typeId: types.au.id },
        { id: `a${++aid}`, text: '“I want to expand into new markets”', typeId: types.au.id },
        { id: `a${++aid}`, text: '“My video ads feel stale”', typeId: types.cr.id },
        { id: `a${++aid}`, text: '“My cost per purchase keeps climbing”', typeId: types.bu.id },
        { id: `a${++aid}`, text: '“I can’t showcase my product catalog”', typeId: types.sh.id },
        { id: `a${++aid}`, text: '“My office wifi is slow”', typeId: null }, // irrelevant decoy
      ],
    };
  })(),
];

export const SEED_QUESTIONS: Question[] = [...QUIZ, ...MATCH];
