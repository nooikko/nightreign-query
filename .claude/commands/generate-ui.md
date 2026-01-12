# UI Component Generation Command

Generate ShadCN-based UI components following the project's existing patterns in @repo/ui. This command analyzes existing components and creates new ones that match the established conventions.

---

## CRITICAL CONSTRAINTS

**YOU MUST FOLLOW THESE RULES:**

1. **Pattern Matching**: New components MUST follow existing @repo/ui patterns
2. **TypeScript Strict**: No `any` or `unknown` types - full type safety required
3. **Accessibility First**: All components must be keyboard accessible and screen-reader friendly
4. **Test Generation**: Every component gets a corresponding test file
5. **ShadCN Conventions**: Use Radix primitives and ShadCN patterns

---

## PHASE 1: ANALYZE REQUEST

### 1.1 Parse Component Request

Extract from $ARGUMENTS:
- Component name (required)
- Component type (dialog, button, card, form, etc.)
- Specific requirements or features
- Location (defaults to @repo/ui or app-specific)

```
Examples:
  /generate-ui ConfirmDialog - A confirmation dialog with yes/no actions
  /generate-ui ConnectionCard - Card displaying SSH connection details
  /generate-ui SettingsForm - Form for app settings with validation
```

### 1.2 Identify Component Category

```
IF component is a primitive (button, input, checkbox)
   → Place in packages/ui/src/components/
   → Export from packages/ui/src/index.ts

ELSE IF component is app-specific (ConnectionCard, SessionTab)
   → Place in apps/web/src/components/
   → May compose primitives from @repo/ui

ELSE IF component is a layout (Sidebar, AppShell)
   → Place in apps/web/src/components/layout/
```

**SYNCHRONIZATION POINT**: Component scope defined before exploration.

---

## PHASE 2: PATTERN EXPLORATION

### 2.1 Analyze Existing Components

Read these files to understand patterns:
1. `packages/ui/src/components/` - All existing primitives
2. Similar components to the one being created
3. `packages/ui/package.json` - Available dependencies

### 2.2 Identify Conventions

Look for these patterns:
- How props are typed (interface vs type)
- How variants are handled (cva, cn utility)
- How Radix primitives are wrapped
- How forwardRef is used
- Export patterns (named exports, barrel files)

### 2.3 Check for ShadCN Base

```
IF a ShadCN component exists that can be used as base
   → Note it for composition
   → Don't recreate what ShadCN provides

IF no ShadCN base exists
   → Plan to build from Radix primitives or scratch
```

---

## PHASE 3: COMPONENT DESIGN

### 3.1 Props Interface Design

Create a typed props interface:

```typescript
interface [ComponentName]Props {
  // Required props
  title: string;

  // Optional props with defaults
  variant?: "default" | "destructive";
  size?: "sm" | "md" | "lg";

  // Event handlers
  onConfirm?: () => void;
  onCancel?: () => void;

  // Composition
  children?: React.ReactNode;
  className?: string;
}
```

### 3.2 Variant System (if applicable)

Use `cva` for variants:

```typescript
const componentVariants = cva(
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "variant-classes",
        destructive: "destructive-classes",
      },
      size: {
        sm: "size-sm-classes",
        md: "size-md-classes",
        lg: "size-lg-classes",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);
```

### 3.3 Accessibility Checklist

Ensure the design includes:
- [ ] Proper ARIA attributes
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus management
- [ ] Screen reader announcements
- [ ] Color contrast compliance

---

## PHASE 4: COMPONENT GENERATION

### 4.1 Component File

Create the component following this template:

```typescript
"use client"; // if client component

import * as React from "react";
import { cn } from "@repo/ui/lib/utils";
// Import Radix/ShadCN primitives as needed

interface [ComponentName]Props {
  // Props definition
}

const [ComponentName] = React.forwardRef<
  HTMLDivElement, // or appropriate element
  [ComponentName]Props
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("base-classes", className)}
      {...props}
    />
  );
});

[ComponentName].displayName = "[ComponentName]";

export { [ComponentName] };
export type { [ComponentName]Props };
```

### 4.2 Test File

Create a corresponding test:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { [ComponentName] } from "./[component-name]";

describe("[ComponentName]", () => {
  it("renders without crashing", () => {
    render(<[ComponentName] />);
    // Basic render assertion
  });

  it("handles user interaction", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(<[ComponentName] onAction={onAction} />);

    await user.click(screen.getByRole("button"));
    expect(onAction).toHaveBeenCalled();
  });

  it("is accessible", () => {
    render(<[ComponentName] />);
    // Accessibility assertions
  });
});
```

### 4.3 Export Update

Update the appropriate index file:

```typescript
// packages/ui/src/index.ts or components/index.ts
export { [ComponentName] } from "./components/[component-name]";
export type { [ComponentName]Props } from "./components/[component-name]";
```

---

## PHASE 5: VALIDATION

### 5.1 Quality Checks

Run these validations:

```bash
# Type check
pnpm tsc --noEmit

# Lint
pnpm lint

# Tests (if test infrastructure exists)
pnpm test
```

### 5.2 Visual Verification Prompt

Ask user to verify:
```
Component generated. Please verify:
1. Does the component render correctly?
2. Does it match the visual design?
3. Is keyboard navigation working?
4. Does it integrate with existing components?
```

---

## OUTPUT FORMAT

After generation:

```markdown
## Component Generated ✅

### [ComponentName]

**Location**: packages/ui/src/components/[component-name].tsx
**Test**: packages/ui/src/components/[component-name].test.tsx

### Files Created/Modified

| File | Action |
|------|--------|
| packages/ui/src/components/[name].tsx | Created |
| packages/ui/src/components/[name].test.tsx | Created |
| packages/ui/src/index.ts | Modified (export added) |

### Props Interface

```typescript
interface [ComponentName]Props {
  // Generated interface
}
```

### Usage Example

```tsx
import { [ComponentName] } from "@repo/ui";

function Example() {
  return (
    <[ComponentName]
      prop="value"
      onAction={() => console.log("action")}
    />
  );
}
```

### Quality Checks
- ✅ TypeScript: No errors
- ✅ Lint: Passed
- ⚠️ Tests: Pending (run `pnpm test` to verify)

### Next Steps
1. Import and use in your application
2. Customize styles as needed
3. Add to Storybook if available
```

---

## COMPONENT TEMPLATES

### Dialog Template

```
/generate-ui [Name]Dialog
→ Uses: @repo/ui Dialog, DialogContent, DialogHeader
→ Includes: Title, description, action buttons
→ Features: Controlled/uncontrolled, keyboard close
```

### Form Template

```
/generate-ui [Name]Form
→ Uses: @repo/ui Form components, react-hook-form
→ Includes: Validation, error states, submit handling
→ Features: Field composition, async submission
```

### Card Template

```
/generate-ui [Name]Card
→ Uses: @repo/ui Card, CardHeader, CardContent
→ Includes: Title, description, actions
→ Features: Hover states, click handling
```

### List Template

```
/generate-ui [Name]List
→ Uses: Virtualization if large, @repo/ui styling
→ Includes: Items, selection, filtering
→ Features: Keyboard navigation, multi-select
```

---

## ERROR HANDLING

### If @repo/ui Not Found:
- Report: "Could not find @repo/ui package"
- Suggest: "Ensure packages/ui exists and has components"

### If Similar Component Exists:
- Report: "Similar component [Name] already exists"
- Ask: "Extend existing component or create new?"

### If Dependencies Missing:
- Report: "Required dependency not found: [dep]"
- Suggest: "Install with: pnpm add [dep]"

---

## EXECUTION

$ARGUMENTS
