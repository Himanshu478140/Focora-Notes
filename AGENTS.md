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