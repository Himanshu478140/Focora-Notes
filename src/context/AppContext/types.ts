import type { Folder, Page, Collection } from "@/data/mock";

export type ViewMode = "document" | "all-docs" | "favorites" | "trash";

export interface AppState {
  activePageId: string | null;
  viewMode: ViewMode;
  selectedFolderId: string | null;
  expandedFolderIds: string[];
  renamingId: string | null;
  sidebarOpen: boolean;
  mobileDrawerOpen: boolean;
  recentPageIds: string[];
  editorFontScale: number;
  settingsOpen: boolean;
}

export interface AppContextType extends AppState {
  folders: Folder[];
  pages: Page[];
  trashPages: Page[];
  trashFolders: Folder[];
  collections: Collection[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  setActivePage: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedFolderId: (id: string | null) => void;
  setRenamingId: (id: string | null) => void;
  toggleFolderExpanded: (id: string) => void;
  toggleSidebar: () => void;
  toggleMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  setSettingsOpen: (open: boolean) => void;
  updatePage: (pageId: string, updates: Partial<Page>) => Promise<void>;
  addPage: (parentFolderId: string | null, importedPageData?: Partial<Page>) => string;
  addFolder: (parentId: string | null, name?: string) => string;
  renameFolder: (id: string, name: string) => Promise<void>;
  renamePage: (id: string, title: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  restoreFolder: (id: string) => Promise<void>;
  deletePagePermanently: (id: string) => Promise<void>;
  deleteFolderPermanently: (id: string) => Promise<void>;
  clearTrash: () => Promise<void>;
  addRoughSheet: () => Promise<void>;
  navigateToPage: (...args: any[]) => void;
  collapseAllFolders: () => void;
  expandAllFolders: () => void;
  changeEditorFontScale: (delta: number) => void;
  addCollection: (name: string, folderIds: string[], pageIds: string[]) => string;
  updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  hydratePage: (pageId: string) => Promise<void>;
  flushPendingPageWrite: (pageId: string) => Promise<void>;
  flushAllPendingWrites: () => Promise<void>;
}
