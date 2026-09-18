// ============================================================
// Default settings + question pool — "The Agentic Challenge" (5 questions).
// A questionnaire (quiz mode). One question (Q3) is multi-select.
// Event owner can still edit everything via the admin console.
// ============================================================
import type { Choice, GameSettings, Question } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  mode: 'quiz',
  questionsPerGame: 5,
  speedBonus: true, // +5 per question answered correctly within 20s (10 base + 5)
  speedrunBonus: 0,
  perQuestionScoreDisplay: true,
  randomize: true,
  sound: true,
};

const POINTS = 10;
let cid = 0;
const opt = (label: string, correct = false): Choice => ({ id: `c${++cid}`, label, emoji: '', correct });

const QUIZ: Question[] = [
  {
    id: 'aq1',
    kind: 'quiz',
    active: true,
    points: POINTS,
    multi: false,
    text: 'What percentage of Malaysians prefer messaging as their way to reach a business?',
    choices: [opt('45%'), opt('62%'), opt('80%', true), opt('95%')],
    explanation:
      '80.4% — five points above the global average. Your customers have already chosen the channel.',
  },
  {
    id: 'aq2',
    kind: 'quiz',
    active: true,
    points: POINTS,
    multi: false,
    text: 'How much higher is the click-through rate on WhatsApp compared to email?',
    choices: [opt('1.5X'), opt('2X'), opt('4.5X', true), opt('10X')],
    explanation:
      '4.5X higher. Air France used WhatsApp across marketing and boarding passes. (Results self-reported; individual results will differ.)',
  },
  {
    id: 'aq3',
    kind: 'quiz',
    active: true,
    points: POINTS,
    multi: true,
    text: 'Which of these makes a marketing message get left on read? (select all that apply)',
    choices: [
      opt('Long dense block of text', true),
      opt('Excessive use of emojis', true),
      opt('Multiple different URLs embedded in text', true),
      opt('Multiple competing calls to action', true),
      opt('Promotional code buried in the message', true),
      opt('A single clear CTA button', false),
    ],
    explanation:
      'All five are conversion killers. The one that works? One clear CTA button.',
  },
  {
    id: 'aq4',
    kind: 'quiz',
    active: true,
    points: POINTS,
    multi: false,
    text: 'WhatsApp truncates marketing messages after how many lines?',
    choices: [opt('3 lines'), opt('5 lines', true), opt('10 lines'), opt('No limit')],
    explanation:
      "After 5 lines your message is truncated — people have to tap 'read more'. Front-load everything that matters, and bold it.",
  },
  {
    id: 'aq5',
    kind: 'quiz',
    active: true,
    points: POINTS,
    multi: false,
    text: 'Which is NOT a differentiator of the Meta Business Agent Platform?',
    choices: [
      opt('Cross-session memory that recognises returning customers'),
      opt('3.5B+ daily active users across WhatsApp, Facebook and Instagram'),
      opt('It replaces your existing CRM', true),
      opt('ISO 27001, GDPR and CCPA compliance'),
    ],
    explanation:
      "It connects to your stack — it doesn't replace it. Plus proactive re-engagement, cross-platform personalisation, and native in-thread commerce with no redirects.",
  },
];

export const SEED_QUESTIONS: Question[] = QUIZ;
