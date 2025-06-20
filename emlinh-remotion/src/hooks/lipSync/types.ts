/**
 * Định nghĩa các kiểu dữ liệu cho LipSync hook
 */

import { SpringConfig } from "remotion";

// Định nghĩa cấu trúc mouth cue từ JSON
export interface MouthCue {
  value: string;
  start: number;
  end: number;
}

// Ánh xạ viseme sang morph target
export interface VisemeMapping {
  [key: string]: string;
}

// Thông tin về morph targets có sẵn trong model
export interface ActualMorphTargetsType {
  head: Record<string, number>;
  teeth: Record<string, number>;
}

// Tùy chọn cho lip sync - Hợp nhất từ nhiều nguồn
export interface LipSyncOptions {
  // Tùy chọn từ useRemotionLipSync
  springConfig?: Partial<SpringConfig>;
  audioOffset?: number;
  visemeOpeningDuration?: number;

  // Tùy chọn chung
  morphTargetSmoothing?: number;
  intensityFactor?: number;
  expressiveness?: number;
  noiseThreshold?: number;
  neutralIntensity?: number;
  transitionDuration?: number;
  blendFactor?: number;
  teethFactor?: number;
  interpolationSteps?: number;
  microMovements?: boolean;
  preVisemeBlend?: number;
  vietnameseMode?: boolean;
}

// Trạng thái transition
export interface TransitionState {
  active: boolean;
  startTime: number;
  sourceViseme: string;
  targetViseme: string;
  intermediateViseme: string | null;
}

// Định nghĩa kết quả trả về từ hook chính
export interface RemotionLipSyncResult {
  head: number[] | undefined;
  teeth: number[] | undefined;
}

// Định nghĩa kết quả trả về từ hook cũ (giữ lại nếu cần)
export interface LipSyncResult {
  isActive: boolean;
  currentViseme: string;
  stop: () => void;
  activate: () => void;
}
