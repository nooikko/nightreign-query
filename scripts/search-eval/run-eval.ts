#!/usr/bin/env tsx
/**
 * Search Quality Evaluation Runner
 *
 * Runs natural language test questions against the search API
 * and formats results for human review.
 *
 * Usage:
 *   pnpm eval                    # Run all questions
 *   pnpm eval --category boss    # Run only boss questions
 *   pnpm eval --difficulty hard  # Run only hard questions
 *   pnpm eval --id item-easy-1   # Run single question
 *   pnpm eval --format           # Include LLM-formatted responses
 *   pnpm eval --output results.json  # Save to file
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Types
interface TestQuestion {
  id: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  expectedType: string
  expectedTopics: string[]
  notes: string
}

interface TestQuestionsFile {
  version: string
  description: string
  questions: TestQuestion[]
  metadata: {
    totalQuestions: number
    byCategory: Record<string, number>
    byDifficulty: Record<string, number>
  }
}

interface SearchResult {
  id: string
  type: string
  name: string
  section: string
  content: string
  tags: string[]
  score?: number
}

interface SearchResponse {
  results: SearchResult[]
  timing: {
    embedding?: number
    search?: number
    format?: number
    total: number
  }
}

interface EvalResult {
  question: TestQuestion
  searchResults: SearchResult[]
  formattedResponse?: string
  timing: {
    embedding?: number
    search?: number
    format?: number
    total: number
  }
  analysis: {
    topResultMatchesExpectedType: boolean
    expectedTopicsFound: string[]
    expectedTopicsMissing: string[]
    resultCount: number
    topResultName: string
    topResultSection: string
  }
}

interface EvalReport {
  runAt: string
  baseUrl: string
  includeFormatted: boolean
  filters: {
    category?: string
    difficulty?: string
    id?: string
  }
  summary: {
    totalQuestions: number
    typeMatchRate: number
    avgTopicsFound: number
    avgResultCount: number
    avgLatency: number
  }
  results: EvalResult[]
}

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:3001'
const QUESTIONS_FILE = join(__dirname, 'test-questions.json')

// Parse command line args
function parseArgs(): {
  baseUrl: string
  category?: string
  difficulty?: string
  id?: string
  format: boolean
  output?: string
  verbose: boolean
  limit?: number
} {
  const args = process.argv.slice(2)
  const config: ReturnType<typeof parseArgs> = {
    baseUrl: DEFAULT_BASE_URL,
    format: false,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--base-url':
      case '-u':
        config.baseUrl = nextArg || DEFAULT_BASE_URL
        i++
        break
      case '--category':
      case '-c':
        config.category = nextArg
        i++
        break
      case '--difficulty':
      case '-d':
        config.difficulty = nextArg
        i++
        break
      case '--id':
        config.id = nextArg
        i++
        break
      case '--format':
      case '-f':
        config.format = true
        break
      case '--output':
      case '-o':
        config.output = nextArg
        i++
        break
      case '--verbose':
      case '-v':
        config.verbose = true
        break
      case '--limit':
      case '-l':
        config.limit = parseInt(nextArg, 10)
        i++
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
    }
  }

  return config
}

function printHelp(): void {
  console.log(`
Search Quality Evaluation Runner

Usage:
  pnpm eval [options]

Options:
  --base-url, -u <url>     API base URL (default: http://localhost:3001)
  --category, -c <cat>     Filter by category (boss, weapon, relic, etc.)
  --difficulty, -d <diff>  Filter by difficulty (easy, medium, hard)
  --id <id>                Run single question by ID
  --format, -f             Include LLM-formatted responses
  --output, -o <file>      Save results to JSON file
  --verbose, -v            Show detailed progress
  --limit, -l <n>          Limit to first N questions
  --help, -h               Show this help

Examples:
  pnpm eval                           # Run all questions (raw results)
  pnpm eval --format                  # Run all with LLM formatting
  pnpm eval -c boss -f                # Boss questions with formatting
  pnpm eval -d hard -v                # Hard questions, verbose output
  pnpm eval --id item-easy-1 -f       # Single question with formatting
  pnpm eval -o results/baseline.json  # Save to file
`)
}

// Load test questions
function loadQuestions(): TestQuestionsFile {
  const content = readFileSync(QUESTIONS_FILE, 'utf-8')
  return JSON.parse(content) as TestQuestionsFile
}

// Filter questions based on args
function filterQuestions(
  questions: TestQuestion[],
  filters: { category?: string; difficulty?: string; id?: string; limit?: number }
): TestQuestion[] {
  let filtered = questions

  if (filters.id) {
    filtered = filtered.filter((q) => q.id === filters.id)
  }
  if (filters.category) {
    filtered = filtered.filter((q) => q.category === filters.category)
  }
  if (filters.difficulty) {
    filtered = filtered.filter((q) => q.difficulty === filters.difficulty)
  }
  if (filters.limit) {
    filtered = filtered.slice(0, filters.limit)
  }

  return filtered
}

// Execute search query
async function executeSearch(
  baseUrl: string,
  question: string,
  format: boolean
): Promise<{ results: SearchResult[]; formatted?: string; timing: SearchResponse['timing'] }> {
  const response = await fetch(`${baseUrl}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: question,
      limit: 10,
      format,
    }),
  })

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`)
  }

  if (format) {
    // Handle SSE streaming response
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let formatted = ''
    let timing: SearchResponse['timing'] = { total: 0 }
    const results: SearchResult[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'chunk') {
              formatted += data.content
            } else if (data.type === 'timing') {
              timing = data.timing
            } else if (data.type === 'done') {
              timing = data.timing
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    return { results, formatted, timing }
  } else {
    const data = (await response.json()) as SearchResponse
    return { results: data.results, timing: data.timing }
  }
}

// Analyze results
function analyzeResults(question: TestQuestion, results: SearchResult[]): EvalResult['analysis'] {
  const topResult = results[0]
  const topResultType = topResult?.type || 'none'
  const topResultName = topResult?.name || 'N/A'
  const topResultSection = topResult?.section || 'N/A'

  // Check if any result content mentions expected topics
  const allContent = results
    .map((r) => `${r.name} ${r.section} ${r.content}`.toLowerCase())
    .join(' ')

  const expectedTopicsFound = question.expectedTopics.filter((topic) =>
    allContent.includes(topic.toLowerCase())
  )
  const expectedTopicsMissing = question.expectedTopics.filter(
    (topic) => !allContent.includes(topic.toLowerCase())
  )

  return {
    topResultMatchesExpectedType: topResultType === question.expectedType,
    expectedTopicsFound,
    expectedTopicsMissing,
    resultCount: results.length,
    topResultName,
    topResultSection,
  }
}

// Format results for console output
function formatConsoleOutput(result: EvalResult, verbose: boolean): string {
  const { question, analysis, timing, formattedResponse } = result
  const lines: string[] = []

  // Question header
  const typeMatch = analysis.topResultMatchesExpectedType ? '✓' : '✗'
  const topicScore = `${analysis.expectedTopicsFound.length}/${question.expectedTopics.length}`
  lines.push('')
  lines.push('─'.repeat(80))
  lines.push(`[${question.id}] ${question.difficulty.toUpperCase()}`)
  lines.push(`Q: "${question.question}"`)
  lines.push('')
  lines.push(`Type Match: ${typeMatch} (expected: ${question.expectedType}, got: ${result.searchResults[0]?.type || 'none'})`)
  lines.push(`Topics Found: ${topicScore} (${analysis.expectedTopicsFound.join(', ') || 'none'})`)
  if (analysis.expectedTopicsMissing.length > 0) {
    lines.push(`Topics Missing: ${analysis.expectedTopicsMissing.join(', ')}`)
  }
  lines.push(`Top Result: "${analysis.topResultName}" [${analysis.topResultSection}]`)
  lines.push(`Results: ${analysis.resultCount} | Latency: ${timing.total}ms`)

  if (formattedResponse) {
    lines.push('')
    lines.push('LLM Response:')
    lines.push('┌' + '─'.repeat(78) + '┐')
    // Indent and wrap the formatted response
    const wrappedLines = formattedResponse.split('\n').map((l) => `│ ${l.padEnd(76)} │`)
    lines.push(...wrappedLines)
    lines.push('└' + '─'.repeat(78) + '┘')
  }

  if (verbose) {
    lines.push('')
    lines.push('Raw Results:')
    result.searchResults.slice(0, 3).forEach((r, i) => {
      lines.push(`  ${i + 1}. [${r.type}] ${r.name} (${r.section})`)
      lines.push(`     ${r.content.substring(0, 100)}...`)
    })
  }

  lines.push('')
  lines.push(`Notes: ${question.notes}`)

  return lines.join('\n')
}

// Generate summary report
function generateSummary(results: EvalResult[]): EvalReport['summary'] {
  const typeMatches = results.filter((r) => r.analysis.topResultMatchesExpectedType).length
  const totalTopicsFound = results.reduce(
    (sum, r) => sum + r.analysis.expectedTopicsFound.length,
    0
  )
  const totalTopicsExpected = results.reduce(
    (sum, r) => sum + r.question.expectedTopics.length,
    0
  )
  const totalLatency = results.reduce((sum, r) => sum + r.timing.total, 0)
  const totalResults = results.reduce((sum, r) => sum + r.analysis.resultCount, 0)

  return {
    totalQuestions: results.length,
    typeMatchRate: Math.round((typeMatches / results.length) * 100),
    avgTopicsFound: Math.round((totalTopicsFound / totalTopicsExpected) * 100),
    avgResultCount: Math.round(totalResults / results.length),
    avgLatency: Math.round(totalLatency / results.length),
  }
}

// Main execution
async function main(): Promise<void> {
  const config = parseArgs()

  console.log('\n🔍 Search Quality Evaluation')
  console.log('═'.repeat(80))
  console.log(`Base URL: ${config.baseUrl}`)
  console.log(`Include LLM Formatting: ${config.format}`)

  // Load and filter questions
  const questionsFile = loadQuestions()
  const questions = filterQuestions(questionsFile.questions, {
    category: config.category,
    difficulty: config.difficulty,
    id: config.id,
    limit: config.limit,
  })

  if (questions.length === 0) {
    console.error('\n❌ No questions match the specified filters')
    process.exit(1)
  }

  console.log(`Questions to run: ${questions.length}`)
  if (config.category) console.log(`  Category: ${config.category}`)
  if (config.difficulty) console.log(`  Difficulty: ${config.difficulty}`)
  if (config.id) console.log(`  ID: ${config.id}`)
  console.log('')

  const results: EvalResult[] = []

  // Run each question
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]
    process.stdout.write(`Running [${i + 1}/${questions.length}] ${question.id}...`)

    try {
      const { results: searchResults, formatted, timing } = await executeSearch(
        config.baseUrl,
        question.question,
        config.format
      )

      // For formatted responses, we need to also get raw results for analysis
      let rawResults = searchResults
      if (config.format && searchResults.length === 0) {
        const rawResponse = await executeSearch(config.baseUrl, question.question, false)
        rawResults = rawResponse.results
      }

      const analysis = analyzeResults(question, rawResults)

      const evalResult: EvalResult = {
        question,
        searchResults: rawResults,
        formattedResponse: formatted,
        timing,
        analysis,
      }

      results.push(evalResult)
      console.log(` ✓ (${timing.total}ms)`)

      // Show detailed output
      console.log(formatConsoleOutput(evalResult, config.verbose))
    } catch (error) {
      console.log(` ✗ ERROR`)
      console.error(`  ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generate and display summary
  const summary = generateSummary(results)

  console.log('\n' + '═'.repeat(80))
  console.log('📊 EVALUATION SUMMARY')
  console.log('═'.repeat(80))
  console.log(`Total Questions: ${summary.totalQuestions}`)
  console.log(`Type Match Rate: ${summary.typeMatchRate}%`)
  console.log(`Topic Coverage: ${summary.avgTopicsFound}%`)
  console.log(`Avg Result Count: ${summary.avgResultCount}`)
  console.log(`Avg Latency: ${summary.avgLatency}ms`)

  // Breakdown by category
  const byCategory = new Map<string, { matches: number; total: number }>()
  for (const result of results) {
    const cat = result.question.category
    if (!byCategory.has(cat)) {
      byCategory.set(cat, { matches: 0, total: 0 })
    }
    const stats = byCategory.get(cat)!
    stats.total++
    if (result.analysis.topResultMatchesExpectedType) {
      stats.matches++
    }
  }

  console.log('\nBy Category:')
  for (const [cat, stats] of byCategory) {
    const rate = Math.round((stats.matches / stats.total) * 100)
    console.log(`  ${cat}: ${rate}% type match (${stats.matches}/${stats.total})`)
  }

  // Save to file if requested
  if (config.output) {
    const report: EvalReport = {
      runAt: new Date().toISOString(),
      baseUrl: config.baseUrl,
      includeFormatted: config.format,
      filters: {
        category: config.category,
        difficulty: config.difficulty,
        id: config.id,
      },
      summary,
      results,
    }

    // Ensure output directory exists
    const outputDir = dirname(config.output)
    if (outputDir && !existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    writeFileSync(config.output, JSON.stringify(report, null, 2))
    console.log(`\n📁 Results saved to: ${config.output}`)
  }

  console.log('\n✅ Evaluation complete!\n')
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
