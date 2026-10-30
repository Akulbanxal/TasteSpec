import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { EvidenceGraphNode, EvidenceGraphEdge } from './evidenceGraphModel.js';

interface Lazy3DCanvasProps {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
  selectedNode: EvidenceGraphNode | null;
  onSelectNode: (node: EvidenceGraphNode) => void;
  onReturnTo2D: () => void;
}

export const Lazy3DCanvas: React.FC<Lazy3DCanvasProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  onReturnTo2D
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedNodeRef = useRef(selectedNode);
  selectedNodeRef.current = selectedNode;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030509);
    scene.fog = new THREE.FogExp2(0x030509, 0.0025);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 40, 420);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 3. Ambient & Atmospheric Lighting
    const ambientLight = new THREE.AmbientLight(0x0e1726, 2.5);
    scene.add(ambientLight);

    const keyCyanLight = new THREE.PointLight(0x06b6d4, 2.5, 800);
    keyCyanLight.position.set(0, 150, 250);
    scene.add(keyCyanLight);

    const violetFillLight = new THREE.PointLight(0x8b5cf6, 1.8, 600);
    violetFillLight.position.set(200, -100, 150);
    scene.add(violetFillLight);

    // Subtle 3D floor grid for spatial depth
    const gridHelper = new THREE.GridHelper(500, 20, 0x06b6d4, 0x142035);
    gridHelper.position.y = -120;
    scene.add(gridHelper);

    // 4. Glowing 3D Node Meshes
    // Shapes: Diamond for Seed, Circle/Sphere for Resolved Entity, Square/Cube for Recommendation
    const nodeMeshes = new Map<string, THREE.Mesh>();
    const nodeHaloMeshes = new Map<string, THREE.Mesh>();

    const diamondGeo = new THREE.OctahedronGeometry(12, 0); // Diamond for Seed
    const sphereGeo = new THREE.SphereGeometry(10, 32, 24); // Circle/Sphere for Resolved Entity
    const boxGeo = new THREE.BoxGeometry(14, 14, 14); // Square/Cube for Agent Recommendation
    const hexGeo = new THREE.CylinderGeometry(11, 11, 8, 6); // Hexagon for Findings
    const candidateGeo = new THREE.CylinderGeometry(10, 10, 12, 16); // Cylinder for Candidate Insight

    const materials = {
      seed: new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x22d3ee,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.8
      }),
      pass: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.7
      }),
      fail: new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.7
      }),
      warn: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.7
      }),
      unverifiable: new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.7,
        roughness: 0.3,
        metalness: 0.6
      }),
      recommendation: new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8
      })
    };

    // Center nodes in 3D coordinate space
    const offsetX = 480;
    const offsetY = 280;

    nodes.forEach(node => {
      let geo: THREE.BufferGeometry = sphereGeo;
      let mat = materials.pass;

      if (node.type === 'seed' || node.shape === 'diamond') {
        geo = diamondGeo;
        mat = materials.seed;
      } else if (node.type === 'agent_recommendation' || node.shape === 'square') {
        geo = boxGeo;
        mat = materials.recommendation;
      } else if (node.shape === 'round-rect') {
        geo = candidateGeo;
        mat = materials.unverifiable;
      } else if (node.shape === 'hexagon') {
        geo = hexGeo;
        mat = materials.warn;
      } else {
        // Circle / Resolved Entity
        geo = sphereGeo;
        if (node.status === 'FAIL') mat = materials.fail;
        else if (node.status === 'WARNING') mat = materials.warn;
        else if (node.status === 'UNVERIFIABLE') mat = materials.unverifiable;
        else mat = materials.pass;
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((node.x - offsetX) * 0.75, -(node.y - offsetY) * 0.75, (Math.random() - 0.5) * 35);
      mesh.userData = { nodeId: node.id };
      scene.add(mesh);
      nodeMeshes.set(node.id, mesh);

      // Wireframe outer halo for selected state
      const haloGeo = geo.clone();
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.0
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.scale.set(1.35, 1.35, 1.35);
      haloMesh.position.copy(mesh.position);
      scene.add(haloMesh);
      nodeHaloMeshes.set(node.id, haloMesh);
    });

    // 5. Connecting Edge Lines & Dynamic Flow Particles
    const lineMatSubstantiated = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.55
    });
    const lineMatUnsubstantiated = new THREE.LineDashedMaterial({
      color: 0xf43f5e,
      dashSize: 6,
      gapSize: 4,
      transparent: true,
      opacity: 0.45
    });

    interface ParticleFlowEdge {
      src: THREE.Vector3;
      tgt: THREE.Vector3;
      mesh: THREE.Mesh;
      phase: number;
      speed: number;
    }
    const particleFlowEdges: ParticleFlowEdge[] = [];

    const particleSphereGeo = new THREE.SphereGeometry(2.2, 8, 8);
    const particleSphereMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.95
    });

    edges.forEach((edge, idx) => {
      const srcMesh = nodeMeshes.get(edge.sourceId);
      const tgtMesh = nodeMeshes.get(edge.targetId);
      if (srcMesh && tgtMesh) {
        const points = [srcMesh.position, tgtMesh.position];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(
          lineGeo,
          edge.substantiated ? lineMatSubstantiated : lineMatUnsubstantiated
        );
        scene.add(line);

        // For substantiated edges, add animated 3D flow particle
        if (edge.substantiated) {
          const flowMesh = new THREE.Mesh(particleSphereGeo, particleSphereMat);
          flowMesh.position.copy(srcMesh.position);
          scene.add(flowMesh);

          particleFlowEdges.push({
            src: srcMesh.position,
            tgt: tgtMesh.position,
            mesh: flowMesh,
            phase: (idx * 0.25) % 1.0,
            speed: 0.4 + (idx % 3) * 0.1
          });
        }
      }
    });

    // 6. Raycasting for Interactive Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(nodeMeshes.values()));

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const clickedNodeId = clickedMesh.userData.nodeId;
        const targetNode = nodes.find(n => n.id === clickedNodeId);
        if (targetNode) {
          onSelectNode(targetNode);
        }
      }
    };

    container.addEventListener('click', handleClick);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Gentle orbital chamber rotation
      scene.rotation.y = Math.sin(elapsed * 0.15) * 0.15;

      // Animate 3D Dynamic Particle Flow along Substantiated Edges
      particleFlowEdges.forEach(item => {
        item.phase = (item.phase + delta * item.speed) % 1.0;
        item.mesh.position.lerpVectors(item.src, item.tgt, item.phase);
      });

      // Update Halos for Selected Node
      const currentSelectedId = selectedNodeRef.current?.id;
      nodeHaloMeshes.forEach((halo, id) => {
        const mat = halo.material as THREE.MeshBasicMaterial;
        if (id === currentSelectedId) {
          mat.opacity = 0.85;
          halo.rotation.y += delta * 1.5;
          halo.rotation.x += delta * 1.0;
        } else {
          mat.opacity = 0.0;
        }
      });

      // Slowly spin seed diamonds
      nodeMeshes.forEach((mesh) => {
        mesh.rotation.y += delta * 0.6;
      });

      renderer.render(scene, camera);
    };
    animate();

    // 8. Strict Cleanup and WebGL Disposal
    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('click', handleClick);

      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [nodes, edges]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '520px',
        borderRadius: '1rem',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        background: '#030509'
      }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Return to 2D Button & 3D HUD */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          display: 'flex',
          gap: '0.6rem',
          zIndex: 10
        }}
      >
        <button
          type="button"
          onClick={onReturnTo2D}
          style={{
            background: 'rgba(10, 15, 28, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: '#22d3ee',
            padding: '0.4rem 0.85rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
          }}
        >
          Return to 2D Graph
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          background: 'rgba(10, 15, 28, 0.80)',
          backdropFilter: 'blur(12px)',
          padding: '0.35rem 0.75rem',
          borderRadius: '0.375rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.7rem',
          color: '#94a3b8',
          pointerEvents: 'none'
        }}
      >
        3D Particle Stream Active • Click any node shape to inspect
      </div>
    </div>
  );
};

export default Lazy3DCanvas;
