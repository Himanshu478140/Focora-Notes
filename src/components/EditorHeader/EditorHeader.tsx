"use client";

import React, { useState, useEffect, useRef } from "react";
import { type Editor } from "@tiptap/react";
import { useApp } from "@/context/AppContext";
import { type Folder } from "@/data/mock";

import { ConfirmDialog } from "../EditorCanvas/dialogs/ConfirmDialog";
import { RenameDialog } from "../EditorCanvas/dialogs/RenameDialog";
import { MoveDialog } from "../EditorCanvas/dialogs/MoveDialog";
import { DetailsDialog } from "../EditorCanvas/dialogs/DetailsDialog";

import { Breadcrumb } from "./components/Breadcrumb";
import { HeaderActions } from "./components/HeaderActions";
import { TitleSection } from "./components/TitleSection";
import { useImportExport, type ModalConfig } from "./hooks/useImportExport";

interface EditorHeaderProps {
  page: any;
  title: string;
  setTitle: (t: string) => void;
  editor: Editor | null;
  isFixedLayout: boolean;
  triggerToast: (msg: string) => void;
}

export const EditorHeader = React.memo(function EditorHeader({
  page,
  title,
  setTitle,
  editor,
  isFixedLayout,
  triggerToast,
}: EditorHeaderProps) {
  const {
    folders,
    updatePage,
    deletePage,
    setActivePage,
    addPage,
  } = useApp();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showMoreMenu]);

  const getFolderLineage = (): Folder[] => {
    if (!page || !page.parentFolderId) return [];
    const lineage: Folder[] = [];
    let currentId: string | null = page.parentFolderId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const f = folders.find((fol) => fol.id === currentId);
      if (f) {
        lineage.unshift(f);
        currentId = f.parentId;
      } else {
        break;
      }
    }
    return lineage;
  };

  const {
    handleExportPDF,
    handleExportFocoraFile,
    handleImportFocoraFile,
  } = useImportExport({
    page,
    editor,
    setTitle,
    updatePage,
    addPage,
    setActivePage,
    triggerToast,
    setModalConfig,
    setShowMoreMenu,
  });

  if (!page) return null;

  const lineage = getFolderLineage();

  return (
    <>
      <div className={`flex items-center justify-between mb-6 relative pointer-events-auto ${showMoreMenu ? "z-50" : "z-10"}`}>
        {/* Breadcrumb path */}
        <Breadcrumb lineage={lineage} />

        {/* Action icons & Dropdown Menu */}
        <HeaderActions
          page={page}
          isFixedLayout={isFixedLayout}
          updatePage={updatePage}
          deletePage={deletePage}
          addPage={addPage}
          setActivePage={setActivePage}
          triggerToast={triggerToast}
          lineage={lineage}
          menuRef={menuRef}
          showMoreMenu={showMoreMenu}
          setShowMoreMenu={setShowMoreMenu}
          setShowRenameModal={setShowRenameModal}
          setShowMoveModal={setShowMoveModal}
          setShowDetailsModal={setShowDetailsModal}
          setRenameValue={setRenameValue}
          onExportPDF={handleExportPDF}
          onExportFocora={handleExportFocoraFile}
          onImportFocora={handleImportFocoraFile}
        />
      </div>

      {/* Page title & Date/time section */}
      <TitleSection
        page={page}
        title={title}
        setTitle={setTitle}
        updatePage={updatePage}
      />

      {/* Dialogs */}
      {showRenameModal && (
        <RenameDialog
          page={page}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          updatePage={updatePage}
          setTitle={setTitle}
          onClose={() => setShowRenameModal(false)}
        />
      )}

      {showMoveModal && (
        <MoveDialog
          page={page}
          folders={folders}
          updatePage={updatePage}
          onClose={() => setShowMoveModal(false)}
        />
      )}

      {showDetailsModal && (
        <DetailsDialog
          page={page}
          onClose={() => setShowDetailsModal(false)}
        />
      )}

      {modalConfig?.show && (
        <ConfirmDialog
          title={modalConfig.title}
          message={modalConfig.message}
          isConfirm={modalConfig.isConfirm}
          onConfirm={modalConfig.onConfirm}
          onCancel={modalConfig.onCancel}
          onClose={() => setModalConfig(null)}
        />
      )}
    </>
  );
});

export default EditorHeader;
