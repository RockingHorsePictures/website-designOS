import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_theme_body_weight" ADD VALUE '100' BEFORE '400';
  ALTER TYPE "public"."enum_theme_body_weight" ADD VALUE '200' BEFORE '400';
  ALTER TYPE "public"."enum_theme_body_weight" ADD VALUE '300' BEFORE '400';
  ALTER TYPE "public"."enum_theme_body_weight" ADD VALUE '800';
  ALTER TYPE "public"."enum_theme_body_weight" ADD VALUE '900';
  ALTER TYPE "public"."enum_theme_heading_weight" ADD VALUE '100' BEFORE '400';
  ALTER TYPE "public"."enum_theme_heading_weight" ADD VALUE '200' BEFORE '400';
  ALTER TYPE "public"."enum_theme_heading_weight" ADD VALUE '300' BEFORE '400';
  ALTER TYPE "public"."enum_theme_heading_weight" ADD VALUE '800';
  ALTER TYPE "public"."enum_theme_heading_weight" ADD VALUE '900';
  ALTER TYPE "public"."enum_theme_emphasis_weight" ADD VALUE '100' BEFORE '400';
  ALTER TYPE "public"."enum_theme_emphasis_weight" ADD VALUE '200' BEFORE '400';
  ALTER TYPE "public"."enum_theme_emphasis_weight" ADD VALUE '300' BEFORE '400';
  ALTER TYPE "public"."enum_theme_emphasis_weight" ADD VALUE '800';
  ALTER TYPE "public"."enum_theme_emphasis_weight" ADD VALUE '900';
  ALTER TYPE "public"."enum__theme_v_version_body_weight" ADD VALUE '100' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_body_weight" ADD VALUE '200' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_body_weight" ADD VALUE '300' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_body_weight" ADD VALUE '800';
  ALTER TYPE "public"."enum__theme_v_version_body_weight" ADD VALUE '900';
  ALTER TYPE "public"."enum__theme_v_version_heading_weight" ADD VALUE '100' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_heading_weight" ADD VALUE '200' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_heading_weight" ADD VALUE '300' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_heading_weight" ADD VALUE '800';
  ALTER TYPE "public"."enum__theme_v_version_heading_weight" ADD VALUE '900';
  ALTER TYPE "public"."enum__theme_v_version_emphasis_weight" ADD VALUE '100' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_emphasis_weight" ADD VALUE '200' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_emphasis_weight" ADD VALUE '300' BEFORE '400';
  ALTER TYPE "public"."enum__theme_v_version_emphasis_weight" ADD VALUE '800';
  ALTER TYPE "public"."enum__theme_v_version_emphasis_weight" ADD VALUE '900';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "theme" ALTER COLUMN "body_weight" SET DATA TYPE text;
  UPDATE "theme" SET "body_weight" = '400' WHERE "body_weight" NOT IN ('400', '500', '600', '700');
  ALTER TABLE "theme" ALTER COLUMN "body_weight" SET DEFAULT '400'::text;
  DROP TYPE "public"."enum_theme_body_weight";
  CREATE TYPE "public"."enum_theme_body_weight" AS ENUM('400', '500', '600', '700');
  ALTER TABLE "theme" ALTER COLUMN "body_weight" SET DEFAULT '400'::"public"."enum_theme_body_weight";
  ALTER TABLE "theme" ALTER COLUMN "body_weight" SET DATA TYPE "public"."enum_theme_body_weight" USING "body_weight"::"public"."enum_theme_body_weight";
  ALTER TABLE "theme" ALTER COLUMN "heading_weight" SET DATA TYPE text;
  UPDATE "theme" SET "heading_weight" = '700' WHERE "heading_weight" NOT IN ('400', '500', '600', '700');
  ALTER TABLE "theme" ALTER COLUMN "heading_weight" SET DEFAULT '700'::text;
  DROP TYPE "public"."enum_theme_heading_weight";
  CREATE TYPE "public"."enum_theme_heading_weight" AS ENUM('400', '500', '600', '700');
  ALTER TABLE "theme" ALTER COLUMN "heading_weight" SET DEFAULT '700'::"public"."enum_theme_heading_weight";
  ALTER TABLE "theme" ALTER COLUMN "heading_weight" SET DATA TYPE "public"."enum_theme_heading_weight" USING "heading_weight"::"public"."enum_theme_heading_weight";
  ALTER TABLE "theme" ALTER COLUMN "emphasis_weight" SET DATA TYPE text;
  UPDATE "theme" SET "emphasis_weight" = '700' WHERE "emphasis_weight" NOT IN ('400', '500', '600', '700');
  ALTER TABLE "theme" ALTER COLUMN "emphasis_weight" SET DEFAULT '700'::text;
  DROP TYPE "public"."enum_theme_emphasis_weight";
  CREATE TYPE "public"."enum_theme_emphasis_weight" AS ENUM('400', '500', '600', '700');
  ALTER TABLE "theme" ALTER COLUMN "emphasis_weight" SET DEFAULT '700'::"public"."enum_theme_emphasis_weight";
  ALTER TABLE "theme" ALTER COLUMN "emphasis_weight" SET DATA TYPE "public"."enum_theme_emphasis_weight" USING "emphasis_weight"::"public"."enum_theme_emphasis_weight";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_body_weight" SET DATA TYPE text;
  UPDATE "_theme_v" SET "version_body_weight" = '400' WHERE "version_body_weight" NOT IN ('400', '500', '600', '700');
  ALTER TABLE "_theme_v" ALTER COLUMN "version_body_weight" SET DEFAULT '400'::text;
  DROP TYPE "public"."enum__theme_v_version_body_weight";
  CREATE TYPE "public"."enum__theme_v_version_body_weight" AS ENUM('400', '500', '600', '700');
  ALTER TABLE "_theme_v" ALTER COLUMN "version_body_weight" SET DEFAULT '400'::"public"."enum__theme_v_version_body_weight";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_body_weight" SET DATA TYPE "public"."enum__theme_v_version_body_weight" USING "version_body_weight"::"public"."enum__theme_v_version_body_weight";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_heading_weight" SET DATA TYPE text;
  UPDATE "_theme_v" SET "version_heading_weight" = '700' WHERE "version_heading_weight" NOT IN ('400', '500', '600', '700');
  ALTER TABLE "_theme_v" ALTER COLUMN "version_heading_weight" SET DEFAULT '700'::text;
  DROP TYPE "public"."enum__theme_v_version_heading_weight";
  CREATE TYPE "public"."enum__theme_v_version_heading_weight" AS ENUM('400', '500', '600', '700');
  ALTER TABLE "_theme_v" ALTER COLUMN "version_heading_weight" SET DEFAULT '700'::"public"."enum__theme_v_version_heading_weight";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_heading_weight" SET DATA TYPE "public"."enum__theme_v_version_heading_weight" USING "version_heading_weight"::"public"."enum__theme_v_version_heading_weight";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_emphasis_weight" SET DATA TYPE text;
  UPDATE "_theme_v" SET "version_emphasis_weight" = '700' WHERE "version_emphasis_weight" NOT IN ('400', '500', '600', '700');
  ALTER TABLE "_theme_v" ALTER COLUMN "version_emphasis_weight" SET DEFAULT '700'::text;
  DROP TYPE "public"."enum__theme_v_version_emphasis_weight";
  CREATE TYPE "public"."enum__theme_v_version_emphasis_weight" AS ENUM('400', '500', '600', '700');
  ALTER TABLE "_theme_v" ALTER COLUMN "version_emphasis_weight" SET DEFAULT '700'::"public"."enum__theme_v_version_emphasis_weight";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_emphasis_weight" SET DATA TYPE "public"."enum__theme_v_version_emphasis_weight" USING "version_emphasis_weight"::"public"."enum__theme_v_version_emphasis_weight";`)
}
