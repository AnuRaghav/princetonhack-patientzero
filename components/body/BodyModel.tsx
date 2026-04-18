"use client";

export function BodyModel() {
  return (
    <group name="placeholder-body">
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color="#f8d7c0" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.55, 8, 16]} />
        <meshStandardMaterial color="#cfe8ff" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.55, 8, 16]} />
        <meshStandardMaterial color="#cfe8ff" roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.15, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.55, 8, 16]} />
        <meshStandardMaterial color="#1f3b57" roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.75, 0]} castShadow>
        <capsuleGeometry args={[0.14, 0.55, 8, 16]} />
        <meshStandardMaterial color="#1f3b57" roughness={0.55} />
      </mesh>
    </group>
  );
}
