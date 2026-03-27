type PanelListItem = {
  id: number;
  layout: 'blank' | 'split' | 'thirds';
  title: string;
};

type SidebarProps = {
  activePanelId: number;
  panels: PanelListItem[];
  onSelectPanel: (id: number) => void;
};

export default function Sidebar({
  activePanelId,
  panels,
  onSelectPanel,
}: SidebarProps) {
  return (
    <aside className="w-64 border-r border-gray-300 bg-gray-100 p-4">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Panels
      </div>
      <div className="flex flex-col gap-3">
        {panels.map((panel, index) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => onSelectPanel(panel.id)}
            className={`rounded-lg border px-4 py-3 text-left transition ${
              panel.id === activePanelId
                ? 'border-blue-500 bg-white shadow-sm'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <div className="text-sm font-semibold text-gray-900">
              {index + 1}. {panel.title}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">
              {panel.layout}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
