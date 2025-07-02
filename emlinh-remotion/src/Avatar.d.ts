// File: emlinh-remotion/src/Avatar.d.ts
import React from 'react';
import { GroupProps } from '@react-three/fiber'; // Props chuẩn cho group trong R3F
import * as THREE from 'three'; // Import THREE để sử dụng cho kiểu ref
import { LipSyncOptions } from './hooks/lipSync/useRemotionLipSync'; // Import LipSyncOptions

// Định nghĩa kiểu cho props của Avatar
// Nó sẽ bao gồm tất cả các props của một <group> trong react-three-fiber
// Bạn có thể thêm các props tùy chỉnh khác nếu Avatar của bạn có
interface AvatarCustomProps extends GroupProps {
  modelUrl: string;
  mouthCuesUrl?: string | null;
  lipSyncOptions?: LipSyncOptions;
  blinkEnabled?: boolean;
  blinkIntervalFrames?: number;
  blinkDurationFrames?: number;
  eyeMorphTargetNames?: { left: string; right: string };
  // onModelLoaded?: () => void; 
  // ví dụ: animationName?: string;
}

// Khai báo module cho './Avatar.jsx'
// Điều này cho TypeScript biết rằng khi import từ './Avatar.jsx',
// chúng ta sẽ nhận được một component React có kiểu như định nghĩa ở đây.
// Khai báo module cho './Avatar' (Remotion thường phân giải không cần .jsx)
declare module './Avatar' {
  const Avatar: React.ForwardRefExoticComponent<AvatarCustomProps & React.RefAttributes<THREE.Group>>;
  export { Avatar };
}
