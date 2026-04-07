'use client';

import { memo } from 'react';
import { EffectComposer, SMAA, N8AO, Bloom } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';
import { useThree } from '@react-three/fiber';

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
  bloomIntensity = 1.5,
  bloomThreshold = 0.6,
  aoIntensity = 0.8,
}) => {
  const gl = useThree((s) => s.gl);

  // Bail out if disabled or WebGL context is lost
  if (!enabled || gl.getContext().isContextLost()) return null;

  return (
    <EffectComposer multisampling={0} stencilBuffer={false} frameBufferType={HalfFloatType}>
      {/* SMAA replaces hardware MSAA — better quality, compatible with post-processing */}
      <SMAA />

      {/* N8AO is a high-performance SSAO implementation optimized for R3F */}
      <N8AO
        halfRes
        aoRadius={0.5}
        intensity={aoIntensity}
        distanceFalloff={0.5}
      />

      {/* Selective bloom — only emissive materials with toneMapped={false} exceed threshold */}
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
    </EffectComposer>
  );
});
PostProcessing.displayName = 'PostProcessing';

export default PostProcessing;
