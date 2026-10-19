"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Text, OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import { useRouter } from "next/router";

function FloatingText() {
  const ref = useRef<any>();

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = Math.sin(clock.elapsedTime) * 0.3;
      ref.current.rotation.y += 0.002;
    }
  });

  return (
    <Text
      ref={ref}
      fontSize={0.5}
      color="cyan"
      anchorX="center"
      anchorY="middle"
      maxWidth={8}
      textAlign="center"
    >
      {`Welcome in New Talents Stories Group Membership
Your value is our value.
Ikaze wisomere inkuru zuruhererekane.`}
    </Text>
  );
}

function Background() {
  return (
    <mesh>
      <sphereGeometry args={[30, 64, 64]} />
      <meshBasicMaterial color="#050505" side={2} />
    </mesh>
  );
}

export default function Welcome3D() {
  const router = useRouter();

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 0, 6] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} />

        <Background />
        <FloatingText />

        <OrbitControls enableZoom={false} />
      </Canvas>

      {/* UI Buttons */}
      <div
        style={{
          position: "absolute",
          bottom: "50px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: "20px",
        }}
      >
        <button
          onClick={() => router.push("/login")}
          style={{
            padding: "12px 25px",
            background: "#00ffff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Login
        </button>

        <button
          onClick={() => router.push("/ads")}
          style={{
            padding: "12px 25px",
            background: "#ff00aa",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          View Ads
        </button>
      </div>
    </div>
  );
}
