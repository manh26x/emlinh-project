/**
 * Xử lý viseme và áp dụng vào avatar 3D
 */

import * as THREE from 'three';
import { MouthCue, ActualMorphTargetsType } from './types';
import { VISEME_MAPPING } from './constants';
import { needsIntermediateViseme, findIntermediateViseme } from './utils';

// Variable to store detected morph targets
let actualMorphTargets: ActualMorphTargetsType | null = null;

/**
 * Tìm viseme tương ứng với thời gian hiện tại
 */
export const findVisemeAtTime = (
  time: number, 
  mouthCues: MouthCue[] | null,
  preVisemeBlend: number,
  lastViseme: string,
  startDirectTransition: (targetViseme: string, blendFactor: number) => void
): string => {
  // LUÔN LUÔN hiển thị log mỗi khi hàm được gọi
  
  if (mouthCues && mouthCues.length > 0) {
    // Hiển thị tất cả mouth cues gần thời điểm hiện tại
    const relevantCues = mouthCues
      .filter(cue => Math.abs(cue.start - time) < 1 || Math.abs(cue.end - time) < 1)
      .slice(0, 5);
    
  }
  
  if (!mouthCues || mouthCues.length === 0) {
    console.log("Không có mouth cues nào, trả về neutral");
    return 'neutral'; // Trả về trạng thái mặc định nếu không có dữ liệu
  }
  
  // Tìm viseme chính xác theo thời gian
  let matchedViseme = null;
  let matchedIndex = -1;
  
  for (let i = 0; i < mouthCues.length; i++) {
    const cue = mouthCues[i];
    if (time >= cue.start && time < cue.end) {
      matchedViseme = cue.value;
      matchedIndex = i;
      break;
    }
  }
  
  // Nếu không tìm thấy, trả về trạng thái tự nhiên
  if (matchedViseme === null) return "neutral";
  
  // Tính toán chuyển tiếp trực tiếp giữa các viseme
  if (matchedIndex >= 0) {
    const currentCue = mouthCues[matchedIndex];
    const timeInViseme = time - currentCue.start;
    const visemeDuration = currentCue.end - currentCue.start;
    
    // Bắt đầu chuyển tiếp sớm hơn
    if (timeInViseme > visemeDuration * (1 - preVisemeBlend) && matchedIndex < mouthCues.length - 1) {
      const nextCue = mouthCues[matchedIndex + 1];
      const nextViseme = nextCue.value;
      
      // Nếu viseme hiện tại khác với viseme tiếp theo, bắt đầu chuyển tiếp
      if (matchedViseme !== nextViseme && nextViseme !== lastViseme) {
        // Tính toán mức độ pha trộn dựa trên vị trí thời gian
        const blendPosition = (timeInViseme - (visemeDuration * (1 - preVisemeBlend))) / (visemeDuration * preVisemeBlend);
        
        // Chuyển đổi trực tiếp từ viseme hiện tại sang viseme tiếp theo
        if (blendPosition > 0) {
          startDirectTransition(nextViseme, blendPosition);
          
          // Nếu viseme hiện tại và tiếp theo có sự khác biệt lớn
          if (needsIntermediateViseme(matchedViseme, nextViseme)) {
            const intermediateViseme = findIntermediateViseme(matchedViseme, nextViseme);
            return intermediateViseme;
          }
          
          // Nếu không cần viseme trung gian, bắt đầu trả về viseme tiếp theo
          return nextViseme;
        }
      }
    }
  }
  
  return matchedViseme;
};

/**
 * Quét các mesh để xác định morph targets có thể sử dụng cho lip-sync
 */
export function scanMorphTargets(avatarGroup: THREE.Group | null): void {
  if (!avatarGroup) {
    console.error("scanMorphTargets: avatarGroup là null!");
    return;
  }
  
  const faceMeshes = findFaceMeshes(avatarGroup);
  if (!faceMeshes.headMesh || !faceMeshes.teethMesh) {
    console.error("Không tìm thấy headMesh hoặc teethMesh!");
    // In ra tất cả các mesh con để kiểm tra
    console.log("Tất cả các mesh con:");
    avatarGroup.traverse((child) => {
      if (child.type === 'SkinnedMesh' || child.type === 'Mesh') {
        console.log(` - ${child.name}`);
      }
    });
    return;
  }
}

/**
 * Quét các morph targets của avatar để map với viseme
 * @param avatarGroup - Group chứa mesh đầu và răng
 */
export const scanMorphTargetsMap = (avatarGroup: THREE.Group | null): ActualMorphTargetsType => {
  if (!avatarGroup) return actualMorphTargets!;
  if (!actualMorphTargets) {
    actualMorphTargets = { head: {}, teeth: {} };
    
    avatarGroup.traverse((object) => {
      // Kiểm tra mesh bằng cách kiểm tra type và các thuộc tính
      const isMesh = object.type === 'Mesh';
      if (isMesh) {
        const mesh = object as THREE.Mesh;
        if (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).length > 0) {
          if (object.name === 'Wolf3D_Head') {
            actualMorphTargets!.head = {...mesh.morphTargetDictionary};
          } else if (object.name === 'Wolf3D_Teeth') {
            actualMorphTargets!.teeth = {...mesh.morphTargetDictionary};
          }
        }
      }
    });
  }
  
  return actualMorphTargets;
};

/**
 * Tìm kiếm mesh của đầu và răng
 */
export const findFaceMeshes = (avatarGroup: THREE.Group | null): { headMesh: THREE.Object3D | null, teethMesh: THREE.Object3D | null } => {
  if (!avatarGroup) {
    console.log("findFaceMeshes: avatarGroup là null!");
    return { headMesh: null, teethMesh: null };
  }
  
  let headMesh: THREE.Object3D | null = null;
  let teethMesh: THREE.Object3D | null = null;
  
  avatarGroup.traverse((object: THREE.Object3D) => {
    // Kiểm tra mọi loại mesh (Mesh, SkinnedMesh)
    const isMesh = object.type === 'Mesh' || object.type === 'SkinnedMesh';
    
    if (isMesh) {
      
      if (object.name === 'Wolf3D_Head') {
        headMesh = object;
        // Type assertion để truy cập morphTargetDictionary
        const skinnedMesh = object as THREE.SkinnedMesh;

      } else if (object.name === 'Wolf3D_Teeth') {
        teethMesh = object;
        // Type assertion để truy cập morphTargetDictionary
        const skinnedMesh = object as THREE.SkinnedMesh;

      }
    }
  });
  
  return { headMesh, teethMesh };
};

/**
 * Tính toán cường độ cho từng viseme
 */
export const calculateVisemeIntensity = (
  visemeKey: string,
  morphName: string,
  targetMorphName: string,
  options: {
    intensityFactor: number;
    expressiveness: number;
    neutralIntensity: number;
    vietnameseMode: boolean;
    microMovements: boolean;
  },
  intensity = 1.0
): number => {
  const { 
    intensityFactor, 
    expressiveness, 
    neutralIntensity,
    vietnameseMode,
    microMovements
  } = options;
  
  // Thêm vi chuyển động ngẫu nhiên để tăng tính tự nhiên nếu được kích hoạt
  const microMovement = microMovements ? 
    (Math.sin(Date.now() * 0.005) * 0.01 + Math.sin(Date.now() * 0.0023) * 0.005) : 0;
  
  // Hệ số điều chỉnh cho tiếng Việt
  const vietnameseFactor = vietnameseMode ? 0.85 : 1.0;
  
  // Trường hợp đặc biệt cho trạng thái neutral
  if (visemeKey === "neutral") {
    if (morphName === VISEME_MAPPING.neutral) {
      return neutralIntensity * intensity;
    }
    return 0;
  }
  
  // Xử lý đặc biệt cho viseme D (miệng mở rộng - viseme_AA)
  if (visemeKey === "D" && morphName === targetMorphName) {
    // Giảm đáng kể độ mở miệng cho âm A trong tiếng Việt
    return intensityFactor * 0.9 * expressiveness * intensity * vietnameseFactor + microMovement;
  }
  
  // Nếu là viseme đích, áp dụng cường độ chính
  if (morphName === targetMorphName) {
    // Điều chỉnh từng loại viseme riêng biệt
    if (morphName === "viseme_AA") {
      // Giảm mạnh hơn cho nguyên âm A trong tiếng Việt
      return intensityFactor * 0.9 * expressiveness * intensity * vietnameseFactor + microMovement;
    } else if (morphName === "viseme_O" || morphName === "viseme_U") {
      // Giảm độ tròn môi cho O, U trong tiếng Việt
      return intensityFactor * 0.85 * expressiveness * intensity * vietnameseFactor + microMovement;
    } else if (morphName === "viseme_I") {
      // Giảm độ rộng môi cho I trong tiếng Việt
      return intensityFactor * 0.9 * expressiveness * intensity * vietnameseFactor + microMovement;
    }
    
    return intensityFactor * expressiveness * intensity * vietnameseFactor + microMovement;
  }
  
  // Nếu là viseme neutral (PP), luôn giữ một chút để miệng không đóng hoàn toàn
  if (morphName === "viseme_PP" && visemeKey !== "A" && visemeKey !== "X") {
    return neutralIntensity * intensity;
  }
  
  // Áp dụng các viseme phụ trợ để tạo chuyển động tự nhiên
  if (targetMorphName === "viseme_AA" && morphName === "viseme_O") {
    return intensityFactor * 0.18 * expressiveness * intensity * vietnameseFactor;
  }
  
  if (targetMorphName === "viseme_O" && morphName === "viseme_U") {
    return intensityFactor * 0.25 * expressiveness * intensity * vietnameseFactor;
  }
  
  // Khi viseme là B (viseme_kk), cũng áp dụng một chút AA để mở hàm dưới
  if (targetMorphName === "viseme_kk" && morphName === "viseme_AA") {
    return intensityFactor * 0.2 * expressiveness * intensity * vietnameseFactor;
  }
  
  // Thêm blend giữa viseme I và AA để cử động tự nhiên hơn
  if (targetMorphName === "viseme_I" && morphName === "viseme_AA") {
    return intensityFactor * 0.12 * expressiveness * intensity * vietnameseFactor;
  }
  
  // Trường hợp còn lại - đóng
  return 0;
};
