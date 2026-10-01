import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_ai_connection" AS ENUM('live');
  ALTER TABLE "users" ADD COLUMN "ai_write_until" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "ai_connection" "enum_users_ai_connection";
  ALTER TABLE "users" ADD COLUMN "enable_a_p_i_key" boolean;
  ALTER TABLE "users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;
  -- Pending "connect your AI" approvals (the key is held encrypted until the device claims it).
  CREATE TABLE "designos_ai_connect" (
    "code" varchar PRIMARY KEY,
    "secret_hash" varchar NOT NULL,
    "label" varchar NOT NULL,
    "status" varchar NOT NULL DEFAULT 'pending',
    "sealed_key" varchar,
    "created_at" timestamptz NOT NULL DEFAULT now()
  );
  -- Every change an AI connection makes on the live site, with what it replaced, for undo.
  CREATE TABLE "designos_ai_changes" (
    "id" serial PRIMARY KEY,
    "at" timestamptz NOT NULL DEFAULT now(),
    "actor" varchar NOT NULL,
    "action" varchar NOT NULL,
    "collection" varchar,
    "global" varchar,
    "doc_id" varchar,
    "title" varchar,
    "locale" varchar,
    "fields" jsonb NOT NULL DEFAULT '[]',
    "before" jsonb,
    "after" jsonb,
    "undone_at" timestamptz,
    "undone_by" varchar
  );
  CREATE INDEX "designos_ai_changes_at_idx" ON "designos_ai_changes" ("at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "designos_ai_changes";
  DROP TABLE IF EXISTS "designos_ai_connect";
  ALTER TABLE "users" DROP COLUMN "ai_write_until";
  ALTER TABLE "users" DROP COLUMN "ai_connection";
  ALTER TABLE "users" DROP COLUMN "enable_a_p_i_key";
  ALTER TABLE "users" DROP COLUMN "api_key";
  ALTER TABLE "users" DROP COLUMN "api_key_index";
  DROP TYPE "public"."enum_users_ai_connection";`)
}
