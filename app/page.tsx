'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Panel from '../components/Panel';
import LearningMetadataEditor from '../components/LearningMetadataEditor';
import {
  CODE_SNIPPET_BLOCK_HEIGHT,
  createCodeSnippetPanelItem,
  createLatexPanelItem,
  createPanelContentItem,
  createTextboxPanelItem,
  type CodeSnippetLanguage,
  type CodeSnippetPanelItem,
  type ImageInsertRequest,
  type ImagePanelItem,
  type LatexPanelItem,
  type PanelContentItem,
  type TextboxPanelItem,
} from '../components/panelItemTypes';
import {
  INITIAL_TEXT_TOOLBAR_STATE,
  type TextToolbarAction,
  type TextToolbarState,
} from '../components/textEditorTypes';

type LayoutOption = 'blank' | 'split' | 'thirds';
type NodeType = 'object' | 'subobject' | 'section';

type LearningSectionItem = {
  codeSnippets: CodeSnippetPanelItem[];
  contentItems: PanelContentItem[];
  images: ImagePanelItem[];
  id: number;
  latexItems: LatexPanelItem[];
  layout: LayoutOption;
  parentId: number;
  parentType: 'object' | 'subobject';
  selectedSection: number;
  subtitle: string;
  textboxes: TextboxPanelItem[];
  title: string;
  type: 'section';
};

type LearningSubobjectItem = {
  id: number;
  lectureDescription: string;
  lectureLength: string;
  lectureTitle: string;
  parentObjectId: number;
  sections: LearningSectionItem[];
  type: 'subobject';
};

type LearningObjectChild = LearningSectionItem | LearningSubobjectItem;

type LearningObjectItem = {
  children: LearningObjectChild[];
  id: number;
  lectureDescription: string;
  lectureLength: string;
  lectureTitle: string;
  type: 'object';
};

type EditorSelection =
  | {
      id: number;
      type: NodeType;
    }
  | null;

type SelectedContentItem =
  | {
      id: number;
      type: PanelContentItem['type'];
    }
  | null;

type EditorHistorySnapshot = {
  nextId: number;
  nextObjectNumber: number;
  nextSectionNumber: number;
  nextSubobjectNumber: number;
  objects: LearningObjectItem[];
  selectedNode: EditorSelection;
};

type SelectionContext =
  | {
      object: LearningObjectItem;
      type: 'object';
    }
  | {
      object: LearningObjectItem;
      subobject: LearningSubobjectItem;
      type: 'subobject';
    }
  | {
      object: LearningObjectItem;
      section: LearningSectionItem;
      subobject: LearningSubobjectItem | null;
      type: 'section';
    };

const PANEL_HEIGHT = 768;
const PANEL_HEADER_HEIGHT = 144;
const HISTORY_COALESCE_MS = 700;
const HISTORY_LIMIT = 100;
const MIN_LATEX_BLOCK_HEIGHT = 96;
const MIN_TEXTBOX_HEIGHT = 50;
const INITIAL_AVAILABLE_PANEL_HEIGHT = PANEL_HEIGHT - PANEL_HEADER_HEIGHT;
const OVERFLOW_MESSAGE = "It's not possible to add more content to the current section.";

const getSectionCount = (layout: LayoutOption) => {
  if (layout === 'split') {
    return 2;
  }

  if (layout === 'thirds') {
    return 3;
  }

  return 1;
};

const createLearningObject = (id: number, lectureTitle: string): LearningObjectItem => ({
  children: [],
  id,
  lectureDescription: '',
  lectureLength: '',
  lectureTitle,
  type: 'object',
});

const createLearningSubobject = (
  id: number,
  lectureTitle: string,
  parentObjectId: number
): LearningSubobjectItem => ({
  id,
  lectureDescription: '',
  lectureLength: '',
  lectureTitle,
  parentObjectId,
  sections: [],
  type: 'subobject',
});

const createLearningSection = (
  id: number,
  title: string,
  parentId: number,
  parentType: LearningSectionItem['parentType']
): LearningSectionItem => ({
  codeSnippets: [],
  contentItems: [],
  images: [],
  id,
  latexItems: [],
  layout: 'blank',
  parentId,
  parentType,
  selectedSection: 0,
  subtitle: '',
  textboxes: [],
  title,
  type: 'section',
});

const INITIAL_OBJECTS: LearningObjectItem[] = [
  {
    children: [createLearningSection(2, 'Section 1', 1, 'object')],
    id: 1,
    lectureDescription: '',
    lectureLength: '',
    lectureTitle: 'Object 1',
    type: 'object',
  },
];

const INITIAL_SELECTION: EditorSelection = {
  id: 2,
  type: 'section',
};

const areHeightsEqual = (
  current: Record<number, number>,
  next: Record<number, number>
) => {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);

  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  return currentKeys.every((key) => current[Number(key)] === next[Number(key)]);
};

const insertAfterId = <T extends { id: number }>(
  items: T[],
  targetId: number | null,
  nextItem: T
) => {
  if (targetId === null) {
    return [...items, nextItem];
  }

  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (targetIndex === -1) {
    return [...items, nextItem];
  }

  return [
    ...items.slice(0, targetIndex + 1),
    nextItem,
    ...items.slice(targetIndex + 1),
  ];
};

const getSectionContentInsertIndex = (
  items: PanelContentItem[],
  sectionIndex: number,
  targetId: number | null
) => {
  if (targetId !== null) {
    const targetIndex = items.findIndex(
      (item) => item.id === targetId && item.section === sectionIndex
    );

    if (targetIndex !== -1) {
      return targetIndex + 1;
    }
  }

  const lastIndexInSection = items.reduce(
    (lastIndex, item, index) => (item.section === sectionIndex ? index : lastIndex),
    -1
  );

  return lastIndexInSection === -1 ? items.length : lastIndexInSection + 1;
};

const findSelectionContext = (
  objects: LearningObjectItem[],
  selection: EditorSelection
): SelectionContext | null => {
  if (!selection) {
    return null;
  }

  for (const object of objects) {
    if (selection.type === 'object' && object.id === selection.id) {
      return {
        object,
        type: 'object',
      };
    }

    for (const child of object.children) {
      if (child.type === 'section') {
        if (selection.type === 'section' && child.id === selection.id) {
          return {
            object,
            section: child,
            subobject: null,
            type: 'section',
          };
        }

        continue;
      }

      if (selection.type === 'subobject' && child.id === selection.id) {
        return {
          object,
          subobject: child,
          type: 'subobject',
        };
      }

      for (const section of child.sections) {
        if (selection.type === 'section' && section.id === selection.id) {
          return {
            object,
            section,
            subobject: child,
            type: 'section',
          };
        }
      }
    }
  }

  return null;
};

const serializeHistorySnapshot = (snapshot: EditorHistorySnapshot) =>
  JSON.stringify(snapshot);

const getNodeSelectionFromChild = (child: LearningObjectChild): EditorSelection =>
  child.type === 'section'
    ? {
        id: child.id,
        type: 'section',
      }
    : {
        id: child.id,
        type: 'subobject',
      };

const getClosestChildSelection = (
  children: LearningObjectChild[],
  preferredIndex: number
): EditorSelection => {
  if (children.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(preferredIndex, 0), children.length - 1);
  return getNodeSelectionFromChild(children[safeIndex]);
};

const getClosestSectionSelection = (
  sections: LearningSectionItem[],
  preferredIndex: number
): EditorSelection => {
  if (sections.length === 0) {
    return null;
  }

  const safeIndex = Math.min(Math.max(preferredIndex, 0), sections.length - 1);
  return {
    id: sections[safeIndex].id,
    type: 'section',
  };
};

const getFirstAvailableSelection = (
  objects: LearningObjectItem[]
): EditorSelection => {
  if (objects.length === 0) {
    return null;
  }

  return {
    id: objects[0].id,
    type: 'object',
  };
};

const collectSectionIdsFromChildren = (children: LearningObjectChild[]) =>
  children.flatMap((child) =>
    child.type === 'section'
      ? [child.id]
      : child.sections.map((section) => section.id)
  );

export default function Home() {
  const [objects, setObjects] = useState<LearningObjectItem[]>(INITIAL_OBJECTS);
  const [selectedNode, setSelectedNode] = useState<EditorSelection>(INITIAL_SELECTION);
  const [pendingSelectedContentItem, setPendingSelectedContentItem] =
    useState<SelectedContentItem>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedContentItem, setSelectedContentItem] =
    useState<SelectedContentItem>(null);
  const [textToolbarState, setTextToolbarState] = useState<TextToolbarState>(
    INITIAL_TEXT_TOOLBAR_STATE
  );
  const objectsRef = useRef(objects);
  const selectedNodeRef = useRef(selectedNode);
  const imageInsertHandlerRef = useRef<
    ((request: ImageInsertRequest) => Promise<boolean>) | null
  >(null);
  const textToolbarActionHandlerRef = useRef<
    ((action: TextToolbarAction) => void) | null
  >(null);
  const nextIdRef = useRef(3);
  const nextObjectNumberRef = useRef(2);
  const nextSubobjectNumberRef = useRef(1);
  const nextSectionNumberRef = useRef(2);
  const availablePanelHeightRef = useRef(INITIAL_AVAILABLE_PANEL_HEIGHT);
  const panelLatexHeightsRef = useRef<Record<number, Record<number, number>>>({
    2: {},
  });
  const panelTextboxHeightsRef = useRef<Record<number, Record<number, number>>>({
    2: {},
  });
  const sectionUsageHeightsRef = useRef<Record<number, number>>({
    0: 0,
  });
  const historyPastRef = useRef<EditorHistorySnapshot[]>([]);
  const historyFutureRef = useRef<EditorHistorySnapshot[]>([]);
  const activeHistoryGroupRef = useRef<{
    key: string;
    timeoutId: number;
  } | null>(null);
  const isApplyingHistoryRef = useRef(false);

  const selectedContext = useMemo(
    () => findSelectionContext(objects, selectedNode),
    [objects, selectedNode]
  );

  const selectedSection =
    selectedContext?.type === 'section' ? selectedContext.section : null;

  const selectedMetadataNode =
    selectedContext?.type === 'section' ? null : selectedContext ?? null;

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  useEffect(() => {
    if (!notification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [notification]);

  useEffect(() => {
    if (!selectedSection) {
      setSelectedContentItem(null);
      setPendingSelectedContentItem(null);
    }
  }, [selectedSection]);

  const getNextId = useCallback(() => {
    const nextId = nextIdRef.current;
    nextIdRef.current += 1;
    return nextId;
  }, []);

  const getNextObjectTitle = useCallback(() => {
    const nextNumber = nextObjectNumberRef.current;
    nextObjectNumberRef.current += 1;
    return `Object ${nextNumber}`;
  }, []);

  const getNextSubobjectTitle = useCallback(() => {
    const nextNumber = nextSubobjectNumberRef.current;
    nextSubobjectNumberRef.current += 1;
    return `Subobject ${nextNumber}`;
  }, []);

  const getNextSectionTitle = useCallback(() => {
    const nextNumber = nextSectionNumberRef.current;
    nextSectionNumberRef.current += 1;
    return `Section ${nextNumber}`;
  }, []);

  const setSelectedNodeState = useCallback((selection: EditorSelection) => {
    selectedNodeRef.current = selection;
    setSelectedNode(selection);
  }, []);

  const createHistorySnapshot = useCallback(
    (): EditorHistorySnapshot => ({
      nextId: nextIdRef.current,
      nextObjectNumber: nextObjectNumberRef.current,
      nextSectionNumber: nextSectionNumberRef.current,
      nextSubobjectNumber: nextSubobjectNumberRef.current,
      objects: objectsRef.current,
      selectedNode: selectedNodeRef.current,
    }),
    []
  );

  const clearActiveHistoryGroup = useCallback(() => {
    const activeGroup = activeHistoryGroupRef.current;

    if (!activeGroup) {
      return;
    }

    window.clearTimeout(activeGroup.timeoutId);
    activeHistoryGroupRef.current = null;
  }, []);

  const pushHistorySnapshot = useCallback(
    (destination: 'future' | 'past', snapshot: EditorHistorySnapshot) => {
      const historyStack =
        destination === 'past' ? historyPastRef.current : historyFutureRef.current;
      const previousSnapshot = historyStack[historyStack.length - 1];

      if (
        previousSnapshot &&
        serializeHistorySnapshot(previousSnapshot) ===
          serializeHistorySnapshot(snapshot)
      ) {
        return;
      }

      const nextHistoryStack = [...historyStack, snapshot];

      if (destination === 'past') {
        historyPastRef.current = nextHistoryStack.slice(-HISTORY_LIMIT);
        return;
      }

      historyFutureRef.current = nextHistoryStack.slice(-HISTORY_LIMIT);
    },
    []
  );

  const recordHistorySnapshot = useCallback(
    (groupKey?: string) => {
      if (isApplyingHistoryRef.current) {
        return;
      }

      const snapshot = createHistorySnapshot();

      if (!groupKey) {
        clearActiveHistoryGroup();
        pushHistorySnapshot('past', snapshot);
        historyFutureRef.current = [];
        return;
      }

      const activeGroup = activeHistoryGroupRef.current;

      if (!activeGroup || activeGroup.key !== groupKey) {
        pushHistorySnapshot('past', snapshot);
      } else {
        window.clearTimeout(activeGroup.timeoutId);
      }

      historyFutureRef.current = [];
      activeHistoryGroupRef.current = {
        key: groupKey,
        timeoutId: window.setTimeout(() => {
          if (activeHistoryGroupRef.current?.key === groupKey) {
            activeHistoryGroupRef.current = null;
          }
        }, HISTORY_COALESCE_MS),
      };
    },
    [clearActiveHistoryGroup, createHistorySnapshot, pushHistorySnapshot]
  );

  const applyHistorySnapshot = useCallback(
    (snapshot: EditorHistorySnapshot) => {
      clearActiveHistoryGroup();
      isApplyingHistoryRef.current = true;
      nextIdRef.current = snapshot.nextId;
      nextObjectNumberRef.current = snapshot.nextObjectNumber;
      nextSectionNumberRef.current = snapshot.nextSectionNumber;
      nextSubobjectNumberRef.current = snapshot.nextSubobjectNumber;
      objectsRef.current = snapshot.objects;
      selectedNodeRef.current = snapshot.selectedNode;
      setObjects(snapshot.objects);
      setSelectedNode(snapshot.selectedNode);
      setSelectedContentItem(null);
      setPendingSelectedContentItem(null);
      setTextToolbarState(INITIAL_TEXT_TOOLBAR_STATE);
      isApplyingHistoryRef.current = false;
    },
    [clearActiveHistoryGroup]
  );

  const handleUndo = useCallback(() => {
    clearActiveHistoryGroup();
    const previousSnapshot = historyPastRef.current[historyPastRef.current.length - 1];

    if (!previousSnapshot) {
      return;
    }

    const currentSnapshot = createHistorySnapshot();

    historyPastRef.current = historyPastRef.current.slice(0, -1);
    pushHistorySnapshot('future', currentSnapshot);
    applyHistorySnapshot(previousSnapshot);
  }, [applyHistorySnapshot, clearActiveHistoryGroup, createHistorySnapshot, pushHistorySnapshot]);

  const handleRedo = useCallback(() => {
    clearActiveHistoryGroup();
    const nextSnapshot = historyFutureRef.current[historyFutureRef.current.length - 1];

    if (!nextSnapshot) {
      return;
    }

    const currentSnapshot = createHistorySnapshot();

    historyFutureRef.current = historyFutureRef.current.slice(0, -1);
    pushHistorySnapshot('past', currentSnapshot);
    applyHistorySnapshot(nextSnapshot);
  }, [applyHistorySnapshot, clearActiveHistoryGroup, createHistorySnapshot, pushHistorySnapshot]);

  const cleanupSectionCaches = useCallback((sectionIds: number[]) => {
    if (sectionIds.length === 0) {
      return;
    }

    const nextTextboxHeights = { ...panelTextboxHeightsRef.current };
    const nextLatexHeights = { ...panelLatexHeightsRef.current };

    sectionIds.forEach((sectionId) => {
      delete nextTextboxHeights[sectionId];
      delete nextLatexHeights[sectionId];
    });

    panelTextboxHeightsRef.current = nextTextboxHeights;
    panelLatexHeightsRef.current = nextLatexHeights;
  }, []);

  const resolveSelectionFallback = useCallback(
    (candidates: EditorSelection[], nextObjects: LearningObjectItem[]) => {
      for (const candidate of candidates) {
        if (candidate && findSelectionContext(nextObjects, candidate)) {
          return candidate;
        }
      }

      return getFirstAvailableSelection(nextObjects);
    },
    []
  );

  const isActiveTextEntryTarget = useCallback((target: EventTarget | null) => {
    const candidates = [
      target instanceof HTMLElement ? target : null,
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    ].filter((candidate): candidate is HTMLElement => candidate !== null);

    return candidates.some((candidate) => {
      if (candidate.isContentEditable) {
        return true;
      }

      return Boolean(
        candidate.closest(
          'input, textarea, select, math-field, .cm-editor, [contenteditable=""], [contenteditable="true"]'
        )
      );
    });
  }, []);

  const getContentItemFlowHeight = useCallback(
    (item: PanelContentItem) => {
      if (!selectedSection) {
        return 0;
      }

      if (item.type === 'textbox') {
        return (
          panelTextboxHeightsRef.current[selectedSection.id]?.[item.id] ??
          MIN_TEXTBOX_HEIGHT
        );
      }

      if (item.type === 'latex') {
        return (
          panelLatexHeightsRef.current[selectedSection.id]?.[item.id] ??
          MIN_LATEX_BLOCK_HEIGHT
        );
      }

      if (item.type === 'codeSnippet') {
        return CODE_SNIPPET_BLOCK_HEIGHT;
      }

      return (
        selectedSection.images.find((image) => image.id === item.id)?.height ?? 0
      );
    },
    [selectedSection]
  );

  const updateObjects = useCallback(
    (updater: (currentObjects: LearningObjectItem[]) => LearningObjectItem[]) => {
      const nextObjects = updater(objectsRef.current);
      objectsRef.current = nextObjects;
      setObjects(nextObjects);
    },
    []
  );

  const updateObject = useCallback(
    (
      objectId: number,
      updater: (object: LearningObjectItem) => LearningObjectItem
    ) => {
      updateObjects((currentObjects) =>
        currentObjects.map((object) =>
          object.id === objectId ? updater(object) : object
        )
      );
    },
    [updateObjects]
  );

  const updateSubobject = useCallback(
    (
      subobjectId: number,
      updater: (subobject: LearningSubobjectItem) => LearningSubobjectItem
    ) => {
      updateObjects((currentObjects) =>
        currentObjects.map((object) => ({
          ...object,
          children: object.children.map((child) =>
            child.type === 'subobject' && child.id === subobjectId
              ? updater(child)
              : child
          ),
        }))
      );
    },
    [updateObjects]
  );

  const updateSection = useCallback(
    (
      sectionId: number,
      updater: (section: LearningSectionItem) => LearningSectionItem
    ) => {
      updateObjects((currentObjects) =>
        currentObjects.map((object) => ({
          ...object,
          children: object.children.map((child) => {
            if (child.type === 'section') {
              return child.id === sectionId ? updater(child) : child;
            }

            return {
              ...child,
              sections: child.sections.map((section) =>
                section.id === sectionId ? updater(section) : section
              ),
            };
          }),
        }))
      );
    },
    [updateObjects]
  );

  const handleAddObject = useCallback(() => {
    recordHistorySnapshot();
    const nextObjectId = getNextId();
    const nextObject = createLearningObject(nextObjectId, getNextObjectTitle());

    updateObjects((currentObjects) => [...currentObjects, nextObject]);
    setSelectedNodeState({
      id: nextObjectId,
      type: 'object',
    });
  }, [getNextId, getNextObjectTitle, recordHistorySnapshot, setSelectedNodeState, updateObjects]);

  const handleAddSubobject = useCallback(() => {
    if (!selectedContext) {
      setNotification(
        'Select a Learning Object, Learning Subobject, or Learning Section before adding a Subobject.'
      );
      return;
    }

    recordHistorySnapshot();
    const nextSubobjectId = getNextId();
    const nextSubobject = createLearningSubobject(
      nextSubobjectId,
      getNextSubobjectTitle(),
      selectedContext.object.id
    );

    updateObjects((currentObjects) =>
      currentObjects.map((object) => {
        if (object.id !== selectedContext.object.id) {
          return object;
        }

        if (selectedContext.type === 'object') {
          return {
            ...object,
            children: [...object.children, nextSubobject],
          };
        }

        if (selectedContext.type === 'subobject') {
          return {
            ...object,
            children: insertAfterId(
              object.children,
              selectedContext.subobject.id,
              nextSubobject
            ),
          };
        }

        const siblingAnchorId = selectedContext.subobject
          ? selectedContext.subobject.id
          : selectedContext.section.id;

        return {
          ...object,
          children: insertAfterId(object.children, siblingAnchorId, nextSubobject),
        };
      })
    );

    setSelectedNodeState({
      id: nextSubobjectId,
      type: 'subobject',
    });
  }, [
    getNextId,
    getNextSubobjectTitle,
    recordHistorySnapshot,
    selectedContext,
    setSelectedNodeState,
    updateObjects,
  ]);

  const handleAddSection = useCallback(() => {
    if (!selectedContext) {
      setNotification(
        'Select a Learning Object, Learning Subobject, or Learning Section before adding a Section.'
      );
      return;
    }

    const parentType =
      selectedContext.type === 'subobject' ||
      (selectedContext.type === 'section' && selectedContext.subobject)
        ? 'subobject'
        : 'object';
    let parentId = selectedContext.object.id;

    if (selectedContext.type === 'subobject') {
      parentId = selectedContext.subobject.id;
    } else if (selectedContext.type === 'section' && selectedContext.subobject) {
      parentId = selectedContext.subobject.id;
    }

    recordHistorySnapshot();
    const nextSectionId = getNextId();
    const nextSection = createLearningSection(
      nextSectionId,
      getNextSectionTitle(),
      parentId,
      parentType
    );

    panelTextboxHeightsRef.current = {
      ...panelTextboxHeightsRef.current,
      [nextSectionId]: {},
    };
    panelLatexHeightsRef.current = {
      ...panelLatexHeightsRef.current,
      [nextSectionId]: {},
    };

    updateObjects((currentObjects) =>
      currentObjects.map((object) => {
        if (object.id !== selectedContext.object.id) {
          return object;
        }

        if (selectedContext.type === 'object') {
          return {
            ...object,
            children: [...object.children, nextSection],
          };
        }

        if (selectedContext.type === 'subobject') {
          return {
            ...object,
            children: object.children.map((child) =>
              child.type === 'subobject' && child.id === selectedContext.subobject.id
                ? {
                    ...child,
                    sections: [...child.sections, nextSection],
                  }
                : child
            ),
          };
        }

        if (selectedContext.subobject) {
          return {
            ...object,
            children: object.children.map((child) =>
              child.type === 'subobject' && child.id === selectedContext.subobject?.id
                ? {
                    ...child,
                    sections: insertAfterId(
                      child.sections,
                      selectedContext.section.id,
                      nextSection
                    ),
                  }
                : child
            ),
          };
        }

        return {
          ...object,
          children: insertAfterId(
            object.children,
            selectedContext.section.id,
            nextSection
          ),
        };
      })
    );

    setSelectedNodeState({
      id: nextSectionId,
      type: 'section',
    });
  }, [
    getNextId,
    getNextSectionTitle,
    recordHistorySnapshot,
    selectedContext,
    setSelectedNodeState,
    updateObjects,
  ]);

  const handleAddTextbox = useCallback(() => {
    if (!selectedSection) {
      setNotification('Select a Learning Section before adding a textbox.');
      return;
    }

    const usedHeight =
      sectionUsageHeightsRef.current[selectedSection.selectedSection] ?? 0;

    if (usedHeight + MIN_TEXTBOX_HEIGHT > availablePanelHeightRef.current) {
      setNotification(OVERFLOW_MESSAGE);
      return;
    }

    recordHistorySnapshot();
    const nextTextboxId = getNextId();

    updateSection(selectedSection.id, (section) => {
      const nextTextbox = createTextboxPanelItem(
        nextTextboxId,
        section.selectedSection
      );
      const nextContentItems = [...section.contentItems];

      nextContentItems.splice(
        getSectionContentInsertIndex(
          section.contentItems,
          section.selectedSection,
          null
        ),
        0,
        createPanelContentItem(nextTextboxId, 'textbox', section.selectedSection)
      );

      return {
        ...section,
        contentItems: nextContentItems,
        textboxes: [...section.textboxes, nextTextbox],
      };
    });
    setPendingSelectedContentItem({
      id: nextTextboxId,
      type: 'textbox',
    });
  }, [getNextId, recordHistorySnapshot, selectedSection, updateSection]);

  const handleAddLatex = useCallback(() => {
    if (!selectedSection) {
      setNotification('Select a Learning Section before adding a LaTeX block.');
      return;
    }

    const usedHeight =
      sectionUsageHeightsRef.current[selectedSection.selectedSection] ?? 0;

    if (usedHeight + MIN_LATEX_BLOCK_HEIGHT > availablePanelHeightRef.current) {
      setNotification(OVERFLOW_MESSAGE);
      return;
    }

    recordHistorySnapshot();
    const nextLatexId = getNextId();

    updateSection(selectedSection.id, (section) => {
      const nextLatex = createLatexPanelItem(
        nextLatexId,
        section.selectedSection
      );
      const nextContentItems = [...section.contentItems];

      nextContentItems.splice(
        getSectionContentInsertIndex(
          section.contentItems,
          section.selectedSection,
          null
        ),
        0,
        createPanelContentItem(nextLatexId, 'latex', section.selectedSection)
      );

      return {
        ...section,
        contentItems: nextContentItems,
        latexItems: [...section.latexItems, nextLatex],
      };
    });
    setPendingSelectedContentItem({
      id: nextLatexId,
      type: 'latex',
    });
  }, [getNextId, recordHistorySnapshot, selectedSection, updateSection]);

  const handleAddCodeSnippet = useCallback(() => {
    if (!selectedSection) {
      setNotification('Select a Learning Section before adding a code snippet.');
      return;
    }

    const usedHeight =
      sectionUsageHeightsRef.current[selectedSection.selectedSection] ?? 0;

    if (usedHeight + CODE_SNIPPET_BLOCK_HEIGHT > availablePanelHeightRef.current) {
      setNotification(OVERFLOW_MESSAGE);
      return;
    }

    recordHistorySnapshot();
    const nextCodeSnippetId = getNextId();

    updateSection(selectedSection.id, (section) => {
      const nextCodeSnippet = createCodeSnippetPanelItem(
        nextCodeSnippetId,
        section.selectedSection
      );
      const nextContentItems = [...section.contentItems];

      nextContentItems.splice(
        getSectionContentInsertIndex(
          section.contentItems,
          section.selectedSection,
          null
        ),
        0,
        createPanelContentItem(
          nextCodeSnippetId,
          'codeSnippet',
          section.selectedSection
        )
      );

      return {
        ...section,
        codeSnippets: [...section.codeSnippets, nextCodeSnippet],
        contentItems: nextContentItems,
      };
    });
    setPendingSelectedContentItem({
      id: nextCodeSnippetId,
      type: 'codeSnippet',
    });
  }, [getNextId, recordHistorySnapshot, selectedSection, updateSection]);

  const handleAddImage = useCallback(
    async (file: File) => {
      if (!selectedSection) {
        setNotification('Select a Learning Section before adding an image.');
        return;
      }

      const insertImage = imageInsertHandlerRef.current;

      if (!insertImage) {
        setNotification('Select a Learning Section before adding an image.');
        return;
      }

      const imageHistorySnapshot = createHistorySnapshot();
      const wasInserted = await insertImage({
        file,
        id: getNextId(),
      });

      if (!wasInserted) {
        return;
      }

      clearActiveHistoryGroup();
      pushHistorySnapshot('past', imageHistorySnapshot);
      historyFutureRef.current = [];
    },
    [clearActiveHistoryGroup, createHistorySnapshot, getNextId, pushHistorySnapshot, selectedSection]
  );

  const handleTextboxChange = useCallback(
    (id: number, text: string) => {
      if (!selectedSection) {
        return;
      }

      recordHistorySnapshot(`textbox-${id}`);
      updateSection(selectedSection.id, (section) => ({
        ...section,
        textboxes: section.textboxes.map((textbox) =>
          textbox.id === id ? { ...textbox, text } : textbox
        ),
      }));
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleLatexChange = useCallback(
    (id: number, source: string) => {
      if (!selectedSection) {
        return;
      }

      recordHistorySnapshot(`latex-${id}`);
      updateSection(selectedSection.id, (section) => ({
        ...section,
        latexItems: section.latexItems.map((latexItem) =>
          latexItem.id === id ? { ...latexItem, source } : latexItem
        ),
      }));
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleCodeSnippetChange = useCallback(
    (id: number, code: string) => {
      if (!selectedSection) {
        return;
      }

      recordHistorySnapshot(`code-${id}`);
      updateSection(selectedSection.id, (section) => ({
        ...section,
        codeSnippets: section.codeSnippets.map((codeSnippet) =>
          codeSnippet.id === id ? { ...codeSnippet, code } : codeSnippet
        ),
      }));
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleCodeSnippetLanguageChange = useCallback(
    (id: number, language: CodeSnippetLanguage) => {
      if (!selectedSection) {
        return;
      }

      recordHistorySnapshot();
      updateSection(selectedSection.id, (section) => ({
        ...section,
        codeSnippets: section.codeSnippets.map((codeSnippet) =>
          codeSnippet.id === id ? { ...codeSnippet, language } : codeSnippet
        ),
      }));
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleAddImageItem = useCallback(
    (nextImage: ImagePanelItem, insertAfterId: number | null) => {
      if (!selectedSection) {
        return;
      }

      updateSection(selectedSection.id, (section) => {
        const nextContentItems = [...section.contentItems];

        nextContentItems.splice(
          getSectionContentInsertIndex(
            section.contentItems,
            nextImage.section,
            insertAfterId
          ),
          0,
          createPanelContentItem(nextImage.id, 'image', nextImage.section)
        );

        return {
          ...section,
          contentItems: nextContentItems,
          images: [...section.images, nextImage],
        };
      });
    },
    [selectedSection, updateSection]
  );

  const handleImageChange = useCallback(
    (
      id: number,
      updates: Partial<Pick<ImagePanelItem, 'height' | 'width' | 'x' | 'y'>>
    ) => {
      if (!selectedSection) {
        return;
      }

      recordHistorySnapshot(`image-${id}`);
      updateSection(selectedSection.id, (section) => ({
        ...section,
        images: section.images.map((image) =>
          image.id === id ? { ...image, ...updates } : image
        ),
      }));
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleSectionTitleChange = useCallback(
    (title: string) => {
      if (!selectedSection) {
        return;
      }

      recordHistorySnapshot(`section-title-${selectedSection.id}`);
      updateSection(selectedSection.id, (section) => ({
        ...section,
        title,
      }));
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleSectionSubtitleChange = useCallback(
    (subtitle: string) => {
      if (!selectedSection) {
        return;
      }

      recordHistorySnapshot(`section-subtitle-${selectedSection.id}`);
      updateSection(selectedSection.id, (section) => ({
        ...section,
        subtitle,
      }));
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleDeleteContentItem = useCallback(
    (id: number) => {
      if (!selectedSection) {
        return;
      }

      const itemToDelete = selectedSection.contentItems.find((item) => item.id === id);

      if (!itemToDelete) {
        return;
      }

      recordHistorySnapshot();
      updateSection(selectedSection.id, (section) => ({
        ...section,
        codeSnippets:
          itemToDelete.type === 'codeSnippet'
            ? section.codeSnippets.filter((codeSnippet) => codeSnippet.id !== id)
            : section.codeSnippets,
        contentItems: section.contentItems.filter((item) => item.id !== id),
        images:
          itemToDelete.type === 'image'
            ? section.images.filter((image) => image.id !== id)
            : section.images,
        latexItems:
          itemToDelete.type === 'latex'
            ? section.latexItems.filter((latexItem) => latexItem.id !== id)
            : section.latexItems,
        textboxes:
          itemToDelete.type === 'textbox'
            ? section.textboxes.filter((textbox) => textbox.id !== id)
            : section.textboxes,
      }));

      if (itemToDelete.type === 'textbox') {
        const currentPanelHeights =
          panelTextboxHeightsRef.current[selectedSection.id] ?? {};
        const nextPanelHeights = { ...currentPanelHeights };

        delete nextPanelHeights[id];

        panelTextboxHeightsRef.current = {
          ...panelTextboxHeightsRef.current,
          [selectedSection.id]: nextPanelHeights,
        };
      }

      if (itemToDelete.type === 'latex') {
        const currentPanelHeights =
          panelLatexHeightsRef.current[selectedSection.id] ?? {};
        const nextPanelHeights = { ...currentPanelHeights };

        delete nextPanelHeights[id];

        panelLatexHeightsRef.current = {
          ...panelLatexHeightsRef.current,
          [selectedSection.id]: nextPanelHeights,
        };
      }

      setPendingSelectedContentItem(null);
      setSelectedContentItem(null);
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleMoveContentItem = useCallback(
    (
      draggedId: number,
      targetSection: number,
      targetId: number | null,
      position: 'before' | 'after'
    ) => {
      if (!selectedSection) {
        return;
      }

      const draggedContentItem = selectedSection.contentItems.find(
        (item) => item.id === draggedId
      );

      if (!draggedContentItem) {
        return;
      }

      if (draggedContentItem.type === 'textbox') {
        const draggedTextbox = selectedSection.textboxes.find(
          (textbox) => textbox.id === draggedId
        );

        if (!draggedTextbox) {
          return;
        }

        const currentHeights =
          panelTextboxHeightsRef.current[selectedSection.id] ?? {};
        const draggedHeight = currentHeights[draggedId] ?? MIN_TEXTBOX_HEIGHT;
        const targetHeight = sectionUsageHeightsRef.current[targetSection] ?? 0;

        if (
          draggedTextbox.section !== targetSection &&
          targetHeight + draggedHeight > availablePanelHeightRef.current
        ) {
          setNotification(OVERFLOW_MESSAGE);
          return;
        }
      }

      if (draggedContentItem.type === 'latex') {
        const currentHeights =
          panelLatexHeightsRef.current[selectedSection.id] ?? {};
        const draggedHeight = currentHeights[draggedId] ?? MIN_LATEX_BLOCK_HEIGHT;
        const targetHeight = sectionUsageHeightsRef.current[targetSection] ?? 0;
        const sourceSection = selectedSection.latexItems.find(
          (latexItem) => latexItem.id === draggedId
        )?.section;

        if (
          sourceSection !== undefined &&
          sourceSection !== targetSection &&
          targetHeight + draggedHeight > availablePanelHeightRef.current
        ) {
          setNotification(OVERFLOW_MESSAGE);
          return;
        }
      }

      if (draggedContentItem.type === 'codeSnippet') {
        const sourceSection = selectedSection.codeSnippets.find(
          (codeSnippet) => codeSnippet.id === draggedId
        )?.section;
        const targetHeight = sectionUsageHeightsRef.current[targetSection] ?? 0;

        if (
          sourceSection !== undefined &&
          sourceSection !== targetSection &&
          targetHeight + CODE_SNIPPET_BLOCK_HEIGHT >
            availablePanelHeightRef.current
        ) {
          setNotification(OVERFLOW_MESSAGE);
          return;
        }
      }

      recordHistorySnapshot();
      updateSection(selectedSection.id, (section) => {
        const draggedIndex = section.contentItems.findIndex(
          (item) => item.id === draggedId
        );

        if (draggedIndex === -1) {
          return section;
        }

        const nextContentItems = section.contentItems.filter(
          (item) => item.id !== draggedId
        );
        const movedContentItem = {
          ...section.contentItems[draggedIndex],
          section: targetSection,
        };
        const targetIndex =
          targetId === null
            ? -1
            : nextContentItems.findIndex((item) => item.id === targetId);
        const insertIndex =
          targetIndex === -1
            ? getSectionContentInsertIndex(nextContentItems, targetSection, null)
            : targetIndex + (position === 'after' ? 1 : 0);

        nextContentItems.splice(insertIndex, 0, movedContentItem);

        return {
          ...section,
          codeSnippets: section.codeSnippets.map((codeSnippet) =>
            codeSnippet.id === draggedId
              ? { ...codeSnippet, section: targetSection }
              : codeSnippet
          ),
          contentItems: nextContentItems,
          images: section.images.map((image) =>
            image.id === draggedId ? { ...image, section: targetSection } : image
          ),
          latexItems: section.latexItems.map((latexItem) =>
            latexItem.id === draggedId
              ? { ...latexItem, section: targetSection }
              : latexItem
          ),
          textboxes: section.textboxes.map((textbox) =>
            textbox.id === draggedId
              ? { ...textbox, section: targetSection }
              : textbox
          ),
        };
      });
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleLayoutChange = useCallback(
    (nextLayout: LayoutOption) => {
      if (!selectedSection) {
        return;
      }

      const nextSectionCount = getSectionCount(nextLayout);

      recordHistorySnapshot();
      updateSection(selectedSection.id, (section) => ({
        ...section,
        codeSnippets: section.codeSnippets.map((codeSnippet) => ({
          ...codeSnippet,
          section: Math.min(codeSnippet.section, nextSectionCount - 1),
        })),
        contentItems: section.contentItems.map((item) => ({
          ...item,
          section: Math.min(item.section, nextSectionCount - 1),
        })),
        images: section.images.map((image) => ({
          ...image,
          section: Math.min(image.section, nextSectionCount - 1),
        })),
        latexItems: section.latexItems.map((latexItem) => ({
          ...latexItem,
          section: Math.min(latexItem.section, nextSectionCount - 1),
        })),
        layout: nextLayout,
        selectedSection: Math.min(section.selectedSection, nextSectionCount - 1),
        textboxes: section.textboxes.map((textbox) => ({
          ...textbox,
          section: Math.min(textbox.section, nextSectionCount - 1),
        })),
      }));
    },
    [recordHistorySnapshot, selectedSection, updateSection]
  );

  const handleDuplicateContentItem = useCallback(
    (id: number) => {
      if (!selectedSection) {
        return;
      }

      const sourceContentItem = selectedSection.contentItems.find(
        (item) => item.id === id
      );

      if (!sourceContentItem) {
        return;
      }

      const nextUsedHeight =
        (sectionUsageHeightsRef.current[sourceContentItem.section] ?? 0) +
        getContentItemFlowHeight(sourceContentItem);

      if (nextUsedHeight > availablePanelHeightRef.current) {
        setNotification(OVERFLOW_MESSAGE);
        return;
      }

      recordHistorySnapshot();
      const nextContentItemId = getNextId();

      updateSection(selectedSection.id, (section) => {
        const sourceIndex = section.contentItems.findIndex((item) => item.id === id);

        if (sourceIndex === -1) {
          return section;
        }

        const nextContentItems = [...section.contentItems];
        nextContentItems.splice(
          sourceIndex + 1,
          0,
          createPanelContentItem(
            nextContentItemId,
            sourceContentItem.type,
            sourceContentItem.section
          )
        );

        if (sourceContentItem.type === 'textbox') {
          const sourceTextbox = section.textboxes.find((textbox) => textbox.id === id);

          if (!sourceTextbox) {
            return section;
          }

          return {
            ...section,
            contentItems: nextContentItems,
            textboxes: insertAfterId(
              section.textboxes,
              id,
              createTextboxPanelItem(
                nextContentItemId,
                sourceTextbox.section,
                sourceTextbox.text
              )
            ),
          };
        }

        if (sourceContentItem.type === 'latex') {
          const sourceLatex = section.latexItems.find((latexItem) => latexItem.id === id);

          if (!sourceLatex) {
            return section;
          }

          return {
            ...section,
            contentItems: nextContentItems,
            latexItems: insertAfterId(
              section.latexItems,
              id,
              createLatexPanelItem(
                nextContentItemId,
                sourceLatex.section,
                sourceLatex.source
              )
            ),
          };
        }

        if (sourceContentItem.type === 'codeSnippet') {
          const sourceCodeSnippet = section.codeSnippets.find(
            (codeSnippet) => codeSnippet.id === id
          );

          if (!sourceCodeSnippet) {
            return section;
          }

          return {
            ...section,
            codeSnippets: insertAfterId(
              section.codeSnippets,
              id,
              createCodeSnippetPanelItem(
                nextContentItemId,
                sourceCodeSnippet.section,
                sourceCodeSnippet.language,
                sourceCodeSnippet.code
              )
            ),
            contentItems: nextContentItems,
          };
        }

        const sourceImage = section.images.find((image) => image.id === id);

        if (!sourceImage) {
          return section;
        }

        return {
          ...section,
          contentItems: nextContentItems,
          images: insertAfterId(
            section.images,
            id,
            {
              ...sourceImage,
              id: nextContentItemId,
            }
          ),
        };
      });
      setPendingSelectedContentItem({
        id: nextContentItemId,
        type: sourceContentItem.type,
      });
    },
    [
      getContentItemFlowHeight,
      getNextId,
      recordHistorySnapshot,
      selectedSection,
      updateSection,
    ]
  );

  const handleDeleteObject = useCallback(
    (objectId: number) => {
      const currentObjects = objectsRef.current;
      const objectIndex = currentObjects.findIndex((object) => object.id === objectId);

      if (objectIndex === -1) {
        return;
      }

      if (currentObjects.length === 1) {
        setNotification('At least one Learning Object must remain.');
        return;
      }

      const nextObjects = currentObjects.filter((object) => object.id !== objectId);
      const selectionNeedsFallback = selectedContext?.object.id === objectId;

      recordHistorySnapshot();
      cleanupSectionCaches(
        collectSectionIdsFromChildren(currentObjects[objectIndex].children)
      );
      updateObjects(() => nextObjects);

      if (selectionNeedsFallback) {
        setSelectedNodeState(
          resolveSelectionFallback(
            [
              {
                id: nextObjects[Math.min(objectIndex, nextObjects.length - 1)].id,
                type: 'object',
              },
            ],
            nextObjects
          )
        );
      }
    },
    [
      cleanupSectionCaches,
      recordHistorySnapshot,
      resolveSelectionFallback,
      selectedContext,
      setSelectedNodeState,
      updateObjects,
    ]
  );

  const handleDeleteSubobject = useCallback(
    (subobjectId: number) => {
      const currentObjects = objectsRef.current;
      let parentObjectId: number | null = null;
      let deletedSectionIds: number[] = [];
      let subobjectIndex = -1;

      const nextObjects = currentObjects.map((object) => {
        const childIndex = object.children.findIndex(
          (child) => child.type === 'subobject' && child.id === subobjectId
        );

        if (childIndex === -1) {
          return object;
        }

        const child = object.children[childIndex];

        if (child.type !== 'subobject') {
          return object;
        }

        parentObjectId = object.id;
        subobjectIndex = childIndex;
        deletedSectionIds = child.sections.map((section) => section.id);

        return {
          ...object,
          children: object.children.filter((entry) => entry.id !== subobjectId),
        };
      });

      if (deletedSectionIds.length === 0 && parentObjectId === null) {
        return;
      }

      const parentObject = nextObjects.find((object) => object.id === parentObjectId);

      if (!parentObject) {
        return;
      }

      const selectionNeedsFallback =
        (selectedContext?.type === 'subobject' &&
          selectedContext.subobject.id === subobjectId) ||
        (selectedContext?.type === 'section' &&
          selectedContext.subobject?.id === subobjectId);

      recordHistorySnapshot();
      cleanupSectionCaches(deletedSectionIds);
      updateObjects(() => nextObjects);

      if (selectionNeedsFallback) {
        setSelectedNodeState(
          resolveSelectionFallback(
            [
              getClosestChildSelection(parentObject.children, subobjectIndex),
              {
                id: parentObject.id,
                type: 'object',
              },
            ],
            nextObjects
          )
        );
      }
    },
    [
      cleanupSectionCaches,
      recordHistorySnapshot,
      resolveSelectionFallback,
      selectedContext,
      setSelectedNodeState,
      updateObjects,
    ]
  );

  const handleDeleteSection = useCallback(
    (sectionId: number) => {
      const currentObjects = objectsRef.current;
      let parentObjectId: number | null = null;
      let parentSubobjectId: number | null = null;
      let sectionIndex = -1;

      const nextObjects = currentObjects.map((object) => {
        const topLevelSectionIndex = object.children.findIndex(
          (child) => child.type === 'section' && child.id === sectionId
        );

        if (topLevelSectionIndex !== -1) {
          parentObjectId = object.id;
          sectionIndex = topLevelSectionIndex;

          return {
            ...object,
            children: object.children.filter((child) => child.id !== sectionId),
          };
        }

        let hasChanged = false;
        const nextChildren = object.children.map((child) => {
          if (child.type !== 'subobject') {
            return child;
          }

          const nestedSectionIndex = child.sections.findIndex(
            (section) => section.id === sectionId
          );

          if (nestedSectionIndex === -1) {
            return child;
          }

          parentObjectId = object.id;
          parentSubobjectId = child.id;
          sectionIndex = nestedSectionIndex;
          hasChanged = true;

          return {
            ...child,
            sections: child.sections.filter((section) => section.id !== sectionId),
          };
        });

        if (!hasChanged) {
          return object;
        }

        return {
          ...object,
          children: nextChildren,
        };
      });

      if (parentObjectId === null || sectionIndex === -1) {
        return;
      }

      const parentObject = nextObjects.find((object) => object.id === parentObjectId);

      if (!parentObject) {
        return;
      }

      const selectionNeedsFallback =
        selectedContext?.type === 'section' && selectedContext.section.id === sectionId;

      recordHistorySnapshot();
      cleanupSectionCaches([sectionId]);
      updateObjects(() => nextObjects);

      if (!selectionNeedsFallback) {
        return;
      }

      if (parentSubobjectId !== null) {
        const parentSubobject = parentObject.children.find(
          (child) => child.type === 'subobject' && child.id === parentSubobjectId
        );

        setSelectedNodeState(
          resolveSelectionFallback(
            [
              parentSubobject?.type === 'subobject'
                ? getClosestSectionSelection(parentSubobject.sections, sectionIndex)
                : null,
              {
                id: parentSubobjectId,
                type: 'subobject',
              },
              {
                id: parentObject.id,
                type: 'object',
              },
            ],
            nextObjects
          )
        );
        return;
      }

      setSelectedNodeState(
        resolveSelectionFallback(
          [
            getClosestChildSelection(parentObject.children, sectionIndex),
            {
              id: parentObject.id,
              type: 'object',
            },
          ],
          nextObjects
        )
      );
    },
    [
      cleanupSectionCaches,
      recordHistorySnapshot,
      resolveSelectionFallback,
      selectedContext,
      setSelectedNodeState,
      updateObjects,
    ]
  );

  const handlePanelSectionSelect = useCallback(
    (sectionIndex: number) => {
      if (!selectedSection) {
        return;
      }

      if (selectedSection.selectedSection === sectionIndex) {
        return;
      }

      updateSection(selectedSection.id, (section) => ({
        ...section,
        selectedSection: sectionIndex,
      }));
    },
    [selectedSection, updateSection]
  );

  const handleTextboxHeightsChange = useCallback(
    (heights: Record<number, number>) => {
      if (!selectedSection) {
        return;
      }

      const currentPanelHeights =
        panelTextboxHeightsRef.current[selectedSection.id] ?? {};

      if (areHeightsEqual(currentPanelHeights, heights)) {
        return;
      }

      panelTextboxHeightsRef.current = {
        ...panelTextboxHeightsRef.current,
        [selectedSection.id]: heights,
      };
    },
    [selectedSection]
  );

  const handleLatexHeightsChange = useCallback(
    (heights: Record<number, number>) => {
      if (!selectedSection) {
        return;
      }

      const currentPanelHeights =
        panelLatexHeightsRef.current[selectedSection.id] ?? {};

      if (areHeightsEqual(currentPanelHeights, heights)) {
        return;
      }

      panelLatexHeightsRef.current = {
        ...panelLatexHeightsRef.current,
        [selectedSection.id]: heights,
      };
    },
    [selectedSection]
  );

  const handleAvailableHeightChange = useCallback((height: number) => {
    availablePanelHeightRef.current = height;
  }, []);

  const handleSectionUsageChange = useCallback((usage: Record<number, number>) => {
    sectionUsageHeightsRef.current = usage;
  }, []);

  const handleOverflow = useCallback(() => {
    setNotification(OVERFLOW_MESSAGE);
  }, []);

  const handlePanelMessage = useCallback((message: string) => {
    setNotification(message);
  }, []);

  const handleRegisterTextToolbarActionHandler = useCallback(
    (handler: ((action: TextToolbarAction) => void) | null) => {
      textToolbarActionHandlerRef.current = handler;
    },
    []
  );

  const handleRegisterImageInsertHandler = useCallback(
    (handler: ((request: ImageInsertRequest) => Promise<boolean>) | null) => {
      imageInsertHandlerRef.current = handler;
    },
    []
  );

  const handleSelectedContentItemChange = useCallback(
    (nextSelectedContentItem: SelectedContentItem) => {
      setSelectedContentItem(nextSelectedContentItem);
    },
    []
  );

  const handlePendingContentSelectionHandled = useCallback(() => {
    setPendingSelectedContentItem(null);
  }, []);

  const handleTextToolbarAction = useCallback((action: TextToolbarAction) => {
    textToolbarActionHandlerRef.current?.(action);
  }, []);

  const updateMetadataNode = useCallback(
    (
      field: 'lectureTitle' | 'lectureLength' | 'lectureDescription',
      value: string
    ) => {
      if (!selectedMetadataNode) {
        return;
      }

      recordHistorySnapshot(
        `${selectedMetadataNode.type}-${selectedMetadataNode.object.id}-${
          selectedMetadataNode.type === 'object'
            ? 'metadata'
            : selectedMetadataNode.subobject.id
        }`
      );

      if (selectedMetadataNode.type === 'object') {
        updateObject(selectedMetadataNode.object.id, (object) => ({
          ...object,
          [field]: value,
        }));
        return;
      }

      updateSubobject(selectedMetadataNode.subobject.id, (subobject) => ({
        ...subobject,
        [field]: value,
      }));
    },
    [recordHistorySnapshot, selectedMetadataNode, updateObject, updateSubobject]
  );

  const handleSidebarSelection = useCallback(
    (selection: EditorSelection) => {
      setSelectedContentItem(null);
      setPendingSelectedContentItem(null);
      setSelectedNodeState(selection);
    },
    [setSelectedNodeState]
  );

  const handleDeleteStructuralNode = useCallback(
    (selection: NonNullable<EditorSelection>) => {
      setSelectedContentItem(null);
      setPendingSelectedContentItem(null);

      if (selection.type === 'object') {
        handleDeleteObject(selection.id);
        return;
      }

      if (selection.type === 'subobject') {
        handleDeleteSubobject(selection.id);
        return;
      }

      handleDeleteSection(selection.id);
    },
    [handleDeleteObject, handleDeleteSection, handleDeleteSubobject]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isEditing = isActiveTextEntryTarget(event.target);
      const modifierKeyPressed = event.metaKey || event.ctrlKey;

      if (
        !isEditing &&
        event.key === 'Delete' &&
        selectedSection &&
        selectedContentItem
      ) {
        event.preventDefault();
        handleDeleteContentItem(selectedContentItem.id);
        return;
      }

      if (isEditing || !modifierKeyPressed || event.altKey) {
        return;
      }

      const lowerCaseKey = event.key.toLowerCase();

      if (lowerCaseKey === 'z') {
        event.preventDefault();

        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }

        return;
      }

      if (lowerCaseKey === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleDeleteContentItem,
    handleRedo,
    handleUndo,
    isActiveTextEntryTarget,
    selectedContentItem,
    selectedSection,
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar
        onAddCodeSnippet={handleAddCodeSnippet}
        onAddObject={handleAddObject}
        onAddImage={handleAddImage}
        onAddLatex={handleAddLatex}
        onAddSection={handleAddSection}
        onAddSubobject={handleAddSubobject}
        onAddTextbox={handleAddTextbox}
        onTextToolbarAction={handleTextToolbarAction}
        textToolbarState={
          selectedSection ? textToolbarState : INITIAL_TEXT_TOOLBAR_STATE
        }
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          objects={objects}
          selectedNode={selectedNode}
          onDeleteNode={handleDeleteStructuralNode}
          onSelectNode={handleSidebarSelection}
        />
        <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-slate-100 px-6 py-8">
          {notification ? (
            <div className="animate-surface-in absolute right-6 top-6 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-[0_24px_50px_-26px_rgba(15,23,42,0.75)]">
              {notification}
            </div>
          ) : null}
          {selectedSection ? (
            <Panel
              key={selectedSection.id}
              panelHeight={PANEL_HEIGHT}
              minTextboxHeight={MIN_TEXTBOX_HEIGHT}
              codeSnippets={selectedSection.codeSnippets}
              contentItems={selectedSection.contentItems}
              layout={selectedSection.layout}
              images={selectedSection.images}
              latexItems={selectedSection.latexItems}
              pendingSelectedContentItem={pendingSelectedContentItem}
              selectedSection={selectedSection.selectedSection}
              subtitle={selectedSection.subtitle}
              textboxes={selectedSection.textboxes}
              title={selectedSection.title}
              onLayoutChange={handleLayoutChange}
              onSectionSelect={handlePanelSectionSelect}
              onSubtitleChange={handleSectionSubtitleChange}
              onCodeSnippetChange={handleCodeSnippetChange}
              onCodeSnippetLanguageChange={handleCodeSnippetLanguageChange}
              onDuplicateContentItem={handleDuplicateContentItem}
              onLatexChange={handleLatexChange}
              onLatexHeightsChange={handleLatexHeightsChange}
              onTextboxChange={handleTextboxChange}
              onDeleteContentItem={handleDeleteContentItem}
              onAddImage={handleAddImageItem}
              onImageChange={handleImageChange}
              onTextboxHeightsChange={handleTextboxHeightsChange}
              onTitleChange={handleSectionTitleChange}
              onAvailableHeightChange={handleAvailableHeightChange}
              onSectionUsageChange={handleSectionUsageChange}
              onMoveContentItem={handleMoveContentItem}
              onOverflow={handleOverflow}
              onPendingContentSelectionHandled={
                handlePendingContentSelectionHandled
              }
              onImageInsertError={handlePanelMessage}
              onRegisterImageInsertHandler={handleRegisterImageInsertHandler}
              onRegisterTextToolbarActionHandler={
                handleRegisterTextToolbarActionHandler
              }
              onSelectedContentItemChange={handleSelectedContentItemChange}
              onTextToolbarStateChange={setTextToolbarState}
            />
          ) : selectedMetadataNode ? (
            <LearningMetadataEditor
              key={`${selectedMetadataNode.type}-${selectedMetadataNode.object.id}${
                selectedMetadataNode.type === 'subobject'
                  ? `-${selectedMetadataNode.subobject.id}`
                  : ''
              }`}
              nodeType={selectedMetadataNode.type}
              lectureTitle={
                selectedMetadataNode.type === 'object'
                  ? selectedMetadataNode.object.lectureTitle
                  : selectedMetadataNode.subobject.lectureTitle
              }
              lectureLength={
                selectedMetadataNode.type === 'object'
                  ? selectedMetadataNode.object.lectureLength
                  : selectedMetadataNode.subobject.lectureLength
              }
              lectureDescription={
                selectedMetadataNode.type === 'object'
                  ? selectedMetadataNode.object.lectureDescription
                  : selectedMetadataNode.subobject.lectureDescription
              }
              onLectureTitleChange={(value) =>
                updateMetadataNode('lectureTitle', value)
              }
              onLectureLengthChange={(value) =>
                updateMetadataNode('lectureLength', value)
              }
              onLectureDescriptionChange={(value) =>
                updateMetadataNode('lectureDescription', value)
              }
            />
          ) : (
            <div className="animate-surface-in w-full max-w-xl rounded-[28px] border border-slate-200/80 bg-white/95 p-8 text-center text-sm text-slate-600 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.35)] backdrop-blur-xl">
              Select a Learning Object, Learning Subobject, or Learning Section to
              edit it.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
