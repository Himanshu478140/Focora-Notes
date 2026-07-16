"use client";

import { useCallback } from "react";
import { Page } from "@/data/mock";

interface UsePageOperationsProps {
  page: Page | undefined;
  updatePage: (id: string, updates: Partial<Page>) => void;
}

export function usePageOperations({ page, updatePage }: UsePageOperationsProps) {
  const handleInsertPage = useCallback((index: number, direction: "above" | "below") => {
    if (!page) return;
    const canvasData = page.canvasData || { drawings: [], textboxes: [], images: [] };
    const meta = canvasData.metadata || {};
    const pagesList = [...(meta.pages ?? [{ id: "page-1" }])];
    const newPageId = "page-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    const newPage = { id: newPageId };
    
    const insertIndex = direction === "above" ? index : index + 1;
    pagesList.splice(insertIndex, 0, newPage);

    updatePage(page.id, {
      canvasData: {
        ...canvasData,
        metadata: {
          ...meta,
          pages: pagesList,
        },
      },
    });
  }, [page, updatePage]);

  const handleDuplicatePage = useCallback((index: number) => {
    if (!page) return;
    const canvasData = page.canvasData || { drawings: [], textboxes: [], images: [] };
    const meta = canvasData.metadata || {};
    const pagesList = [...(meta.pages ?? [{ id: "page-1" }])];
    const pageToDuplicate = pagesList[index];
    if (!pageToDuplicate) return;

    const newPageId = "page-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    const newPage = {
      id: newPageId,
      backgroundPattern: pageToDuplicate.backgroundPattern,
      pageColor: pageToDuplicate.pageColor,
    };

    pagesList.splice(index + 1, 0, newPage);

    const oldPageId = pageToDuplicate.id;
    const drawingsList = canvasData.drawings || [];
    const textboxesList = canvasData.textboxes || [];
    const imagesList = canvasData.images || [];

    const clonedDrawings = drawingsList
      .filter((d) => (d.pageId || pageToDuplicate.id) === oldPageId)
      .map((d) => ({
        ...d,
        id: "stroke-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        pageId: newPageId,
      }));

    const clonedTextboxes = textboxesList
      .filter((tb) => (tb.pageId || pageToDuplicate.id) === oldPageId)
      .map((tb) => ({
        ...tb,
        id: "tb-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        pageId: newPageId,
      }));

    const clonedImages = imagesList
      .filter((img) => (img.pageId || pageToDuplicate.id) === oldPageId)
      .map((img) => ({
        ...img,
        id: "img-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        pageId: newPageId,
      }));

    updatePage(page.id, {
      canvasData: {
        ...canvasData,
        drawings: [...drawingsList, ...clonedDrawings],
        textboxes: [...textboxesList, ...clonedTextboxes],
        images: [...imagesList, ...clonedImages],
        metadata: {
          ...meta,
          pages: pagesList,
        },
      },
    });
  }, [page, updatePage]);

  const handleDeletePage = useCallback((index: number) => {
    if (!page) return;
    const canvasData = page.canvasData || { drawings: [], textboxes: [], images: [] };
    const meta = canvasData.metadata || {};
    const pagesList = [...(meta.pages ?? [{ id: "page-1" }])];
    const pageToDelete = pagesList[index];
    if (!pageToDelete) return;

    pagesList.splice(index, 1);

    const oldPageId = pageToDelete.id;
    const drawingsList = (canvasData.drawings || []).filter(
      (d) => (d.pageId || pageToDelete.id) !== oldPageId
    );
    const textboxesList = (canvasData.textboxes || []).filter(
      (tb) => (tb.pageId || pageToDelete.id) !== oldPageId
    );
    const imagesList = (canvasData.images || []).filter(
      (img) => (img.pageId || pageToDelete.id) !== oldPageId
    );

    updatePage(page.id, {
      canvasData: {
        ...canvasData,
        drawings: drawingsList,
        textboxes: textboxesList,
        images: imagesList,
        metadata: {
          ...meta,
          pages: pagesList,
        },
      },
    });
  }, [page, updatePage]);

  const handleMovePage = useCallback((fromIndex: number, toIndex: number) => {
    if (!page) return;
    const canvasData = page.canvasData || { drawings: [], textboxes: [], images: [] };
    const meta = canvasData.metadata || {};
    const pagesList = [...(meta.pages ?? [{ id: "page-1" }])];
    if (fromIndex < 0 || fromIndex >= pagesList.length || toIndex < 0 || toIndex >= pagesList.length) return;

    const [movedPage] = pagesList.splice(fromIndex, 1);
    pagesList.splice(toIndex, 0, movedPage);

    updatePage(page.id, {
      canvasData: {
        ...canvasData,
        metadata: {
          ...meta,
          pages: pagesList,
        },
      },
    });
  }, [page, updatePage]);

  return {
    handleInsertPage,
    handleDuplicatePage,
    handleDeletePage,
    handleMovePage,
  };
}
