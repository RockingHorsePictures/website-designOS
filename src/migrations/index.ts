import * as migration_20260913_090945_initial from './20260913_090945_initial';

export const migrations = [
  {
    up: migration_20260913_090945_initial.up,
    down: migration_20260913_090945_initial.down,
    name: '20260913_090945_initial'
  },
];
