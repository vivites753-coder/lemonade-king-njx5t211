import type { PedTypeId } from '../core/types';

export interface PedTypeDef {
  id: PedTypeId;
  icon: string;
  /** Walking speed, tiles per simulation second. */
  speed: number;
  /** Drawing scale. */
  scale: number;
  /** Wallet multiplier against the location's fair price. */
  priceMult: number;
  /** Multiplier for the stop chance. */
  interest: number;
}

export const PED_TYPES: Record<PedTypeId, PedTypeDef> = {
  kid: { id: 'kid', icon: '🧒', speed: 1.1, scale: 0.74, priceMult: 0.85, interest: 1.25 },
  adult: { id: 'adult', icon: '🧑', speed: 1.2, scale: 1.0, priceMult: 1.1, interest: 1.0 },
  granny: { id: 'granny', icon: '👵', speed: 0.65, scale: 0.93, priceMult: 0.95, interest: 0.85 },
  sport: { id: 'sport', icon: '🏃', speed: 2.0, scale: 1.0, priceMult: 1.15, interest: 1.3 },
  tourist: { id: 'tourist', icon: '🧳', speed: 0.9, scale: 1.0, priceMult: 1.4, interest: 1.1 },
};
