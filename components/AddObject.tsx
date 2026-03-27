type AddObjectProps = {
  onAdd: () => void;
};

export default function AddObject({ onAdd }: AddObjectProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="rounded bg-slate-100 px-4 py-2 font-semibold text-slate-900 hover:bg-slate-200"
    >
      Add Object
    </button>
  );
}
