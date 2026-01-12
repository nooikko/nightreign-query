/**
 * Parser utility functions for extracting data from Fextralife wiki HTML
 *
 * These helpers provide safe, fault-tolerant extraction of common
 * patterns found in wiki pages (infoboxes, tables, lists, etc.)
 */

import * as cheerio from 'cheerio'

// Re-export the CheerioAPI type
export type CheerioAPI = ReturnType<typeof cheerio.load>

/**
 * Load HTML into Cheerio with error handling
 */
export function loadHtml(html: string): CheerioAPI {
  return cheerio.load(html, {
    // Use forgiving parsing for potentially malformed wiki HTML
    xml: false,
  })
}

/**
 * Safely extract text from a selector, returning empty string if not found
 */
export function safeText($: CheerioAPI, selector: string): string {
  return $(selector).first().text().trim()
}

/**
 * Safely extract text from multiple elements matching a selector
 */
export function safeTextArray($: CheerioAPI, selector: string): string[] {
  const results: string[] = []
  $(selector).each((_i: number, el: unknown) => {
    const text = $(el as Parameters<typeof $>[0])
      .text()
      .trim()
    if (text) {
      results.push(text)
    }
  })
  return results
}

/**
 * Safely extract an attribute value
 */
export function safeAttr(
  $: CheerioAPI,
  selector: string,
  attr: string,
): string {
  return $(selector).first().attr(attr)?.trim() ?? ''
}

/**
 * Extract the page title from wiki HTML
 */
export function extractPageTitle($: CheerioAPI): string {
  // Try the infobox title first (usually has clean name)
  const infoboxTitle = $('#infobox h2, .infobox h2').first().text().trim()
  if (infoboxTitle) return infoboxTitle

  // Try the main heading
  const h1 = $('#wiki-content-block h1').first().text().trim()
  if (h1) return h1

  // Fall back to page title, cleaning common suffixes
  const title = $('title').first().text().trim()
  return title
    .replace(/\s*\|\s*Nightreign Wiki.*$/i, '')
    .replace(/\s*\|\s*Elden Ring.*$/i, '')
    .trim()
}

/**
 * Extract the main description/overview text
 */
export function extractDescription($: CheerioAPI): string {
  // Try to get the first paragraph after the heading
  const contentBlock = $('#wiki-content-block')

  // Look for description text before the first table or infobox
  const paragraphs: string[] = []

  contentBlock.find('p').each((i: number, el: unknown) => {
    // Stop at first table or after 3 paragraphs
    if (i >= 3) return

    const $el = $(el as Parameters<typeof $>[0])

    // Skip if inside a table or infobox
    if ($el.closest('table').length > 0) return

    const text = $el.text().trim()
    // Filter out boilerplate and short text
    if (text && text.length > 20 && !isBoilerplateText(text)) {
      paragraphs.push(text)
    }
  })

  return paragraphs.join('\n\n')
}

/**
 * Check if text matches common wiki boilerplate patterns
 * (inline version for use before the main function is defined)
 */
function isBoilerplateText(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('notes, tips, and trivia go here') ||
    lower.includes('notes and tips go here') ||
    lower.includes('trivia go here') ||
    lower.includes('go here.') ||
    lower.includes('to be filled') ||
    lower.includes('section is incomplete') ||
    lower.includes('under construction') ||
    /^notes?\s*(and|,)?\s*tips?\s*(and|,)?\s*trivia/i.test(text)
  )
}

/**
 * Extract data from an infobox table (common wiki pattern)
 *
 * Returns a Map of label -> value pairs
 *
 * Handles Fextralife's structure where:
 * - Key-value pairs can be th/td OR td/td
 * - Values may contain links, images, br tags
 * - Some cells contain embedded labels (e.g., "Weak to" inside td content)
 */
export function extractInfobox(
  $: CheerioAPI,
  selector = '.infobox',
): Map<string, string> {
  const data = new Map<string, string>()
  let infobox = $(selector).first()

  if (infobox.length === 0) {
    // Try alternative infobox selectors
    const altSelectors = [
      '#infobox',
      'table.wiki_table:first',
      '.portable-infobox',
      'table:first',
    ]

    for (const altSelector of altSelectors) {
      const altInfobox = $(altSelector)
      if (altInfobox.length > 0) {
        infobox = altInfobox
        break
      }
    }

    if (infobox.length === 0) {
      return data
    }
  }

  // Extract rows from infobox - handle both th/td and td/td patterns
  infobox
    .find(
      '> .table-responsive > table > tbody > tr, > table > tbody > tr, > tbody > tr, > tr',
    )
    .each((_i: number, row: unknown) => {
      const $row = $(row as Parameters<typeof $>[0])
      const cells = $row.find('> th, > td')

      if (cells.length === 0) return

      // Case 1: th/td pair (standard pattern)
      const th = $row.find('> th').first()
      if (th.length > 0 && cells.length >= 2) {
        const key = th.text().trim().toLowerCase()
        const value = extractCellValue($, $row.find('> td').first())
        if (key && value && !key.includes('phase') && key.length < 50) {
          data.set(key, value)
        }
        return
      }

      // Case 2: td/td pair (Fextralife pattern)
      if (cells.length >= 2) {
        const firstCell = $(cells[0])
        const secondCell = $(cells[1])

        // Check if first cell looks like a label (short text, no links as main content)
        const firstText = firstCell
          .clone()
          .children('div, a, img')
          .remove()
          .end()
          .text()
          .trim()

        // Handle embedded labels like "Weak to" / "Stronger VS" in EITHER cell
        // Fextralife puts these side-by-side in some boss pages
        for (const cell of [firstCell, secondCell]) {
          const cellText = cell.text().trim().toLowerCase()

          if (cellText.includes('weak to') || cellText.includes('weaker to')) {
            // Extract link texts as weaknesses (since "Weak to" is just a label)
            const linkTexts: string[] = []
            cell.find('a.wiki_link').each((_: number, link: unknown) => {
              const text = $(link as Parameters<typeof $>[0])
                .text()
                .trim()
              if (text && text.length > 0 && text.toLowerCase() !== 'weak to') {
                linkTexts.push(text)
              }
            })
            if (linkTexts.length > 0) {
              data.set('weak to', linkTexts.join(', '))
            }
          }

          if (cellText.includes('stronger vs')) {
            // Extract link texts as resistances
            const linkTexts: string[] = []
            cell.find('a.wiki_link').each((_: number, link: unknown) => {
              const text = $(link as Parameters<typeof $>[0])
                .text()
                .trim()
              if (
                text &&
                text.length > 0 &&
                text.toLowerCase() !== 'stronger vs'
              ) {
                linkTexts.push(text)
              }
            })
            if (linkTexts.length > 0) {
              data.set('stronger vs', linkTexts.join(', '))
            }
          }
        }

        // Standard td/td pair
        if (firstText && firstText.length < 30 && !firstText.includes('\n')) {
          const key = firstText.toLowerCase()
          const value = extractCellValue($, secondCell)
          if (value && !data.has(key)) {
            data.set(key, value)
          }
        }
      }
    })

  return data
}

/**
 * Extract clean text value from a table cell
 * Handles links, images, br tags, and nested elements
 */
function extractCellValue($: CheerioAPI, cell: ReturnType<CheerioAPI>): string {
  if (!cell || cell.length === 0) return ''

  // Get text from links (these often contain the actual values)
  const linkTexts: string[] = []
  cell.find('a.wiki_link').each((_: number, link: unknown) => {
    const text = $(link as Parameters<typeof $>[0])
      .text()
      .trim()
    if (text && text.length > 0) {
      linkTexts.push(text)
    }
  })

  // If we have link texts, join them
  if (linkTexts.length > 0) {
    return linkTexts.join(', ')
  }

  // Otherwise get plain text, handling br tags as separators
  const html = cell.html() || ''
  const textWithBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return textWithBreaks
}

/**
 * Extract data from a table as key-value pairs
 *
 * Handles both horizontal (th/td pairs) and vertical (header row) layouts
 */
export function extractTableData(
  $: CheerioAPI,
  selector: string,
): Map<string, string> {
  const data = new Map<string, string>()
  const table = $(selector).first()

  if (table.length === 0) return data

  // Try horizontal layout first (th/td or td/td pairs in each row)
  table.find('tr').each((_i: number, row: unknown) => {
    const $row = $(row as Parameters<typeof $>[0])
    const cells = $row.find('th, td')

    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim().toLowerCase()
      const value = extractCellValue($, $(cells[1]))
      if (key && value && key.length < 50) {
        data.set(key, value)
      }
    }
  })

  return data
}

/**
 * Extract table rows as arrays of strings
 */
export function extractTableRows($: CheerioAPI, selector: string): string[][] {
  const rows: string[][] = []
  const table = $(selector).first()

  if (table.length === 0) return rows

  table.find('tr').each((_i: number, row: unknown) => {
    const cells: string[] = []
    $(row as Parameters<typeof $>[0])
      .find('th, td')
      .each((_idx: number, cell: unknown) => {
        cells.push(
          $(cell as Parameters<typeof $>[0])
            .text()
            .trim(),
        )
      })
    if (cells.some((c) => c.length > 0)) {
      rows.push(cells)
    }
  })

  return rows
}

/**
 * Extract list items from a section
 */
export function extractList($: CheerioAPI, selector: string): string[] {
  const items: string[] = []
  $(selector)
    .find('li')
    .each((_i: number, li: unknown) => {
      const text = $(li as Parameters<typeof $>[0])
        .text()
        .trim()
      if (text) {
        items.push(text)
      }
    })
  return items
}

// Helper type for element with tagName
interface ElementWithTag {
  tagName?: string
}

/**
 * Extract text from a section by heading
 *
 * Looks for content between a heading matching the pattern and the next heading
 */
export function extractSection(
  $: CheerioAPI,
  headingPattern: RegExp | string,
): string {
  const contentBlock = $('#wiki-content-block')
  const paragraphs: string[] = []
  let inSection = false
  let done = false

  const pattern =
    typeof headingPattern === 'string'
      ? new RegExp(headingPattern, 'i')
      : headingPattern

  contentBlock.children().each((_i: number, el: unknown) => {
    if (done) return

    const $el = $(el as Parameters<typeof $>[0])
    const tagName = (el as ElementWithTag).tagName?.toLowerCase() ?? ''

    // Check if this is a heading
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const headingText = $el.text().trim()

      if (pattern.test(headingText)) {
        inSection = true
        return
      }

      // Exit section on next heading
      if (inSection) {
        done = true
        return
      }
    }

    // Collect content if in section
    if (inSection) {
      if (tagName === 'p') {
        const text = $el.text().trim()
        // Filter out boilerplate text
        if (text && !isBoilerplateText(text)) {
          paragraphs.push(text)
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        $el.find('li').each((_idx: number, li: unknown) => {
          const text = $(li as Parameters<typeof $>[0])
            .text()
            .trim()
          // Filter out boilerplate text
          if (text && !isBoilerplateText(text)) {
            paragraphs.push(`• ${text}`)
          }
        })
      }
    }
  })

  return paragraphs.join('\n')
}

/**
 * Extract list items from a section by heading
 */
export function extractSectionList(
  $: CheerioAPI,
  headingPattern: RegExp | string,
): string[] {
  const contentBlock = $('#wiki-content-block')
  const items: string[] = []
  let inSection = false
  let done = false

  const pattern =
    typeof headingPattern === 'string'
      ? new RegExp(headingPattern, 'i')
      : headingPattern

  contentBlock.children().each((_i: number, el: unknown) => {
    if (done) return

    const $el = $(el as Parameters<typeof $>[0])
    const tagName = (el as ElementWithTag).tagName?.toLowerCase() ?? ''

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const headingText = $el.text().trim()

      if (pattern.test(headingText)) {
        inSection = true
        return
      }

      if (inSection) {
        done = true
        return
      }
    }

    if (inSection && (tagName === 'ul' || tagName === 'ol')) {
      $el.find('li').each((_idx: number, li: unknown) => {
        const text = $(li as Parameters<typeof $>[0])
          .text()
          .trim()
        // Filter out boilerplate text
        if (text && !isBoilerplateText(text)) {
          items.push(text)
        }
      })
    }
  })

  return items
}

/**
 * Parse a numeric value from text, returning undefined if not parseable
 */
export function parseNumber(text: string): number | undefined {
  if (!text) return undefined

  // Remove common formatting
  const cleaned = text
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .trim()

  const num = Number.parseFloat(cleaned)
  return Number.isNaN(num) ? undefined : num
}

/**
 * Parse a stat scaling letter (S, A, B, C, D, E, -)
 */
export function parseScaling(text: string): string {
  const cleaned = text.trim().toUpperCase()
  if (['S', 'A', 'B', 'C', 'D', 'E', '-'].includes(cleaned)) {
    return cleaned
  }
  return ''
}

/**
 * Extract damage type weaknesses from text
 */
export function parseWeaknesses(text: string): string[] {
  const weaknesses: string[] = []
  const damageTypes = [
    'fire',
    'lightning',
    'holy',
    'magic',
    'physical',
    'slash',
    'strike',
    'pierce',
    'frost',
    'bleed',
    'poison',
    'scarlet rot',
    'sleep',
    'madness',
  ]

  const lowerText = text.toLowerCase()
  for (const type of damageTypes) {
    if (lowerText.includes(type)) {
      weaknesses.push(type)
    }
  }

  return weaknesses
}

/**
 * Clean up HTML entities, wiki separators, and extra whitespace
 */
export function cleanText(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/♦/g, '') // Remove wiki list separators
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Common wiki boilerplate patterns that should be filtered out
 */
const BOILERPLATE_PATTERNS: RegExp[] = [
  // Placeholder text
  /^notes?,?\s*(tips)?,?\s*(and)?\s*(trivia)?\s*(go\s*)?here\.?$/i,
  /^tips?,?\s*(notes)?,?\s*(and)?\s*(trivia)?\s*(go\s*)?here\.?$/i,
  /notes\s*,?\s*tips\s*,?\s*(and\s*)?trivia\s*(go\s*)?here/i,
  /^to\s+be\s+(filled\s+)?(in|out)\.?$/i,
  /^(this\s+)?(section|page)\s+(is\s+)?(incomplete|under\s*construction|empty)\.?$/i,
  /^add\s+(your\s+)?(own\s+)?(information|content|strategy|tips?)\s*here\.?$/i,
  /^placeholder\.?$/i,
  /^coming\s+soon\.?$/i,
  /^work\s+in\s+progress\.?$/i,
  /^tbd\.?$/i,
  /^n\/?a\.?$/i,
  // Editor instructions
  /editors?\s*(please\s*)?(add|update|fill)/i,
  /see\s+.*template\s+for\s+(example|reference)/i,
  // Generic filler
  /^\.+$/, // Just dots
  /^-+$/, // Just dashes
  // Wiki-specific boilerplate with entity names
  /notes\s+and\s+(other\s+)?trivia\s+for\s+(the\s+)?[\w\s]+\s+go\s+here/i,
]

/**
 * Check if text is wiki boilerplate/placeholder content
 */
export function isBoilerplate(text: string): boolean {
  const cleaned = text.trim()
  if (!cleaned || cleaned.length < 3) return true

  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(cleaned))
}

/**
 * Filter out boilerplate text from an array of strings
 */
export function filterBoilerplate(texts: string[]): string[] {
  return texts.filter((text) => !isBoilerplate(text))
}

/**
 * Clean text and remove if it's boilerplate
 * Returns empty string if the text is boilerplate
 */
export function cleanAndFilterText(text: string): string {
  const cleaned = cleanText(text)
  return isBoilerplate(cleaned) ? '' : cleaned
}

// ============================================================================
// BOSS-SPECIFIC EXTRACTION HELPERS
// ============================================================================

import type {
  BossDamageNegation,
  BossHpByPlayerCount,
  BossParryInfo,
  BossStatusResistances,
  DamageNegationValues,
  StatusResistanceValue,
} from './types'

/** Helper type to make all properties mutable for object construction */
type Mutable<T> = { -readonly [K in keyof T]: T[K] }

/**
 * Extract HP values per player count from boss page
 * Looks for spans with title="one player", "two players", "three players"
 */
export function extractBossHpByPlayerCount(
  $: CheerioAPI,
): BossHpByPlayerCount | undefined {
  const result: Mutable<BossHpByPlayerCount> = {}

  // Try to find HP values in the content (more reliable than infobox)
  const healthLi = $('li')
    .filter((_: number, el: unknown) => {
      const text = $(el as Parameters<typeof $>[0]).text()
      return text.startsWith('Health:') || text.includes('Health:')
    })
    .first()

  if (healthLi.length > 0) {
    // Extract values from spans with player count titles
    const soloSpan = healthLi.find('span[title="one player"]')
    const duoSpan = healthLi.find('span[title="two players"]')
    const trioSpan = healthLi.find('span[title="three players"]')

    if (soloSpan.length > 0) {
      const soloText = soloSpan.text()
      const soloMatch = soloText.match(/[\d,]+/)
      if (soloMatch) {
        result.solo = Number.parseInt(soloMatch[0].replace(/,/g, ''), 10)
      }
    }

    if (duoSpan.length > 0) {
      const duoText = duoSpan.text()
      const duoMatch = duoText.match(/[\d,]+/)
      if (duoMatch) {
        result.duo = Number.parseInt(duoMatch[0].replace(/,/g, ''), 10)
      }
    }

    if (trioSpan.length > 0) {
      const trioText = trioSpan.text()
      const trioMatch = trioText.match(/[\d,]+/)
      if (trioMatch) {
        result.trio = Number.parseInt(trioMatch[0].replace(/,/g, ''), 10)
      }
    }
  }

  // Also check infobox HP rows
  if (!result.solo) {
    const infobox = $('#infobox, .infobox').first()
    infobox.find('td:contains("HP")').each((_: number, el: unknown) => {
      const $cell = $(el as Parameters<typeof $>[0])
      const nextCell = $cell.next('td')
      if (nextCell.length > 0) {
        const soloSpan = nextCell.find('span[title="one player"]')
        const duoSpan = nextCell.find('span[title="two players"]')
        const trioSpan = nextCell.find('span[title="three players"]')

        if (soloSpan.length > 0 && !result.solo) {
          const match = soloSpan.text().match(/[\d,]+/)
          if (match)
            result.solo = Number.parseInt(match[0].replace(/,/g, ''), 10)
        }
        if (duoSpan.length > 0 && !result.duo) {
          const match = duoSpan.text().match(/[\d,]+/)
          if (match)
            result.duo = Number.parseInt(match[0].replace(/,/g, ''), 10)
        }
        if (trioSpan.length > 0 && !result.trio) {
          const match = trioSpan.text().match(/[\d,]+/)
          if (match)
            result.trio = Number.parseInt(match[0].replace(/,/g, ''), 10)
        }
      }
    })
  }

  return result.solo || result.duo || result.trio ? result : undefined
}

/**
 * Extract stance value from boss page
 */
export function extractBossStance($: CheerioAPI): number | undefined {
  // Look for Stance in list items
  const stanceLi = $('li')
    .filter((_: number, el: unknown) => {
      return (
        $(el as Parameters<typeof $>[0]).find(
          'a[href*="/Stance"], a[href*="Stance"]',
        ).length > 0
      )
    })
    .first()

  if (stanceLi.length > 0) {
    const text = stanceLi.text()
    const match = text.match(/Stance[:\s]*(\d+)/i)
    if (match?.[1]) {
      return Number.parseInt(match[1], 10)
    }
    // Also try extracting from strong tag
    const strongText = stanceLi.find('strong').text()
    const strongMatch = strongText.match(/\d+/)
    if (strongMatch) {
      return Number.parseInt(strongMatch[0], 10)
    }
  }

  return undefined
}

/**
 * Extract parry information from boss page
 */
export function extractBossParryInfo($: CheerioAPI): BossParryInfo | undefined {
  const parryLi = $('li')
    .filter((_: number, el: unknown) => {
      return (
        $(el as Parameters<typeof $>[0]).find(
          'a[href*="/Parrying"], a[href*="Parrying"]',
        ).length > 0 ||
        $(el as Parameters<typeof $>[0])
          .text()
          .toLowerCase()
          .includes('parryable')
      )
    })
    .first()

  if (parryLi.length === 0) return undefined

  const text = parryLi.text().toLowerCase()
  const result: Mutable<BossParryInfo> = {
    canParry: false,
  }

  // Check if parryable
  if (
    text.includes('parryable: no') ||
    text.includes('parryable:no') ||
    text.includes('not parryable')
  ) {
    result.canParry = false
  } else if (
    text.includes('parryable: yes') ||
    text.includes('parryable:yes') ||
    text.includes('can be parried')
  ) {
    result.canParry = true
  } else if (text.includes('yes')) {
    result.canParry = true
  }

  // Extract number of parries required
  const parriesMatch = text.match(/(\d+)\s*parr(?:y|ies)/i)
  if (parriesMatch?.[1]) {
    result.parriesRequired = Number.parseInt(parriesMatch[1], 10)
  }

  // Extract notes from nested ul
  const notes: string[] = []
  parryLi.find('ul li').each((_: number, li: unknown) => {
    const noteText = $(li as Parameters<typeof $>[0])
      .text()
      .trim()
    if (noteText) {
      notes.push(noteText)
    }
  })
  if (notes.length > 0) {
    result.notes = notes
  }

  return result
}

/**
 * Extract damage negation values from boss page
 */
export function extractBossDamageNegation(
  $: CheerioAPI,
): BossDamageNegation | undefined {
  const result: Mutable<BossDamageNegation> = {}

  // Find negation tables by their h4 headers
  const phase1Header = $('h4:contains("Negations (Phase 1)")').first()
  const phase2Header = $('h4:contains("Negations (Phase 2)")').first()

  if (phase1Header.length > 0) {
    result.phase1 = extractNegationValues($, phase1Header)
  }

  if (phase2Header.length > 0) {
    result.phase2 = extractNegationValues($, phase2Header)
  }

  // If no phase-specific negations, try to find a single negation table
  if (!result.phase1 && !result.phase2) {
    const genericHeader = $('h4:contains("Negations")').first()
    if (genericHeader.length > 0) {
      result.phase1 = extractNegationValues($, genericHeader)
    }
  }

  return result.phase1 || result.phase2 ? result : undefined
}

/**
 * Extract negation values from a negation table header
 */
function extractNegationValues(
  $: CheerioAPI,
  header: ReturnType<CheerioAPI>,
): DamageNegationValues | undefined {
  const headerRow = header.closest('tr')
  if (headerRow.length === 0) return undefined

  // The structure is: header row, icon row, value row, icon row, value row
  const rows = headerRow.nextAll('tr').slice(0, 4)
  if (rows.length < 4) return undefined

  const physicalValueRow = rows.eq(1) // After first icon row
  const elementalValueRow = rows.eq(3) // After second icon row

  const result: Mutable<DamageNegationValues> = {}

  // Physical damage types: Standard, Slash, Strike, Pierce
  const physicalCells = physicalValueRow.find('td')
  if (physicalCells.length >= 4) {
    result.standard = parseNegationValue($(physicalCells[0]).text())
    result.slash = parseNegationValue($(physicalCells[1]).text())
    result.strike = parseNegationValue($(physicalCells[2]).text())
    result.pierce = parseNegationValue($(physicalCells[3]).text())
  }

  // Elemental damage types: Magic, Fire, Lightning, Holy
  const elementalCells = elementalValueRow.find('td')
  if (elementalCells.length >= 4) {
    result.magic = parseNegationValue($(elementalCells[0]).text())
    result.fire = parseNegationValue($(elementalCells[1]).text())
    result.lightning = parseNegationValue($(elementalCells[2]).text())
    result.holy = parseNegationValue($(elementalCells[3]).text())
  }

  return result
}

/**
 * Parse a negation value (can be positive or negative)
 */
function parseNegationValue(text: string): number | undefined {
  const cleaned = text.trim()
  if (cleaned === '-' || cleaned === '') return undefined
  const num = Number.parseInt(cleaned, 10)
  return Number.isNaN(num) ? undefined : num
}

/**
 * Extract status resistances from boss page
 */
export function extractBossStatusResistances(
  $: CheerioAPI,
): BossStatusResistances | undefined {
  const result: Mutable<BossStatusResistances> = {}

  // Method 1: Try detailed resistance section (more info)
  const resistanceSection = $('h4.special:contains("Resistances")').parent()
  if (resistanceSection.length > 0) {
    resistanceSection.find('ul li').each((_: number, el: unknown) => {
      const $li = $(el as Parameters<typeof $>[0])
      const text = $li.text()

      // Parse format: "Poison: Immune" or "Scarlet Rot: 252 / 542 / 999"
      const match = text.match(/^([^:]+):\s*(.+)$/i)
      if (match?.[1] && match[2]) {
        const statusName = normalizeStatusName(match[1].trim())
        const valueText = match[2].trim()

        if (statusName) {
          result[statusName] = parseStatusResistanceValue(valueText)
        }
      }
    })
  }

  // Method 2: Try compact infobox resistance table
  if (Object.keys(result).length === 0) {
    const resistanceHeader = $('h4')
      .filter((_: number, el: unknown) => {
        const text = $(el as Parameters<typeof $>[0])
          .text()
          .trim()
        return text === 'Resistances'
      })
      .first()

    if (resistanceHeader.length > 0) {
      const headerRow = resistanceHeader.closest('tr')
      const rows = headerRow.nextAll('tr')

      // Parse icon rows and value rows
      // Structure: icon row (4 icons), value row, icon row (2 icons), value row
      // We only need value rows (eq(1) and eq(3))
      const valueRow1 = rows.eq(1)
      const valueRow2 = rows.eq(3)

      // First group: Poison, Scarlet Rot, Blood Loss, Frostbite
      const statusNames1 = [
        'poison',
        'scarletRot',
        'bloodLoss',
        'frostbite',
      ] as const
      valueRow1.find('td').each((i: number, el: unknown) => {
        const text = $(el as Parameters<typeof $>[0])
          .text()
          .trim()
        if (i < statusNames1.length) {
          const statusName = statusNames1[i]
          if (statusName) {
            result[statusName] = parseStatusResistanceValue(text)
          }
        }
      })

      // Second group: Sleep, Madness (colspan=2 each)
      const statusNames2 = ['sleep', 'madness'] as const
      valueRow2.find('td').each((i: number, el: unknown) => {
        const text = $(el as Parameters<typeof $>[0])
          .text()
          .trim()
        if (i < statusNames2.length) {
          const statusName = statusNames2[i]
          if (statusName) {
            result[statusName] = parseStatusResistanceValue(text)
          }
        }
      })
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Normalize status effect name to our schema keys
 */
function normalizeStatusName(name: string): keyof BossStatusResistances | null {
  const lower = name.toLowerCase().trim()
  if (lower.includes('poison')) return 'poison'
  if (lower.includes('scarlet rot')) return 'scarletRot'
  if (lower.includes('blood') || lower.includes('hemorrhage'))
    return 'bloodLoss'
  if (lower.includes('frost')) return 'frostbite'
  if (lower.includes('sleep')) return 'sleep'
  if (lower.includes('madness')) return 'madness'
  return null
}

/**
 * Parse a status resistance value from text
 */
function parseStatusResistanceValue(text: string): StatusResistanceValue {
  const cleaned = text.trim().toLowerCase()

  if (cleaned === '-' || cleaned === 'immune' || cleaned === '') {
    return { immune: true }
  }

  // Parse progression values (e.g., "252 / 542 / 999")
  const values = text.match(/\d+/g)
  if (values && values.length > 0) {
    const numbers = values.map((v) => Number.parseInt(v, 10))
    return {
      immune: false,
      value: numbers[0],
      progression: numbers.length > 1 ? numbers : undefined,
    }
  }

  return { immune: true }
}

/**
 * Extract damage types dealt by the boss
 */
export function extractBossDamageTypesDealt(
  $: CheerioAPI,
): string[] | undefined {
  const damageTypes: string[] = []

  // Find "Damage:" list item
  $('li').each((_: number, el: unknown) => {
    const $li = $(el as Parameters<typeof $>[0])
    const text = $li.text()

    if (text.startsWith('Damage:') || text.includes('Damage:')) {
      $li.find('a.wiki_link').each((_: number, link: unknown) => {
        const linkText = $(link as Parameters<typeof $>[0])
          .text()
          .trim()
        if (linkText && !damageTypes.includes(linkText)) {
          damageTypes.push(linkText)
        }
      })
    }
  })

  return damageTypes.length > 0 ? damageTypes : undefined
}

/**
 * Extract status effects inflicted by the boss
 */
export function extractBossStatusEffectsInflicted(
  $: CheerioAPI,
): string[] | undefined {
  const statusEffects: string[] = []

  // Find "Inflicts:" list item
  $('li').each((_: number, el: unknown) => {
    const $li = $(el as Parameters<typeof $>[0])
    const text = $li.text()

    if (text.startsWith('Inflicts:') || text.includes('Inflicts:')) {
      $li.find('a.wiki_link').each((_: number, link: unknown) => {
        const linkText = $(link as Parameters<typeof $>[0])
          .text()
          .trim()
        if (linkText && !statusEffects.includes(linkText)) {
          statusEffects.push(linkText)
        }
      })
    }
  })

  return statusEffects.length > 0 ? statusEffects : undefined
}

/**
 * Extract "Stronger VS" resistances from boss page
 */
export function extractBossStrongerVs($: CheerioAPI): string[] | undefined {
  const strongerVs: string[] = []

  // Check infobox for "Stronger VS" cell
  const strongerVsCell = $('td')
    .filter((_: number, el: unknown) => {
      return $(el as Parameters<typeof $>[0])
        .text()
        .toLowerCase()
        .includes('stronger vs')
    })
    .first()

  if (strongerVsCell.length > 0) {
    strongerVsCell.find('a.wiki_link').each((_: number, link: unknown) => {
      const text = $(link as Parameters<typeof $>[0])
        .text()
        .trim()
      if (
        text &&
        text.toLowerCase() !== 'stronger vs' &&
        !strongerVs.includes(text)
      ) {
        strongerVs.push(text)
      }
    })
  }

  return strongerVs.length > 0 ? strongerVs : undefined
}

// ============================================================================
// HTML STRIPPING - Remove unnecessary navigation, scripts, and boilerplate
// ============================================================================

/**
 * Strip unnecessary HTML elements to reduce file size and token usage.
 * Preserves the wiki content block and essential metadata.
 *
 * This typically reduces file size by 70-80% by removing:
 * - Navigation menus and sidebars
 * - Scripts and tracking code
 * - CSS styles (inline and linked)
 * - Header/footer boilerplate
 * - Ads and promotional content
 *
 * @param html Raw HTML from wiki page
 * @returns Stripped HTML containing only essential content
 */
export function stripHtml(html: string): string {
  const $ = loadHtml(html)

  // Extract the title before removing head
  const title = $('title').first().text().trim()

  // Get the main content block
  const wikiContent = $('#wiki-content-block').first()
  const subMain = $('#sub-main').first()

  if (wikiContent.length === 0 && subMain.length === 0) {
    // No wiki content found, return original (shouldn't happen with valid pages)
    return html
  }

  // Build a minimal HTML document with just the content
  const contentHtml =
    wikiContent.length > 0 ? wikiContent.html() : subMain.html()

  // Clean the content by removing unnecessary elements within it
  // Use fragment mode to avoid wrapping in html/head/body
  const $content = cheerio.load(
    `<div id="wiki-content-block">${contentHtml}</div>`,
    {
      xml: false,
    },
    false,
  ) // false = fragment mode, don't add html/head/body wrapper

  // Remove elements that are useless for parsing
  $content('script').remove()
  $content('style').remove()
  $content('noscript').remove()
  $content('iframe').remove()
  $content('.addthis_inline_share_toolbox').remove()
  $content('.addthis_inline_follow_toolbox').remove()
  $content('[id*="comment"]').remove()
  $content('[class*="comment"]').remove()
  $content('.ad-container').remove()
  $content('[class*="advertisement"]').remove()
  $content('.social-share').remove()
  $content('[class*="share-button"]').remove()
  $content('.edit-button').remove()
  $content('.revision-info').remove()

  // Remove footer navigation tables (e.g., "All Elden Ring Nightreign Bosses")
  // These contain 50+ links to other pages and are pure navigation clutter
  $content('table').each((_: number, table: unknown) => {
    const $table = $content(table as Parameters<typeof $content>[0])
    const tableText = $table.text()
    const linkCount = $table.find('a').length

    // Footer nav tables have many links and match navigation patterns
    // Pattern 1: "Elden Ring Nightreign All X" (e.g., "Elden Ring Nightreign All Sorceries")
    // Pattern 2: "All X" where X is a content type
    const isNavTable =
      linkCount > 30 &&
      (tableText.includes('Elden Ring Nightreign All') ||
        tableText.includes('All Elden Ring') ||
        tableText.includes('All Nightreign') ||
        tableText.includes('All Bosses') ||
        tableText.includes('All Weapons') ||
        tableText.includes('All Armor') ||
        tableText.includes('All Sorceries') ||
        tableText.includes('All Incantations') ||
        tableText.includes('All Spells') ||
        tableText.includes('All Talismans') ||
        tableText.includes('All Shields') ||
        tableText.includes('All Skills') ||
        tableText.includes('All Relics') ||
        tableText.includes('All Classes') ||
        tableText.includes('All Nightfarers') ||
        tableText.includes('All Locations') ||
        tableText.includes('All Enemies') ||
        tableText.includes('All NPCs'))

    if (isNavTable) {
      // Also remove the parent .table-responsive wrapper if present
      const parent = $table.parent()
      if (parent.hasClass('table-responsive')) {
        parent.remove()
      } else {
        $table.remove()
      }
    }
  })

  // Remove images entirely - we extract text from links, not image alt text
  // The wiki uses icon images with messy alt text that pollutes extraction
  $content('img').remove()

  // Remove styling attributes - not needed for data extraction
  // Keep title on spans (used for player count: "one player", "two players", "three players")
  $content('[style]').removeAttr('style')
  $content('a[title]').removeAttr('title') // Remove tooltip titles from links
  $content('[width]').removeAttr('width')
  $content('[height]').removeAttr('height')

  // Remove empty elements and clean up whitespace
  $content('div:empty').remove()
  $content('span:empty').not('[class]').remove()
  $content('p:empty').remove()

  let cleanedContent = $content.html() || ''

  // Clean up HTML entities and whitespace
  cleanedContent = cleanedContent
    .replace(/&nbsp;/g, ' ') // Convert nbsp to regular space
    .replace(/<p>\s*<\/p>/g, '') // Remove empty paragraphs
    .replace(/\s+/g, ' ') // Collapse multiple whitespace
    .replace(/>\s+</g, '><') // Remove whitespace between tags
    .replace(/\s+>/g, '>') // Remove whitespace before closing >
    .trim()

  // Build minimal document - only title needed for identification
  const strippedHtml = `<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(title)}</title>
</head>
<body>
${cleanedContent}
</body>
</html>`

  return strippedHtml
}

/**
 * Escape HTML special characters for safe embedding in attributes
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Check if HTML has already been stripped
 * Stripped HTML is much smaller and has a specific structure
 */
export function isStrippedHtml(html: string): boolean {
  // Stripped HTML starts with our specific doctype and has no script tags
  return (
    html.includes('<div id="sub-main">') &&
    !html.includes('<script') &&
    !html.includes('wikiMenuMobile') &&
    !html.includes('google-analytics')
  )
}
