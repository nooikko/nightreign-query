/**
 * Storage Module
 *
 * Provides functions to store normalized content in SQLite via Prisma
 * and build/update the Orama search index.
 */

import { prisma } from '../client'
import { type OramaDocument, getOramaIndex } from '../search/orama'

/** Content type (duplicated here to avoid cross-package import issues) */
type ContentType =
  | 'boss'
  | 'weapon'
  | 'relic'
  | 'nightfarer'
  | 'skill'
  | 'talisman'
  | 'spell'
  | 'armor'
  | 'shield'
  | 'enemy'
  | 'npc'
  | 'merchant'
  | 'location'
  | 'expedition'
  | 'item'
  | 'guide'

/** Options for storage operations */
export interface StorageOptions {
  /** Whether to update Orama index after storing */
  updateIndex?: boolean
}

/** Result of a storage operation */
export interface StorageResult {
  success: boolean
  id?: string
  error?: string
}

/** Batch storage result */
export interface BatchStorageResult {
  total: number
  successful: number
  failed: number
  errors: Array<{ name: string; error: string }>
}

/**
 * Convert embedding to Uint8Array for Prisma Bytes field
 *
 * Note: We create a new ArrayBuffer copy to ensure Prisma compatibility
 */
function embeddingToBytes(
  embedding: Float32Array | number[],
): Uint8Array<ArrayBuffer> {
  const float32 =
    embedding instanceof Float32Array ? embedding : new Float32Array(embedding)
  // Create a copy with a regular ArrayBuffer (not SharedArrayBuffer)
  const buffer = new ArrayBuffer(float32.byteLength)
  const view = new Uint8Array(buffer)
  view.set(
    new Uint8Array(float32.buffer, float32.byteOffset, float32.byteLength),
  )
  return view
}

/**
 * Convert Uint8Array from Prisma to Float32Array
 */
export function bufferToEmbedding(bytes: Uint8Array): Float32Array {
  // Create a copy to ensure proper alignment
  const buffer = new ArrayBuffer(bytes.byteLength)
  const view = new Uint8Array(buffer)
  view.set(bytes)
  return new Float32Array(buffer)
}

/**
 * Store a boss in the database
 */
export async function storeBoss(
  data: {
    name: string
    category: string
    location: string
    weaknesses: string[]
    phases: Array<{ name: string; description: string; threshold?: string }>
    strategies: string
    rewards: string
    embedding?: Float32Array | number[]
    sourceUrl?: string
  },
  options: StorageOptions = {},
): Promise<StorageResult> {
  try {
    const boss = await prisma.boss.upsert({
      where: { name: data.name },
      update: {
        category: data.category,
        location: data.location,
        weaknesses: data.weaknesses,
        phases: data.phases,
        strategies: data.strategies,
        rewards: data.rewards,
        embedding: data.embedding
          ? embeddingToBytes(data.embedding)
          : undefined,
      },
      create: {
        name: data.name,
        category: data.category,
        location: data.location,
        weaknesses: data.weaknesses,
        phases: data.phases,
        strategies: data.strategies,
        rewards: data.rewards,
        embedding: data.embedding ? embeddingToBytes(data.embedding) : null,
      },
    })

    if (options.updateIndex && data.embedding) {
      await addToOramaIndex(
        'boss',
        boss.id,
        data.name,
        data,
        data.embedding,
        data.sourceUrl,
      )
    }

    return { success: true, id: boss.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Store a weapon in the database
 */
export async function storeWeapon(
  data: {
    name: string
    type: string
    stats: Record<string, number | undefined>
    scaling: Record<string, string | undefined>
    skill: string
    description: string
    embedding?: Float32Array | number[]
    sourceUrl?: string
  },
  options: StorageOptions = {},
): Promise<StorageResult> {
  try {
    const weapon = await prisma.weapon.upsert({
      where: { name: data.name },
      update: {
        type: data.type,
        stats: data.stats,
        scaling: data.scaling,
        skill: data.skill,
        description: data.description,
        embedding: data.embedding
          ? embeddingToBytes(data.embedding)
          : undefined,
      },
      create: {
        name: data.name,
        type: data.type,
        stats: data.stats,
        scaling: data.scaling,
        skill: data.skill,
        description: data.description,
        embedding: data.embedding ? embeddingToBytes(data.embedding) : null,
      },
    })

    if (options.updateIndex && data.embedding) {
      await addToOramaIndex(
        'weapon',
        weapon.id,
        data.name,
        data,
        data.embedding,
        data.sourceUrl,
      )
    }

    return { success: true, id: weapon.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Store a relic in the database
 */
export async function storeRelic(
  data: {
    name: string
    color: string
    tier: string
    effects: string[]
    embedding?: Float32Array | number[]
    sourceUrl?: string
  },
  options: StorageOptions = {},
): Promise<StorageResult> {
  try {
    const relic = await prisma.relic.upsert({
      where: { name: data.name },
      update: {
        color: data.color,
        tier: data.tier,
        effects: data.effects,
        embedding: data.embedding
          ? embeddingToBytes(data.embedding)
          : undefined,
      },
      create: {
        name: data.name,
        color: data.color,
        tier: data.tier,
        effects: data.effects,
        embedding: data.embedding ? embeddingToBytes(data.embedding) : null,
      },
    })

    if (options.updateIndex && data.embedding) {
      await addToOramaIndex(
        'relic',
        relic.id,
        data.name,
        data,
        data.embedding,
        data.sourceUrl,
      )
    }

    return { success: true, id: relic.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Store a nightfarer in the database
 */
export async function storeNightfarer(
  data: {
    name: string
    stats: Record<string, number | undefined>
    passive: string
    skill: string
    ultimate: string
    vessel: string
    embedding?: Float32Array | number[]
    sourceUrl?: string
  },
  options: StorageOptions = {},
): Promise<StorageResult> {
  try {
    const nightfarer = await prisma.nightfarer.upsert({
      where: { name: data.name },
      update: {
        stats: data.stats,
        passive: data.passive,
        skill: data.skill,
        ultimate: data.ultimate,
        vessel: data.vessel,
        embedding: data.embedding
          ? embeddingToBytes(data.embedding)
          : undefined,
      },
      create: {
        name: data.name,
        stats: data.stats,
        passive: data.passive,
        skill: data.skill,
        ultimate: data.ultimate,
        vessel: data.vessel,
        embedding: data.embedding ? embeddingToBytes(data.embedding) : null,
      },
    })

    if (options.updateIndex && data.embedding) {
      await addToOramaIndex(
        'nightfarer',
        nightfarer.id,
        data.name,
        data,
        data.embedding,
        data.sourceUrl,
      )
    }

    return { success: true, id: nightfarer.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Store a skill in the database
 */
export async function storeSkill(
  data: {
    name: string
    fpCost: number
    weaponTypes: string[]
    effect: string
    embedding?: Float32Array | number[]
    sourceUrl?: string
  },
  options: StorageOptions = {},
): Promise<StorageResult> {
  try {
    const skill = await prisma.skill.upsert({
      where: { name: data.name },
      update: {
        fpCost: data.fpCost,
        weaponTypes: data.weaponTypes,
        effect: data.effect,
        embedding: data.embedding
          ? embeddingToBytes(data.embedding)
          : undefined,
      },
      create: {
        name: data.name,
        fpCost: data.fpCost,
        weaponTypes: data.weaponTypes,
        effect: data.effect,
        embedding: data.embedding ? embeddingToBytes(data.embedding) : null,
      },
    })

    if (options.updateIndex && data.embedding) {
      await addToOramaIndex(
        'skill',
        skill.id,
        data.name,
        data,
        data.embedding,
        data.sourceUrl,
      )
    }

    return { success: true, id: skill.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Store a content chunk (for search indexing)
 */
export async function storeContentChunk(data: {
  type: ContentType
  name: string
  section: string
  content: string
  tags: string[]
  sourceUrl?: string
  embedding?: Float32Array | number[]
}): Promise<StorageResult> {
  try {
    const chunk = await prisma.contentChunk.create({
      data: {
        type: data.type,
        name: data.name,
        section: data.section,
        content: data.content,
        tags: data.tags,
        sourceUrl: data.sourceUrl,
        embedding: data.embedding ? embeddingToBytes(data.embedding) : null,
      },
    })

    return { success: true, id: chunk.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Add content to the Orama search index
 */
async function addToOramaIndex(
  type: ContentType,
  id: string,
  name: string,
  data: Record<string, unknown>,
  embedding: Float32Array | number[],
  sourceUrl?: string,
): Promise<void> {
  const orama = getOramaIndex()
  await orama.initialize()

  // Create searchable content from the data
  const content = Object.entries(data)
    .filter(([key, value]) => typeof value === 'string' && key !== 'embedding')
    .map(([, value]) => value)
    .join(' ')

  const tags = Array.isArray(data.tags) ? (data.tags as string[]) : []

  const doc: Omit<OramaDocument, 'id'> & { id: string } = {
    id,
    type,
    name,
    section: 'overview',
    content,
    tags,
    sourceUrl: sourceUrl || '',
    embedding: Array.from(
      embedding instanceof Float32Array
        ? embedding
        : new Float32Array(embedding),
    ),
  }

  await orama.add(doc)
}

/**
 * Rebuild the Orama index from SQLite data
 */
export async function rebuildOramaIndex(): Promise<{
  total: number
  indexed: number
  skipped: number
}> {
  const orama = getOramaIndex()
  await orama.clear()
  await orama.initialize()

  let total = 0
  let indexed = 0
  let skipped = 0

  // Index content chunks
  const chunks = await prisma.contentChunk.findMany()
  for (const chunk of chunks) {
    total++
    if (!chunk.embedding) {
      skipped++
      continue
    }

    try {
      await orama.add({
        id: chunk.id,
        type: chunk.type as ContentType,
        name: chunk.name,
        section: chunk.section,
        content: chunk.content,
        tags: chunk.tags as string[],
        sourceUrl: chunk.sourceUrl || '',
        embedding: Array.from(bufferToEmbedding(chunk.embedding)),
      })
      indexed++
    } catch {
      skipped++
    }
  }

  // Index bosses
  const bosses = await prisma.boss.findMany()
  for (const boss of bosses) {
    total++
    if (!boss.embedding) {
      skipped++
      continue
    }

    try {
      await orama.add({
        id: boss.id,
        type: 'boss',
        name: boss.name,
        section: 'overview',
        content: `${boss.name} is a ${boss.category} located in ${boss.location}. ${boss.strategies}`,
        tags: ['boss', boss.category.toLowerCase()],
        sourceUrl: '',
        embedding: Array.from(bufferToEmbedding(boss.embedding)),
      })
      indexed++
    } catch {
      skipped++
    }
  }

  // Index weapons
  const weapons = await prisma.weapon.findMany()
  for (const weapon of weapons) {
    total++
    if (!weapon.embedding) {
      skipped++
      continue
    }

    try {
      await orama.add({
        id: weapon.id,
        type: 'weapon',
        name: weapon.name,
        section: 'overview',
        content: `${weapon.name} is a ${weapon.type}. ${weapon.description}. Skill: ${weapon.skill}`,
        tags: ['weapon', weapon.type.toLowerCase()],
        sourceUrl: '',
        embedding: Array.from(bufferToEmbedding(weapon.embedding)),
      })
      indexed++
    } catch {
      skipped++
    }
  }

  // Index relics
  const relics = await prisma.relic.findMany()
  for (const relic of relics) {
    total++
    if (!relic.embedding) {
      skipped++
      continue
    }

    try {
      const effects = relic.effects as string[]
      await orama.add({
        id: relic.id,
        type: 'relic',
        name: relic.name,
        section: 'overview',
        content: `${relic.name} is a ${relic.color} ${relic.tier} relic. Effects: ${effects.join(', ')}`,
        tags: ['relic', relic.color.toLowerCase(), relic.tier.toLowerCase()],
        sourceUrl: '',
        embedding: Array.from(bufferToEmbedding(relic.embedding)),
      })
      indexed++
    } catch {
      skipped++
    }
  }

  // Index nightfarers
  const nightfarers = await prisma.nightfarer.findMany()
  for (const nightfarer of nightfarers) {
    total++
    if (!nightfarer.embedding) {
      skipped++
      continue
    }

    try {
      await orama.add({
        id: nightfarer.id,
        type: 'nightfarer',
        name: nightfarer.name,
        section: 'overview',
        content: `${nightfarer.name} class. Passive: ${nightfarer.passive}. Skill: ${nightfarer.skill}. Ultimate: ${nightfarer.ultimate}. Vessel: ${nightfarer.vessel}`,
        tags: ['nightfarer', 'class'],
        sourceUrl: '',
        embedding: Array.from(bufferToEmbedding(nightfarer.embedding)),
      })
      indexed++
    } catch {
      skipped++
    }
  }

  // Index skills
  const skills = await prisma.skill.findMany()
  for (const skill of skills) {
    total++
    if (!skill.embedding) {
      skipped++
      continue
    }

    try {
      const weaponTypes = skill.weaponTypes as string[]
      await orama.add({
        id: skill.id,
        type: 'skill',
        name: skill.name,
        section: 'overview',
        content: `${skill.name} costs ${skill.fpCost} FP. ${skill.effect}. Compatible with: ${weaponTypes.join(', ')}`,
        tags: ['skill', ...weaponTypes.map((t) => t.toLowerCase())],
        sourceUrl: '',
        embedding: Array.from(bufferToEmbedding(skill.embedding)),
      })
      indexed++
    } catch {
      skipped++
    }
  }

  // Save the index
  await orama.saveToFile()

  return { total, indexed, skipped }
}

/**
 * Save the Orama index to file
 */
export async function saveOramaIndex(): Promise<void> {
  const orama = getOramaIndex()
  await orama.saveToFile()
}
