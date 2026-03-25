/* ── Three.js Network Graph Scene ─────────────────────────────────── */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const NODE_COUNT = 60;
const CONNECTION_DISTANCE = 2.5;

function NetworkNodes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mousePos = useRef(new THREE.Vector2(0, 0));

  // Generate node positions and velocities
  const nodes = useMemo(() => {
    return Array.from({ length: NODE_COUNT }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.005,
        (Math.random() - 0.5) * 0.005,
        (Math.random() - 0.5) * 0.002
      ),
      scale: 0.04 + Math.random() * 0.06,
      pulsePhase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current || !linesRef.current) return;
    const t = clock.getElapsedTime();

    // Update node positions
    const positions: number[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const node = nodes[i];
      node.position.add(node.velocity);

      // Bounce off boundaries
      ["x", "y", "z"].forEach((axis) => {
        const a = axis as "x" | "y" | "z";
        const limit = a === "z" ? 2 : a === "x" ? 4 : 3;
        if (Math.abs(node.position[a]) > limit) {
          node.velocity[a] *= -1;
        }
      });

      // Pulsing scale
      const pulse = 1 + Math.sin(t * 2 + node.pulsePhase) * 0.3;
      const s = node.scale * pulse;

      dummy.position.copy(node.position);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Update connections
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        if (dist < CONNECTION_DISTANCE) {
          positions.push(
            nodes[i].position.x, nodes[i].position.y, nodes[i].position.z,
            nodes[j].position.x, nodes[j].position.y, nodes[j].position.z
          );
        }
      }
    }

    const lineGeo = linesRef.current.geometry;
    lineGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    lineGeo.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, NODE_COUNT]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#0052ff" transparent opacity={0.9} />
      </instancedMesh>

      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial color="#0052ff" transparent opacity={0.15} />
      </lineSegments>
    </>
  );
}

export function NetworkScene({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0a0f1a"]} />
        <ambientLight intensity={0.5} />
        <NetworkNodes />
      </Canvas>
    </div>
  );
}
