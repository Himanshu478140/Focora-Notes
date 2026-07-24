import React from "react";
import { Sun, Moon } from "lucide-react";
import { FONT_OPTIONS } from "../constants";

interface PreferencesTabProps {
  theme: string;
  toggleTheme: () => void;
  editorFont: string;
  onFontChange: (font: string) => void;
}

export function PreferencesTab({
  theme,
  toggleTheme,
  editorFont,
  onFontChange,
}: PreferencesTabProps) {
  return (
    <div className="flex flex-col gap-5 md:gap-6 max-w-2xl">
      <div>
        <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Preferences</h3>
        <p className="text-[11px] md:text-xs lg:text-sm text-gray-400 dark:text-gray-500 leading-normal">
          Customize the interface theme and typography styles.
        </p>
      </div>

      {/* Theme toggle */}
      <div className="flex items-center justify-between py-2.5 md:py-3.5 border-b border-gray-150 dark:border-white/[0.06]">
        <div>
          <div className="text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-white">Dark Mode</div>
          <div className="text-[10px] md:text-[11px] lg:text-xs text-gray-400 dark:text-gray-500">Toggle dark style aesthetics.</div>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3.5 py-2 md:py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </div>

      {/* Typography choices */}
      <div className="flex flex-col gap-2.5 md:gap-3.5">
        <div>
          <div className="text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-white">Editor Font</div>
          <div className="text-[10px] md:text-[11px] lg:text-xs text-gray-400 dark:text-gray-500">Change the font family of your documents.</div>
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.id}
              onClick={() => onFontChange(font.id)}
              className={`py-3 px-2.5 md:py-4 md:px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                editorFont === font.id
                  ? "border-violet-500 bg-violet-500/[0.04] text-violet-750 dark:text-violet-300 font-semibold"
                  : "border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.02] text-gray-650 dark:text-gray-400"
              }`}
            >
              <span className={`text-xs md:text-sm lg:text-base capitalize ${font.className}`}>
                {font.label}
              </span>
              <span className="text-[10px] md:text-[11px] opacity-60">
                {font.sublabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
