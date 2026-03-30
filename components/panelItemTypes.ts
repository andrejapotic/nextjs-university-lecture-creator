export type PanelItemType = 'textbox' | 'image' | 'latex' | 'codeSnippet';

export type PanelItemFrame = {
  height: number | null;
  locked: boolean;
  width: number | null;
  x: number | null;
  y: number | null;
  zIndex: number;
};

export type PanelItemBase<TType extends PanelItemType> = PanelItemFrame & {
  id: number;
  type: TType;
};

export type TextboxPanelItem = PanelItemBase<'textbox'> & {
  section: number;
  text: string;
};

export type ImagePanelItem = PanelItemBase<'image'> & {
  altText: string;
  aspectRatio: number;
  height: number;
  section: number;
  src: string;
  width: number;
  x: number;
  y: number;
};

export type ImageInsertRequest = {
  file: File;
  id: number;
};

export type PanelContentItem = {
  id: number;
  section: number;
  type: 'image' | 'textbox';
};

export type LatexPanelItem = PanelItemBase<'latex'> & {
  expression: string;
};

export type CodeSnippetPanelItem = PanelItemBase<'codeSnippet'> & {
  code: string;
  language: string;
};

export type PanelItem =
  | TextboxPanelItem
  | ImagePanelItem
  | LatexPanelItem
  | CodeSnippetPanelItem;

export type PanelItemShellState = Pick<
  PanelItem,
  'height' | 'id' | 'locked' | 'type' | 'width' | 'x' | 'y' | 'zIndex'
> & {
  selected: boolean;
};

const PANEL_ITEM_FRAME_DEFAULTS: PanelItemFrame = {
  height: null,
  locked: false,
  width: null,
  x: null,
  y: null,
  zIndex: 0,
};

export const createTextboxPanelItem = (
  id: number,
  section: number,
  text = ''
): TextboxPanelItem => ({
  ...PANEL_ITEM_FRAME_DEFAULTS,
  id,
  section,
  text,
  type: 'textbox',
});

export const createImagePanelItem = ({
  altText,
  aspectRatio,
  height,
  id,
  section,
  src,
  width,
  x,
  y,
  zIndex = 1,
}: {
  altText: string;
  aspectRatio: number;
  height: number;
  id: number;
  section: number;
  src: string;
  width: number;
  x: number;
  y: number;
  zIndex?: number;
}): ImagePanelItem => ({
  ...PANEL_ITEM_FRAME_DEFAULTS,
  altText,
  aspectRatio,
  height,
  id,
  section,
  src,
  type: 'image',
  width,
  x,
  y,
  zIndex,
});

export const createPanelContentItem = (
  id: number,
  type: PanelContentItem['type'],
  section: number
): PanelContentItem => ({
  id,
  section,
  type,
});

export const createPanelItemShellState = (
  item: PanelItem,
  selected = false
): PanelItemShellState => ({
  height: item.height,
  id: item.id,
  locked: item.locked,
  selected,
  type: item.type,
  width: item.width,
  x: item.x,
  y: item.y,
  zIndex: item.zIndex,
});
