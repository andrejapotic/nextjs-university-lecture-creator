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
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
      >
        Section
      </button>
      {isOpen ? (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-md border border-gray-300 bg-white p-2 shadow-lg">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
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
                className={`rounded-md px-3 py-2 text-left transition ${
                  layout === option.value
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
