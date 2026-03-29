import type { MouseEvent, ReactNode, SVGProps } from 'react';

type ToolbarActionProps = {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
};

type IconProps = SVGProps<SVGSVGElement>;

const baseButtonClass =
  'relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.5)] transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const enabledButtonClass =
  'hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-700 hover:shadow-[0_22px_44px_-30px_rgba(14,165,233,0.45)] active:translate-y-0';

const disabledButtonClass =
  'text-slate-400/90 shadow-[0_10px_20px_-24px_rgba(15,23,42,0.45)] hover:border-slate-200/80 hover:bg-white/95 hover:text-slate-500';

export default function ToolbarAction({
  disabled = false,
  icon,
  label,
  onClick,
}: ToolbarActionProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled || !onClick) {
      event.preventDefault();
      return;
    }

    onClick();
  };

  return (
    <div className="group relative flex overflow-visible">
      <button
        type="button"
        aria-label={label}
        aria-disabled={disabled}
        onClick={handleClick}
        className={`${baseButtonClass} ${
          disabled ? disabledButtonClass : enabledButtonClass
        }`}
      >
        <span
          className={`transition-transform duration-200 ease-out ${
            disabled ? '' : 'group-hover:scale-105 group-active:scale-95'
          }`}
        >
          {icon}
        </span>
        <span className="sr-only">{label}</span>
      </button>
      <div className="pointer-events-none absolute left-1/2 top-full z-[70] mt-3 w-max -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-lg border border-slate-800/80 bg-slate-950/95 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.85)] backdrop-blur transition duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {label}
      </div>
    </div>
  );
}

export function ObjectIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <path d="M8 4.75h9.25A1.75 1.75 0 0 1 19 6.5v9.25" />
      <rect x="5" y="8" width="11" height="11" rx="2.25" />
      <path d="M8.5 11.5h4.5M8.5 15h6.5" />
    </svg>
  );
}

export function SubobjectIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <circle cx="7" cy="7" r="2.25" />
      <circle cx="17" cy="7" r="2.25" />
      <circle cx="17" cy="17" r="2.25" />
      <path d="M9.25 7H14.75M7 9.25V14.75M7 17H14.75" />
    </svg>
  );
}

export function SectionIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <rect x="4.5" y="5.5" width="15" height="13" rx="2.25" />
      <path d="M10.25 5.5v13M15 5.5v13" />
    </svg>
  );
}

export function TextboxIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <rect x="4.5" y="5" width="15" height="14" rx="2.25" />
      <path d="M8 9.5h8M8 13h8M8 16.5h5" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <rect x="4.5" y="5" width="15" height="14" rx="2.25" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m6.75 16 3.75-4 2.5 2.5 2-2 2.25 3.5" />
    </svg>
  );
}

export function LatexIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <rect x="4.5" y="5" width="15" height="14" rx="2.25" />
      <text
        x="12"
        y="14.75"
        textAnchor="middle"
        fontSize="7.75"
        fontWeight="700"
        fontFamily="var(--font-geist-mono), monospace"
        fill="currentColor"
        stroke="none"
      >
        fx
      </text>
    </svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <path d="m8.5 9-3 3 3 3M15.5 9l3 3-3 3M13 8l-2 8" />
    </svg>
  );
}
