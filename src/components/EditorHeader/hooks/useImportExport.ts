import { type Editor } from "@tiptap/react";

export interface ModalConfig {
  show: boolean;
  title: string;
  message: string;
  isConfirm?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface UseImportExportOptions {
  page: any;
  editor: Editor | null;
  setTitle: (t: string) => void;
  updatePage: (id: string, updates: any) => void;
  addPage: (folderId: string | null, data?: any) => string;
  setActivePage: (id: string) => void;
  triggerToast: (msg: string) => void;
  setModalConfig: (config: ModalConfig | null) => void;
  setShowMoreMenu: (show: boolean) => void;
}

export function useImportExport({
  page,
  editor,
  setTitle,
  updatePage,
  addPage,
  setActivePage,
  triggerToast,
  setModalConfig,
  setShowMoreMenu,
}: UseImportExportOptions) {
  const handleExportPDF = () => {
    setShowMoreMenu(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleExportFocoraFile = () => {
    if (!page) return;
    const payload = {
      version: 1,
      app: "focora-notes",
      exportedAt: Date.now(),
      data: {
        title: page.title || "",
        content: page.content || "",
        drawings: page.drawings || [],
        pageType: page.pageType || "normal",
        roughSheetMeta: page.roughSheetMeta || null,
        canvasMeta: page.canvasMeta || null,
        pageColor: page.pageColor || "default",
        backgroundPattern: page.backgroundPattern || "blank",
      },
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${(page.title || "untitled").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.focora`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowMoreMenu(false);
  };

  const handleImportFocoraFile = () => {
    if (!page) return;
    setShowMoreMenu(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".focora";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          try {
            const importedData = JSON.parse(readerEvent.target?.result as string);

            if (importedData && typeof importedData === "object" && importedData.version === 1 && importedData.app === "focora-notes") {
              const pageData = importedData.data;
              if (!pageData) throw new Error("No data block");

              setModalConfig({
                show: true,
                title: "Import Focora Note",
                message: `Backup note loaded: "${pageData.title || "Untitled Page"}"\n\nChoose "Confirm" to import this note as a NEW page in the current folder.\n\nChoose "Cancel" to OVERWRITE the current active page instead.`,
                isConfirm: true,
                onConfirm: () => {
                  const newPageId = addPage(page.parentFolderId, {
                    title: pageData.title || "Imported Page",
                    content: pageData.content || "",
                    drawings: pageData.drawings || [],
                    pageType: pageData.pageType || "normal",
                    roughSheetMeta: pageData.roughSheetMeta || undefined,
                    canvasMeta: pageData.canvasMeta || undefined,
                    pageColor: pageData.pageColor || "default",
                    backgroundPattern: pageData.backgroundPattern || "blank",
                  });
                  setActivePage(newPageId);
                  triggerToast("Note imported as a new page!");
                },
                onCancel: () => {
                  setModalConfig({
                    show: true,
                    title: "Confirm Note Overwrite",
                    message: `⚠️ WARNING: Overwriting will permanently replace all text and drawings on the current page "${page.title || "Untitled Page"}".\n\nThis cannot be undone. Do you want to proceed?`,
                    isConfirm: true,
                    onConfirm: () => {
                      const updates = {
                        title: pageData.title || page.title,
                        content: pageData.content || "",
                        drawings: pageData.drawings || [],
                        pageType: pageData.pageType || "normal",
                        roughSheetMeta: pageData.roughSheetMeta || undefined,
                        canvasMeta: pageData.canvasMeta || undefined,
                        pageColor: pageData.pageColor || "default",
                        backgroundPattern: pageData.backgroundPattern || "blank",
                      };
                      updatePage(page.id, updates);
                      if (editor) {
                        editor.commands.setContent(updates.content || "");
                      }
                      setTitle(updates.title || page.title);
                      triggerToast("Active note overwritten successfully!");
                    },
                    onCancel: () => {
                      triggerToast("Import aborted. No changes made.");
                    },
                  });
                },
              });
            } else {
              setModalConfig({
                show: true,
                title: "Import Error",
                message: "⚠️ Error: Invalid or unsupported Focora file. (Must be a valid Focora v1 backup file)",
                onConfirm: () => {},
              });
            }
          } catch (err) {
            setModalConfig({
              show: true,
              title: "Import Error",
              message: "⚠️ Error: Failed to parse Focora file. Please check file integrity.",
              onConfirm: () => {},
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return {
    handleExportPDF,
    handleExportFocoraFile,
    handleImportFocoraFile,
  };
}
