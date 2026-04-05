// ---------------------------------------------------------------------------
// PresenterMode — Camera follow logic for multiplayer collaboration
//
// When a user clicks "follow" on another peer, their camera smoothly
// interpolates to match the followed peer's camera position and target.
// In presenter mode, one user's camera is broadcast to all followers.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { Peer } from './types';

const FOLLOW_LERP = 0.05; // Smooth follow speed

interface UsePresenterFollowOptions {
  /** The peer we're following (null = not following anyone) */
  followingPeer: Peer | null;
  /** Whether follow mode is active */
  enabled: boolean;
}

/**
 * Hook that smoothly moves the local camera to match a followed peer's camera.
 * Must be used inside an R3F Canvas.
 */
export function usePresenterFollow({ followingPeer, enabled }: UsePresenterFollowOptions): void {
  const { camera } = useThree();
  const targetPosition = useRef({ x: 0, y: 0, z: 0 });
  const targetLookAt = useRef({ x: 0, y: 0, z: 0 });
  const isFollowing = useRef(false);

  useEffect(() => {
    if (!enabled || !followingPeer) {
      isFollowing.current = false;
      return;
    }

    isFollowing.current = true;

    let animFrame: number;

    const animate = () => {
      if (!isFollowing.current || !followingPeer.camera) {
        animFrame = requestAnimationFrame(animate);
        return;
      }

      const [px, py, pz] = followingPeer.camera;
      targetPosition.current = { x: px, y: py, z: pz };

      // Lerp camera position
      camera.position.x += (targetPosition.current.x - camera.position.x) * FOLLOW_LERP;
      camera.position.y += (targetPosition.current.y - camera.position.y) * FOLLOW_LERP;
      camera.position.z += (targetPosition.current.z - camera.position.z) * FOLLOW_LERP;

      // Lerp look-at target
      if (followingPeer.cameraTarget) {
        const [tx, ty, tz] = followingPeer.cameraTarget;
        targetLookAt.current = { x: tx, y: ty, z: tz };
        camera.lookAt(
          camera.position.x + (targetLookAt.current.x - camera.position.x) * FOLLOW_LERP,
          camera.position.y + (targetLookAt.current.y - camera.position.y) * FOLLOW_LERP,
          camera.position.z + (targetLookAt.current.z - camera.position.z) * FOLLOW_LERP,
        );
      }

      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);

    return () => {
      isFollowing.current = false;
      cancelAnimationFrame(animFrame);
    };
  }, [enabled, followingPeer, camera]);
}
