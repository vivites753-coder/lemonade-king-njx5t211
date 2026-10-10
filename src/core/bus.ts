/** Minimal typed event bus. The simulation emits, UI / renderer / audio listen. */
export class Bus<E extends Record<string, unknown>> {
  private handlers: { [K in keyof E]?: Array<(d: E[K]) => void> } = {};

  on<K extends keyof E>(k: K, h: (d: E[K]) => void): () => void {
    const list = (this.handlers[k] ??= []);
    list.push(h);
    return () => {
      const i = list.indexOf(h);
      if (i >= 0) list.splice(i, 1);
    };
  }

  emit<K extends keyof E>(k: K, d: E[K]): void {
    const list = this.handlers[k];
    if (!list) return;
    for (const h of list.slice()) h(d);
  }
}
