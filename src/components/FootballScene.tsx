"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Field() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 10]} />
      <meshStandardMaterial color="green" />
    </mesh>
  );
}

function Player({ position, color }: any) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Ball() {
  return (
    <mesh position={[0, 0.3, 0]}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
}

export default function FootballScene() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Canvas camera={{ position: [0, 8, 10], fov: 50 }}>
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} />

        {/* Field */}
        <Field />

        {/* Players */}
        <Player position={[-2, 0.3, 0]} color="red" />
        <Player position={[2, 0.3, 0]} color="blue" />
        <Player position={[0, 0.3, 2]} color="yellow" />
        <Player position={[0, 0.3, -2]} color="purple" />

        {/* Ball */}
        <Ball />

        <OrbitControls />
      </Canvas>
    </div>
  );
}
