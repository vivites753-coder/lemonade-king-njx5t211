// Numbers for "My stands": extra stands at other places, run by hired sellers.

export const POINTS = {
  /** Best reputation needed to open extra stands. */
  MIN_REP: 4,
  MAX: 3,
  /** A whole second stand with everything for work: table, pitchers, mixer, sign, umbrella, juicer. */
  COST: 2000,
  /** Share of the cost you get back when you close a stand. */
  SELL_BACK: 0.5,
  /** A seller opens the stand at 10:00 (12:00 when late). */
  OPEN_H: 10,
  LATE_OPEN_H: 12,
  /** Cups a seller can pour in a day at skill 1. */
  CAPACITY: 70,
  /** Lemonade that is poured out at the end of the day (share of what was sold); with a cooler it keeps. */
  WASTE: 0.1,
  WASTE_COOLER: 0.02,
  /** A wide counter (big stand, truck) lets a seller pour this much more in a day. */
  WIDE_CAPACITY: 1.25,
  /** More customers wait for their cup: a TV, shade outdoors; a perfect mix tastes better. */
  TV_SERVICE: 0.08,
  SHADE_SERVICE: 0.04,
  PRO_MIX: 1.05,
  /** A locked cash box: a dishonest seller takes money this much less often. */
  LOCK_THEFT: 0.4,
  /** A seller falls ill (and stays home for SICK_DAYS mornings). */
  SICK_CHANCE: 0.04,
  SICK_DAYS: [2, 3] as const,
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
