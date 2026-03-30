'use client';

import type { InsertOptions, MathfieldElement } from 'mathlive';
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export type LatexMathEditorHandle = {
  clear: () => void;
  focus: () => void;
  insert: (latex: string, options?: InsertOptions) => void;
};

type LatexMathEditorProps = {
  ariaLabel: string;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

const DEFAULT_INSERT_OPTIONS: InsertOptions = {
  focus: true,
  format: 'latex',
  selectionMode: 'placeholder',
};

const LatexMathEditor = forwardRef<LatexMathEditorHandle, LatexMathEditorProps>(
  function LatexMathEditor(
    { ariaLabel, autoFocus = false, onChange, placeholder, value },
    ref
  ) {
    const mathFieldRef = useRef<MathfieldElement | null>(null);
    const onChangeRef = useRef(onChange);
    const valueRef = useRef(value);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      valueRef.current = value;
    }, [value]);

    useEffect(() => {
      let cancelled = false;

      import('mathlive')
        .then(() => {
          if (!cancelled) {
            setIsReady(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIsReady(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      const mathField = mathFieldRef.current;

      if (!mathField) {
        return;
      }

      mathField.menuItems = [];
      mathField.mathVirtualKeyboardPolicy = 'manual';
      mathField.placeholder = placeholder ?? '';
      mathField.readOnly = false;
      mathField.smartFence = true;
      mathField.smartMode = true;
      mathField.smartSuperscript = true;

      const handleInput = () => {
        const nextValue = mathField.getValue('latex');

        if (nextValue === valueRef.current) {
          return;
        }

        valueRef.current = nextValue;
        onChangeRef.current(nextValue);
      };

      mathField.addEventListener('input', handleInput);
      mathField.addEventListener('change', handleInput);

      if (mathField.getValue('latex') !== valueRef.current) {
        mathField.setValue(valueRef.current, {
          mode: 'math',
          silenceNotifications: true,
        });
      }

      return () => {
        mathField.removeEventListener('input', handleInput);
        mathField.removeEventListener('change', handleInput);
      };
    }, [isReady, placeholder]);

    useEffect(() => {
      if (!isReady) {
        return;
      }

      const mathField = mathFieldRef.current;

      if (!mathField) {
        return;
      }

      if (mathField.getValue('latex') === value) {
        return;
      }

      mathField.setValue(value, {
        mode: 'math',
        silenceNotifications: true,
      });
    }, [isReady, value]);

    useEffect(() => {
      if (!autoFocus || !isReady) {
        return;
      }

      const frameId = window.requestAnimationFrame(() => {
        mathFieldRef.current?.focus();
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }, [autoFocus, isReady]);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          const mathField = mathFieldRef.current;

          if (!mathField) {
            return;
          }

          valueRef.current = '';
          mathField.setValue('', {
            mode: 'math',
            silenceNotifications: true,
          });
          onChangeRef.current('');
          mathField.focus();
        },
        focus: () => {
          mathFieldRef.current?.focus();
        },
        insert: (latex: string, options?: InsertOptions) => {
          const mathField = mathFieldRef.current;

          if (!mathField) {
            return;
          }

          mathField.focus();
          mathField.insert(latex, {
            ...DEFAULT_INSERT_OPTIONS,
            ...options,
          });
        },
      }),
      []
    );

    if (!isReady) {
      return (
        <div className="border border-slate-200/80 bg-slate-50/70 px-3 py-3 text-sm text-slate-500">
          Loading math editor...
        </div>
      );
    }

    return createElement('math-field', {
      'aria-label': ariaLabel,
      className: 'latex-mathfield',
      ref: (element: Element | null) => {
        mathFieldRef.current = element as MathfieldElement | null;
      },
    });
  }
);

export default LatexMathEditor;
