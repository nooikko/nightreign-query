# Research: RAG Search Quality Evaluation Best Practices

Date: 2026-01-14

## Summary

Comprehensive guide to evaluating RAG (Retrieval Augmented Generation) system quality through structured test suites, metrics, and evaluation methodologies. This research provides practical implementation patterns for semantic search quality assessment, test dataset construction, and LLM response evaluation.

## Key Research Findings

### 1. Evaluation Architecture: Three-Tier Approach

RAG systems should be evaluated at three distinct levels:

1. **Retrieval Quality** - Measure how well the system finds relevant documents
2. **Generation Quality** - Measure how well the LLM formats and answers based on retrieved context
3. **End-to-End Quality** - Measure overall system performance as users experience it

This separation allows identification of bottlenecks. If retrieval is weak, generation won't fix it.

### 2. Core Metrics Framework

#### Retrieval Metrics (Ranking-Based)
- **MRR (Mean Reciprocal Rank)**: Best for Q&A where first relevant result matters most. Measures position of first relevant document.
- **NDCG@K (Normalized Discounted Cumulative Gain)**: Best for ranking evaluation where multiple results are relevant. Accounts for relevance grading (relevant vs. somewhat relevant vs. not relevant).
- **Precision@K & Recall@K**: How many retrieved results are relevant and coverage of relevant documents.
- **Contextual Recall**: Whether retrieved documents contain all information needed for ideal answer.
- **Contextual Precision**: Whether retrieved chunks are properly ranked by relevance order.

#### Generation Metrics (Answer Quality)
- **Answer Relevancy**: Does the generated response address the input question effectively?
- **Faithfulness**: Does the response contain hallucinations or stay grounded in source documents?
- **Contextual Relevancy**: Is the retrieved context actually relevant to the query?
- **Semantic Similarity**: Does the generated answer capture the same meaning as expected answers (handles paraphrasing)?

### 3. Test Dataset Construction Strategy

#### Required Diversity in Query Categories

Create test datasets with minimum coverage of these query types:

1. **Simple Factual Questions**: Single-source answers with clear correct responses
   - Example: "What is the boss weakness?"
   - Expected: High retrieval accuracy, straightforward generation

2. **Multi-Hop/Complex Queries**: Requires reasoning across multiple documents
   - Example: "Compare weapon A vs weapon B for PvP"
   - Expected: System must retrieve multiple relevant chunks and synthesize answer

3. **Ambiguous/Unclear Queries**: Multiple valid interpretations
   - Example: "Best strategy?" (without context)
   - Expected: System should ask clarifying questions or cover interpretations

4. **Null Queries**: Questions where answer truly isn't in knowledge base
   - Example: "What DLC content is in [future DLC]?"
   - Expected: System should return "I don't know" instead of hallucinating

5. **Edge Cases**: Paraphrased questions, typos, foreign language, incomplete information
   - Example: "wep stats" instead of "weapon statistics"
   - Expected: Robust handling through query understanding

6. **Multi-Part Questions**: Queries requiring answers to multiple sub-questions
   - Example: "What are boss drops, location, and difficulty?"
   - Expected: Comprehensive answers addressing all parts

#### Dataset Construction Methodology

1. **Start with Real Data**
   - Mine actual user search queries (if available)
   - Review past support logs or common questions
   - Identify patterns in user behavior

2. **Define User Personas**
   - Casual player looking for quick tips
   - Hardcore player seeking optimization
   - New player needing comprehensive guides
   - Ensure synthetic questions match expected persona behavior

3. **Manual + Synthetic Balance**
   - Build core test set manually (50-100 questions with ground truth)
   - Expand with synthetic generation for coverage
   - Use domain experts to identify nuanced edge cases

4. **Ground Truth Annotation**
   - For each query: list expected relevant documents/chunks
   - Provide reference answer (what ideal response should contain)
   - Tag query type and difficulty level

5. **Version Control Test Sets**
   - Keep evaluation dataset stable during focused experiments
   - Update over time as content changes or new edge cases discovered
   - Maintain separate test sets for regression vs. new feature testing

### 4. Evaluation Implementation Pattern

#### Basic Test Structure
```
For each query in test_dataset:
  1. Run search/retrieval → get top-K documents
  2. Evaluate retrieval quality:
     - Is first result relevant? (MRR)
     - How well-ranked are all results? (NDCG)
  3. Pass retrieved documents to LLM
  4. Evaluate generation quality:
     - Is answer relevant? (answer relevancy)
     - Is answer grounded in context? (faithfulness)
  5. Log results with retrieval context for debugging
```

#### Component-Level Evaluation
Evaluate retriever and generator separately to pinpoint failures:
- Retriever failing: Poor document ranking, wrong documents retrieved
- Generator failing: Good documents retrieved but poorly formatted answer
- Both failing: Multiple issues need addressing

### 5. Quality Assurance Approaches

#### Metric Combination Strategy
- Use **reference-free metrics** (LLM-as-judge) for rapid iteration and broad coverage
- Use **reference-based metrics** (comparison to ground truth) for precise measurement on critical queries
- Combine both approaches: speed + accuracy

#### Human Evaluation Best Practices

1. **Annotation Guidelines**
   - Write clear, unambiguous guidelines for relevance judgment
   - Provide examples of each rating level (relevant, somewhat relevant, not relevant)
   - Define edge cases explicitly

2. **Inter-Annotator Agreement (IAA)**
   - Have multiple annotators judge same subset of queries
   - Measure agreement using Cohen's kappa or similar metrics
   - Kappa > 0.7 indicates strong agreement; < 0.4 indicates guidelines need clarification
   - Use adjudication process when annotators disagree

3. **Ground Truth Establishment**
   - Multiple human judgments → IAA score → adjudicator resolves disagreements
   - Use as upper bound for system performance
   - Higher IAA = more reliable benchmark

#### Automated Evaluation with LLM-as-Judge
- Use frameworks like G-Eval to score responses on custom criteria
- Define evaluation criteria in natural language ("Is this answer helpful to a player?")
- Faster than human review, scalable, but verify against human judgments

### 6. Common Evaluation Challenges and Solutions

| Problem | Root Cause | Solution |
|---------|-----------|----------|
| Lost in the Middle | LLM loses focus with too much context | Limit retrieval to top-3 documents, rerank before generation |
| Hallucination | LLM invents facts not in retrieved context | Test faithfulness metric, add retrieval quality checks |
| Poor Retrieval | Wrong documents ranked first | Use NDCG/MRR to identify ranking issues, adjust chunking strategy |
| Ambiguous Answers | System can't handle unclear questions | Include query clarification in evaluation, test with paraphrased versions |
| Incomplete Answers | Multi-hop queries partially answered | Extend retrieval to more documents, test multi-hop specifically |

### 7. Query Categorization for Elden Ring Domain

For the Nightreign Query application, structure test dataset with:

1. **Boss Queries** (40%): Weaknesses, attacks, strategies, locations
2. **Weapon/Item Queries** (25%): Stats, scaling, locations, comparisons
3. **Build Optimization** (15%): Stat allocation, synergies, class choices
4. **Lore/Worldbuilding** (10%): Storytelling, character backgrounds, quest lines
5. **Meta/Strategy** (10%): PvP tactics, speedrun routes, difficulty scaling

Each category should include:
- Simple factual queries
- Multi-hop queries requiring multiple documents
- Null queries (content not in database)
- Edge cases and paraphrases

## Recommended Metrics Priority

### For Immediate Implementation (MVP)
1. **Precision@K** - Simple, interpretable: "Of top 3 results, how many are relevant?"
2. **Faithfulness** - Critical for trust: "Does answer stay grounded in source?"
3. **Answer Relevancy** - User-facing quality: "Does answer actually help?"

### For Mature Evaluation
1. **NDCG@K** - Comprehensive ranking assessment
2. **Contextual Recall** - "Did we retrieve all needed info?"
3. **Semantic Similarity** - Handles paraphrased answers
4. **Human Ranking** - Ground truth for calibration

## Implementation Roadmap

### Phase 1: Manual Test Suite Creation
1. Define 100-150 test questions with ground truth
2. Categorize by query type and difficulty
3. Establish human annotation guidelines
4. Get 2-3 annotators to judge relevance (build IAA baseline)

### Phase 2: Automated Metrics Framework
1. Implement Precision@K and Recall@K
2. Add Faithfulness evaluation (using LLM-as-judge)
3. Add Answer Relevancy metric
4. Create dashboard showing metric trends

### Phase 3: Advanced Evaluation
1. Implement NDCG@K for ranking assessment
2. Add semantic similarity scoring
3. Establish baseline human evaluation on critical subset
4. Create regression test suite for CI/CD

### Phase 4: Continuous Improvement
1. Monitor production queries and add edge cases to test set
2. Update evaluation dataset as content changes
3. Track metric trends over time
4. Conduct periodic human review of system outputs

## Tools and Frameworks Referenced

- **Ragas** - Reference-based RAG evaluation with built-in metrics
- **TruLens** - Component-level evaluation and logging
- **DeepEval** - LLM-as-judge evaluation with pytest integration
- **ARIZE Phoenix** - Visual debugging of RAG pipelines
- **LangChain Evaluation** - Native evaluation hooks for RAG systems

## Key Takeaways

1. **Separate evaluation concerns**: Retrieve ≠ Generate. Evaluate both independently.
2. **Test dataset is critical**: Quality evaluation depends on representative test cases.
3. **Use multiple metrics**: Single metric won't catch all issues (retrieval vs generation vs hallucination).
4. **Human baseline matters**: Establish ground truth with human annotation and IAA measurement.
5. **Automate where possible**: Use LLM-as-judge for scale, human review for critical cases.
6. **Monitor continuously**: Add production edge cases to test suite, track metrics over time.

## Sources

- [Qdrant: Best Practices in RAG Evaluation](https://qdrant.tech/blog/rag-evaluation-guide/)
- [Evidently AI: Complete Guide to RAG Evaluation](https://www.evidentlyai.com/llm-guide/rag-evaluation)
- [Confident AI: RAG Evaluation Metrics](https://www.confident-ai.com/blog/rag-evaluation-metrics-answer-relevancy-faithfulness-and-more)
- [Weaviate: Retrieval Evaluation Metrics](https://weaviate.io/blog/retrieval-evaluation-metrics)
- [Evidently AI: NDCG Metric Explained](https://www.evidentlyai.com/ranking-metrics/ndcg-metric)
- [Microsoft Learn: LLM Evaluation Metrics](https://learn.microsoft.com/en-us/ai/playbook/technology-guidance/generative-ai/working-with-llms/evaluation/list-of-eval-metrics)
- [DeepSet: Groundedness Score Evaluation](https://www.deepset.ai/blog/rag-llm-evaluation-groundedness)
- [Deepchecks: RAG Q&A Problems and Evaluation](https://www.deepchecks.com/qa-using-rag-possible-problems-efficient-evaluation/)
- [MultiHop-RAG: Benchmarking Multi-Hop Queries](https://openreview.net/forum?id=t4eB3zYWBK)
- [RAGAS: Test Data Generation](https://docs.ragas.io/en/stable/concepts/test_data_generation/rag/)
