// src/components/Avatar3D.tsx
import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

type Props = {
  url: string; // Avatar model URL (male/female)
};

const AvatarModel: React.FC<Props> = ({ url }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={2} position={[0, -1, 0]} />;
};

const Avatar3D: React.FC<Props> = ({ url }) => {
  return (
    <Canvas style={{ height: "300px", width: "300px" }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 2, 2]} intensity={1} />
      <Suspense fallback={null}>
        <AvatarModel url={url} />
        <OrbitControls enableZoom={false} />
      </Suspense>
    </Canvas>
  );
};

export default Avatar3D;
