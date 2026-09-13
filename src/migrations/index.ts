import * as migration_20260913_090945_initial from './20260913_090945_initial';
import * as migration_20260913_101024_typography from './20260913_101024_typography';

export const migrations = [
  {
    up: migration_20260913_090945_initial.up,
    down: migration_20260913_090945_initial.down,
    name: '20260913_090945_initial',
  },
  {
    up: migration_20260913_101024_typography.up,
    down: migration_20260913_101024_typography.down,
    name: '20260913_101024_typography'
  },
];
