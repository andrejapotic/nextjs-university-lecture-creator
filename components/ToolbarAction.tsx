import type { MouseEvent, ReactNode, SVGProps } from 'react';

type ToolbarActionProps = {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: 'default' | 'compact';
  tooltip?: string;
};

type IconProps = SVGProps<SVGSVGElement>;

const getIconClassName = (className?: string) =>
  className ? `h-5 w-5 ${className}` : 'h-5 w-5';

const baseButtonClass =
  'relative inline-flex items-center justify-center border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.5)] transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const defaultSizeClass = 'h-11 w-11 rounded-xl';
const compactSizeClass = 'h-10 w-10 rounded-[11px]';

const enabledButtonClass =
  'hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-700 hover:shadow-[0_22px_44px_-30px_rgba(14,165,233,0.45)] active:translate-y-0';

const activeButtonClass =
  'border-sky-300 bg-sky-50/90 text-sky-700 shadow-[0_20px_38px_-28px_rgba(14,165,233,0.55)]';

const disabledButtonClass =
  'text-slate-400/90 shadow-[0_10px_20px_-24px_rgba(15,23,42,0.45)] hover:border-slate-200/80 hover:bg-white/95 hover:text-slate-500';

export default function ToolbarAction({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
  onMouseDown,
  size = 'default',
  tooltip,
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
        aria-pressed={disabled ? undefined : active}
        onClick={handleClick}
        onMouseDown={onMouseDown}
        className={`${baseButtonClass} ${
          size === 'compact' ? compactSizeClass : defaultSizeClass
        } ${disabled ? disabledButtonClass : enabledButtonClass} ${
          active && !disabled ? activeButtonClass : ''
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
        {tooltip ?? label}
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

export function BoldIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <path d="M8 5.75h5a3.25 3.25 0 1 1 0 6.5H8zM8 12.25h6a3.5 3.5 0 1 1 0 7H8z" />
    </svg>
  );
}

export function ItalicIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <path d="M13.75 5H17M7 19h3.25M14 5 10 19" />
    </svg>
  );
}

export function UnderlineIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <path d="M8 5.5v5.75a4 4 0 1 0 8 0V5.5M6.5 19h11" />
    </svg>
  );
}

export function SuperscriptIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <path d="m6.75 16.75 4.5-5.5M6.75 11.25l4.5 5.5M14.5 8.25h3.5l-3.5 4h3.5" />
    </svg>
  );
}

export function SubscriptIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    >
      <path d="m6.75 8.75 4.5 5.5M6.75 14.25l4.5-5.5M14.5 14.5h3.5l-3.5 4h3.5" />
    </svg>
  );
}

export function OrderedListIcon(props: IconProps) {
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
      <path d="M10.5 7h7M10.5 12h7M10.5 17h7" />
      <path d="M5.75 7h1.5v4M5.25 12h2.5M5.75 16.5h2l-2 2h2" />
    </svg>
  );
}

export function UnorderedListIcon(props: IconProps) {
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
      <circle cx="6.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="17" r="1.1" fill="currentColor" stroke="none" />
      <path d="M10.5 7h7M10.5 12h7M10.5 17h7" />
    </svg>
  );
}

export function KeywordIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={getIconClassName(className)}
      {...props}
    >
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-geist-sans), sans-serif"
        fill="currentColor"
      >
        K
      </text>
    </svg>
  );
}

export function TermIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={getIconClassName(className)}
      {...props}
    >
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-geist-sans), sans-serif"
        fill="currentColor"
      >
        T
      </text>
    </svg>
  );
}

export function PhraseIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={getIconClassName(className)}
      {...props}
    >
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-geist-sans), sans-serif"
        fill="currentColor"
      >
        P
      </text>
    </svg>
  );
}

export function HighlightIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={getIconClassName(className)}
      {...props}
    >
      <path d="m8.25 5.75 10 10M6.25 17.75l5.25-5.25 3.75 3.75-5.25 5.25H6.25zM15.25 8.75l2.5-2.5 2.5 2.5-2.5 2.5z" />
      <path d="M4.75 20h7.5" />
    </svg>
  );
}

export function ForeignWordIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={getIconClassName(className)}
      {...props}
    >
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-geist-sans), sans-serif"
        fill="currentColor"
      >
        F
      </text>
    </svg>
  );
}

export function ReservedWordIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={getIconClassName(className)}
      {...props}
    >
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fontFamily="var(--font-geist-sans), sans-serif"
        fill="currentColor"
      >
        R
      </text>
    </svg>
  );
}

export function ClearFormattingIcon(props: IconProps) {
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
      <path d="M6.75 17.25h7.5M8 6.5h8l1.5 1.5-6.75 9.25H7.5zM5 5l14 14" />
    </svg>
  );
}
