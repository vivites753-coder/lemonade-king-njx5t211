// Numbers for "My stands": extra stands at other places, run by hired sellers.

export const POINTS = {
  /** Best reputation needed to open extra stands. */
  MIN_REP: 3,
  MAX: 3,
  /** Building a second stand (table, pitcher, sign). */
  COST: 400,
  /** Share of the cost you get back when you close a stand. */
  SELL_BACK: 0.5,
  /** A seller opens the stand at 10:00 (12:00 when late). */
  OPEN_H: 10,
  LATE_OPEN_H: 12,
  /** Cups a seller can pour in a day at skill 1. */
  CAPACITY: 70,
  /** Lemonade that is poured out at the end of the day (share of what was sold). */
  WASTE: 0.1,
  /** Training a rude seller. */
  TRAIN_COST: 40,
  TRAIN_SKILL: 0.15,
  /** A raise is +10 coins a day; a refused seller quits with this chance. */
  RAISE: 10,
  QUIT_ON_REFUSE: 0.5,
  /** After this many warnings the seller has to go. */
  MAX_WARNINGS: 3,
  /** Honesty lost when a thief is given a second chance (they got away with it). */
  SECOND_CHANCE_HONESTY: 0.1,
} as const;

/** Problems with workers. Morning ones are known before the day, a theft is found at the evening count. */
export const WORKER_ISSUES = ['sick', 'late', 'rude', 'raise', 'stole'] as const;
export type WorkerIssue = (typeof WORKER_ISSUES)[number];

/** Seller names: i18n keys `staff.name<N>` (the first half are girls' names). */
export const SELLER_NAMES = 12;
