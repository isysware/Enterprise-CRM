import React, { useRef, useEffect, useState, useCallback, useId } from 'react';

export interface DataTableScrollFrameProps {
  children: React.ReactNode;
  className?: string;
  tableContainerClassName?: string;
  enableDockedScrollbar?: boolean;
}

/**
 * Registry & Arbitration for Multi-Table Viewports:
 * Guarantees that even if multiple DataTableScrollFrame components are rendered on the
 * same page, EXACTLY ONE docked horizontal scrollbar rail is active and visible at any time.
 */
interface TableEntry {
  id: string;
  getMetrics: () => {
    hasOverflow: boolean;
    inView: boolean;
    intersectionRatio: number;
    distToCenter: number;
    coords: { left: number; width: number };
  };
  setActive: (active: boolean) => void;
}

const tableRegistry = new Map<string, TableEntry>();
let currentActiveId: string | null = null;

const reevaluateActiveTable = () => {
  let bestId: string | null = null;
  let maxIntersection = -1;
  let minCenterDist = Infinity;

  tableRegistry.forEach((entry, id) => {
    const metrics = entry.getMetrics();
    if (metrics.hasOverflow && metrics.inView) {
      // Prioritize table with highest intersection ratio; tie-break with nearest distance to center
      if (
        metrics.intersectionRatio > maxIntersection + 0.05 ||
        (Math.abs(metrics.intersectionRatio - maxIntersection) <= 0.05 && metrics.distToCenter < minCenterDist)
      ) {
        maxIntersection = metrics.intersectionRatio;
        minCenterDist = metrics.distToCenter;
        bestId = id;
      }
    }
  });

  if (bestId !== currentActiveId) {
    if (currentActiveId && tableRegistry.has(currentActiveId)) {
      tableRegistry.get(currentActiveId)!.setActive(false);
    }
    currentActiveId = bestId;
    if (bestId && tableRegistry.has(bestId)) {
      tableRegistry.get(bestId)!.setActive(true);
    }
  } else if (bestId && tableRegistry.has(bestId)) {
    tableRegistry.get(bestId)!.setActive(true);
  } else if (!bestId && currentActiveId) {
    if (tableRegistry.has(currentActiveId)) {
      tableRegistry.get(currentActiveId)!.setActive(false);
    }
    currentActiveId = null;
  }
};

/**
 * DataTableScrollFrame (Phase UI-R2.4A Final Implementation)
 *
 * Rules:
 * 1. Exactly ONE visible horizontal scrollbar on desktop: the Viewport-Docked Horizontal Rail.
 * 2. Top scrollbar is completely REMOVED.
 * 3. Natural physical bottom scrollbar is visually HIDDEN (cross-browser scrollbar-width: none & ::-webkit-scrollbar).
 * 4. Docked bar is ALWAYS accessible while ANY part of the table is in view (top rows, middle rows, bottom rows).
 * 5. Attached strictly to the main content pane: aligns with table's rect.left & rect.width, never overlaps sidebar or navbar.
 * 6. Compact height: 32px maximum.
 * 7. Mobile preserves natural horizontal swipe without docked rail.
 * 8. Multi-table pages switch cleanly with zero stacking.
 */
export const DataTableScrollFrame: React.FC<DataTableScrollFrameProps> = ({
  children,
  className = '',
  tableContainerClassName = '',
  enableDockedScrollbar = true
}) => {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const dockedScrollRef = useRef<HTMLDivElement>(null);

  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [isActiveTable, setIsActiveTable] = useState(false);
  const [dockedCoords, setDockedCoords] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  // Anti-loop recursion locks
  const isSyncingFromDocked = useRef(false);
  const isSyncingFromTable = useRef(false);

  // Compute metrics for active table arbitration
  const getMetrics = useCallback(() => {
    const tableEl = bottomScrollRef.current;
    if (!tableEl) {
      return {
        hasOverflow: false,
        inView: false,
        intersectionRatio: 0,
        distToCenter: Infinity,
        coords: { left: 0, width: 0 }
      };
    }

    const hasOverflow = tableEl.scrollWidth > tableEl.clientWidth + 2;
    const rect = tableEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Top navbar boundary (56px) and bottom viewport
    const topThreshold = 56;
    const bottomThreshold = viewportHeight;

    const visibleTop = Math.max(topThreshold, rect.top);
    const visibleBottom = Math.min(bottomThreshold, rect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

    // In view if at least 24px of the table is visible inside the main viewport
    const inView = hasOverflow && visibleHeight > 24 && rect.bottom > topThreshold && rect.top < bottomThreshold;
    const intersectionRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
    const rectCenter = (rect.top + rect.bottom) / 2;
    const distToCenter = Math.abs(rectCenter - (viewportHeight / 2));

    return {
      hasOverflow,
      inView,
      intersectionRatio,
      distToCenter,
      coords: {
        left: Math.max(0, rect.left),
        width: Math.max(0, rect.width)
      }
    };
  }, []);

  // Update table dimensions & notify arbiter
  const updateMetricsAndArbiter = useCallback(() => {
    const tableEl = bottomScrollRef.current;
    if (!tableEl) return;

    const hasOverflow = tableEl.scrollWidth > tableEl.clientWidth + 2;
    setHasHorizontalOverflow(hasOverflow);
    setScrollWidth(tableEl.scrollWidth);

    if (hasOverflow) {
      const rect = tableEl.getBoundingClientRect();
      setDockedCoords({
        left: Math.max(0, rect.left),
        width: Math.max(0, rect.width)
      });
    }

    reevaluateActiveTable();
  }, []);

  // Sync scrollLeft between docked rail and table
  const handleDockedScroll = () => {
    if (isSyncingFromTable.current) return;
    if (dockedScrollRef.current && bottomScrollRef.current) {
      isSyncingFromDocked.current = true;
      bottomScrollRef.current.scrollLeft = dockedScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingFromDocked.current = false;
      });
    }
  };

  const handleTableScroll = () => {
    if (isSyncingFromDocked.current) return;
    if (dockedScrollRef.current && bottomScrollRef.current) {
      isSyncingFromTable.current = true;
      dockedScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingFromTable.current = false;
      });
    }
  };

  // Step scroll buttons on docked bar
  const handleStepScroll = (delta: number) => {
    if (!bottomScrollRef.current) return;
    const newScroll = Math.max(0, bottomScrollRef.current.scrollLeft + delta);
    if (dockedScrollRef.current) {
      dockedScrollRef.current.scrollLeft = newScroll;
    }
    bottomScrollRef.current.scrollLeft = newScroll;
  };

  // Register in arbiter
  useEffect(() => {
    tableRegistry.set(instanceId, {
      id: instanceId,
      getMetrics,
      setActive: (active: boolean) => {
        setIsActiveTable(active);
        if (active && bottomScrollRef.current && dockedScrollRef.current) {
          dockedScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
        }
      }
    });

    return () => {
      tableRegistry.delete(instanceId);
      if (currentActiveId === instanceId) {
        currentActiveId = null;
        reevaluateActiveTable();
      }
    };
  }, [instanceId, getMetrics]);

  // Set up observers and scroll listeners
  useEffect(() => {
    const tableEl = bottomScrollRef.current;
    if (!tableEl) return;

    updateMetricsAndArbiter();

    const resizeObserver = new ResizeObserver(() => {
      updateMetricsAndArbiter();
    });

    resizeObserver.observe(tableEl);
    if (tableEl.firstElementChild) {
      resizeObserver.observe(tableEl.firstElementChild);
    }

    // Nearest scroll container (<main> in App.tsx)
    const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      if (!node) return window;
      let parent = node.parentElement;
      while (parent) {
        const { overflowY } = window.getComputedStyle(parent);
        if (overflowY === 'auto' || overflowY === 'scroll') {
          return parent;
        }
        parent = parent.parentElement;
      }
      return window;
    };

    const scrollParent = getScrollParent(tableEl);

    const onScrollOrResize = () => {
      updateMetricsAndArbiter();
    };

    window.addEventListener('resize', onScrollOrResize, { passive: true });
    window.addEventListener('scroll', onScrollOrResize, { passive: true });

    if (scrollParent !== window) {
      scrollParent.addEventListener('scroll', onScrollOrResize, { passive: true });
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize);
      if (scrollParent !== window) {
        scrollParent.removeEventListener('scroll', onScrollOrResize);
      }
    };
  }, [updateMetricsAndArbiter]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* 
        1. MAIN TABLE CONTAINER
        Native horizontal scrollbar is VISUALLY HIDDEN cross-browser:
        - Firefox: scrollbar-width: none
        - IE/Edge: -ms-overflow-style: none
        - WebKit/Chrome/Safari: ::-webkit-scrollbar { display: none }
        Touch swipe and programmatic horizontal scrolling remain fully operational.
      */}
      <div
        ref={bottomScrollRef}
        onScroll={handleTableScroll}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        className={`w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${tableContainerClassName}`}
      >
        {children}
      </div>

      {/* 
        2. SINGLE VIEWPORT-DOCKED HORIZONTAL SCROLLBAR
        - Rendered only on desktop (hidden md:flex)
        - Rendered only when horizontal overflow exists AND this table is the active intersecting table
        - Positioned strictly within the table's visible bounding rect (left, width)
        - Height strictly 32px maximum
        - Single bar on the screen (no top bar, no bottom native bar)
      */}
      {hasHorizontalOverflow && enableDockedScrollbar && isActiveTable && dockedCoords.width > 0 && (
        <div
          className="hidden md:flex fixed bottom-0 z-30 h-[32px] items-center gap-1.5 px-2 bg-white dark:bg-slate-900 border-t border-[#E5EAF1] dark:border-slate-800 shadow-xs select-none transition-all duration-150"
          style={{
            left: `${dockedCoords.left}px`,
            width: `${dockedCoords.width}px`
          }}
          title="Horizontal data-grid scrollbar"
          aria-label="Horizontal scroll controls"
        >
          {/* Subtle left step button */}
          <button
            type="button"
            onClick={() => handleStepScroll(-240)}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 text-xs font-bold shrink-0 transition-colors cursor-pointer"
            title="Scroll left"
            aria-label="Scroll left"
          >
            ‹
          </button>

          {/* Synchronized horizontal scroll track */}
          <div
            ref={dockedScrollRef}
            onScroll={handleDockedScroll}
            className="flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]"
            style={{ height: '14px' }}
          >
            <div
              style={{
                width: `${scrollWidth}px`,
                height: '1px',
                minWidth: '100%'
              }}
            />
          </div>

          {/* Subtle right step button */}
          <button
            type="button"
            onClick={() => handleStepScroll(240)}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 text-xs font-bold shrink-0 transition-colors cursor-pointer"
            title="Scroll right"
            aria-label="Scroll right"
          >
            ›
          </button>

          {/* Subtle label indicator */}
          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1 hidden lg:inline">
            Scroll ⟷
          </span>
        </div>
      )}
    </div>
  );
};
