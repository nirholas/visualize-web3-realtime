/**
 * Lightweight code transformation using Sucrase.
 * Transforms TypeScript + JSX into plain JavaScript that can be evaluated.
 * Runs synchronously — Sucrase is much lighter than esbuild-wasm.
 */

let sucrase: typeof import('sucrase') | null = null;

async function loadSucrase() {
  if (!sucrase) {
    sucrase = await import('sucrase');
  }
  return sucrase;
}

export interface CompileResult {
  success: boolean;
  code?: string;
  error?: string;
}

export async function compileCode(source: string): Promise<CompileResult> {
  try {
    const s = await loadSucrase();

    // Strip import statements — we provide modules via scope
    const strippedSource = source
      .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
      .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
      .replace(/^export\s+default\s+/gm, 'const __default__ = ')
      .replace(/^export\s+/gm, '');

    const result = s.transform(strippedSource, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'classic',
      jsxPragma: 'React.createElement',
      jsxFragmentPragma: 'React.Fragment',
      production: true,
    });

    // Wrap in a module-like function that returns the default export
    const wrappedCode = `
      ${result.code}
      return typeof __default__ !== 'undefined' ? __default__ : typeof App !== 'undefined' ? App : null;
    `;

    return { success: true, code: wrappedCode };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
