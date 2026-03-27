'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  textboxes: TextboxItem[];
  onLayoutChange: (layout: LayoutOption) => void;
  onSectionSelect: (section: number) => void;
  onTextboxChange: (id: number, text: string) => void;
  onDeleteTextbox: (id: number) => void;
  onTextboxHeightsChange: (heights: Record<number, number>) => void;
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
  textboxes,
  onLayoutChange,
  onSectionSelect,
  onTextboxChange,
  onDeleteTextbox,
  onTextboxHeightsChange,
  onMoveTextbox,
  onOverflow,
}: PanelProps) {
  const textboxRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const wrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
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

  const measureHeights = useCallback(
    () =>
      textboxes.reduce<Record<number, number>>((accumulator, textbox) => {
        const element = textboxRefs.current[textbox.id];

        if (!element) {
          accumulator[textbox.id] = minTextboxHeight;
          return accumulator;
        }

        element.style.height = '0px';
        const nextHeight = Math.max(element.scrollHeight, minTextboxHeight);
        element.style.height = `${nextHeight}px`;
        element.style.overflowY = 'hidden';
        accumulator[textbox.id] = nextHeight;
        return accumulator;
      }, {}),
    [minTextboxHeight, textboxes]
  );

  useEffect(() => {
    onTextboxHeightsChange(measureHeights());
  }, [measureHeights, onTextboxHeightsChange]);

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

    const nextHeight = Math.max(element.scrollHeight, minTextboxHeight);
    const heights = measureHeights();
    heights[textbox.id] = nextHeight;

    const totalHeight = textboxes.reduce((sum, currentTextbox) => {
      if (currentTextbox.section !== textbox.section) {
        return sum;
      }

      return sum + (heights[currentTextbox.id] ?? minTextboxHeight);
    }, 0);

    if (totalHeight > panelHeight) {
      onOverflow();
      return;
    }

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
      <div className="relative mx-auto w-[1024px]">
        <div className="absolute bottom-full left-0 mb-3">
          <Section layout={layout} onLayoutChange={onLayoutChange} />
        </div>
        <div className="h-[768px] overflow-hidden border border-gray-300 bg-white">
          <div className="relative flex h-full">
          {sections.map((sectionTextboxes, sectionIndex) => (
            <div
              key={sectionIndex}
              onMouseDown={() => onSectionSelect(sectionIndex)}
              onDragOver={(event) => handleSectionDragOver(event, sectionIndex)}
              onDrop={(event) => handleSectionDrop(event, sectionIndex)}
              className={`flex h-full flex-1 flex-col overflow-hidden ${
                sectionIndex > 0 ? 'border-l border-gray-300' : ''
              } ${
                selectedSection === sectionIndex
                  ? 'bg-blue-50/40 shadow-[inset_0_0_0_2px_rgba(59,130,246,0.35)]'
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
                    onChange={(event) => handleTextboxInput(textbox, event.target.value)}
                    placeholder={`Textbox ${index + 1}`}
                    rows={1}
                    className="w-full resize-none overflow-hidden border border-gray-300 bg-white px-3 py-3 text-base leading-6 text-gray-900 outline-none transition focus:border-blue-500"
                  />
                </div>
              ))}
              {dropTarget?.type === 'section' && dropTarget.section === sectionIndex ? (
                <div className="mt-auto border-b-4 border-b-blue-500" />
              ) : null}
            </div>
          ))}
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
              <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-2 shadow-md">
                <button
                  type="button"
                  draggable
                  onDragStart={() => handleDragStart(activeHoveredTextboxId)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 active:cursor-grabbing"
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
                  className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
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
