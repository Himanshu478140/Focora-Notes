<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# General Agent Guidelines & Rules

## 1. Never Use Browser Default Popups/Dialogs
- **DO NOT** use native browser dialogs like `confirm()`, `alert()`, or `prompt()`.
- Instead, always implement custom React modal overlays or inline warning banners using Tailwind CSS for all confirmations, warnings, and prompts. This ensures the app maintains a highly polished, custom, and premium UX.

## 2. Never Use Browser Default Scrollbars
- **DO NOT** leave default scrollbars on scrollable panels, sidebars, list blocks, or modals.
- Always apply theme-integrated, custom scrollbars (e.g., using custom utility styling like `.scrollbar-thin` or custom CSS scrollbar styles) to all container elements that support scroll overflows to maintain design consistency.

## 3. Prefer Feature-Based Modular Architecture (Single Responsibility)

As the codebase grows, prioritize long-term maintainability over keeping code in a single file.

### General Principles

- DO NOT continue appending unrelated logic into an existing large file simply because it works.
- Organize code by **feature** and **responsibility**, not just by file type.
- Every file should have one clear purpose (Single Responsibility Principle).
- When a component begins handling multiple independent responsibilities, extract them into dedicated components, hooks, utilities, or feature folders.

### Folder Organization

Prefer feature folders over flat structures.

Good:

```
EditorCanvas/
├── EditorCanvas.tsx
├── components/
├── hooks/
├── dialogs/
├── overlays/
├── utils/
├── constants.ts
├── types.ts
└── index.ts
```

Avoid:

```
components/
    EditorCanvas.tsx
    EditorCanvas2.tsx
    EditorCanvasHelper.tsx
    EditorCanvasUtils.tsx
```

### Components

Components should represent meaningful UI domains.

Good:

- Workspace
- PageNavigator
- SelectionToolbar
- CanvasOverlays
- MoreMenu
- BackgroundSection

Avoid:

- ComponentPart1
- ComponentSectionA
- ComponentHelper

### Hooks

Hooks should encapsulate one logical behavior.

Good:

- useWorkspaceLayout()
- useScrollSync()
- useFloatingImages()
- useImportExport()

Avoid:

- useEverything()
- useEditorLogic()

### Utilities

Utility functions should live outside React components whenever possible.

Examples:

- geometry calculations
- formatting
- parsing
- DOM helpers
- coordinate transforms

### Constants

Move configuration data out of components.

Examples:

- color palettes
- layout options
- menu definitions
- keyboard shortcuts
- default values

Store them in dedicated `constants.ts` files.

### Types

Feature-specific interfaces and types should be colocated with the feature in `types.ts` rather than scattered throughout components.

### Business Logic

Business logic should not live inside presentation components.

Examples include:

- import/export logic
- file parsing
- validation
- layout calculations
- transaction processing

Move these into dedicated hooks or utility modules.

### Refactoring Guidelines

When modifying an existing file:

- If the file grows beyond roughly **500–700 LOC**, evaluate whether it now contains multiple independent responsibilities.
- Refactor based on **responsibility**, not just line count.
- Do NOT split files into arbitrary "Part1", "Part2", etc.
- Prefer extracting cohesive UI domains or logical subsystems.
- A larger orchestrator component is acceptable if it primarily composes child components and delegates logic to hooks.

### Goal

The main component of a feature should read like a high-level blueprint of the feature rather than containing every implementation detail.

A developer should be able to understand the overall architecture within a few minutes by reading the main component.