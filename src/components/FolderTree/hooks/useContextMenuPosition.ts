import React, { useState } from "react";
import { ContextMenuState } from "../types";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function useContextMenuPosition(
  menu: ContextMenuState | null,
  menuRef: React.RefObject<HTMLDivElement | null>
) {
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!menu || !menuRef.current) {
      setMenuCoords(null);
      return;
    }

    const menuEl = menuRef.current;
    const menuWidth = menuEl.offsetWidth;
    const menuHeight = menuEl.offsetHeight;

    let x = 0;
    let y = 0;

    if (menu.isRightClick) {
      x = menu.clickX;
      y = menu.clickY;

      // Safety clamping for right click
      if (x + menuWidth > window.innerWidth - 8) {
        x = window.innerWidth - menuWidth - 8;
      }
      if (x < 8) x = 8;

      if (y + menuHeight > window.innerHeight - 8) {
        y = window.innerHeight - menuHeight - 8;
      }
      if (y < 8) y = 8;
    } else if (menu.triggerRect) {
      const rect = menu.triggerRect;
      x = rect.left;

      // Horizontal safety clamping
      if (x < 8) x = 8;
      if (x + menuWidth > window.innerWidth - 8) {
        x = window.innerWidth - menuWidth - 8;
      }

      // Vertical placement
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const spaceAbove = rect.top - 4;

      if (spaceBelow >= menuHeight) {
        y = rect.bottom + 4;
      } else if (spaceAbove >= menuHeight) {
        y = rect.top - menuHeight - 4;
      } else {
        // Not enough space above or below, place where there is more space
        if (spaceBelow > spaceAbove) {
          y = rect.bottom + 4;
          y = Math.min(y, window.innerHeight - menuHeight - 8);
        } else {
          y = rect.top - menuHeight - 4;
          y = Math.max(8, y);
        }
      }
    }

    setMenuCoords({ x, y });
  }, [menu]);

  return menuCoords;
}
