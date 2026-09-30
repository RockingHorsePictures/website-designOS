import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { generateNKeysBetween } from 'payload/shared'

// Existing records keep their current order: the old numeric `order` (then ID) becomes the new
// drag-and-drop key. Clients had no order and were listed by name.
const ordered: { table: string; versions?: string; by: string }[] = [
  { table: 'pages', versions: '_pages_v', by: '"order" ASC NULLS LAST, id' },
  { table: 'posts', versions: '_posts_v', by: '"order" ASC NULLS LAST, id' },
  { table: 'categories', by: '"order" ASC NULLS LAST, id' },
  { table: 'case_studies', versions: '_case_studies_v', by: '"order" ASC NULLS LAST, id' },
  { table: 'services', versions: '_services_v', by: '"order" ASC NULLS LAST, id' },
  { table: 'team_members', by: '"order" ASC NULLS LAST, id' },
  { table: 'clients', by: 'name ASC, id' },
]

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_listing_order_services" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum_site_settings_listing_order_case_studies" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum_site_settings_listing_order_team" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum_site_settings_listing_order_posts" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum_site_settings_listing_order_categories" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum_site_settings_listing_order_clients" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum__site_settings_v_version_listing_order_services" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum__site_settings_v_version_listing_order_case_studies" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum__site_settings_v_version_listing_order_team" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum__site_settings_v_version_listing_order_posts" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum__site_settings_v_version_listing_order_categories" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  CREATE TYPE "public"."enum__site_settings_v_version_listing_order_clients" AS ENUM('custom', 'newest', 'oldest', 'az', 'za');
  ALTER TABLE "pages" ADD COLUMN "_order" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version__order" varchar;
  ALTER TABLE "posts" ADD COLUMN "_order" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version__order" varchar;
  ALTER TABLE "categories" ADD COLUMN "_order" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "_order" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version__order" varchar;
  ALTER TABLE "services" ADD COLUMN "_order" varchar;
  ALTER TABLE "_services_v" ADD COLUMN "version__order" varchar;
  ALTER TABLE "team_members" ADD COLUMN "_order" varchar;
  ALTER TABLE "clients" ADD COLUMN "_order" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "listing_order_services" "enum_site_settings_listing_order_services" DEFAULT 'custom';
  ALTER TABLE "site_settings" ADD COLUMN "listing_order_case_studies" "enum_site_settings_listing_order_case_studies" DEFAULT 'custom';
  ALTER TABLE "site_settings" ADD COLUMN "listing_order_team" "enum_site_settings_listing_order_team" DEFAULT 'custom';
  ALTER TABLE "site_settings" ADD COLUMN "listing_order_posts" "enum_site_settings_listing_order_posts" DEFAULT 'newest';
  ALTER TABLE "site_settings" ADD COLUMN "listing_order_categories" "enum_site_settings_listing_order_categories" DEFAULT 'custom';
  ALTER TABLE "site_settings" ADD COLUMN "listing_order_clients" "enum_site_settings_listing_order_clients" DEFAULT 'az';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_listing_order_services" "enum__site_settings_v_version_listing_order_services" DEFAULT 'custom';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_listing_order_case_studies" "enum__site_settings_v_version_listing_order_case_studies" DEFAULT 'custom';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_listing_order_team" "enum__site_settings_v_version_listing_order_team" DEFAULT 'custom';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_listing_order_posts" "enum__site_settings_v_version_listing_order_posts" DEFAULT 'newest';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_listing_order_categories" "enum__site_settings_v_version_listing_order_categories" DEFAULT 'custom';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_listing_order_clients" "enum__site_settings_v_version_listing_order_clients" DEFAULT 'az';
  CREATE INDEX "pages__order_idx" ON "pages" USING btree ("_order");
  CREATE INDEX "_pages_v_version_version__order_idx" ON "_pages_v" USING btree ("version__order");
  CREATE INDEX "posts__order_idx" ON "posts" USING btree ("_order");
  CREATE INDEX "_posts_v_version_version__order_idx" ON "_posts_v" USING btree ("version__order");
  CREATE INDEX "categories__order_idx" ON "categories" USING btree ("_order");
  CREATE INDEX "case_studies__order_idx" ON "case_studies" USING btree ("_order");
  CREATE INDEX "_case_studies_v_version_version__order_idx" ON "_case_studies_v" USING btree ("version__order");
  CREATE INDEX "services__order_idx" ON "services" USING btree ("_order");
  CREATE INDEX "_services_v_version_version__order_idx" ON "_services_v" USING btree ("version__order");
  CREATE INDEX "team_members__order_idx" ON "team_members" USING btree ("_order");
  CREATE INDEX "clients__order_idx" ON "clients" USING btree ("_order");`)
  for (const { table, versions, by } of ordered) {
    const { rows } = await db.execute(sql.raw(`SELECT id FROM "${table}" ORDER BY ${by}`))
    const keys = generateNKeysBetween(null, null, rows.length)
    for (const [i, row] of (rows as { id: number }[]).entries())
      await db.execute(sql.raw(`UPDATE "${table}" SET "_order" = '${keys[i]}' WHERE id = ${Number(row.id)}`))
    if (versions)
      await db.execute(
        sql.raw(
          `UPDATE "${versions}" v SET "version__order" = t."_order" FROM "${table}" t WHERE v.parent_id = t.id`,
        ),
      )
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "pages__order_idx";
  DROP INDEX "_pages_v_version_version__order_idx";
  DROP INDEX "posts__order_idx";
  DROP INDEX "_posts_v_version_version__order_idx";
  DROP INDEX "categories__order_idx";
  DROP INDEX "case_studies__order_idx";
  DROP INDEX "_case_studies_v_version_version__order_idx";
  DROP INDEX "services__order_idx";
  DROP INDEX "_services_v_version_version__order_idx";
  DROP INDEX "team_members__order_idx";
  DROP INDEX "clients__order_idx";
  ALTER TABLE "pages" DROP COLUMN "_order";
  ALTER TABLE "_pages_v" DROP COLUMN "version__order";
  ALTER TABLE "posts" DROP COLUMN "_order";
  ALTER TABLE "_posts_v" DROP COLUMN "version__order";
  ALTER TABLE "categories" DROP COLUMN "_order";
  ALTER TABLE "case_studies" DROP COLUMN "_order";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version__order";
  ALTER TABLE "services" DROP COLUMN "_order";
  ALTER TABLE "_services_v" DROP COLUMN "version__order";
  ALTER TABLE "team_members" DROP COLUMN "_order";
  ALTER TABLE "clients" DROP COLUMN "_order";
  ALTER TABLE "site_settings" DROP COLUMN "listing_order_services";
  ALTER TABLE "site_settings" DROP COLUMN "listing_order_case_studies";
  ALTER TABLE "site_settings" DROP COLUMN "listing_order_team";
  ALTER TABLE "site_settings" DROP COLUMN "listing_order_posts";
  ALTER TABLE "site_settings" DROP COLUMN "listing_order_categories";
  ALTER TABLE "site_settings" DROP COLUMN "listing_order_clients";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_listing_order_services";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_listing_order_case_studies";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_listing_order_team";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_listing_order_posts";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_listing_order_categories";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_listing_order_clients";
  DROP TYPE "public"."enum_site_settings_listing_order_services";
  DROP TYPE "public"."enum_site_settings_listing_order_case_studies";
  DROP TYPE "public"."enum_site_settings_listing_order_team";
  DROP TYPE "public"."enum_site_settings_listing_order_posts";
  DROP TYPE "public"."enum_site_settings_listing_order_categories";
  DROP TYPE "public"."enum_site_settings_listing_order_clients";
  DROP TYPE "public"."enum__site_settings_v_version_listing_order_services";
  DROP TYPE "public"."enum__site_settings_v_version_listing_order_case_studies";
  DROP TYPE "public"."enum__site_settings_v_version_listing_order_team";
  DROP TYPE "public"."enum__site_settings_v_version_listing_order_posts";
  DROP TYPE "public"."enum__site_settings_v_version_listing_order_categories";
  DROP TYPE "public"."enum__site_settings_v_version_listing_order_clients";`)
}
