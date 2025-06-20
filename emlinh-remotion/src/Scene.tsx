import { ThreeCanvas } from "@remotion/three";
import React, { Suspense } from 'react'; 
import { AbsoluteFill, useVideoConfig, Audio, staticFile } from "remotion"; 
import { PerspectiveCamera } from "@react-three/drei"; 

import AudioManager from './utils/AudioManager'; 

import { OfficeBackground } from './backgrounds/OfficeBackground';
import { AbstractBackground } from './backgrounds/AbstractBackground';
import { Avatar } from './Avatar.jsx';
import { useGLTF } from '@react-three/drei';
import { z } from 'zod';
import { myCompSchema } from './Root';

export type SceneProps = z.infer<typeof myCompSchema>;

const container: React.CSSProperties = {
  backgroundColor: "white",
};

const modelPath = staticFile("models/character.glb");

// Preload model
if (typeof window !== 'undefined') {
  useGLTF.preload(modelPath);
}

export const Scene: React.FC<SceneProps> = ({
  cameraFov = 30,
  cameraPosition = [0, 0.7, 4.5],
  backgroundScene,
  audioFileName,
}) => {
  const { width, height } = useVideoConfig();
  const aspectRatio = width / height;

  let cameraFovValue = cameraFov;
  let cameraPositionValue: [number, number, number] = cameraPosition; 
  let avatarScaleValue = 3;
  let avatarPositionValue: [number, number, number] = [-1, -3, -1];

  if (aspectRatio < 1) { 
    cameraFovValue = 20;
    cameraPositionValue = [0, -2.25, 12]; 
    avatarScaleValue = 4;
    avatarPositionValue = [0, -7, 0];
  }

  const audioSrc = (audioFileName && audioFileName !== "None") ? staticFile(`audios/${audioFileName}`) : undefined;
  
  const finalCharacterModelUrl = modelPath;
  
  const mouthCuesUrl = audioFileName && audioFileName !== "None" 
    ? staticFile(`audios/${audioFileName.replace('.mp3', '.json').replace('.wav', '.json')}`) 
    : null;

  return (
    <AbsoluteFill style={container}>
      {audioSrc && <Audio src={audioSrc} />}
      
      <Suspense fallback={<div style={{background: 'black', width: '100%', height: '100%'}} />}>
        <ThreeCanvas 
          width={width} 
          height={height}
          gl={{
            antialias: true,
          }}
        >
          <PerspectiveCamera
            makeDefault 
            fov={cameraFovValue}
            near={0.1}
            far={1000}
            position={cameraPositionValue}
          />
          
          <ambientLight intensity={4} color={0xffffff} />
          <pointLight 
            position={[0, 3, 5]} 
            intensity={5.0} 
            distance={20}      
            decay={2.5}        
            color={0xffeedd}   
          />
          <directionalLight 
            position={[3, 3, 3]} 
            intensity={3.5} 
            color={0xffffff} 
          />
          
          {backgroundScene === 'office' && <OfficeBackground />}
          {backgroundScene === 'abstract' && <AbstractBackground />}
          
          <group 
            position={avatarPositionValue} 
            scale={avatarScaleValue} 
            rotation={[0, Math.PI / 9, 0]}
          >
            <Avatar 
              modelUrl={finalCharacterModelUrl} 
              mouthCuesUrl={mouthCuesUrl} 
              lipSyncOptions={{
                audioOffset: 0, 
                intensityFactor: 0.55, 
                visemeOpeningDuration: 0.12,
                neutralIntensity: 0.05,
                springConfig: { stiffness: 80, damping: 25 } 
              }}
            />
          </group>
        </ThreeCanvas>
      </Suspense>
    </AbsoluteFill>
  );
};
