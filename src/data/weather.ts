import type { WeatherId } from '../core/types';

export interface WeatherDef {
  id: WeatherId;
  icon: string;
  /** Multiplier for how many people are outside. */
  ped: number;
  /** Multiplier for the stop chance (how thirsty people are). */
  thirst: number;
  /** Weight for random weather rolls. */
  weight: number;
}

export const WEATHER: Record<WeatherId, WeatherDef> = {
  sunny: { id: 'sunny', icon: '☀️', ped: 1.0, thirst: 1.1, weight: 35 },
  hot: { id: 'hot', icon: '🥵', ped: 1.05, thirst: 1.5, weight: 20 },
  cloudy: { id: 'cloudy', icon: '⛅', ped: 0.85, thirst: 0.8, weight: 20 },
  rain: { id: 'rain', icon: '🌧️', ped: 0.3, thirst: 0.6, weight: 15 },
  wind: { id: 'wind', icon: '💨', ped: 0.9, thirst: 0.85, weight: 5 },
  cold: { id: 'cold', icon: '🧣', ped: 0.7, thirst: 0.5, weight: 5 },
};

/** Ordered from warm to wet; a wrong forecast picks a neighbour in this list. */
export const WEATHER_ORDER: WeatherId[] = ['hot', 'sunny', 'wind', 'cloudy', 'cold', 'rain'];

export const WEATHER_IDS = Object.keys(WEATHER) as WeatherId[];
