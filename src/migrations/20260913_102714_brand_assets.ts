import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_fonts_style" AS ENUM('normal', 'italic');
  ALTER TYPE "public"."enum_theme_body_font" ADD VALUE 'custom';
  ALTER TYPE "public"."enum_theme_heading_font" ADD VALUE 'custom';
  ALTER TYPE "public"."enum__theme_v_version_body_font" ADD VALUE 'custom';
  ALTER TYPE "public"."enum__theme_v_version_heading_font" ADD VALUE 'custom';
  CREATE TABLE "fonts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"weight_from" numeric DEFAULT 400 NOT NULL,
  	"weight_to" numeric,
  	"style" "enum_fonts_style" DEFAULT 'normal' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "theme_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"fonts_id" integer
  );
  
  CREATE TABLE "_theme_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"fonts_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "fonts_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "logo_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "inverse_logo_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "site_icon_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_logo_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_inverse_logo_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_site_icon_id" integer;
  ALTER TABLE "theme_rels" ADD CONSTRAINT "theme_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."theme"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "theme_rels" ADD CONSTRAINT "theme_rels_fonts_fk" FOREIGN KEY ("fonts_id") REFERENCES "public"."fonts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_theme_v_rels" ADD CONSTRAINT "_theme_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_theme_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_theme_v_rels" ADD CONSTRAINT "_theme_v_rels_fonts_fk" FOREIGN KEY ("fonts_id") REFERENCES "public"."fonts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "fonts_updated_at_idx" ON "fonts" USING btree ("updated_at");
  CREATE INDEX "fonts_created_at_idx" ON "fonts" USING btree ("created_at");
  CREATE UNIQUE INDEX "fonts_filename_idx" ON "fonts" USING btree ("filename");
  CREATE INDEX "theme_rels_order_idx" ON "theme_rels" USING btree ("order");
  CREATE INDEX "theme_rels_parent_idx" ON "theme_rels" USING btree ("parent_id");
  CREATE INDEX "theme_rels_path_idx" ON "theme_rels" USING btree ("path");
  CREATE INDEX "theme_rels_fonts_id_idx" ON "theme_rels" USING btree ("fonts_id");
  CREATE INDEX "_theme_v_rels_order_idx" ON "_theme_v_rels" USING btree ("order");
  CREATE INDEX "_theme_v_rels_parent_idx" ON "_theme_v_rels" USING btree ("parent_id");
  CREATE INDEX "_theme_v_rels_path_idx" ON "_theme_v_rels" USING btree ("path");
  CREATE INDEX "_theme_v_rels_fonts_id_idx" ON "_theme_v_rels" USING btree ("fonts_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fonts_fk" FOREIGN KEY ("fonts_id") REFERENCES "public"."fonts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_inverse_logo_id_media_id_fk" FOREIGN KEY ("inverse_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_site_icon_id_media_id_fk" FOREIGN KEY ("site_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_inverse_logo_id_media_id_fk" FOREIGN KEY ("version_inverse_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_site_icon_id_media_id_fk" FOREIGN KEY ("version_site_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_fonts_id_idx" ON "payload_locked_documents_rels" USING btree ("fonts_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_inverse_logo_idx" ON "site_settings" USING btree ("inverse_logo_id");
  CREATE INDEX "site_settings_site_icon_idx" ON "site_settings" USING btree ("site_icon_id");
  CREATE INDEX "_site_settings_v_version_version_logo_idx" ON "_site_settings_v" USING btree ("version_logo_id");
  CREATE INDEX "_site_settings_v_version_version_inverse_logo_idx" ON "_site_settings_v" USING btree ("version_inverse_logo_id");
  CREATE INDEX "_site_settings_v_version_version_site_icon_idx" ON "_site_settings_v" USING btree ("version_site_icon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "fonts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "theme_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_theme_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "fonts" CASCADE;
  DROP TABLE "theme_rels" CASCADE;
  DROP TABLE "_theme_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_fonts_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_logo_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_inverse_logo_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_site_icon_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_logo_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_inverse_logo_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_site_icon_id_media_id_fk";
  
  ALTER TABLE "theme" ALTER COLUMN "body_font" SET DATA TYPE text;
  UPDATE "theme" SET "body_font" = 'system-sans' WHERE "body_font" = 'custom';
  ALTER TABLE "theme" ALTER COLUMN "body_font" SET DEFAULT 'system-sans'::text;
  DROP TYPE "public"."enum_theme_body_font";
  CREATE TYPE "public"."enum_theme_body_font" AS ENUM('system-sans', 'system-serif', 'system-mono', 'inter', 'source-sans-3', 'lora');
  ALTER TABLE "theme" ALTER COLUMN "body_font" SET DEFAULT 'system-sans'::"public"."enum_theme_body_font";
  ALTER TABLE "theme" ALTER COLUMN "body_font" SET DATA TYPE "public"."enum_theme_body_font" USING "body_font"::"public"."enum_theme_body_font";
  ALTER TABLE "theme" ALTER COLUMN "heading_font" SET DATA TYPE text;
  UPDATE "theme" SET "heading_font" = 'system-sans' WHERE "heading_font" = 'custom';
  ALTER TABLE "theme" ALTER COLUMN "heading_font" SET DEFAULT 'system-sans'::text;
  DROP TYPE "public"."enum_theme_heading_font";
  CREATE TYPE "public"."enum_theme_heading_font" AS ENUM('system-sans', 'system-serif', 'system-mono', 'inter', 'source-sans-3', 'lora');
  ALTER TABLE "theme" ALTER COLUMN "heading_font" SET DEFAULT 'system-sans'::"public"."enum_theme_heading_font";
  ALTER TABLE "theme" ALTER COLUMN "heading_font" SET DATA TYPE "public"."enum_theme_heading_font" USING "heading_font"::"public"."enum_theme_heading_font";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_body_font" SET DATA TYPE text;
  UPDATE "_theme_v" SET "version_body_font" = 'system-sans' WHERE "version_body_font" = 'custom';
  ALTER TABLE "_theme_v" ALTER COLUMN "version_body_font" SET DEFAULT 'system-sans'::text;
  DROP TYPE "public"."enum__theme_v_version_body_font";
  CREATE TYPE "public"."enum__theme_v_version_body_font" AS ENUM('system-sans', 'system-serif', 'system-mono', 'inter', 'source-sans-3', 'lora');
  ALTER TABLE "_theme_v" ALTER COLUMN "version_body_font" SET DEFAULT 'system-sans'::"public"."enum__theme_v_version_body_font";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_body_font" SET DATA TYPE "public"."enum__theme_v_version_body_font" USING "version_body_font"::"public"."enum__theme_v_version_body_font";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_heading_font" SET DATA TYPE text;
  UPDATE "_theme_v" SET "version_heading_font" = 'system-sans' WHERE "version_heading_font" = 'custom';
  ALTER TABLE "_theme_v" ALTER COLUMN "version_heading_font" SET DEFAULT 'system-sans'::text;
  DROP TYPE "public"."enum__theme_v_version_heading_font";
  CREATE TYPE "public"."enum__theme_v_version_heading_font" AS ENUM('system-sans', 'system-serif', 'system-mono', 'inter', 'source-sans-3', 'lora');
  ALTER TABLE "_theme_v" ALTER COLUMN "version_heading_font" SET DEFAULT 'system-sans'::"public"."enum__theme_v_version_heading_font";
  ALTER TABLE "_theme_v" ALTER COLUMN "version_heading_font" SET DATA TYPE "public"."enum__theme_v_version_heading_font" USING "version_heading_font"::"public"."enum__theme_v_version_heading_font";
  DROP INDEX "payload_locked_documents_rels_fonts_id_idx";
  DROP INDEX "site_settings_logo_idx";
  DROP INDEX "site_settings_inverse_logo_idx";
  DROP INDEX "site_settings_site_icon_idx";
  DROP INDEX "_site_settings_v_version_version_logo_idx";
  DROP INDEX "_site_settings_v_version_version_inverse_logo_idx";
  DROP INDEX "_site_settings_v_version_version_site_icon_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "fonts_id";
  ALTER TABLE "site_settings" DROP COLUMN "logo_id";
  ALTER TABLE "site_settings" DROP COLUMN "inverse_logo_id";
  ALTER TABLE "site_settings" DROP COLUMN "site_icon_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_logo_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_inverse_logo_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_site_icon_id";
  DROP TYPE "public"."enum_fonts_style";`)
}
