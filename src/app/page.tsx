"use client";

import GlobalSidebar from "@/components/GlobalSidebar";
import PageList from "@/components/PageList";
import EditorCanvas from "@/components/EditorCanvas";
import AllDocsDashboard from "@/components/AllDocsDashboard";
import MobileDrawer from "@/components/MobileDrawer";
import MobileHeader from "@/components/MobileHeader";
import SettingsModal from "@/components/SettingsModal";
import { useApp } from "@/context/AppContext";

export default function Home() {
  const { activePageId, viewMode } = useApp();

  return (
    <div id="app-shell" className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      {/* Mobile header with hamburger */}
      <MobileHeader />

      {/* Main layout */}
      <div className="flex-1 flex h-full min-h-0 overflow-hidden bg-background">
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
              <AllDocsDashboard />
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
