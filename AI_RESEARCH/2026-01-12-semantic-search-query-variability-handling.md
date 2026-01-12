# Research: Handling Query Variability in Semantic Search Systems

Date: 2026-01-12

## Summary

Research into production-ready techniques for handling unpredictable user query formats in a game wiki search system using Orama (hybrid vector + full-text) with bge-small-en-v1.5 embeddings. Focuses on practical, implementable solutions rather than theoretical approaches.

## Prior Research

This builds upon existing research in this project:
- **AI_RESEARCH/2026-01-09-orama-vector-search-validation.md**: Validated Orama capabilities and performance
- **AI_RESEARCH/2026-01-09-local-embedding-models-typescript.md**: Confirmed bge-small-en-v1.5 as the optimal embedding model

## The Problem

Users query game wikis in unpredictable ways:
- "Wylder skill"
- "what does Wylder's skill do?"
- "how does the grappling hook work?"
- "Wylder grapple damage"

Current approach of restructuring indexed content to match expected query formats fails because we cannot predict all query variations.

## Research Questions

1. How do production semantic search systems handle query variability?
2. What techniques improve recall for varied query formats?
3. Does Orama support relevance tuning, boosting, or query rewriting?
4. Should we index multiple variants of the same content?
5. Are there embedding-specific considerations for bge-small-en-v1.5?

---

## Key Findings

### 1. Production Systems Handle Query Variability Through Multiple Layers

Production semantic search systems use a **layered architecture** for handling query variability:

**L1 (Recall Layer):**
- Executes parallel searches: full-text (BM25) + vector (semantic)
- Maximizes recall by capturing both keyword matches and semantic similarity
- Hybrid search combines both approaches using Reciprocal Rank Fusion (RRF)

**L2 (Ranking Layer):**
- Re-ranks L1 results using more sophisticated models
- Applies relevance tuning and field boosting
- Focuses on precision after recall has been maximized

**Key Insight**: Don't try to predict all query formats upfront. Instead, use hybrid search to cast a wide net, then refine results.

**Sources:**
- [Raising the bar for RAG excellence: query rewriting and new semantic ranker - Microsoft](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/raising-the-bar-for-rag-excellence-query-rewriting-and-new-semantic-ranker/4302729)
- [Search relevance tuning: Balancing keyword and semantic search - Elasticsearch Labs](https://www.elastic.co/search-labs/blog/search-relevance-tuning-in-semantic-search)

### 2. Hybrid Search Mitigates Query Variability

**How Hybrid Search Works:**

1. **Parallel Execution**: Runs full-text search (BM25) and vector search simultaneously
2. **Reciprocal Rank Fusion (RRF)**: Merges results from both methods
3. **Score Calculation**: `score = 1/(rank + k)` where k ≈ 60 (experimentally optimal)

**Why It Works:**
- **Full-text search** excels at: exact terms ("Wylder"), acronyms, proper nouns
- **Vector search** excels at: semantic meaning ("grappling hook" = "hookshot"), paraphrases
- **Combined**: Captures both literal and semantic matches

**Example Query Handling:**

| Query | Full-text Contribution | Vector Contribution |
|-------|----------------------|---------------------|
| "Wylder skill" | High (exact name match) | Medium (semantic context) |
| "what does Wylder's skill do?" | Medium (partial match) | High (question understanding) |
| "grappling hook damage" | High (keyword match) | High (semantic = "Wylder's hookshot") |
| "how does hookshot work?" | Low (no "Wylder" term) | High (understands "hookshot" context) |

**Performance Data:**
- Hybrid search improves relevance by **+2 to +4 points** over text-only search
- RRF merges results without requiring score normalization (works across disparate systems)
- **Trade-off**: Less improvement when L1 is already using embeddings

**Sources:**
- [Hybrid Search Overview - Microsoft Azure AI Search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [A Comprehensive Hybrid Search Guide - Elastic](https://www.elastic.co/what-is/hybrid-search)
- [Reciprocal Rank Fusion (RRF) - OpenSearch](https://opensearch.org/blog/introducing-reciprocal-rank-fusion-hybrid-search/)
- [Better RAG results with RRF - Assembled](https://www.assembled.com/blog/better-rag-results-with-reciprocal-rank-fusion-and-hybrid-search)

### 3. Orama's Relevance Tuning Capabilities

Orama provides several built-in mechanisms for handling query variability:

#### A. Field Boosting

**Syntax:**
```typescript
const results = await search(db, {
  term: "Wylder",
  boost: {
    name: 2.5,      // Character/item names weighted 2.5x
    section: 1.5,   // Section headers weighted 1.5x
    content: 1.0    // Body content at baseline
  }
})
```

**Use Case**: Ensures queries like "Wylder skill" prioritize documents with "Wylder" in the name field over mentions in content.

**Sources:**
- [Fields Boosting - Orama Docs](https://docs.orama.com/open-source/usage/search/fields-boosting)

#### B. Search Algorithms

Orama supports three algorithms (configurable at query time):

**BM25 (Default)**:
- Probabilistic ranking using term frequency, IDF, and document length normalization
- Best for: Keyword-heavy queries ("Wylder grapple damage")

**QPS (Quantum Proximity Scoring)**:
- Scores based on proximity of search terms within documents
- Best for: Multi-term queries where term proximity matters ("Wylder skill damage")
- Optimized for memory-constrained environments

**PT15 (Positional Token 15)**:
- Prioritizes token position (15 fixed positional buckets)
- Best for: Queries where early mentions are more relevant

**Recommendation for Game Wiki**: Test QPS alongside BM25. QPS is specifically recommended for "product documentation, e-commerce, and content management systems."

**Sources:**
- [Changing Default Search Algorithm - Orama Docs](https://docs.orama.com/docs/orama-js/search/changing-default-search-algorithm)

#### C. Hybrid Mode Configuration

**Current Implementation** (from `/packages/database/src/search/orama.ts`):

```typescript
// Hybrid mode (lines 218-227)
searchParams.mode = 'hybrid'
if (options.query) {
  searchParams.term = options.query
}
if (options.vector) {
  searchParams.vector = {
    value: options.vector,
    property: 'embedding',
  }
}
```

**Orama Hybrid Search Features**:
- `weights` parameter to adjust text vs vector search proportion
- Supports both `term` and `vector` simultaneously
- Can be combined with `boost` for field weighting

**Enhanced Example**:
```typescript
const results = await search(db, {
  mode: 'hybrid',
  term: 'Wylder skill',
  vector: {
    value: await embedQuery('Wylder skill'),
    property: 'embedding'
  },
  boost: {
    name: 2.5,
    section: 1.5
  },
  // Optional: adjust hybrid weights
  // weights: { text: 0.6, vector: 0.4 }
})
```

**Sources:**
- [Performing hybrid search - Orama Docs](https://docs.orama.com/cloud/performing-search/hybrid-search)
- [Orama GitHub - Main README](https://github.com/oramasearch/orama)

#### D. Facets and Filters

**Facets**: Enable categorical filtering to refine searches

```typescript
const results = await search(db, {
  term: 'damage',
  facets: {
    type: {
      // Returns counts: { 'skill': 15, 'weapon': 8, 'spell': 3 }
    }
  }
})
```

**Filters**: Apply constraints to narrow results

```typescript
const results = await search(db, {
  term: 'grapple',
  where: {
    type: ['skill', 'nightfarer'],  // Only skills and characters
    tags: 'combat'                   // Must have 'combat' tag
  }
})
```

**Use Case**: User searches "damage" → System shows facets (Skills: 15, Weapons: 8) → User clicks "Skills" → Refined results

**Sources:**
- [Facets - Orama Docs](https://docs.orama.com/open-source/usage/search/facets)
- [Filters - Orama Docs](https://docs.orama.com/open-source/usage/search/filters)

### 4. Query Expansion Techniques

Production systems improve recall through **query expansion** - augmenting user queries with related terms.

#### Common Expansion Approaches

**A. Synonym Expansion**
- **Method**: Expand query with known synonyms before sending to search engine
- **Example**: "hookshot" → ["hookshot", "grappling hook", "grapple"]
- **Implementation**: Can occur at indexing time (modify stored terms) or query time (expand search terms)
- **Trade-off**: Risk of over-expansion (query drift)

**B. Semantic Expansion**
- **Method**: Add related terms and concepts that share meaning
- **Example**: "damage" → ["damage", "attack", "hurt", "dmg"]
- **Benefit**: Handles abbreviations, gaming terminology

**C. Error Correction**
- **Method**: Identify and fix typos, spelling mistakes
- **Example**: "Wyldr" → "Wylder"
- **Benefit**: Robust to user input errors

**D. LLM-Based Query Rewriting**
- **Method**: Use LLM to reformulate query before search
- **Example**: "what does Wylder's skill do?" → "Wylder skill description effects"
- **Benefit**: Converts natural language questions to keyword queries
- **Trade-off**: Adds latency (~100-500ms), requires LLM API

#### Production Effectiveness

**Key Finding**: Query rewriting is **most helpful when L1 is text-based only**. With hybrid search (text + vector), the vector component already handles semantic matching, reducing the benefit of query expansion.

**From Microsoft Research**:
> "QR improves relevance by +2 to +4 more points when using text-based L1 than hybrid L1"

**Critical Warning**:
> "Without rigorous evaluation, query rewriting is surprisingly brittle, and you are essentially flying blind."

**Recommendation**: Since you're already using hybrid search with embeddings, **skip complex query rewriting** initially. The vector search component handles most query variation automatically.

**Sources:**
- [Query Expansion - ScienceDirect Topics](https://www.sciencedirect.com/topics/computer-science/query-expansion)
- [Fundamentals of query rewriting - OpenSource Connections](https://opensourceconnections.com/blog/2021/10/19/fundamentals-of-query-rewriting-part-1-introduction-to-query-expansion/)
- [Advanced RAG: Query Expansion - Haystack](https://haystack.deepset.ai/blog/query-expansion)
- [Query Rewriting in RAG - ZenML Blog](https://www.zenml.io/blog/query-rewriting-evaluation)

### 5. Indexing Multiple Content Variants

**Question**: Should we index multiple representations of the same content?

**Answer**: **Yes, for specific fields, but strategically.**

#### Recommended Multi-Variant Indexing Strategies

**A. Index Structured Metadata Separately**

Instead of only indexing:
```json
{
  "name": "Wylder",
  "content": "Wylder is a Nightfarer who uses a grappling hook..."
}
```

Index multiple representations:
```json
{
  "name": "Wylder",
  "aliases": ["Wylder the Swift", "hookshot user"],
  "type": "nightfarer",
  "primaryWeapon": "grappling hook",
  "abilities": ["hookshot", "aerial assault", "momentum strike"],
  "content": "Wylder is a Nightfarer who uses a grappling hook...",
  "tags": ["nightfarer", "mobility", "grapple", "combat"],
  "searchableText": "Wylder nightfarer grappling hook hookshot aerial assault..."
}
```

**Benefits**:
- `name` field catches exact matches ("Wylder")
- `aliases` field catches variations ("hookshot user")
- `abilities` field catches skill queries ("aerial assault")
- `tags` field enables faceted filtering
- `searchableText` field (concatenated) provides dense keyword target

**B. Use LLM-Generated Search Summaries (2026 Pattern)**

**From Orama Documentation**:
> "A recent implementation approach uses LLMs at build time to generate search profiles for content, creating dense, keyword-rich summaries specifically designed for search and indexing those instead of raw content."

**Example Workflow**:
1. Scrape raw wiki content for "Wylder"
2. Use LLM to generate search-optimized summary:
   ```
   "Wylder nightfarer character uses grappling hook hookshot mobility
    skill aerial movement combat damage swing rope tether"
   ```
3. Index both `content` (for display) and `searchSummary` (for matching)
4. Boost `searchSummary` field in searches

**Benefits**:
- Captures synonyms automatically (grappling hook = hookshot)
- Includes related terms (rope, tether, swing)
- Pre-computed at index time (no query-time overhead)

**Implementation**:
```typescript
const searchSummary = await generateSearchSummary(content) // LLM call at index time

await oramaIndex.add({
  name: "Wylder",
  content: rawContent,
  searchSummary: searchSummary,
  // ...
})

// At search time
const results = await search(db, {
  term: query,
  boost: {
    name: 3.0,
    searchSummary: 2.0,  // Boost LLM-generated summary
    content: 1.0
  }
})
```

**C. Multi-Vector Indexing (Advanced)**

**Research Finding**: Modern systems use **multi-vector representations** (e.g., ColBERT) where each wordpiece gets its own vector.

**ColBERT Approach**:
- Traditional: One 384-dim vector for entire document
- ColBERT: Multiple 384-dim vectors (one per token)
- Benefit: Better handles longer documents, more granular matching

**Status**: Orama currently supports single-vector per document. Multi-vector support would require custom implementation or waiting for Orama updates.

**Sources:**
- [Multi-Vector HNSW Indexing in Vespa](https://blog.vespa.ai/semantic-search-with-multi-vector-indexing/)
- [Sarthak Blog - Orama Search](https://sarthakmishra.com/blog/orama-astro)

### 6. bge-small-en-v1.5 Specific Considerations

#### A. Query Instruction Prefix (Optional)

**From Official Documentation**:
> "For bge-small-en-v1.5, the model has improved retrieval ability when not using instruction, with only a slight degradation in retrieval performance compared with using instruction."

**Recommendation**: **Omit instruction prefix** for simplicity unless evaluation shows improvement.

**If Using Instructions**:
- **Query**: Prefix with `"Represent this sentence for searching relevant passages:"`
- **Documents**: Never add instruction prefix

**Example**:
```typescript
// Without instruction (RECOMMENDED)
const queryEmbedding = await embed("Wylder skill")

// With instruction (optional)
const instruction = "Represent this sentence for searching relevant passages:"
const queryEmbedding = await embed(`${instruction}${query}`)
```

**Sources:**
- [BAAI/bge-small-en-v1.5 - Hugging Face](https://huggingface.co/BAAI/bge-small-en-v1.5)
- [BGE Series Documentation](https://bge-model.com/tutorial/1_Embedding/1.2.1.html)

#### B. Short Query to Long Document Optimization

**From BGE Documentation**:
> "For a retrieval task that uses short queries to find long related documents, it is recommended to add instructions for these short queries."

**Your Use Case**: Game wiki queries are typically short ("Wylder damage", "hookshot") searching longer content chunks.

**Recommendation**: **Test both approaches**:
1. No instruction (simpler, recommended by v1.5 docs)
2. Instruction for queries only (may improve short → long retrieval)

Measure recall@10 on sample queries to determine best approach.

#### C. Similarity Score Interpretation

**Critical Finding**:
> "Expected range: [0.6, 1.0] due to contrastive learning with temperature 0.01"
> "Focus on **relative order** of scores, not absolute values"
> "Myth: Score > 0.5 does NOT indicate similarity"

**Implications**:
- Don't set hard thresholds like "score > 0.7 = relevant"
- Use top-k ranking (get top 10 results, ignore absolute scores)
- For filtering, set thresholds based on your data distribution (test with 0.8, 0.85, 0.9)

**Sources:**
- [Hugging Face - bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5)
- [BGE v1 & v1.5 Documentation](https://bge-model.com/bge/bge_v1_v1.5.html)

#### D. Fine-tuning Considerations

**If retrieval quality is insufficient**:
1. **Mine hard negatives**: Collect query-document pairs that should NOT match
2. **Use contrastive learning**: Train model to separate positive/negative pairs
3. **Consider bge-reranker**: Re-rank top-k results from embedding search
   - Two-stage: (1) Embedding retrieval → top 50, (2) Reranker → top 10
   - Reranker is slower but more accurate for final ranking

**Sources:**
- [Fine-tune a BGE embedding model - AWS](https://aws.amazon.com/blogs/machine-learning/fine-tune-a-bge-embedding-model-using-synthetic-data-from-amazon-bedrock/)
- [BGE Series Documentation](https://bge-model.com/tutorial/1_Embedding/1.2.1.html)

---

## Practical Implementation Recommendations

### Recommendation 1: Leverage Hybrid Search (Already Implemented)

**Status**: Your current implementation already supports hybrid mode.

**Enhancement**: Add field boosting to prioritize exact name matches:

```typescript
// In packages/database/src/search/orama.ts
async search(options: SearchOptions): Promise<OramaSearchResult[]> {
  // ... existing code ...

  // Add default boosting for query variability
  const searchParams: Record<string, unknown> = {
    limit: options.limit || 10,
    boost: {
      name: 2.5,      // Prioritize character/item names
      section: 1.5,   // Boost section headers
      tags: 1.3,      // Boost tags
      content: 1.0    // Baseline for content
    }
  }

  // ... rest of implementation
}
```

**Benefit**: Queries like "Wylder skill" will prioritize documents with "Wylder" in the name field.

### Recommendation 2: Add Synonym/Alias Field

**Enhancement**: Expand schema to include explicit aliases:

```typescript
// Update OramaDocument interface
export interface OramaDocument {
  id: string
  type: string
  name: string
  aliases: string[]      // NEW: Alternative names
  section: string
  content: string
  tags: string[]
  sourceUrl: string
  embedding: number[]
}

// Update schema
const oramaSchema = {
  id: 'string',
  type: 'string',
  name: 'string',
  aliases: 'string[]',   // NEW: Searchable aliases
  section: 'string',
  content: 'string',
  tags: 'string[]',
  sourceUrl: 'string',
  embedding: `vector[${EMBEDDING_DIMENSIONS}]`,
} as const
```

**At Index Time**:
```typescript
await oramaIndex.add({
  name: "Wylder",
  aliases: ["hookshot user", "grapple master", "Wylder the Swift"],
  type: "nightfarer",
  tags: ["nightfarer", "mobility", "grapple", "combat"],
  // ...
})
```

**Benefit**: Full-text search can match "hookshot user" even if user doesn't type "Wylder"

### Recommendation 3: Use LLM-Generated Search Summaries (Optional)

**When to Use**: If hybrid search + boosting isn't sufficient.

**Implementation**:
```typescript
// At index/scrape time (one-time cost)
async function generateSearchSummary(content: string): Promise<string> {
  const prompt = `Extract key searchable terms from this game wiki content.
  Include character names, abilities, weapons, and related terms.
  Format: space-separated keywords

  Content: ${content}`

  // Use Groq (fast inference) or Claude API
  const summary = await llm.generate(prompt)
  return summary
}

// Add to document
await oramaIndex.add({
  name: "Wylder",
  content: originalContent,
  searchSummary: await generateSearchSummary(originalContent),
  // ...
})

// Boost at search time
boost: {
  name: 3.0,
  searchSummary: 2.0,
  content: 1.0
}
```

**Trade-off**: Adds LLM API cost at index time, but improves search recall.

### Recommendation 4: Test QPS Algorithm

**Action**: Compare BM25 (default) vs QPS on representative queries.

```typescript
// Test QPS algorithm
const results = await search(db, {
  algorithm: 'qps',  // vs 'bm25' (default)
  term: 'Wylder grapple damage',
  // ...
})
```

**Evaluation**: Track precision@10 (% of top 10 results that are relevant) for both algorithms.

### Recommendation 5: Implement Faceted Search

**Enhancement**: Add facets to help users refine queries.

```typescript
const results = await search(db, {
  term: 'damage',
  facets: {
    type: {},    // Returns: { 'skill': 15, 'weapon': 8, ... }
    tags: {}     // Returns: { 'combat': 23, 'magic': 12, ... }
  }
})

// Frontend displays:
// "damage" → 45 results
// Filter by: Skills (15) | Weapons (8) | Spells (6) | ...
// Tags: Combat (23) | Magic (12) | ...
```

**Benefit**: User narrows search interactively instead of rephrasing query.

### Recommendation 6: DO NOT Implement (Yet)

**Skip These Techniques Initially**:
1. **Complex Query Rewriting**: Hybrid search already handles semantic variation
2. **Multi-Vector Indexing**: Not supported by Orama, minimal benefit for short wiki chunks
3. **Query Instruction Prefix**: bge-small-en-v1.5 works well without it
4. **Custom Embedding Fine-tuning**: Premature optimization, test default model first

**Why**: These add complexity with minimal gain for your use case. Start simple, measure, then optimize.

---

## Implementation Priority

### Phase 1: Low-Hanging Fruit (Immediate)
1. ✅ **Hybrid search** (already implemented)
2. **Add field boosting** to existing search (5 min change)
3. **Test QPS algorithm** vs BM25 (1 hour benchmark)

### Phase 2: Schema Enhancements (Next Sprint)
4. **Add aliases field** to schema
5. **Expand tags** during scraping (extract abilities, weapons, etc.)
6. **Implement faceted search** UI

### Phase 3: Advanced (If Needed)
7. **LLM-generated search summaries** at index time
8. **bge-reranker** for top-k re-ranking (two-stage retrieval)
9. **Fine-tune embeddings** on wiki-specific data

---

## Evaluation Methodology

**Critical**: Measure improvements objectively.

### Key Metrics

1. **Recall@10**: % of relevant docs in top 10 results
2. **Precision@10**: % of top 10 results that are relevant
3. **MRR (Mean Reciprocal Rank)**: Average of 1/rank for first relevant result
4. **Query Latency**: 95th percentile response time

### Test Dataset

Create 50-100 representative queries:
- Exact name queries: "Wylder", "Hookshot"
- Natural language: "what does Wylder's skill do?"
- Partial matches: "grapple damage"
- Synonyms: "hookshot" (when content says "grappling hook")
- Misspellings: "Wyldr", "grapel"

### A/B Testing

Compare configurations:
- **Baseline**: Current hybrid search
- **A**: Hybrid + field boosting
- **B**: Hybrid + boosting + aliases
- **C**: Hybrid + boosting + aliases + QPS

Measure metrics for each configuration.

**Sources:**
- [Query Rewriting Evaluation - ZenML](https://www.zenml.io/blog/query-rewriting-evaluation)

---

## Key Takeaways

### DO These Things:
1. ✅ **Use hybrid search** (vector + full-text) — already implemented
2. **Add field boosting** to prioritize names/headers over content
3. **Expand schema** with aliases, abilities, tags for better keyword matching
4. **Test QPS algorithm** vs BM25 for your specific content
5. **Implement faceted search** for user-driven refinement
6. **Measure objectively** using recall@10, precision@10, MRR

### DON'T Do These (Initially):
1. ❌ Complex query rewriting (hybrid search handles it)
2. ❌ Instruction prefixes for bge-small-en-v1.5 (not needed in v1.5)
3. ❌ Hard similarity score thresholds (use relative ranking)
4. ❌ Multi-vector indexing (not supported, unnecessary complexity)

### The Core Insight

**You cannot predict query formats, so don't try.**

Instead:
- **Cast a wide net** with hybrid search (keyword + semantic)
- **Refine with boosting** to prioritize important fields
- **Enable user refinement** through facets/filters
- **Measure and iterate** based on real query performance

Hybrid search already handles most query variability through the vector component. Your main job is optimizing **which fields get matched** (boosting) and **how users refine results** (facets), not predicting all possible query phrasings.

---

## Agent Recommendations

- **For Implementation**: The `nextjs-expert` or `typescript-expert` agents can implement boosting, aliases, and faceted search
- **For Evaluation**: The `unit-test-maintainer` agent can create test suites for measuring recall@10 and precision@10
- **For Architecture**: The `system-architecture-reviewer` can evaluate the multi-field indexing strategy
- **For Search UI**: The `nextjs-expert` agent can build faceted search interface

---

## Sources

### Hybrid Search & RRF
- [Hybrid Search Overview - Microsoft Azure AI Search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview)
- [A Comprehensive Hybrid Search Guide - Elastic](https://www.elastic.co/what-is/hybrid-search)
- [Reciprocal Rank Fusion (RRF) - OpenSearch](https://opensearch.org/blog/introducing-reciprocal-rank-fusion-hybrid-search/)
- [Better RAG results with RRF - Assembled](https://www.assembled.com/blog/better-rag-results-with-reciprocal-rank-fusion-and-hybrid-search)
- [Hybrid Search Using RRF in SQL - SingleStore](https://www.singlestore.com/blog/hybrid-search-using-reciprocal-rank-fusion-in-sql/)
- [Weighted RRF - Elasticsearch Labs](https://www.elastic.co/search-labs/blog/weighted-reciprocal-rank-fusion-rrf)

### Orama Documentation
- [Orama GitHub Repository](https://github.com/oramasearch/orama)
- [Fields Boosting - Orama Docs](https://docs.orama.com/open-source/usage/search/fields-boosting)
- [Facets - Orama Docs](https://docs.orama.com/open-source/usage/search/facets)
- [Filters - Orama Docs](https://docs.orama.com/open-source/usage/search/filters)
- [Changing Default Search Algorithm - Orama Docs](https://docs.orama.com/docs/orama-js/search/changing-default-search-algorithm)
- [Performing hybrid search - Orama Docs](https://docs.orama.com/cloud/performing-search/hybrid-search)

### Query Expansion & Rewriting
- [Query Expansion - ScienceDirect Topics](https://www.sciencedirect.com/topics/computer-science/query-expansion)
- [Fundamentals of query rewriting - OpenSource Connections](https://opensourceconnections.com/blog/2021/10/19/fundamentals-of-query-rewriting-part-1-introduction-to-query-expansion/)
- [Advanced RAG: Query Expansion - Haystack](https://haystack.deepset.ai/blog/query-expansion)
- [Query Rewriting in RAG - ZenML Blog](https://www.zenml.io/blog/query-rewriting-evaluation)
- [Raising the bar for RAG excellence - Microsoft](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/raising-the-bar-for-rag-excellence-query-rewriting-and-new-semantic-ranker/4302729)
- [Search relevance tuning - Elasticsearch Labs](https://www.elastic.co/search-labs/blog/search-relevance-tuning-in-semantic-search)

### BGE Embeddings
- [BAAI/bge-small-en-v1.5 - Hugging Face](https://huggingface.co/BAAI/bge-small-en-v1.5)
- [BGE Series Documentation](https://bge-model.com/tutorial/1_Embedding/1.2.1.html)
- [BGE v1 & v1.5 Documentation](https://bge-model.com/bge/bge_v1_v1.5.html)
- [FlagEmbedding GitHub](https://github.com/FlagOpen/FlagEmbedding)

### Multi-Vector & Advanced Techniques
- [Multi-Vector HNSW Indexing in Vespa](https://blog.vespa.ai/semantic-search-with-multi-vector-indexing/)
- [Semantic Search - Google Cloud](https://cloud.google.com/discover/what-is-semantic-search)
- [How hybrid approaches combine full-text and vector search - Zilliz](https://zilliz.com/ai-faq/how-do-hybrid-approaches-combine-fulltext-and-vector-search)

### Production Best Practices
- [Semantic Search Evaluation (arXiv)](https://arxiv.org/html/2410.21549v1)
- [Demystifying Semantic Search - Nieve Consulting](https://www.nieveconsulting.com/blog/demystifying-semantic-search-step-by-step-semantic-search-engine-implementation)

---

**Research completed by**: research-specialist agent
**Date**: 2026-01-12
**Project**: nightreign-query (game wiki RAG system)
