import type { AgeMode, Avatar } from '../../core/types';
import type { Game } from '../../sim/game';

/** What panels may ask the UI controller to do. */
export interface UIApi {
  confirm(text: string, onYes: () => void): void;
  openSettings(): void;
  openGlossary(): void;
  startNewGame(): void;
  continueGame(): void;
  hasSave(): boolean;
  setLang(l: 'uk' | 'en'): void;
  newSel: { avatar: Avatar; mode: AgeMode };
  titleScreen: 'main' | 'new';
  refresh(): void;
}

export interface Panel {
  id: string;
  /** Docked to the right on wide screens (the scene stays visible); otherwise centred. */
  dock: boolean;
  render(g: Game, ui: UIApi): string;
  act(g: Game, ui: UIApi, act: string, arg: string): void;
}
