import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_role" ADD VALUE 'ai';
  CREATE TABLE "site_releases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"format_version" numeric DEFAULT 1 NOT NULL,
  	"snapshot" jsonb NOT NULL,
  	"created_by" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "publication" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"preview_release_id" integer,
  	"live_release_id" integer,
  	"live_changed_at" timestamp(3) with time zone,
  	"changed_by" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "media" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "fonts" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "pages" ADD COLUMN "include_in_site" boolean DEFAULT true;
  ALTER TABLE "pages" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "_pages_v" ADD COLUMN "version_include_in_site" boolean DEFAULT true;
  ALTER TABLE "_pages_v" ADD COLUMN "version_protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "case_studies" ADD COLUMN "include_in_site" boolean DEFAULT true;
  ALTER TABLE "case_studies" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_include_in_site" boolean DEFAULT true;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "services" ADD COLUMN "include_in_site" boolean DEFAULT true;
  ALTER TABLE "services" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "_services_v" ADD COLUMN "version_include_in_site" boolean DEFAULT true;
  ALTER TABLE "_services_v" ADD COLUMN "version_protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "team_members" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "clients" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "approved_facts" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "redirects" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "site_releases_id" integer;
  ALTER TABLE "navigation" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "_navigation_v" ADD COLUMN "version_protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "site_settings" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "theme" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "_theme_v" ADD COLUMN "version_protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "search_profile" ADD COLUMN "protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "_search_profile_v" ADD COLUMN "version_protection" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "publication" ADD CONSTRAINT "publication_preview_release_id_site_releases_id_fk" FOREIGN KEY ("preview_release_id") REFERENCES "public"."site_releases"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "publication_singleton" ON "publication" ((true));
  INSERT INTO "publication" ("id", "created_at", "updated_at") VALUES (1, now(), now());
  ALTER TABLE "publication" ADD CONSTRAINT "publication_live_release_id_site_releases_id_fk" FOREIGN KEY ("live_release_id") REFERENCES "public"."site_releases"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_releases_updated_at_idx" ON "site_releases" USING btree ("updated_at");
  CREATE INDEX "site_releases_created_at_idx" ON "site_releases" USING btree ("created_at");
  CREATE INDEX "publication_preview_release_idx" ON "publication" USING btree ("preview_release_id");
  CREATE INDEX "publication_live_release_idx" ON "publication" USING btree ("live_release_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_releases_fk" FOREIGN KEY ("site_releases_id") REFERENCES "public"."site_releases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_site_releases_id_idx" ON "payload_locked_documents_rels" USING btree ("site_releases_id");`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('This additive migration retains publication history and locks. Restore a tested database backup or apply a reviewed forward migration; automatic removal would destroy approval history.');
}
