import AddObject from './AddObject';
import Textbox from './Textbox';
import ImageTool from './ImageTool';
import Latex from './Latex';
import CodeSnippet from './CodeSnippet';

type NavbarProps = {
  onAddPanel: () => void;
  onAddTextbox: () => void;
};

export default function Navbar({ onAddPanel, onAddTextbox }: NavbarProps) {
  return (
    <nav className="bg-gray-800 text-white">
      <div className="flex items-stretch">
        <div className="flex w-64 shrink-0 items-center border-r border-white/10 px-4 py-4">
          <AddObject onAdd={onAddPanel} />
        </div>
        <div className="flex flex-1 items-center gap-3 px-4 py-4">
          <Textbox onAdd={onAddTextbox} />
          <ImageTool />
          <Latex />
          <CodeSnippet />
        </div>
      </div>
    </nav>
  );
}
