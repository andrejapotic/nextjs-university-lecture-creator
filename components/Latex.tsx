import ToolbarAction, { LatexIcon } from './ToolbarAction';

type LatexProps = {
  onAdd: () => void;
};

export default function Latex({ onAdd }: LatexProps) {
  return (
    <ToolbarAction
      label="Insert LaTeX"
      tooltip="Insert LaTeX"
      icon={<LatexIcon />}
      onClick={onAdd}
    />
  );
}
