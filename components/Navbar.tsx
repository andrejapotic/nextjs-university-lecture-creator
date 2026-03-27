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
    <nav className="bg-gray-800 text-white p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <AddObject onAdd={onAddPanel} />
        </div>
        <div className="h-8 w-px bg-gray-600" />
        <div className="flex items-center gap-3">
          <Textbox onAdd={onAddTextbox} />
          <ImageTool />
          <Latex />
          <CodeSnippet />
        </div>
      </div>
    </nav>
  );
}
