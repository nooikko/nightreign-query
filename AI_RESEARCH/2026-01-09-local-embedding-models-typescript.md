# Research: Local Embedding Models for TypeScript Applications

Date: 2026-01-09

## Summary

Research into small, fast embedding models suitable for local deployment in a TypeScript/Node.js application for game wiki content. The focus was on validating all-MiniLM-L6-v2 and identifying better alternatives, along with implementation options.

## Prior Research

No prior research files found in AI_RESEARCH/. This is the initial investigation for the nightreign-query project.

## Research Objectives

1. Validate all-MiniLM-L6-v2 characteristics (dimensions, speed, quality)
2. Identify TypeScript/Node.js libraries for local embeddings
3. Evaluate alternative models (bge-small-en-v1.5, nomic-embed-text, mxbai-embed-large)
4. Determine precomputed vs on-demand embedding strategy
5. Calculate memory/storage requirements for ~10,000 chunks

## Current Findings

### 1. all-MiniLM-L6-v2 Characteristics

**Specifications:**
- **Dimensions:** 384
- **Parameters:** 22.7 million (22MB model size)
- **Max Sequence Length:** 256 tokens (trained on 128 tokens)
- **Architecture:** 6 transformer layers (MiniLM-L6)
- **Training:** Fine-tuned on 1 billion sentence pairs dataset

**Performance:**
- **Speed:** Blazing fast - 14.7 ms per 1K tokens embedding time, 68ms end-to-end latency
- **Quality:** Lower than modern models - achieved only 56% Top-5 accuracy and 28% Top-1 accuracy in benchmarks
- **Issue:** 2019 architecture that cannot compete with modern retrieval-optimized models

**Verdict on all-MiniLM-L6-v2:**
While extremely fast and popular (200M+ downloads on HuggingFace), this model is outdated and not recommended for new projects requiring high retrieval accuracy. It's suitable only for speed-critical applications where 5-8% lower accuracy is acceptable (e.g., autocomplete, casual search).

**Sources:**
- [Hugging Face Model Card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [Model Comparison Benchmarks](https://supermemory.ai/blog/best-open-source-embedding-models-benchmarked-and-ranked/)

### 2. TypeScript/Node.js Implementation Options

#### Option A: Transformers.js (@huggingface/transformers) - RECOMMENDED

**Package:** `@huggingface/transformers` (v3.8.0 as of Jan 2026)
- Formerly `@xenova/transformers` (v1/v2), now official HuggingFace package
- Released v3 in October 2024 with major improvements

**Key Features:**
- Functionally equivalent to Python transformers library
- Uses ONNX Runtime for near-native speed
- WebGPU support (up to 100x faster than WASM on supported hardware)
- Node.js (ESM + CJS), Deno, and Bun compatibility
- 120+ supported architectures, 1200+ pre-converted models
- Local model support via `env.localModelPath`

**Usage Example:**
```typescript
import { pipeline } from "@huggingface/transformers";

const extractor = await pipeline(
  "feature-extraction",
  "BAAI/bge-small-en-v1.5",
  { device: "webgpu" } // or "wasm" for CPU
);

const texts = ["Hello world!", "This is an example sentence."];
const embeddings = await extractor(texts, {
  pooling: "mean",
  normalize: true
});
```

**LangChain Integration:**
```typescript
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";

const model = new HuggingFaceTransformersEmbeddings({
  model: "BAAI/bge-small-en-v1.5",
});

const res = await model.embedQuery("Your text here");
```

**Performance Considerations:**
- Initial model load: 10+ seconds on MacBook Pro M1 Max (one-time cost)
- Models stay cached in memory after first load
- WebGPU can reduce inference time significantly vs WASM
- Memory usage: Can be high (5-12GB for larger models, but small models like bge-small-en use <1GB)

**Startup Optimization:**
- Declare processor and model as static to share across calls
- Use nullish coalescing operator (??=) to initialize once
- Preload models at application startup to avoid first-request latency

**Sources:**
- [Transformers.js GitHub](https://github.com/huggingface/transformers.js)
- [NPM Package](https://www.npmjs.com/package/@xenova/transformers)
- [Transformers.js v3 Announcement](https://huggingface.co/blog/transformersjs-v3)
- [LangChain Documentation](https://js.langchain.com/docs/integrations/text_embedding/transformers/)

#### Option B: onnxruntime-node

**Package:** `onnxruntime-node`

**Key Features:**
- Direct ONNX Runtime bindings for Node.js
- Supports Node.js v16.x+ (recommend v20.x+)
- Multiple execution providers: CPU, CUDA, TensorRT (Linux), DML, WebGPU (Windows)
- TypeScript declarations available
- Lower-level API, more manual setup required

**Performance:**
- WebGPU shows obvious advantages for batch processing
- Graph optimizations (constant folding, node fusions, redundant node eliminations)
- Near-native speed on CPU with WASM

**Use Case:**
Better for direct ONNX model control, but Transformers.js is recommended for ease of use since it uses ONNX Runtime under the hood with a better API.

**Sources:**
- [ONNX Runtime Node.js README](https://github.com/microsoft/onnxruntime/blob/main/js/README.md)
- [NPM Package](https://www.npmjs.com/package/onnxruntime-node)
- [ONNX Runtime WebGPU Performance](https://medium.com/@GenerationAI/performance-of-onnxruntime-webgpu-44a25d9897a9)

### 3. Alternative Models Evaluation

#### RECOMMENDED: bge-small-en-v1.5

**Specifications:**
- **Provider:** Beijing Academy of Artificial Intelligence (BAAI)
- **Dimensions:** 384 (same as MiniLM)
- **Parameters:** 33.36M
- **Model Size:** 0.13 GB (130 MB)
- **Context Length:** 512 tokens
- **License:** MIT (permissive for commercial use)

**Performance:**
- **Accuracy:** 84.7% in benchmarks, significantly better than MiniLM
- **Speed:** 79-82ms latency - slightly slower than MiniLM but still fast
- **MTEB Ranking:** Consistently high on leaderboard
- Best results in BeIR benchmarks among small models

**Key Advantages:**
- Modern architecture (2024)
- Excellent balance of speed and accuracy
- No instruction prefix needed in v1.5 (convenient)
- Available in ONNX format (fp32: 127MB, int8: 32MB)
- Supported by Transformers.js out of the box
- Available via Cloudflare Workers AI with OpenAI-compatible API

**Usage Notes:**
- Use `cls` pooling for more accurate embeddings on larger inputs
- Default pooling is `mean` for backwards compatibility
- Can be quantized to int8 (32MB) with minimal accuracy loss

**Verdict:** BEST CHOICE for the project - modern, fast, accurate, well-supported.

**Sources:**
- [BAAI/bge-small-en-v1.5 on Hugging Face](https://huggingface.co/BAAI/bge-small-en-v1.5)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/models/bge-small-en-v1.5/)
- [BGE Documentation](https://bge-model.com/bge/bge_v1_v1.5.html)

#### Alternative: nomic-embed-text-v1.5

**Specifications:**
- **Dimensions:** 1,024 (larger than bge-small)
- **Context Length:** 8,192 tokens (much larger)
- **Architecture:** Based on nomic-bert-2048 (expanded from 512 to 2048 tokens)

**Performance:**
- **Accuracy:** 86.2% top-5 accuracy - highest among alternatives
- **Speed:** Slower than bge-small due to higher dimensions
- **Strengths:** Excellent for long-context tasks, complex documents

**Trade-offs:**
- 1024 dimensions = 2.67x storage vs 384 dimensions
- Slower embedding generation
- Larger model size
- Better for document-heavy RAG vs sentence-level search

**Use Case:** Better for long documents (>512 tokens), but overkill for typical game wiki chunks.

**Sources:**
- [Nomic AI Blog](https://www.nomic.ai/blog/posts/nomic-embed-text-v1)
- [Ollama nomic-embed-text](https://ollama.com/library/nomic-embed-text)
- [Nomic Embeddings Comparison](https://medium.com/@guptak650/nomic-embeddings-a-cheaper-and-better-way-to-create-embeddings-6590868b438f)

#### Alternative: mxbai-embed-large-v1

**Specifications:**
- **Dimensions:** 1,024
- **Parameters:** 335M
- **Training:** Based on MRL and 2DMSE methods

**Performance:**
- **Accuracy:** 59.25% in tests (mid-range)
- **MTEB:** SOTA for BERT-large sized models (as of March 2024)
- **Speed:** Slower due to larger size and higher dimensions
- Outperforms OpenAI text-embedding-3-large on some tasks

**Trade-offs:**
- Much larger model (335M params)
- Higher dimensional embeddings
- Better than nomic-embed-text (57.25%) but not as good as bge-m3 (72%)

**Use Case:** Better for accuracy-critical applications where latency is less important.

**Sources:**
- [Ollama mxbai-embed-large](https://ollama.com/library/mxbai-embed-large)
- [Model Benchmark Comparison](https://www.tigerdata.com/blog/finding-the-best-open-source-embedding-model-for-rag)

### 4. Model Comparison Summary

| Model | Dimensions | Size | Speed (ms/1K) | Accuracy | Context | Recommendation |
|-------|-----------|------|---------------|----------|---------|----------------|
| all-MiniLM-L6-v2 | 384 | 22MB | 14.7 | 56% (Low) | 256 | ❌ Outdated |
| bge-small-en-v1.5 | 384 | 130MB | ~80 | 84.7% (High) | 512 | ✅ RECOMMENDED |
| nomic-embed-text | 1024 | Larger | Slower | 86.2% (Highest) | 8192 | Consider for long docs |
| mxbai-embed-large | 1024 | 335M | Slower | 59% (Mid) | - | Overkill for this use case |

### 5. Storage Requirements for ~10,000 Chunks

**Calculation for 384 Dimensions (bge-small-en-v1.5):**
- Each dimension stored as 32-bit float (4 bytes)
- Storage = 10,000 vectors × 384 dimensions × 4 bytes = **15.36 MB**
- With metadata and indexing overhead: **~20-25 MB total**

**Calculation for 1024 Dimensions (nomic/mxbai):**
- Storage = 10,000 vectors × 1024 dimensions × 4 bytes = **40.96 MB**
- With overhead: **~50-60 MB total**

**Performance Impact:**
- 384 dimensions: ~4x faster similarity computation than 1536 dimensions
- Query latency scales with dimension count
- Lower dimensions enable sub-50ms responses

**Optimization Options:**
- Quantization: Convert float32 to int8 (4x smaller, minimal accuracy loss)
- With int8 quantization: 10,000 × 384 × 1 byte = **3.84 MB**

**Conclusion:** Storage is negligible for 10K chunks. 384 dimensions (bge-small) is optimal for speed without sacrificing much storage.

**Sources:**
- [Milvus Storage Requirements](https://milvus.io/ai-quick-reference/what-are-the-storage-requirements-for-embeddings)
- [Embedding Dimensions Guide](https://particula.tech/blog/embedding-dimensions-rag-vector-search)
- [Vector Storage Costs](https://medium.com/@singhrajni/vector-embeddings-at-scale-a-complete-guide-to-cutting-storage-costs-by-90-a39cb631f856)

### 6. Precomputed vs On-Demand Embeddings

#### Best Practices for RAG Systems (2024-2025)

**Precomputed Embeddings (RECOMMENDED for this use case):**

**Advantages:**
- Zero latency for document embeddings at query time
- Consistent embeddings across all queries
- Enables batch processing during scraping/ingestion
- Multi-vector models like ColBERT allow pre-computation of document representations
- Can compute once during scrape-time and store in vector database

**Workflow:**
1. Scrape game wiki content
2. Chunk documents (align chunk size with context window)
3. Generate embeddings in batch
4. Store in vector database (with metadata)
5. At query time: Only embed the query (fast)

**Query-Time Strategy:**
- Precompute frequent queries and cache in-memory
- Use batch retrieval for high-concurrency workloads
- Hybrid search: Combine dense embeddings with BM25 keyword search (Reciprocal Rank Fusion)

**On-Demand Embeddings:**

**When to Use:**
- Frequently changing content (not typical for game wikis)
- Real-time updates required
- Storage constraints (rare for 10K chunks)

**Challenges:**
- Added latency at query time (must embed documents + query)
- Stale embeddings if content changes
- Higher computational cost per query

**Recommendation for Game Wiki Content:**

✅ **Precompute embeddings at scrape-time** because:
- Game wiki content is relatively static
- 10K chunks is small enough to store all embeddings
- Sub-50ms query latency requirement (no time for document embedding)
- Batch processing is more efficient than on-demand

**Re-embedding Strategy:**
- Monitor content changes via version hashes
- Re-embed on model upgrades
- Re-embed when content is updated (can be incremental)
- Track metrics: recall@k, latency, index memory

**Sources:**
- [Advanced RAG Techniques 2024](https://greennode.ai/blog/best-embedding-models-for-rag)
- [RAG Best Practices](https://dev.to/satyam_chourasiya_99ea2e4/mastering-retrieval-augmented-generation-best-practices-for-building-robust-rag-systems-p9a)
- [Embedding Model Finetuning](https://www.databricks.com/blog/improving-retrieval-and-rag-embedding-model-finetuning)
- [Neo4j Advanced RAG](https://neo4j.com/blog/genai/advanced-rag-techniques/)

### 7. Memory and Startup Time Considerations

**Model Loading (First Time):**
- Small models (bge-small-en-v1.5): 2-5 seconds initial load
- Models cached in memory after first load
- Use static declarations to persist models across calls
- Preload at application startup to avoid first-request latency

**Runtime Memory Usage:**
- bge-small-en-v1.5 (130MB model): <500MB RAM during inference
- all-MiniLM-L6-v2 (22MB model): <200MB RAM during inference
- Larger models (PHI-3, Whisper): Can use 5-12GB RAM

**Optimization Strategies:**
1. **Lazy Loading:** Load model on first use, cache for subsequent requests
2. **Static Models:** Share model instance across all API calls
3. **WebGPU:** Offload to GPU if available (much faster)
4. **Quantization:** Use int8 models (32MB vs 127MB) with minimal accuracy loss
5. **Warm-up:** Pre-generate embeddings during startup to initialize model

**Startup Time Example:**
```typescript
// Singleton pattern for model caching
class EmbeddingService {
  private static pipeline: any;

  static async initialize() {
    if (!this.pipeline) {
      this.pipeline = await pipeline(
        "feature-extraction",
        "BAAI/bge-small-en-v1.5",
        { device: "webgpu" }
      );
    }
    return this.pipeline;
  }
}

// Initialize at app startup
await EmbeddingService.initialize();
```

**Sources:**
- [Transformers.js Memory Issues](https://github.com/huggingface/transformers.js/issues/759)
- [Model Loading Time](https://github.com/xenova/transformers.js/issues/731)

## Key Takeaways

1. **Model Choice:** Use **bge-small-en-v1.5** instead of all-MiniLM-L6-v2
   - Modern architecture (2024 vs 2019)
   - 84.7% accuracy vs 56%
   - Still fast (80ms vs 68ms) - acceptable trade-off
   - Same 384 dimensions = same storage

2. **Implementation:** Use **@huggingface/transformers** (v3+)
   - Official HuggingFace package
   - WebGPU support for speed
   - Easy API, great TypeScript support
   - Works with LangChain integration

3. **Strategy:** **Precompute embeddings at scrape-time**
   - Store in vector database
   - Only embed queries at runtime
   - Re-embed on content updates or model upgrades

4. **Storage:** Negligible at 10K chunks
   - 15MB for 384-dim embeddings (uncompressed)
   - 3.8MB with int8 quantization

5. **Performance:** Sub-50ms query possible
   - 384 dimensions = 4x faster than 1536
   - Precomputed documents = zero doc embedding latency
   - WebGPU can make it even faster

6. **Alternative if Quality > Speed:** nomic-embed-text-v1.5
   - 86.2% accuracy (highest)
   - 1024 dimensions (2.67x storage)
   - Best for long documents (8K context)

## Gotchas and Warnings

1. **Package Name Change:** Use `@huggingface/transformers` not `@xenova/transformers`
2. **WebGPU Memory Leaks:** Some reports of memory issues with WebGPU (monitor in production)
3. **First Load Latency:** 2-10 seconds on cold start - preload at app startup
4. **MTEB Misleading:** Overall MTEB score doesn't guarantee performance on your specific data
5. **Model Size:** Download 130MB model on first use (can cache locally with `env.localModelPath`)
6. **Quantization Trade-off:** int8 saves 75% storage but slight accuracy loss
7. **Context Limits:** bge-small-en-v1.5 is 512 tokens - chunk documents accordingly

## Recommendations for Next Steps

1. **For Implementation:**
   - The **nextjs-expert** agent can implement the embedding service
   - The **typescript-expert** agent can create proper types for embeddings and vector storage
   - The **unit-test-maintainer** agent can create tests for embedding generation

2. **For Architecture:**
   - The **system-architecture-reviewer** can evaluate the RAG architecture
   - Consider hybrid search (dense + BM25) for production

3. **For Vector Database:**
   - Research vector database options (separate research task)
   - Consider: Qdrant, Weaviate, Milvus, or simple in-memory with HNSW index

## Additional Resources

### Official Documentation
- [Transformers.js Official Docs](https://huggingface.co/docs/transformers.js/en/index)
- [BGE Model Documentation](https://bge-model.com/bge/bge_v1_v1.5.html)
- [ONNX Runtime JavaScript](https://tomwildenhain-microsoft.github.io/onnxruntime/docs/get-started/with-javascript.html)

### Benchmarks and Comparisons
- [MTEB Leaderboard](https://modal.com/blog/mteb-leaderboard-article)
- [Open Source Embedding Models Benchmark](https://research.aimultiple.com/open-source-embedding-models/)
- [Best Embedding Models 2026](https://elephas.app/blog/best-embedding-models)

### Implementation Examples
- [Transformers.js Examples](https://github.com/huggingface/transformers.js/tree/main/examples)
- [LangChain Embeddings Integration](https://js.langchain.com/docs/integrations/text_embedding/transformers/)

### RAG Best Practices
- [Advanced RAG Techniques](https://neo4j.com/blog/genai/advanced-rag-techniques/)
- [RAG Without Embeddings](https://www.digitalocean.com/community/tutorials/beyond-vector-databases-rag-without-embeddings)
- [Embedding Model Selection Guide](https://galileo.ai/blog/mastering-rag-how-to-select-an-embedding-model)

## Sources

All URLs and documentation versions consulted are linked inline throughout this document.

---

**Research completed by:** research-specialist agent
**Date:** 2026-01-09
**Project:** nightreign-query (game wiki RAG system)
