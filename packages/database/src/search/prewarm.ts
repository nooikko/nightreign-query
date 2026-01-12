/**
 * Pre-warming Configuration for Search Cache
 *
 * Based on Fextralife wiki popularity analysis (Jan 2026):
 * - Most visited: Nightfarer classes, Boss strategies, Legendary weapons
 * - S-tier classes: Wylder, Executor, Duchess, Ironeye
 * - Common query patterns: class abilities, boss weaknesses, weapon builds
 *
 * Pre-warming these queries on server startup populates the embedding cache,
 * making the first user searches for these terms instant (0ms embedding time).
 */

import { getQueryEmbedder } from './embeddings'

/**
 * Popular queries derived from Fextralife traffic patterns.
 * Ordered by estimated search frequency.
 */
export const PREWARM_QUERIES = [
  // Tier 1: Nightfarer Classes (most searched category)
  'Wylder',
  'Wylder skill',
  'Wylder grapple',
  'Wylder ultimate',
  'Executor',
  'Executor bleed build',
  'Duchess',
  'Duchess stealth',
  'Ironeye',
  'Ironeye ranged',
  'Guardian',
  'Raider',
  'Recluse',
  'Revenant',
  'Scholar',
  'Undertaker',

  // Tier 2: Class comparison & tier list queries
  'best class',
  'best nightfarer',
  'tier list',
  'strongest class',
  'beginner class',
  'easiest class',
  'best solo class',
  'best co-op class',

  // Tier 3: Boss strategies (common Day 3 queries)
  'Gladius Beast of Night',
  'Adel Baron of Night',
  'Heolstor',
  'Night Lord',
  'final boss',
  'boss weaknesses',
  'boss strategy',
  'how to beat',

  // Tier 4: Legendary weapons (high optimization interest)
  'Blasphemous Blade',
  'Hand of Malenia',
  'Marais Executioner Sword',
  'Carian Regal Scepter',
  'Bolt of Gransax',
  'best weapon',
  'legendary weapon',
  'weapon scaling',

  // Tier 5: Build & mechanics queries
  'bleed build',
  'best build',
  'strength build',
  'dexterity build',
  'intelligence build',
  'faith build',
  'arcane build',

  // Tier 6: Progression systems
  'relics',
  'best relics',
  'vessels',
  'relic farming',
  'expedition',
  'difficulty',

  // Tier 7: Beginner questions
  'how to',
  'what is',
  'where to find',
  'beginner guide',
  'tips',

  // Tier 8: Common item queries
  'talisman',
  'spell',
  'skill',
  'armor',
  'shield',
] as const

/**
 * Pre-warm the embedding cache with popular queries.
 *
 * Call this on server startup to populate the cache before
 * the first user requests arrive.
 *
 * @returns Object with success count, failure count, and duration
 */
export async function prewarmEmbeddingCache(): Promise<{
  success: number
  failed: number
  durationMs: number
}> {
  const embedder = getQueryEmbedder()
  await embedder.initialize()

  const startTime = Date.now()
  let success = 0
  let failed = 0

  // Process queries in batches to avoid overwhelming the model
  const BATCH_SIZE = 5

  for (let i = 0; i < PREWARM_QUERIES.length; i += BATCH_SIZE) {
    const batch = PREWARM_QUERIES.slice(i, i + BATCH_SIZE)

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map((query) => embedder.embed(query))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        success++
      } else {
        failed++
        console.warn('Pre-warm failed for query:', result.reason)
      }
    }
  }

  const durationMs = Date.now() - startTime

  console.log(
    `Pre-warmed ${success}/${PREWARM_QUERIES.length} queries in ${durationMs}ms`
  )

  return { success, failed, durationMs }
}

/**
 * Get the current cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  const embedder = getQueryEmbedder()
  return {
    size: embedder.getCacheSize(),
    maxSize: 100, // From CACHE_MAX_SIZE in embeddings.ts
  }
}
