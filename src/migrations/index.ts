import * as migration_20260913_090945_initial from './20260913_090945_initial';
import * as migration_20260913_101024_typography from './20260913_101024_typography';
import * as migration_20260913_102714_brand_assets from './20260913_102714_brand_assets';
import * as migration_20260913_103239_font_weight_range from './20260913_103239_font_weight_range';
import * as migration_20260913_115655_publishing_locks from './20260913_115655_publishing_locks';
import * as migration_20260913_184614_ai_reader from './20260913_184614_ai_reader';
import * as migration_20260929_204851_sections_forms_answer_engines from './20260929_204851_sections_forms_answer_engines';
import * as migration_20260930_000010_blog_forms_blocks_access from './20260930_000010_blog_forms_blocks_access';
import * as migration_20260930_000113_localization from './20260930_000113_localization';
import * as migration_20260930_230214_custom_order from './20260930_230214_custom_order';
import * as migration_20260930_230410_remove_numeric_order from './20260930_230410_remove_numeric_order';
import * as migration_20261001_162112_ai_live_editing from './20261001_162112_ai_live_editing';

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
    name: '20260913_115655_publishing_locks',
  },
  {
    up: migration_20260913_184614_ai_reader.up,
    down: migration_20260913_184614_ai_reader.down,
    name: '20260913_184614_ai_reader',
  },
  {
    up: migration_20260929_204851_sections_forms_answer_engines.up,
    down: migration_20260929_204851_sections_forms_answer_engines.down,
    name: '20260929_204851_sections_forms_answer_engines',
  },
  {
    up: migration_20260930_000010_blog_forms_blocks_access.up,
    down: migration_20260930_000010_blog_forms_blocks_access.down,
    name: '20260930_000010_blog_forms_blocks_access',
  },
  {
    up: migration_20260930_000113_localization.up,
    down: migration_20260930_000113_localization.down,
    name: '20260930_000113_localization',
  },
  {
    up: migration_20260930_230214_custom_order.up,
    down: migration_20260930_230214_custom_order.down,
    name: '20260930_230214_custom_order',
  },
  {
    up: migration_20260930_230410_remove_numeric_order.up,
    down: migration_20260930_230410_remove_numeric_order.down,
    name: '20260930_230410_remove_numeric_order',
  },
  {
    up: migration_20261001_162112_ai_live_editing.up,
    down: migration_20261001_162112_ai_live_editing.down,
    name: '20261001_162112_ai_live_editing'
  },
];
