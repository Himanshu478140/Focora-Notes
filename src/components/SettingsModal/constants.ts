import { User, Sliders, Database, Cloud, Trash2 } from "lucide-react";
import { SettingsTab } from "./types";

export const SETTINGS_TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: Sliders },
  { id: "data", label: "Backup & Data", icon: Database },
  { id: "drive", label: "Google Drive", icon: Cloud },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export const FONT_OPTIONS = [
  { id: "sans", label: "Sans-Serif", sublabel: "Inter", className: "font-sans" },
  { id: "serif", label: "Serif", sublabel: "Merriweather", className: "font-serif" },
  { id: "mono", label: "Monospace", sublabel: "Fira Code", className: "font-mono" },
];
