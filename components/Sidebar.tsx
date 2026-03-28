type PanelListItem = {
  id: number;
  layout: 'blank' | 'split' | 'thirds';
  selectedSection: number;
  subtitle: string;
  textboxes: {
    id: number;
    text: string;
    section: number;
  }[];
  title: string;
};

type SidebarProps = {
  activePanelId: number;
  panels: PanelListItem[];
  onSelectPanel: (id: number) => void;
};

const getSectionCount = (layout: PanelListItem['layout']) => {
  if (layout === 'split') {
    return 2;
  }

  if (layout === 'thirds') {
    return 3;
  }

  return 1;
};

const getTextboxPreviewHeight = (text: string) => {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return 28;
  }

  const explicitLines = trimmedText.split(/\r?\n/).length;
  const wrappedLines = Math.ceil(trimmedText.length / 28);
  const lineCount = Math.max(explicitLines, wrappedLines);

  return Math.min(72, Math.max(28, 16 + lineCount * 8));
};

export default function Sidebar({
  activePanelId,
  panels,
  onSelectPanel,
}: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-gray-300 bg-gray-100 p-4">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Panels
      </div>
      <div className="flex flex-col gap-3">
        {panels.map((panel, index) => {
          const previewTitle = panel.title.trim() || 'Object title';
          const previewSubtitle = panel.subtitle.trim() || 'Object subtitle';

          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => onSelectPanel(panel.id)}
              aria-pressed={panel.id === activePanelId}
              className={`rounded-2xl border p-3 text-left transition ${
                panel.id === activePanelId
                  ? 'border-blue-500 bg-blue-50/60 shadow-[0_14px_30px_rgba(59,130,246,0.18)]'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {previewTitle}
                  </div>
                  <div className="mt-1 truncate text-xs text-gray-600">
                    {previewSubtitle}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Panel {index + 1} · {panel.layout} layout
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-gray-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {panel.textboxes.length}
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
                <div className="aspect-[4/3]">
                  <div className="flex h-full flex-col">
                    <div className="shrink-0 border-b border-gray-300 bg-gray-50 px-2 py-1.5">
                      <div className="truncate text-[8px] font-semibold text-gray-700">
                        {previewTitle}
                      </div>
                      <div className="mt-1 truncate text-[7px] text-gray-500">
                        {previewSubtitle}
                      </div>
                    </div>
                    <div className="flex flex-1">
                      {Array.from(
                        { length: getSectionCount(panel.layout) },
                        (_, sectionIndex) => {
                          const sectionTextboxes = panel.textboxes.filter(
                            (textbox) => textbox.section === sectionIndex
                          );

                          return (
                            <div
                              key={sectionIndex}
                              className={`flex h-full flex-1 flex-col gap-1 p-1.5 ${
                                sectionIndex > 0 ? 'border-l border-gray-300' : ''
                              } ${
                                panel.selectedSection === sectionIndex
                                  ? 'bg-blue-50/60 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.22)]'
                                  : 'bg-white'
                              }`}
                            >
                              {sectionTextboxes.length > 0 ? (
                                sectionTextboxes.map((textbox) => (
                                  <div
                                    key={textbox.id}
                                    className="overflow-hidden rounded-md border border-gray-300 bg-white px-1.5 py-1 text-[7px] leading-[1.35] text-gray-600"
                                    style={{
                                      height: `${getTextboxPreviewHeight(textbox.text)}px`,
                                    }}
                                  >
                                    {textbox.text.trim() || 'Textbox'}
                                  </div>
                                ))
                              ) : (
                                <div className="flex h-full min-h-12 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-[8px] uppercase tracking-wide text-gray-400">
                                  Empty
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
