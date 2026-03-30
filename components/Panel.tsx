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
import {
  INITIAL_TEXT_TOOLBAR_STATE,
  type SemanticTextStyle,
  type TextToolbarAction,
  type TextToolbarState,
} from './textEditorTypes';

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
  onRegisterTextToolbarActionHandler: (
    handler: ((action: TextToolbarAction) => void) | null
  ) => void;
  onTextToolbarStateChange: (state: TextToolbarState) => void;
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

const SEMANTIC_COLORS: Record<
  SemanticTextStyle,
  { background?: [number, number, number]; color?: [number, number, number] }
> = {
  foreignWord: {
    color: [249, 115, 22],
  },
  highlight: {
    background: [253, 224, 71],
  },
  keyword: {
    color: [220, 38, 38],
  },
  phrase: {
    color: [139, 92, 246],
  },
  reservedWord: {
    color: [34, 197, 94],
  },
  term: {
    color: [59, 130, 246],
  },
};

const normalizePlainText = (text: string) => text.replace(/\r\n?/g, '\n');

const getRgbValues = (value: string) => {
  const matches = value.match(/\d+(?:\.\d+)?/g);

  if (!matches || matches.length < 3) {
    return null;
  }

  return matches.slice(0, 3).map((entry) => Math.round(Number(entry))) as [
    number,
    number,
    number,
  ];
};

const isSelectionInsideEditor = (
  editor: HTMLElement,
  selection: Selection | null
) => {
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);

  return (
    editor.contains(range.startContainer) && editor.contains(range.endContainer)
  );
};

const getSelectionStyleElement = (
  editor: HTMLElement,
  selection: Selection
): HTMLElement | null => {
  if (selection.rangeCount === 0) {
    return null;
  }

  let node: Node | null = selection.getRangeAt(0).startContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      return node;
    }

    node = node.parentNode;
  }

  return editor;
};

const isMatchingColor = (
  actualValue: string,
  expectedValue: [number, number, number]
) => {
  const parsedValue = getRgbValues(actualValue);

  if (!parsedValue) {
    return false;
  }

  return parsedValue.every(
    (channel, index) => Math.abs(channel - expectedValue[index]) <= 18
  );
};

const createFragmentFromPlainText = (text: string) => {
  const fragment = document.createDocumentFragment();
  const lines = normalizePlainText(text).split('\n');

  lines.forEach((line, index) => {
    if (line.length > 0) {
      fragment.appendChild(document.createTextNode(line));
    }

    if (index < lines.length - 1) {
      fragment.appendChild(document.createElement('br'));
    }
  });

  return fragment;
};

const safeExecCommand = (command: string, value?: string) => {
  try {
    return document.execCommand(command, false, value);
  } catch {
    return false;
  }
};

const safeQueryCommandState = (command: string) => {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
};

const syncEditorEmptyState = (element: HTMLDivElement) => {
  const normalizedText = (element.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .trim();

  element.dataset.empty =
    normalizedText.length === 0 && !element.querySelector('li') ? 'true' : 'false';
};

const isEditorEmpty = (element: HTMLDivElement) =>
  element.dataset.empty === 'true';

const applyFragmentToCurrentSelection = (
  editor: HTMLDivElement,
  fragment: DocumentFragment,
  selectionMode: 'collapse-end' | 'select'
) => {
  const selection = window.getSelection();

  if (!selection) {
    return null;
  }

  if (selection.rangeCount === 0 || !isSelectionInsideEditor(editor, selection)) {
    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(editor);
    fallbackRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(fallbackRange);
  }

  if (selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const nodes = Array.from(fragment.childNodes);
  const insertionFragment = document.createDocumentFragment();

  nodes.forEach((node) => insertionFragment.appendChild(node));

  range.deleteContents();
  range.insertNode(insertionFragment);

  const nextRange = document.createRange();

  if (nodes.length === 0) {
    nextRange.selectNodeContents(editor);
    nextRange.collapse(false);
  } else if (selectionMode === 'select') {
    nextRange.setStartBefore(nodes[0]);
    nextRange.setEndAfter(nodes[nodes.length - 1]);
  } else {
    nextRange.setStartAfter(nodes[nodes.length - 1]);
    nextRange.collapse(true);
  }

  selection.removeAllRanges();
  selection.addRange(nextRange);

  return nextRange.cloneRange();
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
  onRegisterTextToolbarActionHandler,
  onTextToolbarStateChange,
}: PanelProps) {
  const textboxRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const wrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const lastValidTextboxValuesRef = useRef<Record<number, string>>({});
  const closeMenuTimeoutRef = useRef<number | null>(null);
  const activeTextboxIdRef = useRef<number | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const textToolbarStateRef = useRef<TextToolbarState>(INITIAL_TEXT_TOOLBAR_STATE);
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

  const setTextToolbarState = useCallback(
    (nextState: TextToolbarState) => {
      textToolbarStateRef.current = nextState;
      onTextToolbarStateChange(nextState);
    },
    [onTextToolbarStateChange]
  );

  const clearTextToolbarState = useCallback(() => {
    activeTextboxIdRef.current = null;
    savedSelectionRef.current = null;
    setTextToolbarState(INITIAL_TEXT_TOOLBAR_STATE);
  }, [setTextToolbarState]);

  const measureTextboxHeight = useCallback(
    (element: HTMLDivElement) => {
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

  const restoreSavedSelection = useCallback((editor: HTMLDivElement) => {
    editor.focus();

    const selection = window.getSelection();

    if (!selection) {
      return false;
    }

    const savedSelection = savedSelectionRef.current;

    if (
      savedSelection &&
      editor.contains(savedSelection.startContainer) &&
      editor.contains(savedSelection.endContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedSelection);
      return true;
    }

    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(editor);
    fallbackRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(fallbackRange);
    savedSelectionRef.current = fallbackRange.cloneRange();

    return true;
  }, []);

  const getSemanticStyle = useCallback((editor: HTMLDivElement, selection: Selection) => {
    const styleElement = getSelectionStyleElement(editor, selection);

    if (!styleElement) {
      return null;
    }

    const computedStyles = window.getComputedStyle(styleElement);
    const isItalic =
      computedStyles.fontStyle === 'italic' || safeQueryCommandState('italic');

    if (
      SEMANTIC_COLORS.highlight.background &&
      isMatchingColor(
        computedStyles.backgroundColor,
        SEMANTIC_COLORS.highlight.background
      )
    ) {
      return 'highlight';
    }

    if (
      SEMANTIC_COLORS.keyword.color &&
      safeQueryCommandState('underline') &&
      isMatchingColor(computedStyles.color, SEMANTIC_COLORS.keyword.color)
    ) {
      return 'keyword';
    }

    if (
      SEMANTIC_COLORS.term.color &&
      isItalic &&
      isMatchingColor(computedStyles.color, SEMANTIC_COLORS.term.color)
    ) {
      return 'term';
    }

    if (
      SEMANTIC_COLORS.phrase.color &&
      isItalic &&
      isMatchingColor(computedStyles.color, SEMANTIC_COLORS.phrase.color)
    ) {
      return 'phrase';
    }

    if (
      SEMANTIC_COLORS.foreignWord.color &&
      isMatchingColor(computedStyles.color, SEMANTIC_COLORS.foreignWord.color)
    ) {
      return 'foreignWord';
    }

    if (
      SEMANTIC_COLORS.reservedWord.color &&
      isMatchingColor(computedStyles.color, SEMANTIC_COLORS.reservedWord.color)
    ) {
      return 'reservedWord';
    }

    return null;
  }, []);

  const updateTextToolbarStateFromSelection = useCallback(
    (textboxId: number | null = activeTextboxIdRef.current) => {
      if (textboxId === null) {
        clearTextToolbarState();
        return;
      }

      const editor = textboxRefs.current[textboxId];

      if (!editor) {
        clearTextToolbarState();
        return;
      }

      const selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        if (document.activeElement === editor) {
          setTextToolbarState({
            ...INITIAL_TEXT_TOOLBAR_STATE,
            textboxId,
            visible: true,
          });
          return;
        }

        clearTextToolbarState();
        return;
      }

      if (!isSelectionInsideEditor(editor, selection)) {
        if (document.activeElement === editor) {
          setTextToolbarState({
            ...INITIAL_TEXT_TOOLBAR_STATE,
            textboxId,
            visible: true,
          });
          return;
        }

        clearTextToolbarState();
        return;
      }

      activeTextboxIdRef.current = textboxId;
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();

      setTextToolbarState({
        bold: safeQueryCommandState('bold'),
        hasSelection:
          !selection.isCollapsed && selection.toString().trim().length > 0,
        italic: safeQueryCommandState('italic'),
        orderedList: safeQueryCommandState('insertOrderedList'),
        semanticStyle: getSemanticStyle(editor, selection),
        subscript: safeQueryCommandState('subscript'),
        superscript: safeQueryCommandState('superscript'),
        textboxId,
        underline: safeQueryCommandState('underline'),
        unorderedList: safeQueryCommandState('insertUnorderedList'),
        visible: true,
      });
    },
    [clearTextToolbarState, getSemanticStyle, setTextToolbarState]
  );

  const commitTextboxContent = useCallback(
    (textbox: TextboxItem) => {
      const element = textboxRefs.current[textbox.id];

      if (!element) {
        return false;
      }

      const previousHeight = element.offsetHeight || minTextboxHeight;

      syncEditorEmptyState(element);

      if (isEditorEmpty(element) && element.innerHTML !== '') {
        element.innerHTML = '';
      }

      const nextText = isEditorEmpty(element) ? '' : element.innerHTML;

      measureTextboxHeight(element);

      const nextSectionUsage = measureSectionUsage();

      if (
        (nextSectionUsage[textbox.section] ?? 0) >
        getAvailableHeight(textbox.section)
      ) {
        const lastValidValue =
          lastValidTextboxValuesRef.current[textbox.id] ?? textbox.text;

        element.innerHTML = lastValidValue;
        syncEditorEmptyState(element);
        measureTextboxHeight(element);
        element.style.height = `${previousHeight}px`;
        savedSelectionRef.current = null;
        onOverflow();
        updateTextToolbarStateFromSelection(textbox.id);
        return false;
      }

      lastValidTextboxValuesRef.current[textbox.id] = nextText;

      if (nextText !== textbox.text) {
        onTextboxChange(textbox.id, nextText);
      }

      updateTextToolbarStateFromSelection(textbox.id);
      return true;
    },
    [
      getAvailableHeight,
      measureSectionUsage,
      measureTextboxHeight,
      minTextboxHeight,
      onOverflow,
      onTextboxChange,
      updateTextToolbarStateFromSelection,
    ]
  );

  const clearSelectionFormatting = useCallback(
    (editor: HTMLDivElement) => {
      const selection = window.getSelection();

      if (
        !selection ||
        selection.rangeCount === 0 ||
        selection.isCollapsed ||
        !isSelectionInsideEditor(editor, selection)
      ) {
        return false;
      }

      const plainText = selection.toString();
      const hadOrderedList = textToolbarStateRef.current.orderedList;
      const hadUnorderedList = textToolbarStateRef.current.unorderedList;
      const nextRange = applyFragmentToCurrentSelection(
        editor,
        createFragmentFromPlainText(plainText),
        'select'
      );

      if (!nextRange) {
        return false;
      }

      if (hadOrderedList) {
        safeExecCommand('insertOrderedList');
      }

      if (hadUnorderedList) {
        safeExecCommand('insertUnorderedList');
      }

      const updatedSelection = window.getSelection();
      savedSelectionRef.current =
        updatedSelection && updatedSelection.rangeCount > 0
          ? updatedSelection.getRangeAt(0).cloneRange()
          : nextRange;

      return true;
    },
    []
  );

  const applySemanticStyle = useCallback((style: SemanticTextStyle) => {
    safeExecCommand('styleWithCSS', 'true');

    if ((style === 'term' || style === 'phrase') && !safeQueryCommandState('italic')) {
      safeExecCommand('italic');
    }

    if (style === 'keyword' && !safeQueryCommandState('underline')) {
      safeExecCommand('underline');
    }

    if (style === 'highlight') {
      if (!safeExecCommand('hiliteColor', '#fde047')) {
        safeExecCommand('backColor', '#fde047');
      }
    } else {
      const colorValue =
        style === 'keyword'
          ? '#dc2626'
          : style === 'term'
            ? '#3b82f6'
            : style === 'phrase'
              ? '#8b5cf6'
              : style === 'foreignWord'
                ? '#f97316'
                : '#22c55e';

      safeExecCommand('foreColor', colorValue);
    }

    safeExecCommand('styleWithCSS', 'false');
  }, []);

  const handleTextToolbarAction = useCallback(
    (action: TextToolbarAction) => {
      const activeTextboxId = activeTextboxIdRef.current;

      if (activeTextboxId === null) {
        return;
      }

      const editor = textboxRefs.current[activeTextboxId];
      const textbox = textboxes.find((entry) => entry.id === activeTextboxId);

      if (!editor || !textbox) {
        return;
      }

      restoreSavedSelection(editor);

      if (action === 'clear') {
        if (!clearSelectionFormatting(editor)) {
          return;
        }
      } else if (
        action === 'keyword' ||
        action === 'term' ||
        action === 'phrase' ||
        action === 'highlight' ||
        action === 'foreignWord' ||
        action === 'reservedWord'
      ) {
        applySemanticStyle(action);
      } else {
        safeExecCommand('styleWithCSS', 'false');

        if (action === 'bold') {
          safeExecCommand('bold');
        } else if (action === 'italic') {
          safeExecCommand('italic');
        } else if (action === 'underline') {
          safeExecCommand('underline');
        } else if (action === 'superscript') {
          safeExecCommand('superscript');
        } else if (action === 'subscript') {
          safeExecCommand('subscript');
        } else if (action === 'orderedList') {
          safeExecCommand('insertOrderedList');
        } else if (action === 'unorderedList') {
          safeExecCommand('insertUnorderedList');
        }
      }

      commitTextboxContent(textbox);
    },
    [
      applySemanticStyle,
      clearSelectionFormatting,
      commitTextboxContent,
      restoreSavedSelection,
      textboxes,
    ]
  );

  useLayoutEffect(() => {
    textboxes.forEach((textbox) => {
      const element = textboxRefs.current[textbox.id];

      if (!element) {
        return;
      }

      if (element.innerHTML !== textbox.text) {
        element.innerHTML = textbox.text;
      }

      syncEditorEmptyState(element);
    });

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
    onRegisterTextToolbarActionHandler(handleTextToolbarAction);

    return () => {
      onRegisterTextToolbarActionHandler(null);
    };
  }, [handleTextToolbarAction, onRegisterTextToolbarActionHandler]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (activeTextboxIdRef.current === null) {
        return;
      }

      updateTextToolbarStateFromSelection(activeTextboxIdRef.current);
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateTextToolbarStateFromSelection]);

  useEffect(() => {
    if (
      activeTextboxIdRef.current !== null &&
      !textboxes.some((textbox) => textbox.id === activeTextboxIdRef.current)
    ) {
      clearTextToolbarState();
    }
  }, [clearTextToolbarState, textboxes]);

  useEffect(() => {
    return () => {
      if (closeMenuTimeoutRef.current !== null) {
        window.clearTimeout(closeMenuTimeoutRef.current);
      }

      onRegisterTextToolbarActionHandler(null);
      onTextToolbarStateChange(INITIAL_TEXT_TOOLBAR_STATE);
    };
  }, [onRegisterTextToolbarActionHandler, onTextToolbarStateChange]);

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

  const handleTextboxFocus = (textboxId: number) => {
    activeTextboxIdRef.current = textboxId;
    updateTextToolbarStateFromSelection(textboxId);
  };

  const handleTextboxBlur = (textboxId: number) => {
    window.requestAnimationFrame(() => {
      const editor = textboxRefs.current[textboxId];

      if (!editor) {
        clearTextToolbarState();
        return;
      }

      const selection = window.getSelection();

      if (
        document.activeElement === editor ||
        isSelectionInsideEditor(editor, selection)
      ) {
        updateTextToolbarStateFromSelection(textboxId);
        return;
      }

      if (activeTextboxIdRef.current === textboxId) {
        clearTextToolbarState();
      }
    });
  };

  const handleTextboxInput = (textbox: TextboxItem) => {
    commitTextboxContent(textbox);
  };

  const handleTextboxPaste = (
    event: React.ClipboardEvent<HTMLDivElement>,
    textbox: TextboxItem
  ) => {
    event.preventDefault();

    const editor = textboxRefs.current[textbox.id];

    if (!editor) {
      return;
    }

    activeTextboxIdRef.current = textbox.id;
    restoreSavedSelection(editor);

    const plainText = normalizePlainText(
      event.clipboardData.getData('text/plain') ?? ''
    );

    applyFragmentToCurrentSelection(
      editor,
      createFragmentFromPlainText(plainText),
      'collapse-end'
    );
    commitTextboxContent(textbox);
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
                      <div
                        ref={(element) => {
                          textboxRefs.current[textbox.id] = element;
                        }}
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        aria-multiline="true"
                        spellCheck
                        data-empty={textbox.text === '' ? 'true' : 'false'}
                        data-placeholder={`Textbox ${index + 1}`}
                        onFocus={() => handleTextboxFocus(textbox.id)}
                        onBlur={() => handleTextboxBlur(textbox.id)}
                        onInput={() => handleTextboxInput(textbox)}
                        onPaste={(event) => handleTextboxPaste(event, textbox)}
                        onKeyUp={() => updateTextToolbarStateFromSelection(textbox.id)}
                        onMouseUp={() => updateTextToolbarStateFromSelection(textbox.id)}
                        className="textbox-editor w-full resize-none overflow-hidden border border-slate-200/80 bg-white px-3 py-3 text-base leading-6 text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 ease-out hover:border-slate-300 focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
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
