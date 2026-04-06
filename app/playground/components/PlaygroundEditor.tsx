'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { EditorView } from '@codemirror/view';

interface PlaygroundEditorProps {
  code: string;
  onChange: (code: string) => void;
  error?: string | null;
}

export function PlaygroundEditor({ code, onChange, error }: PlaygroundEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track whether we're doing a programmatic update
  const suppressRef = useRef(false);

  const initEditor = useCallback(async () => {
    if (!containerRef.current) return;

    const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } =
      await import('@codemirror/view');
    const { EditorState } = await import('@codemirror/state');
    const { javascript } = await import('@codemirror/lang-javascript');
    const { oneDark } = await import('@codemirror/theme-one-dark');
    const { defaultKeymap, history, historyKeymap } = await import('@codemirror/commands');
    const { closeBrackets, closeBracketsKeymap } = await import('@codemirror/autocomplete');
    const { syntaxHighlighting, defaultHighlightStyle, bracketMatching } =
      await import('@codemirror/language');

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !suppressRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        javascript({ jsx: true, typescript: true }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        oneDark,
        keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap]),
        updateListener,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13px',
            fontFamily: '"IBM Plex Mono", monospace',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: '"IBM Plex Mono", monospace',
          },
          '.cm-content': {
            padding: '12px 0',
          },
          '.cm-gutters': {
            backgroundColor: '#1a1a2e',
            borderRight: '1px solid rgba(255,255,255,0.08)',
          },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize once

  useEffect(() => {
    initEditor();
    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [initEditor]);

  // Update editor content when code prop changes externally (preset switch)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== code) {
      suppressRef.current = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
      suppressRef.current = false;
    }
  }, [code]);

  return (
    <div className="flex flex-col h-full relative">
      <div ref={containerRef} className="flex-1 overflow-hidden" />
      {error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-900/90 text-red-200 px-4 py-3 text-xs font-mono border-t border-red-700/50 max-h-[120px] overflow-auto">
          <div className="font-semibold mb-1 text-red-300">Compilation Error</div>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}
    </div>
  );
}
