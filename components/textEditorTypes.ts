export type SemanticTextStyle =
  | 'keyword'
  | 'term'
  | 'phrase'
  | 'highlight'
  | 'foreignWord'
  | 'reservedWord';

export type TextToolbarAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'superscript'
  | 'subscript'
  | 'orderedList'
  | 'unorderedList'
  | SemanticTextStyle
  | 'clear';

export type TextToolbarState = {
  bold: boolean;
  hasSelection: boolean;
  italic: boolean;
  orderedList: boolean;
  semanticStyle: SemanticTextStyle | null;
  subscript: boolean;
  superscript: boolean;
  textboxId: number | null;
  underline: boolean;
  unorderedList: boolean;
  visible: boolean;
};

export const INITIAL_TEXT_TOOLBAR_STATE: TextToolbarState = {
  bold: false,
  hasSelection: false,
  italic: false,
  orderedList: false,
  semanticStyle: null,
  subscript: false,
  superscript: false,
  textboxId: null,
  underline: false,
  unorderedList: false,
  visible: false,
};
