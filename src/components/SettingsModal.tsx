"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { X, User, Sliders, Database, Moon, Sun, Check, ArrowRight, Download, Upload, AlertTriangle, Trash2, Folder, FileText } from "lucide-react";

export default function SettingsModal() {
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
    clearTrash
  } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "data" | "trash">("profile");
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const [itemToDeletePermanently, setItemToDeletePermanently] = useState<{ id: string; type: "folder" | "page"; name: string } | null>(null);

  // Custom modal/alert dialog to replace confirm() and alert() (Rule 1 compliance)
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "info" | "warning" | "error" | "success";
    isConfirm?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Local state for settings inputs
  const [username, setUsername] = useState("Himanshu");
  const [email, setEmail] = useState("Personal Account");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [editorFont, setEditorFont] = useState("sans");

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("focora-username");
      if (savedName) setUsername(savedName);
      const savedEmail = localStorage.getItem("focora-email");
      if (savedEmail) setEmail(savedEmail);
      const savedAvatar = localStorage.getItem("focora-profile-avatar");
      setAvatar(savedAvatar);
      setAvatarError(null);

      const savedFont = localStorage.getItem("focora-editor-font");
      if (savedFont) setEditorFont(savedFont);
    }
  }, [settingsOpen]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 2MB.");
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarError(null);
  };

  const formatDeletedAt = (deletedAt?: number) => {
    if (!deletedAt) return "Deleted some time ago";
    const diff = Date.now() - deletedAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Deleted just now";
    if (mins < 60) return `Deleted ${mins} minute${mins > 1 ? "s" : ""} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Deleted ${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `Deleted ${days} day${days > 1 ? "s" : ""} ago`;
  };

  if (!settingsOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("focora-username", username);
    localStorage.setItem("focora-email", email);
    if (avatar) {
      localStorage.setItem("focora-profile-avatar", avatar);
    } else {
      localStorage.removeItem("focora-profile-avatar");
    }
    window.dispatchEvent(new Event("focora-profile-updated"));
  };

  const handleFontChange = (font: string) => {
    setEditorFont(font);
    localStorage.setItem("focora-editor-font", font);
    window.dispatchEvent(new Event("focora-font-updated"));
  };

  // Export data as JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify({ folders, pages }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `focora-notes-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import data from JSON file
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.folders && data.pages && Array.isArray(data.folders) && Array.isArray(data.pages)) {
          setModalConfig({
            show: true,
            title: "Import Backup",
            message: "Importing data will overwrite your current notes. Do you want to continue?",
            type: "warning",
            isConfirm: true,
            onConfirm: () => {
              setFolders(data.folders);
              setPages(data.pages);
              localStorage.setItem("focora-folders", JSON.stringify(data.folders));
              localStorage.setItem("focora-pages", JSON.stringify(data.pages));
              
              setModalConfig({
                show: true,
                title: "Import Success",
                message: "Backup imported successfully!",
                type: "success",
                onConfirm: () => {
                  setSettingsOpen(false);
                }
              });
            }
          });
        } else {
          setModalConfig({
            show: true,
            title: "Import Failed",
            message: "Invalid backup file format. Must contain folders and pages.",
            type: "error"
          });
        }
      } catch (err) {
        setModalConfig({
          show: true,
          title: "Import Error",
          message: "Failed to parse JSON file.",
          type: "error"
        });
      }
    };
    reader.readAsText(file);
    // Clear input value so same file can be imported again
    e.target.value = "";
  };

  // Reset all data
  const handleClearData = () => {
    setModalConfig({
      show: true,
      title: "Clear All Data",
      message: "Are you absolutely sure you want to clear all notes and folders? This cannot be undone.",
      type: "warning",
      isConfirm: true,
      onConfirm: () => {
        if (typeof window !== "undefined") {
          // Delete IndexedDB
          const req = window.indexedDB.deleteDatabase("focora-db");
          
          const finalizeReset = () => {
            localStorage.removeItem("focora-folders");
            localStorage.removeItem("focora-pages");
            localStorage.removeItem("focora-expanded-folders");
            localStorage.removeItem("focora-recent-pages");
            localStorage.removeItem("focora-active-page-id");
            
            setModalConfig({
              show: true,
              title: "Data Cleared",
              message: "All data cleared. Reloading page...",
              type: "info",
              onConfirm: () => {
                window.location.reload();
              }
            });
          };

          req.onsuccess = finalizeReset;
          req.onblocked = finalizeReset; // Proceed even if blocked to ensure user doesn't get stuck
          req.onerror = () => {
            setModalConfig({
              show: true,
              title: "Reset Failed",
              message: "Failed to reset database. Please clear browser storage manually.",
              type: "error"
            });
          };
        }
      }
    });
  };

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

          {/* Settings Sidebar */}
          <div className="w-[200px] md:w-[250px] lg:w-[280px] flex-shrink-0 border-r border-gray-150 dark:border-white/[0.06] p-3 md:p-4 flex flex-col gap-2 bg-gray-50/50 dark:bg-neutral-950/20 transition-all duration-300">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-semibold text-left transition-colors cursor-pointer ${activeTab === "profile"
                ? "bg-violet-500/[0.08] text-violet-650 dark:text-violet-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                }`}
            >
              <User className="w-[15px] h-[15px] md:w-[17px] md:h-[17px] flex-shrink-0" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-semibold text-left transition-colors cursor-pointer ${activeTab === "preferences"
                  ? "bg-violet-500/[0.08] text-violet-650 dark:text-violet-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                }`}
            >
              <Sliders className="w-[15px] h-[15px] md:w-[17px] md:h-[17px] flex-shrink-0" />
              <span>Preferences</span>
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-semibold text-left transition-colors cursor-pointer ${activeTab === "data"
                  ? "bg-violet-500/[0.08] text-violet-650 dark:text-violet-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                }`}
            >
              <Database className="w-[15px] h-[15px] md:w-[17px] md:h-[17px] flex-shrink-0" />
              <span>Backup & Data</span>
            </button>
            <button
              onClick={() => setActiveTab("trash")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-semibold text-left transition-colors cursor-pointer ${activeTab === "trash"
                  ? "bg-violet-500/[0.08] text-violet-650 dark:text-violet-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.04]"
                }`}
            >
              <Trash2 className="w-[15px] h-[15px] md:w-[17px] md:h-[17px] flex-shrink-0" />
              <span>Trash</span>
            </button>
          </div>

          {/* Settings Tab Detail */}
          <div className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto scrollbar-thin min-w-0 transition-all duration-300">
            {activeTab === "profile" && (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 md:gap-5 max-w-2xl">
                <div>
                  <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">User Profile</h3>
                  <p className="text-[11px] md:text-xs lg:text-sm text-gray-400 dark:text-gray-500 leading-normal">
                    Update your account details displayed in the sidebar.
                  </p>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="relative group w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden shadow-md shadow-violet-500/10 flex-shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-sm md:text-base lg:text-lg font-bold select-none">
                        {username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-semibold cursor-pointer transition-opacity">
                      <span>Change</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3.5 py-2 bg-violet-600 hover:bg-violet-750 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-md shadow-violet-500/10 transition-colors">
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                      {avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="px-3.5 py-2 border border-red-200 dark:border-red-950/20 hover:bg-red-500/[0.04] text-red-650 dark:text-red-400 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {avatarError ? (
                      <p className="text-[10px] md:text-xs text-red-650 dark:text-red-400 font-medium leading-none">
                        {avatarError}
                      </p>
                    ) : (
                      <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 leading-none">
                        Supports JPG, PNG or WebP (max 2MB).
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] md:text-[11px] lg:text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="px-3.5 py-2 md:py-2.5 text-xs md:text-sm lg:text-base rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-gray-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    placeholder="Username"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] md:text-[11px] lg:text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Subtext / Account</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-3.5 py-2 md:py-2.5 text-xs md:text-sm lg:text-base rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-gray-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    placeholder="Personal Account or email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-fit px-5 py-2 md:py-2.5 bg-violet-600 hover:bg-violet-750 text-white font-semibold rounded-xl text-xs md:text-sm cursor-pointer shadow-md shadow-violet-500/10 transition-colors"
                >
                  Save Profile
                </button>
              </form>
            )}

            {activeTab === "preferences" && (
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
                    {["sans", "serif", "mono"].map((font) => (
                      <button
                        key={font}
                        onClick={() => handleFontChange(font)}
                        className={`py-3 px-2.5 md:py-4 md:px-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${editorFont === font
                            ? "border-violet-500 bg-violet-500/[0.04] text-violet-750 dark:text-violet-300 font-semibold"
                            : "border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.02] text-gray-650 dark:text-gray-400"
                          }`}
                      >
                        <span className={`text-xs md:text-sm lg:text-base capitalize ${font === "serif" ? "font-serif" : font === "mono" ? "font-mono" : "font-sans"}`}>
                          {font === "sans" ? "Sans-Serif" : font === "serif" ? "Serif" : "Monospace"}
                        </span>
                        <span className="text-[10px] md:text-[11px] opacity-60">
                          {font === "sans" ? "Inter" : font === "serif" ? "Merriweather" : "Fira Code"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="flex flex-col gap-5 md:gap-6 max-w-2xl">
                <div>
                  <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Backup & Data</h3>
                  <p className="text-[11px] md:text-xs lg:text-sm text-gray-400 dark:text-gray-500 leading-normal">
                    Export your notebooks or import back from JSON backups.
                  </p>
                </div>

                {/* Export data */}
                <div className="flex items-center justify-between py-2 md:py-3 border-b border-gray-150 dark:border-white/[0.06]">
                  <div>
                    <div className="text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-white">Export Notebook</div>
                    <div className="text-[10px] md:text-[11px] lg:text-xs text-gray-400 dark:text-gray-500">Download all your documents and folders as JSON.</div>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-1.5 px-4 py-2 md:py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold cursor-pointer shadow-md shadow-violet-500/10 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Export
                  </button>
                </div>

                {/* Import data */}
                <div className="flex items-center justify-between py-2 md:py-3 border-b border-gray-150 dark:border-white/[0.06]">
                  <div>
                    <div className="text-xs md:text-sm lg:text-base font-semibold text-gray-900 dark:text-white">Import Backup</div>
                    <div className="text-[10px] md:text-[11px] lg:text-xs text-gray-400 dark:text-gray-500">Upload a previously exported notebook JSON file.</div>
                  </div>
                  <label className="flex items-center gap-1.5 px-4 py-2 md:py-2.5 border border-violet-500/30 dark:border-violet-500/20 hover:bg-violet-500/[0.04] text-violet-650 dark:text-violet-300 rounded-xl text-xs md:text-sm font-semibold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Delete all data */}
                <div className="flex items-center justify-between py-2 md:py-3">
                  <div>
                    <div className="text-xs md:text-sm lg:text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      Reset Application
                    </div>
                    <div className="text-[10px] md:text-[11px] lg:text-xs text-gray-400 dark:text-gray-500">Delete all your stored data permanently.</div>
                  </div>
                  <button
                    onClick={handleClearData}
                    className="px-4 py-2 md:py-2.5 bg-red-600/90 hover:bg-red-700 text-white rounded-xl text-xs md:text-sm font-semibold cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {activeTab === "trash" && (
              <div className="flex flex-col max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 mb-4 border-b border-gray-150 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm md:text-base lg:text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Trash Bin</h3>
                    <p className="text-[11px] md:text-xs lg:text-sm text-gray-400 dark:text-gray-500 leading-normal">
                      Restore deleted folders and pages to active notebook, or delete them permanently. Items in trash are automatically purged after 30 days.
                    </p>
                  </div>
                  {trashFolders.length + trashPages.length > 0 && (
                    <button
                      onClick={() => setShowConfirmEmpty(true)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 border border-red-500/30 dark:border-red-500/20 hover:bg-red-500/[0.04] text-red-650 dark:text-red-400 rounded-xl text-xs md:text-sm font-semibold cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Empty Trash</span>
                    </button>
                  )}
                </div>

                {trashFolders.length === 0 && trashPages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-4xl mb-4 select-none">🗑️</span>
                    <h4 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 mb-1">Trash is empty</h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[280px]">
                      Deleted pages and folders will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[
                      ...trashFolders.map((f) => ({ ...f, type: "folder" as const })),
                      ...trashPages.map((p) => ({ ...p, type: "page" as const })),
                    ]
                      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3.5 border border-gray-150 dark:border-white/[0.04] bg-white dark:bg-neutral-900 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              item.type === "folder"
                                ? "bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                                : "bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                            }`}>
                              {item.type === "folder" ? (
                                <Folder className="w-4 h-4" />
                              ) : (
                                <FileText className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs md:text-sm font-semibold text-gray-855 dark:text-gray-200 truncate max-w-[180px] sm:max-w-md">
                                {item.type === "folder" ? item.name : (item as any).title}
                              </h4>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                {formatDeletedAt(item.deletedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (item.type === "folder") {
                                  restoreFolder(item.id);
                                } else {
                                  restorePage(item.id);
                                }
                              }}
                              className="px-3 py-1.5 border border-gray-250 dark:border-white/[0.08] text-violet-650 dark:text-violet-300 hover:bg-violet-500/[0.04] rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => {
                                setItemToDeletePermanently({
                                  id: item.id,
                                  type: item.type,
                                  name: item.type === "folder" ? item.name : (item as any).title
                                });
                              }}
                              className="px-3 py-1.5 border border-red-200 dark:border-red-950/20 hover:bg-red-500/[0.04] text-red-650 dark:text-red-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Delete Forever
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {showConfirmEmpty && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => setShowConfirmEmpty(false)}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
          />
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Empty Trash</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
              Delete {trashFolders.length + trashPages.length} items permanently? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => setShowConfirmEmpty(false)}
                className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearTrash();
                  setShowConfirmEmpty(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {itemToDeletePermanently && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => setItemToDeletePermanently(null)}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
          />
          <div className="bg-white dark:bg-neutral-900 border border-gray-250 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Delete Permanently</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
              Permanently delete {itemToDeletePermanently.type} "{itemToDeletePermanently.name}"? This action is irreversible.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => setItemToDeletePermanently(null)}
                className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (itemToDeletePermanently.type === "folder") {
                    deleteFolderPermanently(itemToDeletePermanently.id);
                  } else {
                    deletePagePermanently(itemToDeletePermanently.id);
                  }
                  setItemToDeletePermanently(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConfig?.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => {
              if (!modalConfig.isConfirm) {
                modalConfig.onConfirm?.();
                setModalConfig(null);
              } else {
                modalConfig.onCancel?.();
                setModalConfig(null);
              }
            }}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 transition-opacity"
          />
          <div className="bg-white dark:bg-neutral-900 border border-gray-250 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in text-center animate-fade-in">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              modalConfig.type === "success"
                ? "bg-green-100 dark:bg-green-950/30 text-green-650 dark:text-green-400"
                : modalConfig.type === "info"
                ? "bg-blue-100 dark:bg-blue-950/30 text-blue-650 dark:text-blue-400"
                : "bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400"
            }`}>
              {modalConfig.type === "success" ? (
                <Check className="w-6 h-6" />
              ) : modalConfig.type === "info" ? (
                <Database className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{modalConfig.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium text-center leading-relaxed">
              {modalConfig.message}
            </p>
            <div className="flex items-center gap-3 justify-center">
              {modalConfig.isConfirm ? (
                <>
                  <button
                    onClick={() => {
                      modalConfig.onCancel?.();
                      setModalConfig(null);
                    }}
                    className="px-4 py-2 border border-gray-200 dark:border-white/[0.08] text-gray-750 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const oldConfig = modalConfig;
                      modalConfig.onConfirm?.();
                      setModalConfig((prev) => (prev === oldConfig ? null : prev));
                    }}
                    className="px-4 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    modalConfig.onConfirm?.();
                    setModalConfig(null);
                  }}
                  className="px-6 py-2 bg-violet-650 hover:bg-violet-750 text-white rounded-xl text-xs md:text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
