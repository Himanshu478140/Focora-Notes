export const PAGE_COLORS = [
  { name: "Default", value: "default", previewClass: "bg-gray-100 dark:bg-white/[0.08]" },
  { name: "Red", value: "red", previewClass: "bg-[#fdf2f2] dark:bg-[#2c1616]" },
  { name: "Orange", value: "orange", previewClass: "bg-[#fffaf0] dark:bg-[#2c1a10]" },
  { name: "Yellow", value: "yellow", previewClass: "bg-[#fefcf0] dark:bg-[#2a2410]" },
  { name: "Green", value: "green", previewClass: "bg-[#f3faf7] dark:bg-[#12281f]" },
  { name: "Blue", value: "blue", previewClass: "bg-[#f4f8fa] dark:bg-[#142129]" },
  { name: "Purple", value: "purple", previewClass: "bg-[#faf5ff] dark:bg-[#21192e]" },
  { name: "Pink", value: "pink", previewClass: "bg-[#fff5f7] dark:bg-[#2d1621]" },
];

export const RULE_LINES_OPTIONS = [
  { name: "Narrow", value: "ruled-narrow", spacing: 4 },
  { name: "College", value: "ruled-college", spacing: 6 },
  { name: "Standard", value: "ruled-standard", spacing: 8 },
  { name: "Wide", value: "ruled-wide", spacing: 12 },
];

export const GRID_LINES_OPTIONS = [
  { name: "Narrow", value: "graph-narrow", size: 4 },
  { name: "Dense", value: "graph-dense", size: 6 },
  { name: "Standard", value: "graph-standard", size: 8 },
  { name: "Wide", value: "graph-wide", size: 12 },
];

export const LAYOUT_SIZE_OPTIONS = [
  { label: "Infinite Canvas", value: "infinite" },
  { label: "A4", value: "A4" },
  { label: "Letter", value: "letter" },
  { label: "A5", value: "A5" },
];

export const LAYOUT_WIDTH_OPTIONS = [
  { label: "Compact", value: "compact" },
  { label: "Comfortable", value: "comfortable" },
  { label: "Full Width", value: "full" },
];

export function formatFullDate(dateVal: string | number): string {
  const date = new Date(dateVal);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(dateVal: string | number): string {
  const date = new Date(dateVal);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
