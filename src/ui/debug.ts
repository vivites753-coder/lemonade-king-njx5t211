// Developer panel: toggle with the ` key or open the page with ?debug=1. Not localized on purpose.
import { CONFIG } from '../core/config';
import type { LocationId, WeatherId } from '../core/types';
import { DAY_EVENTS, type DayEventId } from '../data/events';
import { LOCATION_IDS } from '../data/locations';
import { WEATHER_IDS } from '../data/weather';
import { expectedDay } from '../sim/economy';
import type { Game } from '../sim/game';

export class DebugPanel {
  private open = false;
  private timer = 0;

  constructor(
    private el: HTMLElement,
    private g: Game,
  ) {
    window.addEventListener('keydown', (e) => {
      if (e.key === '`') this.toggle();
    });
    if (new URLSearchParams(location.search).get('debug') === '1') this.toggle();
    el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-dbg]');
      if (!b) return;
      const [act, arg] = b.dataset.dbg!.split(':');
      this.act(act, arg);
      this.render();
    });
  }

  toggle(): void {
    this.open = !this.open;
    this.el.classList.toggle('hidden', !this.open);
    this.render();
  }

  update(dt: number): void {
    if (!this.open) return;
    this.timer += dt;
    if (this.timer > 0.5) {
      this.timer = 0;
      this.render();
    }
  }

  private act(act: string, arg: string): void {
    const g = this.g;
    if (act === 'coins') g.debugAddCoins(Number(arg));
    if (act === 'weather') g.debugSetWeather(arg as WeatherId);
    if (act === 'event') g.debugForceEvent(arg as DayEventId);
    if (act === 'speed') g.setSpeed(Number(arg));
    if (act === 'end') g.endDay();
    if (act === 'rep') {
      g.S.rep = Math.min(5, g.S.rep + 1);
      g.refreshInterest();
    }
    if (act === 'loc' && g.phase === 'morning') {
      const day = g.S.day;
      g.S.day = Math.max(2, day);
      g.chooseLocation(arg as LocationId);
      g.S.day = day;
    }
    if (act === 'dump') console.log(JSON.parse(JSON.stringify({ S: g.S, D: g.D, phase: g.phase })));
  }

  private render(): void {
    if (!this.open) return;
    const g = this.g;
    const f = g.D.funnel;
    const rows = LOCATION_IDS.map((id) => {
      const e = expectedDay({ loc: id, weather: g.D.weather, price: g.S.price, upgrades: g.S.upgrades, speakerOn: g.S.speakerOn, rep: g.S.rep, from: 10 });
      return `<tr><td>${id}</td><td>${e.passers.toFixed(0)}</td><td>${e.buyers.toFixed(1)}</td><td>${e.profit.toFixed(0)}</td></tr>`;
    }).join('');
    this.el.innerHTML = `<b>DEBUG</b> seed=${g.S.seed} rng=${g.rng.state} phase=${g.phase}<br>
      day ${g.S.day} hour ${g.D.hour.toFixed(2)} speed ×${g.speed} peds ${g.street.peds.length} queue ${g.street.queue.length}<br>
      chance ${(g.interest.chance * 100).toFixed(1)}% radius ${g.radius.toFixed(1)} rep ${g.S.rep.toFixed(2)}<br>
      funnel p${f.passed} r${f.inRange} s${f.stopped} $${f.tooExpensive} q${f.queueFull} j${f.joined} sold${f.sold} imp${f.impatient}<br>
      events ${JSON.stringify(g.D.events)}<br>
      <button data-dbg="coins:100">+100</button><button data-dbg="coins:1000">+1000</button><button data-dbg="rep">+1★</button>
      <button data-dbg="speed:6">×6</button><button data-dbg="speed:10">×10</button><button data-dbg="end">end day</button><button data-dbg="dump">dump</button><br>
      weather: ${WEATHER_IDS.map((w) => `<button data-dbg="weather:${w}">${w}</button>`).join('')}<br>
      events: ${DAY_EVENTS.map((e) => `<button data-dbg="event:${e.id}">${e.id}</button>`).join('')}<br>
      location: ${LOCATION_IDS.map((l) => `<button data-dbg="loc:${l}">${l}</button>`).join('')}<br>
      <b>expected day</b> (price ${g.S.price}, from 10:00 → ${CONFIG.DAY_END}:00)
      <table><tr><td>loc</td><td>pass</td><td>buy</td><td>profit</td></tr>${rows}</table>`;
  }
}
