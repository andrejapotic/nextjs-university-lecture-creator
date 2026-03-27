'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  textboxes: TextboxItem[];
  title: string;
};

const PANEL_HEIGHT = 768;
const MIN_TEXTBOX_HEIGHT = 48;

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
  const [panelTextboxHeights, setPanelTextboxHeights] = useState<
    Record<number, Record<number, number>>
  >({
    1: {},
  });
  const [notification, setNotification] = useState<string | null>(null);

  const activePanel = useMemo(
    () => panels.find((panel) => panel.id === activePanelId) ?? panels[0],
    [activePanelId, panels]
  );
  const activeTextboxHeights = useMemo(
    () => panelTextboxHeights[activePanel?.id ?? -1] ?? {},
    [activePanel?.id, panelTextboxHeights]
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

  const updateActivePanel = useCallback(
    (updater: (panel: PanelItem) => PanelItem) => {
      setPanels((current) =>
        current.map((panel) =>
          panel.id === activePanelId ? updater(panel) : panel
        )
      );
    },
    [activePanelId]
  );

  const handleAddPanel = useCallback(() => {
    const nextPanelId = Date.now();
    const nextPanel = createPanel(nextPanelId, `Panel ${panels.length + 1}`);

    setPanels((current) => [...current, nextPanel]);
    setPanelTextboxHeights((current) => ({
      ...current,
      [nextPanelId]: {},
    }));
    setActivePanelId(nextPanelId);
  }, [panels.length]);

  const handleAddTextbox = useCallback(() => {
    if (!activePanel) {
      return;
    }

    const usedHeight = activePanel.textboxes.reduce(
      (total, textbox) =>
        textbox.section === activePanel.selectedSection
          ? total + (activeTextboxHeights[textbox.id] ?? MIN_TEXTBOX_HEIGHT)
          : total,
      0
    );

    if (usedHeight + MIN_TEXTBOX_HEIGHT > PANEL_HEIGHT) {
      setNotification("It's not possible to add more content to the current panel.");
      return;
    }

    updateActivePanel((panel) => ({
      ...panel,
      textboxes: [
        ...panel.textboxes,
        {
          id: Date.now(),
          text: '',
          section: panel.selectedSection,
        },
      ],
    }));
  }, [activePanel, activeTextboxHeights, updateActivePanel]);

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

  const handleDeleteTextbox = useCallback(
    (id: number) => {
      updateActivePanel((panel) => ({
        ...panel,
        textboxes: panel.textboxes.filter((textbox) => textbox.id !== id),
      }));
      setPanelTextboxHeights((current) => {
        const currentPanelHeights = current[activePanelId] ?? {};
        const nextPanelHeights = { ...currentPanelHeights };

        delete nextPanelHeights[id];

        return {
          ...current,
          [activePanelId]: nextPanelHeights,
        };
      });
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

      const draggedHeight = activeTextboxHeights[draggedId] ?? MIN_TEXTBOX_HEIGHT;
      const targetHeight = activePanel.textboxes.reduce((total, textbox) => {
        if (textbox.id === draggedId || textbox.section !== targetSection) {
          return total;
        }

        return total + (activeTextboxHeights[textbox.id] ?? MIN_TEXTBOX_HEIGHT);
      }, 0);

      if (
        draggedTextbox.section !== targetSection &&
        targetHeight + draggedHeight > PANEL_HEIGHT
      ) {
        setNotification("It's not possible to add more content to the current panel.");
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
    [activePanel, activeTextboxHeights, updateActivePanel]
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
      setPanelTextboxHeights((current) => {
        const currentPanelHeights = current[activePanelId] ?? {};

        if (areHeightsEqual(currentPanelHeights, heights)) {
          return current;
        }

        return {
          ...current,
          [activePanelId]: heights,
        };
      });
    },
    [activePanelId]
  );

  const handleOverflow = useCallback(() => {
    setNotification("It's not possible to add more content to the current panel.");
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
            textboxes={activePanel.textboxes}
            onLayoutChange={handleLayoutChange}
            onSectionSelect={handleSectionSelect}
            onTextboxChange={handleTextboxChange}
            onDeleteTextbox={handleDeleteTextbox}
            onTextboxHeightsChange={handleTextboxHeightsChange}
            onMoveTextbox={handleMoveTextbox}
            onOverflow={handleOverflow}
          />
        </main>
      </div>
    </div>
  );
}
