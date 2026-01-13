/**
 * Cheerio HTML Parsers for Fextralife Wiki Pages
 *
 * Extracts structured data from raw HTML for each content type.
 * All parsers handle missing/malformed data gracefully with
 * sensible defaults and warning collection.
 */

import type { ContentType } from '@nightreign/types'
import { inferElementalAffinity } from './entity-resolver'
import type {
  AttributeRequirements,
  BossPhase,
  BossReward,
  DamageNegation,
  ItemPurchaseInfo,
  MerchantItem,
  NightfarerAbility,
  NightfarerStats,
  ParseResult,
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
  Resistance,
  VesselInfo,
  WeaponScaling,
  WeaponStats,
  WeaponStatusBuildup,
} from './types'
import {
  cleanText,
  extractBossDamageNegation,
  extractBossDamageTypesDealt,
  extractBossHpByPlayerCount,
  extractBossParryInfo,
  extractBossStance,
  extractBossStatusEffectsInflicted,
  extractBossStatusResistances,
  extractBossStrongerVs,
  extractDescription,
  extractInfobox,
  extractPageTitle,
  extractSection,
  extractSectionList,
  filterBoilerplate,
  loadHtml,
  parseNumber,
  parseScaling,
  parseWeaknesses,
} from './utils'

// ============================================================================
// BOSS PARSER
// ============================================================================

/**
 * Parse a boss page from Fextralife
 *
 * Extracts: name, category, weaknesses, phases, strategies, rewards
 */
export function parseBoss(html: string, url: string): ParseResult<ParsedBoss> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    // Extract basic info
    const name = extractPageTitle($) || 'Unknown Boss'
    const description = extractDescription($)

    if (!name || name === 'Unknown Boss') {
      warnings.push('Could not extract boss name from page')
    }

    // Extract infobox data
    const infobox = extractInfobox($)

    // Category (Main Boss, Field Boss, etc.)
    const category =
      infobox.get('type') ||
      infobox.get('boss type') ||
      infobox.get('category') ||
      inferBossCategory($)

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('locations') ||
      extractBossLocation($) ||
      ''

    // HP
    const hpText = infobox.get('hp') || infobox.get('health') || ''
    const hp = parseNumber(hpText)

    // Weaknesses
    const weaknessText =
      infobox.get('weakness') ||
      infobox.get('weaknesses') ||
      infobox.get('weak to') ||
      ''
    let weaknesses = parseWeaknesses(weaknessText)

    // Also check for weakness section
    if (weaknesses.length === 0) {
      const weaknessSection = extractSection($, /weakness|vulnerable/i)
      weaknesses = parseWeaknesses(weaknessSection)
    }

    // Phases
    const phases = extractBossPhases($)
    if (phases.length === 0) {
      warnings.push('No boss phases found')
    }

    // Strategies
    const strategies = extractBossStrategies($)
    if (strategies.length === 0) {
      warnings.push('No strategies found')
    }

    // Rewards
    const rewards = extractBossRewards($, infobox)
    if (rewards.length === 0) {
      warnings.push('No rewards found')
    }

    // Extract new combat data fields
    const hpByPlayerCount = extractBossHpByPlayerCount($)
    const stance = extractBossStance($)
    const parryInfo = extractBossParryInfo($)
    const damageNegation = extractBossDamageNegation($)
    const statusResistances = extractBossStatusResistances($)
    const strongerVs = extractBossStrongerVs($)
    const damageTypesDealt = extractBossDamageTypesDealt($)
    const statusEffectsInflicted = extractBossStatusEffectsInflicted($)

    const result: ParsedBoss = {
      type: 'boss',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      category: cleanText(category),
      weaknesses,
      phases,
      strategies,
      rewards,
      location: cleanText(location),
      hp,
      // New fields
      hpByPlayerCount,
      stance,
      parryInfo,
      damageNegation,
      statusResistances,
      strongerVs,
      damageTypesDealt,
      statusEffectsInflicted,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse boss page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferBossCategory($: ReturnType<typeof loadHtml>): string {
  const content = $('#wiki-content-block').text().toLowerCase()

  if (content.includes('main boss') || content.includes('demigod')) {
    return 'Main Boss'
  }
  if (content.includes('field boss') || content.includes('world boss')) {
    return 'Field Boss'
  }
  if (content.includes('mini boss') || content.includes('miniboss')) {
    return 'Mini Boss'
  }
  if (content.includes('night boss')) {
    return 'Night Boss'
  }

  return 'Boss'
}

function extractBossLocation($: ReturnType<typeof loadHtml>): string {
  // Look for location in the description or a Location section
  const locationSection = extractSection($, /location|where to find/i)
  if (locationSection) {
    return locationSection.split('\n')[0] || ''
  }

  return ''
}

function extractBossPhases($: ReturnType<typeof loadHtml>): BossPhase[] {
  const phases: BossPhase[] = []

  // Look for phase headings
  const phasePatterns = [
    /phase\s*(\d+|one|two|three|i+)/i,
    /stage\s*(\d+)/i,
    /form\s*(\d+)/i,
  ]

  const contentBlock = $('#wiki-content-block')
  let currentPhase: BossPhase | null = null

  contentBlock.children().each((_: number, el: unknown) => {
    const $el = $(el as Parameters<typeof $>[0])
    const element = el as { tagName?: string }
    const tagName = element.tagName?.toLowerCase() ?? ''
    const text = $el.text().trim()

    // Check for phase headings
    if (['h2', 'h3', 'h4'].includes(tagName)) {
      for (const pattern of phasePatterns) {
        const match = text.match(pattern)
        if (match?.[1]) {
          if (currentPhase) {
            phases.push(currentPhase)
          }
          currentPhase = {
            name: cleanText(text),
            description: '',
            threshold: match[1],
          }
          break
        }
      }
    }

    // Collect phase description
    if (currentPhase && tagName === 'p') {
      currentPhase = {
        ...currentPhase,
        description: currentPhase.description
          ? `${currentPhase.description}\n${text}`
          : text,
      }
    }
  })

  if (currentPhase) {
    phases.push(currentPhase)
  }

  // If no explicit phases found, try to infer from content
  if (phases.length === 0) {
    const content = extractSection($, /combat|fight|battle/i)
    if (content) {
      phases.push({
        name: 'Combat',
        description: content,
      })
    }
  }

  return phases
}

function extractBossStrategies($: ReturnType<typeof loadHtml>): string[] {
  const strategies: string[] = []

  // Look for strategy sections
  const strategySection = extractSection($, /strateg|tips|how to|defeat|beat/i)
  if (strategySection) {
    // Split into individual tips
    const lines = strategySection.split('\n').filter((l) => l.trim())
    strategies.push(...lines)
  }

  // Also check for bulleted strategy lists
  const strategyList = extractSectionList($, /strateg|tips/i)
  if (strategyList.length > 0) {
    strategies.push(...strategyList)
  }

  // Deduplicate and filter out any remaining boilerplate
  return filterBoilerplate([...new Set(strategies)])
}

function extractBossRewards(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
): BossReward[] {
  const rewards: BossReward[] = []

  // Check infobox for drops
  const drops =
    infobox.get('drops') ||
    infobox.get('rewards') ||
    infobox.get('dropped items')
  if (drops) {
    // Parse comma or newline separated drops
    const items = drops
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    for (const item of items) {
      // Try to extract quantity (e.g., "Runes (5000)")
      const match = item.match(/^(.+?)\s*\((\d+)\)?$/)
      if (match?.[1] && match[2]) {
        rewards.push({
          name: cleanText(match[1]),
          quantity: Number.parseInt(match[2], 10),
        })
      } else {
        rewards.push({ name: cleanText(item) })
      }
    }
  }

  // Also check for rewards section
  const rewardList = extractSectionList($, /reward|drop|loot/i)
  for (const item of rewardList) {
    if (!rewards.some((r) => r.name.toLowerCase() === item.toLowerCase())) {
      rewards.push({ name: cleanText(item) })
    }
  }

  return rewards
}

// ============================================================================
// WEAPON PARSER
// ============================================================================

/**
 * Parse a weapon page from Fextralife
 *
 * Extracts: name, type, stats, scaling, skill, statusBuildup, passiveBenefits, uniqueEffect
 */
export function parseWeapon(
  html: string,
  url: string,
): ParseResult<ParsedWeapon> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Weapon'
    const description = extractDescription($)

    if (!name || name === 'Unknown Weapon') {
      warnings.push('Could not extract weapon name from page')
    }

    const infobox = extractInfobox($)

    // Weapon type
    const weaponType =
      infobox.get('type') ||
      infobox.get('weapon type') ||
      infobox.get('category') ||
      inferWeaponType($, name)

    // Stats
    const stats = extractWeaponStats(infobox)

    // Scaling
    const scaling = extractWeaponScaling(infobox)

    // Requirements
    const requirements = extractWeaponRequirements(infobox)

    // Status buildup (bleed, frost, poison, etc.)
    const statusBuildup = extractWeaponStatusBuildup($, infobox)

    // Skill
    const skill =
      infobox.get('skill') ||
      infobox.get('weapon skill') ||
      infobox.get('ash of war') ||
      extractWeaponSkillFromTable($) ||
      extractSection($, /skill|ash of war/i).split('\n')[0] ||
      ''

    // Unique weapon effect
    const uniqueEffect = extractUniqueWeaponEffect($, infobox)

    // Passive benefits
    const passiveBenefits = extractWeaponPassiveBenefits($, infobox)

    // Weight
    const weightText = infobox.get('weight') || infobox.get('wgt') || ''
    const weight = parseNumber(weightText)

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      infobox.get('obtained') ||
      extractSection($, /location|where to find|how to get/i).split('\n')[0] ||
      ''

    // Upgrade progression (8 Nightfarer classes × 15 levels × 4 quality tiers)
    const cleanedName = cleanText(name)
    const upgradeProgression = extractWeaponUpgradeProgression($, cleanedName)

    const result: ParsedWeapon = {
      type: 'weapon',
      name: cleanedName,
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      weaponType: cleanText(weaponType),
      stats,
      statusBuildup: hasStatusBuildup(statusBuildup)
        ? statusBuildup
        : undefined,
      scaling,
      skill: cleanText(skill),
      requirements,
      weight,
      location: cleanText(location),
      uniqueEffect: uniqueEffect || undefined,
      passiveBenefits: passiveBenefits.length > 0 ? passiveBenefits : undefined,
      upgradeProgression,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse weapon page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferWeaponType($: ReturnType<typeof loadHtml>, name: string): string {
  const content = `${$('#wiki-content-block').text()} ${name}`.toLowerCase()

  const weaponTypes = [
    'katana',
    'greatsword',
    'colossal sword',
    'curved sword',
    'straight sword',
    'dagger',
    'axe',
    'greataxe',
    'hammer',
    'great hammer',
    'flail',
    'spear',
    'great spear',
    'halberd',
    'scythe',
    'whip',
    'fist',
    'claw',
    'bow',
    'crossbow',
    'staff',
    'seal',
    'torch',
    'shield',
  ]

  for (const type of weaponTypes) {
    if (content.includes(type)) {
      return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  return 'Weapon'
}

function extractWeaponStats(infobox: Map<string, string>): WeaponStats {
  // Try to find damage values in infobox
  const physicalDamage = parseNumber(
    infobox.get('physical') ||
      infobox.get('phy') ||
      infobox.get('attack power') ||
      '',
  )
  const magicDamage = parseNumber(
    infobox.get('magic') || infobox.get('mag') || '',
  )
  const fireDamage = parseNumber(infobox.get('fire') || '')
  const lightningDamage = parseNumber(
    infobox.get('lightning') || infobox.get('ltng') || '',
  )
  const holyDamage = parseNumber(infobox.get('holy') || '')
  const critical = parseNumber(
    infobox.get('critical') || infobox.get('crit') || '',
  )

  return {
    physicalDamage,
    magicDamage,
    fireDamage,
    lightningDamage,
    holyDamage,
    critical,
  }
}

function extractWeaponScaling(infobox: Map<string, string>): WeaponScaling {
  const str = parseScaling(infobox.get('str') || infobox.get('strength') || '')
  const dex = parseScaling(infobox.get('dex') || infobox.get('dexterity') || '')
  const int = parseScaling(
    infobox.get('int') || infobox.get('intelligence') || '',
  )
  const fai = parseScaling(infobox.get('fai') || infobox.get('faith') || '')
  const arc = parseScaling(infobox.get('arc') || infobox.get('arcane') || '')

  return {
    strength: str || undefined,
    dexterity: dex || undefined,
    intelligence: int || undefined,
    faith: fai || undefined,
    arcane: arc || undefined,
  }
}

function extractWeaponRequirements(
  infobox: Map<string, string>,
): AttributeRequirements {
  // Requirements are often listed as "Str 16" or "16 Str" in infobox
  const reqText = infobox.get('requirements') || infobox.get('required') || ''

  // Parse requirement string - extract all values first
  const strMatch = reqText.match(
    /(?:str|strength)[:\s]*(\d+)|(\d+)\s*(?:str|strength)/i,
  )
  const dexMatch = reqText.match(
    /(?:dex|dexterity)[:\s]*(\d+)|(\d+)\s*(?:dex|dexterity)/i,
  )
  const intMatch = reqText.match(
    /(?:int|intelligence)[:\s]*(\d+)|(\d+)\s*(?:int|intelligence)/i,
  )
  const faiMatch = reqText.match(
    /(?:fai|faith)[:\s]*(\d+)|(\d+)\s*(?:fai|faith)/i,
  )
  const arcMatch = reqText.match(
    /(?:arc|arcane)[:\s]*(\d+)|(\d+)\s*(?:arc|arcane)/i,
  )

  const parseReq = (match: RegExpMatchArray | null): number | undefined => {
    if (!match) return undefined
    const value = match[1] ?? match[2]
    return value ? Number.parseInt(value, 10) : undefined
  }

  return {
    strength: parseReq(strMatch),
    dexterity: parseReq(dexMatch),
    intelligence: parseReq(intMatch),
    faith: parseReq(faiMatch),
    arcane: parseReq(arcMatch),
  }
}

/**
 * Extract status buildup values from weapon page
 * Handles formats like: "Status Ailment (52)" for frostbite, "Causes blood loss buildup (55)"
 */
function extractWeaponStatusBuildup(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
): WeaponStatusBuildup {
  const buildup: WeaponStatusBuildup = {}

  // Check infobox first
  const statusText =
    infobox.get('status ailment') ||
    infobox.get('status effect') ||
    infobox.get('passive') ||
    ''

  // Look in table cells for "Status Ailment" row
  let statusValue = 0
  let statusType = ''

  $('table tr').each((_: number, row: unknown) => {
    const $row = $(row as Parameters<typeof $>[0])
    const headerCell = $row.find('td strong, th').first().text().toLowerCase()
    const valueCell = $row.find('td').last().text()

    if (
      headerCell.includes('status ailment') ||
      headerCell.includes('status effect')
    ) {
      // Extract the number from "(52)" or "52"
      const match = valueCell.match(/\(?\s*(\d+)\s*\)?/)
      if (match?.[1]) {
        statusValue = Number.parseInt(match[1], 10)
      }
    }
  })

  // Also search content for status type clues
  const content = $('#wiki-content-block').text().toLowerCase()
  const descText = `${content} ${statusText}`.toLowerCase()

  // Determine status type from context
  if (descText.includes('frostbite') || descText.includes('frost')) {
    statusType = 'frostbite'
    ;(buildup as { frostbite?: number }).frostbite =
      statusValue || parseStatusFromText(descText, 'frostbite')
  }
  if (
    descText.includes('blood loss') ||
    descText.includes('hemorrhage') ||
    descText.includes('bleed')
  ) {
    statusType = 'bloodLoss'
    ;(buildup as { bloodLoss?: number }).bloodLoss =
      statusValue || parseStatusFromText(descText, 'blood')
  }
  if (descText.includes('poison')) {
    statusType = 'poison'
    ;(buildup as { poison?: number }).poison =
      statusValue || parseStatusFromText(descText, 'poison')
  }
  if (descText.includes('scarlet rot') || descText.includes('rot buildup')) {
    statusType = 'scarletRot'
    ;(buildup as { scarletRot?: number }).scarletRot =
      statusValue || parseStatusFromText(descText, 'rot')
  }
  if (descText.includes('sleep')) {
    statusType = 'sleep'
    ;(buildup as { sleep?: number }).sleep =
      statusValue || parseStatusFromText(descText, 'sleep')
  }
  if (descText.includes('madness')) {
    statusType = 'madness'
    ;(buildup as { madness?: number }).madness =
      statusValue || parseStatusFromText(descText, 'madness')
  }

  // If we have a value but no type, check weapon name/description for hints
  if (statusValue > 0 && !statusType) {
    // Default to checking common patterns
    const weaponName = extractPageTitle($)?.toLowerCase() || ''
    if (
      weaponName.includes('frost') ||
      weaponName.includes('moon') ||
      weaponName.includes('ice')
    ) {
      ;(buildup as { frostbite?: number }).frostbite = statusValue
    } else if (weaponName.includes('blood') || weaponName.includes('rivers')) {
      ;(buildup as { bloodLoss?: number }).bloodLoss = statusValue
    }
  }

  return buildup
}

/**
 * Parse status buildup value from text like "causes 55 blood loss buildup"
 */
function parseStatusFromText(text: string, statusKeyword: string): number {
  const patterns = [
    new RegExp(`${statusKeyword}[^0-9]*\\(?\\s*(\\d+)\\s*\\)?`, 'i'),
    new RegExp(`\\(?\\s*(\\d+)\\s*\\)?[^0-9]*${statusKeyword}`, 'i'),
    new RegExp(`causes[^0-9]*(\\d+)[^0-9]*${statusKeyword}`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return Number.parseInt(match[1], 10)
    }
  }

  return 0
}

/**
 * Check if status buildup object has any values
 */
function hasStatusBuildup(buildup: WeaponStatusBuildup): boolean {
  return !!(
    buildup.bloodLoss ||
    buildup.frostbite ||
    buildup.poison ||
    buildup.scarletRot ||
    buildup.sleep ||
    buildup.madness
  )
}

/**
 * Extract weapon skill from table (looks for "Weapon Skill" row)
 */
function extractWeaponSkillFromTable($: ReturnType<typeof loadHtml>): string {
  let skill = ''

  $('table tr').each((_: number, row: unknown): boolean | undefined => {
    const $row = $(row as Parameters<typeof $>[0])
    const headerCell = $row.find('td strong, th').first().text().toLowerCase()

    if (headerCell.includes('weapon skill')) {
      // Get the link text or cell text
      const valueCell = $row.find('td').last()
      const link = valueCell.find('a').first()
      skill = link.length > 0 ? link.text() : valueCell.text()
      return false // break the loop
    }
    return undefined
  })

  return cleanText(skill)
}

/**
 * Extract unique weapon effect (special abilities some weapons have)
 */
function extractUniqueWeaponEffect(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
): string {
  // Check infobox
  const infoboxEffect =
    infobox.get('unique effect') ||
    infobox.get('unique weapon effect') ||
    infobox.get('special effect') ||
    ''

  if (infoboxEffect) return cleanText(infoboxEffect)

  // Look in table for "Unique Weapon Effect" row
  let effect = ''

  $('table tr').each((_: number, row: unknown): boolean | undefined => {
    const $row = $(row as Parameters<typeof $>[0])
    const headerCell = $row.find('td strong, th').first().text().toLowerCase()

    if (
      headerCell.includes('unique weapon effect') ||
      headerCell.includes('unique effect')
    ) {
      const valueCell = $row.find('td').last()
      const link = valueCell.find('a').first()
      effect = link.length > 0 ? link.text() : valueCell.text()
      return false // break
    }
    return undefined
  })

  return cleanText(effect)
}

/**
 * Extract passive benefits from weapon page
 */
function extractWeaponPassiveBenefits(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
): string[] {
  const benefits: string[] = []

  // Check infobox
  const passiveText =
    infobox.get('passive') ||
    infobox.get('passive effect') ||
    infobox.get('passive benefit') ||
    ''

  if (passiveText) {
    benefits.push(cleanText(passiveText))
  }

  // Look for passive effects in table
  $('table tr').each((_: number, row: unknown) => {
    const $row = $(row as Parameters<typeof $>[0])
    const headerCell = $row.find('td strong, th').first().text().toLowerCase()

    if (headerCell.includes('passive') && !headerCell.includes('status')) {
      const valueCell = $row.find('td').last().text()
      if (valueCell && !benefits.includes(cleanText(valueCell))) {
        benefits.push(cleanText(valueCell))
      }
    }
  })

  // Look in content for passive effect mentions
  const passiveSection = extractSection($, /passive effect|passive benefit/i)
  if (passiveSection) {
    const lines = passiveSection.split('\n').filter((l) => l.trim())
    for (const line of lines) {
      const cleaned = cleanText(line)
      if (cleaned && !benefits.includes(cleaned)) {
        benefits.push(cleaned)
      }
    }
  }

  return benefits
}

/**
 * Nightfarer class names in the order they appear on wiki pages
 */
const NIGHTFARER_CLASSES = [
  'wylder',
  'guardian',
  'ironeye',
  'duchess',
  'raider',
  'revenant',
  'recluse',
  'executor',
] as const

type NightfarerClass = (typeof NIGHTFARER_CLASSES)[number]

/**
 * Extract weapon upgrade progression tables from wiki page
 *
 * Wiki structure: 8 tables (one per Nightfarer class), each with:
 * - 15 rows for upgrade levels (Lv 1-15)
 * - 4 quality tiers (Common, Rare, Epic, Legendary)
 * - 2 stats per tier (ATK Pwr, Dmg Neg)
 *
 * Returns undefined if no upgrade data found (tables are empty placeholders)
 */
function extractWeaponUpgradeProgression(
  $: ReturnType<typeof loadHtml>,
  weaponName: string,
): import('./types').WeaponUpgradeProgression | undefined {
  const upgradesByClass: import('./types').WeaponClassUpgrades[] = []

  // Look for upgrade tables by finding H3 headers with "[Class] [Weapon] Upgrades"
  for (const nightfarerClass of NIGHTFARER_CLASSES) {
    const classCapitalized =
      nightfarerClass.charAt(0).toUpperCase() + nightfarerClass.slice(1)

    // Find tables associated with this class
    // Wiki uses H3 headers like "### Wylder Moonveil Upgrades"
    const headerPatterns = [
      new RegExp(`${classCapitalized}.*upgrades?`, 'i'),
      new RegExp(`${classCapitalized}.*${weaponName}`, 'i'),
    ]

    let table: ReturnType<typeof $> | null = null

    // Search for the upgrade section header
    $('h3, h4, .wiki-heading').each((_, header) => {
      const headerText = $(header).text()
      for (const pattern of headerPatterns) {
        if (pattern.test(headerText)) {
          // Find the next table after this header
          const nextTable = $(header).nextAll('table').first()
          if (nextTable.length > 0) {
            table = nextTable
            return false // break
          }
        }
      }
    })

    // If no table found by header, try finding tables with class-specific content
    if (!table) {
      $('table').each((_, tbl) => {
        const tableText = $(tbl).text().toLowerCase()
        if (
          tableText.includes(nightfarerClass) &&
          (tableText.includes('lv 1') || tableText.includes('level 1'))
        ) {
          table = $(tbl)
          return false // break
        }
      })
    }

    if (!table) {
      continue
    }

    // Parse the upgrade table
    const levels: import('./types').WeaponUpgradeLevelStats[] = []
    const rows = $(table).find('tr')

    // Skip header rows (usually first 2 rows: quality icons and stat headers)
    let dataStartIndex = 0
    rows.each((i, row) => {
      const firstCell = $(row).find('td, th').first().text().trim()
      if (/^lv\s*1$/i.test(firstCell)) {
        dataStartIndex = i
        return false // break
      }
    })

    // Parse data rows (Lv 1 through Lv 15)
    rows.slice(dataStartIndex).each((_, row) => {
      const cells = $(row).find('td, th')
      if (cells.length < 9) return // Skip malformed rows

      const levelText = $(cells[0]).text().trim()
      const levelMatch = levelText.match(/(\d+)/)
      if (!levelMatch) return

      const level = Number.parseInt(levelMatch[1], 10)
      if (level < 1 || level > 15) return

      // Extract stats from cells
      // Column layout: Level | Common ATK | Common Neg | Rare ATK | Rare Neg | Epic ATK | Epic Neg | Legendary ATK | Legendary Neg
      const parseCell = (idx: number): number | undefined => {
        const text = $(cells[idx]).text().trim()
        const num = parseNumber(text)
        return num !== undefined && num > 0 ? num : undefined
      }

      const levelStats: import('./types').WeaponUpgradeLevelStats = {
        level,
        common: {
          atkPwr: parseCell(1),
          dmgNeg: parseCell(2),
        },
        rare: {
          atkPwr: parseCell(3),
          dmgNeg: parseCell(4),
        },
        epic: {
          atkPwr: parseCell(5),
          dmgNeg: parseCell(6),
        },
        legendary: {
          atkPwr: parseCell(7),
          dmgNeg: parseCell(8),
        },
      }

      // Only add if at least some data exists
      const hasAnyData =
        levelStats.common?.atkPwr !== undefined ||
        levelStats.common?.dmgNeg !== undefined ||
        levelStats.rare?.atkPwr !== undefined ||
        levelStats.rare?.dmgNeg !== undefined ||
        levelStats.epic?.atkPwr !== undefined ||
        levelStats.epic?.dmgNeg !== undefined ||
        levelStats.legendary?.atkPwr !== undefined ||
        levelStats.legendary?.dmgNeg !== undefined

      if (hasAnyData) {
        levels.push(levelStats)
      }
    })

    // Only add this class if we found actual upgrade data
    if (levels.length > 0) {
      upgradesByClass.push({
        nightfarerClass,
        levels,
      })
    }
  }

  // Return undefined if no upgrade data was found (empty tables)
  if (upgradesByClass.length === 0) {
    return undefined
  }

  return {
    weaponName,
    upgradesByClass,
  }
}

// ============================================================================
// RELIC PARSER
// ============================================================================

/**
 * Parse a relic page from Fextralife
 *
 * Extracts: name, color, tier, effects
 */
export function parseRelic(
  html: string,
  url: string,
): ParseResult<ParsedRelic> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Relic'
    const description = extractDescription($)

    if (!name || name === 'Unknown Relic') {
      warnings.push('Could not extract relic name from page')
    }

    const infobox = extractInfobox($)

    // Color/rarity
    const color =
      infobox.get('color') ||
      infobox.get('rarity') ||
      infobox.get('type') ||
      inferRelicColor($, name)

    // Tier
    const tier =
      infobox.get('tier') || infobox.get('level') || inferRelicTier($)

    // Effects
    const effects = extractRelicEffects($, infobox, description)
    if (effects.length === 0) {
      warnings.push('No relic effects found')
    }

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      infobox.get('obtained') ||
      ''

    const result: ParsedRelic = {
      type: 'relic',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      color: cleanText(color),
      tier: cleanText(tier),
      effects,
      location: cleanText(location),
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse relic page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferRelicColor($: ReturnType<typeof loadHtml>, name: string): string {
  const content = `${$('#wiki-content-block').text()} ${name}`.toLowerCase()

  const colors = [
    'red',
    'blue',
    'green',
    'gold',
    'purple',
    'orange',
    'white',
    'black',
  ]
  for (const color of colors) {
    if (content.includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1)
    }
  }

  // Check for rarity terms
  if (content.includes('legendary') || content.includes('unique')) return 'Gold'
  if (content.includes('rare')) return 'Purple'
  if (content.includes('uncommon')) return 'Blue'
  if (content.includes('common')) return 'White'

  return ''
}

function inferRelicTier($: ReturnType<typeof loadHtml>): string {
  const content = $('#wiki-content-block').text().toLowerCase()

  const tierPatterns = [
    /tier\s*(\d+|i+|one|two|three)/i,
    /level\s*(\d+)/i,
    /\+(\d+)/,
  ]

  for (const pattern of tierPatterns) {
    const match = content.match(pattern)
    if (match) {
      return `Tier ${match[1]}`
    }
  }

  return ''
}

function extractRelicEffects(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
  description: string,
): string[] {
  const effects: string[] = []

  // Check infobox for effect
  const effect =
    infobox.get('effect') || infobox.get('effects') || infobox.get('bonus')
  if (effect) {
    effects.push(cleanText(effect))
  }

  // Check for effects section
  const effectSection = extractSection($, /effect|bonus|provide|grant/i)
  if (effectSection) {
    const lines = effectSection.split('\n').filter((l) => l.trim())
    effects.push(...lines.map(cleanText))
  }

  // Also check list items
  const effectList = extractSectionList($, /effect/i)
  effects.push(...effectList.map(cleanText))

  // If still no effects, try to extract from description
  if (effects.length === 0 && description) {
    // Look for sentences that describe effects
    const sentences = description.split(/[.!]/).filter((s) => {
      const lower = s.toLowerCase()
      return (
        lower.includes('increase') ||
        lower.includes('decrease') ||
        lower.includes('boost') ||
        lower.includes('grant') ||
        lower.includes('provide') ||
        lower.includes('enhance')
      )
    })
    effects.push(...sentences.map((s) => cleanText(s.trim())))
  }

  return [...new Set(effects)]
}

// ============================================================================
// NIGHTFARER PARSER
// ============================================================================

/**
 * Parse a nightfarer (class) page from Fextralife
 *
 * Extracts: name, stats, passive, skill, ultimate, vessel
 */
export function parseNightfarer(
  html: string,
  url: string,
): ParseResult<ParsedNightfarer> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Nightfarer'
    const description = extractDescription($)

    if (!name || name === 'Unknown Nightfarer') {
      warnings.push('Could not extract nightfarer name from page')
    }

    const infobox = extractInfobox($)

    // Stats
    const stats = extractNightfarerStats(infobox)

    // Passive ability
    const passive = extractNightfarerAbility($, infobox, 'passive')
    if (!passive.name && !passive.description) {
      warnings.push('No passive ability found')
    }

    // Active skill
    const skill = extractNightfarerAbility($, infobox, 'skill')
    if (!skill.name && !skill.description) {
      warnings.push('No skill found')
    }

    // Ultimate ability
    const ultimate = extractNightfarerAbility($, infobox, 'ultimate')
    if (!ultimate.name && !ultimate.description) {
      warnings.push('No ultimate ability found')
    }

    // Vessel (starting loadout)
    const vessel = extractVesselInfo($, infobox)

    const result: ParsedNightfarer = {
      type: 'nightfarer',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      stats,
      passive,
      skill,
      ultimate,
      vessel,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse nightfarer page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function extractNightfarerStats(infobox: Map<string, string>): NightfarerStats {
  // Look for stats in infobox
  return {
    vigor: parseNumber(infobox.get('vigor') || infobox.get('vig') || ''),
    mind: parseNumber(infobox.get('mind') || infobox.get('mnd') || ''),
    endurance: parseNumber(
      infobox.get('endurance') || infobox.get('end') || '',
    ),
    strength: parseNumber(infobox.get('strength') || infobox.get('str') || ''),
    dexterity: parseNumber(
      infobox.get('dexterity') || infobox.get('dex') || '',
    ),
    intelligence: parseNumber(
      infobox.get('intelligence') || infobox.get('int') || '',
    ),
    faith: parseNumber(infobox.get('faith') || infobox.get('fai') || ''),
    arcane: parseNumber(infobox.get('arcane') || infobox.get('arc') || ''),
  }
}

function extractNightfarerAbility(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
  abilityType: 'passive' | 'skill' | 'ultimate',
): NightfarerAbility {
  // Check infobox first
  const infoboxName =
    infobox.get(abilityType) || infobox.get(`${abilityType} ability`) || ''
  const infoboxDesc = infobox.get(`${abilityType} description`) || ''

  const parseFpCost = (text: string): number | undefined => {
    const match = text.match(/(?:fp|cost)[:\s]*(\d+)/i)
    return match?.[1] ? Number.parseInt(match[1], 10) : undefined
  }

  if (infoboxName || infoboxDesc) {
    return {
      name: cleanText(infoboxName),
      description: cleanText(infoboxDesc),
      fpCost: parseFpCost(infoboxDesc),
    }
  }

  // Look for section with ability info
  const abilityPatterns = {
    passive: /passive|innate|trait/i,
    skill: /skill|ability|active/i,
    ultimate: /ultimate|ult|special/i,
  } as const

  const pattern = abilityPatterns[abilityType]
  const sectionContent = extractSection($, pattern)
  if (sectionContent) {
    const lines = sectionContent.split('\n').filter((l) => l.trim())

    return {
      name: lines[0] || abilityType,
      description: lines.slice(1).join('\n'),
      fpCost: parseFpCost(sectionContent),
    }
  }

  return {
    name: '',
    description: '',
  }
}

function extractVesselInfo(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
): VesselInfo {
  const vesselName =
    infobox.get('vessel') || infobox.get('starting vessel') || ''
  const vesselDesc = infobox.get('vessel description') || ''

  // Look for vessel section
  const vesselSection = extractSection($, /vessel|starting|loadout/i)

  // Extract starting equipment
  const startingWeapon =
    infobox.get('starting weapon') || infobox.get('weapon') || ''
  const startingArmor =
    infobox.get('starting armor') || infobox.get('armor') || ''

  return {
    name: cleanText(vesselName),
    description: cleanText(vesselDesc || vesselSection),
    startingWeapon: cleanText(startingWeapon),
    startingArmor: cleanText(startingArmor),
  }
}

// ============================================================================
// SKILL PARSER
// ============================================================================

/**
 * Parse a skill page from Fextralife
 *
 * Extracts: name, fpCost, weaponTypes, effect
 */
export function parseSkill(
  html: string,
  url: string,
): ParseResult<ParsedSkill> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Skill'
    const description = extractDescription($)

    if (!name || name === 'Unknown Skill') {
      warnings.push('Could not extract skill name from page')
    }

    const infobox = extractInfobox($)

    // FP Cost
    const fpCostText =
      infobox.get('fp cost') || infobox.get('fp') || infobox.get('cost') || ''
    const fpCost = parseNumber(fpCostText) ?? 0

    // Stamina cost
    const staminaCostText =
      infobox.get('stamina') || infobox.get('stamina cost') || ''
    const staminaCost = parseNumber(staminaCostText)

    // Weapon types
    const weaponTypes = extractSkillWeaponTypes($, infobox)

    // Effect
    const effect =
      infobox.get('effect') || infobox.get('description') || description || ''

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      infobox.get('obtained') ||
      extractSection($, /location|where to find|how to get/i).split('\n')[0] ||
      ''

    const result: ParsedSkill = {
      type: 'skill',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      fpCost,
      weaponTypes,
      effect: cleanText(effect),
      staminaCost,
      location: cleanText(location),
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse skill page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function extractSkillWeaponTypes(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
): string[] {
  const weaponTypesText =
    infobox.get('weapon types') ||
    infobox.get('weapons') ||
    infobox.get('compatible weapons') ||
    ''

  if (weaponTypesText) {
    return weaponTypesText
      .split(/[,/]/)
      .map((t) => cleanText(t))
      .filter(Boolean)
  }

  // Look for weapon types section
  const weaponSection = extractSection($, /weapon|compatible|usable/i)
  if (weaponSection) {
    return weaponSection
      .split(/[,\n]/)
      .map((t) => cleanText(t))
      .filter(Boolean)
  }

  return []
}

// ============================================================================
// TALISMAN PARSER
// ============================================================================

/**
 * Parse a talisman page from Fextralife
 *
 * Extracts: name, effect, weight, location
 */
export function parseTalisman(
  html: string,
  url: string,
): ParseResult<ParsedTalisman> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Talisman'
    const description = extractDescription($)

    if (!name || name === 'Unknown Talisman') {
      warnings.push('Could not extract talisman name from page')
    }

    const infobox = extractInfobox($)

    // Effect
    const effect =
      infobox.get('effect') ||
      infobox.get('effects') ||
      infobox.get('bonus') ||
      description ||
      ''

    // Weight
    const weightText = infobox.get('weight') || infobox.get('wgt') || ''
    const weight = parseNumber(weightText)

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      infobox.get('obtained') ||
      extractSection($, /location|where to find|how to get/i).split('\n')[0] ||
      ''

    const result: ParsedTalisman = {
      type: 'talisman',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      effect: cleanText(effect),
      weight,
      location: cleanText(location),
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse talisman page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// ============================================================================
// SPELL PARSER
// ============================================================================

/**
 * Parse a spell page from Fextralife
 *
 * Extracts: name, spellType, fpCost, slots, effect, requirements, location
 */
export function parseSpell(
  html: string,
  url: string,
): ParseResult<ParsedSpell> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Spell'
    const description = extractDescription($)

    if (!name || name === 'Unknown Spell') {
      warnings.push('Could not extract spell name from page')
    }

    const infobox = extractInfobox($)

    // Spell type (Sorcery or Incantation)
    const spellType =
      infobox.get('type') ||
      infobox.get('spell type') ||
      inferSpellType($, name)

    // FP Cost
    const fpCostText =
      infobox.get('fp cost') || infobox.get('fp') || infobox.get('cost') || ''
    const fpCost = parseNumber(fpCostText) ?? 0

    // Slots required
    const slotsText = infobox.get('slots') || infobox.get('slot') || '1'
    const slots = parseNumber(slotsText) ?? 1

    // Effect
    const effect =
      infobox.get('effect') || infobox.get('description') || description || ''

    // Requirements
    const requirements = extractSpellRequirements(infobox)

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      infobox.get('obtained') ||
      extractSection($, /location|where to find|how to get/i).split('\n')[0] ||
      ''

    const result: ParsedSpell = {
      type: 'spell',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      spellType: cleanText(spellType),
      fpCost,
      slots,
      effect: cleanText(effect),
      requirements,
      location: cleanText(location),
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse spell page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferSpellType($: ReturnType<typeof loadHtml>, name: string): string {
  const content = `${$('#wiki-content-block').text()} ${name}`.toLowerCase()

  if (content.includes('sorcery') || content.includes('sorceries')) {
    return 'Sorcery'
  }
  if (content.includes('incantation') || content.includes('incantations')) {
    return 'Incantation'
  }

  return 'Spell'
}

function extractSpellRequirements(
  infobox: Map<string, string>,
): AttributeRequirements {
  const reqText = infobox.get('requirements') || infobox.get('required') || ''

  const intMatch = reqText.match(
    /(?:int|intelligence)[:\s]*(\d+)|(\d+)\s*(?:int|intelligence)/i,
  )
  const faiMatch = reqText.match(
    /(?:fai|faith)[:\s]*(\d+)|(\d+)\s*(?:fai|faith)/i,
  )
  const arcMatch = reqText.match(
    /(?:arc|arcane)[:\s]*(\d+)|(\d+)\s*(?:arc|arcane)/i,
  )

  const parseReq = (match: RegExpMatchArray | null): number | undefined => {
    if (!match) return undefined
    const value = match[1] ?? match[2]
    return value ? Number.parseInt(value, 10) : undefined
  }

  return {
    intelligence: parseReq(intMatch),
    faith: parseReq(faiMatch),
    arcane: parseReq(arcMatch),
  }
}

// ============================================================================
// ARMOR PARSER
// ============================================================================

/**
 * Parse an armor page from Fextralife
 *
 * Extracts: name, slot, damageNegation, resistance, weight, location
 */
export function parseArmor(
  html: string,
  url: string,
): ParseResult<ParsedArmor> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Armor'
    const description = extractDescription($)

    if (!name || name === 'Unknown Armor') {
      warnings.push('Could not extract armor name from page')
    }

    const infobox = extractInfobox($)

    // Armor slot
    const slot =
      infobox.get('slot') ||
      infobox.get('type') ||
      infobox.get('category') ||
      inferArmorSlot($, name)

    // Damage negation
    const damageNegation = extractDamageNegation(infobox)

    // Resistance
    const resistance = extractResistance(infobox)

    // Weight
    const weightText = infobox.get('weight') || infobox.get('wgt') || ''
    const weight = parseNumber(weightText)

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      infobox.get('obtained') ||
      extractSection($, /location|where to find|how to get/i).split('\n')[0] ||
      ''

    const result: ParsedArmor = {
      type: 'armor',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      slot: cleanText(slot),
      damageNegation,
      resistance,
      weight,
      location: cleanText(location),
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse armor page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferArmorSlot($: ReturnType<typeof loadHtml>, name: string): string {
  const content = `${$('#wiki-content-block').text()} ${name}`.toLowerCase()

  if (
    content.includes('helm') ||
    content.includes('hood') ||
    content.includes('crown') ||
    content.includes('mask')
  ) {
    return 'Head'
  }
  if (
    content.includes('armor') ||
    content.includes('robe') ||
    content.includes('vest') ||
    content.includes('chest')
  ) {
    return 'Chest'
  }
  if (
    content.includes('gauntlet') ||
    content.includes('gloves') ||
    content.includes('bracers')
  ) {
    return 'Arms'
  }
  if (
    content.includes('greaves') ||
    content.includes('trousers') ||
    content.includes('leggings')
  ) {
    return 'Legs'
  }

  return 'Armor'
}

function extractDamageNegation(infobox: Map<string, string>): DamageNegation {
  return {
    physical: parseNumber(infobox.get('physical') || infobox.get('phy') || ''),
    strike: parseNumber(
      infobox.get('strike') || infobox.get('vs strike') || '',
    ),
    slash: parseNumber(infobox.get('slash') || infobox.get('vs slash') || ''),
    pierce: parseNumber(
      infobox.get('pierce') || infobox.get('vs pierce') || '',
    ),
    magic: parseNumber(infobox.get('magic') || infobox.get('mag') || ''),
    fire: parseNumber(infobox.get('fire') || ''),
    lightning: parseNumber(
      infobox.get('lightning') || infobox.get('ltng') || '',
    ),
    holy: parseNumber(infobox.get('holy') || ''),
  }
}

function extractResistance(infobox: Map<string, string>): Resistance {
  return {
    immunity: parseNumber(infobox.get('immunity') || infobox.get('imm') || ''),
    robustness: parseNumber(
      infobox.get('robustness') || infobox.get('rob') || '',
    ),
    focus: parseNumber(infobox.get('focus') || infobox.get('foc') || ''),
    vitality: parseNumber(infobox.get('vitality') || infobox.get('vit') || ''),
    poise: parseNumber(infobox.get('poise') || ''),
  }
}

// ============================================================================
// SHIELD PARSER
// ============================================================================

/**
 * Parse a shield page from Fextralife
 *
 * Extracts: name, shieldType, guard, skill, weight, requirements, location
 */
export function parseShield(
  html: string,
  url: string,
): ParseResult<ParsedShield> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Shield'
    const description = extractDescription($)

    if (!name || name === 'Unknown Shield') {
      warnings.push('Could not extract shield name from page')
    }

    const infobox = extractInfobox($)

    // Shield type
    const shieldType =
      infobox.get('type') ||
      infobox.get('shield type') ||
      infobox.get('category') ||
      inferShieldType($, name)

    // Guard stats (same as damage negation)
    const guard = extractDamageNegation(infobox)

    // Skill
    const skill =
      infobox.get('skill') ||
      infobox.get('weapon skill') ||
      infobox.get('ash of war') ||
      ''

    // Weight
    const weightText = infobox.get('weight') || infobox.get('wgt') || ''
    const weight = parseNumber(weightText)

    // Requirements
    const requirements = extractWeaponRequirements(infobox)

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      infobox.get('obtained') ||
      extractSection($, /location|where to find|how to get/i).split('\n')[0] ||
      ''

    const result: ParsedShield = {
      type: 'shield',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      shieldType: cleanText(shieldType),
      guard,
      skill: cleanText(skill),
      weight,
      requirements,
      location: cleanText(location),
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse shield page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferShieldType($: ReturnType<typeof loadHtml>, name: string): string {
  const content = `${$('#wiki-content-block').text()} ${name}`.toLowerCase()

  if (content.includes('greatshield') || content.includes('great shield')) {
    return 'Greatshield'
  }
  if (content.includes('small shield') || content.includes('buckler')) {
    return 'Small Shield'
  }
  if (content.includes('medium shield')) {
    return 'Medium Shield'
  }

  return 'Shield'
}

// ============================================================================
// ENEMY PARSER
// ============================================================================

/**
 * Parse an enemy page from Fextralife
 *
 * Extracts: name, category, locations, weaknesses, drops, hp, runes
 */
export function parseEnemy(
  html: string,
  url: string,
): ParseResult<ParsedEnemy> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Enemy'
    const description = extractDescription($)

    if (!name || name === 'Unknown Enemy') {
      warnings.push('Could not extract enemy name from page')
    }

    const infobox = extractInfobox($)

    // Category
    const category =
      infobox.get('type') ||
      infobox.get('enemy type') ||
      infobox.get('category') ||
      inferEnemyCategory($)

    // Locations
    const locationText =
      infobox.get('location') ||
      infobox.get('locations') ||
      extractSection($, /location|found in/i) ||
      ''
    const locations = locationText
      .split(/[,\n]/)
      .map((l) => cleanText(l))
      .filter(Boolean)

    // Weaknesses
    const weaknessText =
      infobox.get('weakness') ||
      infobox.get('weaknesses') ||
      infobox.get('weak to') ||
      ''
    const weaknesses = parseWeaknesses(weaknessText)

    // Drops
    const dropsText =
      infobox.get('drops') ||
      infobox.get('dropped items') ||
      extractSection($, /drop|loot/i) ||
      ''
    const drops = dropsText
      .split(/[,\n]/)
      .map((d) => cleanText(d))
      .filter(Boolean)

    // HP
    const hpText = infobox.get('hp') || infobox.get('health') || ''
    const hp = parseNumber(hpText)

    // Runes
    const runesText = infobox.get('runes') || infobox.get('souls') || ''
    const runes = parseNumber(runesText)

    const result: ParsedEnemy = {
      type: 'enemy',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      category: cleanText(category),
      locations,
      weaknesses,
      drops,
      hp,
      runes,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse enemy page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferEnemyCategory($: ReturnType<typeof loadHtml>): string {
  const content = $('#wiki-content-block').text().toLowerCase()

  if (
    content.includes('humanoid') ||
    content.includes('soldier') ||
    content.includes('knight')
  ) {
    return 'Humanoid'
  }
  if (
    content.includes('beast') ||
    content.includes('wolf') ||
    content.includes('bear')
  ) {
    return 'Beast'
  }
  if (
    content.includes('undead') ||
    content.includes('skeleton') ||
    content.includes('zombie')
  ) {
    return 'Undead'
  }
  if (
    content.includes('dragon') ||
    content.includes('drake') ||
    content.includes('wyrm')
  ) {
    return 'Dragon'
  }
  if (
    content.includes('spirit') ||
    content.includes('ghost') ||
    content.includes('phantom')
  ) {
    return 'Spirit'
  }

  return 'Enemy'
}

// ============================================================================
// NPC PARSER
// ============================================================================

/**
 * Parse an NPC page from Fextralife
 *
 * Extracts: name, role, location, quests, services
 */
export function parseNPC(html: string, url: string): ParseResult<ParsedNPC> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown NPC'
    const description = extractDescription($)

    if (!name || name === 'Unknown NPC') {
      warnings.push('Could not extract NPC name from page')
    }

    const infobox = extractInfobox($)

    // Role
    const role =
      infobox.get('role') ||
      infobox.get('type') ||
      infobox.get('occupation') ||
      inferNPCRole($)

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      extractSection($, /location|where to find/i).split('\n')[0] ||
      ''

    // Quests
    const questText =
      infobox.get('quests') ||
      infobox.get('quest') ||
      extractSection($, /quest/i) ||
      ''
    const quests = questText
      .split(/[,\n]/)
      .map((q) => cleanText(q))
      .filter(Boolean)

    // Services
    const servicesText =
      infobox.get('services') ||
      infobox.get('service') ||
      extractSection($, /service|offer/i) ||
      ''
    const services = servicesText
      .split(/[,\n]/)
      .map((s) => cleanText(s))
      .filter(Boolean)

    const result: ParsedNPC = {
      type: 'npc',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      role: cleanText(role),
      location: cleanText(location),
      quests,
      services,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse NPC page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferNPCRole($: ReturnType<typeof loadHtml>): string {
  const content = $('#wiki-content-block').text().toLowerCase()

  if (
    content.includes('merchant') ||
    content.includes('vendor') ||
    content.includes('sells')
  ) {
    return 'Merchant'
  }
  if (content.includes('quest') || content.includes('mission')) {
    return 'Quest Giver'
  }
  if (content.includes('summon') || content.includes('spirit ash')) {
    return 'Summon'
  }
  if (content.includes('trainer') || content.includes('teaches')) {
    return 'Trainer'
  }

  return 'NPC'
}

// ============================================================================
// MERCHANT PARSER
// ============================================================================

/**
 * Parse a merchant page from Fextralife
 *
 * Extracts: name, location, inventory
 */
export function parseMerchant(
  html: string,
  url: string,
): ParseResult<ParsedMerchant> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Merchant'
    const description = extractDescription($)

    if (!name || name === 'Unknown Merchant') {
      warnings.push('Could not extract merchant name from page')
    }

    const infobox = extractInfobox($)

    // Location
    const location =
      infobox.get('location') ||
      infobox.get('found') ||
      extractSection($, /location|where to find/i).split('\n')[0] ||
      ''

    // Inventory
    const inventory = extractMerchantInventory($)
    if (inventory.length === 0) {
      warnings.push('No inventory items found')
    }

    const result: ParsedMerchant = {
      type: 'merchant',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      location: cleanText(location),
      inventory,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse merchant page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function extractMerchantInventory(
  $: ReturnType<typeof loadHtml>,
): MerchantItem[] {
  const inventory: MerchantItem[] = []

  // Look for tables with items
  $('table.wiki_table tr').each((_: number, row: unknown) => {
    const $row = $(row as Parameters<typeof $>[0])
    const cells = $row.find('td')

    if (cells.length >= 2) {
      const itemName = cleanText($(cells[0]).text())
      const priceText = $(cells[1]).text()
      const price = parseNumber(priceText) ?? 0

      if (itemName) {
        inventory.push({
          name: itemName,
          price,
          currency: priceText.includes('rune') ? 'Runes' : 'Unknown',
        })
      }
    }
  })

  // Also check for item lists
  if (inventory.length === 0) {
    const itemList = extractSectionList($, /sell|inventory|wares/i)
    for (const item of itemList) {
      const match = item.match(/^(.+?)\s*[-–]\s*(\d+)/i)
      if (match?.[1] && match[2]) {
        inventory.push({
          name: cleanText(match[1]),
          price: Number.parseInt(match[2], 10),
          currency: 'Runes',
        })
      } else {
        inventory.push({
          name: cleanText(item),
          price: 0,
          currency: 'Unknown',
        })
      }
    }
  }

  return inventory
}

// ============================================================================
// LOCATION PARSER
// ============================================================================

/**
 * Parse a location page from Fextralife
 *
 * Extracts: name, region, items, enemies, bosses, connections, elementalAffinity, crystalTypes, favor
 */
export function parseLocation(
  html: string,
  url: string,
): ParseResult<ParsedLocation> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Location'
    const description = extractDescription($)

    if (!name || name === 'Unknown Location') {
      warnings.push('Could not extract location name from page')
    }

    const infobox = extractInfobox($)

    // Region
    const region =
      infobox.get('region') ||
      infobox.get('area') ||
      infobox.get('zone') ||
      inferLocationRegion($)

    // Elemental affinity (inferred from name and description)
    const elementalAffinity = inferElementalAffinity(name, description)

    // Items
    const itemsText =
      infobox.get('items') || extractSection($, /item|loot|treasure/i) || ''
    const items = itemsText
      .split(/[,\n]/)
      .map((i) => cleanText(i))
      .filter(Boolean)

    // Enemies
    const enemiesText =
      infobox.get('enemies') || extractSection($, /enem|creature|foe/i) || ''
    const enemies = enemiesText
      .split(/[,\n]/)
      .map((e) => cleanText(e))
      .filter(Boolean)

    // Bosses
    const bossesText =
      infobox.get('bosses') ||
      infobox.get('boss') ||
      extractSection($, /boss/i) ||
      ''
    const bosses = bossesText
      .split(/[,\n]/)
      .map((b) => cleanText(b))
      .filter(Boolean)

    // Connections
    const connectionsText =
      infobox.get('connections') ||
      infobox.get('connected to') ||
      extractSection($, /connect|adjacent|nearby/i) ||
      ''
    const connections = connectionsText
      .split(/[,\n]/)
      .map((c) => cleanText(c))
      .filter(Boolean)

    // Crystal types (for loot tables)
    const crystalTypes = extractCrystalTypes($, infobox)

    // Favor (special location reward)
    const favor = extractLocationFavor($, infobox)

    const result: ParsedLocation = {
      type: 'location',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      region: cleanText(region),
      elementalAffinity,
      items,
      enemies,
      bosses,
      connections,
      crystalTypes: crystalTypes.length > 0 ? crystalTypes : undefined,
      favor: favor || undefined,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse location page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Extract crystal types from location page (determines loot pool)
 */
function extractCrystalTypes(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
): string[] {
  const crystals: string[] = []

  // Check infobox
  const crystalText =
    infobox.get('crystals') || infobox.get('crystal types') || ''

  if (crystalText) {
    crystals.push(...crystalText.split(/[,\n]/).map(cleanText).filter(Boolean))
  }

  // Look for crystal mentions in content
  const content = $('#wiki-content-block').text()
  const crystalPatterns = [/(\w+)\s+crystal/gi, /crystal\s+of\s+(\w+)/gi]

  for (const pattern of crystalPatterns) {
    let match = pattern.exec(content)
    while (match !== null) {
      const matchValue = match[1]
      if (matchValue) {
        const type = cleanText(matchValue)
        if (type && !crystals.includes(type)) {
          crystals.push(type)
        }
      }
      match = pattern.exec(content)
    }
  }

  return crystals
}

/**
 * Extract favor/special reward from location page
 */
function extractLocationFavor(
  $: ReturnType<typeof loadHtml>,
  infobox: Map<string, string>,
): string {
  // Check infobox
  const favor =
    infobox.get('favor') ||
    infobox.get('special reward') ||
    infobox.get('unique reward') ||
    ''

  if (favor) return cleanText(favor)

  // Look for favor section
  const favorSection = extractSection($, /favor|special reward|unique/i)
  if (favorSection) {
    return cleanText(favorSection.split('\n')[0] || '')
  }

  return ''
}

function inferLocationRegion($: ReturnType<typeof loadHtml>): string {
  const content = $('#wiki-content-block').text().toLowerCase()

  // Common region names for Nightreign
  const regions = [
    'limgrave',
    'liurnia',
    'caelid',
    'altus plateau',
    'mountaintops',
    'underground',
    'siofra',
    'ainsel',
  ]

  for (const region of regions) {
    if (content.includes(region)) {
      return region.charAt(0).toUpperCase() + region.slice(1)
    }
  }

  return ''
}

// ============================================================================
// EXPEDITION PARSER
// ============================================================================

/**
 * Parse an expedition page from Fextralife
 *
 * Extracts: name, difficulty, recommendedLevel, objectives, rewards, locations
 */
export function parseExpedition(
  html: string,
  url: string,
): ParseResult<ParsedExpedition> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Expedition'
    const description = extractDescription($)

    if (!name || name === 'Unknown Expedition') {
      warnings.push('Could not extract expedition name from page')
    }

    const infobox = extractInfobox($)

    // Difficulty
    const difficulty =
      infobox.get('difficulty') ||
      infobox.get('level') ||
      inferExpeditionDifficulty($)

    // Recommended level
    const levelText =
      infobox.get('recommended level') ||
      infobox.get('level') ||
      infobox.get('suggested level') ||
      ''
    const recommendedLevel = parseNumber(levelText)

    // Objectives
    const objectivesText =
      infobox.get('objectives') ||
      extractSection($, /objective|goal|task/i) ||
      ''
    const objectives = objectivesText
      .split(/[,\n]/)
      .map((o) => cleanText(o))
      .filter(Boolean)

    if (objectives.length === 0) {
      warnings.push('No objectives found')
    }

    // Rewards
    const rewardsText =
      infobox.get('rewards') ||
      infobox.get('reward') ||
      extractSection($, /reward|prize|loot/i) ||
      ''
    const rewards = rewardsText
      .split(/[,\n]/)
      .map((r) => cleanText(r))
      .filter(Boolean)

    // Locations
    const locationsText =
      infobox.get('locations') ||
      infobox.get('location') ||
      extractSection($, /location|area/i) ||
      ''
    const locations = locationsText
      .split(/[,\n]/)
      .map((l) => cleanText(l))
      .filter(Boolean)

    const result: ParsedExpedition = {
      type: 'expedition',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      difficulty: cleanText(difficulty),
      recommendedLevel,
      objectives,
      rewards,
      locations,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse expedition page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function inferExpeditionDifficulty($: ReturnType<typeof loadHtml>): string {
  const content = $('#wiki-content-block').text().toLowerCase()

  if (content.includes('easy') || content.includes('beginner')) {
    return 'Easy'
  }
  if (content.includes('medium') || content.includes('moderate')) {
    return 'Medium'
  }
  if (content.includes('hard') || content.includes('difficult')) {
    return 'Hard'
  }
  if (content.includes('nightmare') || content.includes('extreme')) {
    return 'Nightmare'
  }

  return 'Normal'
}

// ============================================================================
// ITEM PARSER
// ============================================================================

/**
 * Parse an item page from Fextralife (Key Items, Consumables, Materials)
 *
 * Extracts: name, category, effect, locations (full content), purchase info
 */
export function parseItem(html: string, url: string): ParseResult<ParsedItem> {
  try {
    const $ = loadHtml(html)
    const warnings: string[] = []

    const name = extractPageTitle($) || 'Unknown Item'
    const description = extractDescription($)

    if (!name || name === 'Unknown Item') {
      warnings.push('Could not extract item name from page')
    }

    const infobox = extractInfobox($)

    // Item category (Key Item, Consumable, Crafting Material, etc.)
    const category =
      infobox.get('type') ||
      infobox.get('category') ||
      infobox.get('item type') ||
      inferItemCategory($, name)

    // Effect / what the item does
    const effect =
      infobox.get('effect') ||
      infobox.get('use') ||
      infobox.get('description') ||
      description ||
      ''

    // Extract full location content (not just first line!)
    const locationSectionContent = extractSection(
      $,
      /where to find|location|how to get|how to obtain/i,
    )

    // Parse location content into array of location entries
    const locations = parseLocationEntries(locationSectionContent)

    // If no section found, try infobox
    if (locations.length === 0) {
      const infoboxLocation =
        infobox.get('location') ||
        infobox.get('found') ||
        infobox.get('obtained')
      if (infoboxLocation) {
        locations.push(cleanText(infoboxLocation))
      }
    }

    // Extract purchase information from merchants
    const purchaseLocations = extractPurchaseInfo($, locationSectionContent)

    // Number of uses (if applicable)
    const usesText = infobox.get('uses') || infobox.get('use count') || ''
    const uses = parseNumber(usesText)

    const result: ParsedItem = {
      type: 'item',
      name: cleanText(name),
      sourceUrl: url,
      description: cleanText(description),
      parseSuccess: true,
      parseWarnings: warnings,
      category: cleanText(category),
      effect: cleanText(effect),
      locations,
      uses: uses ?? undefined,
      purchaseLocations:
        purchaseLocations.length > 0 ? purchaseLocations : undefined,
    }

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse item page: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Infer item category from page content
 */
function inferItemCategory(
  $: ReturnType<typeof loadHtml>,
  name: string,
): string {
  const content = $('#wiki-content-block').text().toLowerCase()
  const nameLower = name.toLowerCase()

  // Check for key item indicators
  if (
    content.includes('key item') ||
    nameLower.includes('key') ||
    content.includes('used to unlock') ||
    content.includes('breaks the seal')
  ) {
    return 'Key Item'
  }

  // Check for consumable indicators
  if (
    content.includes('consumable') ||
    content.includes('single use') ||
    content.includes('one time use') ||
    nameLower.includes('grease') ||
    nameLower.includes('pot') ||
    nameLower.includes('bolus')
  ) {
    return 'Consumable'
  }

  // Check for crafting material
  if (
    content.includes('crafting material') ||
    content.includes('craft ') ||
    nameLower.includes('bone') ||
    nameLower.includes('flower') ||
    nameLower.includes('mushroom')
  ) {
    return 'Crafting Material'
  }

  // Check for upgrade material
  if (
    content.includes('upgrade') ||
    nameLower.includes('smithing stone') ||
    nameLower.includes('somber')
  ) {
    return 'Upgrade Material'
  }

  return 'Item'
}

/**
 * Parse location section content into array of location entries
 *
 * Handles multi-line content with region headers and bullet points
 */
function parseLocationEntries(sectionContent: string): string[] {
  if (!sectionContent.trim()) {
    return []
  }

  const locations: string[] = []
  const lines = sectionContent.split('\n').filter((l) => l.trim())

  for (const line of lines) {
    const cleaned = cleanText(line.replace(/^[•\-*]\s*/, ''))
    if (cleaned && cleaned.length > 5) {
      // Filter out very short entries
      locations.push(cleaned)
    }
  }

  return locations
}

/**
 * Extract merchant purchase information from content
 */
function extractPurchaseInfo(
  $: ReturnType<typeof loadHtml>,
  sectionContent: string,
): ItemPurchaseInfo[] {
  const purchases: ItemPurchaseInfo[] = []

  // Pattern: "purchased from [Merchant] for X Runes" or "sold by [Merchant] at [Location]"
  const purchasePatterns = [
    /(?:purchased?|bought?|sold)\s+(?:from|by)\s+(?:the\s+)?([^,]+?)\s+for\s+([\d,]+)\s*runes?/gi,
    /([^,]+?)\s+(?:merchant|vendor)\s+(?:at|in)\s+([^,]+?)[\s,]+(?:for\s+)?([\d,]+)\s*runes?/gi,
  ]

  const fullContent = `${sectionContent}\n${$('#wiki-content-block').text()}`

  for (const pattern of purchasePatterns) {
    let match: RegExpExecArray | null = pattern.exec(fullContent)
    while (match !== null) {
      const merchantName = cleanText(match[1])
      const priceStr = match[2] || match[3]
      const price = parseNumber(priceStr.replace(/,/g, '')) || 0

      if (merchantName && price > 0) {
        // Avoid duplicates
        if (!purchases.some((p) => p.merchantName === merchantName)) {
          purchases.push({
            merchantName,
            location: '', // Would need more parsing to extract
            price,
          })
        }
      }
      match = pattern.exec(fullContent)
    }
  }

  // Also check for stock info: "Stock: X"
  const stockPattern = /stock:?\s*(\d+)/gi
  let stockMatch: RegExpExecArray | null = stockPattern.exec(fullContent)
  while (stockMatch !== null) {
    const stock = parseNumber(stockMatch[1])
    // Add stock to last purchase if available
    if (stock && purchases.length > 0) {
      const lastPurchase = purchases[purchases.length - 1]
      purchases[purchases.length - 1] = { ...lastPurchase, stock }
    }
    stockMatch = stockPattern.exec(fullContent)
  }

  return purchases
}

// ============================================================================
// CONTENT TYPE DETECTION
// ============================================================================

/**
 * Detect if a page is actually an item page regardless of its assigned category
 *
 * This catches cases like Stonesword Key being classified as 'location'
 * when it's actually a Key Item.
 */
export function detectActualContentType(
  html: string,
  assignedCategory: ContentType,
): ContentType {
  const $ = loadHtml(html)
  const infobox = extractInfobox($)
  const content = $('#wiki-content-block').text().toLowerCase()
  const pageTitle = extractPageTitle($)?.toLowerCase() || ''

  // Check infobox type field
  const infoboxType = (infobox.get('type') || '').toLowerCase()

  // Item type indicators from infobox
  if (
    infoboxType.includes('key item') ||
    infoboxType.includes('consumable') ||
    infoboxType.includes('crafting material') ||
    infoboxType.includes('upgrade material') ||
    infoboxType.includes('material')
  ) {
    return 'item'
  }

  // Content-based item detection (for pages incorrectly assigned)
  // Only override if currently classified as location or guide
  if (assignedCategory === 'location' || assignedCategory === 'guide') {
    // Key Item indicators
    if (
      (pageTitle.includes('key') && !pageTitle.includes('keyboard')) ||
      content.includes('key item') ||
      (content.includes('breaks the seal') &&
        content.includes('imp statue')) ||
      content.includes('used to unlock') ||
      content.includes('stonesword key')
    ) {
      return 'item'
    }

    // Consumable indicators
    if (
      pageTitle.includes('grease') ||
      pageTitle.includes('pot') ||
      pageTitle.includes('bolus') ||
      pageTitle.includes('arrow') ||
      pageTitle.includes('bolt') ||
      content.includes('consumable item') ||
      (content.includes('single use') && content.includes('item'))
    ) {
      return 'item'
    }

    // Material indicators
    if (
      pageTitle.includes('smithing stone') ||
      pageTitle.includes('somber') ||
      pageTitle.includes('rune arc') ||
      content.includes('crafting material') ||
      content.includes('upgrade material')
    ) {
      return 'item'
    }
  }

  // Keep the assigned category if no override detected
  return assignedCategory
}

// ============================================================================
// UNIFIED PARSER
// ============================================================================

/**
 * Parse any content type based on the category
 *
 * Now includes automatic item detection for misclassified pages
 */
export function parseContent(
  html: string,
  url: string,
  category: ContentType,
): ParseResult<ParsedContent> {
  // Auto-detect if this should actually be an item
  const actualCategory = detectActualContentType(html, category)

  switch (actualCategory) {
    case 'boss':
      return parseBoss(html, url)
    case 'weapon':
      return parseWeapon(html, url)
    case 'relic':
      return parseRelic(html, url)
    case 'nightfarer':
      return parseNightfarer(html, url)
    case 'skill':
      return parseSkill(html, url)
    case 'talisman':
      return parseTalisman(html, url)
    case 'spell':
      return parseSpell(html, url)
    case 'armor':
      return parseArmor(html, url)
    case 'shield':
      return parseShield(html, url)
    case 'enemy':
      return parseEnemy(html, url)
    case 'npc':
      return parseNPC(html, url)
    case 'merchant':
      return parseMerchant(html, url)
    case 'location':
      return parseLocation(html, url)
    case 'expedition':
      return parseExpedition(html, url)
    case 'item':
      return parseItem(html, url)
    default:
      return {
        success: false,
        error: `No parser available for content type: ${category}`,
      }
  }
}

/**
 * Re-export all parsers and types
 */
export type {
  ParsedArmor,
  ParsedBoss,
  ParsedContent,
  ParsedEnemy,
  ParsedExpedition,
  ParsedItem,
  ParsedLocation,
  ParsedMerchant,
  ParsedNightfarer,
  ParsedNPC,
  ParsedRelic,
  ParsedShield,
  ParsedSkill,
  ParsedSpell,
  ParsedTalisman,
  ParsedWeapon,
  ParseResult,
} from './types'
