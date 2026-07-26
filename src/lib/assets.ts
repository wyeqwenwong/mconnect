// Resolve a bundled asset from public/assets. BASE_URL keeps paths relative so
// the same build works under the dev server, Vercel, and Electron (file://).
export const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;

// A+ strategy icon set (design_handoff asset map §5). Each type carries a brand
// color used for the match-line stroke and admin chips.
// Colors sampled from the actual icon PNGs so the match line matches its icon.
export const STRATEGY_ICONS = {
  audience: { file: 'icon-audience.png', label: 'A+ Audience', color: '#940BFF' },
  budget: { file: 'icon-budget.png', label: 'A+ Budget', color: '#FDB60B' },
  creative: { file: 'icon-creative.png', label: 'A+ Creative', color: '#FF1A77' },
  placements: { file: 'icon-placements.png', label: 'A+ Placements', color: '#FA9AD7' },
  shopping: { file: 'icon-shopping.png', label: 'A+ Shopping', color: '#6EE146' },
} as const;

export type StrategyIconKey = keyof typeof STRATEGY_ICONS;

export const STRATEGY_ICON_KEYS = Object.keys(STRATEGY_ICONS) as StrategyIconKey[];

export const iconFile = (key: string) =>
  asset(STRATEGY_ICONS[key as StrategyIconKey]?.file ?? 'icon-audience.png');

export const iconColor = (key: string) =>
  STRATEGY_ICONS[key as StrategyIconKey]?.color ?? '#0064E0';
