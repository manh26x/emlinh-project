// src/hooks/lipSync/useRemotionLipSync.tsx
import { useRef } from 'react';
import { useCurrentFrame, spring } from 'remotion';
import { DEFAULT_LIPSYNC_OPTIONS, VISEME_MAPPING, NEUTRAL_VISEME_NAME } from './constants';
import { findVisemeAtTime } from './visemeProcessor';
import { useMouthCues } from './useMouthCues';
import { LipSyncOptions, RemotionLipSyncResult } from './types';

const LOG_PREFIX = "[useRemotionLipSync]";
const LOG_INTERVAL = 60;

export const useRemotionLipSync = (
  mouthCuesUrl: string | null,
  headMorphDictionary: Record<string, number> | undefined,
  teethMorphDictionary: Record<string, number> | undefined,
  options?: LipSyncOptions
): RemotionLipSyncResult => {
  const frame = useCurrentFrame();
  const fps = 30;
  const time = frame / fps;

  const { cues, isLoading } = useMouthCues(mouthCuesUrl);

  const {
    audioOffset,
    intensityFactor,
    neutralIntensity,
    teethFactor,
    visemeOpeningDuration,
    preVisemeBlend,
    springConfig,
  } = { ...DEFAULT_LIPSYNC_OPTIONS, ...options };

  const headInfluences = useRef<number[]>([]);
  const teethInfluences = useRef<number[]>([]);
  
  const visemeRef = useRef<string>('neutral');
  const timerRef = useRef(0);
  const phaseRef = useRef<'start' | 'middle' | 'end' | 'between'>('between');
  const lastFrameRef = useRef<number>(-1);

  if (isLoading || !cues || !headMorphDictionary || !teethMorphDictionary) {
    const headCount = headMorphDictionary ? Object.keys(headMorphDictionary).length : 0;
    const teethCount = teethMorphDictionary ? Object.keys(teethMorphDictionary).length : 0;
    return { 
      head: new Array(headCount).fill(0), 
      teeth: new Array(teethCount).fill(0) 
    };
  }

  if (headInfluences.current.length === 0 && headMorphDictionary) {
      headInfluences.current = new Array(Object.keys(headMorphDictionary).length).fill(0);
  }
  if (teethInfluences.current.length === 0 && teethMorphDictionary) {
      teethInfluences.current = new Array(Object.keys(teethMorphDictionary).length).fill(0);
  }

  let intensity = 0.0;
  let activeViseme = 'neutral';

  if (cues.length > 0 && frame !== lastFrameRef.current) {
    const dt = 1 / fps;
    const found = findVisemeAtTime(time + audioOffset, cues, preVisemeBlend, visemeRef.current, () => {}) || 'neutral';
    
    if (visemeRef.current !== found) {
      visemeRef.current = found;
      phaseRef.current = 'start';
      timerRef.current = 0;
    } else {
      timerRef.current += dt;
    }

    activeViseme = visemeRef.current;
    if (activeViseme !== 'neutral') {
      if (phaseRef.current === 'start') {
        intensity = Math.min(timerRef.current / visemeOpeningDuration, 1.0);
        if (timerRef.current >= visemeOpeningDuration) phaseRef.current = 'middle';
      } else {
        intensity = 1.0;
      }
    } else {
      intensity = 1.0;
      phaseRef.current = 'between';
    }
    lastFrameRef.current = frame;
  }

  const actualViseme = VISEME_MAPPING[activeViseme] || VISEME_MAPPING.default;

  for (const name in headMorphDictionary) {
    const i = headMorphDictionary[name];
    let target = (name === actualViseme) ? intensity * intensityFactor : 
                 (name === NEUTRAL_VISEME_NAME) ? (1 - intensity) * neutralIntensity : 0;
    if (activeViseme === NEUTRAL_VISEME_NAME) target = neutralIntensity;
    headInfluences.current[i] = spring({ frame, fps, from: headInfluences.current[i], to: target, config: springConfig });
  }

  for (const name in teethMorphDictionary) {
    const i = teethMorphDictionary[name];
    let target = (name === actualViseme) ? intensity * intensityFactor * teethFactor : 0;
    if (activeViseme === NEUTRAL_VISEME_NAME) target = neutralIntensity * teethFactor;
    teethInfluences.current[i] = spring({ frame, fps, from: teethInfluences.current[i], to: target, config: springConfig });
  }

  if (frame % LOG_INTERVAL === 0) {
    console.log(LOG_PREFIX, `Frame ${frame} - ActiveViseme: ${activeViseme}, TargetViseme: ${actualViseme}, Intensity: ${intensity.toFixed(3)}`);
  }

  return {
    head: headInfluences.current,
    teeth: teethInfluences.current,
  };
};
