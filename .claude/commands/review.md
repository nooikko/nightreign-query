# Deep Analysis Code Review Command

**Mission**: Perform a rigorous code review by tracing actual data flows, understanding the full context of how code executes, and only reporting issues you can demonstrate with concrete evidence.

**This is NOT pattern matching.** Static analyzers do pattern matching. You are here to understand the application holistically and make informed judgments about real problems.

---

## Pre-Review: Scope & Preparation

### Determine What to Review

Based on $ARGUMENTS:

| Input | Action |
|-------|--------|
| No arguments | Review uncommitted changes: `git diff` and `git diff --cached` |
| File path(s) | Review specified files |
| `--branch {name}` | Review changes on branch vs main: `git diff main...{name}` |
| `--commit {hash}` | Review specific commit: `git show {hash}` |
| `--last {n}` | Review last N commits: `git diff HEAD~{n}...HEAD` |
| `--pr {number}` | Review PR changes: `gh pr diff {number}` |
| `--range {a}..{b}` | Review commit range: `git diff {a}..{b}` |

### Effort Scaling

**IMPORTANT: There is no "simple" review.** Every review gets thorough treatment.

| Scope | Approach | Parallelization |
|-------|----------|-----------------|
| **1-3 files** | Full investigation: read imports, trace data flows, research unfamiliar patterns | Read all files + imports in parallel |
| **4-10 files** | Use Explore agent for architecture mapping, then full investigation per module | Parallel file reads + parallel investigations |
| **10+ files** | Split into domains, assign investigation tracks, synthesize findings | Multiple parallel investigation tracks |

The temptation to "just quickly review this small change" leads to:
- Missing context from imports that changes the meaning of code
- Assuming patterns are wrong when they're intentional
- Flip-flopping findings because you didn't understand the full picture

**Minimum baseline for ANY review:**
- Read CLAUDE.md for project conventions
- Read ALL imports for files under review
- Consider research-specialist for unfamiliar libraries
- Trace at least one complete data flow

### Knowledge Check (Before Starting)

1. **Check CLAUDE.md** - Are there project-specific patterns or conventions that affect how this code should be written?
2. **Check AI_RESEARCH/** - Is there existing research about patterns used in this codebase?
3. **Identify unfamiliar libraries** - If the code uses libraries you don't know well, use the **research-specialist agent** to understand them before making judgments

### Parallel File Reading

When you need to read multiple files, **read them in parallel** using multiple Read tool calls in a single message. Don't read one file, analyze it, then read the next. Instead:

```
Read in parallel:
- Primary file under review
- All its imports from the same package
- Type definitions it uses
- Related test files (to understand expected behavior)
```

**SYNCHRONIZATION POINT**: Complete ALL reading before beginning investigation. You cannot investigate with incomplete context.

---

## Core Philosophy

### What Makes a Valid Finding

A finding is valid ONLY if you can answer YES to at least one:

1. **Can you demonstrate a failure case?**
   - Show specific inputs that cause wrong output/crash/security breach
   - Trace the exact code path that leads to failure

2. **Can you show a violated contract?**
   - Point to documentation, types, or API specs that the code doesn't honor
   - Show the mismatch between stated behavior and actual behavior

3. **Can you trace data corruption?**
   - Follow data from entry point through transformations to exit
   - Show where it becomes invalid, lost, or exposed incorrectly

If you can't do any of these, **it's not a finding - it's an opinion.**

### What is NOT a Valid Finding

- "This pattern is generally discouraged" (without showing the actual problem HERE)
- "This could potentially cause issues" (without demonstrating the specific issue)
- "Best practice suggests..." (without proving the practice applies to this context)
- "I've seen this cause problems" (without showing it causes problems HERE)

---

## Mandatory: Follow the Imports

**HARD REQUIREMENT**: You cannot judge code without understanding its dependencies.

Before making ANY judgment about a file:

1. **Read every imported module** that the code under review uses
2. **Understand what those imports actually do** - not what their names suggest
3. **Trace types back to their definitions** - don't assume based on names
4. **Check utility functions** - that "unsafe-looking" call might be safe inside

### The Import Rule

```
If file A imports from files B, C, D:
  → You MUST read B, C, D before judging A
  → If B imports from E, and you need to understand B, read E too
  → Stop when you have enough context to make an informed judgment
```

### What This Prevents

**Wrong**: "This function doesn't validate its input"
**Reality**: The input comes from `validateInput()` imported from `./validation.ts` which already validated it

**Wrong**: "This type cast is unsafe"
**Reality**: The data comes from `parseWithSchema()` imported from `./parser.ts` which guarantees the type

**Wrong**: "This doesn't handle the error case"
**Reality**: The imported function `safeOperation()` from `./utils.ts` already wraps in try/catch and returns Result type

### Minimum Dependency Depth

For each file under review, you must read at minimum:
- All direct imports from the same package/app
- Type definitions for any types used
- Utility functions that are called
- Schema definitions if data validation is involved

You may skip:
- Node built-ins (`fs`, `path`, etc.) - assume standard behavior
- Well-known libraries (`zod`, `prisma`, `react`) - assume documented behavior
- Type-only imports from `@types/*` packages

---

## Phase 1: Build the Mental Model

Before looking for issues, understand how the application actually works.

### 1.1 Map the Architecture

Read and understand:
- Entry points (API routes, CLI commands, event handlers)
- Data sources (databases, external APIs, user input)
- Core business logic locations
- Output destinations (responses, files, external services)

### 1.2 Trace Key Data Flows

For each major feature, trace:
```
INPUT → Where does data enter the system?
    ↓
VALIDATION → How is it validated/sanitized?
    ↓
PROCESSING → What transformations occur?
    ↓
STORAGE → Where is it persisted? What format?
    ↓
OUTPUT → How does it leave the system?
```

### 1.3 Understand Existing Safeguards

Before flagging something as missing, verify it's actually missing:
- Check if validation happens at a different layer
- Check if the framework provides implicit protection
- Check if upstream code already sanitizes the data
- Check if downstream code handles the edge case

---

## Phase 2: Investigate Potential Issues

For each area of concern, conduct an investigation - not a pattern match.

### When to Use Agents

| Situation | Agent | Why |
|-----------|-------|-----|
| Code uses unfamiliar library/API | **research-specialist** | Understand the library's guarantees before judging usage |
| Complex type system questions | **typescript-expert** | Determine if types actually provide the safety they appear to |
| Need to understand broader architecture | **Explore** (haiku) | Quick mapping of how modules connect |
| Security concern requires verification | **research-specialist** | Verify if a pattern is actually vulnerable or just looks scary |

**Agent Delegation Template** (when spawning investigation sub-tasks):
```
**Agent:** [agent-name]
**Objective:** [Specific question to answer - not "review this"]
**Context:** [What you've learned so far, what you're trying to verify]
**Output Format:** [Factual answer with evidence, not opinions]
**Boundaries:** [This is READ-ONLY investigation - no fixes, no opinions]
```

### Parallel Investigations

If you have multiple independent hypotheses to investigate, spawn them in parallel:
```
Investigate in parallel:
1. Hypothesis A: [specific question] → Read files X, Y, Z
2. Hypothesis B: [specific question] → Read files P, Q, R
3. Hypothesis C: [specific question] → Research library behavior
```

**SYNCHRONIZATION POINT**: Collect all investigation results before writing findings.

### Investigation Template

```markdown
## Investigation: {Area of Concern}

### Hypothesis
{What might be wrong - stated as a question to investigate, not a conclusion}

### Evidence Gathering
1. Entry points that could trigger this: {list files and functions}
2. Data that flows through: {trace the path}
3. Safeguards that exist: {what protection is already in place}
4. Missing safeguards: {what's actually absent - with proof}

### Demonstration
{Show the EXACT scenario that causes the problem}
- Input: {specific values}
- Code path: {file:line → file:line → file:line}
- Result: {what actually happens - not what might happen}

### Verdict
- [ ] CONFIRMED: Issue demonstrated with evidence
- [ ] DISMISSED: Safeguards exist, hypothesis disproven
- [ ] UNCERTAIN: Cannot demonstrate but cannot disprove - note for manual review
```

---

## Phase 3: Confirmed Findings Only

Only report issues where you completed the investigation and marked CONFIRMED.

### Finding Format

```markdown
### [{SEVERITY}] {Descriptive Title}

**Location:** `{path/to/file.ts}:{line_number}`

**The Problem:**
{Precise description of what's wrong - not what "could" be wrong}

**Proof:**
{The specific scenario that demonstrates this is a real issue}
- Input: {exact input that triggers the bug}
- Code path: {trace through the code}
- Result: {what actually happens}
- Expected: {what should happen}

**Why This Matters:**
{Concrete impact - not theoretical risk}

**Fix:**
{Specific solution with code}
```

### Severity Levels

- **CRITICAL**: You can demonstrate security breach, data loss, or crash
- **MAJOR**: You can demonstrate incorrect behavior or significant degradation
- **MINOR**: Code works but creates unnecessary risk or maintenance burden (must still be demonstrated)

---

## Phase 4: Things You Must Verify Before Flagging

### Before Flagging "Missing Validation"
- [ ] Trace the input from its source - is it validated elsewhere?
- [ ] Check if the type system enforces validity
- [ ] Check if the ORM/framework sanitizes automatically
- [ ] Can you actually pass invalid data through the full path?

### Before Flagging "Race Condition"
- [ ] Can the concurrent access actually occur in this deployment model?
- [ ] What's the actual sequence of operations that causes the race?
- [ ] Is there an implicit lock (single-threaded, queue, etc.)?
- [ ] Demonstrate with specific timeline of events

### Before Flagging "Memory Leak"
- [ ] Is this actually a long-running process or request-scoped?
- [ ] Does the runtime garbage collect this automatically?
- [ ] Can you show the memory growing over repeated operations?

### Before Flagging "Performance Issue"
- [ ] What's the actual data size in production?
- [ ] Have you calculated the complexity with real numbers?
- [ ] Is this code path even hot (frequently executed)?
- [ ] Does caching/batching elsewhere mitigate this?

### Before Flagging "Type Safety Issue"
- [ ] Does the schema/validation guarantee the type elsewhere?
- [ ] Can invalid data actually reach this point?
- [ ] Trace backward from the cast - where does the data originate?

---

## Phase 5: Report Structure

```markdown
# Code Review Analysis

## Scope
- Primary files reviewed: {list the files directly under review}
- Dependencies read: {list ALL imported files you read to understand context}
- Data flows traced: {list the key flows you mapped}
- Areas investigated: {list the hypotheses you tested}

## Confirmed Issues

{Only issues that passed the investigation template with CONFIRMED verdict}

## Dismissed Hypotheses

{Brief list of things you investigated but found to be non-issues, with reason}
- {Hypothesis}: Dismissed because {safeguard exists / not reachable / etc.}

## Areas Requiring Human Judgment

{Things you couldn't definitively prove or disprove - uncertainty is honest}

## Recommendation

[ ] APPROVE - No confirmed issues found
[ ] REQUEST CHANGES - Confirmed issues require fixes
[ ] NEEDS DISCUSSION - Some areas need human judgment on acceptable risk
```

---

## Handling Uncertainty

### When You Can't Determine the Answer

If investigation is inconclusive:

1. **State what you tried** - List the files read, traces attempted, research done
2. **Explain the blocker** - Why couldn't you reach a conclusion?
3. **Classify the uncertainty**:
   - **Need more context**: Specific information that would resolve it
   - **Requires runtime testing**: Can only be verified by running code
   - **Domain expertise needed**: Requires knowledge you don't have
4. **Put it in "Areas Requiring Human Judgment"** - Don't guess

### When Research Reveals Complexity

If the research-specialist returns information showing the library/pattern is more nuanced than expected:

- **Update your mental model** before continuing investigation
- **Re-evaluate earlier hypotheses** with new understanding
- **Document the learning** in your findings (helps prevent future false positives)

### Never Silently Skip

If you encounter:
- Files you can't read → Report it, explain impact on review completeness
- Libraries you don't understand → Use research-specialist or flag as limitation
- Code paths too complex to trace → Document the complexity, recommend focused review

---

## What This Review Process Produces

**Old approach (pattern matching):**
> "Type cast without validation found at line 247"

**New approach (data flow analysis):**
> "Investigated whether unvalidated data could reach the type cast at line 247. Traced backward: data enters at API route (line 45), passes through Zod validation (line 67), which enforces the ContentType enum. By the time data reaches line 247, it is guaranteed to be a valid ContentType. DISMISSED - validation happens upstream."

OR if it's actually a problem:

> "The type cast at line 247 receives data from Orama search results. Tracing the index population: data enters via `addBatch` (line 174) with no type field validation. I can insert `{type: 'invalid'}` via the CLI tool, and it will be returned from search and cast to ContentType. CONFIRMED - injection path exists from CLI → index → search → invalid cast."

---

## Anti-Goals

- DO NOT generate a long list of "potential" issues
- DO NOT flag things just because they match a pattern
- DO NOT report without tracing the actual data flow
- DO NOT assume something is missing without checking if it exists elsewhere
- DO NOT provide findings you'd reverse if you saw more context
- DO NOT judge a function without reading its imported dependencies
- DO NOT assume what an imported function does based on its name - READ IT

---

## Tools & Constraints

### Allowed Tools

| Tool | Use For |
|------|---------|
| **Read** | Reading source files, configs, docs |
| **Grep** | Finding patterns across codebase |
| **Glob** | Finding files by name/pattern |
| **Bash** | ONLY for `git diff`, `git log`, `git show`, `gh pr diff` |
| **Task** | Spawning investigation sub-agents (Explore, research-specialist, typescript-expert) |
| **WebFetch/WebSearch** | Researching unfamiliar libraries (via research-specialist) |

### Forbidden Tools

| Tool | Why Forbidden |
|------|---------------|
| **Write** | Review is read-only |
| **Edit** | Review is read-only |
| **NotebookEdit** | Review is read-only |

**You OBSERVE and REPORT. You do NOT fix.**

### Agent Usage (for complex reviews)

| Agent | When to Use | Model |
|-------|-------------|-------|
| **Explore** | Map architecture, find related files | haiku |
| **research-specialist** | Understand unfamiliar libraries/APIs | sonnet |
| **typescript-expert** | Complex type system questions | sonnet |

---

## Review Target

$ARGUMENTS

---

## Execution Checklist

Before submitting your review, verify:

- [ ] Read CLAUDE.md for project conventions
- [ ] Read ALL imports for files under review (listed in report)
- [ ] Each finding has concrete proof (input → code path → result)
- [ ] Dismissed hypotheses are documented with reason
- [ ] Uncertainties are flagged, not guessed at
- [ ] No pattern-matching findings without traced data flow
