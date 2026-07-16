"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";

interface UseScrollSyncProps {
  editor: Editor | null;
  activePageId: string | null | undefined;
  activeView: string;
  layoutMode: string;
  worldHeight: number;
  pageGap: number;
  zoom: number;
  isFixedLayout: boolean;
  editorScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setActivePageIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function useScrollSync({
  editor,
  activePageId,
  activeView,
  layoutMode,
  worldHeight,
  pageGap,
  zoom,
  isFixedLayout,
  editorScrollContainerRef,
  setActivePageIndex,
}: UseScrollSyncProps) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number | null>(null);

  const scrollingToRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<any>(null);

  // Active page index scroll listener
  useEffect(() => {
    const container = editorScrollContainerRef.current;
    if (!container || activeView !== "canvas" || layoutMode !== "paper") return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / (worldHeight + pageGap));
      setActivePageIndex(index);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeView, layoutMode, worldHeight, pageGap, editorScrollContainerRef, setActivePageIndex]);

  // Scroll to heading function
  const scrollToHeading = useCallback((index: number) => {
    const container = document.getElementById("editor-scroll-container");
    if (!container) return;

    const headingElements = container.querySelectorAll(
      ".ProseMirror h1, .ProseMirror h2, .ProseMirror h3"
    );
    const element = headingElements[index];
    if (element) {
      scrollingToRef.current = true;
      setActiveHeadingIndex(index);

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const toolbarOffset = 90; // Clear top floating toolbar
      const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - toolbarOffset;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollingToRef.current = false;
      }, 1000);
    }
  }, []);

  // Programmatic scroll lock release
  useEffect(() => {
    const container = document.getElementById("editor-scroll-container");
    if (!container) return;

    const handleScroll = () => {
      if (scrollingToRef.current) {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          scrollingToRef.current = false;
        }, 150);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Extraction of headings (H1 to H3 only)
  useEffect(() => {
    if (!editor) {
      setHeadings([]);
      return;
    }

    const updateHeadings = () => {
      const list: { id: string; text: string; level: number }[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const level = node.attrs.level;
          if (level <= 3) {
            list.push({
              id: `heading-${pos}`,
              text: node.textContent,
              level: level,
            });
          }
        }
      });
      setHeadings(list);
    };

    updateHeadings();
    editor.on("update", updateHeadings);

    return () => {
      editor.off("update", updateHeadings);
    };
  }, [editor, activePageId]);

  // Scroll-spy IntersectionObserver logic
  useEffect(() => {
    if (!editor || headings.length === 0) {
      setActiveHeadingIndex(null);
      return;
    }

    const container = document.getElementById("editor-scroll-container");
    if (!container) return;

    const observerOptions = {
      root: container,
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    };

    const visibleHeadings = new Map<number, boolean>();

    const observer = new IntersectionObserver((entries) => {
      if (scrollingToRef.current) return;
      entries.forEach((entry) => {
        const targetEl = entry.target;
        const headingElements = Array.from(
          container.querySelectorAll(".ProseMirror h1, .ProseMirror h2, .ProseMirror h3")
        );
        const index = headingElements.indexOf(targetEl);
        if (index !== -1) {
          visibleHeadings.set(index, entry.isIntersecting);
        }
      });

      const intersectingIndices = Array.from(visibleHeadings.entries())
        .filter(([_, isVisible]) => isVisible)
        .map(([idx]) => idx)
        .sort((a, b) => a - b);

      if (intersectingIndices.length > 0) {
        setActiveHeadingIndex(intersectingIndices[0]);
      } else {
        const headingElements = Array.from(
          container.querySelectorAll(".ProseMirror h1, .ProseMirror h2, .ProseMirror h3")
        );
        let lastPassedIndex = null;
        for (let i = 0; i < headingElements.length; i++) {
          const rect = headingElements[i].getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect.top < containerRect.top + 100) {
            lastPassedIndex = i;
          } else {
            break;
          }
        }

        if (lastPassedIndex !== null) {
          setActiveHeadingIndex(lastPassedIndex);
        } else if (headingElements.length > 0) {
          setActiveHeadingIndex(0);
        }
      }
    }, observerOptions);

    const headingElements = container.querySelectorAll(
      ".ProseMirror h1, .ProseMirror h2, .ProseMirror h3"
    );
    headingElements.forEach((el) => observer.observe(el));

    return () => {
      headingElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [editor, headings]);

  return {
    headings,
    activeHeadingIndex,
    scrollToHeading,
  };
}
