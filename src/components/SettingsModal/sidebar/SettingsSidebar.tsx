import React from "react";
import { SETTINGS_TABS } from "../constants";
import { SettingsTab } from "../types";

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
}

export function SettingsSidebar({ activeTab, setActiveTab }: SettingsSidebarProps) {
  return (
    <div className="w-[200px] md:w-[250px] lg:w-[280px] flex-shrink-0 border-r border-gray-150 dark:border-white/[0.06] p-3 md:p-4 flex flex-col gap-2 bg-gray-50/50 dark:bg-neutral-950/20 transition-all duration-300">
      {SETTINGS_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-semibold text-left transition-colors cursor-pointer ${
              isActive
                ? "bg-violet-500/[0.08] text-violet-650 dark:text-violet-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
            }`}
          >
            <Icon className="w-[15px] h-[15px] md:w-[17px] md:h-[17px] flex-shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
