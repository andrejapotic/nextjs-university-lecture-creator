import ToolbarAction, { ObjectIcon } from './ToolbarAction';

type AddObjectProps = {
  onAdd: () => void;
};

export default function AddObject({ onAdd }: AddObjectProps) {
  return <ToolbarAction label="Add Object" icon={<ObjectIcon />} onClick={onAdd} />;
}
