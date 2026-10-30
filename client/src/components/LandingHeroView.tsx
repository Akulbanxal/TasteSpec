import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sparkles, Float } from '@react-three/drei';
import { motion } from 'framer-motion';
import {
  Sparkles as SparklesIcon,
  ArrowRight,
  ShieldCheck,
  Database,
  Lock,
  Cpu,
  Layers,
  Activity,
  Zap,
  Compass,
  Search,
  CheckCircle2,
  Binary,
  Check
} from 'lucide-react';
import { VibecodeCanvasLayout } from './common/VibecodeCanvasLayout.js';

export interface LandingHeroViewProps {
  onNavigateToTestbench?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToScenarios?: () => void;
  onNavigateToMission3D?: () => void;
}

// ----------------------------------------------------------------------------
// Satellite Domain Configs (Music, Film, Dining, Fashion)
// ----------------------------------------------------------------------------
interface DomainConfig {
  name: string;
  color: string;
  threeColor: number;
  shape: 'diamond' | 'sphere' | 'box' | 'torus';
  radius: number;
  speed: number;
  inclination: number;
  offset: number;
}

const DOMAIN_SATELLITES: DomainConfig[] = [
  {
    name: 'Music',
    color: '#06b6d4',
    threeColor: 0x06b6d4,
    shape: 'diamond',
    radius: 3.1,
    speed: 1.05,
    inclination: 0.3,
    offset: 0
  },
  {
    name: 'Film',
    color: '#8b5cf6',
    threeColor: 0x8b5cf6,
    shape: 'sphere',
    radius: 3.7,
    speed: 0.82,
    inclination: -0.38,
    offset: Math.PI * 0.5
  },
  {
    name: 'Dining',
    color: '#10b981',
    threeColor: 0x10b981,
    shape: 'box',
    radius: 4.2,
    speed: 0.65,
    inclination: 0.52,
    offset: Math.PI
  },
  {
    name: 'Fashion',
    color: '#f59e0b',
    threeColor: 0xf59e0b,
    shape: 'torus',
    radius: 4.7,
    speed: 0.5,
    inclination: -0.24,
    offset: Math.PI * 1.5
  }
];

// ----------------------------------------------------------------------------
// 3D Orbital Satellite Node with Connecting Wireframe Laser Line
// ----------------------------------------------------------------------------
interface SatelliteNodeProps {
  config: DomainConfig;
}

const SatelliteNode: React.FC<SatelliteNodeProps> = ({ config }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Precomputed connecting laser line
  const laserLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, 0]), 3));
    const mat = new THREE.LineBasicMaterial({
      color: config.threeColor,
      transparent: true,
      opacity: 0.55
    });
    return new THREE.Line(geo, mat);
  }, [config.threeColor]);

  // Precomputed orbital track loop
  const trackLoop = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const tx = Math.cos(theta) * config.radius;
      const tz = Math.sin(theta) * config.radius;
      const ty = Math.sin(theta * 1.5) * (config.radius * config.inclination);
      points.push(new THREE.Vector3(tx, ty, tz));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: config.threeColor,
      transparent: true,
      opacity: 0.16
    });
    return new THREE.LineLoop(geo, mat);
  }, [config.radius, config.inclination, config.threeColor]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const angle = elapsed * config.speed * 0.75 + config.offset;
    const x = Math.cos(angle) * config.radius;
    const z = Math.sin(angle) * config.radius;
    const y = Math.sin(angle * 1.5) * (config.radius * config.inclination);

    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
      meshRef.current.rotation.x += delta * 2.0;
      meshRef.current.rotation.y += delta * 1.8;
    }

    const posAttr = laserLine.geometry.attributes.position as THREE.BufferAttribute;
    if (posAttr) {
      posAttr.setXYZ(0, 0, 0, 0); // Core center origin
      posAttr.setXYZ(1, x, y, z); // Satellite target coordinates
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Subtle Orbital Track Ring */}
      <primitive object={trackLoop} />

      {/* Dynamic Connecting Laser Line */}
      <primitive object={laserLine} />

      {/* Orbiting Satellite Node Geometry */}
      <mesh ref={meshRef}>
        {config.shape === 'diamond' && <octahedronGeometry args={[0.26, 0]} />}
        {config.shape === 'sphere' && <sphereGeometry args={[0.22, 16, 16]} />}
        {config.shape === 'box' && <boxGeometry args={[0.32, 0.32, 0.32]} />}
        {config.shape === 'torus' && <torusGeometry args={[0.22, 0.06, 12, 24]} />}
        <meshStandardMaterial
          color={config.threeColor}
          emissive={config.threeColor}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
};

// ----------------------------------------------------------------------------
// Revolving 3D Cultural Core Object Scene
// ----------------------------------------------------------------------------
const CulturalCoreScene: React.FC = () => {
  const outerGeodesicRef = useRef<THREE.Mesh>(null);
  const outerShellRef = useRef<THREE.Mesh>(null);
  const coreSphereRef = useRef<THREE.Mesh>(null);
  const coreSphereMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const corePointLightRef = useRef<THREE.PointLight>(null);

  const cyanColor = useMemo(() => new THREE.Color(0x06b6d4), []);
  const violetColor = useMemo(() => new THREE.Color(0x8b5cf6), []);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();

    // 1. Outer Geodesic Sphere revolving continuously on X and Y axes (0.005 rot/frame)
    if (outerGeodesicRef.current) {
      outerGeodesicRef.current.rotation.x += 0.005;
      outerGeodesicRef.current.rotation.y += 0.005;
    }

    // Secondary holographic shell counter-rotation for prismatic depth
    if (outerShellRef.current) {
      outerShellRef.current.rotation.x -= 0.0035;
      outerShellRef.current.rotation.y += 0.004;
    }

    // 2. Inner Glowing Core Sphere with dynamic Cyan/Violet emissive oscillation
    if (coreSphereMatRef.current) {
      const pulseIntensity = 1.8 + Math.sin(elapsed * 2.8) * 0.7;
      coreSphereMatRef.current.emissiveIntensity = pulseIntensity;

      // Color shift between cyan (#06B6D4) and violet (#8B5CF6)
      const colorLerp = (Math.sin(elapsed * 1.4) + 1) / 2;
      coreSphereMatRef.current.emissive.lerpColors(cyanColor, violetColor, colorLerp);
    }

    if (coreSphereRef.current) {
      coreSphereRef.current.rotation.y -= delta * 0.4;
    }

    if (corePointLightRef.current) {
      corePointLightRef.current.intensity = 3.6 + Math.sin(elapsed * 2.8) * 1.2;
    }
  });

  return (
    <group>
      {/* Dynamic Cultural Core Floating Group */}
      <Float speed={1.8} rotationIntensity={0.25} floatIntensity={0.5}>
        <group>
          {/* Outer Wireframe Geodesic Sphere (subdivided icosahedron detail 2) */}
          <mesh ref={outerGeodesicRef}>
            <icosahedronGeometry args={[2.1, 2]} />
            <meshBasicMaterial
              wireframe
              color="#06b6d4"
              transparent
              opacity={0.65}
            />
          </mesh>

          {/* Secondary Outer Prismatic Wireframe Shell */}
          <mesh ref={outerShellRef}>
            <icosahedronGeometry args={[2.35, 1]} />
            <meshBasicMaterial
              wireframe
              color="#8b5cf6"
              transparent
              opacity={0.32}
            />
          </mesh>

          {/* Inner Glowing Core Sphere */}
          <mesh ref={coreSphereRef}>
            <sphereGeometry args={[1.05, 32, 32]} />
            <meshStandardMaterial
              ref={coreSphereMatRef}
              color="#07111e"
              emissive="#06b6d4"
              emissiveIntensity={2.0}
              roughness={0.15}
              metalness={0.85}
            />
          </mesh>

          {/* Inner Core Point Lights Casting Radiance */}
          <pointLight ref={corePointLightRef} color="#06b6d4" intensity={4.0} distance={7.0} />
          <pointLight position={[0, 0, 0]} color="#8b5cf6" intensity={3.0} distance={6.0} />
        </group>
      </Float>

      {/* 4 Orbital Satellite Nodes (Music, Film, Dining, Fashion) */}
      {DOMAIN_SATELLITES.map((sat) => (
        <SatelliteNode key={sat.name} config={sat} />
      ))}

      {/* Subpixel Perspective Grid Floor */}
      <gridHelper args={[16, 18, 0x06b6d4, 0x142035]} position={[0, -2.7, 0]} />
      <mesh position={[0, -2.71, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial
          color="#040711"
          roughness={0.15}
          metalness={0.95}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Ambient Floating Particle Sparkles */}
      <Sparkles count={75} scale={10} size={2.5} speed={0.4} color="#22d3ee" />

      {/* Interactive Parallax Camera Controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        maxPolarAngle={Math.PI / 1.7}
        minPolarAngle={Math.PI / 2.4}
        rotateSpeed={0.5}
      />
    </group>
  );
};

// ----------------------------------------------------------------------------
// Main LandingHeroView Component
// ----------------------------------------------------------------------------
export const LandingHeroView: React.FC<LandingHeroViewProps> = ({
  onNavigateToTestbench,
  onNavigateToEvidence,
  onNavigateToScenarios,
  onNavigateToMission3D
}) => {
  return (
    <VibecodeCanvasLayout className="flex flex-col gap-12 bg-transparent">
      {/* ====================================================================
          1. SPLIT HERO SECTION
         ==================================================================== */}
      <section className="relative w-full min-h-[580px] lg:min-h-[640px] flex flex-col lg:flex-row items-center justify-between gap-8 pt-4 pb-8">
        {/* Left Side: High-Impact Copy, Badges, & CTAs */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex-1 flex flex-col items-start space-y-6 max-w-2xl z-10"
        >
          {/* Badge Tags Header */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Required Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 dark:text-cyan-400 light:text-cyan-700 text-xs font-mono font-semibold tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <SparklesIcon className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>QLOO-POWERED CULTURAL AI BENCHMARK</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-200/80 border border-white/10 dark:border-white/10 light:border-black/10 text-slate-300 dark:text-slate-300 light:text-slate-700 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ZERO HALLUCINATIONS</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-200/80 border border-white/10 dark:border-white/10 light:border-black/10 text-slate-300 dark:text-slate-300 light:text-slate-700 text-xs font-mono">
              <Database className="w-3.5 h-3.5 text-violet-400" />
              <span>SIGNED LEDGER</span>
            </div>
          </div>

          {/* Left Headline */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.12] text-slate-100 dark:text-slate-100 light:text-slate-900">
              Empirical Taste Grounding for{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                AI Agents
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 dark:text-slate-300 light:text-slate-600 leading-relaxed max-w-xl">
            AI agents frequently fabricate cultural affinity claims. TASTESPEC cross-examines agent recommendations against Qloo's 250M+ entity taste graph using 7 deterministic rules.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
            {/* Primary CTA: Launch Interactive Testbench */}
            <button
              onClick={onNavigateToTestbench}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm tracking-wide text-white bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.7)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>Launch Interactive Testbench</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Secondary CTA: View Evidence Graph */}
            {onNavigateToEvidence && (
              <button
                onClick={onNavigateToEvidence}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-medium text-sm tracking-wide text-slate-200 dark:text-slate-200 light:text-slate-700 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white/80 hover:bg-slate-800/80 dark:hover:bg-slate-800/80 light:hover:bg-slate-100 border border-white/10 dark:border-white/10 light:border-black/10 backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-cyan-500/40 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>View Evidence Graph</span>
              </button>
            )}

            {onNavigateToScenarios && (
              <button
                onClick={onNavigateToScenarios}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3.5 rounded-xl font-mono text-xs text-slate-300 dark:text-slate-300 light:text-slate-700 bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-200/80 border border-white/10 dark:border-white/10 light:border-black/10 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scenarios</span>
              </button>
            )}

            {onNavigateToMission3D && (
              <button
                onClick={onNavigateToMission3D}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-mono text-xs text-violet-300 dark:text-violet-300 light:text-violet-700 bg-violet-950/30 dark:bg-violet-950/30 light:bg-violet-100/80 border border-violet-500/30 hover:border-violet-500/50 transition-all duration-300 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <span>3D Mission Chamber</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 w-full border-t border-white/10 dark:border-white/10 light:border-black/10">
            <div className="flex flex-col">
              <span className="font-mono text-lg font-bold text-cyan-400">250M+</span>
              <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">Qloo Cultural Entities</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-lg font-bold text-emerald-400">7 Rules</span>
              <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">Deterministic Engine</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-lg font-bold text-violet-400">100%</span>
              <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">Signed Ledger Audit</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-lg font-bold text-amber-400">&lt; 120ms</span>
              <span className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">Verification Latency</span>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Interactive, Revolving 3D Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          className="flex-1 w-full relative flex items-center justify-center min-h-[440px] sm:min-h-[500px] lg:min-h-[560px]"
        >
          {/* 3D WebGL Canvas Viewport Container */}
          <div className="w-full h-[460px] sm:h-[520px] lg:h-[580px] relative rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing border border-white/10 bg-slate-950/20 backdrop-blur-sm">
            {/* Top HUD Pill */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/85 border border-white/10 dark:border-white/10 light:border-black/10 backdrop-blur-md shadow-lg pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono text-xs font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">
                Cultural Core Online • 4 Domains Active
              </span>
            </div>

            {/* Bottom Domain Legend Pills */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 dark:bg-slate-900/80 light:bg-white/85 border border-white/10 dark:border-white/10 light:border-black/10 backdrop-blur-md text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-sm bg-cyan-400" />
                  Music
                </span>
                <span className="flex items-center gap-1.5 text-violet-400">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  Film
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-400" />
                  Dining
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2 h-2 rounded-full border border-amber-400" />
                  Fashion
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Interactive Parallax Orbit
              </span>
            </div>

            {/* R3F WebGL Canvas */}
            <Canvas
              camera={{ position: [0, 1.2, 8.5], fov: 45 }}
              gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            >
              <ambientLight color="#0e1726" intensity={2.6} />
              <pointLight position={[-3, 3, 4]} color="#06b6d4" intensity={3.5} />
              <pointLight position={[3, -2, 4]} color="#8b5cf6" intensity={3.0} />
              <CulturalCoreScene />
            </Canvas>
          </div>
        </motion.div>
      </section>

      {/* ====================================================================
          2. STEP-BY-STEP "HOW TASTESPEC WORKS" SECTION (BELOW HERO)
         ==================================================================== */}
      <section className="relative w-full space-y-6 pt-2 pb-6">
        <div className="flex flex-col space-y-2">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase">
            <Activity className="w-3.5 h-3.5" />
            <span>Three-Stage Verification Pipeline</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight">
            How TASTESPEC Works
          </h2>
          <p className="text-sm sm:text-base text-slate-400 dark:text-slate-400 light:text-slate-600 max-w-2xl">
            Every candidate recommendation produced by an external cultural AI agent is systematically cross-examined through an empirical 3-stage audit chain.
          </p>
        </div>

        {/* 3 Step Cards in Responsive Grid with Frosted Glass & Backdrop-Blur */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* STEP 01: Entity Identity Resolution */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-card cyber-glass-panel relative overflow-hidden p-6 rounded-2xl flex flex-col justify-between space-y-5 backdrop-blur-xl group"
          >
            <div className="space-y-4">
              {/* Header: Step Number & Glow Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold tracking-widest px-2.5 py-1 rounded-md bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-500/15 text-cyan-400 dark:text-cyan-400 light:text-cyan-700 border border-cyan-500/30">
                  STEP 01
                </span>
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] group-hover:border-cyan-400/60 transition-colors">
                  <Search className="w-5 h-5" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-cyan-400 transition-colors">
                  Entity Identity Resolution
                </h3>
                <div className="font-mono text-xs text-cyan-400 dark:text-cyan-400 light:text-cyan-700 font-medium flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5" />
                  <span>Qloo Endpoint: /v2/search</span>
                </div>
              </div>

              {/* Plain-English Pipeline Description */}
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600">
                Verifies agent target names against Qloo <code className="px-1.5 py-0.5 rounded bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 text-cyan-300 dark:text-cyan-300 light:text-cyan-800 font-mono text-[11px]">/v2/search</code>. Resolves fuzzy candidate names to canonical entity URNs across 6 cultural domains with strict confidence thresholds, preventing identity spoofing.
              </p>

              {/* Micro-simulation diagram */}
              <div className="p-3 rounded-xl bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-100/90 border border-white/5 dark:border-white/5 light:border-black/5 font-mono text-[11px] space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500">
                  <span>Input Claim:</span>
                  <span className="text-slate-200 dark:text-slate-200 light:text-slate-800 font-semibold">"The Four Horsemen"</span>
                </div>
                <div className="flex items-center justify-between text-cyan-400">
                  <span>Resolved URN:</span>
                  <span className="truncate max-w-[170px] text-right font-mono">urn:qloo:dining:the-four-horsemen-nyc</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 text-[10px]">
                  <span>Taxonomy Status:</span>
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> CANONICAL MATCH (99.2%)
                  </span>
                </div>
              </div>
            </div>

            {/* Tags footer */}
            <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                Rule 1 Entity Verification
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-white/5">
                Zero Guesswork
              </span>
            </div>
          </motion.div>

          {/* STEP 02: Vector Insight Retrieval */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-card cyber-glass-panel relative overflow-hidden p-6 rounded-2xl flex flex-col justify-between space-y-5 backdrop-blur-xl group"
          >
            <div className="space-y-4">
              {/* Header: Step Number & Glow Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold tracking-widest px-2.5 py-1 rounded-md bg-violet-500/10 dark:bg-violet-500/10 light:bg-violet-500/15 text-violet-400 dark:text-violet-400 light:text-violet-700 border border-violet-500/30">
                  STEP 02
                </span>
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 dark:bg-violet-500/10 light:bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.25)] group-hover:border-violet-400/60 transition-colors">
                  <Database className="w-5 h-5" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-violet-400 transition-colors">
                  Vector Insight Retrieval
                </h3>
                <div className="font-mono text-xs text-violet-400 dark:text-violet-400 light:text-violet-700 font-medium flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Qloo Endpoint: /v2/insights</span>
                </div>
              </div>

              {/* Plain-English Pipeline Description */}
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600">
                Pulls empirical affinity scores from Qloo <code className="px-1.5 py-0.5 rounded bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-100 text-violet-300 dark:text-violet-300 light:text-violet-800 font-mono text-[11px]">/v2/insights</code>. Queries genuine cultural taste correlation matrices between seed personas, target entities, and cross-domain correlations without LLM fabrication.
              </p>

              {/* Micro-simulation diagram */}
              <div className="p-3 rounded-xl bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-100/90 border border-white/5 dark:border-white/5 light:border-black/5 font-mono text-[11px] space-y-2">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500">
                  <span>Persona Vector:</span>
                  <span className="text-slate-200 dark:text-slate-200 light:text-slate-800 font-semibold">Brooklyn Creative (Music + Dining)</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-violet-400 text-[10px]">
                    <span>Qloo Empirical Affinity:</span>
                    <span className="font-bold">0.884 (Threshold &gt;= 0.650)</span>
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-white/5">
                    <div className="bg-gradient-to-r from-violet-500 to-cyan-400 h-2 rounded-full w-[88.4%]" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Correlation Matrix:</span>
                  <span className="text-cyan-400 font-mono">250M+ Node Taste Graph</span>
                </div>
              </div>
            </div>

            {/* Tags footer */}
            <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-violet-950/40 text-violet-300 border border-violet-500/30">
                Rule 3 Numeric Provenance
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-white/5">
                Live Cultural Matrices
              </span>
            </div>
          </motion.div>

          {/* STEP 03: Deterministic Audit & Ledger */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-card cyber-glass-panel relative overflow-hidden p-6 rounded-2xl flex flex-col justify-between space-y-5 backdrop-blur-xl group"
          >
            <div className="space-y-4">
              {/* Header: Step Number & Glow Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold tracking-widest px-2.5 py-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/10 light:bg-emerald-500/15 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 border border-emerald-500/30">
                  STEP 03
                </span>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 light:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] group-hover:border-emerald-400/60 transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-emerald-400 transition-colors">
                  Deterministic Audit &amp; Ledger
                </h3>
                <div className="font-mono text-xs text-emerald-400 dark:text-emerald-400 light:text-emerald-700 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Engine: 7 Deterministic Rules</span>
                </div>
              </div>

              {/* Plain-English Pipeline Description */}
              <p className="text-xs sm:text-sm leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600">
                Checks claims against 7 math rules and seals an evidence ledger. Computes absolute divergence, verifies tolerance bounds, and commits an immutable, timestamped JSON cryptographic audit trace.
              </p>

              {/* Micro-simulation diagram */}
              <div className="p-3 rounded-xl bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-100/90 border border-white/5 dark:border-white/5 light:border-black/5 font-mono text-[11px] space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-400 light:text-slate-500">
                  <span>Audit Engine Verdict:</span>
                  <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">
                    PASS (VERIFIED)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300 dark:text-slate-300 light:text-slate-700">
                  <span>Delta Calculation:</span>
                  <span className="text-cyan-400 font-mono">|0.884 - 0.850| = 0.034 &lt;= 0.150</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Cryptographic Seal:</span>
                  <span className="text-violet-400 truncate max-w-[160px]">sha256:4a8b9e2...</span>
                </div>
              </div>
            </div>

            {/* Tags footer */}
            <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                Rule 7 Verified Ledger
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-white/5">
                Cryptographic Trace
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====================================================================
          3. ARCHITECTURAL PILLARS ROW
         ==================================================================== */}
      <section className="relative w-full space-y-6 pt-2 pb-8">
        <div className="flex flex-col space-y-2">
          <div className="inline-flex items-center gap-2 text-violet-400 text-xs font-mono font-semibold tracking-wider uppercase">
            <Cpu className="w-3.5 h-3.5" />
            <span>Guaranteed Soundness</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 tracking-tight">
            Engineered for Verifiable Cultural Intelligence
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 max-w-2xl">
            TasteSpec replaces subjective evaluation with empirical cultural affinity validation, strict network boundaries, and reproducible ledgers.
          </p>
        </div>

        {/* 3 Glassmorphic Feature Cards with Framer Motion Hover Elevation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Deterministic Rule Engine */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-card cyber-glass-panel relative overflow-hidden p-6 rounded-2xl flex flex-col justify-between space-y-5 backdrop-blur-xl group"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] group-hover:border-cyan-400/60 transition-colors">
                <Cpu className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-cyan-400 transition-colors">
                  Deterministic Rule Engine
                </h3>
                <div className="font-mono text-xs text-cyan-400/90 font-medium">
                  Zero LLM Guesswork or Hallucinations
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600">
                Evaluates candidate outputs against rigid mathematical formulas and verifiable entity taxonomy. Never uses secondary LLMs to manufacture speculative audit scores.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                Rules 1–7 Certified
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-white/5">
                Honest Epistemic Status
              </span>
            </div>
          </motion.div>

          {/* Card 2: Substantiated Evidence Ledger */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-card cyber-glass-panel relative overflow-hidden p-6 rounded-2xl flex flex-col justify-between space-y-5 backdrop-blur-xl group"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 dark:bg-violet-500/10 light:bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.25)] group-hover:border-violet-400/60 transition-colors">
                <Database className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-violet-400 transition-colors">
                  Substantiated Evidence Ledger
                </h3>
                <div className="font-mono text-xs text-violet-400/90 font-medium">
                  Traceable Qloo Entity Identity Resolution
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600">
                Every candidate is cross-referenced with live Qloo API v2 knowledge graphs. Cryptographic ledgering tracks exact parameters, entity URNs, and roundtrip timestamps.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-violet-950/40 text-violet-300 border border-violet-500/30">
                Qloo API v2
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-white/5">
                Full Provenance Trace
              </span>
            </div>
          </motion.div>

          {/* Card 3: SSRF-Protected Adapters */}
          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="glass-card cyber-glass-panel relative overflow-hidden p-6 rounded-2xl flex flex-col justify-between space-y-5 backdrop-blur-xl group"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 light:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] group-hover:border-emerald-400/60 transition-colors">
                <Lock className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 group-hover:text-emerald-400 transition-colors">
                  SSRF-Protected Adapters
                </h3>
                <div className="font-mono text-xs text-emerald-400/90 font-medium">
                  Secure Live Agent Endpoint Testing
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-300 dark:text-slate-300 light:text-slate-600">
                Safely dispatch real-time payloads to external cultural agents over secure HTTPS. Hardened against RFC1918 private IPs, AWS/GCP metadata endpoints, and loopback exploits.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                RFC1918 Blocked
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/60 text-slate-400 border border-white/5">
                Cloud Metadata Guard
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    </VibecodeCanvasLayout>
  );
};

export default LandingHeroView;
