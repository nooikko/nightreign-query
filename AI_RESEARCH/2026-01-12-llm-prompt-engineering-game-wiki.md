# Research: LLM Prompt Engineering for Game Wiki/Database Search Results

Date: 2026-01-12

## Summary

This research covers best practices for LLM prompt engineering specifically for game wiki/database search results, focusing on structured, actionable responses with minimal redundancy. Key findings include modern structured output approaches (JSON Schema), redundancy elimination techniques, contextual linking strategies, and game-specific formatting patterns from Elden Ring wikis.

## Prior Research

No existing AI_RESEARCH files consulted for this initial research.

## Current Findings

### 1. Structured Output with JSON Schema

#### Modern Approach (2026)
- **API-Native Structured Outputs**: OpenAI, Anthropic, and other providers now offer built-in structured output features that guarantee format compliance
- **JSON Schema Enforcement**: Define schemas that the model MUST follow, eliminating concerns about missing keys or invalid enum values
- **Grammar-Based Decoding**: For self-hosted models, constrained decoding modifies logits in real-time to prevent tokens that would violate schema rules

#### Implementation Best Practices
- Use native SDK features (Pydantic for Python, Zod for JavaScript)
- Specify `response_format={"type": "json_schema", ...}` in API calls
- Note: First request with new schema may take 10-30 seconds; subsequent requests have no delay
- **Limitation**: Recursive JSON schemas not supported; unconstrained objects not allowed

#### Example Schema Structure for Game Data
```json
{
  "type": "object",
  "properties": {
    "enemy_name": {"type": "string"},
    "weaknesses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "damage_type": {"type": "string"},
          "effectiveness": {"type": "number", "description": "Percentage increase in damage"},
          "recommended_weapons": {"type": "array", "items": {"type": "string"}},
          "wiki_link": {"type": "string", "format": "uri"}
        }
      }
    },
    "resistances": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "damage_type": {"type": "string"},
          "reduction": {"type": "number", "description": "Percentage damage reduction"}
        }
      }
    }
  },
  "required": ["enemy_name", "weaknesses", "resistances"]
}
```

**Source**: [Structured model outputs | OpenAI API](https://platform.openai.com/docs/guides/structured-outputs), [Structured Output Generation in LLMs](https://medium.com/@emrekaratas-ai/structured-output-generation-in-llms-json-schema-and-grammar-based-decoding-6a5c58b698a6)

---

### 2. Eliminating Redundancy

#### Key Techniques (2026 Updates)

**No Redundancy Required for Modern Models**
- Older models (pre-GPT-5) required caps, exclamation marks, and repeated instructions
- Modern models like GPT-5, Claude Opus 4.5, and Gemini 2.0 require each rule to appear only once
- Remove "superfluous and redundant instructions to keep prompts focused on the core task"

**Prompt Compression**
- Rewrite wordy prompts to include only essential information
- Benefits: Faster execution and lower costs
- Be precise and direct; avoid unnecessary or overly persuasive language

**Explicit Length Control**
- Specify word/bullet count: "Provide 5-10 bullet points" or "100-200 words"
- Use concrete numbers instead of vague terms like "concise" or "brief"

**Few-Shot Over Explanation**
- "Remove instructions from your prompt if your examples are clear enough in showing the task"
- Demonstrating the pattern visually eliminates need for repetitive explanatory text

**Output Prefixes**
- Use prefixes like "JSON:" or "Analysis:" to signal format, reducing need for repeated format instructions

**Example Transformation**:
```
❌ Before (Redundant):
"Please provide information about weaknesses. I need you to tell me about what this enemy is weak to.
Specifically, explain the weakness and provide details about the weakness."

✅ After (Concise):
"List weaknesses with damage type, effectiveness percentage, and recommended weapons."
```

**Sources**: [Three Tips to Enhance Generative AI Responses and Eliminate Redundancy](https://hyper.ai/en/headlines/7f63877e9b8fe3ed0f7dffea0e3c996e), [Prompt design strategies | Gemini API](https://ai.google.dev/gemini-api/docs/prompting-strategies), [The End of Shouting: Prompts as Programs in GPT-5](https://www.robert-glaser.de/prompts-as-programs-in-gpt-5/)

---

### 3. Contextual Links and References

#### Retrieval-Augmented Generation (RAG) Approach

**Source Inclusion Pattern**
- LLMs have no native internet access during inference
- Must provide links in the prompt alongside content
- Format: `content: [retrieved text] source: [URL]`

**Inline Citation Methods**

1. **Unique Identifier System**
   - Assign unique IDs to each source
   - Instruct LLM to use format like `$REF: ID$` or `[1]`
   - Example: "Fire damage is highly effective $REF: FEXTRALIFE_FIRE$"

2. **Markdown Hyperlinks**
   - LLMs natively support Markdown
   - Instruct: "Format responses as Markdown with titles, lists, and links where appropriate"
   - Example: "[Fire Damage](https://eldenring.wiki.fextralife.com/Fire+Damage)"

3. **Inline Source Attribution**
   - "Make the entire body of the answer itself links to the sources"
   - Embed references directly within response text

**Prompt Instructions for Citations**

Direct instructions work best:
- "State the source for each statement"
- "Include wiki links for each damage type, weapon, and enemy mentioned"
- "For every recommendation, provide a hyperlink to the relevant wiki page"

**Post-Processing Verification**
- Third step in RAG: verify LLM response corresponds to actual sources
- Common issue: LLMs sometimes cite wrong sources or fabricate claims
- Recommend systematic verification that citations match source content

**Example Prompt Section**:
```
When mentioning any game entity (weapon, enemy, damage type, location):
1. Include its full wiki URL as a Markdown hyperlink
2. Format: [Entity Name](wiki_url)
3. Only include links that were provided in the source data
```

**Sources**: [Links in LLM responses - by Michael Navat](https://navat.substack.com/p/links-in-llm-responses), [Using LLM Prompts for Source Attribution](https://jamesg.blog/2023/04/02/llm-prompts-source-attribution), [How to add links as a response to LLM model](https://github.com/GoogleCloudPlatform/generative-ai/discussions/248)

---

### 4. Game Wiki Formatting Patterns (Elden Ring Analysis)

#### Standard Presentation Structure

**Damage Type Organization**
- Two major categories: Physical (Standard, Slash, Strike, Pierce) and Elemental (Magic, Fire, Lightning, Holy)
- Each damage type has dedicated page with consistent sections

**Enemy/Boss Page Structure**
```
Enemy Name
├── Weaknesses
│   ├── Effective Against: [Damage Type]
│   ├── Effectiveness: [Percentage or multiplier]
│   └── Notes: [Special mechanics]
├── Resistances
│   ├── Ineffective Against: [Damage Type]
│   ├── Reduction: [Percentage or note about immunity]
│   └── Notes: [Special conditions]
└── Related Links
    ├── Recommended Weapons
    ├── Damage Type Pages
    └── Combat Mechanics
```

**Numerical Value Presentation**
- Damage calculation formula: `(attack rating - defense) × negation`
- Effectiveness shown as:
  - Percentages (e.g., "+25% damage")
  - Multipliers (e.g., "×1.5 damage")
  - Qualitative terms with context (e.g., "Highly Effective" with numerical backup)

**Resistance vs. Immunity Terminology**
- **Resistance**: Reduced damage but not complete immunity
- **Immunity**: No effect from damage type
- Wikis consistently use this distinction

**Linking Strategy**
- Hyperlinks to: Related equipment pages, damage type explanations, status effects, combat mechanics
- Cross-references encourage exploration while keeping main content concise

**Example Format Translation for LLM**:
```json
{
  "enemy": "Caligo Miasma of Night",
  "weaknesses": [
    {
      "damage_type": "Fire",
      "effectiveness": "+35%",
      "description": "Highly effective against dark entities",
      "recommended_weapons": [
        {"name": "Fire Grease", "link": "/items/fire-grease"},
        {"name": "Flame Art Affinity", "link": "/affinities/flame-art"}
      ],
      "wiki_link": "/damage-types/fire"
    }
  ],
  "resistances": [
    {
      "damage_type": "Holy",
      "reduction": "-60%",
      "status": "resistant",
      "wiki_link": "/damage-types/holy"
    },
    {
      "damage_type": "Poison",
      "status": "immune",
      "wiki_link": "/status-effects/poison"
    }
  ]
}
```

**Sources**: [Damage Types | Elden Ring Wiki](https://eldenring.wiki.fextralife.com/Damage+Types), [Calculating Damage | Elden Ring Wiki](https://eldenring.wiki.fextralife.com/Calculating+Damage)

---

### 5. Prompt Engineering for Actionable Game Data

#### Role-Based Prompting
- Assign specific role: "You are a game wiki assistant specializing in Nightreign combat mechanics"
- Aligns model's voice and behavior with context
- Improves consistency across responses

#### Specificity in Instructions

**Bad (Vague)**:
"Tell me about enemy weaknesses"

**Good (Specific)**:
"For each enemy, provide:
1. Weakness damage types with effectiveness percentages
2. 2-3 recommended weapons with links
3. Resistance damage types with reduction percentages
4. Immunity status (if applicable)
5. Tactical notes (max 1 sentence)"

#### Context Provision
- Provide necessary background once at prompt start
- Example: "In Nightreign, damage calculation uses: (attack rating - defense) × negation. Effectiveness ranges from -100% (immune) to +200% (critical weakness)."

#### Format Specification
- Explicitly request structure: "Format as JSON with nested objects for weaknesses and resistances"
- Specify data types: "Percentages as numbers (e.g., 35 not '35%'), links as full URLs"

#### Breaking Down Complex Tasks
- Chain prompts sequentially rather than cramming into one
- Example: First prompt extracts data, second formats for display, third adds contextual links

**Sources**: [Mastering Prompt Engineering: Best Tips for Data Analysis](https://www.linkedin.com/pulse/mastering-prompt-engineering-best-tips-data-analysis-prompts-kumar-0izmf), [Unlocking the Power of Prompt Engineering for Complex Data Analysis](https://visitdays.com/post/unlocking-the-power-of-prompt-engineering-for-complex-data-analysis)

---

## Key Takeaways for Nightreign Implementation

### Structural Recommendations

1. **Use JSON Schema with Groq API**
   - Define strict schema for weaknesses, resistances, recommended items
   - Include fields for: damage_type, numerical_value, description, related_links
   - Enforce required fields to prevent missing data

2. **Eliminate Redundancy Through**
   - Single, clear instructions (no repetition)
   - Few-shot examples showing exact desired output
   - Explicit length/format constraints
   - Output prefixes to signal structure

3. **Enable Actionable Information By**
   - Requiring numerical values (percentages, multipliers) not just qualitative terms
   - Mandating 2-3 specific weapon/item recommendations per weakness
   - Including tactical notes (1 sentence max) for context
   - Providing wiki links for every entity mentioned

4. **Implement Citation System**
   - Embed wiki URLs in source data passed to LLM
   - Use RAG pattern: `content + source URL`
   - Instruct model to format as Markdown hyperlinks
   - Verify citations match actual sources in post-processing

### Example Prompt Template

```
Role: You are a Nightreign game wiki assistant providing combat strategy information.

Context: Nightreign uses damage calculation: (attack rating - defense) × negation.
Effectiveness ranges: -100% (immune) to +200% (critical weakness).

Task: Format the following enemy data into a structured JSON response.

Output Schema:
{
  "enemy_name": "string",
  "weaknesses": [
    {
      "damage_type": "string",
      "effectiveness_percentage": number,
      "recommended_weapons": [{"name": "string", "wiki_url": "string"}],
      "damage_type_wiki_url": "string"
    }
  ],
  "resistances": [
    {
      "damage_type": "string",
      "reduction_percentage": number,
      "is_immune": boolean,
      "damage_type_wiki_url": "string"
    }
  ],
  "tactical_note": "string (max 100 characters)"
}

Requirements:
- Include 2-3 weapon recommendations per weakness
- All percentages as numbers (not strings)
- Wiki URLs must be from provided source data
- Tactical note: one sentence, actionable combat tip

Source Data:
[Your retrieved game data with URLs here]

Output Format: Valid JSON matching schema above.
```

### Validation Checklist

- [ ] Response matches JSON schema exactly
- [ ] All numerical values present (no "N/A" or missing fields)
- [ ] Each weakness has 2-3 weapon recommendations
- [ ] All wiki links verified against source data
- [ ] No redundant phrasing between description and tactical note
- [ ] Response length appropriate (concise, not verbose)

---

## Gaps Identified

1. **Groq-Specific Structured Output Documentation**: Search results focused on OpenAI and Anthropic. Need to verify Groq's JSON mode capabilities and constraints.

2. **Nightreign-Specific Data Structure**: No public documentation found for Nightreign game mechanics (as spinoff is recent/unreleased). May need to infer from Elden Ring patterns.

3. **Real-World Performance Metrics**: No benchmarks found comparing redundancy levels across different prompt styles for game wiki use cases.

## Recommendations for Next Steps

- **TypeScript Expert Agent**: Can define TypeScript interfaces matching the JSON schema for type safety
- **Testing Agent**: Can create validation tests for response structure and citation accuracy
- **Backend Implementation Agent**: Can integrate JSON schema validation with Groq API calls

## Additional Resources

### Prompt Engineering Foundations
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [A comprehensive taxonomy of prompt engineering techniques](https://link.springer.com/article/10.1007/s11704-025-50058-z)
- [Prompt engineering techniques: Top 6 for 2026](https://www.k2view.com/blog/prompt-engineering-techniques/)

### Structured Outputs
- [The guide to structured outputs and function calling with LLMs](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms)
- [How JSON Schema Works for LLM Tools & Structured Outputs](https://blog.promptlayer.com/how-json-schema-works-for-structured-outputs-and-tool-integration/)
- [Configure structured output for LLMs | Anyscale Docs](https://docs.anyscale.com/llm/serving/structured-output)

### Game Database APIs
- [RAWG Video Games Database API](https://api.rawg.io/docs/)
- [Battle.net Game Data APIs](https://community.developer.battle.net/documentation/guides/game-data-apis)

---

## Version-Specific Information

- Research conducted: January 12, 2026
- Modern LLM models referenced: GPT-5, Claude Opus 4.5, Gemini 2.0
- JSON Schema approaches applicable to current API versions as of 2026
- Groq API version not specified; recommend checking latest documentation

## Gotchas and Warnings

1. **First Schema Request Latency**: Initial request with new JSON schema may take 10-30 seconds
2. **No Recursive Schemas**: Cannot use self-referencing structures in JSON schema
3. **Citation Hallucination Risk**: LLMs may cite sources incorrectly; requires verification step
4. **Markdown URL Encoding**: Ensure URLs with special characters are properly encoded in Markdown links
5. **Redundancy Creep**: Even with clear instructions, monitor responses over time for redundancy regression

---

## Sources

### Structured Output & JSON Schema
- [Structured model outputs | OpenAI API](https://platform.openai.com/docs/guides/structured-outputs)
- [The guide to structured outputs and function calling with LLMs](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms)
- [Structured Output Generation in LLMs: JSON Schema and Grammar-Based Decoding](https://medium.com/@emrekaratas-ai/structured-output-generation-in-llms-json-schema-and-grammar-based-decoding-6a5c58b698a6)
- [How JSON Schema Works for LLM Tools & Structured Outputs](https://blog.promptlayer.com/how-json-schema-works-for-structured-outputs-and-tool-integration/)
- [Configure structured output for LLMs | Anyscale Docs](https://docs.anyscale.com/llm/serving/structured-output)

### Redundancy Elimination
- [Three Tips to Enhance Generative AI Responses and Eliminate Redundancy](https://hyper.ai/en/headlines/7f63877e9b8fe3ed0f7dffea0e3c996e)
- [The Ultimate Guide to Prompt Engineering in 2025 | Lakera](https://www.lakera.ai/blog/prompt-engineering-guide)
- [Prompt design strategies | Gemini API](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [The End of Shouting: Prompts as Programs in GPT-5](https://www.robert-glaser.de/prompts-as-programs-in-gpt-5/)
- [Overview of prompting strategies | Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/prompt-design-strategies)

### Citations & Contextual Links
- [Links in LLM responses - by Michael Navat](https://navat.substack.com/p/links-in-llm-responses)
- [Using LLM Prompts for Source Attribution](https://jamesg.blog/2023/04/02/llm-prompts-source-attribution)
- [AI Generated In-Text Citations — Intuitively and Exhaustively Explained](https://iaee.substack.com/p/ai-generated-in-text-citations-intuitively)
- [How to add links as a response to LLM model](https://github.com/GoogleCloudPlatform/generative-ai/discussions/248)
- [Exploring LLM Citation Generation In 2025](https://medium.com/@prestonblckbrn/exploring-llm-citation-generation-in-2025-4ac7c8980794)

### Game Wiki Formatting
- [Damage Types | Elden Ring Wiki](https://eldenring.wiki.fextralife.com/Damage+Types)
- [Calculating Damage | Elden Ring Wiki](https://eldenring.wiki.fextralife.com/Calculating+Damage)
- [Fire Damage | Elden Ring Wiki](https://eldenring.wiki.fextralife.com/Fire+Damage)
- [RAWG Video Games Database API](https://api.rawg.io/docs/)

### General Prompt Engineering
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [A comprehensive taxonomy of prompt engineering techniques](https://link.springer.com/article/10.1007/s11704-025-50058-z)
- [Prompt engineering techniques: Top 6 for 2026](https://www.k2view.com/blog/prompt-engineering-techniques/)
- [Mastering Prompt Engineering: Best Tips for Data Analysis](https://www.linkedin.com/pulse/mastering-prompt-engineering-best-tips-data-analysis-prompts-kumar-0izmf)
- [Unlocking the Power of Prompt Engineering for Complex Data Analysis](https://visitdays.com/post/unlocking-the-power-of-prompt-engineering-for-complex-data-analysis)
