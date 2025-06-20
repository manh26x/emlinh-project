// src/hooks/useBlinkLogic.ts
import { useCurrentFrame, interpolate } from 'remotion';

export interface BlinkLogicParams {
  blinkIntervalFrames?: number;
  blinkDurationFrames?: number;
}

export const useBlinkLogic = ({
  blinkIntervalFrames = 120, // Default interval: blink every 120 frames (e.g., 4 seconds at 30fps)
  blinkDurationFrames = 9,   // Default duration: blink lasts 9 frames (e.g., 0.3 seconds at 30fps)
}: BlinkLogicParams = {}): number => {
  const remotionFrame = useCurrentFrame();
  const currentCycleFrame = remotionFrame % blinkIntervalFrames;
  let eyeInfluence = 0;

  if (currentCycleFrame < blinkDurationFrames) {
    // Simple symmetrical blink: open -> close -> open
    eyeInfluence = interpolate(
      currentCycleFrame,
      [0, blinkDurationFrames * 0.3, blinkDurationFrames * 0.7, blinkDurationFrames],
      [0, 1, 1, 0],
      { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
    );
  }
  return eyeInfluence;
};
