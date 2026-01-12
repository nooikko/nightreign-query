# Next Task Command

Find and display the next actionable task from the task queue. This command identifies tasks that are ready to work on (all dependencies satisfied) and recommends the highest priority one.

---

## CRITICAL CONSTRAINTS

**YOU MUST FOLLOW THESE RULES:**

1. **Read-Only**: This command does not modify task state
2. **Dependency Aware**: Only surface tasks with ALL dependencies completed
3. **Priority First**: Among ready tasks, recommend highest priority first
4. **Context Rich**: Provide enough context to start working immediately

---

## PHASE 1: LOAD TASK STATE

### 1.1 Read Task File

Load `.taskmaster/tasks.json` and parse the task list.

### 1.2 Validate Task File

```
IF tasks.json not found
   → Report: "No task file found. Run /plan first to generate tasks."
   → Exit

IF tasks.json is empty or has no tasks
   → Report: "No tasks in queue. Run /plan to generate tasks from PRD."
   → Exit
```

**SYNCHRONIZATION POINT**: Task file loaded before analysis.

---

## PHASE 2: FILTER READY TASKS

### 2.1 Identify Completed Tasks

Find all tasks with `status: "completed"` and collect their IDs.

### 2.2 Filter by Dependencies

For each task with `status: "pending"`:
```
IF task.dependencies is empty OR all dependencies are in completed set
   → Task is READY
ELSE
   → Task is BLOCKED
```

### 2.3 Handle No Ready Tasks

```
IF no ready tasks found
   → List blocked tasks and their blockers
   → Suggest: "Complete these blocking tasks first: [list]"
   → Exit
```

---

## PHASE 3: PRIORITIZE AND SELECT

### 3.1 Sort Ready Tasks

Sort ready tasks by:
1. **Priority** (high → medium → low)
2. **Complexity** (simple → medium → complex) - prefer quick wins
3. **Creation date** (oldest first)

### 3.2 Select Top Task

The first task after sorting is the recommended next task.

### 3.3 Gather Related Tasks

Find 2-3 additional ready tasks that could be worked in parallel (no mutual dependencies).

---

## PHASE 4: DISPLAY RECOMMENDATION

### 4.1 Primary Output Format

```markdown
## Next Task

### TASK-XXX: [Title]

**Priority**: [high/medium/low]
**Complexity**: [simple/medium/complex]
**Agent**: [assigned agent]
**PRD Reference**: [F4.1 - description]

### Description
[Full task description]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Dependencies
✅ All dependencies satisfied
- TASK-YYY: [Title] - completed
- TASK-ZZZ: [Title] - completed

### Suggested Command
```
/do implement TASK-XXX
```

---

## Also Ready (Parallelizable)

| ID | Title | Priority | Agent |
|----|-------|----------|-------|
| TASK-AAA | ... | medium | typescript-expert |
| TASK-BBB | ... | low | unit-test-maintainer |

---

## Queue Status

- **Total tasks**: X
- **Completed**: Y
- **Ready**: Z
- **Blocked**: W

Progress: [Y/X] ████████░░░░░░░░ XX%
```

### 4.2 Quick Mode

If $ARGUMENTS includes "quick" or "brief":

```markdown
## Next: TASK-XXX - [Title]
Priority: high | Agent: nextjs-expert
→ /do implement TASK-XXX
```

---

## OPTIONAL FILTERS

Parse $ARGUMENTS for optional filters:

```
IF user specifies "high" or "priority:high"
   → Only show high-priority ready tasks

IF user specifies an agent name (e.g., "typescript-expert")
   → Only show tasks assigned to that agent

IF user specifies "simple" or "quick-wins"
   → Only show simple complexity tasks

IF user specifies a count (e.g., "3" or "show 5")
   → Show that many ready tasks instead of just 1
```

---

## ERROR HANDLING

### If tasks.json Is Corrupted:
- Report: "Task file appears corrupted. Attempting to parse..."
- If recoverable, show what was parsed
- Suggest: "Run /plan again to regenerate tasks"

### If All Tasks Complete:
- Report: "🎉 All tasks complete!"
- Suggest: "Run /plan to check for new items in PRD"

### If Only Blocked Tasks Remain:
- Report: "No ready tasks. All remaining tasks are blocked."
- Show dependency graph:
  ```
  TASK-005 blocked by:
    └── TASK-003 (pending)
        └── TASK-001 (pending) ← Start here
  ```
- Suggest: "Start with TASK-001 to unblock the chain"

---

## INTEGRATION

| After /next | Use |
|-------------|-----|
| To start the task | `/do implement TASK-XXX` |
| To mark it done | `/complete TASK-XXX` |
| To see all tasks | `/plan status` |

---

## EXECUTION

$ARGUMENTS
