import type { TextboxPanelItem } from './panelItemTypes';

type NodeType = 'object' | 'subobject' | 'section';

type LearningSectionListItem = {
  id: number;
  layout: 'blank' | 'split' | 'thirds';
  parentId: number;
  parentType: 'object' | 'subobject';
  selectedSection: number;
  subtitle: string;
  textboxes: TextboxPanelItem[];
  title: string;
  type: 'section';
};

type LearningSubobjectListItem = {
  id: number;
  lectureDescription: string;
  lectureLength: string;
  lectureTitle: string;
  parentObjectId: number;
  sections: LearningSectionListItem[];
  type: 'subobject';
};

type LearningObjectChild = LearningSectionListItem | LearningSubobjectListItem;

type LearningObjectListItem = {
  children: LearningObjectChild[];
  id: number;
  lectureDescription: string;
  lectureLength: string;
  lectureTitle: string;
  type: 'object';
};

type SidebarProps = {
  objects: LearningObjectListItem[];
  selectedNode: {
    id: number;
    type: NodeType;
  } | null;
  onSelectNode: (selection: SidebarProps['selectedNode']) => void;
};

const getNodeButtonClass = (isSelected: boolean) =>
  `animate-node-in w-full rounded-2xl border p-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 ${
    isSelected
      ? 'border-sky-300/90 bg-white shadow-[0_26px_50px_-34px_rgba(14,165,233,0.45)] ring-1 ring-sky-100'
      : 'border-slate-200/80 bg-white/85 hover:-translate-y-px hover:border-slate-300 hover:bg-white hover:shadow-[0_20px_40px_-32px_rgba(15,23,42,0.45)]'
  }`;

const getDisplayTitle = (value: string, fallback: string) => value.trim() || fallback;

const getTypeBadgeClass = (nodeType: NodeType) => {
  if (nodeType === 'object') {
    return 'bg-gray-900 text-white';
  }

  if (nodeType === 'subobject') {
    return 'bg-slate-700 text-white';
  }

  return 'bg-blue-600 text-white';
};

const getSectionLayoutLabel = (layout: LearningSectionListItem['layout']) => {
  if (layout === 'split') {
    return 'Split layout';
  }

  if (layout === 'thirds') {
    return 'Thirds layout';
  }

  return 'Blank layout';
};

export default function Sidebar({
  objects,
  selectedNode,
  onSelectNode,
}: SidebarProps) {
  const renderSection = (
    section: LearningSectionListItem,
    fallbackTitle: string
  ) => {
    const isSelected =
      selectedNode?.id === section.id && selectedNode.type === 'section';

    return (
      <button
        key={section.id}
        type="button"
        onClick={() =>
          onSelectNode({
            id: section.id,
            type: 'section',
          })
        }
        aria-pressed={isSelected}
        className={getNodeButtonClass(isSelected)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {getDisplayTitle(section.title, fallbackTitle)}
            </div>
            <div className="mt-1 truncate text-xs text-slate-600">
              {section.subtitle.trim() || getSectionLayoutLabel(section.layout)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {section.textboxes.length} textboxes
            </div>
          </div>
          <div
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getTypeBadgeClass(
              'section'
            )}`}
          >
            Section
          </div>
        </div>
      </button>
    );
  };

  const renderSubobject = (subobject: LearningSubobjectListItem) => {
    const isSelected =
      selectedNode?.id === subobject.id && selectedNode.type === 'subobject';

    return (
      <div key={subobject.id} className="animate-node-in flex flex-col gap-2">
        <button
          type="button"
          onClick={() =>
            onSelectNode({
              id: subobject.id,
              type: 'subobject',
            })
          }
          aria-pressed={isSelected}
          className={getNodeButtonClass(isSelected)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">
                {getDisplayTitle(subobject.lectureTitle, 'Untitled Subobject')}
              </div>
              <div className="mt-1 truncate text-xs text-slate-600">
                {subobject.lectureLength.trim() || 'No lecture length'}
              </div>
              <div className="mt-1 truncate text-[11px] text-slate-400">
                {subobject.lectureDescription.trim() || 'No lecture description'}
              </div>
            </div>
            <div
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getTypeBadgeClass(
                'subobject'
              )}`}
            >
              Subobject
            </div>
          </div>
        </button>
        {subobject.sections.length > 0 ? (
          <div className="ml-4 flex flex-col gap-2 border-l border-slate-200/90 pl-3">
            {subobject.sections.map((section, index) =>
              renderSection(section, `Section ${index + 1}`)
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-slate-100/80 p-4 backdrop-blur-xl">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Learning Outline
      </div>
      <div className="flex flex-col gap-3">
        {objects.map((object, index) => {
          const isSelected =
            selectedNode?.id === object.id && selectedNode.type === 'object';

          return (
            <div key={object.id} className="animate-node-in flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  onSelectNode({
                    id: object.id,
                    type: 'object',
                  })
                }
                aria-pressed={isSelected}
                className={getNodeButtonClass(isSelected)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {getDisplayTitle(object.lectureTitle, `Object ${index + 1}`)}
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-600">
                      {object.lectureLength.trim() || 'No lecture length'}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-slate-400">
                      {object.lectureDescription.trim() || 'No lecture description'}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getTypeBadgeClass(
                      'object'
                    )}`}
                  >
                    Object
                  </div>
                </div>
              </button>
              {object.children.length > 0 ? (
                <div className="ml-4 flex flex-col gap-2 border-l border-slate-200/90 pl-3">
                  {object.children.map((child, childIndex) =>
                    child.type === 'subobject'
                      ? renderSubobject(child)
                      : renderSection(child, `Section ${childIndex + 1}`)
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
