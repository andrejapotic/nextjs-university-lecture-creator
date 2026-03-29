import AddObject from './AddObject';
import Textbox from './Textbox';
import ImageTool from './ImageTool';
import Latex from './Latex';
import CodeSnippet from './CodeSnippet';
import ToolbarAction, {
  SectionIcon,
  SubobjectIcon,
} from './ToolbarAction';

type NavbarProps = {
  onAddObject: () => void;
  onAddSection: () => void;
  onAddSubobject: () => void;
  onAddTextbox: () => void;
};

export default function Navbar({
  onAddObject,
  onAddSection,
  onAddSubobject,
  onAddTextbox,
}: NavbarProps) {
  return (
    <nav className="animate-surface-in relative z-40 overflow-visible border-b border-slate-200/80 bg-white/90 text-slate-900 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl">
      <div className="flex items-stretch overflow-visible">
        <div className="flex w-64 shrink-0 items-center gap-2 overflow-visible border-r border-slate-200/80 px-4 py-3">
          <AddObject onAdd={onAddObject} />
          <ToolbarAction
            label="Add Subobject"
            icon={<SubobjectIcon />}
            onClick={onAddSubobject}
          />
          <ToolbarAction
            label="Add Section"
            icon={<SectionIcon />}
            onClick={onAddSection}
          />
        </div>
        <div className="flex flex-1 items-center overflow-visible px-4 py-3">
          <div className="flex items-center gap-2 overflow-visible rounded-2xl border border-slate-200/80 bg-slate-50/85 px-2 py-2 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)]">
            <Textbox onAdd={onAddTextbox} />
            <ImageTool />
            <Latex />
            <CodeSnippet />
          </div>
        </div>
      </div>
    </nav>
  );
}
