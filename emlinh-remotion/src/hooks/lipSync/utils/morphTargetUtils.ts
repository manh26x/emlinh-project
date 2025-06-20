/**
 * Các tiện ích xử lý morph target cho animation khuôn mặt
 */
import * as THREE from 'three';

/**
 * Reset tất cả morph target trên mesh về 0
 */
export const resetMorphTargets = (
  headMesh: THREE.SkinnedMesh | null,
  teethMesh: THREE.SkinnedMesh | null,
  immediate: boolean = false,
  currentMorphValues: Record<string, number> = {}
): void => {
  // Reset head mesh
  if (headMesh && headMesh.morphTargetInfluences) {
    for (let i = 0; i < headMesh.morphTargetInfluences.length; i++) {
      if (immediate) {
        headMesh.morphTargetInfluences[i] = 0;
      } else {
        // Giảm dần về 0 một cách mượt mà
        headMesh.morphTargetInfluences[i] *= 0.85;
      }
    }
  }
  
  // Reset teeth mesh
  if (teethMesh && teethMesh.morphTargetInfluences) {
    for (let i = 0; i < teethMesh.morphTargetInfluences.length; i++) {
      if (immediate) {
        teethMesh.morphTargetInfluences[i] = 0;
      } else {
        teethMesh.morphTargetInfluences[i] *= 0.85;
      }
    }
  }
  
  // Reset giá trị đã lưu
  if (immediate && currentMorphValues) {
    Object.keys(currentMorphValues).forEach(key => {
      currentMorphValues[key] = 0;
    });
  }
};

/**
 * Áp dụng giá trị morph target cho một mesh cụ thể
 */
export const applyMorphValue = (
  mesh: THREE.SkinnedMesh | null,
  morphName: string,
  value: number,
  isTooth: boolean = false,
  teethFactor: number = 0.9,
  showDebugLogs: boolean = false
): boolean => {
  if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
    return false;
  }
  
  try {
    // In ra tất cả các morph targets có trong mesh
    if (showDebugLogs && !(mesh as any).__hasLoggedMorphTargets) {
      console.log(`=== MORPH TARGETS TRONG ${isTooth ? 'TEETH' : 'HEAD'} MESH ===`);
      console.log(Object.keys(mesh.morphTargetDictionary));
      // Đánh dấu đã log để không log lại
      (mesh as any).__hasLoggedMorphTargets = true;
    }

    if (mesh.morphTargetDictionary[morphName] !== undefined) {
      const index = mesh.morphTargetDictionary[morphName];
      const newValue = value;
      
      // Nếu là teeth mesh, áp dụng hệ số đặc biệt
      if (isTooth) {
        // Đặc biệt xử lý răng khi mở miệng rộng
        if (morphName === "viseme_AA" || morphName === "viseme_O") {
          mesh.morphTargetInfluences[index] = newValue * teethFactor;
        } else {
          mesh.morphTargetInfluences[index] = newValue * 0.9;
        }
      } else {
        mesh.morphTargetInfluences[index] = newValue;
      }
      
      // Luôn log khi áp dụng morph values có giá trị đáng kể
      if (showDebugLogs && newValue > 0.1) {
        console.log(`✅ Áp dụng morph ${morphName} (index: ${index}) cho ${isTooth ? 'teeth' : 'head'} mesh với giá trị: ${newValue.toFixed(3)}`);
      }
      
      return true;
    } else {
      // Log khi không tìm thấy morph target được yêu cầu
      if (showDebugLogs) {
        console.log(`❌ Không tìm thấy morph target "${morphName}" trong ${isTooth ? 'teeth' : 'head'} mesh!`);
      }
    }
  } catch (err) {
    if (showDebugLogs) {
      console.log(`Lỗi khi áp dụng morph target cho ${isTooth ? 'teeth' : 'head'} mesh:`, err);
    }
  }
  
  return false;
};
