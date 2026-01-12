# PRD Planning & Task Decomposition Command

Parse the PRD and decompose it into actionable tasks with dependencies, priorities, and agent assignments. This command brings Taskmaster-style planning to your existing workflow.

---

## CRITICAL CONSTRAINTS

**YOU MUST FOLLOW THESE RULES:**

1. **Read Before Planning**: Always read the full PRD.md before decomposing
2. **Atomic Tasks**: Each task must be completable in a single session (< 2 hours of work)
3. **Explicit Dependencies**: Every task must declare its dependencies (or "none")
4. **Agent Assignment**: Every task must be assigned to a specific agent
5. **No Implementation**: This command plans only - use `/do` to implement

---

## PHASE 1: PRD ANALYSIS

### 1.1 Load Current State

First, read the PRD and existing task state:

1. **Read PRD.md** to understand the full product scope
2. **Read .taskmaster/tasks.json** to see existing tasks
3. **Check AI_RESEARCH/** for relevant prior research

### 1.2 Identify Scope

Parse $ARGUMENTS to determine planning scope:

```
IF user specifies a section (e.g., "F4: Session Persistence")
   → Focus on that section only
ELSE IF user specifies "high priority" or "immediate"
   → Focus on items marked "High Priority" in PRD
ELSE IF user specifies "all" or no scope
   → Scan all incomplete [ ] items in PRD
```

### 1.3 Extract Incomplete Items

Find all items matching this pattern:
- `- [ ]` (unchecked markdown checkbox)
- Items under "Immediate Next Steps"
- Items under "Known Issues / Tech Debt"

**SYNCHRONIZATION POINT**: Complete PRD analysis before proceeding to task generation.

---

## PHASE 2: TASK GENERATION

### 2.1 Task Structure

For each incomplete item, create a task with this structure:

```json
{
  "id": "TASK-001",
  "title": "Short descriptive title",
  "description": "Full description of what needs to be done",
  "prdReference": "F4.1 - Auto-reconnect on network drop",
  "status": "pending",
  "priority": "high|medium|low",
  "complexity": "simple|medium|complex",
  "dependencies": ["TASK-000"] or [],
  "agent": "nextjs-expert|typescript-expert|unit-test-maintainer|research-specialist|general",
  "acceptanceCriteria": [
    "Criterion 1",
    "Criterion 2"
  ],
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

### 2.2 Agent Assignment Decision Tree

```
IF task involves:
   - Next.js pages, layouts, routes
   - Server Components or Client Components
   - Server Actions or API routes
   - React components
THEN → agent: "nextjs-expert"

ELSE IF task involves:
   - TypeScript type definitions
   - Generic types or type errors
   - Fixing `any` or `unknown` types
   - Interface definitions
THEN → agent: "typescript-expert"

ELSE IF task involves:
   - Creating new tests
   - Updating test coverage
   - Test infrastructure
THEN → agent: "unit-test-maintainer"

ELSE IF task involves:
   - Research or investigation
   - External API integration
   - New library evaluation
THEN → agent: "research-specialist"

ELSE IF task involves:
   - Architecture decisions
   - System design
   - Pattern selection
THEN → agent: "system-architecture-reviewer"

ELSE:
   → agent: "general"
```

### 2.3 Priority Assignment

```
IF task is in "High Priority" section OR blocks other tasks
   → priority: "high"
ELSE IF task is in "Medium Priority" section
   → priority: "medium"
ELSE
   → priority: "low"
```

### 2.4 Complexity Assessment

```
IF task affects 1-2 files AND is straightforward
   → complexity: "simple"
ELSE IF task affects 3-5 files OR requires moderate design
   → complexity: "medium"
ELSE IF task affects 6+ files OR requires architecture decisions
   → complexity: "complex"
```

### 2.5 Dependency Detection

Analyze tasks for implicit dependencies:
- Authentication tasks depend on Clerk integration
- UI tasks may depend on component infrastructure
- Persistence tasks depend on database schema
- Features depend on their sub-features

**SYNCHRONIZATION POINT**: All tasks generated before proceeding.

---

## PHASE 3: ACCEPTANCE CRITERIA GENERATION

For each task, generate 2-5 acceptance criteria that are:

1. **Testable**: Can be verified objectively
2. **Specific**: Not vague or subjective
3. **Complete**: Cover the full scope of the task

### Example Criteria Patterns:

**For UI tasks:**
- "Component renders without errors"
- "Component handles [edge case]"
- "Component is accessible (keyboard, screen reader)"

**For API tasks:**
- "Endpoint returns correct status codes"
- "Error cases return appropriate messages"
- "Request validation rejects invalid input"

**For infrastructure tasks:**
- "Build passes without errors"
- "All existing tests continue to pass"
- "New functionality is covered by tests"

---

## PHASE 4: TASK FILE GENERATION

### 4.1 Update tasks.json

Write the complete task list to `.taskmaster/tasks.json`:

```json
{
  "version": "1.0",
  "metadata": {
    "prdPath": "PRD.md",
    "lastParsed": "ISO timestamp",
    "projectName": "terminal-app"
  },
  "tasks": [
    // All generated tasks
  ]
}
```

### 4.2 Create TodoWrite Entries

For the top 5 highest-priority tasks with no pending dependencies, create TodoWrite entries so they're visible in the current session.

### 4.3 Generate Summary Report

Output a planning summary:

```markdown
## Planning Summary

**Scope**: [What was analyzed]
**Tasks Generated**: [count]
**By Priority**: High: X, Medium: Y, Low: Z
**By Complexity**: Simple: X, Medium: Y, Complex: Z

### Ready to Start (No Dependencies)
| ID | Title | Priority | Agent |
|----|-------|----------|-------|
| TASK-001 | ... | high | nextjs-expert |

### Blocked (Waiting on Dependencies)
| ID | Title | Blocked By |
|----|-------|------------|
| TASK-005 | ... | TASK-001, TASK-002 |

### Recommended Next Action
Start with: TASK-XXX - [Title]
Run: `/do implement TASK-XXX`
```

---

## PHASE 5: PRD ENHANCEMENT (Optional)

If $ARGUMENTS includes "enhance" or "update-prd":

### 5.1 Add Task IDs to PRD

Update PRD.md to reference task IDs:
```markdown
- [ ] Auto-reconnect on network drop <!-- TASK-001 -->
```

### 5.2 Add Acceptance Criteria to PRD

For items missing acceptance criteria, add them:
```markdown
#### F4.1: Auto-reconnect on network drop
- [ ] Implementation complete
- **Acceptance Criteria:**
  - Reconnects within 5 seconds of network restoration
  - Uses exponential backoff (1s, 2s, 4s, 8s, max 30s)
  - Shows visual indicator during reconnection
  - Preserves terminal state after reconnect
```

---

## OUTPUT FORMAT

After execution, display:

```
## /plan Results

✅ PRD Analyzed: [section or "full"]
📋 Tasks Generated: [count]
📁 Written to: .taskmaster/tasks.json

### Task Breakdown

| ID | Title | Priority | Complexity | Agent | Dependencies |
|----|-------|----------|------------|-------|--------------|
| ... | ... | ... | ... | ... | ... |

### Recommended Workflow

1. Start with: TASK-XXX
2. Then: TASK-YYY (unblocked after TASK-XXX)
3. Then: TASK-ZZZ

### Next Command
`/do implement TASK-XXX` or `/next` to get the next task
```

---

## ERROR HANDLING

### If PRD.md Not Found:
- Report error: "PRD.md not found at project root"
- Suggest: "Create PRD.md or specify path with /plan path/to/prd.md"

### If No Incomplete Items Found:
- Report: "No incomplete items found in specified scope"
- Suggest: "All items may be complete, or specify a different section"

### If Circular Dependencies Detected:
- Report: "Circular dependency detected: TASK-A → TASK-B → TASK-A"
- Suggest: "Review task dependencies and break the cycle"

### If tasks.json Write Fails:
- Report: "Failed to write tasks.json"
- Output tasks to console as fallback
- Suggest: "Check .taskmaster/ directory permissions"

---

## INTEGRATION WITH OTHER COMMANDS

After `/plan`, use these commands:

| Command | Purpose |
|---------|---------|
| `/next` | Get the next actionable task |
| `/do implement TASK-XXX` | Implement a specific task |
| `/complete TASK-XXX` | Mark a task as complete |
| `/catchup` | Resume a session with task context |

---

## EXECUTION

$ARGUMENTS
