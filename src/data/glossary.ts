/** Business glossary terms. Texts: `gl.<id>.term` and `gl.<id>.text`. */
export const GLOSSARY_IDS = [
  'income',
  'expenses',
  'profit',
  'cost',
  'price',
  'demand',
  'funnel',
  'advertising',
  'reputation',
  'investment',
  'rent',
  'time',
  'stock',
  'quality',
  'risk',
  'service',
  'wear',
  'salary',
  'brand',
] as const;

export type GlossaryId = (typeof GLOSSARY_IDS)[number];

/** Which glossary cards a Lemi tip unlocks. */
export const TIP_GLOSSARY: Record<string, GlossaryId[]> = {
  market: ['time'],
  cheap_lemons: ['quality'],
  prepare_cost: ['cost'],
  price: ['price', 'demand'],
  sell_start: ['funnel', 'advertising'],
  first_sale: ['income', 'profit'],
  report: ['expenses', 'profit'],
  shop: ['investment'],
  spoiled: ['stock'],
  location: ['rent'],
  thief: ['risk'],
  rain: ['risk'],
  expensive: ['demand'],
  queue: ['service'],
  reputation: ['reputation'],
  breakdown: ['wear'],
  maintenance: ['wear'],
  helper: ['salary'],
  loyalty: ['brand'],
  delivery: ['time'],
};
