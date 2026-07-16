# Focora Notes

Focora Notes is a digital ink canvas and document workspace application designed for modern note-taking. It combines rich-text document editing with freehand sketching and vector diagrams, offering a unified, high-performance canvas workspace.

## Core Features

### 1. Digital Ink & Sketching Canvas
* **Pressure-Sensitive Drawing**: High-fidelity pen and highlighter drawing using custom Catmull-Rom smoothing and device pointer pressure scaling.
* **Vector Geometries & Connectors**: Draw lines, arrows, elbow connectors, curved connectors, rectangles, circles, triangles, diamonds, and ellipses.
* **Lasso Selection & Resizing**: Select multiple strokes or shapes using a freehand lasso. Translate, duplicate, delete, recolor, and scale selected objects proportionally with corner resize handles.
* **Point & Stroke Erasers**: Intuitive erasers for targeting specific drawing paths or individual stroke nodes.

### 2. Rich Text Editing (Tiptap Integration)
* **Slash Commands Palette**: Insert blocks, headings, checklists, blockquotes, code blocks, math formulas, and tables quickly by typing `/`.
* **Dynamic Tables**: Configurable tables with custom sizing, row/column operations, and custom cell background highlights.
* **LaTeX Math Blocks**: Beautiful, centered mathematical equations rendered directly in your documents.

### 3. Paper Sheet Layouts
* **Predefined Dimensions**: Choose from **A4, Letter, A5**, or **Infinite Canvas** layouts.
* **Sheet Patterns**: Ruled (lines), graph (grid), and blank background sheets, fully responsive to light and dark theme configurations.
* **Exporting & Backups**: Export pages cleanly to PDF or import/export full notes backups via `.focora` files.

### 4. Hierarchical Document Manager
* **Navigation Tree**: Structured folders and sub-pages directory tree side panel.
* **Page Utilities**: Star favorite pages, track word and stroke counts, and restore deleted documents from the integrated Trash Bin.

---

## Tech Stack

* **Framework**: Next.js (with React, TypeScript, and Turbopack dev compiler)
* **Editor Core**: Tiptap Editor & ProseMirror Core
* **Icons**: Lucide React
* **Styling**: Tailwind CSS & CSS HSL Custom Properties

---

## Getting Started

First, install the local dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view and use the Focora Notes workspace.
