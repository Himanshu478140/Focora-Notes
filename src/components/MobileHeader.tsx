"use client";

import { useApp } from "@/context/AppContext";
import { Menu } from "lucide-react";

export default function MobileHeader() {
  const { toggleMobileDrawer } = useApp();

  return (
    <header
      id="mobile-header"
      className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-background/80 backdrop-blur-xl flex-shrink-0"
    >
      <button
        id="hamburger-menu-btn"
        onClick={toggleMobileDrawer}
        className="p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08] text-gray-600 dark:text-gray-400 transition-colors active:scale-95"
      >
        <Menu size={22} />
      </button>
      <div className="flex items-center gap-2">
        <img
          src="/focora-notes_newlogo.png"
          className="w-6 h-6 rounded-md object-contain bg-white/5 dark:bg-white/[0.02]"
          alt="Focora Notes"
        />
        <h1 className="text-sm font-semibold text-gray-800 dark:text-white">
          Focora Notes
        </h1>
      </div>
    </header>
  );
}
