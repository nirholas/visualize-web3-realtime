// ============================================================================
// GestureHandler — Touch gesture management for mobile
//
// Wraps the visualization with pinch-to-zoom, drag-to-pan, and tap-to-select
// using react-native-gesture-handler and react-native-reanimated.
// ============================================================================

import React, { useCallback, useRef, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  GestureDetector,
  Gesture,
  type GestureUpdateEvent,
  type PinchGestureHandlerEventPayload,
  type PanGestureHandlerEventPayload,
  type TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

/** Attempt to import expo-haptics for tap feedback */
function tryHaptics(): { impactAsync: (style: string) => Promise<void> } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-haptics');
  } catch {
    return null;
  }
}

interface GestureHandlerProps {
  children: ReactNode;
  style?: ViewStyle;
  hapticsEnabled?: boolean;
  onTap?: (x: number, y: number) => void;
  onPanUpdate?: (dx: number, dy: number) => void;
  onZoomUpdate?: (scale: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

export function GestureHandler({
  children,
  style,
  hapticsEnabled = false,
  onTap,
  onPanUpdate,
  onZoomUpdate,
  minZoom = 0.5,
  maxZoom = 4.0,
}: GestureHandlerProps) {
  const scale = useSharedValue(1);
  const savedScale = useRef(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useRef(0);
  const savedTranslateY = useRef(0);

  const handleTap = useCallback(
    (event: GestureUpdateEvent<TapGestureHandlerEventPayload>) => {
      if (hapticsEnabled) {
        const Haptics = tryHaptics();
        Haptics?.impactAsync('light').catch(() => {});
      }
      onTap?.(event.x, event.y);
    },
    [hapticsEnabled, onTap],
  );

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event: GestureUpdateEvent<PinchGestureHandlerEventPayload>) => {
      const newScale = Math.min(maxZoom, Math.max(minZoom, savedScale.current * event.scale));
      scale.value = newScale;
      onZoomUpdate?.(newScale);
    })
    .onEnd(() => {
      savedScale.current = scale.value;
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      translateX.value = savedTranslateX.current + event.translationX;
      translateY.value = savedTranslateY.current + event.translationY;
      onPanUpdate?.(event.translationX, event.translationY);
    })
    .onEnd(() => {
      savedTranslateX.current = translateX.value;
      savedTranslateY.current = translateY.value;
    });

  const tapGesture = Gesture.Tap().onEnd(handleTap);

  const composed = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(panGesture, tapGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: withSpring(scale.value, { damping: 20, stiffness: 200 }) },
    ],
  }));

  return (
    <View style={[{ flex: 1 }, style]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
