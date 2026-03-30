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
import PanelItemShell from './PanelItemShell';
import Section from './Section';
import {
  createImagePanelItem,
  createPanelItemShellState,
  type ImageInsertRequest,
  type ImagePanelItem,
  type PanelContentItem,
  type PanelItem,
  type TextboxPanelItem,
} from './panelItemTypes';
import {
  INITIAL_TEXT_TOOLBAR_STATE,
  type SemanticTextStyle,
  type TextToolbarAction,
  type TextToolbarState,
} from './textEditorTypes';

type LayoutOption = 'blank' | 'split' | 'thirds';

type ImageItem = ImagePanelItem;
type ContentItem = PanelContentItem;
type TextboxItem = TextboxPanelItem;
type ContentPanelItem = ImageItem | TextboxItem;
type ImageInteraction =
  | {
      availableHeight: number;
      aspectRatio: number;
      imageId: number;
      mode: 'drag';
      originHeight: number;
      originWidth: number;
      originX: number;
      originY: number;
      sectionWidth: number;
      startX: number;
      startY: number;
    }
  | {
      availableHeight: number;
      aspectRatio: number;
      imageId: number;
      mode: 'resize';
      originHeight: number;
      originWidth: number;
      originX: number;
      originY: number;
      sectionWidth: number;
      startX: number;
      startY: number;
    };

type PanelProps = {
  contentItems: ContentItem[];
  images: ImageItem[];
  panelHeight: number;
  minTextboxHeight: number;
  layout: LayoutOption;
  selectedSection: number;
  subtitle: string;
  textboxes: TextboxItem[];
  title: string;
  onLayoutChange: (layout: LayoutOption) => void;
  onAddImage: (image: ImageItem, insertAfterId: number | null) => void;
  onSectionSelect: (section: number) => void;
  onSubtitleChange: (subtitle: string) => void;
  onImageChange: (
    id: number,
    updates: Partial<Pick<ImageItem, 'height' | 'width' | 'x' | 'y'>>
  ) => void;
  onImageInsertError: (message: string) => void;
  onRegisterImageInsertHandler: (
    handler: ((request: ImageInsertRequest) => Promise<boolean>) | null
  ) => void;
  onTextboxChange: (id: number, text: string) => void;
  onDeleteContentItem: (id: number) => void;
  onTextboxHeightsChange: (heights: Record<number, number>) => void;
  onTitleChange: (title: string) => void;
  onAvailableHeightChange: (height: number) => void;
  onSectionUsageChange: (usage: Record<number, number>) => void;
  onMoveContentItem: (
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

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const SUPPORTED_IMAGE_EXTENSION_PATTERN = /\.(gif|jpe?g|png|webp)$/i;
const DEFAULT_IMAGE_MAX_WIDTH_RATIO = 0.62;
const DEFAULT_IMAGE_MAX_HEIGHT_RATIO = 0.52;
const DEFAULT_IMAGE_OFFSET_STEP = 18;
const MAX_IMAGE_INSERT_OFFSET = 72;
const MIN_IMAGE_WIDTH = 120;
const MIN_IMAGE_HEIGHT = 72;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isSupportedImageFile = (file: File) =>
  SUPPORTED_IMAGE_MIME_TYPES.has(file.type) ||
  SUPPORTED_IMAGE_EXTENSION_PATTERN.test(file.name);

const getImageWrapperHeight = (image: Pick<ImageItem, 'height'>) =>
  Math.ceil(image.height);

const clampImageFrameToSlot = (
  image: Pick<ImageItem, 'aspectRatio' | 'height' | 'width' | 'x' | 'y'>,
  sectionWidth: number,
  availableHeight: number
) => {
  const safeSectionWidth = Math.max(sectionWidth, 1);
  const safeAvailableHeight = Math.max(availableHeight, 1);
  const aspectRatio = image.aspectRatio > 0 ? image.aspectRatio : 1;
  const maxWidth = safeSectionWidth;
  const maxHeight = safeAvailableHeight;
  const minWidth = Math.min(
    maxWidth,
    Math.max(MIN_IMAGE_WIDTH, MIN_IMAGE_HEIGHT * aspectRatio)
  );
  const minHeight = Math.min(
    maxHeight,
    Math.max(MIN_IMAGE_HEIGHT, MIN_IMAGE_WIDTH / aspectRatio)
  );

  let nextWidth = image.width;
  let nextHeight = image.height;

  if (nextWidth > maxWidth) {
    nextWidth = maxWidth;
    nextHeight = nextWidth / aspectRatio;
  }

  if (nextHeight > maxHeight) {
    nextHeight = maxHeight;
    nextWidth = nextHeight * aspectRatio;
  }

  if (nextWidth < minWidth) {
    nextWidth = minWidth;
    nextHeight = nextWidth / aspectRatio;
  }

  if (nextHeight < minHeight) {
    nextHeight = minHeight;
    nextWidth = nextHeight * aspectRatio;
  }

  if (nextWidth > maxWidth) {
    nextWidth = maxWidth;
    nextHeight = nextWidth / aspectRatio;
  }

  if (nextHeight > maxHeight) {
    nextHeight = maxHeight;
    nextWidth = nextHeight * aspectRatio;
  }

  const maxX = Math.max(0, safeSectionWidth - nextWidth);

  return {
    height: Math.round(nextHeight),
    width: Math.round(nextWidth),
    x: Math.round(clamp(image.x, 0, maxX)),
    y: 0,
  };
};

const getDefaultImageFrame = ({
  aspectRatio,
  imageCount,
  naturalHeight,
  naturalWidth,
  sectionHeight,
  sectionWidth,
}: {
  aspectRatio: number;
  imageCount: number;
  naturalHeight: number;
  naturalWidth: number;
  sectionHeight: number;
  sectionWidth: number;
}) => {
  const preferredWidth = Math.min(
    naturalWidth,
    sectionWidth * DEFAULT_IMAGE_MAX_WIDTH_RATIO,
    sectionWidth
  );
  const preferredHeight = Math.min(
    naturalHeight,
    sectionHeight * DEFAULT_IMAGE_MAX_HEIGHT_RATIO,
    sectionHeight
  );
  let width = preferredWidth;
  let height = width / aspectRatio;

  if (height > preferredHeight) {
    height = preferredHeight;
    width = height * aspectRatio;
  }

  const offset = Math.min(imageCount * DEFAULT_IMAGE_OFFSET_STEP, MAX_IMAGE_INSERT_OFFSET);

  return clampImageFrameToSlot(
    {
      aspectRatio,
      height,
      width,
      x: (sectionWidth - width) / 2 + offset,
      y: 0,
    },
    sectionWidth,
    sectionHeight
  );
};

const loadImageFile = (file: File) =>
  new Promise<{
    aspectRatio: number;
    naturalHeight: number;
    naturalWidth: number;
    src: string;
  }>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('The selected image could not be read.'));
    };

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('The selected image could not be read.'));
        return;
      }

      const src = reader.result;
      const image = new Image();

      image.onerror = () => {
        reject(new Error('The selected image could not be loaded.'));
      };

      image.onload = () => {
        const naturalWidth = Math.max(image.naturalWidth, 1);
        const naturalHeight = Math.max(image.naturalHeight, 1);

        resolve({
          aspectRatio: naturalWidth / naturalHeight,
          naturalHeight,
          naturalWidth,
          src,
        });
      };

      image.src = src;
    };

    reader.readAsDataURL(file);
  });

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
  contentItems,
  images,
  panelHeight,
  minTextboxHeight,
  layout,
  selectedSection,
  subtitle,
  textboxes,
  title,
  onAddImage,
  onLayoutChange,
  onSectionSelect,
  onSubtitleChange,
  onImageChange,
  onImageInsertError,
  onRegisterImageInsertHandler,
  onTextboxChange,
  onDeleteContentItem,
  onTextboxHeightsChange,
  onTitleChange,
  onAvailableHeightChange,
  onSectionUsageChange,
  onMoveContentItem,
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
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [imageInteraction, setImageInteraction] = useState<ImageInteraction | null>(
    null
  );
  const [draggedContentItemId, setDraggedContentItemId] = useState<number | null>(
    null
  );
  const [dropTarget, setDropTarget] = useState<
    | {
        type: 'section';
        section: number;
      }
    | {
        type: 'item';
        id: number;
        position: 'before' | 'after';
        section: number;
      }
    | null
  >(null);
  const [hoveredContentItemId, setHoveredContentItemId] = useState<number | null>(
    null
  );
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(
    null
  );

  const sectionCount = useMemo(() => getSectionCount(layout), [layout]);
  const panelItemLookup = useMemo(() => {
    const nextLookup = new Map<number, PanelItem>();

    textboxes.forEach((textbox) => {
      nextLookup.set(textbox.id, textbox);
    });

    images.forEach((image) => {
      nextLookup.set(image.id, image);
    });

    return nextLookup;
  }, [images, textboxes]);
  const sectionContentItems = useMemo(
    () =>
      Array.from({ length: sectionCount }, (_, sectionIndex) =>
        contentItems.filter((item) => item.section === sectionIndex)
      ),
    [contentItems, sectionCount]
  );
  const sectionPanelItems = useMemo(
    () =>
      sectionContentItems.map((itemsInSection) =>
        itemsInSection
          .map((item) => panelItemLookup.get(item.id))
          .filter((item): item is PanelItem => item !== undefined)
      ),
    [panelItemLookup, sectionContentItems]
  );
  const activeActionContentItem = useMemo(
    () =>
      contentItems.find((item) => item.id === hoveredContentItemId) ??
      contentItems.find((item) => item.id === selectedImageId) ??
      null,
    [contentItems, hoveredContentItemId, selectedImageId]
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

  const getContentItemFlowHeight = useCallback(
    (item: ContentItem) => {
      const wrapper = wrapperRefs.current[item.id];

      if (wrapper) {
        return wrapper.offsetHeight;
      }

      if (item.type === 'textbox') {
        const editor = textboxRefs.current[item.id];
        return editor?.offsetHeight ?? minTextboxHeight;
      }

      const image = panelItemLookup.get(item.id);

      if (!image || image.type !== 'image') {
        return 0;
      }

      return getImageWrapperHeight(image);
    },
    [minTextboxHeight, panelItemLookup]
  );

  const getAvailableHeightForContentSlot = useCallback(
    (
      sectionIndex: number,
      _slotIndex: number,
      excludedItemId: number | null = null
    ) => {
      const section = sectionRefs.current[sectionIndex];
      const itemsInSection = sectionContentItems[sectionIndex] ?? [];

      if (!section) {
        return 0;
      }

      let usedHeight = 0;

      itemsInSection.forEach((item) => {
        if (item.id === excludedItemId) {
          return;
        }

        usedHeight += getContentItemFlowHeight(item);
      });

      return Math.max(0, section.clientHeight - usedHeight);
    },
    [getContentItemFlowHeight, sectionContentItems]
  );

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

      return contentItems.reduce((maxBottom, item) => {
        if (item.section !== sectionIndex) {
          return maxBottom;
        }

        const wrapper = wrapperRefs.current[item.id];

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
  }, [contentItems, sectionCount]);

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

  useLayoutEffect(() => {
    images.forEach((image) => {
      const section = sectionRefs.current[image.section];
      const itemIndex = (sectionContentItems[image.section] ?? []).findIndex(
        (item) => item.id === image.id
      );

      if (!section || itemIndex === -1) {
        return;
      }

      const nextFrame = clampImageFrameToSlot(
        image,
        section.clientWidth,
        getAvailableHeightForContentSlot(image.section, itemIndex, image.id)
      );

      if (
        nextFrame.x !== image.x ||
        nextFrame.y !== image.y ||
        nextFrame.width !== image.width ||
        nextFrame.height !== image.height
      ) {
        onImageChange(image.id, nextFrame);
      }
    });
  }, [
    getAvailableHeightForContentSlot,
    images,
    layout,
    onImageChange,
    sectionContentItems,
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

      onRegisterImageInsertHandler(null);
      onRegisterTextToolbarActionHandler(null);
      onTextToolbarStateChange(INITIAL_TEXT_TOOLBAR_STATE);
    };
  }, [
    onRegisterImageInsertHandler,
    onRegisterTextToolbarActionHandler,
    onTextToolbarStateChange,
  ]);

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
    if (activeActionContentItem === null) {
      return undefined;
    }

    updateMenuPosition(activeActionContentItem.id);

    const handleViewportChange = () => updateMenuPosition(activeActionContentItem.id);

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [activeActionContentItem, contentItems, images, textboxes, updateMenuPosition]);

  const handleDragStart = (id: number) => {
    setDraggedContentItemId(id);
    setDropTarget(null);

    if (panelItemLookup.get(id)?.type === 'image') {
      setSelectedImageId(id);
    } else {
      setSelectedImageId(null);
    }
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetItem: ContentPanelItem
  ) => {
    if (draggedContentItemId === null || draggedContentItemId === targetItem.id) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const { top, height } = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < top + height / 2 ? 'before' : 'after';
    setDropTarget({
      type: 'item',
      id: targetItem.id,
      position,
      section: targetItem.section,
    });
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    targetItem: ContentPanelItem
  ) => {
    if (
      draggedContentItemId === null ||
      draggedContentItemId === targetItem.id ||
      dropTarget === null ||
      dropTarget.type !== 'item'
    ) {
      setDraggedContentItemId(null);
      setDropTarget(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onMoveContentItem(
      draggedContentItemId,
      dropTarget.section,
      targetItem.id,
      dropTarget.position
    );
    setDraggedContentItemId(null);
    setDropTarget(null);
  };

  const handleSectionDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    sectionIndex: number
  ) => {
    if (draggedContentItemId === null) {
      return;
    }

    event.preventDefault();
    setDropTarget({ type: 'section', section: sectionIndex });
  };

  const handleSectionDrop = (
    event: React.DragEvent<HTMLDivElement>,
    sectionIndex: number
  ) => {
    if (draggedContentItemId === null) {
      return;
    }

    event.preventDefault();

    if (dropTarget !== null && dropTarget.type === 'item') {
      return;
    }

    onMoveContentItem(draggedContentItemId, sectionIndex, null, 'after');
    setDraggedContentItemId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedContentItemId(null);
    setDropTarget(null);
  };

  const handleContentItemMouseEnter = (id: number) => {
    if (closeMenuTimeoutRef.current !== null) {
      window.clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }

    setHoveredContentItemId(id);
    updateMenuPosition(id);
  };

  const scheduleMenuClose = () => {
    if (closeMenuTimeoutRef.current !== null) {
      window.clearTimeout(closeMenuTimeoutRef.current);
    }

    closeMenuTimeoutRef.current = window.setTimeout(() => {
      setHoveredContentItemId(null);
      setMenuPosition(null);
      closeMenuTimeoutRef.current = null;
    }, 120);
  };

  const dismissTextboxUi = useCallback(() => {
    if (closeMenuTimeoutRef.current !== null) {
      window.clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }

    setHoveredContentItemId(null);
    setMenuPosition(null);
    clearTextToolbarState();
  }, [clearTextToolbarState]);

  const startImageInteraction = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement | HTMLDivElement>,
      image: ImageItem,
      mode: ImageInteraction['mode']
    ) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const section = sectionRefs.current[image.section];
      const itemIndex = (sectionContentItems[image.section] ?? []).findIndex(
        (item) => item.id === image.id
      );

      if (!section || itemIndex === -1) {
        return;
      }

      dismissTextboxUi();
      onSectionSelect(image.section);
      setSelectedImageId(image.id);
      setImageInteraction({
        availableHeight: getAvailableHeightForContentSlot(
          image.section,
          itemIndex,
          image.id
        ),
        aspectRatio: image.aspectRatio,
        imageId: image.id,
        mode,
        originHeight: image.height,
        originWidth: image.width,
        originX: image.x,
        originY: image.y,
        sectionWidth: section.clientWidth,
        startX: event.clientX,
        startY: event.clientY,
      });
    },
    [dismissTextboxUi, getAvailableHeightForContentSlot, onSectionSelect, sectionContentItems]
  );

  const handleImageMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, image: ImageItem) => {
      setHoveredContentItemId(image.id);
      updateMenuPosition(image.id);
      startImageInteraction(event, image, 'drag');
    },
    [startImageInteraction, updateMenuPosition]
  );

  const handleTextboxFocus = (textboxId: number) => {
    setSelectedImageId(null);
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

  const handleInsertImageRequest = useCallback(
    async ({ file, id }: ImageInsertRequest) => {
      if (!isSupportedImageFile(file)) {
        onImageInsertError('Choose a PNG, JPG, JPEG, GIF, or WEBP image.');
        return false;
      }

      const section = sectionRefs.current[selectedSection];

      if (!section) {
        onImageInsertError('Select a Learning Section before adding an image.');
        return false;
      }

      try {
        const itemsInSection = sectionContentItems[selectedSection] ?? [];
        const anchorId = itemsInSection.some((item) => item.id === selectedImageId)
          ? selectedImageId
          : itemsInSection.some((item) => item.id === activeTextboxIdRef.current)
            ? activeTextboxIdRef.current
            : null;
        const anchorIndex =
          anchorId === null
            ? -1
            : itemsInSection.findIndex((item) => item.id === anchorId);
        const insertIndex =
          anchorIndex === -1 ? itemsInSection.length : anchorIndex + 1;
        const availableHeight = getAvailableHeightForContentSlot(
          selectedSection,
          insertIndex,
          null
        );

        if (availableHeight < MIN_IMAGE_HEIGHT) {
          onImageInsertError(
            "It's not possible to add more content to the current section."
          );
          return false;
        }

        const { aspectRatio, naturalHeight, naturalWidth, src } =
          await loadImageFile(file);
        const frame = getDefaultImageFrame({
          aspectRatio,
          imageCount: itemsInSection.filter((item) => item.type === 'image').length,
          naturalHeight,
          naturalWidth,
          sectionHeight: availableHeight,
          sectionWidth: section.clientWidth,
        });

        onAddImage(
          createImagePanelItem({
            altText: file.name,
            aspectRatio,
            height: frame.height,
            id,
            section: selectedSection,
            src,
            width: frame.width,
            x: frame.x,
            y: frame.y,
          }),
          anchorId
        );
        dismissTextboxUi();
        onSectionSelect(selectedSection);
        setSelectedImageId(id);
        return true;
      } catch {
        onImageInsertError('The selected image could not be loaded.');
        return false;
      }
    },
    [
      dismissTextboxUi,
      getAvailableHeightForContentSlot,
      onAddImage,
      onImageInsertError,
      onSectionSelect,
      sectionContentItems,
      selectedImageId,
      selectedSection,
    ]
  );

  useEffect(() => {
    onRegisterImageInsertHandler(handleInsertImageRequest);

    return () => {
      onRegisterImageInsertHandler(null);
    };
  }, [handleInsertImageRequest, onRegisterImageInsertHandler]);

  useEffect(() => {
    if (selectedImageId !== null && !images.some((image) => image.id === selectedImageId)) {
      setSelectedImageId(null);
    }
  }, [images, selectedImageId]);

  useEffect(() => {
    if (!imageInteraction) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (imageInteraction.mode === 'drag') {
        const nextFrame = clampImageFrameToSlot(
          {
            aspectRatio: imageInteraction.aspectRatio,
            height: imageInteraction.originHeight,
            width: imageInteraction.originWidth,
            x: imageInteraction.originX + (event.clientX - imageInteraction.startX),
            y: 0,
          },
          imageInteraction.sectionWidth,
          imageInteraction.availableHeight
        );

        onImageChange(imageInteraction.imageId, nextFrame);
        return;
      }

      const widthFromHorizontalDrag =
        imageInteraction.originWidth + (event.clientX - imageInteraction.startX);
      const heightFromVerticalDrag =
        imageInteraction.originHeight + (event.clientY - imageInteraction.startY);
      const projectedWidth =
        Math.abs(event.clientX - imageInteraction.startX) >=
        Math.abs(event.clientY - imageInteraction.startY)
          ? widthFromHorizontalDrag
          : heightFromVerticalDrag * imageInteraction.aspectRatio;
      const nextWidth = Math.max(projectedWidth, 1);
      const nextHeight = nextWidth / imageInteraction.aspectRatio;
      const nextFrame = clampImageFrameToSlot(
        {
          aspectRatio: imageInteraction.aspectRatio,
          height: nextHeight,
          width: nextWidth,
          x: imageInteraction.originX,
          y: 0,
        },
        imageInteraction.sectionWidth,
        imageInteraction.availableHeight
      );

      onImageChange(imageInteraction.imageId, nextFrame);
    };

    const handleMouseUp = () => {
      setImageInteraction(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [imageInteraction, onImageChange]);

  // Textboxes keep their current flow-based sizing rules; future panel item types
  // can plug into this dispatch point without replacing the textbox editor model.
  const renderPanelItem = (item: PanelItem, index: number) => {
    if (item.type === 'textbox') {
      const dropIndicator =
        dropTarget?.type === 'item' && dropTarget.id === item.id
          ? dropTarget.position
          : null;

      return (
        <PanelItemShell
          key={item.id}
          item={createPanelItemShellState(
            item,
            textToolbarStateRef.current.textboxId === item.id &&
              textToolbarStateRef.current.visible
          )}
          itemRef={(element) => {
            wrapperRefs.current[item.id] = element;
          }}
          dropIndicator={dropIndicator}
          onDragOver={(event) => handleDragOver(event, item)}
          onDrop={(event) => handleDrop(event, item)}
          onMouseEnter={() => handleContentItemMouseEnter(item.id)}
          onMouseLeave={scheduleMenuClose}
        >
          <div
            ref={(element) => {
              textboxRefs.current[item.id] = element;
            }}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            spellCheck
            data-empty={item.text === '' ? 'true' : 'false'}
            data-placeholder={`Textbox ${index + 1}`}
            onFocus={() => handleTextboxFocus(item.id)}
            onBlur={() => handleTextboxBlur(item.id)}
            onInput={() => handleTextboxInput(item)}
            onPaste={(event) => handleTextboxPaste(event, item)}
            onKeyUp={() => updateTextToolbarStateFromSelection(item.id)}
            onMouseUp={() => updateTextToolbarStateFromSelection(item.id)}
            className="textbox-editor w-full resize-none overflow-hidden border border-slate-200/80 bg-white px-3 py-3 text-base leading-6 text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 ease-out hover:border-slate-300 focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
          />
        </PanelItemShell>
      );
    }

    if (item.type === 'image') {
      const isSelected = selectedImageId === item.id;
      const wrapperHeight = getImageWrapperHeight(item);
      const dropIndicator =
        dropTarget?.type === 'item' && dropTarget.id === item.id
          ? dropTarget.position
          : null;

      return (
        <PanelItemShell
          key={item.id}
          item={createPanelItemShellState(item, isSelected)}
          itemRef={(element) => {
            wrapperRefs.current[item.id] = element;
          }}
          dropIndicator={dropIndicator}
          onDragOver={(event) => handleDragOver(event, item)}
          onDrop={(event) => handleDrop(event, item)}
          onMouseEnter={() => handleContentItemMouseEnter(item.id)}
          onMouseLeave={scheduleMenuClose}
          className="relative"
          style={{ height: `${wrapperHeight}px` }}
        >
          <div
            onMouseDown={(event) => handleImageMouseDown(event, item)}
            className={`absolute overflow-hidden border bg-white/95 transition-[border-color,box-shadow,transform] duration-200 ease-out ${
              isSelected
                ? 'border-sky-300 shadow-[0_24px_50px_-30px_rgba(14,165,233,0.42)] ring-2 ring-sky-200/70'
                : 'border-slate-200/80 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] hover:border-slate-300'
            } cursor-grab active:cursor-grabbing`}
            style={{
              height: `${item.height}px`,
              left: `${item.x}px`,
              top: '0px',
              width: `${item.width}px`,
              zIndex: item.zIndex,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.altText}
              draggable={false}
              className="pointer-events-none h-full w-full select-none object-contain"
            />
            {isSelected ? (
              <button
                type="button"
                aria-label="Resize image"
                onMouseDown={(event) => startImageInteraction(event, item, 'resize')}
                className="absolute bottom-2 right-2 h-4 w-4 cursor-se-resize rounded-[5px] border border-sky-300 bg-white/95 shadow-[0_10px_24px_-18px_rgba(14,165,233,0.65)]"
              />
            ) : null}
          </div>
        </PanelItemShell>
      );
    }

    return null;
  };

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
                  onFocus={() => setSelectedImageId(null)}
                  onChange={(event) => onTitleChange(event.target.value)}
                  placeholder="Section title"
                  className="h-12 w-full border-none bg-transparent text-3xl font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={subtitle}
                  onFocus={() => setSelectedImageId(null)}
                  onChange={(event) => onSubtitleChange(event.target.value)}
                  placeholder="Section subtitle"
                  className="h-8 w-full border-none bg-transparent text-lg text-slate-500 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="relative flex flex-1 min-h-0">
              {sectionPanelItems.map((itemsInSection, sectionIndex) => (
                <div
                  key={sectionIndex}
                  ref={(element) => {
                    sectionRefs.current[sectionIndex] = element;
                  }}
                  onMouseDown={(event) => {
                    onSectionSelect(sectionIndex);

                    if (event.target === event.currentTarget) {
                      setSelectedImageId(null);
                    }
                  }}
                  onDragOver={(event) => handleSectionDragOver(event, sectionIndex)}
                  onDrop={(event) => handleSectionDrop(event, sectionIndex)}
                  className={`relative flex h-full min-h-0 flex-1 flex-col overflow-hidden transition-[background-color,box-shadow] duration-200 ease-out ${
                    sectionIndex > 0 ? 'border-l border-slate-200/80' : ''
                  } ${
                    selectedSection === sectionIndex
                      ? 'bg-sky-50/45 shadow-[inset_0_0_0_2px_rgba(125,211,252,0.7)]'
                      : 'bg-white'
                   }`}
                >
                  {itemsInSection.map((item, index) => renderPanelItem(item, index))}
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
      {activeActionContentItem !== null && menuPosition !== null
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
                  onDragStart={() => handleDragStart(activeActionContentItem.id)}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 active:cursor-grabbing"
                >
                  Move
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteContentItem(activeActionContentItem.id);
                    setHoveredContentItemId(null);
                    if (activeActionContentItem.type === 'image') {
                      setSelectedImageId(null);
                    }
                    setMenuPosition(null);
                  }}
                  className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
                  aria-label={
                    activeActionContentItem.type === 'image'
                      ? 'Delete image'
                      : 'Delete textbox'
                  }
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
