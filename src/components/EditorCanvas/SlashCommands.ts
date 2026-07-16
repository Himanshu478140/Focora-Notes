export const SLASH_COMMANDS = [
  {
    title: "Heading 1",
    subtitle: "Big section heading",
    icon: "H1",
    action: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    subtitle: "Medium section heading",
    icon: "H2",
    action: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Bullet List",
    subtitle: "Simple bulleted list",
    icon: "•",
    action: (editor: any) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    subtitle: "Sequential list",
    icon: "1.",
    action: (editor: any) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "To-do List",
    subtitle: "Checklist with checkboxes",
    icon: "☑",
    action: (editor: any) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    subtitle: "Styled quote block",
    icon: "“",
    action: (editor: any) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    subtitle: "Monospace code syntax block",
    icon: "</>",
    action: (editor: any) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Math Formula",
    subtitle: "Centered LaTeX equation block",
    icon: "f(x)",
    action: (editor: any) => {
      editor.chain().focus().insertContent({ type: "mathBlock", attrs: { latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" } }).run();
    },
  },
  {
    title: "Table",
    subtitle: "Insert a resizable 4x4 table",
    icon: "田",
    action: (editor: any) => {
      editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run();
    },
  },
];
