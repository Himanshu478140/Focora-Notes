"use client";

import { useState, useEffect } from "react";
import GlobalSidebar from "@/components/GlobalSidebar";
import PageList from "@/components/FolderTree/PageList";
import EditorCanvas from "@/components/EditorCanvas";
import Dashboard from "@/components/Dashboard";
import MobileDrawer from "@/components/Mobile/MobileDrawer";
import MobileHeader from "@/components/Mobile/MobileHeader";
import SettingsModal from "@/components/SettingsModal";
import { useApp } from "@/context/AppContext";

export default function Home() {
  const { activePageId, viewMode } = useApp();
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsElectron(
        !!(window as any).electronAPI ||
        navigator.userAgent.toLowerCase().includes("electron")
      );
    }
  }, []);

  return (
    <div id="app-shell" className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* Custom Draggable Titlebar for Electron frameless window */}
      {isElectron && (
        <div
          className="hidden md:block h-8 w-full flex-shrink-0 select-none bg-gray-50/50 dark:bg-[#121212] border-b border-gray-200/60 dark:border-white/[0.06]"
          style={{ WebkitAppRegion: 'drag' } as any}
        />
      )}

      {/* Mobile header with hamburger */}
      <MobileHeader />

      {/* Main layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden bg-background">
        {/* Global sidebar — hidden on mobile, visible on md+ */}
        <GlobalSidebar />

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
          {/* Page list + Editor */}
          <div className="flex-1 flex overflow-hidden bg-background">
            {/* Page list — commented out to enable Sidebar + Editor by default. Can be uncommented to restore 3-column layout */}
            {/* <PageList /> */}

            {/* Dashboard or Editor canvas */}
            {viewMode === "all-docs" ? (
              <Dashboard />
            ) : (
              <EditorCanvas key={activePageId || "empty"} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      <MobileDrawer />

      {/* Settings Modal */}
      <SettingsModal />
    </div>
  );
}
