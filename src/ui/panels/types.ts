import type { AgeMode, Avatar, Lang } from '../../core/types';
import type { Game } from '../../sim/game';

/** What panels may ask the UI controller to do. */
export interface UIApi {
  confirm(text: string, onYes: () => void): void;
  openSettings(): void;
  openGlossary(): void;
  openStock(): void;
  openRoadmap(): void;
  openTruck(): void;
  openPoints(): void;
  /** The people who want a job at this point (as its seller, or as its second worker). */
  openHire(pointId: number, role?: 'seller' | 'helper'): void;
  startNewGame(): void;
  continueGame(): void;
  hasSave(): boolean;
  setLang(l: Lang): void;
  toast(text: string, kind?: 'info' | 'warn' | 'good'): void;
  newSel: { avatar: Avatar; mode: AgeMode; name: string };
  titleScreen: 'main' | 'new';
  refresh(): void;
  selectProfile(id: string): void;
  deleteProfile(id: string): void;
}

export interface Panel {
  id: string;
  /** Docked to the right on wide screens (the scene stays visible); otherwise centred. */
  dock: boolean;
  /** Needs the whole screen width (the kitchen). */
  wide?: boolean;
  render(g: Game, ui: UIApi): string;
  act(g: Game, ui: UIApi, act: string, arg: string): void;
  /** Panels with live interaction (drag & drop) build their DOM once and update it in place. */
  mount?(el: HTMLElement, g: Game, ui: UIApi): void;
  update?(el: HTMLElement, g: Game, ui: UIApi): void;
  unmount?(): void;
}
