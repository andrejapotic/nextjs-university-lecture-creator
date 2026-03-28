'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Panel from '../components/Panel';

type LayoutOption = 'blank' | 'split' | 'thirds';

type TextboxItem = {
  id: number;
  text: string;
  section: number;
};

type PanelItem = {
  id: number;
  layout: LayoutOption;
  selectedSection: number;
  subtitle: string;
  textboxes: TextboxItem[];
  title: string;
};

const PANEL_HEIGHT = 768;
const PANEL_HEADER_HEIGHT = 144;
const MIN_TEXTBOX_HEIGHT = 50;
const INITIAL_AVAILABLE_PANEL_HEIGHT = PANEL_HEIGHT - PANEL_HEADER_HEIGHT;
const OVERFLOW_MESSAGE = "It's not possible to add more content to the current panel.";

const getSectionCount = (layout: LayoutOption) => {
  if (layout === 'split') {
    return 2;
  }

  if (layout === 'thirds') {
    return 3;
  }

  return 1;
};

const createPanel = (id: number, title: string): PanelItem => ({
  id,
  layout: 'blank',
  selectedSection: 0,
  subtitle: '',
  textboxes: [],
  title,
});

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

export default function Home() {
  const [panels, setPanels] = useState<PanelItem[]>([createPanel(1, 'Panel 1')]);
  const [activePanelId, setActivePanelId] = useState(1);
  const [notification, setNotification] = useState<string | null>(null);
  const panelsRef = useRef(panels);
  const nextIdRef = useRef(2);
  const availablePanelHeightRef = useRef(INITIAL_AVAILABLE_PANEL_HEIGHT);
  const panelTextboxHeightsRef = useRef<Record<number, Record<number, number>>>({
    1: {},
  });
  const sectionUsageHeightsRef = useRef<Record<number, number>>({
    0: 0,
  });

  const activePanel = useMemo(
    () => panels.find((panel) => panel.id === activePanelId) ?? panels[0],
    [activePanelId, panels]
  );

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

  const updateActivePanel = useCallback(
    (updater: (panel: PanelItem) => PanelItem) => {
      const nextPanels = panelsRef.current.map((panel) =>
        panel.id === activePanelId ? updater(panel) : panel
      );

      panelsRef.current = nextPanels;
      setPanels(nextPanels);
    },
    [activePanelId]
  );

  const handleAddPanel = useCallback(() => {
    const nextPanelId = getNextId();
    const nextPanel = createPanel(
      nextPanelId,
      `Panel ${panelsRef.current.length + 1}`
    );
    const nextPanels = [...panelsRef.current, nextPanel];

    panelsRef.current = nextPanels;
    setPanels(nextPanels);
    panelTextboxHeightsRef.current = {
      ...panelTextboxHeightsRef.current,
      [nextPanelId]: {},
    };
    setActivePanelId(nextPanelId);
  }, [getNextId]);

  const handleAddTextbox = useCallback(() => {
    const currentPanel = panelsRef.current.find(
      (panel) => panel.id === activePanelId
    );

    if (!currentPanel) {
      return;
    }

    const usedHeight =
      sectionUsageHeightsRef.current[currentPanel.selectedSection] ?? 0;

    if (usedHeight + MIN_TEXTBOX_HEIGHT > availablePanelHeightRef.current) {
      setNotification(OVERFLOW_MESSAGE);
      return;
    }

    const nextTextboxId = getNextId();
    const nextPanels = panelsRef.current.map((panel) =>
      panel.id === activePanelId
        ? {
            ...panel,
            textboxes: [
              ...panel.textboxes,
              {
                id: nextTextboxId,
                text: '',
                section: panel.selectedSection,
              },
            ],
          }
        : panel
    );

    panelsRef.current = nextPanels;
    setPanels(nextPanels);
  }, [activePanelId, getNextId]);

  const handleTextboxChange = useCallback(
    (id: number, text: string) => {
      updateActivePanel((panel) => ({
        ...panel,
        textboxes: panel.textboxes.map((textbox) =>
          textbox.id === id ? { ...textbox, text } : textbox
        ),
      }));
    },
    [updateActivePanel]
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      updateActivePanel((panel) => ({
        ...panel,
        title,
      }));
    },
    [updateActivePanel]
  );

  const handleSubtitleChange = useCallback(
    (subtitle: string) => {
      updateActivePanel((panel) => ({
        ...panel,
        subtitle,
      }));
    },
    [updateActivePanel]
  );

  const handleDeleteTextbox = useCallback(
    (id: number) => {
      updateActivePanel((panel) => ({
        ...panel,
        textboxes: panel.textboxes.filter((textbox) => textbox.id !== id),
      }));
      const currentPanelHeights = panelTextboxHeightsRef.current[activePanelId] ?? {};
      const nextPanelHeights = { ...currentPanelHeights };

      delete nextPanelHeights[id];

      panelTextboxHeightsRef.current = {
        ...panelTextboxHeightsRef.current,
        [activePanelId]: nextPanelHeights,
      };
    },
    [activePanelId, updateActivePanel]
  );

  const handleMoveTextbox = useCallback(
    (
      draggedId: number,
      targetSection: number,
      targetId: number | null,
      position: 'before' | 'after'
    ) => {
      if (!activePanel) {
        return;
      }

      const draggedTextbox = activePanel.textboxes.find(
        (textbox) => textbox.id === draggedId
      );

      if (!draggedTextbox) {
        return;
      }

      const currentHeights = panelTextboxHeightsRef.current[activePanelId] ?? {};
      const draggedHeight = currentHeights[draggedId] ?? MIN_TEXTBOX_HEIGHT;
      const targetHeight = sectionUsageHeightsRef.current[targetSection] ?? 0;

      if (
        draggedTextbox.section !== targetSection &&
        targetHeight + draggedHeight > availablePanelHeightRef.current
      ) {
        setNotification(OVERFLOW_MESSAGE);
        return;
      }

      updateActivePanel((panel) => {
        const draggedIndex = panel.textboxes.findIndex(
          (textbox) => textbox.id === draggedId
        );

        if (draggedIndex === -1) {
          return panel;
        }

        const nextTextboxes = [...panel.textboxes];
        const [draggedItem] = nextTextboxes.splice(draggedIndex, 1);
        const movedTextbox = { ...draggedItem, section: targetSection };

        if (targetId === null) {
          const lastIndexInSection = nextTextboxes.reduce(
            (lastIndex, textbox, index) =>
              textbox.section === targetSection ? index : lastIndex,
            -1
          );

          const insertIndex =
            lastIndexInSection === -1 ? nextTextboxes.length : lastIndexInSection + 1;

          nextTextboxes.splice(insertIndex, 0, movedTextbox);

          return {
            ...panel,
            textboxes: nextTextboxes,
          };
        }

        const adjustedTargetIndex = nextTextboxes.findIndex(
          (textbox) => textbox.id === targetId
        );

        if (adjustedTargetIndex === -1) {
          return {
            ...panel,
            textboxes: [...nextTextboxes, movedTextbox],
          };
        }

        const insertIndex =
          position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1;

        nextTextboxes.splice(insertIndex, 0, movedTextbox);

        return {
          ...panel,
          textboxes: nextTextboxes,
        };
      });
    },
    [activePanel, activePanelId, updateActivePanel]
  );

  const handleLayoutChange = useCallback(
    (nextLayout: LayoutOption) => {
      const nextSectionCount = getSectionCount(nextLayout);

      updateActivePanel((panel) => ({
        ...panel,
        layout: nextLayout,
        selectedSection: Math.min(panel.selectedSection, nextSectionCount - 1),
        textboxes: panel.textboxes.map((textbox) => ({
          ...textbox,
          section: Math.min(textbox.section, nextSectionCount - 1),
        })),
      }));
    },
    [updateActivePanel]
  );

  const handleSectionSelect = useCallback(
    (section: number) => {
      updateActivePanel((panel) => ({
        ...panel,
        selectedSection: section,
      }));
    },
    [updateActivePanel]
  );

  const handleTextboxHeightsChange = useCallback(
    (heights: Record<number, number>) => {
      const currentPanelHeights = panelTextboxHeightsRef.current[activePanelId] ?? {};

      if (areHeightsEqual(currentPanelHeights, heights)) {
        return;
      }

      panelTextboxHeightsRef.current = {
        ...panelTextboxHeightsRef.current,
        [activePanelId]: heights,
      };
    },
    [activePanelId]
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

  if (!activePanel) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar onAddPanel={handleAddPanel} onAddTextbox={handleAddTextbox} />
      <div className="flex flex-1">
        <Sidebar
          activePanelId={activePanelId}
          panels={panels}
          onSelectPanel={setActivePanelId}
        />
        <main className="relative flex flex-1 items-center justify-center bg-gray-100">
          {notification ? (
            <div className="absolute right-6 top-6 rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
              {notification}
            </div>
          ) : null}
          <Panel
            panelHeight={PANEL_HEIGHT}
            minTextboxHeight={MIN_TEXTBOX_HEIGHT}
            layout={activePanel.layout}
            selectedSection={activePanel.selectedSection}
            subtitle={activePanel.subtitle}
            textboxes={activePanel.textboxes}
            title={activePanel.title}
            onLayoutChange={handleLayoutChange}
            onSectionSelect={handleSectionSelect}
            onSubtitleChange={handleSubtitleChange}
            onTextboxChange={handleTextboxChange}
            onDeleteTextbox={handleDeleteTextbox}
            onTextboxHeightsChange={handleTextboxHeightsChange}
            onTitleChange={handleTitleChange}
            onAvailableHeightChange={handleAvailableHeightChange}
            onSectionUsageChange={handleSectionUsageChange}
            onMoveTextbox={handleMoveTextbox}
            onOverflow={handleOverflow}
          />
        </main>
      </div>
    </div>
  );
}
