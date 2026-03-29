'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Section from './Section';

type LayoutOption = 'blank' | 'split' | 'thirds';

type TextboxItem = {
  id: number;
  text: string;
  section: number;
};

type PanelProps = {
  panelHeight: number;
  minTextboxHeight: number;
  layout: LayoutOption;
  selectedSection: number;
  subtitle: string;
  textboxes: TextboxItem[];
  title: string;
  onLayoutChange: (layout: LayoutOption) => void;
  onSectionSelect: (section: number) => void;
  onSubtitleChange: (subtitle: string) => void;
  onTextboxChange: (id: number, text: string) => void;
  onDeleteTextbox: (id: number) => void;
  onTextboxHeightsChange: (heights: Record<number, number>) => void;
  onTitleChange: (title: string) => void;
  onAvailableHeightChange: (height: number) => void;
  onSectionUsageChange: (usage: Record<number, number>) => void;
  onMoveTextbox: (
    draggedId: number,
    targetSection: number,
    targetId: number | null,
    position: 'before' | 'after'
  ) => void;
  onOverflow: () => void;
};

const getSectionCount = (layout: LayoutOption) => {
  if (layout === 'split') {
    return 2;
  }

  if (layout === 'thirds') {
    return 3;
  }

  return 1;
};

export default function Panel({
  panelHeight,
  minTextboxHeight,
  layout,
  selectedSection,
  subtitle,
  textboxes,
  title,
  onLayoutChange,
  onSectionSelect,
  onSubtitleChange,
  onTextboxChange,
  onDeleteTextbox,
  onTextboxHeightsChange,
  onTitleChange,
  onAvailableHeightChange,
  onSectionUsageChange,
  onMoveTextbox,
  onOverflow,
}: PanelProps) {
  const textboxRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const wrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const lastValidTextboxValuesRef = useRef<Record<number, string>>({});
  const closeMenuTimeoutRef = useRef<number | null>(null);
  const [draggedTextboxId, setDraggedTextboxId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<
    | {
        type: 'section';
        section: number;
      }
    | {
        type: 'textbox';
        id: number;
        position: 'before' | 'after';
        section: number;
      }
    | null
  >(null);
  const [hoveredTextboxId, setHoveredTextboxId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(
    null
  );

  const sectionCount = useMemo(() => getSectionCount(layout), [layout]);
  const activeHoveredTextboxId = useMemo(
    () =>
      hoveredTextboxId !== null &&
      textboxes.some((textbox) => textbox.id === hoveredTextboxId)
        ? hoveredTextboxId
        : null,
    [hoveredTextboxId, textboxes]
  );

  const measureTextboxHeight = useCallback(
    (element: HTMLTextAreaElement) => {
      element.style.height = '0px';

      const computedStyles = window.getComputedStyle(element);
      const borderHeight =
        Number.parseFloat(computedStyles.borderTopWidth) +
        Number.parseFloat(computedStyles.borderBottomWidth);
      const nextHeight = Math.max(
        element.scrollHeight + borderHeight,
        minTextboxHeight
      );
      element.style.height = `${nextHeight}px`;
      element.style.overflowY = 'hidden';

      return element.offsetHeight;
    },
    [minTextboxHeight]
  );

  const measureHeights = useCallback(
    () =>
      textboxes.reduce<Record<number, number>>((accumulator, textbox) => {
        const element = textboxRefs.current[textbox.id];

        if (!element) {
          accumulator[textbox.id] = minTextboxHeight;
          return accumulator;
        }

        accumulator[textbox.id] = measureTextboxHeight(element);
        return accumulator;
      }, {}),
    [measureTextboxHeight, minTextboxHeight, textboxes]
  );

  const measureSectionUsage = useCallback(() => {
    const usageBySection = Array.from({ length: sectionCount }, (_, sectionIndex) => {
      const section = sectionRefs.current[sectionIndex];

      if (!section) {
        return 0;
      }

      const sectionRect = section.getBoundingClientRect();

      return textboxes.reduce((maxBottom, textbox) => {
        if (textbox.section !== sectionIndex) {
          return maxBottom;
        }

        const wrapper = wrapperRefs.current[textbox.id];

        if (!wrapper) {
          return maxBottom;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        return Math.max(maxBottom, wrapperRect.bottom - sectionRect.top);
      }, 0);
    });

    return usageBySection.reduce<Record<number, number>>(
      (accumulator, usage, sectionIndex) => {
        accumulator[sectionIndex] = Math.ceil(usage);
        return accumulator;
      },
      {}
    );
  }, [sectionCount, textboxes]);

  const getAvailableHeight = useCallback(
    (sectionIndex: number) =>
      sectionRefs.current[sectionIndex]?.clientHeight ??
      sectionRefs.current[0]?.clientHeight ??
      panelHeight,
    [panelHeight]
  );

  useLayoutEffect(() => {
    const nextHeights = measureHeights();

    lastValidTextboxValuesRef.current = textboxes.reduce<Record<number, string>>(
      (accumulator, textbox) => {
        accumulator[textbox.id] = textbox.text;
        return accumulator;
      },
      {}
    );
    onTextboxHeightsChange(nextHeights);
    onSectionUsageChange(measureSectionUsage());
  }, [
    layout,
    measureHeights,
    measureSectionUsage,
    onSectionUsageChange,
    onTextboxHeightsChange,
    textboxes,
  ]);

  useEffect(() => {
    const firstSection = sectionRefs.current[0];

    if (!firstSection) {
      onAvailableHeightChange(panelHeight);
      return undefined;
    }

    const reportAvailableHeight = () => {
      onAvailableHeightChange(firstSection.clientHeight);
    };

    reportAvailableHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      reportAvailableHeight();
    });

    observer.observe(firstSection);

    return () => {
      observer.disconnect();
    };
  }, [layout, onAvailableHeightChange, panelHeight]);

  useEffect(() => {
    return () => {
      if (closeMenuTimeoutRef.current !== null) {
        window.clearTimeout(closeMenuTimeoutRef.current);
      }
    };
  }, []);

  const updateMenuPosition = useCallback((id: number) => {
    const wrapper = wrapperRefs.current[id];

    if (!wrapper) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    setMenuPosition({
      top: rect.top,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (activeHoveredTextboxId === null) {
      return undefined;
    }

    updateMenuPosition(activeHoveredTextboxId);

    const handleViewportChange = () => updateMenuPosition(activeHoveredTextboxId);

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [activeHoveredTextboxId, updateMenuPosition]);

  const handleTextboxInput = (textbox: TextboxItem, nextText: string) => {
    const element = textboxRefs.current[textbox.id];

    if (!element) {
      onTextboxChange(textbox.id, nextText);
      return;
    }

    const previousHeight = element.offsetHeight || minTextboxHeight;
    const lastValidValue =
      lastValidTextboxValuesRef.current[textbox.id] ?? textbox.text;

    measureTextboxHeight(element);

    const nextSectionUsage = measureSectionUsage();

    if (
      (nextSectionUsage[textbox.section] ?? 0) >
      getAvailableHeight(textbox.section)
    ) {
      element.value = lastValidValue;
      measureTextboxHeight(element);
      element.style.height = `${previousHeight}px`;
      onOverflow();
      return;
    }

    lastValidTextboxValuesRef.current[textbox.id] = nextText;
    onTextboxChange(textbox.id, nextText);
  };

  const handleDragStart = (id: number) => {
    setDraggedTextboxId(id);
    setDropTarget(null);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetTextbox: TextboxItem
  ) => {
    if (draggedTextboxId === null || draggedTextboxId === targetTextbox.id) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const { top, height } = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < top + height / 2 ? 'before' : 'after';
    setDropTarget({
      type: 'textbox',
      id: targetTextbox.id,
      position,
      section: targetTextbox.section,
    });
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    targetTextbox: TextboxItem
  ) => {
    if (
      draggedTextboxId === null ||
      draggedTextboxId === targetTextbox.id ||
      dropTarget === null ||
      dropTarget.type !== 'textbox'
    ) {
      setDraggedTextboxId(null);
      setDropTarget(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onMoveTextbox(
      draggedTextboxId,
      dropTarget.section,
      targetTextbox.id,
      dropTarget.position
    );
    setDraggedTextboxId(null);
    setDropTarget(null);
  };

  const handleSectionDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    sectionIndex: number
  ) => {
    if (draggedTextboxId === null) {
      return;
    }

    event.preventDefault();
    setDropTarget({ type: 'section', section: sectionIndex });
  };

  const handleSectionDrop = (
    event: React.DragEvent<HTMLDivElement>,
    sectionIndex: number
  ) => {
    if (draggedTextboxId === null) {
      return;
    }

    event.preventDefault();

    if (dropTarget !== null && dropTarget.type === 'textbox') {
      return;
    }

    onMoveTextbox(draggedTextboxId, sectionIndex, null, 'after');
    setDraggedTextboxId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedTextboxId(null);
    setDropTarget(null);
  };

  const handleTextboxMouseEnter = (id: number) => {
    if (closeMenuTimeoutRef.current !== null) {
      window.clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }

    setHoveredTextboxId(id);
    updateMenuPosition(id);
  };

  const scheduleMenuClose = () => {
    if (closeMenuTimeoutRef.current !== null) {
      window.clearTimeout(closeMenuTimeoutRef.current);
    }

    closeMenuTimeoutRef.current = window.setTimeout(() => {
      setHoveredTextboxId(null);
      setMenuPosition(null);
      closeMenuTimeoutRef.current = null;
    }, 120);
  };

  const sections = Array.from({ length: sectionCount }, (_, sectionIndex) =>
    textboxes.filter((textbox) => textbox.section === sectionIndex)
  );

  return (
    <>
      <div className="animate-editor-in relative mx-auto w-[1024px]">
        <div className="absolute bottom-full left-0 mb-3">
          <Section layout={layout} onLayoutChange={onLayoutChange} />
        </div>
        <div
          className="overflow-hidden rounded-none border border-slate-200/80 bg-white shadow-[0_40px_90px_-58px_rgba(15,23,42,0.35)] transition-shadow duration-300"
          style={{ height: `${panelHeight}px` }}
        >
          <div className="flex h-full flex-col">
            <div className="h-36 shrink-0 border-b border-slate-200/80 px-8 py-6">
              <div className="flex h-full flex-col justify-between">
                <input
                  type="text"
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                  placeholder="Section title"
                  className="h-12 w-full border-none bg-transparent text-3xl font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={subtitle}
                  onChange={(event) => onSubtitleChange(event.target.value)}
                  placeholder="Section subtitle"
                  className="h-8 w-full border-none bg-transparent text-lg text-slate-500 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="relative flex flex-1 min-h-0">
              {sections.map((sectionTextboxes, sectionIndex) => (
                <div
                  key={sectionIndex}
                  ref={(element) => {
                    sectionRefs.current[sectionIndex] = element;
                  }}
                  onMouseDown={() => onSectionSelect(sectionIndex)}
                  onDragOver={(event) => handleSectionDragOver(event, sectionIndex)}
                  onDrop={(event) => handleSectionDrop(event, sectionIndex)}
                  className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-[background-color,box-shadow] duration-200 ease-out ${
                    sectionIndex > 0 ? 'border-l border-slate-200/80' : ''
                  } ${
                    selectedSection === sectionIndex
                      ? 'bg-sky-50/45 shadow-[inset_0_0_0_2px_rgba(125,211,252,0.7)]'
                      : 'bg-white'
                  }`}
                >
                  {sectionTextboxes.map((textbox, index) => (
                    <div
                      key={textbox.id}
                      ref={(element) => {
                        wrapperRefs.current[textbox.id] = element;
                      }}
                      onDragOver={(event) => handleDragOver(event, textbox)}
                      onDrop={(event) => handleDrop(event, textbox)}
                      onMouseEnter={() => handleTextboxMouseEnter(textbox.id)}
                      onMouseLeave={scheduleMenuClose}
                      className={`relative ${
                        dropTarget?.type === 'textbox' &&
                        dropTarget.id === textbox.id &&
                        dropTarget.position === 'before'
                          ? 'border-t-4 border-t-blue-500'
                          : ''
                      } ${
                        dropTarget?.type === 'textbox' &&
                        dropTarget.id === textbox.id &&
                        dropTarget.position === 'after'
                          ? 'border-b-4 border-b-blue-500'
                          : ''
                      }`}
                    >
                      <textarea
                        ref={(element) => {
                          textboxRefs.current[textbox.id] = element;
                        }}
                        value={textbox.text}
                        onChange={(event) =>
                          handleTextboxInput(textbox, event.target.value)
                        }
                        placeholder={`Textbox ${index + 1}`}
                        rows={1}
                        className="w-full resize-none overflow-hidden border border-slate-200/80 bg-white px-3 py-3 text-base leading-6 text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                      />
                    </div>
                  ))}
                  {dropTarget?.type === 'section' &&
                  dropTarget.section === sectionIndex ? (
                    <div className="mt-auto border-b-4 border-b-blue-500" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {activeHoveredTextboxId !== null && menuPosition !== null
        ? createPortal(
            <div
              className="fixed z-30 -translate-y-full pt-2"
              style={{
                top: menuPosition.top,
                right: menuPosition.right + 12,
              }}
              onMouseEnter={() => {
                if (closeMenuTimeoutRef.current !== null) {
                  window.clearTimeout(closeMenuTimeoutRef.current);
                  closeMenuTimeoutRef.current = null;
                }
              }}
              onMouseLeave={scheduleMenuClose}
            >
              <div className="animate-surface-in flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/95 px-2 py-2 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <button
                  type="button"
                  draggable
                  onDragStart={() => handleDragStart(activeHoveredTextboxId)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 active:cursor-grabbing"
                >
                  Move
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTextbox(activeHoveredTextboxId);
                    setHoveredTextboxId(null);
                    setMenuPosition(null);
                  }}
                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
                  aria-label="Delete textbox"
                >
                  Trash
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
