'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Panel from '../components/Panel';
import LearningMetadataEditor from '../components/LearningMetadataEditor';
import {
  createPanelContentItem,
  createTextboxPanelItem,
  type ImageInsertRequest,
  type ImagePanelItem,
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
  contentItems: PanelContentItem[];
  images: ImagePanelItem[];
  id: number;
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
  contentItems: [],
  images: [],
  id,
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

export default function Home() {
  const [objects, setObjects] = useState<LearningObjectItem[]>(INITIAL_OBJECTS);
  const [selectedNode, setSelectedNode] = useState<EditorSelection>(INITIAL_SELECTION);
  const [notification, setNotification] = useState<string | null>(null);
  const [textToolbarState, setTextToolbarState] = useState<TextToolbarState>(
    INITIAL_TEXT_TOOLBAR_STATE
  );
  const objectsRef = useRef(objects);
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
  const panelTextboxHeightsRef = useRef<Record<number, Record<number, number>>>({
    2: {},
  });
  const sectionUsageHeightsRef = useRef<Record<number, number>>({
    0: 0,
  });

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
    if (!notification) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setNotification(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [notification]);

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
    const nextObjectId = getNextId();
    const nextObject = createLearningObject(nextObjectId, getNextObjectTitle());

    updateObjects((currentObjects) => [...currentObjects, nextObject]);
    setSelectedNode({
      id: nextObjectId,
      type: 'object',
    });
  }, [getNextId, getNextObjectTitle, updateObjects]);

  const handleAddSubobject = useCallback(() => {
    if (!selectedContext) {
      setNotification(
        'Select a Learning Object, Learning Subobject, or Learning Section before adding a Subobject.'
      );
      return;
    }

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

    setSelectedNode({
      id: nextSubobjectId,
      type: 'subobject',
    });
  }, [getNextId, getNextSubobjectTitle, selectedContext, updateObjects]);

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

    setSelectedNode({
      id: nextSectionId,
      type: 'section',
    });
  }, [getNextId, getNextSectionTitle, selectedContext, updateObjects]);

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
  }, [getNextId, selectedSection, updateSection]);

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

      await insertImage({
        file,
        id: getNextId(),
      });
    },
    [getNextId, selectedSection]
  );

  const handleTextboxChange = useCallback(
    (id: number, text: string) => {
      if (!selectedSection) {
        return;
      }

      updateSection(selectedSection.id, (section) => ({
        ...section,
        textboxes: section.textboxes.map((textbox) =>
          textbox.id === id ? { ...textbox, text } : textbox
        ),
      }));
    },
    [selectedSection, updateSection]
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

      updateSection(selectedSection.id, (section) => ({
        ...section,
        images: section.images.map((image) =>
          image.id === id ? { ...image, ...updates } : image
        ),
      }));
    },
    [selectedSection, updateSection]
  );

  const handleSectionTitleChange = useCallback(
    (title: string) => {
      if (!selectedSection) {
        return;
      }

      updateSection(selectedSection.id, (section) => ({
        ...section,
        title,
      }));
    },
    [selectedSection, updateSection]
  );

  const handleSectionSubtitleChange = useCallback(
    (subtitle: string) => {
      if (!selectedSection) {
        return;
      }

      updateSection(selectedSection.id, (section) => ({
        ...section,
        subtitle,
      }));
    },
    [selectedSection, updateSection]
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

      updateSection(selectedSection.id, (section) => ({
        ...section,
        contentItems: section.contentItems.filter((item) => item.id !== id),
        images:
          itemToDelete.type === 'image'
            ? section.images.filter((image) => image.id !== id)
            : section.images,
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
    },
    [selectedSection, updateSection]
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
          contentItems: nextContentItems,
          images: section.images.map((image) =>
            image.id === draggedId ? { ...image, section: targetSection } : image
          ),
          textboxes: section.textboxes.map((textbox) =>
            textbox.id === draggedId
              ? { ...textbox, section: targetSection }
              : textbox
          ),
        };
      });
    },
    [selectedSection, updateSection]
  );

  const handleLayoutChange = useCallback(
    (nextLayout: LayoutOption) => {
      if (!selectedSection) {
        return;
      }

      const nextSectionCount = getSectionCount(nextLayout);

      updateSection(selectedSection.id, (section) => ({
        ...section,
        contentItems: section.contentItems.map((item) => ({
          ...item,
          section: Math.min(item.section, nextSectionCount - 1),
        })),
        images: section.images.map((image) => ({
          ...image,
          section: Math.min(image.section, nextSectionCount - 1),
        })),
        layout: nextLayout,
        selectedSection: Math.min(section.selectedSection, nextSectionCount - 1),
        textboxes: section.textboxes.map((textbox) => ({
          ...textbox,
          section: Math.min(textbox.section, nextSectionCount - 1),
        })),
      }));
    },
    [selectedSection, updateSection]
  );

  const handlePanelSectionSelect = useCallback(
    (sectionIndex: number) => {
      if (!selectedSection) {
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
    [selectedMetadataNode, updateObject, updateSubobject]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar
        onAddObject={handleAddObject}
        onAddImage={handleAddImage}
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
          onSelectNode={setSelectedNode}
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
              contentItems={selectedSection.contentItems}
              layout={selectedSection.layout}
              images={selectedSection.images}
              selectedSection={selectedSection.selectedSection}
              subtitle={selectedSection.subtitle}
              textboxes={selectedSection.textboxes}
              title={selectedSection.title}
              onLayoutChange={handleLayoutChange}
              onSectionSelect={handlePanelSectionSelect}
              onSubtitleChange={handleSectionSubtitleChange}
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
              onImageInsertError={handlePanelMessage}
              onRegisterImageInsertHandler={handleRegisterImageInsertHandler}
              onRegisterTextToolbarActionHandler={
                handleRegisterTextToolbarActionHandler
              }
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
