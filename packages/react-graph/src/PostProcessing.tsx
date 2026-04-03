'use client';

import { memo } from 'react';
import { EffectComposer, SMAA, N8AO, Bloom } from '@react-three/postprocessing';

export interface PostProcessingProps {
  /** Enable/disable the entire pipeline */
  enabled?: boolean;
  /** Bloom intensity (0 = off) */
  bloomIntensity?: number;
  /** Bloom luminance threshold — only pixels brighter than this glow */
  bloomThreshold?: number;
  /** SSAO intensity (0 = off) */
  aoIntensity?: number;
}

const PostProcessing = memo<PostProcessingProps>(({
  enabled = true,
  bloomIntensity = 0.4,
  bloomThreshold = 0.85,
  aoIntensity = 0.5,
}) => {
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0}>
      {/* SMAA replaces hardware MSAA — better quality, compatible with post-processing */}
      <SMAA />

      {/* N8AO is a high-performance SSAO implementation optimized for R3F */}
      <N8AO
        aoRadius={0.5}
        intensity={aoIntensity}
        distanceFalloff={0.5}
        halfRes
      />

      {/* Bloom — selective glow on bright/emissive elements */}
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
    </EffectComposer>
  );
});
PostProcessing.displayName = 'PostProcessing';

export default PostProcessing;
