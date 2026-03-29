'use client';

import { useEffect, useRef, useState } from 'react';

type LayoutOption = 'blank' | 'split' | 'thirds';

type SectionProps = {
  layout: LayoutOption;
  onLayoutChange: (layout: LayoutOption) => void;
};

const options: Array<{
  description: string;
  label: string;
  value: LayoutOption;
}> = [
  {
    label: 'Blank',
    value: 'blank',
    description: 'Single open panel',
  },
  {
    label: 'Split',
    value: 'split',
    description: 'Two vertical sections',
  },
  {
    label: 'Thirds',
    value: 'thirds',
    description: 'Three vertical sections',
  },
];

export default function Section({ layout, onLayoutChange }: SectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative z-20 w-fit">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)] transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100"
      >
        Layout
      </button>
      {isOpen ? (
        <div className="animate-surface-in absolute left-0 top-full mt-2 w-56 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Layout
          </div>
          <div className="flex flex-col gap-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onLayoutChange(option.value);
                  setIsOpen(false);
                }}
                className={`rounded-xl px-3 py-2 text-left transition-[transform,background-color,color] duration-200 ease-out ${
                  layout === option.value
                    ? 'bg-sky-50 text-sky-700 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.65)]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-slate-500">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
