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
    default:
      return 'general'
  }
}

/**
 * Base system prompt for all queries
 */
const BASE_SYSTEM_PROMPT = `You are a helpful assistant for Elden Ring Nightreign, a co-op multiplayer roguelike spinoff.
Be concise and accurate. Use the provided context to answer questions.
If the context doesn't contain relevant information, say so briefly.
Keep responses under 100 words unless more detail is specifically needed.`

/**
 * Template for boss-related queries
 *
 * Produces numbered steps for strategies and phase breakdowns.
 */
export const BOSS_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For boss questions:
- List attack patterns and phases as numbered steps
- Highlight key weaknesses and resistances
- Provide tactical advice in bullet points
- Mention recommended player count if known`,

  formatInstructions: `Format your response as:
1. **Overview**: Brief boss description (1 sentence)
2. **Weaknesses**: Elemental/damage type weaknesses
3. **Strategy**: Numbered steps for each phase
4. **Tips**: 2-3 bullet points with tactical advice`,
}

/**
 * Template for weapon-related queries
 *
 * Produces markdown tables for stats and scaling.
 */
export const WEAPON_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For weapon questions:
- Present stats in a clear format
- Explain scaling letters (S/A/B/C/D/E)
- Describe the weapon's unique skill
- Compare to similar weapons if relevant`,

  formatInstructions: `Format your response as:
| Stat | Value |
|------|-------|
| Attack | ... |
| Scaling | ... |

**Unique Skill**: Description
**Best For**: Recommended playstyle/builds`,
}

/**
 * Template for relic-related queries
 *
 * Produces bullet points for effects and combinations.
 */
export const RELIC_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For relic questions:
- Explain the relic's effect clearly
- Note the color/tier (affects rarity)
- Mention synergies with other relics
- Describe when the effect triggers`,

  formatInstructions: `Format your response as:
**Effect**: Main effect description
**Color/Tier**: Rarity indicator
**Synergies**: Works well with...
**Notes**: Any special conditions`,
}

/**
 * Template for skill-related queries
 *
 * Produces detailed skill breakdowns.
 */
export const SKILL_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For skill questions:
- Describe what the skill does
- Note FP cost and cooldown if known
- List compatible weapon types
- Explain optimal usage situations`,

  formatInstructions: `Format your response as:
**Description**: What the skill does
**FP Cost**: Resource cost
**Compatible Weapons**: Weapon types
**Best Used**: Optimal situations`,
}

/**
 * Template for Nightfarer/character queries
 *
 * Produces character stat and ability overviews.
 */
export const NIGHTFARER_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For Nightfarer/character questions:
- Describe the character's playstyle
- List their unique passive ability
- Explain their skill and ultimate
- Note their starting stats/equipment`,

  formatInstructions: `Format your response as:
**Playstyle**: Brief description
**Passive**: Unique passive ability
**Skill**: Active skill description
**Ultimate**: Ultimate ability
**Stats**: Starting stats or build recommendations`,
}

/**
 * Template for general queries
 *
 * Produces flexible bullet-point responses.
 */
export const GENERAL_TEMPLATE = {
  systemPrompt: BASE_SYSTEM_PROMPT,

  formatInstructions: `Format your response with:
- Clear headers for different topics
- Bullet points for lists
- Bold for important terms
- Keep it scannable and concise`,
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
 * @param results - Array of search results
 * @returns Formatted context string
 */
export function formatResultsAsContext(
  results: Array<{
    type: ContentType
    name: string
    section: string
    content: string
  }>,
): string {
  if (results.length === 0) {
    return 'No relevant results found.'
  }

  return results
    .slice(0, 5) // Limit context to top 5 results
    .map(
      (result, i) =>
        `[${i + 1}] ${result.name} (${result.type})
Section: ${result.section}
${result.content}`,
    )
    .join('\n\n---\n\n')
}
