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
  NormalizedArmor,
  NormalizedBoss,
  NormalizedEnemy,
  NormalizedExpedition,
  NormalizedItem,
  NormalizedLocation,
  NormalizedMerchant,
  NormalizedNPC,
  NormalizedNightfarer,
  NormalizedRelic,
  NormalizedShield,
  NormalizedSkill,
  NormalizedSpell,
  NormalizedTalisman,
  NormalizedWeapon,
} from './schemas'
import type {
  ParsedArmor,
  ParsedBoss,
  ParsedContent,
  ParsedEnemy,
  ParsedExpedition,
  ParsedItem,
  ParsedLocation,
  ParsedMerchant,
  ParsedNPC,
  ParsedNightfarer,
  ParsedRelic,
  ParsedShield,
  ParsedSkill,
  ParsedSpell,
  ParsedTalisman,
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

/**
 * Generate deterministic tags for a relic
 */
export function generateRelicTags(parsed: ParsedRelic): string[] {
  const tags: string[] = []

  // Color tag
  if (parsed.color) {
    tags.push(toTag(parsed.color))
  }

  // Tier tag
  if (parsed.tier) {
    tags.push(toTag(parsed.tier))
  }

  // Effect-based tags from keywords
  const effectText = parsed.effects.join(' ').toLowerCase()
  if (effectText.includes('damage') || effectText.includes('attack'))
    tags.push('damage-boost')
  if (effectText.includes('health') || effectText.includes('hp'))
    tags.push('health')
  if (effectText.includes('defense') || effectText.includes('negation'))
    tags.push('defensive')
  if (effectText.includes('stamina')) tags.push('stamina')
  if (effectText.includes('fp') || effectText.includes('mana')) tags.push('fp')
  if (
    effectText.includes('spell') ||
    effectText.includes('sorcery') ||
    effectText.includes('incantation')
  )
    tags.push('spell-boost')
  if (effectText.includes('bleed') || effectText.includes('blood'))
    tags.push('bleed')
  if (effectText.includes('frost') || effectText.includes('cold'))
    tags.push('frost')
  if (effectText.includes('fire') || effectText.includes('flame'))
    tags.push('fire')
  if (effectText.includes('lightning')) tags.push('lightning')
  if (effectText.includes('holy') || effectText.includes('sacred'))
    tags.push('holy')
  if (effectText.includes('poison')) tags.push('poison')
  if (effectText.includes('rot') || effectText.includes('scarlet'))
    tags.push('rot')

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for a nightfarer
 */
export function generateNightfarerTags(parsed: ParsedNightfarer): string[] {
  const tags: string[] = []

  // Stat-based tags
  const stats = parsed.stats
  if (stats.strength && stats.strength >= 14) tags.push('str-build')
  if (stats.dexterity && stats.dexterity >= 14) tags.push('dex-build')
  if (stats.intelligence && stats.intelligence >= 14) tags.push('int-build')
  if (stats.faith && stats.faith >= 14) tags.push('fai-build')
  if (stats.arcane && stats.arcane >= 14) tags.push('arc-build')
  if (stats.vigor && stats.vigor >= 14) tags.push('tanky')
  if (stats.mind && stats.mind >= 14) tags.push('caster')

  // Ability-based tags from keywords
  const abilityText = [
    parsed.passive?.description || '',
    parsed.skill?.description || '',
    parsed.ultimate?.description || '',
  ]
    .join(' ')
    .toLowerCase()

  if (abilityText.includes('melee') || abilityText.includes('weapon'))
    tags.push('melee')
  if (
    abilityText.includes('spell') ||
    abilityText.includes('sorcery') ||
    abilityText.includes('incantation')
  )
    tags.push('spellcaster')
  if (abilityText.includes('heal') || abilityText.includes('support'))
    tags.push('support')
  if (abilityText.includes('tank') || abilityText.includes('defense'))
    tags.push('tank')
  if (abilityText.includes('stealth') || abilityText.includes('sneak'))
    tags.push('stealth')
  if (abilityText.includes('summon')) tags.push('summoner')

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for a skill
 */
export function generateSkillTags(parsed: ParsedSkill): string[] {
  const tags: string[] = []

  // Weapon type tags
  for (const weaponType of parsed.weaponTypes) {
    tags.push(toTag(weaponType))
  }

  // Effect-based tags
  const effectLower = parsed.effect.toLowerCase()
  if (effectLower.includes('aoe') || effectLower.includes('area'))
    tags.push('aoe')
  if (effectLower.includes('buff') || effectLower.includes('boost'))
    tags.push('buff')
  if (effectLower.includes('damage')) tags.push('damage')
  if (effectLower.includes('heal')) tags.push('heal')
  if (effectLower.includes('stance') || effectLower.includes('poise'))
    tags.push('stance-break')
  if (effectLower.includes('bleed') || effectLower.includes('blood'))
    tags.push('bleed')
  if (effectLower.includes('frost')) tags.push('frost')

  // Cost-based tags
  if (parsed.fpCost <= 10) tags.push('low-cost')
  if (parsed.fpCost >= 30) tags.push('high-cost')

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for a talisman
 */
export function generateTalismanTags(parsed: ParsedTalisman): string[] {
  const tags: string[] = []

  // Effect-based tags
  const effectLower = parsed.effect.toLowerCase()
  if (effectLower.includes('damage') || effectLower.includes('attack'))
    tags.push('damage-boost')
  if (effectLower.includes('health') || effectLower.includes('hp'))
    tags.push('health')
  if (effectLower.includes('stamina')) tags.push('stamina')
  if (effectLower.includes('fp') || effectLower.includes('mana'))
    tags.push('fp-boost')
  if (effectLower.includes('equip load') || effectLower.includes('weight'))
    tags.push('equip-load')
  if (effectLower.includes('defense') || effectLower.includes('negation'))
    tags.push('defensive')
  if (effectLower.includes('rune')) tags.push('rune-boost')
  if (effectLower.includes('heal') || effectLower.includes('restore'))
    tags.push('healing')

  // Weight-based tags
  if (parsed.weight !== undefined) {
    if (parsed.weight <= 0.5) tags.push('light')
    if (parsed.weight >= 2.0) tags.push('heavy')
  }

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for a spell
 */
export function generateSpellTags(parsed: ParsedSpell): string[] {
  const tags: string[] = []

  // Spell type tag
  if (parsed.spellType) {
    tags.push(toTag(parsed.spellType))
  }

  // Slot-based tags
  if (parsed.slots === 1) tags.push('single-slot')
  if (parsed.slots >= 3) tags.push('multi-slot')

  // Effect-based tags
  const effectLower = parsed.effect.toLowerCase()
  if (effectLower.includes('projectile') || effectLower.includes('bolt'))
    tags.push('projectile')
  if (effectLower.includes('aoe') || effectLower.includes('area'))
    tags.push('aoe')
  if (effectLower.includes('buff') || effectLower.includes('boost'))
    tags.push('buff')
  if (effectLower.includes('heal')) tags.push('heal')
  if (effectLower.includes('fire') || effectLower.includes('flame'))
    tags.push('fire')
  if (effectLower.includes('lightning')) tags.push('lightning')
  if (effectLower.includes('frost') || effectLower.includes('cold'))
    tags.push('frost')
  if (effectLower.includes('holy') || effectLower.includes('sacred'))
    tags.push('holy')
  if (effectLower.includes('magic') || effectLower.includes('glintstone'))
    tags.push('magic')

  // Cost-based tags
  if (parsed.fpCost <= 15) tags.push('low-cost')
  if (parsed.fpCost >= 40) tags.push('high-cost')

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for armor
 */
export function generateArmorTags(parsed: ParsedArmor): string[] {
  const tags: string[] = []

  // Slot tag
  if (parsed.slot) {
    tags.push(toTag(parsed.slot))
  }

  // Weight-based tags
  if (parsed.weight !== undefined) {
    if (parsed.weight <= 3) tags.push('light-armor')
    else if (parsed.weight <= 8) tags.push('medium-armor')
    else tags.push('heavy-armor')
  }

  // Poise-based tags
  const poise = parsed.resistance?.poise
  if (poise !== undefined) {
    if (poise >= 15) tags.push('high-poise')
    if (poise <= 3) tags.push('low-poise')
  }

  // Resistance-based tags
  const res = parsed.resistance
  if (res?.immunity && res.immunity >= 30) tags.push('poison-resistant')
  if (res?.robustness && res.robustness >= 30) tags.push('bleed-resistant')
  if (res?.focus && res.focus >= 30) tags.push('focus-resistant')

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for a shield
 */
export function generateShieldTags(parsed: ParsedShield): string[] {
  const tags: string[] = []

  // Shield type tag
  if (parsed.shieldType) {
    tags.push(toTag(parsed.shieldType))
  }

  // Guard boost tags
  if (parsed.guardBoost !== undefined) {
    if (parsed.guardBoost >= 60) tags.push('high-guard')
    if (parsed.guardBoost <= 30) tags.push('low-guard')
  }

  // 100% physical block
  if (parsed.guard?.physical !== undefined && parsed.guard.physical >= 100) {
    tags.push('100-block')
  }

  // Skill-based tags
  if (parsed.skill) {
    const skillLower = parsed.skill.toLowerCase()
    if (skillLower.includes('parry')) tags.push('parry')
    if (skillLower.includes('bash')) tags.push('bash')
  }

  // Weight-based tags
  if (parsed.weight !== undefined) {
    if (parsed.weight <= 3) tags.push('light')
    if (parsed.weight >= 10) tags.push('heavy')
  }

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for an NPC
 */
export function generateNPCTags(parsed: ParsedNPC): string[] {
  const tags: string[] = []

  // Role tag
  if (parsed.role) {
    tags.push(toTag(parsed.role))
  }

  // Service-based tags
  for (const service of parsed.services) {
    const serviceLower = service.toLowerCase()
    if (serviceLower.includes('sell') || serviceLower.includes('buy'))
      tags.push('vendor')
    if (serviceLower.includes('teach') || serviceLower.includes('spell'))
      tags.push('spell-vendor')
    if (serviceLower.includes('upgrade') || serviceLower.includes('smith'))
      tags.push('smithing')
    if (serviceLower.includes('summon')) tags.push('summon')
  }

  // Quest-based tags
  if (parsed.quests.length > 0) {
    tags.push('quest-giver')
  }

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for a merchant
 */
export function generateMerchantTags(parsed: ParsedMerchant): string[] {
  const tags: string[] = []

  tags.push('vendor')

  // Inventory-based tags
  const inventoryNames = parsed.inventory.map((i) => i.name.toLowerCase())
  const hasWeapons = inventoryNames.some(
    (n) =>
      n.includes('sword') ||
      n.includes('axe') ||
      n.includes('staff') ||
      n.includes('bow'),
  )
  const hasArmor = inventoryNames.some(
    (n) =>
      n.includes('armor') ||
      n.includes('helm') ||
      n.includes('gauntlet') ||
      n.includes('greaves'),
  )
  const hasSpells = inventoryNames.some(
    (n) => n.includes('sorcery') || n.includes('incantation'),
  )
  const hasMaterials = inventoryNames.some(
    (n) => n.includes('stone') || n.includes('material'),
  )

  if (hasWeapons) tags.push('weapons')
  if (hasArmor) tags.push('armor')
  if (hasSpells) tags.push('spells')
  if (hasMaterials) tags.push('materials')

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for a location
 */
export function generateLocationTags(parsed: ParsedLocation): string[] {
  const tags: string[] = []

  // Region tag
  if (parsed.region) {
    tags.push(toTag(parsed.region))
  }

  // Elemental affinity tag
  if (parsed.elementalAffinity) {
    tags.push(toTag(parsed.elementalAffinity))
  }

  // Content-based tags
  if (parsed.bosses.length > 0) tags.push('has-boss')
  if (parsed.enemies.length > 0) tags.push('has-enemies')
  if (parsed.items.length > 0) tags.push('has-loot')

  // Description-based tags
  const descLower = parsed.description.toLowerCase()
  if (descLower.includes('dungeon') || descLower.includes('cave'))
    tags.push('dungeon')
  if (descLower.includes('legacy') || descLower.includes('castle'))
    tags.push('legacy')
  if (descLower.includes('overworld') || descLower.includes('field'))
    tags.push('overworld')

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for an expedition
 */
export function generateExpeditionTags(parsed: ParsedExpedition): string[] {
  const tags: string[] = []

  // Difficulty tag
  if (parsed.difficulty) {
    tags.push(toTag(parsed.difficulty))
  }

  // Level-based tags
  if (parsed.recommendedLevel !== undefined) {
    if (parsed.recommendedLevel <= 20) tags.push('early-game')
    else if (parsed.recommendedLevel <= 50) tags.push('mid-game')
    else tags.push('late-game')
  }

  // Objective-based tags
  const objText = parsed.objectives.join(' ').toLowerCase()
  if (objText.includes('boss') || objText.includes('defeat')) tags.push('boss')
  if (objText.includes('collect') || objText.includes('find'))
    tags.push('collection')
  if (objText.includes('explore')) tags.push('exploration')

  return [...new Set(tags)]
}

/**
 * Generate deterministic tags for an item
 */
export function generateItemTags(parsed: ParsedItem): string[] {
  const tags: string[] = []

  // Category tag
  if (parsed.category) {
    tags.push(toTag(parsed.category))
  }

  // Effect-based tags
  const effectLower = parsed.effect.toLowerCase()
  if (effectLower.includes('unlock') || effectLower.includes('open'))
    tags.push('unlock')
  if (effectLower.includes('summon')) tags.push('summon')
  if (effectLower.includes('restore') || effectLower.includes('heal'))
    tags.push('healing')
  if (effectLower.includes('buff') || effectLower.includes('boost'))
    tags.push('buff')
  if (effectLower.includes('upgrade')) tags.push('upgrade')
  if (effectLower.includes('craft')) tags.push('crafting')
  if (effectLower.includes('imp') || effectLower.includes('statue'))
    tags.push('imp-statue')

  // Purchase availability tag
  if (parsed.purchaseLocations && parsed.purchaseLocations.length > 0) {
    tags.push('purchasable')
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

/**
 * Normalize a relic directly without Claude
 */
export function normalizeRelicDirect(
  parsed: ParsedRelic,
): DirectNormalizationResult<NormalizedRelic> {
  try {
    const normalized: NormalizedRelic = {
      name: parsed.name,
      color: parsed.color || 'Unknown',
      tier: parsed.tier || 'Unknown',
      effects: parsed.effects || [],
      tags: generateRelicTags(parsed),
    }

    // Add class effects if present
    if (parsed.classEffects && parsed.classEffects.length > 0) {
      normalized.classEffects = parsed.classEffects.map((ce) => ({
        nightfarerClass: ce.nightfarerClass,
        effect: ce.effect,
        notes: ce.notes,
      }))
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'relic',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is a ${normalized.color} ${normalized.tier} relic.`,
      tags: [],
    })

    if (normalized.effects.length > 0) {
      chunks.push({
        type: 'relic',
        name: normalized.name,
        section: 'effects',
        content: `Effects: ${normalized.effects.join('; ')}`,
        tags: [],
      })
    }

    log.debug('Normalized relic directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize relic directly', error, { name: parsed.name })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize a nightfarer directly without Claude
 */
export function normalizeNightfarerDirect(
  parsed: ParsedNightfarer,
): DirectNormalizationResult<NormalizedNightfarer> {
  try {
    const normalized: NormalizedNightfarer = {
      name: parsed.name,
      stats: {
        vigor: parsed.stats.vigor,
        mind: parsed.stats.mind,
        endurance: parsed.stats.endurance,
        strength: parsed.stats.strength,
        dexterity: parsed.stats.dexterity,
        intelligence: parsed.stats.intelligence,
        faith: parsed.stats.faith,
        arcane: parsed.stats.arcane,
      },
      tags: generateNightfarerTags(parsed),
    }

    // Add optional ability fields
    if (parsed.passive?.name && parsed.passive?.description) {
      normalized.passive = `${parsed.passive.name}: ${parsed.passive.description}`
    }
    if (parsed.skill?.name && parsed.skill?.description) {
      normalized.skill = `${parsed.skill.name}: ${parsed.skill.description}`
    }
    if (parsed.ultimate?.name && parsed.ultimate?.description) {
      normalized.ultimate = `${parsed.ultimate.name}: ${parsed.ultimate.description}`
    }
    if (parsed.vessel?.name && parsed.vessel?.description) {
      normalized.vessel = `${parsed.vessel.name}: ${parsed.vessel.description}`
    }

    // Add progression if present
    if (parsed.progression) {
      normalized.progression = {
        characterName: parsed.progression.characterName,
        statProgression: parsed.progression.statProgression,
        attributeProgression: parsed.progression.attributeProgression,
      }
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    const statsText = Object.entries(normalized.stats)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
      .join(', ')

    chunks.push({
      type: 'nightfarer',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} starting stats: ${statsText}`,
      tags: [],
    })

    if (normalized.passive) {
      chunks.push({
        type: 'nightfarer',
        name: normalized.name,
        section: 'passive',
        content: `Passive: ${normalized.passive}`,
        tags: [],
      })
    }

    if (normalized.skill) {
      chunks.push({
        type: 'nightfarer',
        name: normalized.name,
        section: 'skill',
        content: `Skill: ${normalized.skill}`,
        tags: [],
      })
    }

    if (normalized.ultimate) {
      chunks.push({
        type: 'nightfarer',
        name: normalized.name,
        section: 'ultimate',
        content: `Ultimate: ${normalized.ultimate}`,
        tags: [],
      })
    }

    if (normalized.vessel) {
      chunks.push({
        type: 'nightfarer',
        name: normalized.name,
        section: 'vessel',
        content: `Vessel: ${normalized.vessel}`,
        tags: [],
      })
    }

    log.debug('Normalized nightfarer directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize nightfarer directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize a skill directly without Claude
 */
export function normalizeSkillDirect(
  parsed: ParsedSkill,
): DirectNormalizationResult<NormalizedSkill> {
  try {
    const normalized: NormalizedSkill = {
      name: parsed.name,
      fpCost: parsed.fpCost,
      weaponTypes: parsed.weaponTypes || [],
      effect: parsed.effect || '',
      tags: generateSkillTags(parsed),
    }

    if (parsed.staminaCost !== undefined) {
      normalized.staminaCost = parsed.staminaCost
    }
    if (parsed.location) {
      normalized.location = parsed.location
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'skill',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} (${normalized.fpCost} FP). Compatible with: ${normalized.weaponTypes.join(', ') || 'All weapons'}.`,
      tags: [],
    })

    if (normalized.effect) {
      chunks.push({
        type: 'skill',
        name: normalized.name,
        section: 'effect',
        content: normalized.effect,
        tags: [],
      })
    }

    log.debug('Normalized skill directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize skill directly', error, { name: parsed.name })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize a talisman directly without Claude
 */
export function normalizeTalismanDirect(
  parsed: ParsedTalisman,
): DirectNormalizationResult<NormalizedTalisman> {
  try {
    const normalized: NormalizedTalisman = {
      name: parsed.name,
      effect: parsed.effect || '',
      location: parsed.location || '',
      tags: generateTalismanTags(parsed),
    }

    if (parsed.weight !== undefined) {
      normalized.weight = parsed.weight
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'talisman',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name}${normalized.weight ? ` (Weight: ${normalized.weight})` : ''}. Location: ${normalized.location}`,
      tags: [],
    })

    if (normalized.effect) {
      chunks.push({
        type: 'talisman',
        name: normalized.name,
        section: 'effect',
        content: normalized.effect,
        tags: [],
      })
    }

    log.debug('Normalized talisman directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize talisman directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize a spell directly without Claude
 */
export function normalizeSpellDirect(
  parsed: ParsedSpell,
): DirectNormalizationResult<NormalizedSpell> {
  try {
    // Format requirements string
    const reqParts: string[] = []
    if (parsed.requirements.intelligence)
      reqParts.push(`Int ${parsed.requirements.intelligence}`)
    if (parsed.requirements.faith)
      reqParts.push(`Fai ${parsed.requirements.faith}`)
    if (parsed.requirements.arcane)
      reqParts.push(`Arc ${parsed.requirements.arcane}`)

    const normalized: NormalizedSpell = {
      name: parsed.name,
      spellType: parsed.spellType || 'Unknown',
      fpCost: parsed.fpCost,
      slots: parsed.slots,
      effect: parsed.effect || '',
      requirements: reqParts.join(', ') || 'None',
      location: parsed.location || '',
      tags: generateSpellTags(parsed),
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'spell',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is a ${normalized.spellType} that costs ${normalized.fpCost} FP and requires ${normalized.slots} slot(s).`,
      tags: [],
    })

    if (normalized.effect) {
      chunks.push({
        type: 'spell',
        name: normalized.name,
        section: 'effect',
        content: normalized.effect,
        tags: [],
      })
    }

    chunks.push({
      type: 'spell',
      name: normalized.name,
      section: 'requirements',
      content: `Requirements: ${normalized.requirements}. Location: ${normalized.location}`,
      tags: [],
    })

    log.debug('Normalized spell directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize spell directly', error, { name: parsed.name })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize armor directly without Claude
 */
export function normalizeArmorDirect(
  parsed: ParsedArmor,
): DirectNormalizationResult<NormalizedArmor> {
  try {
    // Format damage negation string
    const negParts: string[] = []
    const neg = parsed.damageNegation
    if (neg.physical !== undefined) negParts.push(`Physical: ${neg.physical}`)
    if (neg.strike !== undefined) negParts.push(`Strike: ${neg.strike}`)
    if (neg.slash !== undefined) negParts.push(`Slash: ${neg.slash}`)
    if (neg.pierce !== undefined) negParts.push(`Pierce: ${neg.pierce}`)
    if (neg.magic !== undefined) negParts.push(`Magic: ${neg.magic}`)
    if (neg.fire !== undefined) negParts.push(`Fire: ${neg.fire}`)
    if (neg.lightning !== undefined) negParts.push(`Lightning: ${neg.lightning}`)
    if (neg.holy !== undefined) negParts.push(`Holy: ${neg.holy}`)

    // Format resistance string
    const resParts: string[] = []
    const res = parsed.resistance
    if (res.immunity !== undefined) resParts.push(`Immunity: ${res.immunity}`)
    if (res.robustness !== undefined)
      resParts.push(`Robustness: ${res.robustness}`)
    if (res.focus !== undefined) resParts.push(`Focus: ${res.focus}`)
    if (res.vitality !== undefined) resParts.push(`Vitality: ${res.vitality}`)
    if (res.poise !== undefined) resParts.push(`Poise: ${res.poise}`)

    const normalized: NormalizedArmor = {
      name: parsed.name,
      slot: parsed.slot || 'Unknown',
      damageNegation: parsed.damageNegation,
      resistance: parsed.resistance,
      location: parsed.location || '',
      tags: generateArmorTags(parsed),
    }

    if (parsed.weight !== undefined) {
      normalized.weight = parsed.weight
    }
    if (parsed.resistance.poise !== undefined) {
      normalized.poise = parsed.resistance.poise
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'armor',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is ${normalized.slot} armor${normalized.weight ? ` weighing ${normalized.weight}` : ''}${normalized.poise ? ` with ${normalized.poise} poise` : ''}.`,
      tags: [],
    })

    if (negParts.length > 0 || resParts.length > 0) {
      chunks.push({
        type: 'armor',
        name: normalized.name,
        section: 'defense',
        content: `Damage Negation: ${negParts.join(', ') || 'None'}. Resistances: ${resParts.join(', ') || 'None'}`,
        tags: [],
      })
    }

    if (normalized.location) {
      chunks.push({
        type: 'armor',
        name: normalized.name,
        section: 'location',
        content: `Location: ${normalized.location}`,
        tags: [],
      })
    }

    log.debug('Normalized armor directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize armor directly', error, { name: parsed.name })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize a shield directly without Claude
 */
export function normalizeShieldDirect(
  parsed: ParsedShield,
): DirectNormalizationResult<NormalizedShield> {
  try {
    // Format requirements string
    const reqParts: string[] = []
    if (parsed.requirements.strength)
      reqParts.push(`Str ${parsed.requirements.strength}`)
    if (parsed.requirements.dexterity)
      reqParts.push(`Dex ${parsed.requirements.dexterity}`)

    const normalized: NormalizedShield = {
      name: parsed.name,
      shieldType: parsed.shieldType || 'Medium',
      skill: parsed.skill || '',
      requirements: reqParts.join(', ') || 'None',
      location: parsed.location || '',
      tags: generateShieldTags(parsed),
    }

    if (parsed.weight !== undefined) {
      normalized.weight = parsed.weight
    }
    if (parsed.guardBoost !== undefined) {
      normalized.guardBoost = parsed.guardBoost
    }
    if (parsed.guard) {
      normalized.guard = parsed.guard
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'shield',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is a ${normalized.shieldType}${normalized.weight ? ` weighing ${normalized.weight}` : ''}${normalized.guardBoost ? ` with ${normalized.guardBoost} guard boost` : ''}.`,
      tags: [],
    })

    chunks.push({
      type: 'shield',
      name: normalized.name,
      section: 'skill',
      content: `Skill: ${normalized.skill}. Requirements: ${normalized.requirements}`,
      tags: [],
    })

    if (normalized.location) {
      chunks.push({
        type: 'shield',
        name: normalized.name,
        section: 'location',
        content: `Location: ${normalized.location}`,
        tags: [],
      })
    }

    log.debug('Normalized shield directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize shield directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize an NPC directly without Claude
 */
export function normalizeNPCDirect(
  parsed: ParsedNPC,
): DirectNormalizationResult<NormalizedNPC> {
  try {
    const normalized: NormalizedNPC = {
      name: parsed.name,
      role: parsed.role || 'NPC',
      location: parsed.location || '',
      quests: parsed.quests || [],
      services: parsed.services || [],
      tags: generateNPCTags(parsed),
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'npc',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is a ${normalized.role} located at ${normalized.location}.`,
      tags: [],
    })

    if (normalized.quests.length > 0) {
      chunks.push({
        type: 'npc',
        name: normalized.name,
        section: 'quests',
        content: `Quests: ${normalized.quests.join(', ')}`,
        tags: [],
      })
    }

    if (normalized.services.length > 0) {
      chunks.push({
        type: 'npc',
        name: normalized.name,
        section: 'services',
        content: `Services: ${normalized.services.join(', ')}`,
        tags: [],
      })
    }

    log.debug('Normalized NPC directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize NPC directly', error, { name: parsed.name })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize a merchant directly without Claude
 */
export function normalizeMerchantDirect(
  parsed: ParsedMerchant,
): DirectNormalizationResult<NormalizedMerchant> {
  try {
    const normalized: NormalizedMerchant = {
      name: parsed.name,
      location: parsed.location || '',
      inventory: parsed.inventory.map((item) => ({
        name: item.name,
        price: item.price,
        currency: item.currency || 'Runes',
      })),
      notableItems: parsed.inventory
        .filter((i) => i.price >= 1000)
        .map((i) => i.name),
      tags: generateMerchantTags(parsed),
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'merchant',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is located at ${normalized.location}.`,
      tags: [],
    })

    const inventoryStr = normalized.inventory
      .map((item) => `${item.name} (${item.price} ${item.currency})`)
      .join(', ')

    chunks.push({
      type: 'merchant',
      name: normalized.name,
      section: 'inventory',
      content: inventoryStr || 'No items listed',
      tags: [],
    })

    if (normalized.notableItems.length > 0) {
      chunks.push({
        type: 'merchant',
        name: normalized.name,
        section: 'notable',
        content: `Notable Items: ${normalized.notableItems.join(', ')}`,
        tags: [],
      })
    }

    log.debug('Normalized merchant directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize merchant directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize a location directly without Claude
 */
export function normalizeLocationDirect(
  parsed: ParsedLocation,
): DirectNormalizationResult<NormalizedLocation> {
  try {
    const normalized: NormalizedLocation = {
      name: parsed.name,
      region: parsed.region || '',
      description: parsed.description || '',
      notableItems: parsed.items || [],
      enemies: parsed.enemies || [],
      bosses: parsed.bosses || [],
      connections: parsed.connections || [],
      tags: generateLocationTags(parsed),
    }

    // Add optional fields
    if (parsed.elementalAffinity) {
      normalized.elementalAffinity = parsed.elementalAffinity
    }
    if (parsed.crystalTypes && parsed.crystalTypes.length > 0) {
      normalized.crystalTypes = parsed.crystalTypes
    }
    if (parsed.favor) {
      normalized.favor = parsed.favor
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'location',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is located in ${normalized.region}. ${normalized.description}`,
      tags: [],
    })

    if (normalized.enemies.length > 0) {
      chunks.push({
        type: 'location',
        name: normalized.name,
        section: 'enemies',
        content: `Enemies: ${normalized.enemies.join(', ')}`,
        tags: [],
      })
    }

    if (normalized.bosses.length > 0) {
      chunks.push({
        type: 'location',
        name: normalized.name,
        section: 'bosses',
        content: `Bosses: ${normalized.bosses.join(', ')}`,
        tags: [],
      })
    }

    if (normalized.notableItems.length > 0) {
      chunks.push({
        type: 'location',
        name: normalized.name,
        section: 'items',
        content: `Notable Items: ${normalized.notableItems.join(', ')}`,
        tags: [],
      })
    }

    if (normalized.connections.length > 0) {
      chunks.push({
        type: 'location',
        name: normalized.name,
        section: 'connections',
        content: `Connections: ${normalized.connections.join(', ')}`,
        tags: [],
      })
    }

    log.debug('Normalized location directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize location directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize an expedition directly without Claude
 */
export function normalizeExpeditionDirect(
  parsed: ParsedExpedition,
): DirectNormalizationResult<NormalizedExpedition> {
  try {
    const normalized: NormalizedExpedition = {
      name: parsed.name,
      difficulty: parsed.difficulty || 'Unknown',
      objectives: parsed.objectives || [],
      rewards: parsed.rewards || [],
      locations: parsed.locations || [],
      strategies: parsed.description || '',
      tags: generateExpeditionTags(parsed),
    }

    if (parsed.recommendedLevel !== undefined) {
      normalized.recommendedLevel = parsed.recommendedLevel
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'expedition',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is a ${normalized.difficulty} expedition${normalized.recommendedLevel ? ` (recommended level ${normalized.recommendedLevel})` : ''}.`,
      tags: [],
    })

    if (normalized.objectives.length > 0) {
      chunks.push({
        type: 'expedition',
        name: normalized.name,
        section: 'objectives',
        content: `Objectives: ${normalized.objectives.join(', ')}`,
        tags: [],
      })
    }

    if (normalized.rewards.length > 0) {
      chunks.push({
        type: 'expedition',
        name: normalized.name,
        section: 'rewards',
        content: `Rewards: ${normalized.rewards.join(', ')}`,
        tags: [],
      })
    }

    if (normalized.locations.length > 0) {
      chunks.push({
        type: 'expedition',
        name: normalized.name,
        section: 'locations',
        content: `Locations: ${normalized.locations.join(', ')}`,
        tags: [],
      })
    }

    if (normalized.strategies) {
      chunks.push({
        type: 'expedition',
        name: normalized.name,
        section: 'strategies',
        content: normalized.strategies,
        tags: [],
      })
    }

    log.debug('Normalized expedition directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize expedition directly', error, {
      name: parsed.name,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Normalize an item directly without Claude
 */
export function normalizeItemDirect(
  parsed: ParsedItem,
): DirectNormalizationResult<NormalizedItem> {
  try {
    const normalized: NormalizedItem = {
      name: parsed.name,
      category: parsed.category || 'Item',
      effect: parsed.effect || '',
      description: parsed.description || '',
      locations: parsed.locations || [],
      tags: generateItemTags(parsed),
    }

    if (parsed.uses !== undefined) {
      normalized.uses = parsed.uses
    }
    if (parsed.purchaseLocations && parsed.purchaseLocations.length > 0) {
      normalized.purchaseLocations = parsed.purchaseLocations.map((p) => ({
        merchantName: p.merchantName,
        location: p.location,
        price: p.price,
        stock: p.stock,
      }))
    }

    // Generate chunks
    const chunks: ContentChunk[] = []

    chunks.push({
      type: 'item',
      name: normalized.name,
      section: 'overview',
      content: `${normalized.name} is a ${normalized.category}.`,
      tags: [],
    })

    if (normalized.effect) {
      chunks.push({
        type: 'item',
        name: normalized.name,
        section: 'effect',
        content: `Effect: ${normalized.effect}`,
        tags: [],
      })
    }

    if (normalized.locations.length > 0) {
      chunks.push({
        type: 'item',
        name: normalized.name,
        section: 'locations',
        content: `Where to find: ${normalized.locations.join('; ')}`,
        tags: [],
      })
    }

    if (normalized.purchaseLocations && normalized.purchaseLocations.length > 0) {
      const purchaseText = normalized.purchaseLocations
        .map((p) => `${p.merchantName}: ${p.price} runes`)
        .join('; ')
      chunks.push({
        type: 'item',
        name: normalized.name,
        section: 'purchase',
        content: `Purchase: ${purchaseText}`,
        tags: [],
      })
    }

    log.debug('Normalized item directly', { name: parsed.name })
    return { success: true, data: normalized, chunks }
  } catch (error) {
    log.error('Failed to normalize item directly', error, { name: parsed.name })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

/** Content types that support direct normalization (all types now supported) */
const DIRECT_SUPPORTED_TYPES: ContentType[] = [
  'boss',
  'weapon',
  'enemy',
  'relic',
  'nightfarer',
  'skill',
  'talisman',
  'spell',
  'armor',
  'shield',
  'npc',
  'merchant',
  'location',
  'expedition',
  'item',
]

/**
 * Check if a content type supports direct normalization
 */
export function supportsDirectNormalization(type: ContentType): boolean {
  return DIRECT_SUPPORTED_TYPES.includes(type)
}

/**
 * Normalize content directly without Claude API
 *
 * All content types are now supported with deterministic normalization.
 * Claude API is no longer needed for normalization.
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
    case 'relic':
      return normalizeRelicDirect(parsed)
    case 'nightfarer':
      return normalizeNightfarerDirect(parsed)
    case 'skill':
      return normalizeSkillDirect(parsed)
    case 'talisman':
      return normalizeTalismanDirect(parsed)
    case 'spell':
      return normalizeSpellDirect(parsed)
    case 'armor':
      return normalizeArmorDirect(parsed)
    case 'shield':
      return normalizeShieldDirect(parsed)
    case 'npc':
      return normalizeNPCDirect(parsed)
    case 'merchant':
      return normalizeMerchantDirect(parsed)
    case 'location':
      return normalizeLocationDirect(parsed)
    case 'expedition':
      return normalizeExpeditionDirect(parsed)
    case 'item':
      return normalizeItemDirect(parsed)
    default:
      return {
        success: false,
        error: `Unknown content type: ${parsed.type}`,
        needsClaude: false,
      }
  }
}
