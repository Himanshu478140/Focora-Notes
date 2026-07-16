export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface DrawingPoint {
  dx: number;
  dy: number;
  pressure: number;
}

export interface DrawingStroke {
  id: string;
  pageId?: string;
  type?: "stroke";
  x: number; // Start coordinate X
  y: number; // Start coordinate Y
  color: string;
  width: number;
  points: DrawingPoint[];
  createdAt: number;
  bounds?: BoundingBox;
  tool?: "pen" | "highlighter" | "eraser" | "lasso" | "line" | "arrow" | "elbowConnector" | "curvedConnector" | "rectangle" | "circle" | "triangle" | "diamond" | "ellipse" | "plain-path";
  fillColor?: string;
  rotation?: number; // Rotation angle in radians around center
  drawArrowHead?: boolean;
}

export interface CanvasTextBox {
  id: string;
  pageId?: string;
  type: "textbox";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  locked?: boolean;
  bounds?: BoundingBox;
}

export interface CanvasImageObject {
  id: string;
  pageId?: string;
  type: "image";
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  alt?: string;
  bounds?: BoundingBox;
}

export type CanvasObject = DrawingStroke | CanvasTextBox | CanvasImageObject;

export interface CanvasPageMeta {
  id: string;
  backgroundPattern?: BackgroundPattern;
  pageColor?: string;
}

export interface CanvasData {
  drawings: DrawingStroke[];
  textboxes: CanvasTextBox[];
  images: CanvasImageObject[];
  viewport?: {
    panX: number;
    panY: number;
    zoom: number;
  };
  metadata?: {
    layoutMode?: "infinite" | "paper";
    paperSize?: "A4" | "A5" | "letter";
    orientation?: "portrait" | "landscape";
    pages?: CanvasPageMeta[];
  };
  version?: number;
}

export type BackgroundPattern =
  | "blank"
  | "dot"
  | "ruled"
  | "graph"
  | "ruled-narrow"
  | "ruled-college"
  | "ruled-standard"
  | "ruled-wide"
  | "graph-narrow"
  | "graph-dense"
  | "graph-standard"
  | "graph-wide";

export interface RoughSheetMeta {
  backgroundPattern: BackgroundPattern;
  extraHeight?: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
  icon?: string;
  createdAt: number;
  deletedAt?: number;
  originalParentFolderId?: string | null;
}

export const PAGE_SIZES = {
  A4:     { width: 794, height: 1123, label: "A4" },
  letter: { width: 816, height: 1056, label: "Letter" },
  A5:     { width: 559, height: 794,  label: "A5" },
} as const;

export type PageLayout = "infinite" | keyof typeof PAGE_SIZES;

export interface Page {
  id: string;
  title: string;
  preview: string;
  content: string;
  parentFolderId: string | null;
  createdAt: number;
  updatedAt: number;
  drawings?: CanvasObject[];
  activeView?: "document" | "canvas";
  canvasData?: CanvasData;
  pageType?: "normal" | "roughSheet";
  roughSheetMeta?: RoughSheetMeta;
  canvasMeta?: { extraHeight?: number };
  starred?: boolean;
  pageColor?: string;
  backgroundPattern?: BackgroundPattern;
  pageWidth?: "compact" | "comfortable" | "full";
  pageLayout?: PageLayout;
  deletedAt?: number;
  originalParentFolderId?: string | null;
  version: number;
  pendingSync?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  folderIds: string[];
  pageIds: string[];
  createdAt: number;
}


// Legacy interfaces for migration
export interface LegacyPage {
  id: string;
  title: string;
  preview: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  drawings?: CanvasObject[];
  pageType?: "normal" | "roughSheet";
  roughSheetMeta?: RoughSheetMeta;
  starred?: boolean;
}

export interface LegacySection {
  id: string;
  name: string;
  color: string;
  pages: LegacyPage[];
}

export interface LegacyNotebook {
  id: string;
  name: string;
  icon: string;
  sections: LegacySection[];
}

export interface LegacyWorkspace {
  id: string;
  name: string;
  notebooks: LegacyNotebook[];
}

// New default folders structure
export const defaultFolders: Folder[] = [];

// New default pages structure
export const defaultPages: Page[] = [];

// Legacy workspaces array for backup migration
export const workspaces: LegacyWorkspace[] = [];

export function migrateMockDataToFoldersAndPages(oldWorkspaces: any[]): { folders: Folder[], pages: Page[] } {
  const folders: Folder[] = [];
  const pages: Page[] = [];

  if (!Array.isArray(oldWorkspaces)) return { folders, pages };

  oldWorkspaces.forEach((ws) => {
    if (!ws?.notebooks) return;
    ws.notebooks.forEach((nb: any) => {
      if (!nb) return;
      // Notebook -> Folder
      folders.push({
        id: nb.id,
        name: nb.name,
        parentId: null,
        icon: nb.icon || "📓",
        createdAt: Date.now(),
      });

      if (!nb.sections) return;
      nb.sections.forEach((sec: any) => {
        if (!sec) return;
        // Section -> Folder
        folders.push({
          id: sec.id,
          name: sec.name,
          parentId: nb.id,
          color: sec.color || "#7C5CFC",
          createdAt: Date.now(),
        });

        if (!sec.pages) return;
        sec.pages.forEach((pg: any) => {
          if (!pg) return;
          const createdAtNum = pg.createdAt ? new Date(pg.createdAt).getTime() : Date.now();
          const updatedAtNum = pg.updatedAt ? new Date(pg.updatedAt).getTime() : Date.now();
          
          pages.push({
            id: pg.id,
            title: pg.title || "Untitled Page",
            content: pg.content || "",
            preview: pg.preview || "",
            parentFolderId: sec.id,
            createdAt: createdAtNum,
            updatedAt: updatedAtNum,
            drawings: pg.drawings || [],
            pageType: pg.pageType || "normal",
            roughSheetMeta: pg.roughSheetMeta,
            canvasMeta: pg.canvasMeta,
            starred: pg.starred || false,
            version: pg.version || 1,
            pendingSync: true,
          });
        });
      });
    });
  });

  return { folders, pages };
}
