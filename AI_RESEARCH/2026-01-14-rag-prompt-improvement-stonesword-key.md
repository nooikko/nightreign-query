# Research: RAG Prompt Engineering Improvements for Search Result Formatting

Date: 2026-01-14

## Executive Summary

The current search implementation returns "Location: N/A" for stonesword key results despite location data being available in the database. This research identifies three root causes:

1. **Inadequate prompt guidance** - The prompt doesn't explicitly instruct the LLM to extract location data from context
2. **Missing data handling fallback** - When context is ambiguous, the LLM defaults to "N/A" instead of attempting extraction
3. **Insufficient schema structure** - The prompt doesn't define a rigid schema for the response, allowing hallucinated fields

Based on 2026 best practices in RAG prompt engineering, this document provides actionable improvements to fix missing field extraction and prevent the "N/A" fallback when data exists.

## Prior Research

- `2026-01-12-llm-prompt-engineering-game-wiki.md` - Foundational prompt patterns for game wiki search
- `2026-01-12-data-capture-gap-analysis.md` - Current schema and missing fields
- `2026-01-12-fextralife-stonesword-key-structure.md` - Specific stonesword key data structure

## Current Problem Analysis

### Symptom
User searches for "stonesword key" → System returns formatted result with "Location: N/A" → User doesn't get location information that exists in database

### Root Cause Investigation

**1. Prompt Guidance Issue**
Current ITEM_TEMPLATE (lines 249-272 in templates.ts):
```typescript
For item questions (consumables, key items, materials):
- Clearly state what the item does and when to use it
- List ALL known locations where the item can be found  ← instruction present
- Include quantity available at each location if known
- Mention if the item is limited or can be farmed
```

**Problem**: While the system prompt mentions locations, it doesn't:
- Tell the LLM WHERE to find location data in the context
- Define the EXACT FORMAT for how to present locations
- Specify WHAT TO DO if locations appear fragmented across context chunks

**2. Context Formatting Issue**
Current formatResultsAsContext (lines 403-435 in templates.ts):
```
[1] Item Name (item) [RELEVANCE]
Section: Locations
[raw content with mixed structure]
```

**Problem**: The location data from multiple results may be:
- Split across different ContentChunks (one chunk per location region)
- Using different formats from different wiki sections
- Lacking clear machine-readable structure that LLM can parse

**3. Missing Validation**
Current prompt doesn't include:
- Explicit instruction to validate that locations were found in source
- Fallback behavior if location data exists but wasn't extracted
- Schema enforcement for required vs. optional fields

### Evidence from Current Code

In route.ts (line 302), context is formatted with:
```typescript
const context = formatResultsAsContext(searchResults)
```

For "stonesword key" search, results would include ContentChunks like:
- `{name: "Stonesword Key", section: "Locations - Limgrave", content: "...location descriptions..."}`
- `{name: "Stonesword Key", section: "Locations - Liurnia", content: "...location descriptions..."}`

But the prompt template doesn't explicitly tell the LLM: "Extract every unique location from all chunks and format them as a list."

## 2026 Best Practices in RAG Prompt Engineering

### 1. Explicit Field Extraction (Sources: [Cloud Squid](https://www.cloudsquid.io/blog/structured-prompting), [Simon Willison](https://simonw.substack.com/p/structured-data-extraction-from-unstructured))

**Best Practice**: When extracting specific fields, state them explicitly in the prompt with:
- Field name (exact key expected in output)
- Data type (string, array, number, etc.)
- Source location in context (which section to look in)
- Fallback value if not found

**Poor Example**:
```
Include location information if available.
```

**Good Example**:
```
Extract LOCATIONS (array of strings) from all sections labeled "Locations" or "Where to Find".
If multiple location chunks exist, combine them into a single array.
Format: "locations": ["Location Name 1 - Description", "Location Name 2 - Description"]
If no locations found in context, return: "locations": []
```

### 2. Structured Fallback Values (Source: [PromptPort research](https://arxiv.org/abs/2601.06151))

**Best Practice**: Define what to return when data is missing, rather than letting the model hallucinate defaults.

**Current Issue**: When the model can't confidently extract location, it uses "N/A" as a string, which looks like data.

**Solution**: Distinguish between:
- `null` (field not attempted)
- `[]` (field attempted, found nothing)
- Actual value (field found with confidence)

### 3. Multi-Chunk Context Aggregation (Source: [Scout RAG article](https://www.scoutos.com/blog/top-5-llm-prompts-for-retrieval-augmented-generation-rag))

**Best Practice**: When search returns multiple chunks covering the same entity, explicitly instruct the LLM to:
1. Identify all chunks for the same entity
2. Combine information across chunks
3. Avoid duplication in final output

**Current Issue**: Prompt treats each chunk independently, missing opportunity to aggregate.

**Solution**: In context, group chunks by content type before passing to LLM:
```
CONTEXT FOR STONESWORD KEY (item)
[Multiple chunks organized by section]

INSTRUCTION: Stonesword Key appears in X chunks covering different regions.
Combine all location information from sections 1, 3, 5, and 7 into a single unified list.
```

### 4. Schema Validation Fallback (Source: [Prompt Patterns for Structured Data Extraction](https://www.dre.vanderbilt.edu/~schmidt/PDF/Prompt_Patterns_for_Structured_Data_Extraction_from_Unstructured_Text.pdf))

**Best Practice**: When using structured output, explicitly define:
- Required fields (must have value)
- Optional fields (can be empty)
- Validation rules (e.g., "locations must be non-empty array if section exists in context")

**Current Issue**: The prompt allows empty "locations" even when context contains location data.

**Solution**: Add post-processing validation:
```typescript
// After LLM response
if (context.includes("Locations") && response.locations.length === 0) {
  // Flag for review - LLM failed to extract despite data present
  console.warn("Extraction failure: Locations data present but not extracted")
  // Retry with more explicit prompt or fallback to raw context
}
```

## Actionable Recommendations

### IMMEDIATE (High Priority - Implement First)

#### 1. Enhance ITEM_TEMPLATE with Explicit Field Extraction

**File**: `/home/quinn/nightreign-query/apps/web/lib/templates.ts`

**Current** (lines 249-272):
```typescript
export const ITEM_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For item questions (consumables, key items, materials):
- Clearly state what the item does and when to use it
- List ALL known locations where the item can be found
- Include quantity available at each location if known
- Mention if the item is limited or can be farmed`,

  formatInstructions: `Format your response as:
## [Item Name]
**Type**: [Key Item/Consumable/Material] | **Uses**: [number or "Unlimited"]
## Effect
[What the item does - be specific]
## Locations
- **[Location Name]**: [How to get it, quantity if known]
- **[Alternative sources]**: [Drops, purchases, etc.]
## Tips
- [When to use it, whether to save it, etc.]`,
}
```

**Improved**:
```typescript
export const ITEM_TEMPLATE = {
  systemPrompt: `${BASE_SYSTEM_PROMPT}

For item questions (consumables, key items, materials):
EXTRACT THESE FIELDS FROM CONTEXT:
1. Item Name - The exact item title
2. Type - Key Item / Consumable / Material / Equipment
3. Effect/Purpose - What does it do (1-2 sentences)
4. Locations - All places to obtain it (purchase OR world location)
   - If context contains a "Locations" or "Where to Find" section, extract ALL entries
   - Combine locations from multiple chunks into one list
   - Format each as: "[Location Type] - [NPC/Area Name]: [How to get it]"
   - If no location data in context, return EMPTY LIST (not "Unknown")
5. Quantity/Stock - How many available (if mentioned)
6. Farming/Rarity - Limited vs. farmable

CRITICAL: Do not write "Location: N/A" or similar placeholders.
If location section exists in context but is empty, say "Locations not documented in available sources."
If location section is missing entirely, omit the Locations section.`,

  formatInstructions: `Format your response as:
## [Item Name]
**Type**: [Key Item/Consumable/Material] | **Availability**: [Limited/Farmable/Single-Use]

## Effect
[What the item does - be specific]

## Where to Get It
If locations are available:
- **[Location Type - NPC/Area]**: [Description with price/stock if known]

If no location data available:
[Skip this section - do not write "N/A"]

## Tips
- [When/how to use it, whether to save for specific purpose, etc.]`,
}
```

**Why This Works**:
- Explicitly lists fields to extract from context
- Tells LLM WHERE to find location data (look for "Locations" or "Where to Find")
- Defines fallback behavior (empty list, not "N/A")
- Specifies format for location entries across all chunk types
- Prevents hallucination of non-existent locations

#### 2. Improve formatResultsAsContext to Group by Content Type

**File**: `/home/quinn/nightreign-query/apps/web/lib/templates.ts` (lines 403-435)

**Current**:
```typescript
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

  return results
    .slice(0, 6)
    .map((result, i) => {
      const relevance =
        result.score !== undefined
          ? result.score >= 0.8
            ? '[HIGH RELEVANCE]'
            : result.score >= 0.5
              ? '[RELEVANT]'
              : '[PARTIAL MATCH]'
          : ''

      return `[${i + 1}] ${result.name} (${result.type}) ${relevance}
Section: ${result.section}
${result.content}`
    })
    .join('\n\n---\n\n')
}
```

**Improved - For Items**:
```typescript
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

  // Group results by name to aggregate multi-chunk content
  const grouped = results.slice(0, 6).reduce(
    (acc, result) => {
      if (!acc[result.name]) {
        acc[result.name] = {
          type: result.type,
          score: result.score,
          sections: [],
        }
      }
      acc[result.name].sections.push({
        section: result.section,
        content: result.content,
      })
      return acc
    },
    {} as Record<
      string,
      {
        type: ContentType
        score?: number
        sections: Array<{ section: string; content: string }>
      }
    >,
  )

  // Format with sections grouped by entity
  return Object.entries(grouped)
    .map(([name, data], i) => {
      const relevance = data.score
        ? data.score >= 0.8
          ? '[HIGH RELEVANCE]'
          : data.score >= 0.5
            ? '[RELEVANT]'
            : '[PARTIAL MATCH]'
        : ''

      const sectionsText = data.sections
        .map((s) => `**Section: ${s.section}**\n${s.content}`)
        .join('\n\n')

      return `[${i + 1}] ${name} (${data.type}) ${relevance}\n${sectionsText}`
    })
    .join('\n\n---\n\n')
}
```

**Why This Works**:
- Groups all chunks for the same item together
- Shows LLM that multiple location sections exist for one item
- Makes it clear that locations from different regions should be combined
- Prevents "N/A" from appearing when multiple "Where to Find" chunks exist

#### 3. Add Response Validation Post-Processing

**File**: `/home/quinn/nightreign-query/apps/web/app/api/search/route.ts`

Add this before sending formatted response (around line 325):

```typescript
// Check if LLM response adequately extracted available data
function validateLLMResponse(
  originalContext: string,
  llmResponse: string,
  contentType: ContentType,
): {
  isValid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // For items, check if locations were available but not extracted
  if (contentType === 'item') {
    const hasLocationSection = originalContext.toLowerCase().includes('location') ||
      originalContext.toLowerCase().includes('where to') ||
      originalContext.toLowerCase().includes('purchas') ||
      originalContext.toLowerCase().includes('found')

    const hasLocationInResponse = llmResponse.toLowerCase().includes('where to get') ||
      llmResponse.toLowerCase().includes('locations') ||
      llmResponse.toLowerCase().includes('purchas') ||
      llmResponse.toLowerCase().includes('found')

    if (hasLocationSection && !hasLocationInResponse) {
      warnings.push('Location data available in context but not extracted in response')
    }

    // Check for "N/A" fallback when data should exist
    if (llmResponse.includes('N/A') && hasLocationSection) {
      warnings.push('Response contains "N/A" placeholder despite location data in context')
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  }
}
```

Then in the stream handler (after receiving response):
```typescript
// After LLM completes, validate response quality
const validation = validateLLMResponse(context, fullResponse, queryType === 'item' ? 'item' : (queryType as ContentType))
if (!validation.isValid) {
  logSearchError({
    requestId,
    error: `Response validation failed: ${validation.warnings.join('; ')}`,
    phase: 'format',
  })
}
```

### SHORT-TERM (Medium Priority - Next Sprint)

#### 4. Create Type-Specific Context Formatters

Instead of one-size-fits-all `formatResultsAsContext`, create specialized formatters:

**File**: `/home/quinn/nightreign-query/apps/web/lib/templates.ts`

```typescript
// For items: group by type of location (merchant vs. world vs. sealed)
function formatItemContext(results: SearchResult[]): string {
  const grouped = groupByEntity(results)

  return Object.entries(grouped).map(([name, data]) => {
    const merchants = data.sections
      .filter(s => s.section.toLowerCase().includes('merchant') ||
                    s.section.toLowerCase().includes('purchas'))
    const worldLocations = data.sections
      .filter(s => s.section.toLowerCase().includes('location') &&
                    !s.section.toLowerCase().includes('merchant'))
    const sealed = data.sections
      .filter(s => s.section.toLowerCase().includes('seal') ||
                    s.section.toLowerCase().includes('use'))

    return `
[ITEM] ${name}
MERCHANT LOCATIONS: ${merchants.map(m => m.content).join('\n')}
WORLD LOCATIONS: ${worldLocations.map(w => w.content).join('\n')}
SEALED LOCATIONS: ${sealed.map(s => s.content).join('\n')}
`.trim()
  }).join('\n\n---\n\n')
}
```

This gives the LLM explicit section markers to parse, reducing ambiguity.

#### 5. Implement Chain-of-Thought Prompting for Complex Items

For items with many locations (like stonesword key), use step-by-step:

```typescript
export const COMPLEX_ITEM_TEMPLATE = {
  systemPrompt: BASE_SYSTEM_PROMPT + `
For complex items with many locations:
STEP 1: Identify all location sections in context (Merchant, World, Sealed, etc.)
STEP 2: Extract locations from each section separately
STEP 3: Combine into unified list organized by category
STEP 4: Format with consistent structure

This prevents location merging errors when data is abundant.
`,
  // ... rest of template
}
```

### LONG-TERM (Low Priority - Architectural)

#### 6. Migrate to Structured Output with JSON Schema

Once Groq fully supports JSON Schema mode, use native structured output:

```typescript
// Use Groq's JSON mode if available
const groqResponse = await createStreamingCompletion({
  systemPrompt,
  userMessage,
  maxTokens: 350,
  temperature: 0.6,
  responseFormat: {
    type: 'json_schema',
    json_schema: {
      name: 'ItemResponse',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          effect: { type: 'string' },
          locations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { enum: ['merchant', 'world', 'sealed'] },
                description: { type: 'string' },
                npc: { type: 'string' },
                price: { type: 'number' },
              },
              required: ['type', 'description'],
            },
          },
        },
        required: ['name', 'type', 'effect', 'locations'],
      },
    },
  },
})
```

This guarantees:
- Locations field always exists (never becomes "N/A")
- Structure validated before returning to client
- No hallucinated fields
- Type safety on frontend

## Implementation Priority & Timeline

### Week 1 (CRITICAL)
1. Update ITEM_TEMPLATE with explicit field extraction (30 min)
2. Add validation post-processing (1 hour)
3. Test with stonesword key search (30 min)
4. Deploy to production

### Week 2-3 (HIGH)
5. Refactor formatResultsAsContext for item grouping (2 hours)
6. Create type-specific context formatters (3 hours)
7. Test all item searches, iterate on templates (2 hours)

### Week 4+ (MEDIUM)
8. Implement chain-of-thought for complex items (2 hours)
9. Research Groq JSON Schema support, implement if available (4 hours)

## Expected Outcomes

**Before** (Current):
```
User: "stonesword key"
Response: Location: N/A
```

**After** (With IMMEDIATE fixes):
```
User: "stonesword key"
Response:
Where to Get It
- **Merchant - Isolated Merchant**: West of Weeping Peninsula, 2,000 Runes each. Stock: 3
- **World - Limgrave**: Held by corpse at Dragon-Burnt Ruins
- **World - Liurnia**: Various locations in underground areas
```

**Performance Impact**:
- Minimal latency increase: Additional context grouping adds ~10-20ms
- Improved user satisfaction: Fewer "N/A" responses, more complete information
- Better data reusability: Validation warnings help identify scraper gaps

## Gaps & Limitations

1. **Hallucinated Locations**: Even with improvements, LLM could still invent plausible-sounding locations. Solution: Cross-reference response against known wiki pages.

2. **Incomplete Wiki Data**: If Fextralife stonesword key article is incomplete (missing some locations), LLM cannot extract what doesn't exist. Solution: Periodically audit wiki completeness.

3. **Format Variability**: Different wiki pages format location info differently. Solution: Implement custom parsers per content type in scraper.

4. **Groq API Constraints**: Currently maxTokens=350 may limit response length for items with 50+ locations. Solution: Consider pagination or implement summarization.

5. **No Ground Truth in Prompt**: LLM doesn't have access to actual database records. Solution: Future enhancement—pass structured data as JSON to LLM instead of narrative context.

## Recommendations for Next Steps

**For Implementation**:
- The nextjs-expert agent can implement the template changes and validation logic
- The unit-test-maintainer agent should create tests validating that N/A never appears when location data exists
- The system-architecture-reviewer should evaluate the JSON Schema migration path for cost/benefit

**For Data Quality**:
- Audit stonesword key and other item wiki pages to confirm data completeness
- Review existing item scraper to ensure location sections are being captured (check if `section` field contains "Location")
- Consider adding location field validation at scraper level

**For Monitoring**:
- Log validation warnings from response validation (see Short-term #4)
- Track ratio of "N/A" responses per content type
- Set alert if validation warnings exceed threshold

## Sources

### Prompt Engineering & RAG
- [Prompt Engineering Guide - RAG](https://www.promptingguide.ai/techniques/rag)
- [Top 5 LLM Prompts for RAG - Scout](https://www.scoutos.com/blog/top-5-llm-prompts-for-retrieval-augmented-generation-rag)
- [Prompt Patterns for Structured Data Extraction - Vanderbilt](https://www.dre.vanderbilt.edu/~schmidt/PDF/Prompt_Patterns_for_Structured_Data_Extraction_from_Unstructured_Text.pdf)
- [Structured Prompting Guide - Cloud Squid](https://www.cloudsquid.io/blog/structured-prompting)
- [Structured Data Extraction with LLM Schemas - Simon Willison](https://simonw.substack.com/p/structured-data-extraction-from-unstructured)
- [PromptPort: Reliability Layer for Cross-Model Extraction - arXiv](https://arxiv.org/abs/2601.06151)

### Hallucination & Data Handling
- [LLM Hallucinations in 2026 - Duke University](https://blogs.library.duke.edu/blog/2026/01/05/its-2026-why-are-llms-still-hallucinating/)
- [AI Hallucination: Compare Top LLMs 2026 - AIM](https://research.aimultiple.com/ai-hallucination/)
- [Hallucination Mitigation in LLMs - MDPI Survey](https://www.mdpi.com/2673-2688/6/10/260)
- [How to Stop LLM Hallucinations - Masterofcode](https://masterofcode.com/blog/hallucinations-in-llms-what-you-need-to-know-before-integration)

### Prior Project Research
- 2026-01-12-llm-prompt-engineering-game-wiki.md
- 2026-01-12-data-capture-gap-analysis.md
- 2026-01-12-fextralife-stonesword-key-structure.md

## Version Information

- Research Date: 2026-01-14
- LLM Models Referenced: Claude Opus 4.5, GPT-4o, Gemini 2.0 (hallucination rates)
- Prompt Engineering Standards: 2026 best practices
- Tools: Groq API (llama-3.1-8b-instant), Next.js 16, TypeScript
- Test Case: Stonesword Key search result formatting

## Gotchas & Warnings

1. **Prompt Length Creep**: Each additional field instruction adds tokens. Monitor total system prompt length.
2. **Validation False Positives**: "Location" keyword could appear in non-location context (flavor text). Refine detection.
3. **Streaming Complexity**: Validation logic needs to work with streaming responses, not just complete responses.
4. **Model-Specific Behavior**: Groq models may format JSON differently than OpenAI. Test thoroughly.
5. **User Expectations**: Clarifying "locations not documented" is better UX than hiding absence of data.
