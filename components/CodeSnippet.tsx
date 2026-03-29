import ToolbarAction, { CodeIcon } from './ToolbarAction';

export default function CodeSnippet() {
  return <ToolbarAction label="Add Code Snippet" icon={<CodeIcon />} disabled />;
}
