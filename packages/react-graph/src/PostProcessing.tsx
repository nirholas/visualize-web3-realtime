'use client';

import { memo } from 'react';
import { EffectComposer, SMAA, Bloom } from '@react-three/postprocessing';
import { HalfFloatType } from 'three';
import { useThree } from '@react-three/fiber';

export interface PostProcessingProps {
  /** Enable/disable the entire pipeline */
  enabled?: boolean;
  /** Bloom intensity (0 = off) */
  bloomIntensity?: number;
  /** Bloom luminance threshold — only pixels brighter than this glow */
  bloomThreshold?: number;
}

/**
 * Cyberpunk Neural Network post-processing:
 * - Strong UnrealBloom-style glow via low threshold + high intensity
 * - White MeshBasicMaterial nodes (value 1.0) always exceed the threshold
 * - Colored particles with HDR output (>1.0) also bloom beautifully
 * - No ambient occlusion (pitch-black scene doesn't benefit from it)
 */
const PostProcessing = memo<PostProcessingProps>(({
  enabled = true,
  bloomIntensity = 2.0,
  bloomThreshold = 0.2,
}) => {
  const gl = useThree((s) => s.gl);

  if (!enabled || gl.getContext().isContextLost()) return null;

  return (
    <EffectComposer multisampling={0} stencilBuffer={false} frameBufferType={HalfFloatType}>
      <SMAA />
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
    </EffectComposer>
  );
});
PostProcessing.displayName = 'PostProcessing';

export default PostProcessing;
