# Task Completion Command

Mark a task as complete after validating that all acceptance criteria are met and quality gates pass. This command ensures tasks are properly closed with verification.

---

## CRITICAL CONSTRAINTS

**YOU MUST FOLLOW THESE RULES:**

1. **Validate Before Completing**: Run quality checks before marking complete
2. **Acceptance Criteria Required**: All criteria must be verified
3. **Update State**: Modify tasks.json to reflect completion
4. **Unblock Dependents**: Notify about newly unblocked tasks

---

## PHASE 1: PARSE INPUT

### 1.1 Extract Task ID

Parse $ARGUMENTS to find the task ID:
```
Pattern: TASK-XXX or just XXX or task number
Examples:
  /complete TASK-001
  /complete 001
  /complete "implement credential storage"  (fuzzy match by title)
```

### 1.2 Load Task

Read `.taskmaster/tasks.json` and find the specified task.

```
IF task not found
   → Report: "Task TASK-XXX not found"
   → Show similar tasks (fuzzy match)
   → Exit

IF task already completed
   → Report: "Task TASK-XXX is already marked complete"
   → Show completion date
   → Exit
```

**SYNCHRONIZATION POINT**: Task identified before validation.

---

## PHASE 2: QUALITY VALIDATION

### 2.1 Run Quality Checks

Execute these checks (unless $ARGUMENTS includes "skip-validation"):

```bash
# Lint check
pnpm lint

# Type check
pnpm tsc --noEmit

# Tests (if they exist)
pnpm test

# Build check
pnpm build
```

### 2.2 Evaluate Results

```
IF lint fails
   → Report lint errors
   → Status: BLOCKED
   → Suggest: "Fix lint errors before completing"

IF type check fails
   → Report type errors
   → Status: BLOCKED
   → Suggest: "Fix type errors before completing"

IF tests fail
   → Report failing tests
   → Status: BLOCKED
   → Suggest: "Fix failing tests before completing"

IF build fails
   → Report build errors
   → Status: BLOCKED
   → Suggest: "Fix build errors before completing"

IF all pass
   → Status: READY TO COMPLETE
```

**SYNCHRONIZATION POINT**: Quality checks must pass before proceeding.

---

## PHASE 3: ACCEPTANCE CRITERIA VERIFICATION

### 3.1 Display Criteria Checklist

Show the task's acceptance criteria and ask for verification:

```markdown
## Acceptance Criteria for TASK-XXX

Please verify each criterion:

- [ ] Criterion 1: [description]
- [ ] Criterion 2: [description]
- [ ] Criterion 3: [description]

Are all criteria met? (yes/no/partial)
```

### 3.2 Handle Responses

```
IF user confirms all criteria met (or $ARGUMENTS includes "verified")
   → Proceed to completion

IF user says partial
   → Ask which criteria are not met
   → Keep task as in-progress
   → Note partial completion in task

IF user says no
   → Keep task as in-progress
   → Ask what's blocking completion
```

---

## PHASE 4: COMPLETE TASK

### 4.1 Update Task State

Modify the task in tasks.json:

```json
{
  "id": "TASK-XXX",
  "status": "completed",
  "completedAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "completionNotes": "[Any notes from user]"
}
```

### 4.2 Write Updated tasks.json

Save the modified task list to `.taskmaster/tasks.json`.

### 4.3 Identify Unblocked Tasks

Find tasks that were blocked ONLY by this task and are now ready:

```
FOR each pending task:
  IF task.dependencies contains only TASK-XXX (now complete)
     → Task is now UNBLOCKED
```

---

## PHASE 5: REPORT COMPLETION

### 5.1 Success Output

```markdown
## Task Completed ✅

### TASK-XXX: [Title]

**Completed at**: [timestamp]
**Quality checks**: All passed

### Verification
- ✅ Lint: passed
- ✅ Types: passed
- ✅ Tests: passed
- ✅ Build: passed

### Acceptance Criteria
- ✅ Criterion 1
- ✅ Criterion 2
- ✅ Criterion 3

---

## Newly Unblocked Tasks

These tasks are now ready to work on:

| ID | Title | Priority |
|----|-------|----------|
| TASK-YYY | [Title] | high |
| TASK-ZZZ | [Title] | medium |

### Next Command
`/next` to see the next recommended task
```

### 5.2 Progress Update

```markdown
## Queue Progress

Completed: [X+1]/[Total] tasks
Progress: ████████████░░░░ XX%

### Remaining by Priority
- High: X tasks
- Medium: Y tasks
- Low: Z tasks
```

---

## QUICK COMPLETION MODE

If $ARGUMENTS includes "quick" or "auto":

Skip interactive verification and complete if:
1. All quality checks pass
2. Task is currently in-progress or pending

```
/complete TASK-001 quick
→ Runs checks, completes if passing, no prompts
```

---

## FORCE COMPLETION

If $ARGUMENTS includes "force":

Complete the task even if quality checks fail:

```
/complete TASK-001 force
→ ⚠️ Warning: Completing despite failing checks
→ Records: "Force completed - quality checks skipped"
```

Use sparingly - this is for exceptional cases only.

---

## ERROR HANDLING

### If tasks.json Write Fails:
- Report: "Failed to update tasks.json"
- Show the completion data that would have been written
- Suggest: "Manually update .taskmaster/tasks.json"

### If Task Has Unmet Dependencies:
- Report: "Task TASK-XXX has incomplete dependencies"
- List incomplete dependencies
- Suggest: "Complete dependencies first or use /complete TASK-XXX force"

### If No Acceptance Criteria Defined:
- Warn: "No acceptance criteria defined for this task"
- Proceed with quality checks only
- Suggest: "Consider adding acceptance criteria for future tasks"

---

## INTEGRATION WITH PRD

If the task has a `prdReference`:

1. Suggest updating the PRD checkbox:
   ```markdown
   Consider updating PRD.md:
   - [x] Auto-reconnect on network drop <!-- TASK-001 -->
   ```

2. If $ARGUMENTS includes "update-prd":
   - Automatically check off the item in PRD.md

---

## EXECUTION

$ARGUMENTS
