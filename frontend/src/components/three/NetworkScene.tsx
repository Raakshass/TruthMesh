/* ── Three.js Network Graph Scene ─────────────────────────────────── */
import { Canvas } from "@react-three/fiber";
import { Sparkles, Grid } from "@react-three/drei";

export function NetworkScene({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        style={{ background: "#020617", width: "100%", height: "100%" }}
        dpr={[1, 2]}
      >
        <fog attach="fog" args={["#020617", 5, 20]} />
        <ambientLight intensity={0.5} />
        
        {/* High-Tech Infinite Intelligence Grid */}
        <Grid 
          infiniteGrid 
          fadeDistance={25} 
          sectionColor="#0052ff" 
          cellColor="#001d59" 
          sectionSize={2.5} 
          cellSize={0.5} 
          position={[0, -2, 0]} 
        />

        {/* Floating Verified Data Tokens */}
        <Sparkles 
          count={350} 
          scale={15} 
          size={5} 
          speed={0.4} 
          opacity={0.85} 
          color="#4ade80" 
        />
        {/* Unverified/Processing Data Streams */}
        <Sparkles 
          count={250} 
          scale={12} 
          size={3} 
          speed={0.6} 
          opacity={0.6} 
          color="#0052ff" 
        />
      </Canvas>
    </div>
  );
}
