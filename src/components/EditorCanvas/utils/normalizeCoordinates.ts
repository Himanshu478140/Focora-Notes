"use client";

import { Page } from "@/data/mock";

interface NormalizeCanvasObjectsProps {
  objects: any[];
  activeView: string;
  layoutMode: string;
  canvasPages: any[];
  pageOffsets: Map<string, number>;
  worldHeight: number;
  pageGap: number;
  page: Page | undefined;
  updatePage: (id: string, updates: Partial<Page>) => void;
}

export function normalizeCanvasObjects({
  objects,
  activeView,
  layoutMode,
  canvasPages,
  pageOffsets,
  worldHeight,
  pageGap,
  page,
  updatePage,
}: NormalizeCanvasObjectsProps) {
  if (activeView !== "canvas" || layoutMode !== "paper") return objects;

  let pagesUpdated = false;
  const pagesList = [...canvasPages];

  const result = objects.map((obj) => {
    const currentPageId = obj.pageId || canvasPages[0]?.id || "page-1";
    const currentOffsetY = pageOffsets.get(currentPageId) ?? 0;
    const worldY = obj.y + currentOffsetY;

    const totalPageHeight = worldHeight + pageGap;
    let pageIndex = Math.floor(worldY / totalPageHeight);
    if (pageIndex < 0) pageIndex = 0;

    while (pageIndex >= pagesList.length) {
      const newPageId = "page-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      pagesList.push({ id: newPageId });
      pagesUpdated = true;
    }

    const destPage = pagesList[pageIndex];
    const destPageId = destPage?.id || "page-1";
    const destOffsetY = pageIndex * totalPageHeight;
    const localY = worldY - destOffsetY;

    return {
      ...obj,
      pageId: destPageId,
      y: localY,
    };
  });

  if (pagesUpdated && page) {
    updatePage(page.id, {
      canvasData: {
        drawings: page.canvasData?.drawings ?? [],
        textboxes: page.canvasData?.textboxes ?? [],
        images: page.canvasData?.images ?? [],
        viewport: page.canvasData?.viewport,
        metadata: {
          ...page.canvasData?.metadata,
          pages: pagesList,
        },
      },
    });
  }

  return result;
}
