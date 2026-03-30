import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NetworkScene } from "@/components/three/NetworkScene";
import { ChevronRight, ChevronLeft, ShieldAlert, Cpu, Network, CheckCircle2 } from "lucide-react";

const SLIDES = [
  { id: "intro", title: "Intro" },
  { id: "problem", title: "Problem" },
  { id: "architecture", title: "Architecture" },
  { id: "topography", title: "Topography" },
  { id: "conclusion", title: "Conclusion" }
];

export default function PitchDeckPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        setCurrentSlide((s) => Math.min(s + 1, SLIDES.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const nextSlide = () => setCurrentSlide((s) => Math.min(s + 1, SLIDES.length - 1));
  const prevSlide = () => setCurrentSlide((s) => Math.max(s - 1, 0));

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#020617] overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <NetworkScene className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/50" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        <AnimatePresence mode="wait">
          
          {/* SLIDE 0: TITLE */}
          {currentSlide === 0 && (
            <motion.div
              key="slide-0"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-5xl text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Microsoft AI Unlocked 2026
              </div>
              <h1 className="text-6xl lg:text-[6rem] font-black leading-[1.1] tracking-tight text-white mb-6 drop-shadow-lg">
                Truth<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052ff] to-[#4ade80]">Mesh</span>
              </h1>
              <p className="text-2xl lg:text-3xl font-medium text-slate-300 drop-shadow-md">
                A Self-Auditing Hallucination Topography Engine
              </p>
            </motion.div>
          )}

          {/* SLIDE 1: PROBLEM */}
          {currentSlide === 1 && (
            <motion.div
              key="slide-1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
              <div>
                <h2 className="text-4xl font-bold text-white mb-6">The Structural Flaw in Enterprise AI</h2>
                <p className="text-lg text-slate-300 mb-6 leading-relaxed">
                  Treating hallucinations as a <span className="text-red-400 font-semibold">Prompt Engineering</span> problem is a fatal enterprise misconception.
                </p>
                <ul className="space-y-4 text-slate-400">
                  <li className="flex gap-3 items-start">
                    <ShieldAlert className="size-6 text-red-400 shrink-0 mt-0.5" />
                    <span><strong>Commodity RAG is Brittle:</strong> Basic semantic search fails when models actively decay on specific high-stakes domains.</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <ShieldAlert className="size-6 text-red-400 shrink-0 mt-0.5" />
                    <span><strong>Zero Accountability:</strong> Standard LLM wrappers cannot mathematically prove the veracity of an output post-generation.</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 backdrop-blur-md">
                <div className="text-center">
                  <div className="size-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                    <ShieldAlert className="size-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">The Current Standard</h3>
                  <p className="text-slate-400">"Trust it, but verify manually."</p>
                  <div className="mt-6 inline-block rounded-lg bg-red-500/20 px-4 py-2 text-sm font-bold text-red-400 border border-red-500/50">
                    O(N) Human Scaling Barrier
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SLIDE 2: ARCHITECTURE */}
          {currentSlide === 2 && (
            <motion.div
              key="slide-2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-6xl flex flex-col items-center"
            >
              <h2 className="text-4xl font-bold text-white mb-12 text-center">Programmatic Truth Enforcement</h2>
              
              {/* Native Architecture Diagram */}
              <div className="w-full relative flex flex-col items-center gap-8">
                <div className="flex w-full justify-between items-center relative">
                  {/* Lines */}
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500/20 via-primary/50 to-green-500/20 -z-10" />
                  
                  {/* Nodes */}
                  <div className="bg-[#0a0f1a] border border-white/10 p-6 rounded-2xl shadow-xl w-64 text-center z-10">
                    <Cpu className="size-8 text-blue-400 mx-auto mb-3" />
                    <h4 className="font-bold text-white">Azure OpenAI Router</h4>
                    <p className="text-xs text-slate-400 mt-2">Dynamic payload interception based on domain</p>
                  </div>

                  <div className="bg-[#0a0f1a] border border-primary/30 shadow-[0_0_30px_rgba(0,82,255,0.2)] p-6 rounded-2xl w-64 text-center z-10">
                    <Network className="size-8 text-primary mx-auto mb-3" />
                    <h4 className="font-bold text-white">Adversarial Consensus</h4>
                    <p className="text-xs text-slate-400 mt-2">Fractures payload & triggers multi-agent debate</p>
                  </div>

                  <div className="bg-[#0a0f1a] border border-green-500/30 p-6 rounded-2xl shadow-xl w-64 text-center z-10">
                    <CheckCircle2 className="size-8 text-green-400 mx-auto mb-3" />
                    <h4 className="font-bold text-white">Immutable Ledger</h4>
                    <p className="text-xs text-slate-400 mt-2">Proofs grounded via Bing & logged to Cosmos DB</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* SLIDE 3: TOPOGRAPHY */}
          {currentSlide === 3 && (
            <motion.div
              key="slide-3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-5xl text-center"
            >
              <h2 className="text-5xl font-bold text-white mb-6">Continuous Entropy Mapping</h2>
              <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto">
                You cannot mitigate model decay you cannot measure. TruthMesh does not wait for user input.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-primary/50 transition-colors">
                  <h4 className="font-bold text-primary mb-2 text-lg">Autonomous Auditing</h4>
                  <p className="text-sm text-slate-400">The engine continuously injects synthetic "honey-pot" queries against the active deployment.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-primary/50 transition-colors">
                  <h4 className="font-bold text-primary mb-2 text-lg">Real-Time Matrices</h4>
                  <p className="text-sm text-slate-400">Maps the precise delta where a foundation model loses entropy in hyperspecific domains.</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-primary/50 transition-colors">
                  <h4 className="font-bold text-primary mb-2 text-lg">Dynamic Orchestration</h4>
                  <p className="text-sm text-slate-400">Our Router shifts traffic away from models actively proven to be hallucinating in real-time.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* SLIDE 4: CONCLUSION */}
          {currentSlide === 4 && (
            <motion.div
              key="slide-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-4xl text-center"
            >
              <h2 className="text-5xl font-bold text-white mb-10">Why TruthMesh Wins</h2>
              <div className="space-y-6 text-left max-w-2xl mx-auto border-l-2 border-primary pl-8">
                <div>
                  <h4 className="text-xl font-bold text-white">O(1) Main-Thread Latency</h4>
                  <p className="text-slate-400 mt-1">Decoupled async validation implies generation speed remains identical to pure Azure OpenAI calls.</p>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Deterministic Grounding</h4>
                  <p className="text-slate-400 mt-1">Claims are cryptographically mapped to Cosmos DB for strict liability compliance.</p>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Native Azure Backbone</h4>
                  <p className="text-slate-400 mt-1">Engineered entirely on Azure AI services for instant enterprise deployment.</p>
                </div>
              </div>

              <div className="mt-16 text-center">
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#0052ff] to-[#4ade80]">
                  Stop building wrappers. Enforce the truth.
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="relative z-20 flex items-center justify-between p-6 w-full max-w-6xl mx-auto border-t border-white/10 bg-[#020617]/50 backdrop-blur-2xl">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="size-4" /> Previous
        </button>
        
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`size-2.5 rounded-full transition-all ${currentSlide === i ? "bg-primary w-6" : "bg-white/20 hover:bg-white/40"}`}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          disabled={currentSlide === SLIDES.length - 1}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-30"
        >
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
