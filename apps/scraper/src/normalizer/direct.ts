/**
 * Direct Normalizer - Deterministic content normalization without Claude API
 *
 * Handles data transformation and tag generation locally.
 * Falls back to Claude only for complex cases requiring LLM intelligence.
 */

import type { ContentType } from '@nightreign/types'
import { createLogger } from '@utils/logger'
import type {
  ContentChunk,
  NormalizedBoss,
  NormalizedEnemy,
  NormalizedWeapon,
} from './schemas'
import type {
  ParsedBoss,
  ParsedContent,
  ParsedEnemy,
  ParsedWeapon,
} from './types'

const log = createLogger('direct-normalizer')

/**
 * Result of a normalization operation
 */
export type DirectNormalizationResult<T> =
  | { success: true; data: T; chunks: ContentChunk[] }
  | { success: false; error: string; needsClaude?: boolean }

// ============================================================================
// Tag Generation - Deterministic rules for generating search tags
// ============================================================================

/** Normalize a string to tag format (lowercase, hyphenated) */
function toTag(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Generate deterministic tags for a boss based on its parsed data
 */
export function generateBossTags(parsed: ParsedBoss): string[] {
  const tags: string[] = []

  // Category tags
  const categoryLower = parsed.category.toLowerCase()
  if (categoryLower.includes('night lord')) {
    tags.push('night-lord')
  } else if (categoryLower.includes('night boss')) {
    tags.push('night-boss')
  } else if (categoryLower.includes('field boss')) {
    tags.push('field-boss')
  } else if (categoryLower.includes('mini boss')) {
    tags.push('mini-boss')
  } else if (categoryLower.includes('boss')) {
    tags.push('boss')
  }

  // Weakness tags
  for (const weakness of parsed.weaknesses) {
    const tag = toTag(weakness)
    if (tag) {
      tags.push(`${tag}-weak`)
    }
  }

  // Resistance tags (from strongerVs)
  if (parsed.strongerVs) {
    for (const resistance of parsed.strongerVs) {
      const tag = toTag(resistance)
      if (tag) {
        tags.push(`${tag}-resistant`)
      }
    }
  }

  // Combat mechanic tags
  if (parsed.parryInfo?.canParry) {
    tags.push('parryable')
  } else if (parsed.parryInfo?.canParry === false) {
    tags.push('non-parryable')
  }

  // Stance tags
  if (parsed.stance !== undefined) {
    if (parsed.stance >= 150) {
      tags.push('high-stance')
    } else if (parsed.stance <= 80) {
      tags.push('low-stance')
    }
    tags.push('stance-breakable')
  }

  // Status effect infliction tags
  if (parsed.statusEffectsInflicted) {
    for (const effect of parsed.statusEffectsInflicted) {
      const tag = toTag(effect)
      if (tag) {
        tags.push(`${tag}-inflict`)
      }
    }
  }

  // Damage type dealt tags
  if (parsed.damageTypesDealt) {
    const elementalTypes = ['magic', 'fire', 'lightning', 'holy']
    const hasElemental = parsed.damageTypesDealt.some((d) =>
      elementalTypes.includes(d.toLowerCase()),
    )
    if (hasElemental) {
      tags.push('elemental')
    }
  }

  // Phase tags
  if (parsed.phases.length > 1) {
    tags.push('multi-phase')
  }

  // Status immunity tags
  if (parsed.statusResistances) {
    const immunities: string[] = []
    if (parsed.statusResistances.poison?.immune) immunities.push('poison')
    if (parsed.statusResistances.scarletRot?.immune) immunities.push('rot')
    if (parsed.statusResistances.bloodLoss?.immune) immunities.push('bleed')
    if (parsed.statusResistances.frostbite?.immune) immunities.push('frost')
    if (parsed.statusResistances.sleep?.immune) immunities.push('sleep')
    if (parsed.statusResistances.madness?.immune) immunities.push('madness')

    for (const immunity of immunities) {
      tags.push(`${immunity}-immune`)
    }
  }

  // Deduplicate and return
  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for a weapon
 */
export function generateWeaponTags(parsed: ParsedWeapon): string[] {
  const tags: string[] = []

  // Weapon type tag
  if (parsed.weaponType) {
    tags.push(toTag(parsed.weaponType))
  }

  // Scaling-based tags
  const scaling = parsed.scaling
  const highScaling = ['S', 'A', 'B']

  if (scaling.strength && highScaling.includes(scaling.strength)) {
    tags.push('str-weapon')
  }
  if (scaling.dexterity && highScaling.includes(scaling.dexterity)) {
    tags.push('dex-weapon')
  }
  if (scaling.intelligence && highScaling.includes(scaling.intelligence)) {
    tags.push('int-weapon')
  }
  if (scaling.faith && highScaling.includes(scaling.faith)) {
    tags.push('fai-weapon')
  }
  if (scaling.arcane && highScaling.includes(scaling.arcane)) {
    tags.push('arc-weapon')
  }

  // Damage type tags
  const stats = parsed.stats
  if (stats.magicDamage && stats.magicDamage > 0) tags.push('magic-damage')
  if (stats.fireDamage && stats.fireDamage > 0) tags.push('fire-damage')
  if (stats.lightningDamage && stats.lightningDamage > 0)
    tags.push('lightning-damage')
  if (stats.holyDamage && stats.holyDamage > 0) tags.push('holy-damage')

  // Status effect buildup tags (enables multi-hop queries)
  if (parsed.statusBuildup) {
    if (parsed.statusBuildup.bloodLoss && parsed.statusBuildup.bloodLoss > 0) {
      tags.push('bleed')
      tags.push('blood-loss')
    }
    if (parsed.statusBuildup.frostbite && parsed.statusBuildup.frostbite > 0) {
      tags.push('frost')
      tags.push('frostbite')
    }
    if (parsed.statusBuildup.poison && parsed.statusBuildup.poison > 0) {
      tags.push('poison')
    }
    if (
      parsed.statusBuildup.scarletRot &&
      parsed.statusBuildup.scarletRot > 0
    ) {
      tags.push('rot')
      tags.push('scarlet-rot')
    }
    if (parsed.statusBuildup.sleep && parsed.statusBuildup.sleep > 0) {
      tags.push('sleep')
    }
    if (parsed.statusBuildup.madness && parsed.statusBuildup.madness > 0) {
      tags.push('madness')
    }
  }

  // Unique effect tag
  if (parsed.uniqueEffect) {
    tags.push('unique-effect')
  }

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for an enemy
 */
export function generateEnemyTags(parsed: ParsedEnemy): string[] {
  const tags: string[] = []

  // Category tag
  if (parsed.category) {
    tags.push(toTag(parsed.category))
  }

  // Weakness tags
  for (const weakness of parsed.weaknesses) {
    const tag = toTag(weakness)
    if (tag) {
      tags.push(`${tag}-weak`)
    }
  }

  return [...new Set(tags)]
}

// ============================================================================
// Chunk Generation - Template-based content chunks for search indexing
// ============================================================================

/**
 * Generate content chunks for a boss
 */
function generateBossChunks(
  name: string,
  data: NormalizedBoss,
): ContentChunk[] {
  const chunks: ContentChunk[] = []

  // Overview chunk
  let overview = `${name} is a ${data.category}`
  if (data.location) {
    overview += ` located in ${data.location}`
  }
  overview += '.'
  if (data.weaknesses.length > 0) {
    overview += ` Weaknesses: ${data.weaknesses.join(', ')}.`
  }

  chunks.push({
    type: 'boss',
    name,
    section: 'overview',
    content: overview,
    tags: [],
  })

  // Strategy chunk (if present)
  if (data.strategies?.trim()) {
    chunks.push({
      type: 'boss',
      name,
      section: 'strategy',
      content: data.strategies,
      tags: [],
    })
  }

  // Rewards chunk (if present)
  if (data.rewards?.trim()) {
    chunks.push({
      type: 'boss',
      name,
      section: 'rewards',
      content: data.rewards,
      tags: [],
    })
  }

  // Combat stats chunk (if present)
  const combatParts: string[] = []
  if (data.hpByPlayerCount) {
    const hp = data.hpByPlayerCount
    const hpParts: string[] = []
    if (hp.solo) hpParts.push(`Solo: ${hp.solo.toLocaleString()}`)
    if (hp.duo) hpParts.push(`Duo: ${hp.duo.toLocaleString()}`)
    if (hp.trio) hpParts.push(`Trio: ${hp.trio.toLocaleString()}`)
    if (hpParts.length > 0) {
      combatParts.push(`HP: ${hpParts.join(', ')}`)
    }
  }
  if (data.stance) {
    combatParts.push(`Stance: ${data.stance}`)
  }
  if (data.parryInfo) {
    const parryText = data.parryInfo.canParry
      ? `Parryable (${data.parryInfo.parriesRequired || '?'} parries)`
      : 'Not parryable'
    combatParts.push(parryText)
  }

  if (combatParts.length > 0) {
    chunks.push({
      type: 'boss',
      name,
      section: 'combat',
      content: `${combatParts.join('. ')}.`,
      tags: [],
    })
  }

  return chunks
}

// ============================================================================
// Direct Normalization - Transform parsed data without Claude
// ============================================================================

/**
 * Normalize a boss directly without Claude
 */
export function normalizeBossDirect(
  parsed: ParsedBoss,
): DirectNormalizationResult<NormalizedBoss> {
  try {
    // Transform parsed data to normalized schema
    const normalized: NormalizedBoss = {
      name: parsed.name,
      category: parsed.category || 'Boss',
      location: parsed.location || '',
      weaknesses: parsed.weaknesses || [],
      phases: parsed.phases.map((p) => ({
        name: p.name,
        description: p.description,
        threshold: p.threshold || undefined,
      })),
      strategies: parsed.strategies.join('\n\n').trim(),
      rewards: parsed.rewards.map((r) => r.name).join(', '),
      tags: generateBossTags(parsed),
    }

    // Add optional combat data if present
    if (parsed.hpByPlayerCount) {
      normalized.hpByPlayerCount = {
        solo: parsed.hpByPlayerCount.solo,
        duo: parsed.hpByPlayerCount.duo,
        trio: parsed.hpByPlayerCount.trio,
      }
    }

    if (parsed.stance !== undefined) {
      normalized.stance = parsed.stance
    }

    if (parsed.parryInfo) {
      normalized.parryInfo = {
        canParry: parsed.parryInfo.canParry,
        parriesRequired: parsed.parryInfo.parriesRequired,
        notes: parsed.parryInfo.notes,
      }
    }

    if (parsed.damageNegation) {
      normalized.damageNegation = parsed.damageNegation
    }

    if (parsed.statusResistances) {
      normalized.statusResistances = parsed.statusResistances
    }

    if (parsed.strongerVs && parsed.strongerVs.length > 0) {
      normalized.strongerVs = parsed.strongerVs
    }

    if (parsed.damageTypesDealt && parsed.damageTypesDealt.length > 0) {
      normalized.damageTypesDealt = parsed.damageTypesDealt
    }

    if (
      parsed.statusEffectsInflicted &&
      parsed.statusEffectsInflicted.length > 0
    ) {
      normalized.statusEffectsInflicted = parsed.statusEffectsInflicted
    }

    // Generate chunks
    const chunks = generateBossChunks(parsed.name, normalized)

    log.debug('Normalized boss directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize boss directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize a weapon directly without Claude
 */
export function normalizeWeaponDirect(
  parsed: ParsedWeapon,
): DirectNormalizationResult<NormalizedWeapon> {
  try {
    const normalized: NormalizedWeapon = {
      name: parsed.name,
      type: parsed.weaponType || 'Weapon',
      stats: {
        physicalDamage: parsed.stats.physicalDamage,
        magicDamage: parsed.stats.magicDamage,
        fireDamage: parsed.stats.fireDamage,
        lightningDamage: parsed.stats.lightningDamage,
        holyDamage: parsed.stats.holyDamage,
        critical: parsed.stats.critical,
      },
      statusBuildup: parsed.statusBuildup,
      scaling: {
        strength: parsed.scaling.strength,
        dexterity: parsed.scaling.dexterity,
        intelligence: parsed.scaling.intelligence,
        faith: parsed.scaling.faith,
        arcane: parsed.scaling.arcane,
      },
      skill: parsed.skill || '',
      description: parsed.description || '',
      passiveBenefits: parsed.passiveBenefits,
      uniqueEffect: parsed.uniqueEffect,
      tags: generateWeaponTags(parsed),
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    let overview = `${normalized.name} is a ${normalized.type}.`
    if (normalized.description) {
      overview += ` ${normalized.description}`
    }
    chunks.push({
      type: 'weapon',
      name: normalized.name,
      section: 'overview',
      content: overview,
      tags: [],
    })

    // Stats chunk
    const statParts: string[] = []
    if (normalized.stats.physicalDamage)
      statParts.push(`Physical: ${normalized.stats.physicalDamage}`)
    if (normalized.stats.magicDamage)
      statParts.push(`Magic: ${normalized.stats.magicDamage}`)
    if (normalized.stats.fireDamage)
      statParts.push(`Fire: ${normalized.stats.fireDamage}`)
    if (normalized.stats.lightningDamage)
      statParts.push(`Lightning: ${normalized.stats.lightningDamage}`)
    if (normalized.stats.holyDamage)
      statParts.push(`Holy: ${normalized.stats.holyDamage}`)

    if (statParts.length > 0) {
      chunks.push({
        type: 'weapon',
        name: normalized.name,
        section: 'stats',
        content: statParts.join(', '),
        tags: [],
      })
    }

    // Status buildup chunk (for multi-hop queries)
    if (normalized.statusBuildup) {
      const buildupParts: string[] = []
      if (normalized.statusBuildup.bloodLoss)
        buildupParts.push(`Blood Loss: ${normalized.statusBuildup.bloodLoss}`)
      if (normalized.statusBuildup.frostbite)
        buildupParts.push(`Frostbite: ${normalized.statusBuildup.frostbite}`)
      if (normalized.statusBuildup.poison)
        buildupParts.push(`Poison: ${normalized.statusBuildup.poison}`)
      if (normalized.statusBuildup.scarletRot)
        buildupParts.push(`Scarlet Rot: ${normalized.statusBuildup.scarletRot}`)
      if (normalized.statusBuildup.sleep)
        buildupParts.push(`Sleep: ${normalized.statusBuildup.sleep}`)
      if (normalized.statusBuildup.madness)
        buildupParts.push(`Madness: ${normalized.statusBuildup.madness}`)

      if (buildupParts.length > 0) {
        chunks.push({
          type: 'weapon',
          name: normalized.name,
          section: 'status',
          content: `Status Buildup: ${buildupParts.join(', ')}`,
          tags: [],
        })
      }
    }

    if (normalized.skill) {
      chunks.push({
        type: 'weapon',
        name: normalized.name,
        section: 'skill',
        content: `Weapon Skill: ${normalized.skill}`,
        tags: [],
      })
    }

    // Unique effect chunk
    if (normalized.uniqueEffect) {
      chunks.push({
        type: 'weapon',
        name: normalized.name,
        section: 'unique',
        content: `Unique Effect: ${normalized.uniqueEffect}`,
        tags: [],
      })
    }

    log.debug('Normalized weapon directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize weapon directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize an enemy directly without Claude
 */
export function normalizeEnemyDirect(
  parsed: ParsedEnemy,
): DirectNormalizationResult<NormalizedEnemy> {
  try {
    const normalized: NormalizedEnemy = {
      name: parsed.name,
      category: parsed.category || 'Enemy',
      locations: parsed.locations || [],
      weaknesses: parsed.weaknesses || [],
      drops: parsed.drops || [],
      strategies: parsed.description || '',
      tags: generateEnemyTags(parsed),
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    let overview = `${normalized.name} is a ${normalized.category} enemy`
    if (normalized.locations.length > 0) {
      overview += ` found in ${normalized.locations.join(', ')}`
    }
    overview += '.'

    chunks.push({
      type: 'enemy',
      name: normalized.name,
      section: 'overview',
      content: overview,
      tags: [],
    })

    if (normalized.weaknesses.length > 0) {
      chunks.push({
        type: 'enemy',
        name: normalized.name,
        section: 'weaknesses',
        content: `Weaknesses: ${normalized.weaknesses.join(', ')}`,
        tags: [],
      })
    }

    if (normalized.drops.length > 0) {
      chunks.push({
        type: 'enemy',
        name: normalized.name,
        section: 'drops',
        content: `Drops: ${normalized.drops.join(', ')}`,
        tags: [],
      })
    }

    log.debug('Normalized enemy directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize enemy directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

/** Content types that support direct normalization */
const DIRECT_SUPPORTED_TYPES: ContentType[] = ['boss', 'weapon', 'enemy']

/**
 * Check if a content type supports direct normalization
 */
export function supportsDirectNormalization(type: ContentType): boolean {
  return DIRECT_SUPPORTED_TYPES.includes(type)
}

/**
 * Normalize content directly without Claude API
 *
 * Returns success with normalized data, or failure with needsClaude=true
 * if the content type requires Claude.
 */
export function normalizeDirect(
  parsed: ParsedContent,
): DirectNormalizationResult<unknown> {
  switch (parsed.type) {
    case 'boss':
      return normalizeBossDirect(parsed)
    case 'weapon':
      return normalizeWeaponDirect(parsed)
    case 'enemy':
      return normalizeEnemyDirect(parsed)
    default:
      return {
        success: false,
        error: `Content type "${parsed.type}" requires Claude normalization`,
        needsClaude: true,
      }
  }
}
