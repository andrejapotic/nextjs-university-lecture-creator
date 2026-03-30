'use client';

import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { StreamLanguage, bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { csharp } from '@codemirror/legacy-modes/mode/clike';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { CodeSnippetLanguage } from './panelItemTypes';

export type CodeSnippetEditorHandle = {
  focus: () => void;
};

type CodeSnippetEditorProps = {
  language: CodeSnippetLanguage;
  onChange: (value: string) => void;
  onFocus: () => void;
  placeholderText?: string;
  value: string;
};

const CSHARP_LANGUAGE = StreamLanguage.define(csharp);

const getLanguageExtension = (language: CodeSnippetLanguage): Extension => {
  if (language === 'typescript') {
    return javascript({ typescript: true });
  }

  if (language === 'csharp') {
    return CSHARP_LANGUAGE;
  }

  if (language === 'java') {
    return java();
  }

  if (language === 'python') {
    return python();
  }

  if (language === 'sql') {
    return sql();
  }

  if (language === 'html') {
    return html();
  }

  if (language === 'css') {
    return css();
  }

  return javascript();
};

const CodeSnippetEditor = forwardRef<CodeSnippetEditorHandle, CodeSnippetEditorProps>(
  function CodeSnippetEditor(
    {
      language,
      onChange,
      onFocus,
      placeholderText = 'Write code here...',
      value,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const initialLanguageRef = useRef(language);
    const languageCompartmentRef = useRef(new Compartment());
    const onChangeRef = useRef(onChange);
    const onFocusRef = useRef(onFocus);
    const valueRef = useRef(value);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      onFocusRef.current = onFocus;
    }, [onFocus]);

    useEffect(() => {
      valueRef.current = value;
    }, [value]);

    useEffect(() => {
      const container = containerRef.current;

      if (!container) {
        return undefined;
      }

      const languageCompartment = languageCompartmentRef.current;
      const view = new EditorView({
        parent: container,
        state: EditorState.create({
          doc: valueRef.current,
          extensions: [
            EditorState.tabSize.of(4),
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            drawSelection(),
            indentOnInput(),
            bracketMatching(),
            highlightActiveLine(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            placeholder(placeholderText),
            keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
            languageCompartment.of(
              getLanguageExtension(initialLanguageRef.current)
            ),
            EditorView.updateListener.of((update) => {
              if (update.focusChanged && update.view.hasFocus) {
                onFocusRef.current();
              }

              if (!update.docChanged) {
                return;
              }

              const nextValue = update.state.doc.toString();

              if (nextValue === valueRef.current) {
                return;
              }

              valueRef.current = nextValue;
              onChangeRef.current(nextValue);
            }),
          ],
        }),
      });

      editorViewRef.current = view;

      return () => {
        view.destroy();
        editorViewRef.current = null;
      };
    }, [placeholderText]);

    useEffect(() => {
      const view = editorViewRef.current;

      if (!view) {
        return;
      }

      view.dispatch({
        effects: languageCompartmentRef.current.reconfigure(
          getLanguageExtension(language)
        ),
      });
    }, [language]);

    useEffect(() => {
      const view = editorViewRef.current;

      if (!view) {
        return;
      }

      const currentValue = view.state.doc.toString();

      if (currentValue === value) {
        return;
      }

      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }, [value]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editorViewRef.current?.focus();
        },
      }),
      []
    );

    return <div ref={containerRef} className="code-snippet-editor h-full min-h-0" />;
  }
);

export default CodeSnippetEditor;
