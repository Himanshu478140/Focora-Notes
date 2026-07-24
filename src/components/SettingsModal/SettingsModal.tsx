"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";

import { SettingsTab, ModalConfig } from "./types";
import { SettingsSidebar } from "./sidebar/SettingsSidebar";
import { ProfileTab } from "./tabs/ProfileTab";
import { PreferencesTab } from "./tabs/PreferencesTab";
import { BackupDataTab } from "./tabs/BackupDataTab";
import { DriveTab } from "./tabs/DriveTab";
import { TrashTab } from "./tabs/TrashTab";
import { TrashDialog } from "./dialogs/TrashDialog";
import { ModalDialog } from "./dialogs/ModalDialog";

import { useProfileSettings } from "./hooks/useProfileSettings";
import { useBackupManager } from "./hooks/useBackupManager";
import { useTrashManager } from "./hooks/useTrashManager";

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    folders,
    pages,
    setFolders,
    setPages,
    trashPages,
    trashFolders,
    restorePage,
    restoreFolder,
    deletePagePermanently,
    deleteFolderPermanently,
    clearTrash,
    flushAllPendingWrites,
  } = useApp();

  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const profile = useProfileSettings(settingsOpen);

  const backupManager = useBackupManager({
    folders,
    pages,
    setFolders,
    setPages,
    setSettingsOpen,
    setModalConfig,
    flushAllPendingWrites,
  });

  const trashManager = useTrashManager();

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setSettingsOpen(false)}
        className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
      />

      {/* Modal Card */}
      <div className="
        bg-white dark:bg-neutral-900
        border border-gray-200 dark:border-white/[0.08]
        shadow-2xl rounded-2xl
        w-full max-w-[95vw]
        sm:max-w-4xl
        md:max-w-5xl
        lg:max-w-6xl
        xl:max-w-7xl
        h-[70vh]
        sm:h-[75vh]
        md:h-[80vh]
        max-h-[900px]
        flex flex-col
        overflow-hidden
        relative z-10
        animate-scale-in
        transition-all duration-300
      ">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-150 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Settings</span>
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Active Tab Detail */}
          <div className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto scrollbar-thin min-w-0 transition-all duration-300">
            {activeTab === "profile" && (
              <ProfileTab
                username={profile.username}
                setUsername={profile.setUsername}
                email={profile.email}
                setEmail={profile.setEmail}
                avatar={profile.avatar}
                avatarError={profile.avatarError}
                onAvatarChange={profile.handleAvatarChange}
                onRemoveAvatar={profile.handleRemoveAvatar}
                onSaveProfile={profile.handleSaveProfile}
              />
            )}

            {activeTab === "preferences" && (
              <PreferencesTab
                theme={theme}
                toggleTheme={toggleTheme}
                editorFont={profile.editorFont}
                onFontChange={profile.handleFontChange}
              />
            )}

            {activeTab === "data" && (
              <BackupDataTab
                onExportData={backupManager.handleExportData}
                onImportData={backupManager.handleImportData}
                onClearData={backupManager.handleClearData}
              />
            )}

            {activeTab === "drive" && <DriveTab />}

            {activeTab === "trash" && (
              <TrashTab
                trashFolders={trashFolders}
                trashPages={trashPages}
                restoreFolder={restoreFolder}
                restorePage={restorePage}
                setShowConfirmEmpty={trashManager.setShowConfirmEmpty}
                setItemToDeletePermanently={trashManager.setItemToDeletePermanently}
                formatDeletedAt={trashManager.formatDeletedAt}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <TrashDialog
        showConfirmEmpty={trashManager.showConfirmEmpty}
        setShowConfirmEmpty={trashManager.setShowConfirmEmpty}
        itemToDeletePermanently={trashManager.itemToDeletePermanently}
        setItemToDeletePermanently={trashManager.setItemToDeletePermanently}
        totalTrashCount={trashFolders.length + trashPages.length}
        clearTrash={clearTrash}
        deleteFolderPermanently={deleteFolderPermanently}
        deletePagePermanently={deletePagePermanently}
      />

      <ModalDialog
        modalConfig={modalConfig}
        setModalConfig={setModalConfig}
      />
    </div>
  );
}

export default SettingsModal;
