/**
 * Các hàm tiện ích cho LipSync
 */

import { DRASTIC_VISEME_PAIRS, INTERMEDIATE_VISEME_MAP } from './constants';

// Các hàm easing để làm mượt chuyển động
export const easeInQuad = (t: number): number => t * t;
export const easeOutQuad = (t: number): number => t * (2 - t);
export const easeInOutQuad = (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
export const easeOutCubic = (t: number): number => (--t) * t * t + 1;
export const easeOutElastic = (t: number): number => {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p/4) * (2 * Math.PI) / p) + 1;
};
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Làm mềm giữa giá trị hiện tại và giá trị mới với đường cong ease-in-out được cải tiến
export const smoothValue = (current: number, target: number, smoothingFactor: number): number => {
  // Sử dụng Hermite interpolation cho đường cong mượt hơn
  const t = Math.min(1, smoothingFactor);
  const t2 = t * t;
  const t3 = t2 * t;
  const easedT = 3 * t2 - 2 * t3; // Hermite curve
  return current + (target - current) * easedT;
};

// Hàm nội suy mượt mà
export const smoothInterpolation = (a: number, b: number, t: number): number => {
  // Sử dụng spline nội suy
  const t2 = t * t;
  const t3 = t2 * t;
  return a * (2*t3 - 3*t2 + 1) + b * (3*t2 - 2*t3);
};

// Hàm kiểm tra xem hai viseme có cần viseme trung gian không
export const needsIntermediateViseme = (source: string, target: string): boolean => {
  // Kiểm tra xem cặp viseme có trong danh sách không
  return DRASTIC_VISEME_PAIRS.some(pair => 
    (pair.from === source && pair.to === target) ||
    (pair.from === target && pair.to === source)
  );
};

// Hàm tìm viseme trung gian giữa hai viseme
export const findIntermediateViseme = (source: string, target: string): string => {
  // Lấy viseme trung gian từ bảng ánh xạ
  const key = `${source}_${target}`;
  return INTERMEDIATE_VISEME_MAP[key] || source;
};
