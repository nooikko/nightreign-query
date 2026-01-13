/**
 * Zod Schemas for Claude API Normalization
 *
 * These schemas define the output structure for Claude's Structured Outputs feature.
 * They match the Prisma database models and enable type-safe normalization.
 */

import { z } from 'zod'
import { ElementalAffinity } from './types'

/**
 * Schema for boss phase information
 */
export const BossPhaseSchema = z.object({
  name: z.string().describe('Name of the phase (e.g., "Phase 1", "Enraged")'),
  description: z.string().describe('Description of what happens in this phase'),
  threshold: z
    .string()
    .nullish()
    .describe('HP threshold when this phase triggers (e.g., "50%")'),
})

/**
 * Schema for boss rewards
 */
export const BossRewardSchema = z.object({
  name: z.string().describe('Name of the reward item'),
  quantity: z.number().optional().describe('Quantity of the item dropped'),
  type: z
    .string()
    .optional()
    .describe('Type of reward (e.g., "Rune", "Weapon", "Relic")'),
})

/**
 * Schema for HP values per player count
 */
export const BossHpByPlayerCountSchema = z.object({
  solo: z.number().optional().describe('HP with 1 player'),
  duo: z.number().optional().describe('HP with 2 players'),
  trio: z.number().optional().describe('HP with 3 players'),
})

/**
 * Schema for parry information
 */
export const BossParryInfoSchema = z.object({
  canParry: z.boolean().describe('Whether the boss can be parried'),
  parriesRequired: z
    .number()
    .optional()
    .describe('Number of parries required for stance break'),
  notes: z
    .array(z.string())
    .optional()
    .describe('Additional parry-related notes'),
})

/**
 * Schema for damage negation values (8 damage types)
 */
export const DamageNegationValuesSchema = z.object({
  standard: z.number().optional().describe('Standard damage negation'),
  slash: z.number().optional().describe('Slash damage negation'),
  strike: z.number().optional().describe('Strike damage negation'),
  pierce: z.number().optional().describe('Pierce damage negation'),
  magic: z.number().optional().describe('Magic damage negation'),
  fire: z.number().optional().describe('Fire damage negation'),
  lightning: z.number().optional().describe('Lightning damage negation'),
  holy: z.number().optional().describe('Holy damage negation'),
})

/**
 * Schema for boss damage negation per phase
 */
export const BossDamageNegationSchema = z.object({
  phase1: DamageNegationValuesSchema.optional().describe(
    'Phase 1 damage negation values',
  ),
  phase2: DamageNegationValuesSchema.optional().describe(
    'Phase 2 damage negation values',
  ),
})

/**
 * Schema for a single status resistance value
 */
export const StatusResistanceValueSchema = z.object({
  immune: z.boolean().describe('Whether the boss is immune to this status'),
  value: z
    .number()
    .optional()
    .describe('Initial resistance value (if not immune)'),
  progression: z
    .array(z.number())
    .optional()
    .describe('Resistance progression values after each proc'),
})

/**
 * Schema for boss status resistances (6 status types)
 */
export const BossStatusResistancesSchema = z.object({
  poison: StatusResistanceValueSchema.optional().describe('Poison resistance'),
  scarletRot: StatusResistanceValueSchema.optional().describe(
    'Scarlet Rot resistance',
  ),
  bloodLoss: StatusResistanceValueSchema.optional().describe(
    'Blood Loss/Hemorrhage resistance',
  ),
  frostbite: StatusResistanceValueSchema.optional().describe(
    'Frostbite resistance',
  ),
  sleep: StatusResistanceValueSchema.optional().describe('Sleep resistance'),
  madness:
    StatusResistanceValueSchema.optional().describe('Madness resistance'),
})

/**
 * Normalized Boss schema matching Prisma Boss model
 */
export const NormalizedBossSchema = z.object({
  name: z.string().describe('Name of the boss'),
  category: z
    .string()
    .describe('Boss category: Night Lord, Night Boss, Field Boss, Mini Boss'),
  location: z.string().describe('Where the boss is found in the game'),
  weaknesses: z
    .array(z.string())
    .describe(
      'Damage types the boss is weak to (e.g., ["Fire", "Lightning", "Holy"])',
    ),
  phases: z
    .array(BossPhaseSchema)
    .describe('Boss phases with descriptions and thresholds'),
  strategies: z
    .string()
    .describe('Combined strategy tips for defeating the boss'),
  rewards: z
    .string()
    .describe('Comma-separated list of rewards dropped on defeat'),
  // New combat data fields
  hpByPlayerCount: BossHpByPlayerCountSchema.optional().describe(
    'HP values for different player counts (solo, duo, trio)',
  ),
  stance: z.number().optional().describe('Stance value for poise breaks'),
  parryInfo: BossParryInfoSchema.optional().describe(
    'Parry information including whether parryable and requirements',
  ),
  damageNegation: BossDamageNegationSchema.optional().describe(
    'Damage negation values per phase for 8 damage types',
  ),
  statusResistances: BossStatusResistancesSchema.optional().describe(
    'Status effect resistances (poison, scarlet rot, blood loss, frostbite, sleep, madness)',
  ),
  strongerVs: z
    .array(z.string())
    .optional()
    .describe('Damage types the boss is resistant to'),
  damageTypesDealt: z
    .array(z.string())
    .optional()
    .describe('Damage types dealt by the boss'),
  statusEffectsInflicted: z
    .array(z.string())
    .optional()
    .describe('Status effects the boss can inflict'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["fire-weak", "optional"])'),
})

/**
 * Schema for weapon statistics
 */
export const WeaponStatsSchema = z.object({
  physicalDamage: z.number().optional().describe('Base physical damage'),
  magicDamage: z.number().optional().describe('Base magic damage'),
  fireDamage: z.number().optional().describe('Base fire damage'),
  lightningDamage: z.number().optional().describe('Base lightning damage'),
  holyDamage: z.number().optional().describe('Base holy damage'),
  critical: z.number().optional().describe('Critical hit multiplier'),
})

/**
 * Schema for weapon scaling
 */
export const WeaponScalingSchema = z.object({
  strength: z
    .string()
    .optional()
    .describe('Strength scaling grade (S, A, B, C, D, E)'),
  dexterity: z
    .string()
    .optional()
    .describe('Dexterity scaling grade (S, A, B, C, D, E)'),
  intelligence: z
    .string()
    .optional()
    .describe('Intelligence scaling grade (S, A, B, C, D, E)'),
  faith: z
    .string()
    .optional()
    .describe('Faith scaling grade (S, A, B, C, D, E)'),
  arcane: z
    .string()
    .optional()
    .describe('Arcane scaling grade (S, A, B, C, D, E)'),
})

/**
 * Schema for weapon status effect buildup
 * Enables matching weapons to boss weaknesses
 */
export const WeaponStatusBuildupSchema = z.object({
  bloodLoss: z
    .number()
    .optional()
    .describe('Blood loss (hemorrhage) buildup per hit'),
  frostbite: z.number().optional().describe('Frostbite buildup per hit'),
  poison: z.number().optional().describe('Poison buildup per hit'),
  scarletRot: z.number().optional().describe('Scarlet Rot buildup per hit'),
  sleep: z.number().optional().describe('Sleep buildup per hit'),
  madness: z.number().optional().describe('Madness buildup per hit'),
})

/**
 * Normalized Weapon schema matching Prisma Weapon model
 * Enhanced with status buildup for multi-hop queries
 */
export const NormalizedWeaponSchema = z.object({
  name: z.string().describe('Name of the weapon'),
  type: z
    .string()
    .describe('Weapon type (e.g., Katana, Greatsword, Staff, Dagger)'),
  stats: WeaponStatsSchema.describe('Base weapon damage statistics'),
  statusBuildup: WeaponStatusBuildupSchema.optional().describe(
    'Status effect buildup values (bleed, frost, poison, etc.)',
  ),
  scaling: WeaponScalingSchema.describe('Attribute scaling grades'),
  skill: z.string().describe('Associated weapon skill name'),
  description: z.string().describe('Flavor text and lore description'),
  passiveBenefits: z
    .array(z.string())
    .optional()
    .describe('Passive benefits when equipped'),
  uniqueEffect: z
    .string()
    .optional()
    .describe('Unique weapon effect (e.g., "Power of Dark Moon")'),
  tags: z
    .array(z.string())
    .describe(
      'Tags for search filtering (e.g., ["katana", "dex-weapon", "bleed", "frost-damage"])',
    ),
})

/**
 * Normalized Relic schema matching Prisma Relic model
 */
export const NormalizedRelicSchema = z.object({
  name: z.string().describe('Name of the relic'),
  color: z.string().describe('Relic color/category: Red, Green, Blue, Yellow'),
  tier: z
    .string()
    .describe('Relic tier: Delicate, Polished, Grand, or specific tier name'),
  effects: z.array(z.string()).describe('List of effects granted by the relic'),
  tags: z
    .array(z.string())
    .describe(
      'Tags for search filtering (e.g., ["spell-boost", "melee", "defensive"])',
    ),
})

/**
 * Schema for nightfarer base stats
 */
export const NightfarerStatsSchema = z.object({
  vigor: z.number().optional().describe('Vigor stat'),
  mind: z.number().optional().describe('Mind stat'),
  endurance: z.number().optional().describe('Endurance stat'),
  strength: z.number().optional().describe('Strength stat'),
  dexterity: z.number().optional().describe('Dexterity stat'),
  intelligence: z.number().optional().describe('Intelligence stat'),
  faith: z.number().optional().describe('Faith stat'),
  arcane: z.number().optional().describe('Arcane stat'),
})

/**
 * Normalized Nightfarer schema matching Prisma Nightfarer model
 *
 * Note: passive, skill, ultimate, and vessel are optional because:
 * 1. Some wiki pages may have incomplete data
 * 2. Non-nightfarer pages may be processed if filtering misses them
 * 3. Claude should omit fields it can't find rather than hallucinate
 */
export const NormalizedNightfarerSchema = z.object({
  name: z.string().describe('Name of the nightfarer class'),
  stats: NightfarerStatsSchema.describe('Base attribute stats'),
  passive: z
    .string()
    .optional()
    .describe('Passive ability name and description - omit if not found'),
  skill: z
    .string()
    .optional()
    .describe('Active skill name and description - omit if not found'),
  ultimate: z
    .string()
    .optional()
    .describe('Ultimate ability name and description - omit if not found'),
  vessel: z
    .string()
    .optional()
    .describe('Starting vessel/equipment description - omit if not found'),
  tags: z
    .array(z.string())
    .describe(
      'Tags for search filtering (e.g., ["melee", "spellcaster", "tank"])',
    ),
})

/**
 * Normalized Skill schema matching Prisma Skill model
 */
export const NormalizedSkillSchema = z.object({
  name: z.string().describe('Name of the skill'),
  fpCost: z.number().describe('FP cost to use the skill'),
  weaponTypes: z
    .array(z.string())
    .describe('Weapon types that can use this skill'),
  effect: z.string().describe('Description of the skill effect'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["aoe", "buff", "damage"])'),
})

/**
 * Normalized Talisman schema (matches skill structure for now)
 */
export const NormalizedTalismanSchema = z.object({
  name: z.string().describe('Name of the talisman'),
  effect: z.string().describe('Effect description of the talisman'),
  weight: z.number().optional().describe('Weight of the talisman'),
  location: z.string().describe('Where to find the talisman'),
  tags: z
    .array(z.string())
    .describe(
      'Tags for search filtering (e.g., ["damage-boost", "survivability"])',
    ),
})

/**
 * Normalized Spell schema
 */
export const NormalizedSpellSchema = z.object({
  name: z.string().describe('Name of the spell'),
  spellType: z.string().describe('Spell category: Sorcery or Incantation'),
  fpCost: z.number().describe('FP cost to cast'),
  slots: z.number().describe('Memory slots required'),
  effect: z.string().describe('Description of the spell effect'),
  requirements: z.string().describe('Attribute requirements to cast'),
  location: z.string().describe('Where to find the spell'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["sorcery", "aoe", "buff"])'),
})

/**
 * Normalized Armor schema
 */
export const NormalizedArmorSchema = z.object({
  name: z.string().describe('Name of the armor piece'),
  slot: z.string().describe('Armor slot: Head, Chest, Arms, or Legs'),
  weight: z.number().optional().describe('Weight of the armor'),
  poise: z.number().optional().describe('Poise value'),
  damageNegation: z.string().describe('Summary of damage negation stats'),
  resistance: z.string().describe('Summary of resistance stats'),
  location: z.string().describe('Where to find the armor'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["heavy", "high-poise"])'),
})

/**
 * Normalized Shield schema
 */
export const NormalizedShieldSchema = z.object({
  name: z.string().describe('Name of the shield'),
  shieldType: z
    .string()
    .describe('Shield category: Small, Medium, or Greatshield'),
  weight: z.number().optional().describe('Weight of the shield'),
  guardBoost: z.number().optional().describe('Guard boost value'),
  skill: z.string().describe('Associated weapon skill'),
  requirements: z.string().describe('Attribute requirements to wield'),
  location: z.string().describe('Where to find the shield'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["greatshield", "parry"])'),
})

/**
 * Normalized Enemy schema
 */
export const NormalizedEnemySchema = z.object({
  name: z.string().describe('Name of the enemy'),
  category: z
    .string()
    .describe('Enemy category: Humanoid, Beast, Undead, etc.'),
  locations: z
    .array(z.string())
    .describe('Locations where this enemy is found'),
  weaknesses: z.array(z.string()).describe('Damage types the enemy is weak to'),
  drops: z.array(z.string()).describe('Items dropped by this enemy'),
  strategies: z.string().describe('Tips for defeating this enemy'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["undead", "ranged"])'),
})

/**
 * Normalized NPC schema
 */
export const NormalizedNPCSchema = z.object({
  name: z.string().describe('Name of the NPC'),
  role: z.string().describe('NPC role: Quest Giver, Vendor, etc.'),
  location: z.string().describe('Where to find the NPC'),
  quests: z.array(z.string()).describe('Quests this NPC is involved in'),
  services: z.array(z.string()).describe('Services offered by this NPC'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["vendor", "quest-giver"])'),
})

/**
 * Normalized Merchant schema
 */
export const NormalizedMerchantSchema = z.object({
  name: z.string().describe('Name of the merchant'),
  location: z.string().describe('Where to find the merchant'),
  inventory: z.string().describe('Summary of items sold'),
  notableItems: z.array(z.string()).describe('Notable items available'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["weapons", "spells"])'),
})

/**
 * Normalized Location schema
 * Enhanced with elemental affinity for loot bias queries
 */
export const NormalizedLocationSchema = z.object({
  name: z.string().describe('Name of the location'),
  region: z.string().describe('Region this location belongs to'),
  description: z.string().describe('Description of the location'),
  elementalAffinity: z
    .nativeEnum(ElementalAffinity)
    .optional()
    .describe(
      'Elemental theme affecting loot tables (e.g., Mountaintop = cold, Crater = fire)',
    ),
  notableItems: z.array(z.string()).describe('Notable items found here'),
  enemies: z.array(z.string()).describe('Enemies found here'),
  bosses: z.array(z.string()).describe('Bosses found here'),
  connections: z.array(z.string()).describe('Connected locations'),
  crystalTypes: z
    .array(z.string())
    .optional()
    .describe('Crystal types that spawn here (affects weapon drop rates)'),
  favor: z
    .string()
    .optional()
    .describe(
      'Special reward for completing this location (e.g., "Favor of the Mountaintop")',
    ),
  tags: z
    .array(z.string())
    .describe(
      'Tags for search filtering (e.g., ["dungeon", "legacy", "frost-theme"])',
    ),
})

/**
 * Normalized Expedition schema
 */
export const NormalizedExpeditionSchema = z.object({
  name: z.string().describe('Name of the expedition'),
  difficulty: z.string().describe('Difficulty level'),
  recommendedLevel: z.number().optional().describe('Recommended player level'),
  objectives: z.array(z.string()).describe('Main objectives'),
  rewards: z.array(z.string()).describe('Rewards for completion'),
  locations: z.array(z.string()).describe('Locations involved'),
  strategies: z.string().describe('Tips for completing the expedition'),
  tags: z
    .array(z.string())
    .describe('Tags for search filtering (e.g., ["co-op", "hard"])'),
})

/**
 * Schema for item purchase information
 */
export const ItemPurchaseInfoSchema = z.object({
  merchantName: z.string().describe('Name of the merchant'),
  location: z.string().describe('Location of the merchant'),
  price: z.number().describe('Price in runes'),
  stock: z.number().optional().describe('Available stock (if limited)'),
})

/**
 * Normalized Item schema for Key Items, Consumables, and Materials
 */
export const NormalizedItemSchema = z.object({
  name: z.string().describe('Name of the item'),
  category: z
    .string()
    .describe(
      'Item category: Key Item, Consumable, Crafting Material, Upgrade Material, etc.',
    ),
  effect: z.string().describe('What the item does or its purpose'),
  locations: z
    .array(z.string())
    .describe('Where to find this item (all known locations)'),
  uses: z
    .number()
    .optional()
    .describe('Number of uses (omit for key items or unlimited)'),
  purchaseLocations: z
    .array(ItemPurchaseInfoSchema)
    .optional()
    .describe('Merchants who sell this item with prices'),
  tags: z
    .array(z.string())
    .describe(
      'Tags for search filtering (e.g., ["key-item", "unlock", "imp-statue"])',
    ),
})

/**
 * Content chunk schema for search indexing
 */
export const ContentChunkSchema = z.object({
  type: z
    .enum([
      'boss',
      'weapon',
      'relic',
      'nightfarer',
      'skill',
      'talisman',
      'spell',
      'armor',
      'shield',
      'enemy',
      'npc',
      'merchant',
      'location',
      'expedition',
      'item',
      'guide',
    ])
    .describe('Type of content'),
  name: z.string().describe('Name of the content item'),
  section: z.string().describe('Section name within the content'),
  content: z.string().describe('Text content for this section'),
  tags: z.array(z.string()).describe('Tags for filtering'),
})

/**
 * Union type for all normalized content
 */
export type NormalizedBoss = z.infer<typeof NormalizedBossSchema>
export type NormalizedWeapon = z.infer<typeof NormalizedWeaponSchema>
export type NormalizedRelic = z.infer<typeof NormalizedRelicSchema>
export type NormalizedNightfarer = z.infer<typeof NormalizedNightfarerSchema>
export type NormalizedSkill = z.infer<typeof NormalizedSkillSchema>
export type NormalizedTalisman = z.infer<typeof NormalizedTalismanSchema>
export type NormalizedSpell = z.infer<typeof NormalizedSpellSchema>
export type NormalizedArmor = z.infer<typeof NormalizedArmorSchema>
export type NormalizedShield = z.infer<typeof NormalizedShieldSchema>
export type NormalizedEnemy = z.infer<typeof NormalizedEnemySchema>
export type NormalizedNPC = z.infer<typeof NormalizedNPCSchema>
export type NormalizedMerchant = z.infer<typeof NormalizedMerchantSchema>
export type NormalizedLocation = z.infer<typeof NormalizedLocationSchema>
export type NormalizedExpedition = z.infer<typeof NormalizedExpeditionSchema>
export type NormalizedItem = z.infer<typeof NormalizedItemSchema>
export type ContentChunk = z.infer<typeof ContentChunkSchema>

/**
 * Map content type to its schema
 */
export const CONTENT_TYPE_SCHEMAS = {
  boss: NormalizedBossSchema,
  weapon: NormalizedWeaponSchema,
  relic: NormalizedRelicSchema,
  nightfarer: NormalizedNightfarerSchema,
  skill: NormalizedSkillSchema,
  talisman: NormalizedTalismanSchema,
  spell: NormalizedSpellSchema,
  armor: NormalizedArmorSchema,
  shield: NormalizedShieldSchema,
  enemy: NormalizedEnemySchema,
  npc: NormalizedNPCSchema,
  merchant: NormalizedMerchantSchema,
  location: NormalizedLocationSchema,
  expedition: NormalizedExpeditionSchema,
  item: NormalizedItemSchema,
} as const
