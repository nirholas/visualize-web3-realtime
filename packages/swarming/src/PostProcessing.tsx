import { memo } from 'react';

interface PostProcessingProps {
  enabled: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
}

/**
 * Post-processing effects (bloom, SMAA, AO).
 *
 * Lazily imports @react-three/postprocessing since it's an optional peer dependency.
 * Falls back to null if not installed.
 */
const PostProcessing = memo<PostProcessingProps>(
  ({ enabled, bloomIntensity, bloomThreshold }) => {
    if (!enabled) return null;

    // Attempt dynamic require — bundlers will tree-shake if postprocessing is not installed
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pp = require('@react-three/postprocessing');
      const { EffectComposer, SMAA, N8AO, Bloom } = pp;

      return (
        <EffectComposer multisampling={0}>
          <SMAA />
          <N8AO aoRadius={0.5} intensity={0.5} distanceFalloff={0.5} halfRes />
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={bloomThreshold}
            luminanceSmoothing={0.2}
            mipmapBlur
          />
        </EffectComposer>
      );
    } catch {
      return null;
    }
  },
);
PostProcessing.displayName = 'PostProcessing';

export { PostProcessing };
