/**
 * Entity Resolver Service
 *
 * Enables multi-hop queries by resolving relationships between entities:
 * - Boss → weaknesses → damage types
 * - Damage types → weapons with that element
 * - Weapons → locations where they can be found
 * - Locations → elemental themes
 *
 * Example query: "Where can I get a weapon good against [boss]?"
 */

import type { NormalizedLocation, NormalizedWeapon } from './schemas'
import {
  AFFINITY_TO_DAMAGE_TYPES,
  DamageType,
  ElementalAffinity,
  StatusEffect,
  WEAKNESS_MAPPING,
} from './types'

/**
 * Weapon match with effectiveness score
 */
export interface WeaponMatch {
  weapon: NormalizedWeapon
  score: number
  matchReasons: string[]
}

/**
 * Location recommendation with reasoning
 */
export interface LocationRecommendation {
  location: NormalizedLocation
  elementalAffinity: ElementalAffinity
  relevantWeapons: string[]
  reason: string
}

/**
 * Complete recommendation for fighting a boss
 */
export interface BossCounterRecommendation {
  boss: string
  weaknesses: (DamageType | StatusEffect)[]
  recommendedWeapons: WeaponMatch[]
  recommendedLocations: LocationRecommendation[]
  strategy: string
}

/**
 * Resolve weakness strings to canonical damage/status types
 */
export function resolveWeaknessTypes(
  weaknesses: string[],
): (DamageType | StatusEffect)[] {
  const resolved: (DamageType | StatusEffect)[] = []

  for (const weakness of weaknesses) {
    const normalized = weakness.toLowerCase().trim()
    const mapped = WEAKNESS_MAPPING[normalized]
    if (mapped && !resolved.includes(mapped)) {
      resolved.push(mapped)
    }
  }

  return resolved
}

/**
 * Check if a weapon deals a specific damage type
 */
export function weaponDealsDamageType(
  weapon: NormalizedWeapon,
  damageType: DamageType | StatusEffect,
): boolean {
  // Check elemental damage stats
  if (
    damageType === DamageType.FIRE &&
    weapon.stats.fireDamage &&
    weapon.stats.fireDamage > 0
  ) {
    return true
  }
  if (
    damageType === DamageType.LIGHTNING &&
    weapon.stats.lightningDamage &&
    weapon.stats.lightningDamage > 0
  ) {
    return true
  }
  if (
    damageType === DamageType.MAGIC &&
    weapon.stats.magicDamage &&
    weapon.stats.magicDamage > 0
  ) {
    return true
  }
  if (
    damageType === DamageType.HOLY &&
    weapon.stats.holyDamage &&
    weapon.stats.holyDamage > 0
  ) {
    return true
  }

  // Check status buildup
  if (weapon.statusBuildup) {
    if (
      damageType === StatusEffect.BLOOD_LOSS &&
      weapon.statusBuildup.bloodLoss
    ) {
      return true
    }
    if (
      damageType === StatusEffect.FROSTBITE &&
      weapon.statusBuildup.frostbite
    ) {
      return true
    }
    if (damageType === StatusEffect.POISON && weapon.statusBuildup.poison) {
      return true
    }
    if (
      damageType === StatusEffect.SCARLET_ROT &&
      weapon.statusBuildup.scarletRot
    ) {
      return true
    }
    if (damageType === StatusEffect.SLEEP && weapon.statusBuildup.sleep) {
      return true
    }
    if (damageType === StatusEffect.MADNESS && weapon.statusBuildup.madness) {
      return true
    }
  }

  // Check tags for damage type hints
  const tags = weapon.tags.map((t) => t.toLowerCase())
  const typeStr = damageType.toLowerCase()
  return tags.some(
    (tag) =>
      tag.includes(typeStr) ||
      tag.includes(`${typeStr}-damage`) ||
      tag.includes(`${typeStr}-weapon`),
  )
}

/**
 * Calculate weapon effectiveness against a boss's weaknesses
 */
export function calculateWeaponEffectiveness(
  weapon: NormalizedWeapon,
  weaknessTypes: (DamageType | StatusEffect)[],
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  for (const weakness of weaknessTypes) {
    if (weaponDealsDamageType(weapon, weakness)) {
      // Base score for matching
      let matchScore = 50

      // Bonus for high elemental damage
      if (weakness === DamageType.FIRE && weapon.stats.fireDamage) {
        matchScore += weapon.stats.fireDamage
        reasons.push(`Fire damage: ${weapon.stats.fireDamage}`)
      }
      if (weakness === DamageType.LIGHTNING && weapon.stats.lightningDamage) {
        matchScore += weapon.stats.lightningDamage
        reasons.push(`Lightning damage: ${weapon.stats.lightningDamage}`)
      }
      if (weakness === DamageType.MAGIC && weapon.stats.magicDamage) {
        matchScore += weapon.stats.magicDamage
        reasons.push(`Magic damage: ${weapon.stats.magicDamage}`)
      }
      if (weakness === DamageType.HOLY && weapon.stats.holyDamage) {
        matchScore += weapon.stats.holyDamage
        reasons.push(`Holy damage: ${weapon.stats.holyDamage}`)
      }

      // Bonus for high status buildup
      if (weapon.statusBuildup) {
        if (
          weakness === StatusEffect.FROSTBITE &&
          weapon.statusBuildup.frostbite
        ) {
          matchScore += weapon.statusBuildup.frostbite
          reasons.push(`Frostbite buildup: ${weapon.statusBuildup.frostbite}`)
        }
        if (
          weakness === StatusEffect.BLOOD_LOSS &&
          weapon.statusBuildup.bloodLoss
        ) {
          matchScore += weapon.statusBuildup.bloodLoss
          reasons.push(`Blood loss buildup: ${weapon.statusBuildup.bloodLoss}`)
        }
        if (weakness === StatusEffect.POISON && weapon.statusBuildup.poison) {
          matchScore += weapon.statusBuildup.poison
          reasons.push(`Poison buildup: ${weapon.statusBuildup.poison}`)
        }
        if (
          weakness === StatusEffect.SCARLET_ROT &&
          weapon.statusBuildup.scarletRot
        ) {
          matchScore += weapon.statusBuildup.scarletRot
          reasons.push(
            `Scarlet Rot buildup: ${weapon.statusBuildup.scarletRot}`,
          )
        }
        if (weakness === StatusEffect.SLEEP && weapon.statusBuildup.sleep) {
          matchScore += weapon.statusBuildup.sleep
          reasons.push(`Sleep buildup: ${weapon.statusBuildup.sleep}`)
        }
      }

      score += matchScore
    }
  }

  return { score, reasons }
}

/**
 * Find weapons effective against a boss's weaknesses
 */
export function findEffectiveWeapons(
  weapons: NormalizedWeapon[],
  weaknessTypes: (DamageType | StatusEffect)[],
  limit = 10,
): WeaponMatch[] {
  const matches: WeaponMatch[] = []

  for (const weapon of weapons) {
    const { score, reasons } = calculateWeaponEffectiveness(
      weapon,
      weaknessTypes,
    )
    if (score > 0) {
      matches.push({
        weapon,
        score,
        matchReasons: reasons,
      })
    }
  }

  // Sort by score descending and limit
  return matches.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Find locations where elemental weapons are likely to drop
 */
export function findLocationsForElement(
  locations: NormalizedLocation[],
  damageTypes: (DamageType | StatusEffect)[],
): LocationRecommendation[] {
  const recommendations: LocationRecommendation[] = []

  for (const location of locations) {
    if (!location.elementalAffinity) continue

    // Check if location's affinity matches any of the needed damage types
    const affinityTypes =
      AFFINITY_TO_DAMAGE_TYPES[location.elementalAffinity] || []
    const matchingTypes = damageTypes.filter((dt) => affinityTypes.includes(dt))

    if (matchingTypes.length > 0) {
      recommendations.push({
        location,
        elementalAffinity: location.elementalAffinity,
        relevantWeapons: [], // Would be populated from weapon queries
        reason: `${location.name} has ${location.elementalAffinity} affinity, which favors ${matchingTypes.join(', ')} weapons`,
      })
    }
  }

  return recommendations
}

/**
 * Generate a complete recommendation for fighting a boss
 */
export function generateBossCounterRecommendation(
  bossData: { name: string; weaknesses: string[] },
  weapons: NormalizedWeapon[],
  locations: NormalizedLocation[],
): BossCounterRecommendation {
  // Step 1: Resolve boss weaknesses to damage types
  const weaknessTypes = resolveWeaknessTypes(bossData.weaknesses)

  // Step 2: Find effective weapons
  const recommendedWeapons = findEffectiveWeapons(weapons, weaknessTypes)

  // Step 3: Find locations with matching elemental affinity
  const recommendedLocations = findLocationsForElement(locations, weaknessTypes)

  // Step 4: Generate strategy text
  const strategy = generateStrategyText(
    bossData.name,
    weaknessTypes,
    recommendedWeapons,
    recommendedLocations,
  )

  return {
    boss: bossData.name,
    weaknesses: weaknessTypes,
    recommendedWeapons,
    recommendedLocations,
    strategy,
  }
}

/**
 * Generate human-readable strategy text
 */
function generateStrategyText(
  bossName: string,
  weaknesses: (DamageType | StatusEffect)[],
  weapons: WeaponMatch[],
  locations: LocationRecommendation[],
): string {
  const parts: string[] = []

  // Boss weaknesses
  if (weaknesses.length > 0) {
    parts.push(`${bossName} is weak to: ${weaknesses.join(', ')}.`)
  }

  // Top weapon recommendations
  if (weapons.length > 0) {
    const topWeapons = weapons.slice(0, 3).map((w) => w.weapon.name)
    parts.push(`Recommended weapons: ${topWeapons.join(', ')}.`)
  }

  // Location recommendations
  if (locations.length > 0) {
    const locationTips = locations
      .slice(0, 2)
      .map((l) => `${l.location.name} (${l.elementalAffinity} affinity)`)
    parts.push(`To find these weapons, visit: ${locationTips.join(', ')}.`)
  }

  return parts.join(' ')
}

/**
 * Utility to map location name to elemental affinity
 * Based on known Nightreign region data
 */
export const KNOWN_LOCATION_AFFINITIES: Record<string, ElementalAffinity> = {
  Mountaintop: ElementalAffinity.COLD,
  'The Mountaintop': ElementalAffinity.COLD,
  Crater: ElementalAffinity.FIRE,
  'The Crater': ElementalAffinity.FIRE,
  'Rotted Woods': ElementalAffinity.ROT,
  'Great Hollow': ElementalAffinity.NONE,
  Noklateo: ElementalAffinity.MAGIC,
  'Noklateo, The Shrouded City': ElementalAffinity.MAGIC,
}

/**
 * Infer elemental affinity from location description/name
 */
export function inferElementalAffinity(
  locationName: string,
  description?: string,
): ElementalAffinity {
  // Check known mappings first
  for (const [name, affinity] of Object.entries(KNOWN_LOCATION_AFFINITIES)) {
    if (locationName.toLowerCase().includes(name.toLowerCase())) {
      return affinity
    }
  }

  // Infer from keywords
  const text = `${locationName} ${description || ''}`.toLowerCase()

  if (
    text.includes('frost') ||
    text.includes('cold') ||
    text.includes('ice') ||
    text.includes('snow')
  ) {
    return ElementalAffinity.COLD
  }
  if (
    text.includes('fire') ||
    text.includes('flame') ||
    text.includes('lava') ||
    text.includes('magma')
  ) {
    return ElementalAffinity.FIRE
  }
  if (
    text.includes('lightning') ||
    text.includes('thunder') ||
    text.includes('storm')
  ) {
    return ElementalAffinity.LIGHTNING
  }
  if (
    text.includes('holy') ||
    text.includes('sacred') ||
    text.includes('divine')
  ) {
    return ElementalAffinity.HOLY
  }
  if (
    text.includes('rot') ||
    text.includes('decay') ||
    text.includes('scarlet')
  ) {
    return ElementalAffinity.ROT
  }
  if (
    text.includes('magic') ||
    text.includes('glintstone') ||
    text.includes('sorcery')
  ) {
    return ElementalAffinity.MAGIC
  }

  return ElementalAffinity.NONE
}
