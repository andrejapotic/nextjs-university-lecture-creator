import ToolbarAction, { ImageIcon } from './ToolbarAction';

export default function ImageTool() {
  return <ToolbarAction label="Add Image" icon={<ImageIcon />} disabled />;
}
