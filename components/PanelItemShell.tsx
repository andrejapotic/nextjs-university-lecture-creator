import type {
  CSSProperties,
  DragEventHandler,
  MouseEventHandler,
  ReactNode,
} from 'react';
import type { PanelItemShellState } from './panelItemTypes';

type PanelItemShellProps = {
  children: ReactNode;
  className?: string;
  dropIndicator?: 'before' | 'after' | null;
  item: PanelItemShellState;
  itemRef?: (element: HTMLDivElement | null) => void;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onMouseDown?: MouseEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
};

export default function PanelItemShell({
  children,
  className,
  dropIndicator = null,
  item,
  itemRef,
  onDragOver,
  onMouseDown,
  onDrop,
  onMouseEnter,
  onMouseLeave,
  style,
}: PanelItemShellProps) {
  return (
    <div
      ref={itemRef}
      data-panel-item-id={item.id}
      data-panel-item-locked={item.locked ? 'true' : 'false'}
      data-panel-item-selected={item.selected ? 'true' : 'false'}
      data-panel-item-type={item.type}
      data-panel-item-z-index={item.zIndex}
      onDragOver={onDragOver}
      onMouseDown={onMouseDown}
      onDrop={onDrop}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative ${
        dropIndicator === 'before' ? 'border-t-4 border-t-blue-500' : ''
      } ${
        dropIndicator === 'after' ? 'border-b-4 border-b-blue-500' : ''
      } ${className ?? ''}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
