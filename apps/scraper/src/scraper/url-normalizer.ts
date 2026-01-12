/**
 * URL Normalization Utilities for Fextralife Wiki Crawler
 *
 * Handles URL encoding differences (+ vs _ vs %20 for spaces)
 * and provides consistent URL canonicalization for deduplication.
 */

import { WIKI_BASE_URL } from './fextralife'

/**
 * Pages to skip - meta/navigation pages that don't contain game content
 */
const SKIP_PAGES = new Set([
  'builds',
  'walkthrough',
  'guides & walkthroughs',
  'multiplayer coop and online',
  'solo play',
  'duo mode',
  'new player help',
  'new game plus',
  'network test',
  'interactive map',
  'page',
  'all options',
  'analyze',
  'online information',
  'dlc',
  'heroes',
])

/**
 * Content type to URL pattern exclusions
 * These patterns help filter out unrelated pages from category scrapes
 */
export const CATEGORY_EXCLUSION_PATTERNS: Record<string, RegExp[]> = {
  nightfarer: [
    // Exclude spell pages (sorceries, incantations)
    /sorcery|sorceries|incantation|incantations|spell|spells/i,
    // Exclude equipment pages
    /shield|sword|weapon|armor|helm|gauntlet|greaves|talisman/i,
    // Exclude stats/attributes
    /^vigor$|^mind$|^endurance$|^strength$|^dexterity$|^intelligence$|^faith$|^arcane$/i,
    // Exclude boss/enemy pages
    /boss|enemy|creature|everdark sovereign/i,
    // Exclude expedition pages
    /expedition|tricephalos|gaping jaw|fissure in the fog/i,
    // Exclude NPC pages
    /^iron menial$|^merchant$|^npc$/i,
    // Exclude meta pages
    /wiki$|classes\)$/i,
    // Exclude vessel/urn pages (starting equipment, not the class)
    /urn$|vessel$/i,
  ],
  // Add patterns for other categories as needed
  boss: [
    /walkthrough|guide|strategy/i,
  ],
  weapon: [
    /walkthrough|guide|strategy/i,
  ],
}

/**
 * Check if a URL should be excluded from a specific category
 */
export function shouldExcludeFromCategory(
  url: string,
  category: string,
): boolean {
  const patterns = CATEGORY_EXCLUSION_PATTERNS[category]
  if (!patterns || patterns.length === 0) {
    return false // No exclusions for this category
  }

  // Extract page name from URL
  const pageName = getPageNameFromUrl(url)

  // Check if any exclusion pattern matches
  return patterns.some((pattern) => pattern.test(pageName))
}

/**
 * Helper to extract page name from URL for pattern matching
 */
function getPageNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Get the path, remove leading slash, decode
    let path = parsed.pathname.slice(1)
    path = decodeURIComponent(path)
    // Replace + with spaces
    path = path.replace(/\+/g, ' ')
    return path
  } catch {
    return url
  }
}

/**
 * Known typos in wiki URLs -> correct spelling
 * Maps lowercase typo to lowercase correction
 */
const TYPO_CORRECTIONS: Record<string, string> = {
  'blessed iron coin (key iem)': 'blessed iron coin (key item)',
  "weatheivane's words": "weathervane's words",
  'soulblood songe': 'soulblood song',
}

/**
 * Normalize a wiki URL to a canonical form for deduplication
 *
 * Handles:
 * - Space encoding variants: +, _, %20
 * - Protocol normalization (http -> https)
 * - Trailing slash removal
 * - Case normalization (wiki URLs are case-insensitive)
 */
export function normalizeUrl(url: string): string {
  try {
    // Handle relative URLs
    const absoluteUrl = url.startsWith('/')
      ? `${WIKI_BASE_URL}${url}`
      : url

    const parsed = new URL(absoluteUrl)

    // Ensure HTTPS
    parsed.protocol = 'https:'

    // Lowercase the hostname
    parsed.hostname = parsed.hostname.toLowerCase()

    // Decode the pathname to handle %20, %2B, etc.
    let path = decodeURIComponent(parsed.pathname)

    // Normalize all space variants to single space, then encode as +
    // Fextralife uses + for spaces, so we normalize to that
    path = path.replace(/_/g, ' ') // underscores to spaces
    path = path.replace(/\s+/g, ' ') // collapse multiple spaces
    path = path.trim()
    path = path.replace(/ /g, '+') // spaces to +

    // Remove trailing slashes
    path = path.replace(/\/+$/, '')

    // Lowercase the path for case-insensitive deduplication
    // Wiki URLs like "Attack+Power+Up" and "Attack+power+up" are the same page
    path = path.toLowerCase()

    // Apply typo corrections
    // Extract page name (after last /) for typo checking
    const lastSlashIndex = path.lastIndexOf('/')
    const pageName = path.slice(lastSlashIndex + 1).replace(/\+/g, ' ')
    if (TYPO_CORRECTIONS[pageName]) {
      const corrected = TYPO_CORRECTIONS[pageName].replace(/ /g, '+')
      path = path.slice(0, lastSlashIndex + 1) + corrected
    }

    // Final safeguard: detect and fix any doubled domain in the path
    // e.g., /eldenringnightreign.wiki.fextralife.com/page should just be /page
    const domainInPath = '/eldenringnightreign.wiki.fextralife.com'
    if (path.includes(domainInPath)) {
      const idx = path.indexOf(domainInPath)
      path = path.slice(idx + domainInPath.length) || '/'
    }

    // Reconstruct without query params or hash (not used by wiki)
    return `${parsed.protocol}//${parsed.hostname}${path}`
  } catch {
    // If URL parsing fails, return as-is
    return url
  }
}

/**
 * Check if two URLs point to the same page after normalization
 */
export function isSameUrl(url1: string, url2: string): boolean {
  return normalizeUrl(url1) === normalizeUrl(url2)
}

/**
 * Check if a URL is a valid Fextralife wiki URL worth crawling
 *
 * Filters out:
 * - External URLs
 * - Anchor-only links (#)
 * - Special wiki pages (Special:, Category:, File:, etc.)
 * - Image/media URLs
 */
export function isValidWikiUrl(url: string): boolean {
  try {
    const normalized = normalizeUrl(url)
    const parsed = new URL(normalized)

    // Must be on the wiki domain
    if (!parsed.hostname.includes('eldenringnightreign.wiki.fextralife.com')) {
      return false
    }

    const path = parsed.pathname

    // Skip empty paths or just root
    if (!path || path === '/') {
      return false
    }

    // Skip special wiki pages
    const invalidPrefixes = [
      '/Special:',
      '/Category:',
      '/File:',
      '/Template:',
      '/Talk:',
      '/User:',
      '/Help:',
      '/MediaWiki:',
    ]
    if (invalidPrefixes.some((prefix) => path.startsWith(prefix))) {
      return false
    }

    // Skip common non-content paths
    const invalidPaths = [
      '/search',
      '/login',
      '/register',
      '/api/',
      '/admin/',
      '/.well-known/',
    ]
    if (invalidPaths.some((invalid) => path.toLowerCase().startsWith(invalid))) {
      return false
    }

    // Skip image/media file extensions
    const invalidExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.svg',
      '.pdf',
      '.mp4',
      '.webm',
    ]
    if (invalidExtensions.some((ext) => path.toLowerCase().endsWith(ext))) {
      return false
    }

    // Skip meta/navigation pages that don't contain game content
    const pageName = decodeURIComponent(path.slice(1)) // Remove leading /
      .replace(/\+/g, ' ')
      .toLowerCase()
    if (SKIP_PAGES.has(pageName)) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Convert a relative URL to absolute using the wiki base URL
 */
export function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // Handle malformed hrefs that include the domain in the path
  // e.g., "/eldenringnightreign.wiki.fextralife.com/page" should become
  // "https://eldenringnightreign.wiki.fextralife.com/page"
  const domainInPath = '/eldenringnightreign.wiki.fextralife.com'
  if (url.startsWith(domainInPath)) {
    // Extract just the page path
    const pagePath = url.slice(domainInPath.length)
    return `${WIKI_BASE_URL}${pagePath}`
  }

  if (url.startsWith('/')) {
    return `${WIKI_BASE_URL}${url}`
  }
  // Assume it's a page name
  return `${WIKI_BASE_URL}/${url}`
}

/**
 * Extract the page name from a wiki URL
 */
export function getPageName(url: string): string {
  try {
    const normalized = normalizeUrl(url)
    const parsed = new URL(normalized)
    // Remove leading slash and decode
    const pageName = parsed.pathname.slice(1)
    // Replace + with spaces for display
    return pageName.replace(/\+/g, ' ')
  } catch {
    return url
  }
}
