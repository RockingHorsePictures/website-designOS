import * as migration_20260913_090945_initial from './20260913_090945_initial';
import * as migration_20260913_101024_typography from './20260913_101024_typography';
import * as migration_20260913_102714_brand_assets from './20260913_102714_brand_assets';
import * as migration_20260913_103239_font_weight_range from './20260913_103239_font_weight_range';
import * as migration_20260913_115655_publishing_locks from './20260913_115655_publishing_locks';

export const migrations = [
  {
    up: migration_20260913_090945_initial.up,
    down: migration_20260913_090945_initial.down,
    name: '20260913_090945_initial',
  },
  {
    up: migration_20260913_101024_typography.up,
    down: migration_20260913_101024_typography.down,
    name: '20260913_101024_typography',
  },
  {
    up: migration_20260913_102714_brand_assets.up,
    down: migration_20260913_102714_brand_assets.down,
    name: '20260913_102714_brand_assets',
  },
  {
    up: migration_20260913_103239_font_weight_range.up,
    down: migration_20260913_103239_font_weight_range.down,
    name: '20260913_103239_font_weight_range',
  },
  {
    up: migration_20260913_115655_publishing_locks.up,
    down: migration_20260913_115655_publishing_locks.down,
    name: '20260913_115655_publishing_locks'
  },
];
