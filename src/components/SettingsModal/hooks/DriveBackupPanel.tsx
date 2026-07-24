import React, { useState } from "react";
import { useDriveBackup } from "./useDriveBackup";
import { Cloud, CheckCircle2, AlertTriangle, RefreshCw, LogOut, UploadCloud, DownloadCloud } from "lucide-react";

export default function DriveBackupPanel() {
  const {
    connected,
    email,
    syncing,
    progress,
    error,
    connect,
    disconnect,
    backup,
    restore
  } = useDriveBackup();

  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleRestoreClick = () => {
    setShowRestoreConfirm(true);
  };

  const handleConfirmRestore = async () => {
    setShowRestoreConfirm(false);
    await restore();
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-xl">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
          <Cloud size={24} />
        </div>
        <div className="flex flex-col">
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Google Drive Backup</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Securely sync and restore your notebooks directly to your personal Google Drive storage.
          </p>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-white/[0.08] rounded-2xl p-5 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col gap-4">
        {/* Status Indicator */}
        <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-white/[0.06] pb-4">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-450">Connection Status</span>
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-semibold">
                <CheckCircle2 size={14} />
                Connected
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                Disconnected
              </span>
            )}
          </div>
        </div>

        {/* User Account / Connection Action */}
        {!connected ? (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-xs text-gray-450 dark:text-gray-500 leading-normal">
              Click connect to link your Google account. Focora Notes only requests permissions to create and manage its own files (`drive.file` scope) and will never read or modify your other personal files.
            </p>
            <button
              onClick={connect}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 dark:bg-violet-500 hover:bg-violet-700 dark:hover:bg-violet-600 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              Connect Google Drive
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 py-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Account</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium mt-0.5">{email}</span>
              </div>
              <button
                onClick={disconnect}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500/80 hover:bg-red-500/5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut size={12} />
                Disconnect
              </button>
            </div>

            {/* Sync Controls */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={backup}
                disabled={syncing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-220 dark:border-white/[0.12] hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-800 dark:text-gray-200 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <UploadCloud size={16} />
                Backup Now
              </button>
              <button
                onClick={handleRestoreClick}
                disabled={syncing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-220 dark:border-white/[0.12] hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-800 dark:text-gray-200 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                <DownloadCloud size={16} />
                Restore
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sync Status / Progress Indicator */}
      {(syncing || progress || error) && (
        <div className="flex flex-col gap-3 border border-gray-200/80 dark:border-white/[0.06] rounded-2xl p-4 bg-gray-50/20 dark:bg-white/[0.01]">
          {syncing && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {progress || "Syncing..."}
              </span>
            </div>
          )}

          {!syncing && progress && (
            <div className="flex items-center gap-2.5 text-green-700 dark:text-green-400">
              <CheckCircle2 size={18} />
              <span className="text-sm font-semibold">{progress}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 text-red-500 dark:text-red-400">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Sync Error</span>
                <span className="text-xs mt-0.5 leading-normal opacity-90">{error}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Confirmation Dialog for Restore (Rule 1 compliant - no browser popups) */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            onClick={() => setShowRestoreConfirm(false)}
            className="absolute inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-[1px] transition-opacity"
          />
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">Confirm Database Restore</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal mb-5">
              Restoring from Google Drive will **completely overwrite** all your current local notes, folders, and drawings. This action cannot be undone. Are you sure you want to proceed?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="flex-1 px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-red-500/15 cursor-pointer"
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
