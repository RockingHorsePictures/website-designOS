import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_theme_body_font" AS ENUM('system-sans', 'system-serif', 'system-mono', 'inter', 'source-sans-3', 'lora');
  CREATE TYPE "public"."enum_theme_heading_font" AS ENUM('system-sans', 'system-serif', 'system-mono', 'inter', 'source-sans-3', 'lora');
  CREATE TYPE "public"."enum_theme_body_weight" AS ENUM('400', '500', '600', '700');
  CREATE TYPE "public"."enum_theme_heading_weight" AS ENUM('400', '500', '600', '700');
  CREATE TYPE "public"."enum_theme_emphasis_weight" AS ENUM('400', '500', '600', '700');
  CREATE TYPE "public"."enum__theme_v_version_body_font" AS ENUM('system-sans', 'system-serif', 'system-mono', 'inter', 'source-sans-3', 'lora');
  CREATE TYPE "public"."enum__theme_v_version_heading_font" AS ENUM('system-sans', 'system-serif', 'system-mono', 'inter', 'source-sans-3', 'lora');
  CREATE TYPE "public"."enum__theme_v_version_body_weight" AS ENUM('400', '500', '600', '700');
  CREATE TYPE "public"."enum__theme_v_version_heading_weight" AS ENUM('400', '500', '600', '700');
  CREATE TYPE "public"."enum__theme_v_version_emphasis_weight" AS ENUM('400', '500', '600', '700');
  ALTER TABLE "theme" ADD COLUMN "body_font" "enum_theme_body_font" DEFAULT 'system-sans' NOT NULL;
  ALTER TABLE "theme" ADD COLUMN "heading_font" "enum_theme_heading_font" DEFAULT 'system-sans' NOT NULL;
  ALTER TABLE "theme" ADD COLUMN "body_weight" "enum_theme_body_weight" DEFAULT '400' NOT NULL;
  ALTER TABLE "theme" ADD COLUMN "heading_weight" "enum_theme_heading_weight" DEFAULT '700' NOT NULL;
  ALTER TABLE "theme" ADD COLUMN "emphasis_weight" "enum_theme_emphasis_weight" DEFAULT '700' NOT NULL;
  ALTER TABLE "_theme_v" ADD COLUMN "version_body_font" "enum__theme_v_version_body_font" DEFAULT 'system-sans' NOT NULL;
  ALTER TABLE "_theme_v" ADD COLUMN "version_heading_font" "enum__theme_v_version_heading_font" DEFAULT 'system-sans' NOT NULL;
  ALTER TABLE "_theme_v" ADD COLUMN "version_body_weight" "enum__theme_v_version_body_weight" DEFAULT '400' NOT NULL;
  ALTER TABLE "_theme_v" ADD COLUMN "version_heading_weight" "enum__theme_v_version_heading_weight" DEFAULT '700' NOT NULL;
  ALTER TABLE "_theme_v" ADD COLUMN "version_emphasis_weight" "enum__theme_v_version_emphasis_weight" DEFAULT '700' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "theme" DROP COLUMN "body_font";
  ALTER TABLE "theme" DROP COLUMN "heading_font";
  ALTER TABLE "theme" DROP COLUMN "body_weight";
  ALTER TABLE "theme" DROP COLUMN "heading_weight";
  ALTER TABLE "theme" DROP COLUMN "emphasis_weight";
  ALTER TABLE "_theme_v" DROP COLUMN "version_body_font";
  ALTER TABLE "_theme_v" DROP COLUMN "version_heading_font";
  ALTER TABLE "_theme_v" DROP COLUMN "version_body_weight";
  ALTER TABLE "_theme_v" DROP COLUMN "version_heading_weight";
  ALTER TABLE "_theme_v" DROP COLUMN "version_emphasis_weight";
  DROP TYPE "public"."enum_theme_body_font";
  DROP TYPE "public"."enum_theme_heading_font";
  DROP TYPE "public"."enum_theme_body_weight";
  DROP TYPE "public"."enum_theme_heading_weight";
  DROP TYPE "public"."enum_theme_emphasis_weight";
  DROP TYPE "public"."enum__theme_v_version_body_font";
  DROP TYPE "public"."enum__theme_v_version_heading_font";
  DROP TYPE "public"."enum__theme_v_version_body_weight";
  DROP TYPE "public"."enum__theme_v_version_heading_weight";
  DROP TYPE "public"."enum__theme_v_version_emphasis_weight";`)
}
