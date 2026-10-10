/** Small seedable RNG (mulberry32). The whole simulation uses it so days can be replayed and tested. */
export class RNG {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  weighted<K extends string>(weights: Partial<Record<K, number>>): K {
    const entries = Object.entries(weights) as [K, number][];
    const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
    let r = this.next() * total;
    for (const [k, w] of entries) {
      r -= Math.max(0, w);
      if (r < 0) return k;
    }
    return entries[entries.length - 1][0];
  }

  /** Number of successes in n trials with probability p. */
  binomial(n: number, p: number): number {
    let k = 0;
    for (let i = 0; i < n; i++) if (this.next() < p) k++;
    return k;
  }
}
