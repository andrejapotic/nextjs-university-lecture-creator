import ToolbarAction, { LatexIcon } from './ToolbarAction';

export default function Latex() {
  return <ToolbarAction label="Insert LaTeX" icon={<LatexIcon />} disabled />;
}
