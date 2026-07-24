import React from "react";
import { Printer, FileDown, FileUp } from "lucide-react";

interface ExportSectionProps {
  onExportPDF: () => void;
  onExportFocora: () => void;
  onImportFocora: () => void;
}

export function ExportSection({
  onExportPDF,
  onExportFocora,
  onImportFocora,
}: ExportSectionProps) {
  return (
    <>
      {/* Export PDF */}
      <button
        onClick={onExportPDF}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <Printer size={13.5} className="text-gray-400 dark:text-gray-500" />
        Export PDF
      </button>

      {/* Export Focora File */}
      <button
        onClick={onExportFocora}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <FileDown size={13.5} className="text-gray-400 dark:text-gray-500" />
        Export Focora File
      </button>

      {/* Import Focora File */}
      <button
        onClick={onImportFocora}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <FileUp size={13.5} className="text-gray-400 dark:text-gray-500" />
        Import Focora File
      </button>
    </>
  );
}
