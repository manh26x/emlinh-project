/**
 * Tiện ích áp dụng viseme cho avatar
 */
import * as THREE from 'three';
import { VISEME_MAPPING } from '../constants';
import { findFaceMeshes } from '../visemeProcessor';
import { resetMorphTargets, applyMorphValue } from './morphTargetUtils';

/**
 * Interface cho các tùy chọn áp dụng viseme
 */
interface VisemeApplyOptions {
  intensityFactor: number;
  expressiveness: number;
  neutralIntensity: number;
  teethFactor: number;
  microMovements: boolean;
  vietnameseMode: boolean;
  showDebugLogs: boolean;
}

/**
 * Áp dụng viseme cho avatar với các tùy chọn
 */
export const applyVisemeToAvatar = (
  avatarGroup: THREE.Group | null,
  visemeKey: string,
  intensity: number = 1.0,
  options: VisemeApplyOptions,
  hasScannedMorphTargets: React.MutableRefObject<boolean>,
  currentMorphValues: Record<string, number>
): void => {
  if (!visemeKey || !avatarGroup) {
    if (options.showDebugLogs) {
      console.log("applyVisemeToAvatar: Không có visemeKey hoặc avatarGroup!");
    }
    return;
  }
  
  if (options.showDebugLogs && Math.random() < 0.05) {
    console.log(`applyVisemeToAvatar: Áp dụng viseme "${visemeKey}" cho avatar (cường độ: ${intensity})`);
  }
  
  // Lấy head và teeth mesh
  const { headMesh, teethMesh } = findFaceMeshes(avatarGroup);
  if (!headMesh) return;
  
  // Scan morph targets nếu chưa có
  if (avatarGroup && !hasScannedMorphTargets.current) {
    scanMorphTargets(headMesh as THREE.SkinnedMesh, teethMesh as THREE.SkinnedMesh | null);
    hasScannedMorphTargets.current = true;
  }
  
  // Nếu là trạng thái neutral, reset các morph target về 0
  if (visemeKey === 'neutral') {
    resetMorphTargets(headMesh as THREE.SkinnedMesh, teethMesh as THREE.SkinnedMesh, false, currentMorphValues);
    return;
  }
  
  // Lấy morph target name dựa trên viseme key
  const morphMapping = VISEME_MAPPING[visemeKey] || {};
  
  // Áp dụng cho từng morph target trong mapping
  Object.entries(morphMapping).forEach(([morphName, value]) => {
    // Tính toán cường độ cuối cùng dựa trên các hệ số
    const finalIntensity = intensity * 
                          (options.intensityFactor || 1.0) * 
                          (options.expressiveness || 1.0) *
                          (typeof value === 'number' ? value : 1.0);
                          
    // Lưu giá trị morphTarget hiện tại
    currentMorphValues[morphName] = finalIntensity;
    
    // Áp dụng cho head mesh
    applyMorphValue(
      headMesh as THREE.SkinnedMesh,
      morphName,
      finalIntensity,
      false,
      options.teethFactor,
      options.showDebugLogs
    );
    
    // Áp dụng cho teeth mesh nếu có
    if (teethMesh) {
      applyMorphValue(
        teethMesh as THREE.SkinnedMesh,
        morphName,
        finalIntensity,
        true,
        options.teethFactor,
        options.showDebugLogs
      );
    }
  });
};

/**
 * Scan và log tất cả morph target có trong model
 */
export const scanMorphTargets = (
  headMesh: THREE.SkinnedMesh | null,
  teethMesh: THREE.SkinnedMesh | null
): void => {
  console.log("==== SCANNING MORPH TARGETS ====");
  
  if (headMesh && headMesh.morphTargetDictionary) {
    console.log("Head Mesh Morph Targets:", Object.keys(headMesh.morphTargetDictionary));
  } else {
    console.log("Không tìm thấy morph target trong head mesh");
  }
  
  if (teethMesh && teethMesh.morphTargetDictionary) {
    console.log("Teeth Mesh Morph Targets:", Object.keys(teethMesh.morphTargetDictionary));
  } else {
    console.log("Không tìm thấy morph target trong teeth mesh");
  }
  
  console.log("==== FINISHED SCANNING ====");
};
