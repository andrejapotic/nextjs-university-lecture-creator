import ToolbarAction, { TextboxIcon } from './ToolbarAction';

type TextboxProps = {
  onAdd: () => void;
};

export default function Textbox({ onAdd }: TextboxProps) {
  return (
    <ToolbarAction label="Add Textbox" icon={<TextboxIcon />} onClick={onAdd} />
  );
}
