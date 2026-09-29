import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_form_submissions_status" AS ENUM('new', 'replied', 'archived', 'spam');
  CREATE TYPE "public"."enum_form_submissions_channel" AS ENUM('live', 'preview');
  CREATE TYPE "public"."enum_site_settings_organization_type" AS ENUM('Organization', 'Corporation', 'LocalBusiness', 'ProfessionalService', 'NGO', 'EducationalOrganization', 'MedicalOrganization', 'SportsOrganization', 'PerformingGroup');
  CREATE TYPE "public"."enum__site_settings_v_version_organization_type" AS ENUM('Organization', 'Corporation', 'LocalBusiness', 'ProfessionalService', 'NGO', 'EducationalOrganization', 'MedicalOrganization', 'SportsOrganization', 'PerformingGroup');
  CREATE TABLE "form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_form_submissions_status" DEFAULT 'new' NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"page" varchar,
  	"channel" "enum_form_submissions_channel" DEFAULT 'live',
  	"notes" varchar,
  	"sender_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "form_submissions_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "address" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "language" varchar DEFAULT 'en';
  ALTER TABLE "site_settings" ADD COLUMN "organization_type" "enum_site_settings_organization_type" DEFAULT 'Organization';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_address" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_language" varchar DEFAULT 'en';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_organization_type" "enum__site_settings_v_version_organization_type" DEFAULT 'Organization';
  ALTER TABLE "search_profile" ADD COLUMN "allow_answer_engines" boolean DEFAULT true;
  ALTER TABLE "_search_profile_v" ADD COLUMN "version_allow_answer_engines" boolean DEFAULT true;
  CREATE INDEX "form_submissions_sender_key_idx" ON "form_submissions" USING btree ("sender_key");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "form_submissions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "form_submissions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_submissions_fk";
  
  DROP INDEX "payload_locked_documents_rels_form_submissions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "form_submissions_id";
  ALTER TABLE "site_settings" DROP COLUMN "address";
  ALTER TABLE "site_settings" DROP COLUMN "language";
  ALTER TABLE "site_settings" DROP COLUMN "organization_type";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_address";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_language";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_organization_type";
  ALTER TABLE "search_profile" DROP COLUMN "allow_answer_engines";
  ALTER TABLE "_search_profile_v" DROP COLUMN "version_allow_answer_engines";
  DROP TYPE "public"."enum_form_submissions_status";
  DROP TYPE "public"."enum_form_submissions_channel";
  DROP TYPE "public"."enum_site_settings_organization_type";
  DROP TYPE "public"."enum__site_settings_v_version_organization_type";`)
}
