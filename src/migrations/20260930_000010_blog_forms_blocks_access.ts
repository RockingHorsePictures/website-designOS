import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_visibility" AS ENUM('public', 'password');
  CREATE TYPE "public"."enum__pages_v_version_visibility" AS ENUM('public', 'password');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_forms_fields_type" AS ENUM('text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'number', 'date', 'url');
  CREATE TYPE "public"."enum_forms_fields_width" AS ENUM('full', 'half');
  CREATE TYPE "public"."enum_site_settings_languages" AS ENUM('fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'nb', 'fi', 'pl', 'cs', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'ja', 'ko', 'zh', 'id', 'ga', 'cy');
  CREATE TYPE "public"."enum_site_settings_analytics_provider" AS ENUM('none', 'vercel', 'plausible', 'fathom', 'umami', 'ga4');
  CREATE TYPE "public"."enum__site_settings_v_version_languages" AS ENUM('fr', 'de', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'nb', 'fi', 'pl', 'cs', 'el', 'tr', 'ru', 'uk', 'ar', 'he', 'hi', 'ja', 'ko', 'zh', 'id', 'ga', 'cy');
  CREATE TYPE "public"."enum__site_settings_v_version_analytics_provider" AS ENUM('none', 'vercel', 'plausible', 'fathom', 'umami', 'ga4');
  CREATE TABLE "posts_seo_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"include_in_site" boolean DEFAULT true,
  	"title" varchar,
  	"slug" varchar,
  	"summary" varchar,
  	"order" numeric DEFAULT 0,
  	"demo" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"date" timestamp(3) with time zone,
  	"hero_media_image_id" integer,
  	"hero_media_alt_override" varchar,
  	"hero_media_decorative" boolean DEFAULT false,
  	"body" jsonb,
  	"featured" boolean,
  	"ai_assisted" boolean DEFAULT false,
  	"claims_reviewed" boolean DEFAULT false,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_canonical" varchar,
  	"seo_noindex" boolean DEFAULT false,
  	"seo_social_title" varchar,
  	"seo_social_description" varchar,
  	"seo_social_image_id" integer,
  	"seo_topic" varchar,
  	"seo_intent" varchar,
  	"protection" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"team_members_id" integer,
  	"categories_id" integer,
  	"posts_id" integer,
  	"approved_facts_id" integer
  );
  
  CREATE TABLE "_posts_v_version_seo_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_include_in_site" boolean DEFAULT true,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_summary" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_demo" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_date" timestamp(3) with time zone,
  	"version_hero_media_image_id" integer,
  	"version_hero_media_alt_override" varchar,
  	"version_hero_media_decorative" boolean DEFAULT false,
  	"version_body" jsonb,
  	"version_featured" boolean,
  	"version_ai_assisted" boolean DEFAULT false,
  	"version_claims_reviewed" boolean DEFAULT false,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"version_seo_canonical" varchar,
  	"version_seo_noindex" boolean DEFAULT false,
  	"version_seo_social_title" varchar,
  	"version_seo_social_description" varchar,
  	"version_seo_social_image_id" integer,
  	"version_seo_topic" varchar,
  	"version_seo_intent" varchar,
  	"version_protection" jsonb DEFAULT '{}'::jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"team_members_id" integer,
  	"categories_id" integer,
  	"posts_id" integer,
  	"approved_facts_id" integer
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"order" numeric DEFAULT 0,
  	"protection" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "blocks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb,
  	"protection" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_blocks_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_composition" jsonb DEFAULT '{"root":{"props":{}},"content":[]}'::jsonb,
  	"version_protection" jsonb DEFAULT '{}'::jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "forms_fields_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "forms_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_forms_fields_type" DEFAULT 'text' NOT NULL,
  	"required" boolean DEFAULT false,
  	"width" "enum_forms_fields_width" DEFAULT 'full',
  	"placeholder" varchar,
  	"help" varchar
  );
  
  CREATE TABLE "forms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"submit_label" varchar DEFAULT 'Send',
  	"success_message" varchar DEFAULT 'Thank you. We will be in touch soon.',
  	"redirect" varchar,
  	"store_submissions" boolean DEFAULT true,
  	"notify" varchar,
  	"webhook_u_r_l" varchar,
  	"webhook_secret" varchar,
  	"protection" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_site_settings_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_site_settings_v_version_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__site_settings_v_version_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "form_submissions" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "form_submissions" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "form_submissions" ALTER COLUMN "message" DROP NOT NULL;
  ALTER TABLE "pages" ADD COLUMN "is_template" boolean DEFAULT false;
  ALTER TABLE "pages" ADD COLUMN "visibility" "enum_pages_visibility" DEFAULT 'public';
  ALTER TABLE "pages" ADD COLUMN "page_password" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_is_template" boolean DEFAULT false;
  ALTER TABLE "_pages_v" ADD COLUMN "version_visibility" "enum__pages_v_version_visibility" DEFAULT 'public';
  ALTER TABLE "_pages_v" ADD COLUMN "version_page_password" varchar;
  ALTER TABLE "users" ADD COLUMN "google_sub" varchar;
  ALTER TABLE "form_submissions" ADD COLUMN "form_id" integer;
  ALTER TABLE "form_submissions" ADD COLUMN "data" jsonb;
  ALTER TABLE "form_submissions" ADD COLUMN "delivery" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blocks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "forms_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "announcement_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "announcement_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "announcement_link_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "announcement_link_u_r_l" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "announcement_dismissible" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "analytics_provider" "enum_site_settings_analytics_provider" DEFAULT 'none';
  ALTER TABLE "site_settings" ADD COLUMN "analytics_site_id" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "analytics_script_u_r_l" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "consent_message" varchar DEFAULT 'We use cookies to understand how our website is used. You can accept or decline analytics cookies.';
  ALTER TABLE "site_settings" ADD COLUMN "consent_policy_u_r_l" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "verification_google" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "verification_bing" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "not_found_heading" varchar DEFAULT 'Page not found';
  ALTER TABLE "site_settings" ADD COLUMN "not_found_message" varchar DEFAULT 'The page you were looking for has moved or no longer exists.';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_announcement_enabled" boolean DEFAULT false;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_announcement_text" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_announcement_link_label" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_announcement_link_u_r_l" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_announcement_dismissible" boolean DEFAULT true;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_analytics_provider" "enum__site_settings_v_version_analytics_provider" DEFAULT 'none';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_analytics_site_id" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_analytics_script_u_r_l" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_consent_message" varchar DEFAULT 'We use cookies to understand how our website is used. You can accept or decline analytics cookies.';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_consent_policy_u_r_l" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_verification_google" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_verification_bing" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_not_found_heading" varchar DEFAULT 'Page not found';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_not_found_message" varchar DEFAULT 'The page you were looking for has moved or no longer exists.';
  ALTER TABLE "posts_seo_questions" ADD CONSTRAINT "posts_seo_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_hero_media_image_id_media_id_fk" FOREIGN KEY ("hero_media_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_seo_social_image_id_media_id_fk" FOREIGN KEY ("seo_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_approved_facts_fk" FOREIGN KEY ("approved_facts_id") REFERENCES "public"."approved_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_seo_questions" ADD CONSTRAINT "_posts_v_version_seo_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_hero_media_image_id_media_id_fk" FOREIGN KEY ("version_hero_media_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_seo_social_image_id_media_id_fk" FOREIGN KEY ("version_seo_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_team_members_fk" FOREIGN KEY ("team_members_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_approved_facts_fk" FOREIGN KEY ("approved_facts_id") REFERENCES "public"."approved_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blocks_v" ADD CONSTRAINT "_blocks_v_parent_id_blocks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blocks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms_fields_options" ADD CONSTRAINT "forms_fields_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_fields" ADD CONSTRAINT "forms_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_languages" ADD CONSTRAINT "site_settings_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_site_settings_v_version_languages" ADD CONSTRAINT "_site_settings_v_version_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_seo_questions_order_idx" ON "posts_seo_questions" USING btree ("_order");
  CREATE INDEX "posts_seo_questions_parent_id_idx" ON "posts_seo_questions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_hero_media_hero_media_image_idx" ON "posts" USING btree ("hero_media_image_id");
  CREATE INDEX "posts_seo_seo_social_image_idx" ON "posts" USING btree ("seo_social_image_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_team_members_id_idx" ON "posts_rels" USING btree ("team_members_id");
  CREATE INDEX "posts_rels_categories_id_idx" ON "posts_rels" USING btree ("categories_id");
  CREATE INDEX "posts_rels_posts_id_idx" ON "posts_rels" USING btree ("posts_id");
  CREATE INDEX "posts_rels_approved_facts_id_idx" ON "posts_rels" USING btree ("approved_facts_id");
  CREATE INDEX "_posts_v_version_seo_questions_order_idx" ON "_posts_v_version_seo_questions" USING btree ("_order");
  CREATE INDEX "_posts_v_version_seo_questions_parent_id_idx" ON "_posts_v_version_seo_questions" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_hero_media_version_hero_media_image_idx" ON "_posts_v" USING btree ("version_hero_media_image_id");
  CREATE INDEX "_posts_v_version_seo_version_seo_social_image_idx" ON "_posts_v" USING btree ("version_seo_social_image_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_team_members_id_idx" ON "_posts_v_rels" USING btree ("team_members_id");
  CREATE INDEX "_posts_v_rels_categories_id_idx" ON "_posts_v_rels" USING btree ("categories_id");
  CREATE INDEX "_posts_v_rels_posts_id_idx" ON "_posts_v_rels" USING btree ("posts_id");
  CREATE INDEX "_posts_v_rels_approved_facts_id_idx" ON "_posts_v_rels" USING btree ("approved_facts_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "blocks_updated_at_idx" ON "blocks" USING btree ("updated_at");
  CREATE INDEX "blocks_created_at_idx" ON "blocks" USING btree ("created_at");
  CREATE INDEX "_blocks_v_parent_idx" ON "_blocks_v" USING btree ("parent_id");
  CREATE INDEX "_blocks_v_version_version_updated_at_idx" ON "_blocks_v" USING btree ("version_updated_at");
  CREATE INDEX "_blocks_v_version_version_created_at_idx" ON "_blocks_v" USING btree ("version_created_at");
  CREATE INDEX "_blocks_v_created_at_idx" ON "_blocks_v" USING btree ("created_at");
  CREATE INDEX "_blocks_v_updated_at_idx" ON "_blocks_v" USING btree ("updated_at");
  CREATE INDEX "forms_fields_options_order_idx" ON "forms_fields_options" USING btree ("_order");
  CREATE INDEX "forms_fields_options_parent_id_idx" ON "forms_fields_options" USING btree ("_parent_id");
  CREATE INDEX "forms_fields_order_idx" ON "forms_fields" USING btree ("_order");
  CREATE INDEX "forms_fields_parent_id_idx" ON "forms_fields" USING btree ("_parent_id");
  CREATE INDEX "forms_updated_at_idx" ON "forms" USING btree ("updated_at");
  CREATE INDEX "forms_created_at_idx" ON "forms" USING btree ("created_at");
  CREATE INDEX "site_settings_languages_order_idx" ON "site_settings_languages" USING btree ("order");
  CREATE INDEX "site_settings_languages_parent_idx" ON "site_settings_languages" USING btree ("parent_id");
  CREATE INDEX "_site_settings_v_version_languages_order_idx" ON "_site_settings_v_version_languages" USING btree ("order");
  CREATE INDEX "_site_settings_v_version_languages_parent_idx" ON "_site_settings_v_version_languages" USING btree ("parent_id");
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blocks_fk" FOREIGN KEY ("blocks_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_forms_fk" FOREIGN KEY ("forms_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "users_google_sub_idx" ON "users" USING btree ("google_sub");
  CREATE INDEX "form_submissions_form_idx" ON "form_submissions" USING btree ("form_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("blocks_id");
  CREATE INDEX "payload_locked_documents_rels_forms_id_idx" ON "payload_locked_documents_rels" USING btree ("forms_id");
  CREATE TABLE IF NOT EXISTS "designos_rate_limits" (
  	"bucket" varchar NOT NULL,
  	"key" varchar NOT NULL,
  	"window_start" timestamp(3) with time zone NOT NULL,
  	"count" integer NOT NULL DEFAULT 0,
  	PRIMARY KEY ("bucket", "key", "window_start")
  );`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_seo_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_seo_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blocks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_blocks_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_fields_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "forms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_site_settings_v_version_languages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_seo_questions" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v_version_seo_questions" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "blocks" CASCADE;
  DROP TABLE "_blocks_v" CASCADE;
  DROP TABLE "forms_fields_options" CASCADE;
  DROP TABLE "forms_fields" CASCADE;
  DROP TABLE "forms" CASCADE;
  DROP TABLE "site_settings_languages" CASCADE;
  DROP TABLE "_site_settings_v_version_languages" CASCADE;
  ALTER TABLE "form_submissions" DROP CONSTRAINT "form_submissions_form_id_forms_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_posts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blocks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_forms_fk";
  
  DROP INDEX "users_google_sub_idx";
  DROP INDEX "form_submissions_form_idx";
  DROP INDEX "payload_locked_documents_rels_posts_id_idx";
  DROP INDEX "payload_locked_documents_rels_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_blocks_id_idx";
  DROP INDEX "payload_locked_documents_rels_forms_id_idx";
  ALTER TABLE "form_submissions" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "form_submissions" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "form_submissions" ALTER COLUMN "message" SET NOT NULL;
  ALTER TABLE "pages" DROP COLUMN "is_template";
  ALTER TABLE "pages" DROP COLUMN "visibility";
  ALTER TABLE "pages" DROP COLUMN "page_password";
  ALTER TABLE "_pages_v" DROP COLUMN "version_is_template";
  ALTER TABLE "_pages_v" DROP COLUMN "version_visibility";
  ALTER TABLE "_pages_v" DROP COLUMN "version_page_password";
  ALTER TABLE "users" DROP COLUMN "google_sub";
  ALTER TABLE "form_submissions" DROP COLUMN "form_id";
  ALTER TABLE "form_submissions" DROP COLUMN "data";
  ALTER TABLE "form_submissions" DROP COLUMN "delivery";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "posts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "blocks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "forms_id";
  ALTER TABLE "site_settings" DROP COLUMN "announcement_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "announcement_text";
  ALTER TABLE "site_settings" DROP COLUMN "announcement_link_label";
  ALTER TABLE "site_settings" DROP COLUMN "announcement_link_u_r_l";
  ALTER TABLE "site_settings" DROP COLUMN "announcement_dismissible";
  ALTER TABLE "site_settings" DROP COLUMN "analytics_provider";
  ALTER TABLE "site_settings" DROP COLUMN "analytics_site_id";
  ALTER TABLE "site_settings" DROP COLUMN "analytics_script_u_r_l";
  ALTER TABLE "site_settings" DROP COLUMN "consent_message";
  ALTER TABLE "site_settings" DROP COLUMN "consent_policy_u_r_l";
  ALTER TABLE "site_settings" DROP COLUMN "verification_google";
  ALTER TABLE "site_settings" DROP COLUMN "verification_bing";
  ALTER TABLE "site_settings" DROP COLUMN "not_found_heading";
  ALTER TABLE "site_settings" DROP COLUMN "not_found_message";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_announcement_enabled";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_announcement_text";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_announcement_link_label";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_announcement_link_u_r_l";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_announcement_dismissible";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_analytics_provider";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_analytics_site_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_analytics_script_u_r_l";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_consent_message";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_consent_policy_u_r_l";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_verification_google";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_verification_bing";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_not_found_heading";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_not_found_message";
  DROP TYPE "public"."enum_pages_visibility";
  DROP TYPE "public"."enum__pages_v_version_visibility";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_forms_fields_type";
  DROP TYPE "public"."enum_forms_fields_width";
  DROP TYPE "public"."enum_site_settings_languages";
  DROP TYPE "public"."enum_site_settings_analytics_provider";
  DROP TYPE "public"."enum__site_settings_v_version_languages";
  DROP TYPE "public"."enum__site_settings_v_version_analytics_provider";
  DROP TABLE IF EXISTS "designos_rate_limits";`)
}
