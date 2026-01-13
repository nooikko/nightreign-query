/**
 * Claude API Integration for Content Normalization
 *
 * Uses Claude Haiku 4.5 with Structured Outputs for guaranteed
 * schema-compliant JSON responses. Includes batch processing
 * for cost efficiency.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ContentType } from '@nightreign/types'
import { createLogger } from '@utils/logger'
import pLimit from 'p-limit'
import type { z } from 'zod'
import {
  type ContentChunk,
  type NormalizedArmor,
  NormalizedArmorSchema,
  type NormalizedBoss,
  NormalizedBossSchema,
  type NormalizedEnemy,
  NormalizedEnemySchema,
  type NormalizedExpedition,
  NormalizedExpeditionSchema,
  type NormalizedItem,
  NormalizedItemSchema,
  type NormalizedLocation,
  NormalizedLocationSchema,
  type NormalizedMerchant,
  NormalizedMerchantSchema,
  type NormalizedNPC,
  NormalizedNPCSchema,
  type NormalizedNightfarer,
  NormalizedNightfarerSchema,
  type NormalizedRelic,
  NormalizedRelicSchema,
  type NormalizedShield,
  NormalizedShieldSchema,
  type NormalizedSkill,
  NormalizedSkillSchema,
  type NormalizedSpell,
  NormalizedSpellSchema,
  type NormalizedTalisman,
  NormalizedTalismanSchema,
  type NormalizedWeapon,
  NormalizedWeaponSchema,
} from './schemas'
import type { ParsedContent } from './types'

/** Logger for normalizer operations */
const log = createLogger('normalizer')

/** Claude model to use for normalization */
const CLAUDE_MODEL = 'claude-3-5-haiku-20241022'

/** Maximum tokens for response */
const MAX_TOKENS = 2048

/** Batch size for concurrent requests */
const BATCH_SIZE = 5

/** Rate limit: requests per second */
const REQUESTS_PER_SECOND = 2

/** Delay between requests in ms */
const REQUEST_DELAY = Math.ceil(1000 / REQUESTS_PER_SECOND)

/**
 * Result of a normalization operation
 */
export type NormalizationResult<T> =
  | { success: true; data: T; chunks: ContentChunk[] }
  | { success: false; error: string }

/**
 * Combined type for all normalized content
 */
export type NormalizedContent =
  | NormalizedBoss
  | NormalizedWeapon
  | NormalizedRelic
  | NormalizedNightfarer
  | NormalizedSkill
  | NormalizedTalisman
  | NormalizedSpell
  | NormalizedArmor
  | NormalizedShield
  | NormalizedEnemy
  | NormalizedNPC
  | NormalizedMerchant
  | NormalizedLocation
  | NormalizedExpedition
  | NormalizedItem

/**
 * Claude Normalizer for content normalization
 *
 * Uses Claude's Structured Outputs feature for guaranteed
 * JSON schema compliance.
 */
export class ClaudeNormalizer {
  private client: Anthropic
  private limit: ReturnType<typeof pLimit>

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    })
    this.limit = pLimit(BATCH_SIZE)
  }

  /**
   * Normalize a single parsed content item
   */
  async normalize(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedContent>> {
    const contentType = parsed.type

    switch (contentType) {
      case 'boss':
        return this.normalizeBoss(parsed)
      case 'weapon':
        return this.normalizeWeapon(parsed)
      case 'relic':
        return this.normalizeRelic(parsed)
      case 'nightfarer':
        return this.normalizeNightfarer(parsed)
      case 'skill':
        return this.normalizeSkill(parsed)
      case 'talisman':
        return this.normalizeTalisman(parsed)
      case 'spell':
        return this.normalizeSpell(parsed)
      case 'armor':
        return this.normalizeArmor(parsed)
      case 'shield':
        return this.normalizeShield(parsed)
      case 'enemy':
        return this.normalizeEnemy(parsed)
      case 'npc':
        return this.normalizeNPC(parsed)
      case 'merchant':
        return this.normalizeMerchant(parsed)
      case 'location':
        return this.normalizeLocation(parsed)
      case 'expedition':
        return this.normalizeExpedition(parsed)
      case 'item':
        return this.normalizeItem(parsed)
      default:
        return {
          success: false,
          error: `Unknown content type: ${contentType}`,
        }
    }
  }

  /**
   * Normalize a batch of parsed content items
   *
   * Uses Promise.all for concurrent processing with proper counter handling
   * after all tasks complete (avoiding race conditions on shared counters).
   */
  async normalizeBatch(
    items: ParsedContent[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Map<string, NormalizationResult<NormalizedContent>>> {
    const results = new Map<string, NormalizationResult<NormalizedContent>>()

    log.info('Starting batch normalization', { totalItems: items.length })

    // Track completed count using index-based progress to avoid race conditions
    // Each task knows its position and reports after completion
    const tasks = items.map((item, index) =>
      this.limit(async () => {
        // Add rate limiting delay
        await this.delay(REQUEST_DELAY)

        const result = await this.normalize(item)

        // Log individual result
        if (result.success) {
          log.info('Normalized item', { name: item.name, type: item.type })
        } else {
          log.error('Failed to normalize item', null, {
            name: item.name,
            type: item.type,
            error: result.error,
          })
        }

        // Report progress using index + 1 (item's position in queue)
        // Note: Progress may arrive out of order but final count is always accurate
        onProgress?.(index + 1, items.length)

        // Return result with item name for mapping
        return { name: item.name, result }
      }),
    )

    // Wait for all tasks to complete
    const taskResults = await Promise.all(tasks)

    // Build results map and count successes/errors after all tasks complete
    let successCount = 0
    let errorCount = 0

    for (const { name, result } of taskResults) {
      results.set(name, result)
      if (result.success) {
        successCount++
      } else {
        errorCount++
      }
    }

    log.info('Batch normalization complete', {
      totalItems: items.length,
      successCount,
      errorCount,
    })

    return results
  }

  /**
   * Normalize boss content
   */
  private async normalizeBoss(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedBoss>> {
    const prompt = this.buildNormalizationPrompt('boss', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedBossSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      // Build overview text, handling empty values gracefully
      const locationPart = response.data.location
        ? ` located in ${response.data.location}`
        : ''
      const weaknessesPart =
        response.data.weaknesses.length > 0
          ? ` Weaknesses: ${response.data.weaknesses.join(', ')}.`
          : ''
      const overviewText = `${response.data.name} is a ${response.data.category}${locationPart}.${weaknessesPart}`

      const chunks = this.generateChunks('boss', response.data.name, {
        overview: overviewText,
        strategy: response.data.strategies || '',
        rewards: response.data.rewards || '',
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize weapon content
   */
  private async normalizeWeapon(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedWeapon>> {
    const prompt = this.buildNormalizationPrompt('weapon', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedWeaponSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const statsText = this.formatWeaponStats(response.data.stats)
      const scalingText = this.formatWeaponScaling(response.data.scaling)

      const chunks = this.generateChunks('weapon', response.data.name, {
        overview: `${response.data.name} is a ${response.data.type}. ${response.data.description}`,
        stats: `Stats: ${statsText}. Scaling: ${scalingText}`,
        skill: `Weapon Skill: ${response.data.skill}`,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize relic content
   */
  private async normalizeRelic(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedRelic>> {
    const prompt = this.buildNormalizationPrompt('relic', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedRelicSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('relic', response.data.name, {
        overview: `${response.data.name} is a ${response.data.color} ${response.data.tier} relic.`,
        effects: `Effects: ${response.data.effects.join('; ')}`,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize nightfarer content
   */
  private async normalizeNightfarer(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedNightfarer>> {
    const prompt = this.buildNormalizationPrompt('nightfarer', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedNightfarerSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const statsText = this.formatNightfarerStats(response.data.stats)

      // Build chunk sections, only including optional fields if they exist
      const chunkSections: Record<string, string> = {
        overview: `${response.data.name} starting stats: ${statsText}`,
      }

      if (response.data.passive) {
        chunkSections.passive = `Passive: ${response.data.passive}`
      }
      if (response.data.skill) {
        chunkSections.skill = `Skill: ${response.data.skill}`
      }
      if (response.data.ultimate) {
        chunkSections.ultimate = `Ultimate: ${response.data.ultimate}`
      }
      if (response.data.vessel) {
        chunkSections.vessel = `Vessel: ${response.data.vessel}`
      }

      const chunks = this.generateChunks(
        'nightfarer',
        response.data.name,
        chunkSections,
      )

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize skill content
   */
  private async normalizeSkill(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedSkill>> {
    const prompt = this.buildNormalizationPrompt('skill', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedSkillSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('skill', response.data.name, {
        overview: `${response.data.name} (${response.data.fpCost} FP). Compatible with: ${response.data.weaponTypes.join(', ')}.`,
        effect: response.data.effect,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize talisman content
   */
  private async normalizeTalisman(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedTalisman>> {
    const prompt = this.buildNormalizationPrompt('talisman', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedTalismanSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('talisman', response.data.name, {
        overview: `${response.data.name}${response.data.weight ? ` (Weight: ${response.data.weight})` : ''}. Location: ${response.data.location}`,
        effect: response.data.effect,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize spell content
   */
  private async normalizeSpell(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedSpell>> {
    const prompt = this.buildNormalizationPrompt('spell', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedSpellSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('spell', response.data.name, {
        overview: `${response.data.name} is a ${response.data.spellType} that costs ${response.data.fpCost} FP and requires ${response.data.slots} slot(s).`,
        effect: response.data.effect,
        requirements: `Requirements: ${response.data.requirements}. Location: ${response.data.location}`,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize armor content
   */
  private async normalizeArmor(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedArmor>> {
    const prompt = this.buildNormalizationPrompt('armor', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedArmorSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('armor', response.data.name, {
        overview: `${response.data.name} is ${response.data.slot} armor${response.data.weight ? ` weighing ${response.data.weight}` : ''}${response.data.poise ? ` with ${response.data.poise} poise` : ''}.`,
        defense: `Damage Negation: ${response.data.damageNegation}. Resistances: ${response.data.resistance}`,
        location: `Location: ${response.data.location}`,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize shield content
   */
  private async normalizeShield(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedShield>> {
    const prompt = this.buildNormalizationPrompt('shield', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedShieldSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('shield', response.data.name, {
        overview: `${response.data.name} is a ${response.data.shieldType}${response.data.weight ? ` weighing ${response.data.weight}` : ''}${response.data.guardBoost ? ` with ${response.data.guardBoost} guard boost` : ''}.`,
        skill: `Skill: ${response.data.skill}. Requirements: ${response.data.requirements}`,
        location: `Location: ${response.data.location}`,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize enemy content
   */
  private async normalizeEnemy(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedEnemy>> {
    const prompt = this.buildNormalizationPrompt('enemy', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedEnemySchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('enemy', response.data.name, {
        overview: `${response.data.name} is a ${response.data.category} enemy found in ${response.data.locations.join(', ')}.`,
        weaknesses: `Weaknesses: ${response.data.weaknesses.join(', ')}. Drops: ${response.data.drops.join(', ')}`,
        strategies: response.data.strategies,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize NPC content
   */
  private async normalizeNPC(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedNPC>> {
    const prompt = this.buildNormalizationPrompt('npc', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedNPCSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('npc', response.data.name, {
        overview: `${response.data.name} is a ${response.data.role} located at ${response.data.location}.`,
        quests:
          response.data.quests.length > 0
            ? `Quests: ${response.data.quests.join(', ')}`
            : '',
        services:
          response.data.services.length > 0
            ? `Services: ${response.data.services.join(', ')}`
            : '',
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize merchant content
   */
  private async normalizeMerchant(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedMerchant>> {
    const prompt = this.buildNormalizationPrompt('merchant', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedMerchantSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      // Format inventory items as string for chunk generation
      const inventoryStr = response.data.inventory
        .map((item) => `${item.name} (${item.price} ${item.currency})`)
        .join(', ')

      const chunks = this.generateChunks('merchant', response.data.name, {
        overview: `${response.data.name} is located at ${response.data.location}.`,
        inventory: inventoryStr || 'No items listed',
        notableItems:
          response.data.notableItems.length > 0
            ? `Notable Items: ${response.data.notableItems.join(', ')}`
            : '',
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize location content
   */
  private async normalizeLocation(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedLocation>> {
    const prompt = this.buildNormalizationPrompt('location', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedLocationSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('location', response.data.name, {
        overview: `${response.data.name} is located in ${response.data.region}. ${response.data.description}`,
        enemies:
          response.data.enemies.length > 0
            ? `Enemies: ${response.data.enemies.join(', ')}`
            : '',
        bosses:
          response.data.bosses.length > 0
            ? `Bosses: ${response.data.bosses.join(', ')}`
            : '',
        items:
          response.data.notableItems.length > 0
            ? `Notable Items: ${response.data.notableItems.join(', ')}`
            : '',
        connections:
          response.data.connections.length > 0
            ? `Connections: ${response.data.connections.join(', ')}`
            : '',
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize expedition content
   */
  private async normalizeExpedition(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedExpedition>> {
    const prompt = this.buildNormalizationPrompt('expedition', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedExpeditionSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      const chunks = this.generateChunks('expedition', response.data.name, {
        overview: `${response.data.name} is a ${response.data.difficulty} expedition${response.data.recommendedLevel ? ` (recommended level ${response.data.recommendedLevel})` : ''}.`,
        objectives: `Objectives: ${response.data.objectives.join(', ')}`,
        rewards: `Rewards: ${response.data.rewards.join(', ')}`,
        locations: `Locations: ${response.data.locations.join(', ')}`,
        strategies: response.data.strategies,
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Normalize item content (Key Items, Consumables, Materials)
   */
  private async normalizeItem(
    parsed: ParsedContent,
  ): Promise<NormalizationResult<NormalizedItem>> {
    const prompt = this.buildNormalizationPrompt('item', parsed)

    try {
      const response = await this.callClaude(prompt, NormalizedItemSchema)

      if (!response.success) {
        return { success: false, error: response.error }
      }

      // Build locations text
      const locationsText =
        response.data.locations.length > 0
          ? response.data.locations.join('; ')
          : 'Unknown'

      // Build purchase info if available
      const purchaseText = response.data.purchaseLocations
        ? response.data.purchaseLocations
            .map((p) => `${p.merchantName}: ${p.price} runes`)
            .join('; ')
        : ''

      const chunks = this.generateChunks('item', response.data.name, {
        overview: `${response.data.name} is a ${response.data.category}.`,
        effect: `Effect: ${response.data.effect}`,
        locations: `Where to find: ${locationsText}`,
        ...(purchaseText && { purchase: `Purchase: ${purchaseText}` }),
      })

      return { success: true, data: response.data, chunks }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Call Claude API with structured output
   */
  private async callClaude<T extends z.ZodType>(
    prompt: string,
    schema: T,
  ): Promise<
    { success: true; data: z.infer<T> } | { success: false; error: string }
  > {
    const startTime = Date.now()

    try {
      log.debug('Calling Claude API', {
        model: CLAUDE_MODEL,
        promptLength: prompt.length,
      })

      const response = await this.client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const durationMs = Date.now() - startTime

      // Extract text content from response
      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        log.error('No text response from Claude', null, { durationMs })
        return { success: false, error: 'No text response from Claude' }
      }

      // Parse and validate with Zod
      const parsed = JSON.parse(textBlock.text)
      const validated = schema.parse(parsed)

      log.debug('Claude API call successful', {
        durationMs,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      })

      return { success: true, data: validated }
    } catch (error) {
      const durationMs = Date.now() - startTime

      if (error instanceof SyntaxError) {
        log.error('Invalid JSON response from Claude', error, { durationMs })
        return { success: false, error: 'Invalid JSON response from Claude' }
      }
      if (error instanceof Error && error.name === 'ZodError') {
        log.error('Schema validation failed', error, { durationMs })
        return {
          success: false,
          error: `Schema validation failed: ${error.message}`,
        }
      }

      log.error('Claude API call failed', error, { durationMs })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown API error',
      }
    }
  }

  /**
   * Build the normalization prompt for Claude
   */
  private buildNormalizationPrompt(
    contentType: ContentType,
    parsed: ParsedContent,
  ): string {
    const systemContext = `You are a data normalization assistant for Elden Ring Nightreign game content.
Your task is to extract and normalize structured data from parsed wiki content.
Always respond with valid JSON matching the exact schema provided.
IMPORTANT: For optional fields, OMIT them entirely if the data is unknown - do NOT use null values.
If information is missing, use reasonable defaults or empty values for required fields only.
Generate relevant tags for search filtering based on the content.`

    const schemaDescription = this.getSchemaDescription(contentType)

    return `${systemContext}

Content Type: ${contentType}

Parsed Content:
${JSON.stringify(parsed, null, 2)}

${schemaDescription}

Respond with ONLY a valid JSON object matching the schema above. No explanation or markdown.`
  }

  /**
   * Get schema description for a content type
   */
  private getSchemaDescription(contentType: ContentType): string {
    const descriptions: Record<string, string> = {
      boss: `Output Schema (omit optional fields if data not available - do NOT use null):
{
  "name": "string - boss name (required)",
  "category": "string - Night Lord, Night Boss, Field Boss, or Mini Boss (required)",
  "location": "string - where the boss is found (required, use empty string if unknown)",
  "weaknesses": ["array of damage types the boss is weak to (required, can be empty)"],
  "phases": [{"name": "Phase 1", "description": "what happens", "threshold": "50%" as string}],
  "strategies": "string - combined strategy tips (required, can be empty)",
  "rewards": "string - comma-separated list of rewards (required, can be empty)",
  "hpByPlayerCount": {"solo": 10000, "duo": 15000, "trio": 20000} (optional - omit if unknown),
  "stance": 80 (optional number - omit if unknown),
  "parryInfo": {"canParry": true, "parriesRequired": 3} (optional - omit if unknown),
  "damageNegation": {"phase1": {"standard": 10, "slash": 15, ...}} (optional - omit if unknown),
  "statusResistances": {"poison": {"immune": false, "value": 252}} (optional - omit if unknown),
  "strongerVs": ["array of damage types boss resists"] (optional - omit if unknown),
  "damageTypesDealt": ["array of damage types boss deals"] (optional - omit if unknown),
  "statusEffectsInflicted": ["array of status effects boss inflicts"] (optional - omit if unknown),
  "tags": ["array of search tags like fire-weak, parryable, etc (required)"]
}`,
      weapon: `Output Schema:
{
  "name": "string - weapon name",
  "type": "string - Katana, Greatsword, Staff, etc",
  "stats": {"physicalDamage": 100, "magicDamage": 0, ...},
  "scaling": {"strength": "C", "dexterity": "B", ...},
  "skill": "string - weapon skill name",
  "description": "string - flavor text",
  "tags": ["array of search tags like katana, dex-weapon, etc"]
}`,
      relic: `Output Schema:
{
  "name": "string - relic name",
  "color": "string - Red, Green, Blue, or Yellow",
  "tier": "string - Delicate, Polished, or Grand",
  "effects": ["array of effect descriptions"],
  "tags": ["array of search tags like spell-boost, defensive, etc"]
}`,
      nightfarer: `Output Schema (IMPORTANT: omit optional fields if data not found - do NOT use null or empty strings):
{
  "name": "string - class name (required)",
  "stats": {"vigor": 10, "mind": 10, "endurance": 10, "strength": 10, "dexterity": 10, "intelligence": 10, "faith": 10, "arcane": 10} (required),
  "passive": "string - passive ability name and description (optional - OMIT if not found)",
  "skill": "string - active skill name and description (optional - OMIT if not found)",
  "ultimate": "string - ultimate ability name and description (optional - OMIT if not found)",
  "vessel": "string - starting equipment/vessel description (optional - OMIT if not found)",
  "tags": ["array of search tags like melee, spellcaster, tank, support, etc (required)"]
}

Note: This schema is for nightfarer CLASS pages only. If the content is not about a playable nightfarer class (e.g., it's a skill, ability, spell, or item page), still extract what you can but omit fields that don't apply.`,
      skill: `Output Schema:
{
  "name": "string - skill name",
  "fpCost": 20,
  "weaponTypes": ["array of compatible weapon types"],
  "effect": "string - skill effect description",
  "tags": ["array of search tags like aoe, buff, damage, etc"]
}`,
      talisman: `Output Schema:
{
  "name": "string - talisman name",
  "effect": "string - effect description",
  "weight": 1.0,
  "location": "string - where to find it",
  "tags": ["array of search tags"]
}`,
      spell: `Output Schema:
{
  "name": "string - spell name",
  "spellType": "string - Sorcery or Incantation",
  "fpCost": 20,
  "slots": 1,
  "effect": "string - description of the spell effect",
  "requirements": "string - attribute requirements to cast (e.g., Int 20)",
  "location": "string - where to find the spell",
  "tags": ["array of search tags like sorcery, aoe, buff, etc"]
}`,
      armor: `Output Schema:
{
  "name": "string - armor piece name",
  "slot": "string - Head, Chest, Arms, or Legs",
  "weight": 5.0,
  "poise": 10,
  "damageNegation": "string - summary of damage negation stats",
  "resistance": "string - summary of resistance stats",
  "location": "string - where to find the armor",
  "tags": ["array of search tags like heavy, light, high-poise, etc"]
}`,
      shield: `Output Schema:
{
  "name": "string - shield name",
  "shieldType": "string - Small, Medium, or Greatshield",
  "weight": 5.0,
  "guardBoost": 50,
  "skill": "string - associated weapon skill name",
  "requirements": "string - attribute requirements to wield",
  "location": "string - where to find the shield",
  "tags": ["array of search tags like greatshield, parry, 100-block, etc"]
}`,
      enemy: `Output Schema:
{
  "name": "string - enemy name",
  "category": "string - Humanoid, Beast, Undead, Dragon, etc",
  "locations": ["array of locations where this enemy is found"],
  "weaknesses": ["array of damage types the enemy is weak to"],
  "drops": ["array of items dropped by this enemy"],
  "strategies": "string - tips for defeating this enemy",
  "tags": ["array of search tags like undead, ranged, aggressive, etc"]
}`,
      npc: `Output Schema:
{
  "name": "string - NPC name",
  "role": "string - Quest Giver, Vendor, Ally, etc",
  "location": "string - where to find the NPC",
  "quests": ["array of quests this NPC is involved in"],
  "services": ["array of services offered by this NPC"],
  "tags": ["array of search tags like vendor, quest-giver, summon, etc"]
}`,
      merchant: `Output Schema:
{
  "name": "string - merchant name",
  "location": "string - where to find the merchant",
  "inventory": "string - summary of items sold",
  "notableItems": ["array of notable items available for purchase"],
  "tags": ["array of search tags like weapons, spells, armor, etc"]
}`,
      location: `Output Schema:
{
  "name": "string - location name",
  "region": "string - region this location belongs to",
  "description": "string - description of the location",
  "notableItems": ["array of notable items found here"],
  "enemies": ["array of enemies found here"],
  "bosses": ["array of bosses found here"],
  "connections": ["array of connected locations"],
  "tags": ["array of search tags like dungeon, legacy, overworld, etc"]
}`,
      expedition: `Output Schema:
{
  "name": "string - expedition name",
  "difficulty": "string - difficulty level",
  "recommendedLevel": 50,
  "objectives": ["array of main objectives"],
  "rewards": ["array of rewards for completion"],
  "locations": ["array of locations involved"],
  "strategies": "string - tips for completing the expedition",
  "tags": ["array of search tags like co-op, hard, short, etc"]
}`,
      item: `Output Schema:
{
  "name": "string - item name",
  "category": "string - Key Item, Consumable, Crafting Material, Upgrade Material, etc.",
  "effect": "string - what the item does or its purpose",
  "locations": ["array of ALL known locations where item can be found - include details like region, building type, etc."],
  "uses": 1 (optional number - omit for key items or unlimited use items),
  "purchaseLocations": [{"merchantName": "Spirit Merchant", "location": "Limgrave", "price": 5000, "stock": 3}] (optional - only if sold by merchants),
  "tags": ["array of search tags like key-item, unlock, imp-statue, consumable, material, etc."]
}

IMPORTANT: For location data, extract ALL location information from the content. This includes:
- Great Churches, Forts, Ruins where the item can be found
- Merchants who sell it (include in both locations and purchaseLocations)
- Any drop sources from enemies
- Region names (Limgrave, Liurnia, etc.)`,
    }

    return descriptions[contentType] || ''
  }

  /**
   * Generate content chunks for search indexing
   */
  private generateChunks(
    type: ContentType,
    name: string,
    sections: Record<string, string>,
  ): ContentChunk[] {
    const chunks: ContentChunk[] = []

    for (const [section, content] of Object.entries(sections)) {
      if (content?.trim()) {
        chunks.push({
          type,
          name,
          section,
          content: content.trim(),
          tags: [], // Tags will be derived from the parent content
        })
      }
    }

    return chunks
  }

  /**
   * Format weapon stats for display
   */
  private formatWeaponStats(stats: NormalizedWeapon['stats']): string {
    const parts: string[] = []
    if (stats.physicalDamage) parts.push(`Physical: ${stats.physicalDamage}`)
    if (stats.magicDamage) parts.push(`Magic: ${stats.magicDamage}`)
    if (stats.fireDamage) parts.push(`Fire: ${stats.fireDamage}`)
    if (stats.lightningDamage) parts.push(`Lightning: ${stats.lightningDamage}`)
    if (stats.holyDamage) parts.push(`Holy: ${stats.holyDamage}`)
    if (stats.critical) parts.push(`Crit: ${stats.critical}`)
    return parts.join(', ') || 'None'
  }

  /**
   * Format weapon scaling for display
   */
  private formatWeaponScaling(scaling: NormalizedWeapon['scaling']): string {
    const parts: string[] = []
    if (scaling.strength) parts.push(`Str: ${scaling.strength}`)
    if (scaling.dexterity) parts.push(`Dex: ${scaling.dexterity}`)
    if (scaling.intelligence) parts.push(`Int: ${scaling.intelligence}`)
    if (scaling.faith) parts.push(`Fai: ${scaling.faith}`)
    if (scaling.arcane) parts.push(`Arc: ${scaling.arcane}`)
    return parts.join(', ') || 'None'
  }

  /**
   * Format nightfarer stats for display
   */
  private formatNightfarerStats(stats: NormalizedNightfarer['stats']): string {
    const parts: string[] = []
    if (stats.vigor) parts.push(`Vig: ${stats.vigor}`)
    if (stats.mind) parts.push(`Min: ${stats.mind}`)
    if (stats.endurance) parts.push(`End: ${stats.endurance}`)
    if (stats.strength) parts.push(`Str: ${stats.strength}`)
    if (stats.dexterity) parts.push(`Dex: ${stats.dexterity}`)
    if (stats.intelligence) parts.push(`Int: ${stats.intelligence}`)
    if (stats.faith) parts.push(`Fai: ${stats.faith}`)
    if (stats.arcane) parts.push(`Arc: ${stats.arcane}`)
    return parts.join(', ') || 'None'
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Create a new Claude normalizer instance
 */
export function createNormalizer(apiKey?: string): ClaudeNormalizer {
  return new ClaudeNormalizer(apiKey)
}
