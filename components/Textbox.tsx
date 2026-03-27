type TextboxProps = {
  onAdd: () => void;
};

export default function Textbox({ onAdd }: TextboxProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
    >
      Textbox
    </button>
  );
}
