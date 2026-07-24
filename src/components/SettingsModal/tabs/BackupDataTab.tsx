import React from "react";
import { Download, Upload, AlertTriangle } from "lucide-react";

interface BackupDataTabProps {
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearData: () => void;
}

export function BackupDataTab({
  onExportData,
  onImportData,
  onClearData,
}: BackupDataTabProps) {
  return (
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
          onClick={onExportData}
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
            onChange={onImportData}
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
          onClick={onClearData}
          className="px-4 py-2 md:py-2.5 bg-red-600/90 hover:bg-red-700 text-white rounded-xl text-xs md:text-sm font-semibold cursor-pointer transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
