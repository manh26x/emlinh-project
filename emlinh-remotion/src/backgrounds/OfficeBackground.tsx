import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const OfficeBackground: React.FC = () => {
  // Refs cho các animation
  const plantRef = useRef<THREE.Mesh>(null);
  const lampLightRef = useRef<THREE.PointLight>(null);
  const clockRef = useRef<THREE.Group>(null);
  const monitorRef = useRef<THREE.Mesh>(null);
  const paperStackRef = useRef<THREE.Group>(null);

  // Get video config để responsive
  const { width, height } = useVideoConfig();
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;

  // Responsive settings
  const roomScale = isPortrait ? 0.8 : 1;
  const deskPosition: [number, number, number] = isPortrait ? [0, -5, -3] : [-2, -5, -4];
  const chairPosition: [number, number, number] = isPortrait ? [0, -5.5, -0.5] : [-2, -5.5, -1.5];
  const plantPosition: [number, number, number] = isPortrait ? [3, -6, -7] : [5, -6, -9];
  const windowPosition: [number, number, number] = isPortrait ? [0, 2, -11.9] : [0, 0, -11.9];
  const windowSize: [number, number] = isPortrait ? [8, 12] : [12, 8];

  // Get current time for clock
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeInSeconds = frame / fps;

  // Create textures
  const woodTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Wood grain pattern
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, 512, 512);
    
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = `rgba(${139 + Math.random() * 40}, ${90 + Math.random() * 30}, ${43 + Math.random() * 20}, 0.3)`;
      ctx.lineWidth = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * 512);
      ctx.lineTo(512, Math.random() * 512);
      ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Rung lá cây nhẹ
    if (plantRef.current) {
      plantRef.current.rotation.y = Math.sin(time * 0.3) * 0.05;
      plantRef.current.rotation.z = Math.sin(time * 0.4) * 0.02;
    }
    
    // Đèn sáng yếu đi và mạnh lên
    if (lampLightRef.current) {
      lampLightRef.current.intensity = 0.8 + Math.sin(time * 0.5) * 0.2;
    }

    // Clock animation
    if (clockRef.current) {
      const hourHand = clockRef.current.children[1];
      const minuteHand = clockRef.current.children[2];
      if (hourHand) hourHand.rotation.z = -(timeInSeconds * 0.01) % (Math.PI * 2);
      if (minuteHand) minuteHand.rotation.z = -(timeInSeconds * 0.1) % (Math.PI * 2);
    }

    // Monitor screen flicker
    if (monitorRef.current) {
      const material = monitorRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(time * 0.8) * 0.1;
    }

    // Paper stack subtle movement
    if (paperStackRef.current) {
      paperStackRef.current.rotation.y = Math.sin(time * 0.2) * 0.02;
    }
  });

  return (
    <group scale={[roomScale, roomScale, roomScale]}>
      {/* Tường sau với gradient và texture */}
      <mesh position={[0, 0, -12]} receiveShadow>
        <planeGeometry args={[60, 25]} />
        <meshStandardMaterial 
          color="#f5f5f0" 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Tường bên trái */}
      <mesh position={[-25, 0, 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 25]} />
        <meshStandardMaterial color="#e8e8e3" roughness={0.9} />
      </mesh>

      {/* Tường bên phải */}
      <mesh position={[25, 0, 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 25]} />
        <meshStandardMaterial color="#e8e8e3" roughness={0.9} />
      </mesh>
      
      {/* Sàn nhà bóng với texture */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -7, 0]} 
        receiveShadow
      >
        <planeGeometry args={[60, 35]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={120}
          roughness={0.8}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#c9d6df"
          metalness={0.3}
        />
      </mesh>
      
      {/* Bàn làm việc lớn hơn với texture */}
      <mesh position={deskPosition} castShadow>
        <boxGeometry args={[6, 0.3, 3]} />
        <meshStandardMaterial 
          map={woodTexture}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      
      {/* Chân bàn kim loại */}
      {[-2.5, -5.5].map((x, i) => (
        <React.Fragment key={i}>
          <mesh position={[deskPosition[0] + x + 2.5, -6, deskPosition[2] - 1]} castShadow>
            <boxGeometry args={[0.15, 2, 0.15]} />
            <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[deskPosition[0] + x + 2.5, -6, deskPosition[2] + 1]} castShadow>
            <boxGeometry args={[0.15, 2, 0.15]} />
            <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.2} />
          </mesh>
        </React.Fragment>
      ))}
      
      {/* Monitor */}
      <group position={[deskPosition[0] + 1, deskPosition[1] + 1, deskPosition[2]]}>
        {/* Monitor base */}
        <mesh position={[0, -0.5, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.4, 0.2, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
        </mesh>
        
        {/* Monitor arm */}
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Monitor screen */}
        <mesh ref={monitorRef} position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[2.2, 1.4, 0.1]} />
          <meshStandardMaterial 
            color="#000" 
            emissive="#004d80" 
            emissiveIntensity={0.3}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      </group>

      {/* Keyboard và mouse */}
      <group position={[deskPosition[0] - 0.5, deskPosition[1] + 0.2, deskPosition[2] + 0.8]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.05, 0.4]} />
          <meshStandardMaterial color="#e0e0e0" roughness={0.4} />
        </mesh>
        
        <mesh position={[1.5, 0, 0]} castShadow>
          <boxGeometry args={[0.2, 0.03, 0.3]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.3} />
        </mesh>
      </group>

      {/* Stack of papers */}
      <group ref={paperStackRef} position={[deskPosition[0] - 2, deskPosition[1] + 0.2, deskPosition[2] - 0.5]}>
        {[0, 0.01, 0.02, 0.03, 0.04].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} castShadow>
            <boxGeometry args={[0.8, 0.005, 1.2]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Coffee mug */}
      <group position={[deskPosition[0] + 2, deskPosition[1] + 0.3, deskPosition[2] + 0.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.25, 16]} />
          <meshStandardMaterial color="#8b4513" roughness={0.4} />
        </mesh>
        
        {/* Coffee surface */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 0.01, 16]} />
          <meshStandardMaterial color="#3e2723" roughness={0.2} />
        </mesh>
      </group>
      
      {/* Ghế văn phòng cao cấp */}
      <group position={chairPosition}>
        {/* Seat */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[2, 0.15, 2]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.3} metalness={0.1} />
        </mesh>
        
        {/* Backrest */}
        <mesh position={[0, 1, -0.8]} castShadow>
          <boxGeometry args={[2, 2, 0.2]} />
          <meshStandardMaterial color="#2d2d2d" roughness={0.3} metalness={0.1} />
        </mesh>
        
        {/* Pedestal */}
        <mesh position={[0, -1, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.15, 2, 8]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Wheels */}
        {[0, 0.4, 0.8, 1.2, 1.6].map((angle, i) => (
          <mesh 
            key={i} 
            position={[
              Math.cos(angle * Math.PI) * 0.8, 
              -2, 
              Math.sin(angle * Math.PI) * 0.8
            ]} 
            castShadow
          >
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
      
      {/* Cây xanh lớn hơn */}
      <group position={plantPosition}>
        {/* Chậu cây */}
        <mesh castShadow>
          <cylinderGeometry args={[1, 1.2, 1.2, 16]} />
          <meshStandardMaterial color="#8d6e63" roughness={0.7} />
        </mesh>
        
        {/* Thân cây */}
        <mesh position={[0, 1.8, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.15, 2.5, 8]} />
          <meshStandardMaterial color="#5d4037" roughness={0.8} />
        </mesh>
        
        {/* Multiple leaf clusters */}
        {[
          [0, 3.5, 0],
          [0.3, 3.2, 0.3],
          [-0.3, 3.2, -0.3],
          [0.2, 3.8, -0.2],
          [-0.2, 3.8, 0.2]
        ].map((pos, i) => (
          <mesh key={i} ref={i === 0 ? plantRef : undefined} position={pos as [number, number, number]} castShadow>
            <sphereGeometry args={[0.8 + Math.random() * 0.3, 16, 16]} />
            <meshStandardMaterial color="#4caf50" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Wall clock */}
      <group ref={clockRef} position={[-8, 3, -11.8]}>
        {/* Clock face */}
        <mesh castShadow>
          <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.2} />
        </mesh>
        
        {/* Hour hand */}
        <mesh position={[0, 0, 0.06]} rotation={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.02, 0.4, 0.01]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        
        {/* Minute hand */}
        <mesh position={[0, 0, 0.07]} rotation={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.015, 0.6, 0.01]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
      
      {/* Cửa sổ với khung */}
      <group position={windowPosition}>
        {/* Window frame */}
        <mesh receiveShadow>
          <boxGeometry args={[windowSize[0] + 0.4, windowSize[1] + 0.4, 0.2]} />
          <meshStandardMaterial color="#8d6e63" roughness={0.6} />
        </mesh>
        
        {/* Window glass */}
        <mesh position={[0, 0, 0.1]} receiveShadow>
          <planeGeometry args={windowSize} />
          <meshStandardMaterial 
            color="#87ceeb" 
            opacity={0.4} 
            transparent={true} 
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
        
        {/* Window dividers */}
        <mesh position={[0, 0, 0.11]} receiveShadow>
          <boxGeometry args={[0.05, windowSize[1], 0.02]} />
          <meshStandardMaterial color="#5d4037" />
        </mesh>
        <mesh position={[0, 0, 0.11]} receiveShadow>
          <boxGeometry args={[windowSize[0], 0.05, 0.02]} />
          <meshStandardMaterial color="#5d4037" />
        </mesh>
      </group>
      
      {/* Đèn bàn hiện đại */}
      <group position={[deskPosition[0] - 2.5, deskPosition[1] + 0.5, deskPosition[2]]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.4, 0.5, 0.15, 16]} />
          <meshStandardMaterial color="#2c2c2c" metalness={0.8} roughness={0.2} />
        </mesh>
        
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 2.5, 8]} />
          <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
        </mesh>
        
        <mesh position={[0.8, 2.5, 0]} castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#f0f0f0" emissive="#fffbe6" emissiveIntensity={0.3} />
        </mesh>
        
        {/* Ánh sáng đèn */}
        <pointLight
          ref={lampLightRef}
          position={[0.8, 2.5, 0]}
          intensity={1.2}
          distance={12}
          color="#fffbe6"
          castShadow
        />
      </group>

      {/* Bookshelf */}
      <group position={[isPortrait ? -6 : -12, -2, -10]}>
        {/* Shelf structure */}
        <mesh castShadow>
          <boxGeometry args={[3, 8, 1]} />
          <meshStandardMaterial map={woodTexture} roughness={0.4} />
        </mesh>
        
        {/* Books */}
        {[0, 1, 2, 3, 4].map((shelf) => (
          <group key={shelf} position={[0, 2 - shelf * 1.5, 0.4]}>
            {[0, 1, 2, 3, 4, 5].map((book) => (
              <mesh 
                key={book} 
                position={[-1.3 + book * 0.4, 0, Math.random() * 0.1]} 
                rotation={[0, Math.random() * 0.1, 0]}
                castShadow
              >
                <boxGeometry args={[0.3, 1.2, 0.05]} />
                <meshStandardMaterial 
                  color={`hsl(${Math.random() * 360}, 70%, 50%)`} 
                  roughness={0.8} 
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Enhanced lighting */}
      <ambientLight intensity={0.4} color="#f5f5f0" />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Window light */}
      <directionalLight
        position={windowPosition}
        intensity={0.8}
        color="#87ceeb"
        castShadow
      />
    </group>
  );
};
