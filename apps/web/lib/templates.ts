/**
 * Format Templates for Search Results
 *
 * Defines prompt templates for different query types that produce
 * concise, well-formatted responses optimized for gaming reference.
 */

import type { ContentType } from '@nightreign/types'

/**
 * Query type detection result
 */
export type QueryType =
  | 'boss'
  | 'weapon'
  | 'relic'
  | 'skill'
  | 'nightfarer'
  | 'item'
  | 'general'

/**
 * Detect the query type based on search results
 *
 * Analyzes the types of content returned to determine the best
 * formatting template to use.
 *
 * @param resultTypes - Array of content types from search results
 * @returns The detected query type
 */
export function detectQueryType(resultTypes: ContentType[]): QueryType {
  if (resultTypes.length === 0) {
    return 'general'
  }

  // Count occurrences of each type
  const typeCounts: Record<string, number> = {}
  for (const type of resultTypes) {
    typeCounts[type] = (typeCounts[type] || 0) + 1
  }

  // Find the dominant type (most common)
  let dominantType = 'general'
  let maxCount = 0
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count
      dominantType = type
    }
  }

  // Map content type to query type
  switch (dominantType) {
    case 'boss':
      return 'boss'
    case 'weapon':
      return 'weapon'
    case 'relic':
      return 'relic'
    case 'skill':
      return 'skill'
    case 'nightfarer':
      return 'nightfarer'
    case 'item':
      return 'item'
    default:
      return 'general'
  }
}

/**
 * Base system prompt for all queries
 *
 * Key principles:
 * - NO REDUNDANCY: Never repeat the same information twice
 * - ACTIONABLE: Include specific numbers, percentages, recommendations
 * - STRUCTURED: Use clear formatting with headers and lists
 * - CROSS-REFERENCE: Suggest related content when relevant
 */
const BASE_SYSTEM_PROMPT = `You are a game wiki assistant for Elden Ring Nightreign, a co-op multiplayer roguelike spinoff.

CRITICAL RULES:
1. NO REDUNDANCY - Never repeat information. State each fact exactly once.
2. BE SPECIFIC - Use exact numbers/percentages when available (e.g., "35% fire weakness" not "weak to fire")
3. BE ACTIONABLE - Give specific recommendations (weapon names, item names) not generic advice
4. CROSS-REFERENCE - Mention related content types (e.g., for weakness, suggest weapons that deal that damage)

FORMAT:
- Use markdown headers, bullet points, and bold for key terms
- Keep responses focused and scannable (150-250 words)
- If data is missing, say "Unknown" once, don't apologize or elaborate`

/**
 * Template for boss-related queries
 *
 * Produces numbered steps for strategies and phase breakdowns.
 */
export const BOSS_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For boss/enemy questions:
- Weaknesses MUST include: damage type + effectiveness (e.g., "Fire: +35% damage")
- Resistances MUST include: damage type + reduction (e.g., "Holy: -60% damage")
- Recommend 2-3 specific weapons/items that exploit weaknesses
- If weakness percentages aren't in context, say "Fire (effectiveness unknown)"`,

  formatInstructions: `Format your response as:

## Weaknesses
- **[Damage Type]**: [+X% damage / effective] - *Recommended: [2-3 specific weapons/items]*

## Resistances
- **[Damage Type]**: [Reduced/Immune]

## Strategy
1. [Phase/tactic with specific action]

## Quick Tips
- [One actionable tip per bullet]`,
}

/**
 * Template for weapon-related queries
 *
 * Produces markdown tables for stats and scaling.
 */
export const WEAPON_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For weapon questions:
- Include exact stat numbers when available
- Scaling: explain what stats it scales with (STR/DEX/INT/FTH/ARC) and grade (S/A/B/C/D/E)
- Mention what damage types it deals (physical, fire, magic, etc.)
- Suggest bosses/enemies this weapon is effective against`,

  formatInstructions: `Format your response as:

## Stats
| Stat | Value |
|------|-------|
| Base Attack | [number] |
| Scaling | [STR:X / DEX:X / etc.] |
| Damage Type | [Physical/Fire/etc.] |

## Skill
**[Skill Name]**: [What it does, FP cost if known]

## Best Against
- [Enemy/boss types weak to this damage type]

## Build Recommendation
- [Stat requirements and playstyle]`,
}

/**
 * Template for relic-related queries
 *
 * Produces bullet points for effects and combinations.
 */
export const RELIC_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For relic questions:
- State the exact effect with numbers (e.g., "+15% damage" not "increases damage")
- Specify trigger conditions precisely
- Name 2-3 specific relics that synergize well
- Mention which Nightfarers/builds benefit most`,

  formatInstructions: `Format your response as:

## Effect
**[Relic Name]** ([Color/Tier])
- [Exact effect with percentages/numbers]
- Trigger: [When/how it activates]

## Synergies
- **[Relic Name]**: [Why they work together]

## Best For
- [Specific Nightfarers or playstyles]`,
}

/**
 * Template for skill-related queries
 *
 * Produces detailed skill breakdowns.
 */
export const SKILL_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For skill questions:
- Include FP cost as exact number
- Specify damage type dealt by the skill
- Name specific weapons that can use this skill
- Describe combo potential with other skills/items`,

  formatInstructions: `Format your response as:

## [Skill Name]
**FP Cost**: [number] | **Damage Type**: [type]

## How It Works
[1-2 sentences explaining the skill mechanics]

## Compatible Weapons
- [Specific weapon names that can equip this]

## Combat Tips
- [When to use it, combo potential]`,
}

/**
 * Template for Nightfarer/character queries
 *
 * Produces character stat and ability overviews.
 */
export const NIGHTFARER_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For Nightfarer/character questions:
- Include starting stat values if available
- Describe passive effect with exact numbers
- Explain skill/ultimate cooldowns and effects
- Suggest specific relics and weapons that synergize`,

  formatInstructions: `Format your response as:

## [Nightfarer Name]
**Playstyle**: [Aggressive/Defensive/Support/etc.]

## Abilities
- **Passive**: [Name] - [Effect with numbers]
- **Skill**: [Name] - [Effect, cooldown]
- **Ultimate**: [Name] - [Effect]

## Recommended Loadout
- **Weapons**: [2-3 specific weapons]
- **Relics**: [2-3 synergistic relics]

## Team Role
[How they fit in co-op, who they pair well with]`,
}

/**
 * Template for item-related queries
 *
 * Produces item information with locations and usage.
 */
export const ITEM_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For item questions (consumables, key items, materials):
- Clearly state what the item does and when to use it
- CRITICAL: Extract ALL location data from context sections labeled "locations" or containing "Where to find"
- Combine location info from ALL context entries - items may appear multiple times with different sections
- List EVERY location mentioned (e.g., "Great Church", "Forts", "Spirit Merchant", etc.)
- NEVER write "Location: N/A" or "Unknown" if ANY location data exists in the context
- Include quantity or method (chest, purchase, drop) when mentioned`,

  formatInstructions: `Format your response as:

## [Item Name]
**Type**: [Key Item/Consumable/Material] | **Uses**: [number or "Unlimited"]

## Effect
[What the item does - be specific]

## Where to Find
Extract ALL locations from the context. Look for:
- Sections labeled "locations" or containing "Where to find"
- Any mentions of specific places (Churches, Forts, Townships, Merchants, etc.)

Format as:
- **[Location Name]**: [How to get it - chest, purchase, drop, etc.]
- **[Another Location]**: [Details]

## Tips
- [When to use it, whether to save it, etc.]`,
}

/**
 * Template for general queries
 *
 * Produces flexible bullet-point responses.
 */
export const GENERAL_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For general questions:
- Lead with the direct answer, then explain
- Include specific names/numbers whenever possible
- Suggest related topics the user might want to explore`,

  formatInstructions: `Format your response with:
- **Direct answer first** (1-2 sentences)
- Supporting details in bullet points
- Bold key terms and names
- End with "**Related**: [topic1], [topic2]" if applicable`,
}

/**
 * Get the appropriate template for a query type
 *
 * @param queryType - The detected query type
 * @returns The template with system prompt and format instructions
 */
export function getTemplate(queryType: QueryType): {
  systemPrompt: string
  formatInstructions: string
} {
  switch (queryType) {
    case 'boss':
      return BOSS_TEMPLATE
    case 'weapon':
      return WEAPON_TEMPLATE
    case 'relic':
      return RELIC_TEMPLATE
    case 'skill':
      return SKILL_TEMPLATE
    case 'nightfarer':
      return NIGHTFARER_TEMPLATE
    case 'item':
      return ITEM_TEMPLATE
    default:
      return GENERAL_TEMPLATE
  }
}

/**
 * Maximum query length after sanitization
 */
const MAX_QUERY_LENGTH = 500

/**
 * Sanitize user query to prevent prompt injection
 *
 * Removes characters and patterns that could be used to manipulate LLM behavior:
 * - Curly braces (template syntax)
 * - Angle brackets (pseudo-XML injection)
 * - Square brackets (markdown links, potential injection vectors)
 * - Backticks (code blocks that could escape context)
 * - Hash sequences (markdown headers)
 * - Excessive newlines/whitespace (context manipulation)
 * - Common prompt injection phrases
 *
 * @param query - Raw user query
 * @returns Sanitized query safe for prompt inclusion
 */
function sanitizeQuery(query: string): string {
  return (
    query
      // Remove curly braces (could be template syntax)
      .replace(/[{}]/g, '')
      // Remove angle brackets (could be pseudo-XML injection)
      .replace(/[<>]/g, '')
      // Remove square brackets (markdown links, injection vectors)
      .replace(/[\[\]]/g, '')
      // Remove backticks (code blocks could escape context)
      .replace(/`/g, '')
      // Remove hash at start of lines (markdown headers)
      .replace(/^#+\s*/gm, '')
      // Remove common prompt injection patterns
      .replace(/ignore\s+(previous|above|all)\s+instructions?/gi, '')
      .replace(/system\s*:/gi, '')
      .replace(/assistant\s*:/gi, '')
      .replace(/user\s*:/gi, '')
      // Collapse multiple newlines/spaces into single space
      .replace(/\s+/g, ' ')
      // Trim and limit length
      .trim()
      .slice(0, MAX_QUERY_LENGTH)
  )
}

/**
 * Build the full prompt for Groq completion
 *
 * @param query - User's search query (will be sanitized)
 * @param context - Search results context
 * @param queryType - Detected query type
 * @returns Object with systemPrompt and userMessage
 */
export function buildPrompt(
  query: string,
  context: string,
  queryType: QueryType,
): { systemPrompt: string; userMessage: string } {
  const template = getTemplate(queryType)
  const sanitizedQuery = sanitizeQuery(query)

  return {
    systemPrompt: template.systemPrompt,
    userMessage: `Context from search results:
${context}

User question: ${sanitizedQuery}

${template.formatInstructions}

Provide a helpful, concise answer:`,
  }
}

/**
 * Format search results into context string
 *
 * Groups multiple chunks from the same item together to help the LLM
 * synthesize information across sections (e.g., overview + locations).
 *
 * @param results - Array of search results with optional score
 * @returns Formatted context string with relevance indicators
 */
export function formatResultsAsContext(
  results: Array<{
    type: ContentType
    name: string
    section: string
    content: string
    score?: number
  }>,
): string {
  if (results.length === 0) {
    return 'No relevant results found.'
  }

  // Group results by name to combine chunks from same item
  const groupedByName = new Map<
    string,
    Array<{
      type: ContentType
      name: string
      section: string
      content: string
      score?: number
    }>
  >()

  // Take top 8 results to allow grouping while maintaining quality
  for (const result of results.slice(0, 8)) {
    const key = result.name
    if (!groupedByName.has(key)) {
      groupedByName.set(key, [])
    }
    groupedByName.get(key)?.push(result)
  }

  // Format grouped results
  let index = 0
  const formatted: string[] = []

  for (const [name, chunks] of groupedByName) {
    index++
    const bestScore = Math.max(...chunks.map((c) => c.score ?? 0))
    const type = chunks[0].type

    // Include relevance indicator based on best score
    const relevance =
      bestScore >= 0.8
        ? '[HIGH RELEVANCE]'
        : bestScore >= 0.5
          ? '[RELEVANT]'
          : '[PARTIAL MATCH]'

    // Combine all sections for this item
    const sections = chunks
      .map((chunk) => `[${chunk.section}]\n${chunk.content}`)
      .join('\n\n')

    formatted.push(`[${index}] ${name} (${type}) ${relevance}
${sections}`)
  }

  return formatted.join('\n\n---\n\n')
}
