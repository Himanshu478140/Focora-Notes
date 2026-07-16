import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import { DrawingBlock } from "@/components/DrawingBlock";
import { MathBlock } from "@/components/MathBlock";

// Local extensions
import { CustomImage } from "./Image/CustomImage";
import { CustomTableCell } from "./CustomTableCell";
import { BlockBackground } from "./BlockBackground";
import { UniqueId } from "./UniqueId";
import { FloatingText } from "./FloatingText/FloatingText";
import { ColumnLayout } from "./ColumnLayout/ColumnLayout";
import { ColumnRow } from "./ColumnLayout/ColumnRow";
import { Column } from "./ColumnLayout/Column";

export const getExtensions = () => [
  ColumnLayout,
  StarterKit.configure({
    link: false,
    underline: false,
  }),
  TextStyle,
  Color,
  Underline.configure(),
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Link.configure({
    openOnClick: false,
  }),
  BlockBackground.configure(),
  CustomImage.configure(),
  DrawingBlock.configure(),
  MathBlock.configure(),
  TaskList.configure(),
  TaskItem.configure({
    nested: true,
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  CustomTableCell,
  Placeholder.configure({
    placeholder: "",
  }),
  FloatingText,
  UniqueId.configure(),
  ColumnRow,
  Column,
];

// Re-export individual extensions for direct access
export { CustomImage } from "./Image/CustomImage";
export { CustomTableCell } from "./CustomTableCell";
export { BlockBackground } from "./BlockBackground";
export { UniqueId } from "./UniqueId";
export { FloatingText } from "./FloatingText/FloatingText";
export { ColumnLayout } from "./ColumnLayout/ColumnLayout";
export { ColumnRow } from "./ColumnLayout/ColumnRow";
export { Column } from "./ColumnLayout/Column";
