import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" DROP COLUMN "order";
  ALTER TABLE "_pages_v" DROP COLUMN "version_order";
  ALTER TABLE "posts" DROP COLUMN "order";
  ALTER TABLE "_posts_v" DROP COLUMN "version_order";
  ALTER TABLE "categories" DROP COLUMN "order";
  ALTER TABLE "case_studies" DROP COLUMN "order";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_order";
  ALTER TABLE "services" DROP COLUMN "order";
  ALTER TABLE "_services_v" DROP COLUMN "version_order";
  ALTER TABLE "team_members" DROP COLUMN "order";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "_pages_v" ADD COLUMN "version_order" numeric DEFAULT 0;
  ALTER TABLE "posts" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "_posts_v" ADD COLUMN "version_order" numeric DEFAULT 0;
  ALTER TABLE "categories" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "case_studies" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_order" numeric DEFAULT 0;
  ALTER TABLE "services" ADD COLUMN "order" numeric DEFAULT 0;
  ALTER TABLE "_services_v" ADD COLUMN "version_order" numeric DEFAULT 0;
  ALTER TABLE "team_members" ADD COLUMN "order" numeric DEFAULT 0;`)
}
