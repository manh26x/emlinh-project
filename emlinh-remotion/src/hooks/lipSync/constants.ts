/**
 * Các hằng số và ánh xạ viseme cho LipSync
 */

import { VisemeMapping } from './types';
import { SpringConfig } from 'remotion';
import { LipSyncOptions } from './types';

// Ánh xạ viseme thành morphTarget trong model
// Thay đổi tên morphTarget cho phù hợp với model ReadyPlayerMe
export const VISEME_MAPPING: VisemeMapping = {
  A: "viseme_PP",   // P, B, M (đóng môi)
  B: "viseme_kk",   // K, G (mở hẹp phía sau)
  C: "viseme_I",    // I (mỉm cười hẹp)
  D: "viseme_aa",   // A (miệng mở rộng) - sửa thành chữ thường viseme_aa
  E: "viseme_O",    // O (miệng tròn)
  F: "viseme_U",    // U (miệng tròn nhỏ)
  G: "viseme_FF",   // F, V (răng chạm môi)
  H: "viseme_TH",   // TH (lưỡi chạm răng)
  X: "viseme_sil",  // Mặc định/Im lặng - sửa thành viseme_sil
  
  // Thêm các ánh xạ thay thế phổ biến
  "PP": "viseme_PP", 
  "KK": "viseme_kk",
  "I": "viseme_I",
  "AA": "viseme_aa", // Sửa thành chữ thường
  "O": "viseme_O", 
  "U": "viseme_U",
  "FF": "viseme_FF",
  "TH": "viseme_TH",
  
  // Thêm trạng thái tự nhiên (khác với ngậm chặt)
  "neutral": "viseme_sil", // Sửa thành viseme_sil
  
  // Fallbacks để xử lý viseme không tìm thấy
  "default": "viseme_sil"
};

// Danh sách các cặp viseme có sự khác biệt lớn
export const DRASTIC_VISEME_PAIRS = [
  // Từ miệng đóng sang mở rộng
  { from: 'A', to: 'D' }, { from: 'D', to: 'A' },
  { from: 'X', to: 'D' }, { from: 'D', to: 'X' },
  { from: 'A', to: 'E' }, { from: 'E', to: 'A' },
  // Từ miệng cười sang tròn
  { from: 'C', to: 'E' }, { from: 'E', to: 'C' },
  { from: 'C', to: 'F' }, { from: 'F', to: 'C' },
  // Từ miệng mở rộng sang tròn
  { from: 'D', to: 'E' }, { from: 'E', to: 'D' },
  { from: 'D', to: 'F' }, { from: 'F', to: 'D' },
];

// Bảng viseme trung gian
export const INTERMEDIATE_VISEME_MAP: Record<string, string> = {
  // Giữa đóng và mở
  'A_D': 'B',  // Giữa PP và AA: kk
  'D_A': 'B',
  'X_D': 'B',
  'D_X': 'B',
  // Giữa mở rộng và tròn
  'D_E': 'C',  // Giữa AA và O: I
  'E_D': 'C',
  'D_F': 'E',  // Giữa AA và U: O
  'F_D': 'E',
  // Giữa cười và tròn
  'C_E': 'B',  // Giữa I và O: kk
  'E_C': 'B',
  'C_F': 'E',  // Giữa I và U: O
  'F_C': 'E'
};

// Tùy chọn mặc định cho LipSync - Giờ đây sẽ implement LipSyncOptions
export const DEFAULT_LIPSYNC_OPTIONS: Required<Omit<LipSyncOptions, 'springConfig'>> & { springConfig: Partial<SpringConfig> } = {
  // Mặc định từ useRemotionLipSync
  audioOffset: -0.12,
  visemeOpeningDuration: 0.08,
  
  // Mặc định từ tệp gốc
  morphTargetSmoothing: 0.001,
  intensityFactor: 1,
  expressiveness: 0.5,
  noiseThreshold: 5,
  neutralIntensity: 0.025,
  transitionDuration: 0.05,
  blendFactor: 0.035,
  teethFactor: 0.9, // Hợp nhất giá trị
  interpolationSteps: 3,
  microMovements: true,
  preVisemeBlend: 0.15,
  vietnameseMode: true,
  
  // Cấu hình spring mặc định
  springConfig: {
    stiffness: 100,
    damping: 16,
    mass: 0.2,
  },
};

export const NEUTRAL_VISEME_NAME = VISEME_MAPPING.default;
