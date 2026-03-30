import { useRef, type ChangeEvent } from 'react';
import ToolbarAction, { ImageIcon } from './ToolbarAction';

type ImageToolProps = {
  onAdd: (file: File) => void;
};

export default function ImageTool({ onAdd }: ImageToolProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    onAdd(file);
    event.target.value = '';
  };

  return (
    <>
      <ToolbarAction
        label="Add Image"
        tooltip="Add image"
        icon={<ImageIcon />}
        onClick={() => inputRef.current?.click()}
      />
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </>
  );
}
