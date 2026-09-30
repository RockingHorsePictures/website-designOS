import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Turns on field translations. Hand-edited so existing content survives: every value that moves
  // from a table into its new *_locales table is copied there first, as the main language.
  const code = process.env.DESIGNOS_DEFAULT_LOCALE || 'en'
  if (!/^[a-z]{2}$/.test(code)) throw new Error('DESIGNOS_DEFAULT_LOCALE must be a two-letter code.')
  const locale = sql.raw(`'${code}'`)
  await db.execute(sql`

   CREATE TYPE "public"."_locales" AS ENUM('en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'nb', 'fi', 'pl', 'cs', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'ja', 'ko', 'zh', 'id', 'ga', 'cy');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'nb', 'fi', 'pl', 'cs', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'ja', 'ko', 'zh', 'id', 'ga', 'cy');
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'nb', 'fi', 'pl', 'cs', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'ja', 'ko', 'zh', 'id', 'ga', 'cy');
  CREATE TYPE "public"."enum__case_studies_v_published_locale" AS ENUM('en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'nb', 'fi', 'pl', 'cs', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'ja', 'ko', 'zh', 'id', 'ga', 'cy');
  CREATE TYPE "public"."enum__services_v_published_locale" AS ENUM('en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'nb', 'fi', 'pl', 'cs', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'ja', 'ko', 'zh', 'id', 'ga', 'cy');
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"hero_media_alt_override" varchar,
  	"composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_social_title" varchar,
  	"seo_social_description" varchar,
  	"seo_topic" varchar,
  	"seo_intent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_hero_media_alt_override" varchar,
  	"version_composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_social_title" varchar,
  	"version_seo_social_description" varchar,
  	"version_seo_topic" varchar,
  	"version_seo_intent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "posts_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"hero_media_alt_override" varchar,
  	"body" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_social_title" varchar,
  	"seo_social_description" varchar,
  	"seo_topic" varchar,
  	"seo_intent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_posts_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_hero_media_alt_override" varchar,
  	"version_body" jsonb,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_social_title" varchar,
  	"version_seo_social_description" varchar,
  	"version_seo_topic" varchar,
  	"version_seo_intent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "categories_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "blocks_locales" (
  	"composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_blocks_v_locales" (
  	"version_composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "case_studies_gallery_locales" (
  	"asset_alt_override" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "case_studies_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"narrative" jsonb,
  	"hero_media_alt_override" varchar,
  	"thumbnail_alt_override" varchar,
  	"video_title" varchar,
  	"video_description" varchar,
  	"video_transcript" varchar,
  	"results" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_social_title" varchar,
  	"seo_social_description" varchar,
  	"seo_topic" varchar,
  	"seo_intent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_case_studies_v_version_gallery_locales" (
  	"asset_alt_override" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_case_studies_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_narrative" jsonb,
  	"version_hero_media_alt_override" varchar,
  	"version_thumbnail_alt_override" varchar,
  	"version_video_title" varchar,
  	"version_video_description" varchar,
  	"version_video_transcript" varchar,
  	"version_results" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_social_title" varchar,
  	"version_seo_social_description" varchar,
  	"version_seo_topic" varchar,
  	"version_seo_intent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "services_capabilities_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "services_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"description" jsonb,
  	"hero_media_alt_override" varchar,
  	"video_title" varchar,
  	"video_description" varchar,
  	"video_transcript" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_social_title" varchar,
  	"seo_social_description" varchar,
  	"seo_topic" varchar,
  	"seo_intent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_services_v_version_capabilities_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_services_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_description" jsonb,
  	"version_hero_media_alt_override" varchar,
  	"version_video_title" varchar,
  	"version_video_description" varchar,
  	"version_video_transcript" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_social_title" varchar,
  	"version_seo_social_description" varchar,
  	"version_seo_topic" varchar,
  	"version_seo_intent" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "team_members_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "team_members_locales" (
  	"role" varchar NOT NULL,
  	"portrait_alt_override" varchar,
  	"alternate_portrait_alt_override" varchar,
  	"bio" varchar,
  	"long_bio" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "forms_fields_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "forms_fields_locales" (
  	"label" varchar NOT NULL,
  	"placeholder" varchar,
  	"help" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "forms_locales" (
  	"submit_label" varchar DEFAULT 'Send',
  	"success_message" varchar DEFAULT 'Thank you. We will be in touch soon.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "navigation_primary_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "navigation_secondary_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "navigation_footer_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "_navigation_v_version_primary_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_navigation_v_version_secondary_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_navigation_v_version_footer_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "site_settings_social_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "site_settings_legal_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "site_settings_locales" (
  	"description" varchar,
  	"footer_text" varchar,
  	"announcement_text" varchar,
  	"announcement_link_label" varchar,
  	"consent_message" varchar DEFAULT 'We use cookies to understand how our website is used. You can accept or decline analytics cookies.',
  	"not_found_heading" varchar DEFAULT 'Page not found',
  	"not_found_message" varchar DEFAULT 'The page you were looking for has moved or no longer exists.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_site_settings_v_version_social_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_site_settings_v_version_legal_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "_site_settings_v_locales" (
  	"version_description" varchar,
  	"version_footer_text" varchar,
  	"version_announcement_text" varchar,
  	"version_announcement_link_label" varchar,
  	"version_consent_message" varchar DEFAULT 'We use cookies to understand how our website is used. You can accept or decline analytics cookies.',
  	"version_not_found_heading" varchar DEFAULT 'Page not found',
  	"version_not_found_message" varchar DEFAULT 'The page you were looking for has moved or no longer exists.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  ALTER TABLE "pages_seo_questions" ADD COLUMN "_locale" "_locales" NOT NULL DEFAULT ${locale};
  ALTER TABLE "_pages_v_version_seo_questions" ADD COLUMN "_locale" "_locales" NOT NULL DEFAULT ${locale};
  ALTER TABLE "_pages_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_pages_v" ADD COLUMN "published_locale" "enum__pages_v_published_locale";
  ALTER TABLE "posts_seo_questions" ADD COLUMN "_locale" "_locales" NOT NULL DEFAULT ${locale};
  ALTER TABLE "_posts_v_version_seo_questions" ADD COLUMN "_locale" "_locales" NOT NULL DEFAULT ${locale};
  ALTER TABLE "_posts_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_posts_v" ADD COLUMN "published_locale" "enum__posts_v_published_locale";
  ALTER TABLE "case_studies_seo_questions" ADD COLUMN "_locale" "_locales" NOT NULL DEFAULT ${locale};
  ALTER TABLE "_case_studies_v_version_seo_questions" ADD COLUMN "_locale" "_locales" NOT NULL DEFAULT ${locale};
  ALTER TABLE "_case_studies_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_case_studies_v" ADD COLUMN "published_locale" "enum__case_studies_v_published_locale";
  ALTER TABLE "services_seo_questions" ADD COLUMN "_locale" "_locales" NOT NULL DEFAULT ${locale};
  ALTER TABLE "_services_v_version_seo_questions" ADD COLUMN "_locale" "_locales" NOT NULL DEFAULT ${locale};
  ALTER TABLE "_services_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_services_v" ADD COLUMN "published_locale" "enum__services_v_published_locale";
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blocks_locales" ADD CONSTRAINT "blocks_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blocks_v_locales" ADD CONSTRAINT "_blocks_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blocks_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_gallery_locales" ADD CONSTRAINT "case_studies_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."case_studies_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "case_studies_locales" ADD CONSTRAINT "case_studies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_version_gallery_locales" ADD CONSTRAINT "_case_studies_v_version_gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_case_studies_v_version_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_case_studies_v_locales" ADD CONSTRAINT "_case_studies_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_case_studies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_capabilities_locales" ADD CONSTRAINT "services_capabilities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_capabilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_capabilities_locales" ADD CONSTRAINT "_services_v_version_capabilities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_version_capabilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_members_links_locales" ADD CONSTRAINT "team_members_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team_members_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_members_locales" ADD CONSTRAINT "team_members_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_fields_options_locales" ADD CONSTRAINT "forms_fields_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_fields_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_fields_locales" ADD CONSTRAINT "forms_fields_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_locales" ADD CONSTRAINT "forms_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_primary_locales" ADD CONSTRAINT "navigation_primary_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_primary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_secondary_locales" ADD CONSTRAINT "navigation_secondary_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_secondary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_locales" ADD CONSTRAINT "navigation_footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_primary_locales" ADD CONSTRAINT "_navigation_v_version_primary_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_primary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_secondary_locales" ADD CONSTRAINT "_navigation_v_version_secondary_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_secondary"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navigation_v_version_footer_locales" ADD CONSTRAINT "_navigation_v_version_footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navigation_v_version_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links_locales" ADD CONSTRAINT "site_settings_social_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_social_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_legal_links_locales" ADD CONSTRAINT "site_settings_legal_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_legal_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_social_links_locales" ADD CONSTRAINT "_site_settings_v_version_social_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v_version_social_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_legal_links_locales" ADD CONSTRAINT "_site_settings_v_version_legal_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v_version_legal_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "posts_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_posts_v_locales_locale_parent_id_unique" ON "_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "blocks_locales_locale_parent_id_unique" ON "blocks_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_blocks_v_locales_locale_parent_id_unique" ON "_blocks_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "case_studies_gallery_locales_locale_parent_id_unique" ON "case_studies_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "case_studies_locales_locale_parent_id_unique" ON "case_studies_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_case_studies_v_version_gallery_locales_locale_parent_id_uni" ON "_case_studies_v_version_gallery_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_case_studies_v_locales_locale_parent_id_unique" ON "_case_studies_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "services_capabilities_locales_locale_parent_id_unique" ON "services_capabilities_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "services_locales_locale_parent_id_unique" ON "services_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_services_v_version_capabilities_locales_locale_parent_id_un" ON "_services_v_version_capabilities_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_services_v_locales_locale_parent_id_unique" ON "_services_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "team_members_links_locales_locale_parent_id_unique" ON "team_members_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "team_members_locales_locale_parent_id_unique" ON "team_members_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "forms_fields_options_locales_locale_parent_id_unique" ON "forms_fields_options_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "forms_fields_locales_locale_parent_id_unique" ON "forms_fields_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "forms_locales_locale_parent_id_unique" ON "forms_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "navigation_primary_locales_locale_parent_id_unique" ON "navigation_primary_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "navigation_secondary_locales_locale_parent_id_unique" ON "navigation_secondary_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "navigation_footer_locales_locale_parent_id_unique" ON "navigation_footer_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_navigation_v_version_primary_locales_locale_parent_id_uniqu" ON "_navigation_v_version_primary_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_navigation_v_version_secondary_locales_locale_parent_id_uni" ON "_navigation_v_version_secondary_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_navigation_v_version_footer_locales_locale_parent_id_unique" ON "_navigation_v_version_footer_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "site_settings_social_links_locales_locale_parent_id_unique" ON "site_settings_social_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "site_settings_legal_links_locales_locale_parent_id_unique" ON "site_settings_legal_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_site_settings_v_version_social_links_locales_locale_parent_" ON "_site_settings_v_version_social_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_site_settings_v_version_legal_links_locales_locale_parent_i" ON "_site_settings_v_version_legal_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_site_settings_v_locales_locale_parent_id_unique" ON "_site_settings_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_seo_questions_locale_idx" ON "pages_seo_questions" USING btree ("_locale");
  CREATE INDEX "_pages_v_version_seo_questions_locale_idx" ON "_pages_v_version_seo_questions" USING btree ("_locale");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "posts_seo_questions_locale_idx" ON "posts_seo_questions" USING btree ("_locale");
  CREATE INDEX "_posts_v_version_seo_questions_locale_idx" ON "_posts_v_version_seo_questions" USING btree ("_locale");
  CREATE INDEX "_posts_v_snapshot_idx" ON "_posts_v" USING btree ("snapshot");
  CREATE INDEX "_posts_v_published_locale_idx" ON "_posts_v" USING btree ("published_locale");
  CREATE INDEX "case_studies_seo_questions_locale_idx" ON "case_studies_seo_questions" USING btree ("_locale");
  CREATE INDEX "_case_studies_v_version_seo_questions_locale_idx" ON "_case_studies_v_version_seo_questions" USING btree ("_locale");
  CREATE INDEX "_case_studies_v_snapshot_idx" ON "_case_studies_v" USING btree ("snapshot");
  CREATE INDEX "_case_studies_v_published_locale_idx" ON "_case_studies_v" USING btree ("published_locale");
  CREATE INDEX "services_seo_questions_locale_idx" ON "services_seo_questions" USING btree ("_locale");
  CREATE INDEX "_services_v_version_seo_questions_locale_idx" ON "_services_v_version_seo_questions" USING btree ("_locale");
  CREATE INDEX "_services_v_snapshot_idx" ON "_services_v" USING btree ("snapshot");
  CREATE INDEX "_services_v_published_locale_idx" ON "_services_v" USING btree ("published_locale");`)
  // Copy existing values (only columns present in both tables) before the originals are dropped.
  for (const target of [
    'pages_locales',
    '_pages_v_locales',
    'posts_locales',
    '_posts_v_locales',
    'categories_locales',
    'blocks_locales',
    '_blocks_v_locales',
    'case_studies_gallery_locales',
    'case_studies_locales',
    '_case_studies_v_version_gallery_locales',
    '_case_studies_v_locales',
    'services_capabilities_locales',
    'services_locales',
    '_services_v_version_capabilities_locales',
    '_services_v_locales',
    'team_members_links_locales',
    'team_members_locales',
    'media_locales',
    'forms_fields_options_locales',
    'forms_fields_locales',
    'forms_locales',
    'navigation_primary_locales',
    'navigation_secondary_locales',
    'navigation_footer_locales',
    '_navigation_v_version_primary_locales',
    '_navigation_v_version_secondary_locales',
    '_navigation_v_version_footer_locales',
    'site_settings_social_links_locales',
    'site_settings_legal_links_locales',
    'site_settings_locales',
    '_site_settings_v_version_social_links_locales',
    '_site_settings_v_version_legal_links_locales',
    '_site_settings_v_locales',
  ]) {
    const source = target.slice(0, -'_locales'.length)
    const { rows } = await db.execute(sql`
      SELECT t.column_name FROM information_schema.columns t
      JOIN information_schema.columns s
        ON s.table_schema = t.table_schema AND s.table_name = ${source} AND s.column_name = t.column_name
      WHERE t.table_schema = 'public' AND t.table_name = ${target}
        AND t.column_name NOT IN ('id', '_locale', '_parent_id')`)
    const columns = (rows as { column_name: string }[]).map((r) => sql.identifier(r.column_name))
    if (!columns.length) continue
    await db.execute(sql`
      INSERT INTO ${sql.identifier(target)} (${sql.join(columns, sql`, `)}, "_locale", "_parent_id")
      SELECT ${sql.join(columns, sql`, `)}, ${locale}, "id" FROM ${sql.identifier(source)}`)
  }
  await db.execute(sql`
  ALTER TABLE "pages_seo_questions" ALTER COLUMN "_locale" DROP DEFAULT;
  ALTER TABLE "_pages_v_version_seo_questions" ALTER COLUMN "_locale" DROP DEFAULT;
  ALTER TABLE "posts_seo_questions" ALTER COLUMN "_locale" DROP DEFAULT;
  ALTER TABLE "_posts_v_version_seo_questions" ALTER COLUMN "_locale" DROP DEFAULT;
  ALTER TABLE "case_studies_seo_questions" ALTER COLUMN "_locale" DROP DEFAULT;
  ALTER TABLE "_case_studies_v_version_seo_questions" ALTER COLUMN "_locale" DROP DEFAULT;
  ALTER TABLE "services_seo_questions" ALTER COLUMN "_locale" DROP DEFAULT;
  ALTER TABLE "_services_v_version_seo_questions" ALTER COLUMN "_locale" DROP DEFAULT;
  ALTER TABLE "pages" DROP COLUMN "title";
  ALTER TABLE "pages" DROP COLUMN "summary";
  ALTER TABLE "pages" DROP COLUMN "hero_media_alt_override";
  ALTER TABLE "pages" DROP COLUMN "composition";
  ALTER TABLE "pages" DROP COLUMN "seo_title";
  ALTER TABLE "pages" DROP COLUMN "seo_description";
  ALTER TABLE "pages" DROP COLUMN "seo_social_title";
  ALTER TABLE "pages" DROP COLUMN "seo_social_description";
  ALTER TABLE "pages" DROP COLUMN "seo_topic";
  ALTER TABLE "pages" DROP COLUMN "seo_intent";
  ALTER TABLE "_pages_v" DROP COLUMN "version_title";
  ALTER TABLE "_pages_v" DROP COLUMN "version_summary";
  ALTER TABLE "_pages_v" DROP COLUMN "version_hero_media_alt_override";
  ALTER TABLE "_pages_v" DROP COLUMN "version_composition";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_social_title";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_social_description";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_topic";
  ALTER TABLE "_pages_v" DROP COLUMN "version_seo_intent";
  ALTER TABLE "posts" DROP COLUMN "title";
  ALTER TABLE "posts" DROP COLUMN "summary";
  ALTER TABLE "posts" DROP COLUMN "hero_media_alt_override";
  ALTER TABLE "posts" DROP COLUMN "body";
  ALTER TABLE "posts" DROP COLUMN "seo_title";
  ALTER TABLE "posts" DROP COLUMN "seo_description";
  ALTER TABLE "posts" DROP COLUMN "seo_social_title";
  ALTER TABLE "posts" DROP COLUMN "seo_social_description";
  ALTER TABLE "posts" DROP COLUMN "seo_topic";
  ALTER TABLE "posts" DROP COLUMN "seo_intent";
  ALTER TABLE "_posts_v" DROP COLUMN "version_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_summary";
  ALTER TABLE "_posts_v" DROP COLUMN "version_hero_media_alt_override";
  ALTER TABLE "_posts_v" DROP COLUMN "version_body";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_social_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_social_description";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_topic";
  ALTER TABLE "_posts_v" DROP COLUMN "version_seo_intent";
  ALTER TABLE "categories" DROP COLUMN "title";
  ALTER TABLE "categories" DROP COLUMN "description";
  ALTER TABLE "blocks" DROP COLUMN "composition";
  ALTER TABLE "_blocks_v" DROP COLUMN "version_composition";
  ALTER TABLE "case_studies_gallery" DROP COLUMN "asset_alt_override";
  ALTER TABLE "case_studies" DROP COLUMN "title";
  ALTER TABLE "case_studies" DROP COLUMN "summary";
  ALTER TABLE "case_studies" DROP COLUMN "narrative";
  ALTER TABLE "case_studies" DROP COLUMN "hero_media_alt_override";
  ALTER TABLE "case_studies" DROP COLUMN "thumbnail_alt_override";
  ALTER TABLE "case_studies" DROP COLUMN "video_title";
  ALTER TABLE "case_studies" DROP COLUMN "video_description";
  ALTER TABLE "case_studies" DROP COLUMN "video_transcript";
  ALTER TABLE "case_studies" DROP COLUMN "results";
  ALTER TABLE "case_studies" DROP COLUMN "seo_title";
  ALTER TABLE "case_studies" DROP COLUMN "seo_description";
  ALTER TABLE "case_studies" DROP COLUMN "seo_social_title";
  ALTER TABLE "case_studies" DROP COLUMN "seo_social_description";
  ALTER TABLE "case_studies" DROP COLUMN "seo_topic";
  ALTER TABLE "case_studies" DROP COLUMN "seo_intent";
  ALTER TABLE "_case_studies_v_version_gallery" DROP COLUMN "asset_alt_override";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_title";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_summary";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_narrative";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_hero_media_alt_override";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_thumbnail_alt_override";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_video_title";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_video_description";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_video_transcript";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_results";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_seo_social_title";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_seo_social_description";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_seo_topic";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_seo_intent";
  ALTER TABLE "services_capabilities" DROP COLUMN "title";
  ALTER TABLE "services_capabilities" DROP COLUMN "description";
  ALTER TABLE "services" DROP COLUMN "title";
  ALTER TABLE "services" DROP COLUMN "summary";
  ALTER TABLE "services" DROP COLUMN "description";
  ALTER TABLE "services" DROP COLUMN "hero_media_alt_override";
  ALTER TABLE "services" DROP COLUMN "video_title";
  ALTER TABLE "services" DROP COLUMN "video_description";
  ALTER TABLE "services" DROP COLUMN "video_transcript";
  ALTER TABLE "services" DROP COLUMN "seo_title";
  ALTER TABLE "services" DROP COLUMN "seo_description";
  ALTER TABLE "services" DROP COLUMN "seo_social_title";
  ALTER TABLE "services" DROP COLUMN "seo_social_description";
  ALTER TABLE "services" DROP COLUMN "seo_topic";
  ALTER TABLE "services" DROP COLUMN "seo_intent";
  ALTER TABLE "_services_v_version_capabilities" DROP COLUMN "title";
  ALTER TABLE "_services_v_version_capabilities" DROP COLUMN "description";
  ALTER TABLE "_services_v" DROP COLUMN "version_title";
  ALTER TABLE "_services_v" DROP COLUMN "version_summary";
  ALTER TABLE "_services_v" DROP COLUMN "version_description";
  ALTER TABLE "_services_v" DROP COLUMN "version_hero_media_alt_override";
  ALTER TABLE "_services_v" DROP COLUMN "version_video_title";
  ALTER TABLE "_services_v" DROP COLUMN "version_video_description";
  ALTER TABLE "_services_v" DROP COLUMN "version_video_transcript";
  ALTER TABLE "_services_v" DROP COLUMN "version_seo_title";
  ALTER TABLE "_services_v" DROP COLUMN "version_seo_description";
  ALTER TABLE "_services_v" DROP COLUMN "version_seo_social_title";
  ALTER TABLE "_services_v" DROP COLUMN "version_seo_social_description";
  ALTER TABLE "_services_v" DROP COLUMN "version_seo_topic";
  ALTER TABLE "_services_v" DROP COLUMN "version_seo_intent";
  ALTER TABLE "team_members_links" DROP COLUMN "label";
  ALTER TABLE "team_members" DROP COLUMN "role";
  ALTER TABLE "team_members" DROP COLUMN "portrait_alt_override";
  ALTER TABLE "team_members" DROP COLUMN "alternate_portrait_alt_override";
  ALTER TABLE "team_members" DROP COLUMN "bio";
  ALTER TABLE "team_members" DROP COLUMN "long_bio";
  ALTER TABLE "media" DROP COLUMN "alt";
  ALTER TABLE "media" DROP COLUMN "caption";
  ALTER TABLE "forms_fields_options" DROP COLUMN "label";
  ALTER TABLE "forms_fields" DROP COLUMN "label";
  ALTER TABLE "forms_fields" DROP COLUMN "placeholder";
  ALTER TABLE "forms_fields" DROP COLUMN "help";
  ALTER TABLE "forms" DROP COLUMN "submit_label";
  ALTER TABLE "forms" DROP COLUMN "success_message";
  ALTER TABLE "navigation_primary" DROP COLUMN "label";
  ALTER TABLE "navigation_secondary" DROP COLUMN "label";
  ALTER TABLE "navigation_footer" DROP COLUMN "label";
  ALTER TABLE "_navigation_v_version_primary" DROP COLUMN "label";
  ALTER TABLE "_navigation_v_version_secondary" DROP COLUMN "label";
  ALTER TABLE "_navigation_v_version_footer" DROP COLUMN "label";
  ALTER TABLE "site_settings_social_links" DROP COLUMN "label";
  ALTER TABLE "site_settings_legal_links" DROP COLUMN "label";
  ALTER TABLE "site_settings" DROP COLUMN "description";
  ALTER TABLE "site_settings" DROP COLUMN "footer_text";
  ALTER TABLE "site_settings" DROP COLUMN "announcement_text";
  ALTER TABLE "site_settings" DROP COLUMN "announcement_link_label";
  ALTER TABLE "site_settings" DROP COLUMN "consent_message";
  ALTER TABLE "site_settings" DROP COLUMN "not_found_heading";
  ALTER TABLE "site_settings" DROP COLUMN "not_found_message";
  ALTER TABLE "_site_settings_v_version_social_links" DROP COLUMN "label";
  ALTER TABLE "_site_settings_v_version_legal_links" DROP COLUMN "label";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_description";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_footer_text";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_announcement_text";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_announcement_link_label";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_consent_message";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_not_found_heading";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_not_found_message";`)
}

// Down drops translations and restores untranslated columns empty: use only on disposable databases.
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blocks_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_blocks_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies_gallery_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "case_studies_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v_version_gallery_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_case_studies_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "services_capabilities_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "services_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_services_v_version_capabilities_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_services_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "team_members_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "team_members_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_fields_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_fields_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_primary_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_secondary_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "navigation_footer_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_primary_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_secondary_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_navigation_v_version_footer_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_social_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_legal_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v_version_social_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v_version_legal_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "posts_locales" CASCADE;
  DROP TABLE "_posts_v_locales" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "blocks_locales" CASCADE;
  DROP TABLE "_blocks_v_locales" CASCADE;
  DROP TABLE "case_studies_gallery_locales" CASCADE;
  DROP TABLE "case_studies_locales" CASCADE;
  DROP TABLE "_case_studies_v_version_gallery_locales" CASCADE;
  DROP TABLE "_case_studies_v_locales" CASCADE;
  DROP TABLE "services_capabilities_locales" CASCADE;
  DROP TABLE "services_locales" CASCADE;
  DROP TABLE "_services_v_version_capabilities_locales" CASCADE;
  DROP TABLE "_services_v_locales" CASCADE;
  DROP TABLE "team_members_links_locales" CASCADE;
  DROP TABLE "team_members_locales" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "forms_fields_options_locales" CASCADE;
  DROP TABLE "forms_fields_locales" CASCADE;
  DROP TABLE "forms_locales" CASCADE;
  DROP TABLE "navigation_primary_locales" CASCADE;
  DROP TABLE "navigation_secondary_locales" CASCADE;
  DROP TABLE "navigation_footer_locales" CASCADE;
  DROP TABLE "_navigation_v_version_primary_locales" CASCADE;
  DROP TABLE "_navigation_v_version_secondary_locales" CASCADE;
  DROP TABLE "_navigation_v_version_footer_locales" CASCADE;
  DROP TABLE "site_settings_social_links_locales" CASCADE;
  DROP TABLE "site_settings_legal_links_locales" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "_site_settings_v_version_social_links_locales" CASCADE;
  DROP TABLE "_site_settings_v_version_legal_links_locales" CASCADE;
  DROP TABLE "_site_settings_v_locales" CASCADE;
  DROP INDEX "pages_seo_questions_locale_idx";
  DROP INDEX "_pages_v_version_seo_questions_locale_idx";
  DROP INDEX "_pages_v_snapshot_idx";
  DROP INDEX "_pages_v_published_locale_idx";
  DROP INDEX "posts_seo_questions_locale_idx";
  DROP INDEX "_posts_v_version_seo_questions_locale_idx";
  DROP INDEX "_posts_v_snapshot_idx";
  DROP INDEX "_posts_v_published_locale_idx";
  DROP INDEX "case_studies_seo_questions_locale_idx";
  DROP INDEX "_case_studies_v_version_seo_questions_locale_idx";
  DROP INDEX "_case_studies_v_snapshot_idx";
  DROP INDEX "_case_studies_v_published_locale_idx";
  DROP INDEX "services_seo_questions_locale_idx";
  DROP INDEX "_services_v_version_seo_questions_locale_idx";
  DROP INDEX "_services_v_snapshot_idx";
  DROP INDEX "_services_v_published_locale_idx";
  ALTER TABLE "pages" ADD COLUMN "title" varchar;
  ALTER TABLE "pages" ADD COLUMN "summary" varchar;
  ALTER TABLE "pages" ADD COLUMN "hero_media_alt_override" varchar;
  ALTER TABLE "pages" ADD COLUMN "composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb;
  ALTER TABLE "pages" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_social_title" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_social_description" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_topic" varchar;
  ALTER TABLE "pages" ADD COLUMN "seo_intent" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_hero_media_alt_override" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_social_title" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_social_description" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_topic" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_seo_intent" varchar;
  ALTER TABLE "posts" ADD COLUMN "title" varchar;
  ALTER TABLE "posts" ADD COLUMN "summary" varchar;
  ALTER TABLE "posts" ADD COLUMN "hero_media_alt_override" varchar;
  ALTER TABLE "posts" ADD COLUMN "body" jsonb;
  ALTER TABLE "posts" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "posts" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "posts" ADD COLUMN "seo_social_title" varchar;
  ALTER TABLE "posts" ADD COLUMN "seo_social_description" varchar;
  ALTER TABLE "posts" ADD COLUMN "seo_topic" varchar;
  ALTER TABLE "posts" ADD COLUMN "seo_intent" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_hero_media_alt_override" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_body" jsonb;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_social_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_social_description" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_topic" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_seo_intent" varchar;
  ALTER TABLE "categories" ADD COLUMN "title" varchar NOT NULL;
  ALTER TABLE "categories" ADD COLUMN "description" varchar;
  ALTER TABLE "blocks" ADD COLUMN "composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb;
  ALTER TABLE "_blocks_v" ADD COLUMN "version_composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb;
  ALTER TABLE "case_studies_gallery" ADD COLUMN "asset_alt_override" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "title" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "summary" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "narrative" jsonb;
  ALTER TABLE "case_studies" ADD COLUMN "hero_media_alt_override" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "thumbnail_alt_override" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "video_title" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "video_description" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "video_transcript" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "results" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "seo_social_title" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "seo_social_description" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "seo_topic" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "seo_intent" varchar;
  ALTER TABLE "_case_studies_v_version_gallery" ADD COLUMN "asset_alt_override" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_narrative" jsonb;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_hero_media_alt_override" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_thumbnail_alt_override" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_video_title" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_video_description" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_video_transcript" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_results" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_seo_social_title" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_seo_social_description" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_seo_topic" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_seo_intent" varchar;
  ALTER TABLE "services_capabilities" ADD COLUMN "title" varchar;
  ALTER TABLE "services_capabilities" ADD COLUMN "description" varchar;
  ALTER TABLE "services" ADD COLUMN "title" varchar;
  ALTER TABLE "services" ADD COLUMN "summary" varchar;
  ALTER TABLE "services" ADD COLUMN "description" jsonb;
  ALTER TABLE "services" ADD COLUMN "hero_media_alt_override" varchar;
  ALTER TABLE "services" ADD COLUMN "video_title" varchar;
  ALTER TABLE "services" ADD COLUMN "video_description" varchar;
  ALTER TABLE "services" ADD COLUMN "video_transcript" varchar;
  ALTER TABLE "services" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "services" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "services" ADD COLUMN "seo_social_title" varchar;
  ALTER TABLE "services" ADD COLUMN "seo_social_description" varchar;
  ALTER TABLE "services" ADD COLUMN "seo_topic" varchar;
  ALTER TABLE "services" ADD COLUMN "seo_intent" varchar;
  ALTER TABLE "_services_v_version_capabilities" ADD COLUMN "title" varchar;
  ALTER TABLE "_services_v_version_capabilities" ADD COLUMN "description" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_description" jsonb;
  ALTER TABLE "_services_v" ADD COLUMN "version_hero_media_alt_override" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_video_title" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_video_description" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_video_transcript" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_seo_title" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_seo_description" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_seo_social_title" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_seo_social_description" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_seo_topic" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version_seo_intent" varchar;
  ALTER TABLE "team_members_links" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "team_members" ADD COLUMN "role" varchar NOT NULL;
  ALTER TABLE "team_members" ADD COLUMN "portrait_alt_override" varchar;
  ALTER TABLE "team_members" ADD COLUMN "alternate_portrait_alt_override" varchar;
  ALTER TABLE "team_members" ADD COLUMN "bio" varchar;
  ALTER TABLE "team_members" ADD COLUMN "long_bio" jsonb;
  ALTER TABLE "media" ADD COLUMN "alt" varchar;
  ALTER TABLE "media" ADD COLUMN "caption" varchar;
  ALTER TABLE "forms_fields_options" ADD COLUMN "label" varchar;
  ALTER TABLE "forms_fields" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "forms_fields" ADD COLUMN "placeholder" varchar;
  ALTER TABLE "forms_fields" ADD COLUMN "help" varchar;
  ALTER TABLE "forms" ADD COLUMN "submit_label" varchar DEFAULT 'Send';
  ALTER TABLE "forms" ADD COLUMN "success_message" varchar DEFAULT 'Thank you. We will be in touch soon.';
  ALTER TABLE "navigation_primary" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "navigation_secondary" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "navigation_footer" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "_navigation_v_version_primary" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "_navigation_v_version_secondary" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "_navigation_v_version_footer" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "site_settings_social_links" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "site_settings_legal_links" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "description" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "footer_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "announcement_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "announcement_link_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "consent_message" varchar DEFAULT 'We use cookies to understand how our website is used. You can accept or decline analytics cookies.';
  ALTER TABLE "site_settings" ADD COLUMN "not_found_heading" varchar DEFAULT 'Page not found';
  ALTER TABLE "site_settings" ADD COLUMN "not_found_message" varchar DEFAULT 'The page you were looking for has moved or no longer exists.';
  ALTER TABLE "_site_settings_v_version_social_links" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "_site_settings_v_version_legal_links" ADD COLUMN "label" varchar NOT NULL;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_description" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_footer_text" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_announcement_text" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_announcement_link_label" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_consent_message" varchar DEFAULT 'We use cookies to understand how our website is used. You can accept or decline analytics cookies.';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_not_found_heading" varchar DEFAULT 'Page not found';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_not_found_message" varchar DEFAULT 'The page you were looking for has moved or no longer exists.';
  ALTER TABLE "pages_seo_questions" DROP COLUMN "_locale";
  ALTER TABLE "_pages_v_version_seo_questions" DROP COLUMN "_locale";
  ALTER TABLE "_pages_v" DROP COLUMN "snapshot";
  ALTER TABLE "_pages_v" DROP COLUMN "published_locale";
  ALTER TABLE "posts_seo_questions" DROP COLUMN "_locale";
  ALTER TABLE "_posts_v_version_seo_questions" DROP COLUMN "_locale";
  ALTER TABLE "_posts_v" DROP COLUMN "snapshot";
  ALTER TABLE "_posts_v" DROP COLUMN "published_locale";
  ALTER TABLE "case_studies_seo_questions" DROP COLUMN "_locale";
  ALTER TABLE "_case_studies_v_version_seo_questions" DROP COLUMN "_locale";
  ALTER TABLE "_case_studies_v" DROP COLUMN "snapshot";
  ALTER TABLE "_case_studies_v" DROP COLUMN "published_locale";
  ALTER TABLE "services_seo_questions" DROP COLUMN "_locale";
  ALTER TABLE "_services_v_version_seo_questions" DROP COLUMN "_locale";
  ALTER TABLE "_services_v" DROP COLUMN "snapshot";
  ALTER TABLE "_services_v" DROP COLUMN "published_locale";
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum__posts_v_published_locale";
  DROP TYPE "public"."enum__case_studies_v_published_locale";
  DROP TYPE "public"."enum__services_v_published_locale";`)
}
