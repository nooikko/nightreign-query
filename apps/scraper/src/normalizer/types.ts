/**
 * Type definitions for parsed content from Fextralife wiki pages
 *
 * These interfaces represent the structured data extracted from
 * raw HTML before normalization with Claude.
 */

import type { ContentType } from '@nightreign/types'

/**
 * Canonical damage type taxonomy for multi-hop queries
 * Maps to both weapon damage and boss weaknesses
 */
export enum DamageType {
  // Physical damage types
  STANDARD = 'standard',
  SLASH = 'slash',
  STRIKE = 'strike',
  PIERCE = 'pierce',
  // Elemental damage types
  MAGIC = 'magic',
  FIRE = 'fire',
  LIGHTNING = 'lightning',
  HOLY = 'holy',
}

/**
 * Status effect types that can be inflicted/resisted
 */
export enum StatusEffect {
  POISON = 'poison',
  SCARLET_ROT = 'scarletRot',
  BLOOD_LOSS = 'bloodLoss',
  FROSTBITE = 'frostbite',
  SLEEP = 'sleep',
  MADNESS = 'madness',
}

/**
 * Elemental affinity for locations (determines loot bias)
 */
export enum ElementalAffinity {
  COLD = 'cold',
  FIRE = 'fire',
  LIGHTNING = 'lightning',
  HOLY = 'holy',
  MAGIC = 'magic',
  ROT = 'rot',
  NONE = 'none',
}

/**
 * Maps wiki weakness strings to canonical damage/status types
 * Used for entity resolution in multi-hop queries
 */
export const WEAKNESS_MAPPING: Record<string, DamageType | StatusEffect> = {
  // Frostbite/Cold
  frost: StatusEffect.FROSTBITE,
  'frost-weak': StatusEffect.FROSTBITE,
  frostbite: StatusEffect.FROSTBITE,
  cold: StatusEffect.FROSTBITE,
  // Fire
  fire: DamageType.FIRE,
  'fire-weak': DamageType.FIRE,
  flame: DamageType.FIRE,
  // Holy
  holy: DamageType.HOLY,
  'holy-weak': DamageType.HOLY,
  // Lightning
  lightning: DamageType.LIGHTNING,
  'lightning-weak': DamageType.LIGHTNING,
  // Magic
  magic: DamageType.MAGIC,
  'magic-weak': DamageType.MAGIC,
  // Sleep
  sleep: StatusEffect.SLEEP,
  'sleep-weak': StatusEffect.SLEEP,
  // Poison
  poison: StatusEffect.POISON,
  'poison-weak': StatusEffect.POISON,
  // Scarlet Rot
  'scarlet rot': StatusEffect.SCARLET_ROT,
  scarletrot: StatusEffect.SCARLET_ROT,
  rot: StatusEffect.SCARLET_ROT,
  // Blood Loss
  'blood loss': StatusEffect.BLOOD_LOSS,
  bloodloss: StatusEffect.BLOOD_LOSS,
  hemorrhage: StatusEffect.BLOOD_LOSS,
  bleed: StatusEffect.BLOOD_LOSS,
  // Madness
  madness: StatusEffect.MADNESS,
  'madness-weak': StatusEffect.MADNESS,
  // Physical types
  standard: DamageType.STANDARD,
  slash: DamageType.SLASH,
  strike: DamageType.STRIKE,
  pierce: DamageType.PIERCE,
}

/**
 * Maps elemental affinity to related damage types and status effects
 * Used to find weapons effective in a location's elemental theme
 */
export const AFFINITY_TO_DAMAGE_TYPES: Record<
  ElementalAffinity,
  (DamageType | StatusEffect)[]
> = {
  [ElementalAffinity.COLD]: [StatusEffect.FROSTBITE],
  [ElementalAffinity.FIRE]: [DamageType.FIRE],
  [ElementalAffinity.LIGHTNING]: [DamageType.LIGHTNING],
  [ElementalAffinity.HOLY]: [DamageType.HOLY],
  [ElementalAffinity.MAGIC]: [DamageType.MAGIC],
  [ElementalAffinity.ROT]: [StatusEffect.SCARLET_ROT, StatusEffect.POISON],
  [ElementalAffinity.NONE]: [],
}

/**
 * Status effect buildup values for weapons
 * Enables matching weapons to boss weaknesses
 */
export interface WeaponStatusBuildup {
  readonly bloodLoss?: number
  readonly frostbite?: number
  readonly poison?: number
  readonly scarletRot?: number
  readonly sleep?: number
  readonly madness?: number
}

/**
 * Base interface for all parsed content
 */
export interface ParsedContentBase {
  /** The type of content */
  readonly type: ContentType
  /** Name of the item/entity */
  readonly name: string
  /** Source URL of the page */
  readonly sourceUrl: string
  /** Raw description text */
  readonly description: string
  /** Whether parsing was successful */
  readonly parseSuccess: boolean
  /** Any warnings or notes from parsing */
  readonly parseWarnings: string[]
}

/**
 * Parsed boss data from Fextralife
 */
export interface ParsedBoss extends ParsedContentBase {
  readonly type: 'boss'
  /** Boss category (e.g., "Main Boss", "Field Boss", "Mini Boss") */
  readonly category: string
  /** Weaknesses (damage types the boss is vulnerable to) */
  readonly weaknesses: string[]
  /** Boss phases with descriptions */
  readonly phases: BossPhase[]
  /** Strategy tips for defeating the boss */
  readonly strategies: string[]
  /** Rewards dropped on defeat */
  readonly rewards: BossReward[]
  /** Location where the boss is found */
  readonly location: string
  /** Boss HP if available (single value or per-player-count) */
  readonly hp?: number
  /** HP values per player count (1, 2, 3 players) */
  readonly hpByPlayerCount?: BossHpByPlayerCount
  /** Stance value for poise breaks */
  readonly stance?: number
  /** Parry information */
  readonly parryInfo?: BossParryInfo
  /** Damage negation values per phase */
  readonly damageNegation?: BossDamageNegation
  /** Status effect resistances */
  readonly statusResistances?: BossStatusResistances
  /** Damage types the boss is strong against */
  readonly strongerVs?: string[]
  /** Damage types dealt by the boss */
  readonly damageTypesDealt?: string[]
  /** Status effects inflicted by the boss */
  readonly statusEffectsInflicted?: string[]
  /** Detailed attack patterns organized by phase */
  readonly attackPatterns?: BossAttackPatterns
}

export interface BossPhase {
  readonly name: string
  readonly description: string
  readonly threshold?: string
}

export interface BossReward {
  readonly name: string
  readonly quantity?: number
  readonly type?: string
}

/** HP values for different player counts */
export interface BossHpByPlayerCount {
  readonly solo?: number
  readonly duo?: number
  readonly trio?: number
}

/** Parry information for a boss */
export interface BossParryInfo {
  readonly canParry: boolean
  /** Number of parries required for stance break (if parryable) */
  readonly parriesRequired?: number
  /** Additional notes about parrying */
  readonly notes?: string[]
}

/** Damage negation values (can be per-phase) */
export interface BossDamageNegation {
  readonly phase1?: DamageNegationValues
  readonly phase2?: DamageNegationValues
}

/** Individual damage negation values for 8 damage types */
export interface DamageNegationValues {
  readonly standard?: number
  readonly slash?: number
  readonly strike?: number
  readonly pierce?: number
  readonly magic?: number
  readonly fire?: number
  readonly lightning?: number
  readonly holy?: number
}

/** Status resistance values for a boss */
export interface BossStatusResistances {
  readonly poison?: StatusResistanceValue
  readonly scarletRot?: StatusResistanceValue
  readonly bloodLoss?: StatusResistanceValue
  readonly frostbite?: StatusResistanceValue
  readonly sleep?: StatusResistanceValue
  readonly madness?: StatusResistanceValue
}

/** Status resistance value (can be immune or have numeric values) */
export interface StatusResistanceValue {
  readonly immune: boolean
  /** Initial resistance value (if not immune) */
  readonly value?: number
  /** Resistance progression values after each proc */
  readonly progression?: number[]
}

/**
 * Individual boss attack pattern
 */
export interface BossAttackPattern {
  readonly name: string
  readonly description: string
  /** Damage types dealt by this attack */
  readonly damageTypes?: string[]
  /** Status effects inflicted by this attack */
  readonly statusEffects?: string[]
  /** How to dodge/counter this attack */
  readonly counter?: string
  /** Attack wind-up timing/tells */
  readonly tells?: string[]
  /** Which phase(s) this attack appears in */
  readonly phases?: number[]
}

/**
 * Boss attack patterns organized by phase
 */
export interface BossAttackPatterns {
  /** General attacks available in all phases */
  readonly general?: BossAttackPattern[]
  /** Phase-specific attacks */
  readonly phase1?: BossAttackPattern[]
  readonly phase2?: BossAttackPattern[]
  readonly phase3?: BossAttackPattern[]
}

/**
 * Parsed weapon data from Fextralife
 */
export interface ParsedWeapon extends ParsedContentBase {
  readonly type: 'weapon'
  /** Weapon category (e.g., "Katana", "Greatsword", "Staff") */
  readonly weaponType: string
  /** Base stats */
  readonly stats: WeaponStats
  /** Status effect buildup values (bleed, frost, poison, etc.) */
  readonly statusBuildup?: WeaponStatusBuildup
  /** Attribute scaling */
  readonly scaling: WeaponScaling
  /** Associated skill */
  readonly skill: string
  /** Required attributes to wield */
  readonly requirements: AttributeRequirements
  /** Weight of the weapon */
  readonly weight?: number
  /** How to obtain the weapon */
  readonly location: string
  /** Passive benefits when equipped */
  readonly passiveBenefits?: string[]
  /** Unique weapon effect (e.g., "Power of Dark Moon") */
  readonly uniqueEffect?: string
  /** Upgrade progression for all Nightfarer classes (8 classes × 15 levels × 4 tiers) */
  readonly upgradeProgression?: WeaponUpgradeProgression
}

export interface WeaponStats {
  readonly physicalDamage?: number
  readonly magicDamage?: number
  readonly fireDamage?: number
  readonly lightningDamage?: number
  readonly holyDamage?: number
  readonly critical?: number
}

export interface WeaponScaling {
  readonly strength?: string
  readonly dexterity?: string
  readonly intelligence?: string
  readonly faith?: string
  readonly arcane?: string
}

/**
 * Nightfarer class types for weapon upgrade paths
 */
export type NightfarerClass =
  | 'wylder'
  | 'guardian'
  | 'ironeye'
  | 'duchess'
  | 'raider'
  | 'revenant'
  | 'recluse'
  | 'executor'

/**
 * Quality tiers for weapon upgrades
 */
export type WeaponQualityTier = 'common' | 'rare' | 'epic' | 'legendary'

/**
 * Stats for a single quality tier at a specific level
 */
export interface WeaponUpgradeTierStats {
  readonly atkPwr?: number
  readonly dmgNeg?: number
}

/**
 * Stats for all quality tiers at a specific level
 */
export interface WeaponUpgradeLevelStats {
  readonly level: number
  readonly common?: WeaponUpgradeTierStats
  readonly rare?: WeaponUpgradeTierStats
  readonly epic?: WeaponUpgradeTierStats
  readonly legendary?: WeaponUpgradeTierStats
}

/**
 * Upgrade progression for a single Nightfarer class
 * Contains 15 levels of upgrade data
 */
export interface WeaponClassUpgrades {
  readonly nightfarerClass: NightfarerClass
  readonly levels: WeaponUpgradeLevelStats[]
}

/**
 * Complete weapon upgrade progression
 * Contains upgrade paths for all 8 Nightfarer classes
 */
export interface WeaponUpgradeProgression {
  readonly weaponName: string
  readonly upgradesByClass: WeaponClassUpgrades[]
}

export interface AttributeRequirements {
  readonly strength?: number
  readonly dexterity?: number
  readonly intelligence?: number
  readonly faith?: number
  readonly arcane?: number
}

/**
 * Character-specific effect for a relic
 */
export interface RelicClassEffect {
  readonly nightfarerClass: NightfarerClass
  readonly effect: string
  readonly notes?: string
}

/**
 * Parsed relic data from Fextralife
 */
export interface ParsedRelic extends ParsedContentBase {
  readonly type: 'relic'
  /** Relic color/rarity (e.g., "Red", "Blue", "Gold") */
  readonly color: string
  /** Relic tier (e.g., "Tier 1", "Tier 2", "Tier 3") */
  readonly tier: string
  /** Effects granted by the relic (general effects) */
  readonly effects: string[]
  /** Character-specific effects (different per Nightfarer class) */
  readonly classEffects?: RelicClassEffect[]
  /** How to obtain the relic */
  readonly location: string
}

/**
 * Parsed nightfarer (class) data from Fextralife
 */
export interface ParsedNightfarer extends ParsedContentBase {
  readonly type: 'nightfarer'
  /** Base stats for the class */
  readonly stats: NightfarerStats
  /** Passive ability description */
  readonly passive: NightfarerAbility
  /** Active skill description */
  readonly skill: NightfarerAbility
  /** Ultimate ability description */
  readonly ultimate: NightfarerAbility
  /** Vessel (starting equipment/loadout) */
  readonly vessel: VesselInfo
  /** Level progression (HP/FP/Stamina per level 1-15) */
  readonly progression?: NightfarerProgression
}

export interface NightfarerStats {
  readonly vigor?: number
  readonly mind?: number
  readonly endurance?: number
  readonly strength?: number
  readonly dexterity?: number
  readonly intelligence?: number
  readonly faith?: number
  readonly arcane?: number
}

export interface NightfarerAbility {
  readonly name: string
  readonly description: string
  readonly fpCost?: number
}

export interface VesselInfo {
  readonly name: string
  readonly description: string
  readonly startingWeapon?: string
  readonly startingArmor?: string
}

/**
 * Nightfarer level progression stats (HP/FP/Stamina per level 1-15)
 */
export interface NightfarerLevelStats {
  readonly level: number
  readonly hp?: number
  readonly fp?: number
  readonly stamina?: number
}

/**
 * Nightfarer attribute progression per level
 */
export interface NightfarerAttributeProgression {
  readonly level: number
  readonly vigor?: number
  readonly mind?: number
  readonly endurance?: number
  readonly strength?: number
  readonly dexterity?: number
  readonly intelligence?: number
  readonly faith?: number
  readonly arcane?: number
}

/**
 * Complete Nightfarer progression data
 */
export interface NightfarerProgression {
  readonly characterName: string
  readonly statProgression: NightfarerLevelStats[]
  readonly attributeProgression?: NightfarerAttributeProgression[]
}

/**
 * Parsed skill data from Fextralife
 */
export interface ParsedSkill extends ParsedContentBase {
  readonly type: 'skill'
  /** FP cost to use the skill */
  readonly fpCost: number
  /** Weapon types this skill can be used with */
  readonly weaponTypes: string[]
  /** Effect description */
  readonly effect: string
  /** Stamina cost if specified */
  readonly staminaCost?: number
  /** How to obtain the skill */
  readonly location: string
}

/**
 * Parsed talisman data from Fextralife
 */
export interface ParsedTalisman extends ParsedContentBase {
  readonly type: 'talisman'
  /** Effect description */
  readonly effect: string
  /** Weight of the talisman */
  readonly weight?: number
  /** How to obtain the talisman */
  readonly location: string
}

/**
 * Parsed spell data from Fextralife
 */
export interface ParsedSpell extends ParsedContentBase {
  readonly type: 'spell'
  /** Spell category (Sorcery, Incantation) */
  readonly spellType: string
  /** FP cost to cast */
  readonly fpCost: number
  /** Slots required */
  readonly slots: number
  /** Effect description */
  readonly effect: string
  /** Required attributes to cast */
  readonly requirements: AttributeRequirements
  /** How to obtain the spell */
  readonly location: string
}

/**
 * Parsed armor data from Fextralife
 */
export interface ParsedArmor extends ParsedContentBase {
  readonly type: 'armor'
  /** Armor slot (Head, Chest, Arms, Legs) */
  readonly slot: string
  /** Damage negation stats */
  readonly damageNegation: DamageNegation
  /** Resistance stats */
  readonly resistance: Resistance
  /** Weight of the armor */
  readonly weight?: number
  /** How to obtain the armor */
  readonly location: string
}

export interface DamageNegation {
  readonly physical?: number
  readonly strike?: number
  readonly slash?: number
  readonly pierce?: number
  readonly magic?: number
  readonly fire?: number
  readonly lightning?: number
  readonly holy?: number
}

export interface Resistance {
  readonly immunity?: number
  readonly robustness?: number
  readonly focus?: number
  readonly vitality?: number
  readonly poise?: number
}

/**
 * Parsed shield data from Fextralife
 */
export interface ParsedShield extends ParsedContentBase {
  readonly type: 'shield'
  /** Shield category (Small, Medium, Greatshield) */
  readonly shieldType: string
  /** Guard stats (damage negation when blocking) */
  readonly guard: DamageNegation
  /** Guard boost value (stamina efficiency when blocking) */
  readonly guardBoost?: number
  /** Associated skill */
  readonly skill: string
  /** Weight of the shield */
  readonly weight?: number
  /** Required attributes to wield */
  readonly requirements: AttributeRequirements
  /** How to obtain the shield */
  readonly location: string
}

/**
 * Parsed enemy data from Fextralife
 */
export interface ParsedEnemy extends ParsedContentBase {
  readonly type: 'enemy'
  /** Enemy category (Humanoid, Beast, Undead, etc.) */
  readonly category: string
  /** Locations where this enemy is found */
  readonly locations: string[]
  /** Weaknesses (damage types) */
  readonly weaknesses: string[]
  /** Drops from this enemy */
  readonly drops: string[]
  /** HP if available */
  readonly hp?: number
  /** Runes dropped */
  readonly runes?: number
}

/**
 * Parsed NPC data from Fextralife
 */
export interface ParsedNPC extends ParsedContentBase {
  readonly type: 'npc'
  /** NPC role (Quest Giver, Vendor, etc.) */
  readonly role: string
  /** Location where the NPC is found */
  readonly location: string
  /** Quest involvement if any */
  readonly quests: string[]
  /** Services offered */
  readonly services: string[]
}

/**
 * Parsed merchant data from Fextralife
 */
export interface ParsedMerchant extends ParsedContentBase {
  readonly type: 'merchant'
  /** Location where the merchant is found */
  readonly location: string
  /** Items sold by this merchant */
  readonly inventory: MerchantItem[]
}

export interface MerchantItem {
  readonly name: string
  readonly price: number
  readonly currency: string
}

/**
 * Parsed location data from Fextralife
 */
export interface ParsedLocation extends ParsedContentBase {
  readonly type: 'location'
  /** Region this location belongs to */
  readonly region: string
  /** Elemental affinity (determines loot bias) */
  readonly elementalAffinity?: ElementalAffinity
  /** Notable items found here */
  readonly items: string[]
  /** Enemies found here */
  readonly enemies: string[]
  /** Bosses found here */
  readonly bosses: string[]
  /** Connected locations */
  readonly connections: string[]
  /** Crystal types that spawn here (for loot tables) */
  readonly crystalTypes?: string[]
  /** Special rewards from this location */
  readonly favor?: string
}

/**
 * Parsed expedition data from Fextralife
 */
export interface ParsedExpedition extends ParsedContentBase {
  readonly type: 'expedition'
  /** Difficulty level */
  readonly difficulty: string
  /** Recommended level */
  readonly recommendedLevel?: number
  /** Objectives */
  readonly objectives: string[]
  /** Rewards for completion */
  readonly rewards: string[]
  /** Locations involved */
  readonly locations: string[]
}

/**
 * Parsed item data (key items, consumables, materials)
 */
export interface ParsedItem extends ParsedContentBase {
  readonly type: 'item'
  /** Item category: Key Item, Consumable, Crafting Material, Upgrade Material, etc. */
  readonly category: string
  /** What the item does / its effect */
  readonly effect: string
  /** Where to find this item (full text, not just first line) */
  readonly locations: string[]
  /** Number of uses (undefined for key items/unlimited) */
  readonly uses?: number
  /** Purchase information if sold by merchants */
  readonly purchaseLocations?: ItemPurchaseInfo[]
}

/**
 * Information about where an item can be purchased
 */
export interface ItemPurchaseInfo {
  readonly merchantName: string
  readonly location: string
  readonly price: number
  readonly stock?: number
}

/**
 * Union type of all parsed content types
 */
export type ParsedContent =
  | ParsedBoss
  | ParsedWeapon
  | ParsedRelic
  | ParsedNightfarer
  | ParsedSkill
  | ParsedTalisman
  | ParsedSpell
  | ParsedArmor
  | ParsedShield
  | ParsedEnemy
  | ParsedNPC
  | ParsedMerchant
  | ParsedLocation
  | ParsedExpedition
  | ParsedItem

/**
 * Parser result with success/failure handling
 */
export type ParseResult<T extends ParsedContent> =
  | { success: true; data: T }
  | { success: false; error: string; partial?: Partial<T> }

/**
 * Parser function signature
 */
export type Parser<T extends ParsedContent> = (
  html: string,
  url: string,
) => ParseResult<T>
