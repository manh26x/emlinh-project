import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sphere, Text } from '@react-three/drei';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const AbstractBackground: React.FC = () => {
  // Refs cho các animation
  const gradientSphereRef = useRef<THREE.Mesh>(null);
  const particleSystemRef = useRef<THREE.Points>(null);
  const floatingObjectsRef = useRef<THREE.Group>(null);
  
  // Get video config để responsive
  const { width, height } = useVideoConfig();
  const aspectRatio = width / height;
  const isPortrait = aspectRatio < 1;
  
  // Responsive settings
  const sphereSize = isPortrait ? 35 : 50;
  const textSize = isPortrait ? 1.6 : 2;
  const textPosition: [number, number, number] = isPortrait ? [0, -1, -6] : [0, 4, -12];
  const torusPosition: [number, number, number] = isPortrait ? [0, -8, -8] : [0, 0, -10];
  const particleSpread = isPortrait ? 25 : 35;
  
  // Tạo shader gradient cho nền chính - cải thiện colors
  const skyShaderMaterial = useRef(
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color("#1a0d4d") }, // Deep purple
        colorB: { value: new THREE.Color("#4a148c") }, // Rich purple  
        colorC: { value: new THREE.Color("#7b1fa2") }, // Bright purple
        colorD: { value: new THREE.Color("#ad52d6") }, // Light purple
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform vec3 colorC;
        uniform vec3 colorD;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          float t1 = (sin(time * 0.1) + 1.0) * 0.5;
          float t2 = (cos(time * 0.15) + 1.0) * 0.5;
          
          vec3 color1 = mix(colorA, colorB, vUv.x + sin(time * 0.1 + vUv.y * 3.0) * 0.3);
          vec3 color2 = mix(colorC, colorD, vUv.y + cos(time * 0.08 + vUv.x * 2.0) * 0.2);
          vec3 finalColor = mix(color1, color2, t1 * 0.7 + vUv.y * 0.3);
          
          // Add some sparkle
          float sparkle = sin(vPosition.x * 10.0 + time) * sin(vPosition.y * 10.0 + time * 1.5) * sin(vPosition.z * 10.0 + time * 0.8);
          finalColor += sparkle * 0.1 * vec3(1.0, 0.8, 1.0);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    })
  );

  // Tạo particle system
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
    const positions = new Float32Array(particlesCount * 3);
    
    for (let i = 0; i < particlesCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * particleSpread;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [particleSpread]);

  const particlesMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#b388ff',
        size: 0.02,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Animation effects sử dụng Remotion timeframe
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Chuyển đổi frame sang thời gian để animation mượt
  const timeInSeconds = frame / fps;
  
  useFrame(() => {
    // Cập nhật thời gian trong shader
    skyShaderMaterial.current.uniforms.time.value = timeInSeconds;
    
    // Cầu gradient xoay chậm
    if (gradientSphereRef.current) {
      gradientSphereRef.current.rotation.y = timeInSeconds * 0.03;
      gradientSphereRef.current.rotation.x = timeInSeconds * 0.02;
    }

    // Particle system rotation
    if (particleSystemRef.current) {
      particleSystemRef.current.rotation.y = timeInSeconds * 0.01;
      particleSystemRef.current.rotation.x = timeInSeconds * 0.005;
    }

    // Floating objects animation
    if (floatingObjectsRef.current) {
      floatingObjectsRef.current.rotation.y = timeInSeconds * 0.02;
      floatingObjectsRef.current.children.forEach((child, index) => {
        child.position.y = Math.sin(timeInSeconds * 0.5 + index) * 2;
        child.rotation.x = timeInSeconds * 0.3 + index;
      });
    }
  });

  return (
    <group>
      {/* Sphere chính với shader gradient */}
      <mesh ref={gradientSphereRef}>
        <sphereGeometry args={[sphereSize, 32, 32]} />
        <primitive object={skyShaderMaterial.current} attach="material" />
      </mesh>

      {/* Particle system */}
      <points ref={particleSystemRef} geometry={particlesGeometry} material={particlesMaterial} />

      {/* Floating geometric objects */}
      <group ref={floatingObjectsRef}>
        {/* Torus chính */}
        <mesh position={torusPosition} rotation={[0, frame * 0.01, 0]}>
          <torusGeometry args={[6, 0.8, 16, 100]} />
          <meshStandardMaterial
            color="#b388ff"
            emissive="#7c4dff"
            emissiveIntensity={1.2}
            transparent
            opacity={0.9}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>

        {/* Additional floating geometries */}
        <mesh position={[8, 3, -8]} rotation={[timeInSeconds * 0.1, timeInSeconds * 0.2, 0]}>
          <octahedronGeometry args={[1.5]} />
          <meshStandardMaterial
            color="#e1bee7"
            emissive="#9c27b0"
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
          />
        </mesh>

        <mesh position={[-6, -2, -6]} rotation={[0, timeInSeconds * 0.15, timeInSeconds * 0.1]}>
          <dodecahedronGeometry args={[1.2]} />
          <meshStandardMaterial
            color="#ce93d8"
            emissive="#7b1fa2"
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Portrait mode additional elements */}
        {isPortrait && (
          <>
            <mesh position={[0, -8, -5]} rotation={[timeInSeconds * 0.05, 0, timeInSeconds * 0.08]}>
              <icosahedronGeometry args={[0.8]} />
              <meshStandardMaterial
                color="#f8bbd9"
                emissive="#e91e63"
                emissiveIntensity={0.4}
                transparent
                opacity={0.6}
              />
            </mesh>
          </>
        )}
      </group>

      {/* Text chỉ hiển thị ở landscape mode */}
      {!isPortrait && (
        <Text
          position={textPosition}
          rotation={[0, 0, 0]}
          fontSize={textSize}
          color="#f3e5f5"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
          material-toneMapped={false}
          outlineWidth={0.02}
          outlineColor="#7b1fa2"
        >
          Em Linh
        </Text>
      )}

      {/* Enhanced lighting system */}
      <pointLight position={[0, 0, -6]} intensity={2} color="#b388ff" distance={20} />
      <pointLight position={[10, 5, -10]} intensity={1.5} color="#7c4dff" distance={15} />
      <pointLight position={[-10, -5, -5]} intensity={1.8} color="#9c27b0" distance={18} />
      
      {/* Portrait mode additional lighting */}
      {isPortrait && (
        <>
          <pointLight position={[0, 10, -8]} intensity={1.2} color="#e1bee7" distance={12} />
          <pointLight position={[0, -10, -8]} intensity={1.0} color="#ce93d8" distance={10} />
        </>
      )}

      {/* Ambient enhancement */}
      <ambientLight intensity={0.3} color="#f3e5f5" />
    </group>
  );
};
