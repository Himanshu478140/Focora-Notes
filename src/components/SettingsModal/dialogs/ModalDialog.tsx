import React from "react";
import { Check, Database, AlertTriangle } from "lucide-react";
import { ModalConfig } from "../types";

interface ModalDialogProps {
  modalConfig: ModalConfig | null;
  setModalConfig: React.Dispatch<React.SetStateAction<ModalConfig | null>>;
}

export function ModalDialog({ modalConfig, setModalConfig }: ModalDialogProps) {
  if (!modalConfig?.show) return null;

  return (
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
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
            modalConfig.type === "success"
              ? "bg-green-100 dark:bg-green-950/30 text-green-650 dark:text-green-400"
              : modalConfig.type === "info"
              ? "bg-blue-100 dark:bg-blue-950/30 text-blue-650 dark:text-blue-400"
              : "bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400"
          }`}
        >
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
  );
}
