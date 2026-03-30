import type { MouseEvent } from 'react';
import AddObject from './AddObject';
import Textbox from './Textbox';
import ImageTool from './ImageTool';
import Latex from './Latex';
import CodeSnippet from './CodeSnippet';
import ToolbarAction, {
  BoldIcon,
  ClearFormattingIcon,
  ForeignWordIcon,
  HighlightIcon,
  ItalicIcon,
  KeywordIcon,
  OrderedListIcon,
  PhraseIcon,
  ReservedWordIcon,
  SectionIcon,
  SubobjectIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TermIcon,
  UnderlineIcon,
  UnorderedListIcon,
} from './ToolbarAction';
import type { TextToolbarAction, TextToolbarState } from './textEditorTypes';

type NavbarProps = {
  onAddCodeSnippet: () => void;
  onAddObject: () => void;
  onAddImage: (file: File) => void;
  onAddLatex: () => void;
  onAddSection: () => void;
  onAddSubobject: () => void;
  onAddTextbox: () => void;
  onTextToolbarAction: (action: TextToolbarAction) => void;
  textToolbarState: TextToolbarState;
};

export default function Navbar({
  onAddCodeSnippet,
  onAddObject,
  onAddImage,
  onAddLatex,
  onAddSection,
  onAddSubobject,
  onAddTextbox,
  onTextToolbarAction,
  textToolbarState,
}: NavbarProps) {
  const handleTextToolbarMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const isTextToolbarVisible = textToolbarState.visible;

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
            <ImageTool onAdd={onAddImage} />
            <Latex onAdd={onAddLatex} />
            <CodeSnippet onAdd={onAddCodeSnippet} />
          </div>
          <div
            className={`flex min-w-0 items-center transition-[max-width,opacity,transform,margin] duration-200 ease-out ${
              isTextToolbarVisible
                ? 'ml-3 max-w-[1100px] translate-y-0 overflow-visible opacity-100'
                : 'ml-0 max-w-0 -translate-y-1 overflow-hidden opacity-0 pointer-events-none'
            }`}
            aria-hidden={!isTextToolbarVisible}
          >
            <div className="flex min-w-max items-center gap-2 overflow-visible rounded-2xl border border-slate-200/80 bg-white/92 px-2 py-2 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.38)] backdrop-blur-xl">
              <div className="flex items-center gap-1.5">
                <ToolbarAction
                  size="compact"
                  label="Bold"
                  tooltip="Bold"
                  icon={<BoldIcon />}
                  active={textToolbarState.bold}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('bold')}
                />
                <ToolbarAction
                  size="compact"
                  label="Italic"
                  tooltip="Italic"
                  icon={<ItalicIcon />}
                  active={textToolbarState.italic}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('italic')}
                />
                <ToolbarAction
                  size="compact"
                  label="Underline"
                  tooltip="Underline"
                  icon={<UnderlineIcon />}
                  active={textToolbarState.underline}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('underline')}
                />
                <ToolbarAction
                  size="compact"
                  label="Superscript"
                  tooltip="Superscript"
                  icon={<SuperscriptIcon />}
                  active={textToolbarState.superscript}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('superscript')}
                />
                <ToolbarAction
                  size="compact"
                  label="Subscript"
                  tooltip="Subscript"
                  icon={<SubscriptIcon />}
                  active={textToolbarState.subscript}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('subscript')}
                />
                <ToolbarAction
                  size="compact"
                  label="Ordered List"
                  tooltip="Ordered list"
                  icon={<OrderedListIcon />}
                  active={textToolbarState.orderedList}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('orderedList')}
                />
                <ToolbarAction
                  size="compact"
                  label="Unordered List"
                  tooltip="Unordered list"
                  icon={<UnorderedListIcon />}
                  active={textToolbarState.unorderedList}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('unorderedList')}
                />
              </div>
              <div className="h-7 w-px shrink-0 bg-slate-200/80" />
              <div className="flex items-center gap-1.5">
                <ToolbarAction
                  size="compact"
                  label="Keyword"
                  tooltip="Keyword: red + underline"
                  icon={<KeywordIcon className="text-red-500" />}
                  active={textToolbarState.semanticStyle === 'keyword'}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('keyword')}
                />
                <ToolbarAction
                  size="compact"
                  label="Term"
                  tooltip="Term: italic + blue"
                  icon={<TermIcon className="text-blue-500" />}
                  active={textToolbarState.semanticStyle === 'term'}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('term')}
                />
                <ToolbarAction
                  size="compact"
                  label="Phrase"
                  tooltip="Phrase: italic + purple"
                  icon={<PhraseIcon className="text-violet-500" />}
                  active={textToolbarState.semanticStyle === 'phrase'}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('phrase')}
                />
                <ToolbarAction
                  size="compact"
                  label="Highlight"
                  tooltip="Highlight"
                  icon={<HighlightIcon className="text-amber-400" />}
                  active={textToolbarState.semanticStyle === 'highlight'}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('highlight')}
                />
                <ToolbarAction
                  size="compact"
                  label="Foreign Word"
                  tooltip="Foreign word: orange"
                  icon={<ForeignWordIcon className="text-orange-500" />}
                  active={textToolbarState.semanticStyle === 'foreignWord'}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('foreignWord')}
                />
                <ToolbarAction
                  size="compact"
                  label="Reserved Word"
                  tooltip="Reserved word: green"
                  icon={<ReservedWordIcon className="text-emerald-500" />}
                  active={textToolbarState.semanticStyle === 'reservedWord'}
                  onMouseDown={handleTextToolbarMouseDown}
                  onClick={() => onTextToolbarAction('reservedWord')}
                />
              </div>
              <div className="h-7 w-px shrink-0 bg-slate-200/80" />
              <ToolbarAction
                size="compact"
                label="Clear Styling"
                tooltip="Clear styling"
                icon={<ClearFormattingIcon />}
                onMouseDown={handleTextToolbarMouseDown}
                onClick={() => onTextToolbarAction('clear')}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
