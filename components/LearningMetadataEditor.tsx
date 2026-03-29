type LearningMetadataEditorProps = {
  lectureDescription: string;
  lectureLength: string;
  lectureTitle: string;
  nodeType: 'object' | 'subobject';
  onLectureDescriptionChange: (value: string) => void;
  onLectureLengthChange: (value: string) => void;
  onLectureTitleChange: (value: string) => void;
};

const getHeading = (nodeType: LearningMetadataEditorProps['nodeType']) =>
  nodeType === 'object' ? 'Learning Object' : 'Learning Subobject';

export default function LearningMetadataEditor({
  lectureDescription,
  lectureLength,
  lectureTitle,
  nodeType,
  onLectureDescriptionChange,
  onLectureLengthChange,
  onLectureTitleChange,
}: LearningMetadataEditorProps) {
  return (
    <div className="animate-editor-in w-full max-w-3xl rounded-[28px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_36px_80px_-52px_rgba(15,23,42,0.42)] backdrop-blur-xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {getHeading(nodeType)}
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {getHeading(nodeType)} Details
          </h1>
        </div>
        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          {nodeType}
        </div>
      </div>
      <div className="space-y-6">
        <label className="block">
          <div className="mb-2 text-sm font-medium text-slate-700">Lecture title</div>
          <input
            type="text"
            value={lectureTitle}
            onChange={(event) => onLectureTitleChange(event.target.value)}
            placeholder="Lecture title"
            className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 outline-none transition-[border-color,box-shadow,transform] duration-200 ease-out placeholder:text-slate-400 focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm font-medium text-slate-700">Lecture length</div>
          <input
            type="text"
            value={lectureLength}
            onChange={(event) => onLectureLengthChange(event.target.value)}
            placeholder="Lecture length"
            className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-base text-slate-900 outline-none transition-[border-color,box-shadow,transform] duration-200 ease-out placeholder:text-slate-400 focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm font-medium text-slate-700">
            Lecture description
          </div>
          <textarea
            value={lectureDescription}
            onChange={(event) => onLectureDescriptionChange(event.target.value)}
            placeholder="Lecture description"
            rows={8}
            className="w-full resize-none rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none transition-[border-color,box-shadow,transform] duration-200 ease-out placeholder:text-slate-400 focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
          />
        </label>
      </div>
    </div>
  );
}
