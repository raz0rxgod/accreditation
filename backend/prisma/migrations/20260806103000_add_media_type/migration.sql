-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('television', 'print', 'radio', 'other');

-- AlterTable
-- Колонка nullable: у уже существующих организаций в справочнике тип неизвестен,
-- принудительный backfill не делаем — постепенно проставится при редактировании
-- организации в анкете (MediaOrgSelect) или сотрудником администрации.
ALTER TABLE "media_organizations" ADD COLUMN "media_type" "MediaType";
