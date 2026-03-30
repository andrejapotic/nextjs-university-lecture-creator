import ToolbarAction, { CodeIcon } from './ToolbarAction';

type CodeSnippetProps = {
  onAdd: () => void;
};

export default function CodeSnippet({ onAdd }: CodeSnippetProps) {
  return (
    <ToolbarAction
      label="Add Code Snippet"
      tooltip="Insert code snippet"
      icon={<CodeIcon />}
      onClick={onAdd}
    />
  );
}
