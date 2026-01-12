-- CreateTable
CREATE TABLE "Boss" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "phases" JSONB NOT NULL,
    "strategies" TEXT NOT NULL,
    "rewards" TEXT NOT NULL,
    "hpByPlayerCount" JSONB,
    "stance" INTEGER,
    "parryInfo" JSONB,
    "damageNegation" JSONB,
    "statusResistances" JSONB,
    "strongerVs" JSONB,
    "damageTypesDealt" JSONB,
    "statusEffectsInflicted" JSONB,
    "tags" JSONB,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Weapon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "statusBuildup" JSONB,
    "scaling" JSONB NOT NULL,
    "skill" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "passiveBenefits" JSONB,
    "uniqueEffect" TEXT,
    "tags" JSONB,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Relic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "effects" JSONB NOT NULL,
    "tags" JSONB,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Nightfarer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "passive" TEXT,
    "skill" TEXT,
    "ultimate" TEXT,
    "vessel" TEXT,
    "tags" JSONB,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fpCost" INTEGER NOT NULL,
    "weaponTypes" JSONB NOT NULL,
    "effect" TEXT NOT NULL,
    "tags" JSONB,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "elementalAffinity" TEXT,
    "notableItems" JSONB NOT NULL,
    "enemies" JSONB NOT NULL,
    "bosses" JSONB NOT NULL,
    "connections" JSONB NOT NULL,
    "crystalTypes" JSONB,
    "favor" TEXT,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Talisman" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "weight" REAL,
    "location" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Spell" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "spellType" TEXT NOT NULL,
    "fpCost" INTEGER NOT NULL,
    "slots" INTEGER NOT NULL,
    "effect" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Armor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "weight" REAL,
    "poise" INTEGER,
    "damageNegation" TEXT NOT NULL,
    "resistance" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Shield" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shieldType" TEXT NOT NULL,
    "weight" REAL,
    "guardBoost" INTEGER,
    "skill" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Enemy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "locations" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "drops" JSONB NOT NULL,
    "strategies" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "NPC" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "quests" JSONB NOT NULL,
    "services" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "inventory" TEXT NOT NULL,
    "notableItems" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "Expedition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "recommendedLevel" INTEGER,
    "objectives" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,
    "locations" JSONB NOT NULL,
    "strategies" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "embedding" BLOB
);

-- CreateTable
CREATE TABLE "ContentChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "sourceUrl" TEXT,
    "embedding" BLOB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Boss_name_key" ON "Boss"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Weapon_name_key" ON "Weapon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Relic_name_key" ON "Relic"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Nightfarer_name_key" ON "Nightfarer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Talisman_name_key" ON "Talisman"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Spell_name_key" ON "Spell"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Armor_name_key" ON "Armor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Shield_name_key" ON "Shield"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Enemy_name_key" ON "Enemy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NPC_name_key" ON "NPC"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_name_key" ON "Merchant"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Expedition_name_key" ON "Expedition"("name");
