import { Level } from '@/types/event';

export const LEVEL_PRIORITY: Level[] = ['S', 'M*', 'M', 'L', 'A**', 'A*', 'A', 'E', 'WB'];

export const LEVEL_STYLE_CLASSES: Record<Level, string> = {
  E:    'border-level-e/25 bg-level-e/15 text-level-e',
  A:    'border-level-a/25 bg-level-a/15 text-level-a',
  'A*': 'border-level-a/25 bg-level-a/15 text-level-a',
  'A**':'border-level-a/25 bg-level-a/15 text-level-a',
  L:    'border-level-l/25 bg-level-l/15 text-level-l',
  M:    'border-level-m/25 bg-level-m/15 text-level-m',
  'M*': 'border-level-m/25 bg-level-m/15 text-level-m',
  S:    'border-level-s/25 bg-level-s/15 text-level-s',
  WB:   'border-gray-300/50 bg-gray-100 text-gray-500',
};

export function getSortedLevels(levels: Level[]): Level[] {
  return [...levels].sort((a, b) => LEVEL_PRIORITY.indexOf(a) - LEVEL_PRIORITY.indexOf(b));
}

export function getHighestLevel(levels: Level[]): Level {
  return getSortedLevels(levels)[0] ?? 'E';
}

export function getMarkerTone(level: Level): string {
  return level.toLowerCase();
}
