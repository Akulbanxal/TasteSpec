import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { MISSION_CHECKPOINTS, type CheckpointStatus } from './missionState.js';

interface SceneCallbacks {
  onSelectCheckpoint: (id: string) => void;
  onHoverCheckpoint?: (id: string | null) => void;
}

export class MissionChamberScene {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private animFrameId: number | null = null;
  private isDestroyed = false;
  private isRendering = false;

  // Floor Reflector & Architectural Elements
  private floorReflector: Reflector | null = null;

  // Robotic Explorer Drone with Torus Gyros & Cyan Core
  private robotGroup: THREE.Group = new THREE.Group();
  private robotCore: THREE.Mesh | null = null;
  private innerGyro: THREE.Mesh | null = null;
  private outerGyro: THREE.Mesh | null = null;
  private robotLight: THREE.PointLight | null = null;
  private robotHead: THREE.Mesh | null = null;

  // 5 Holographic Checkpoints & Vertical Cylinder Beams
  private checkpointMeshes: Map<string, THREE.Group> = new Map();
  private beaconPillars: Map<string, THREE.Mesh> = new Map();
  private glowRings: Map<string, THREE.Mesh> = new Map();
  private verticalBeams: Map<string, THREE.Mesh> = new Map();
  private beamCoreLines: Map<string, THREE.Mesh> = new Map();
  private checkpointStatuses: Map<string, CheckpointStatus> = new Map();

  // Floating Data Particle Field (300 points)
  private particlePoints: THREE.Points | null = null;
  private particlePositions: Float32Array = new Float32Array(300 * 3);
  private particleVelocities: Float32Array = new Float32Array(300 * 3);

  // Raycasting & Interaction
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Animation & Physics Targets
  private targetRobotX = -4; // Starts at first checkpoint (contract_validation)
  private currentRobotX = -4;
  private hoverElevation = 0.85;
  private clock = new THREE.Clock();
  private prefersReducedMotion = false;

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    if (typeof window !== 'undefined' && window.matchMedia) {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030509);
    this.scene.fog = new THREE.FogExp2(0x030509, 0.045);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 3.8, 9.2);
    this.camera.lookAt(0, 1.2, 0);

    this.initRenderer(width, height);
    this.buildChamber(width, height);
    this.buildParticleField();
    this.buildRobot();
    this.buildCheckpoints();

    this.setupListeners();
    this.startLoop();
  }

  private initRenderer(width: number, height: number): void {
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false
      });
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(width, height);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.container.appendChild(this.renderer.domElement);
    } catch (e) {
      console.warn('WebGL initialization failed in MissionChamberScene:', e);
      this.renderer = null;
    }
  }

  private buildChamber(width: number, height: number): void {
    // 1. Atmosphere Lighting
    const ambientLight = new THREE.AmbientLight(0x0d1726, 2.8);
    this.scene.add(ambientLight);

    const keyCyanLight = new THREE.DirectionalLight(0x06b6d4, 2.2);
    keyCyanLight.position.set(-6, 10, 6);
    this.scene.add(keyCyanLight);

    const fillVioletLight = new THREE.DirectionalLight(0x8b5cf6, 1.6);
    fillVioletLight.position.set(6, 8, -4);
    this.scene.add(fillVioletLight);

    // 2. Interactive Floor Grid Reflector with Metallic Depth
    try {
      const reflectorGeo = new THREE.PlaneGeometry(22, 10);
      const reflector = new Reflector(reflectorGeo, {
        clipBias: 0.003,
        textureWidth: Math.min(width * (window.devicePixelRatio || 1), 1024),
        textureHeight: Math.min(height * (window.devicePixelRatio || 1), 1024),
        color: 0x243248,
        multisample: 2
      });
      reflector.rotation.x = -Math.PI / 2;
      reflector.position.y = 0;
      this.floorReflector = reflector;
      this.scene.add(reflector);
    } catch (e) {
      console.warn('Reflector initialization fallback:', e);
      const fallbackGeo = new THREE.PlaneGeometry(22, 10);
      const fallbackMat = new THREE.MeshStandardMaterial({
        color: 0x050a14,
        roughness: 0.15,
        metalness: 0.95
      });
      const floor = new THREE.Mesh(fallbackGeo, fallbackMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0;
      this.scene.add(floor);
    }

    // Subpixel metallic perspective grid overlaying the floor
    const gridHelper = new THREE.GridHelper(22, 22, 0x06b6d4, 0x142035);
    gridHelper.position.y = 0.015;
    this.scene.add(gridHelper);

    // Central glowing energy runway line linking pedestals
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, 12, 16);
    const railMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.85 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.03, 0);
    this.scene.add(rail);

    // Chamber rear structural panels
    const backWallGeo = new THREE.BoxGeometry(20, 5, 0.2);
    const backWallMat = new THREE.MeshStandardMaterial({
      color: 0x070c18,
      roughness: 0.6,
      metalness: 0.7
    });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, 2.5, -3.2);
    this.scene.add(backWall);

    // Cyan glowing architectural rib
    const ribGeo = new THREE.BoxGeometry(19, 0.08, 0.06);
    const ribMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.position.set(0, 2.6, -3.08);
    this.scene.add(rib);
  }

  /**
   * Floating Data Particle Field (300 points) drifting slowly in 3D space
   */
  private buildParticleField(): void {
    const particleCount = 300;
    const geometry = new THREE.BufferGeometry();
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Scatter positions across chamber volume
      this.particlePositions[i * 3] = (Math.random() - 0.5) * 18; // X: -9 to +9
      this.particlePositions[i * 3 + 1] = 0.3 + Math.random() * 4.8; // Y: 0.3 to 5.1
      this.particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8; // Z: -4 to +4

      // Gentle drift velocities
      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.15;
      this.particleVelocities[i * 3 + 1] = 0.08 + Math.random() * 0.14; // upward drift
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;

      // Color scheme: Cyan (#06b6d4), Violet (#8b5cf6), and Crisp White-Cyan (#e0f2fe)
      const colorType = Math.random();
      if (colorType < 0.55) {
        // Cyan
        colors[i * 3] = 0.024;
        colors[i * 3 + 1] = 0.714;
        colors[i * 3 + 2] = 0.831;
      } else if (colorType < 0.85) {
        // Violet
        colors[i * 3] = 0.545;
        colors[i * 3 + 1] = 0.361;
        colors[i * 3 + 2] = 0.965;
      } else {
        // Crisp White-Cyan
        colors[i * 3] = 0.88;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particlePoints = new THREE.Points(geometry, material);
    this.scene.add(this.particlePoints);
  }

  /**
   * Floating Robotic Explorer Drone with Spinning Wireframe Torus Gyro and Pulsing Cyan Core
   */
  private buildRobot(): void {
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.92,
      roughness: 0.22
    });

    const cyberMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25
    });

    // 1. Central Pulsing Cyan Energy Core
    const coreGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x22d3ee,
      emissiveIntensity: 2.2,
      roughness: 0.1,
      metalness: 0.3
    });
    this.robotCore = new THREE.Mesh(coreGeo, coreMat);
    this.robotGroup.add(this.robotCore);

    // 2. Dual Spinning Wireframe Torus Gyro
    // Inner Gyro Torus
    const innerGyroGeo = new THREE.TorusGeometry(0.32, 0.015, 12, 36);
    const innerGyroMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });
    this.innerGyro = new THREE.Mesh(innerGyroGeo, innerGyroMat);
    this.robotGroup.add(this.innerGyro);

    // Outer Gyro Torus
    const outerGyroGeo = new THREE.TorusGeometry(0.44, 0.015, 12, 36);
    const outerGyroMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    this.outerGyro = new THREE.Mesh(outerGyroGeo, outerGyroMat);
    this.robotGroup.add(this.outerGyro);

    // 3. Drone Armored Chassis & Sensor Hull
    const chassisGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.22, 8);
    const chassis = new THREE.Mesh(chassisGeo, hullMat);
    chassis.position.y = 0.26;
    this.robotGroup.add(chassis);

    // Sensor Dome / Head
    const headGeo = new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.robotHead = new THREE.Mesh(headGeo, cyberMat);
    this.robotHead.position.y = 0.37;
    this.robotGroup.add(this.robotHead);

    // Cyber Eye Visor
    const visorGeo = new THREE.BoxGeometry(0.18, 0.05, 0.08);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.38, 0.16);
    this.robotGroup.add(visor);

    // 4. Lateral Stabilizer Thrusters (4 corners) with downward particle aura
    const thrusterGeo = new THREE.ConeGeometry(0.07, 0.14, 8);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const offsets = [
      [-0.34, -0.15, -0.15],
      [0.34, -0.15, -0.15],
      [-0.34, -0.15, 0.15],
      [0.34, -0.15, 0.15]
    ];

    offsets.forEach(([x, y, z]) => {
      const t = new THREE.Mesh(thrusterGeo, thrusterMat);
      t.position.set(x, y, z);
      t.rotation.x = Math.PI;
      this.robotGroup.add(t);
    });

    // 5. Intense Point Light casting aura from pulsing core
    this.robotLight = new THREE.PointLight(0x06b6d4, 3.0, 5.0);
    this.robotLight.position.set(0, 0, 0);
    this.robotGroup.add(this.robotLight);

    this.robotGroup.position.set(this.currentRobotX, this.hoverElevation, 0);
    this.scene.add(this.robotGroup);
  }

  /**
   * 5 Holographic Checkpoint Pedestals with Vertical Glowing Cylinder Beams
   */
  private buildCheckpoints(): void {
    const basePillarGeo = new THREE.CylinderGeometry(0.38, 0.46, 0.45, 16);
    const ringGeo = new THREE.TorusGeometry(0.48, 0.025, 8, 32);

    // Vertical glowing cylinder beam geometry (from pedestal apex into chamber ceiling)
    const beamGeo = new THREE.CylinderGeometry(0.24, 0.32, 4.8, 32, 1, true);
    const beamCoreGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.8, 8);

    MISSION_CHECKPOINTS.forEach((cp, idx) => {
      const group = new THREE.Group();
      group.position.set(...cp.position);
      (group as any).checkpointId = cp.id;

      // Platform pedestal base
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0f192b,
        metalness: 0.85,
        roughness: 0.25
      });
      const pedestal = new THREE.Mesh(basePillarGeo, mat);
      pedestal.position.y = 0.225;
      group.add(pedestal);

      // Apex Crystal (Spinning Octahedron)
      const beaconGeo = new THREE.OctahedronGeometry(0.18, 0);
      const beaconColor = this.getStatusColor(cp.status);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: beaconColor,
        emissive: beaconColor,
        emissiveIntensity: cp.status === 'active' ? 1.0 : 0.3,
        roughness: 0.15,
        metalness: 0.85
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 0.65;
      group.add(beacon);
      this.beaconPillars.set(cp.id, beacon);

      // Holographic Status Ring on base
      const ringMat = new THREE.MeshBasicMaterial({
        color: beaconColor,
        transparent: true,
        opacity: cp.status === 'active' ? 0.95 : 0.35
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.04;
      group.add(ring);
      this.glowRings.set(cp.id, ring);

      // Vertical Glowing Cylinder Beam
      const beamMat = new THREE.MeshBasicMaterial({
        color: beaconColor,
        transparent: true,
        opacity: cp.status === 'active' ? 0.65 : cp.status === 'completed' ? 0.45 : 0.08,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const verticalBeam = new THREE.Mesh(beamGeo, beamMat);
      verticalBeam.position.y = 2.45;
      group.add(verticalBeam);
      this.verticalBeams.set(cp.id, verticalBeam);

      // Inner Core Laser Line
      const beamCoreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: cp.status === 'active' ? 0.85 : cp.status === 'completed' ? 0.6 : 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const beamCore = new THREE.Mesh(beamCoreGeo, beamCoreMat);
      beamCore.position.y = 2.45;
      group.add(beamCore);
      this.beamCoreLines.set(cp.id, beamCore);

      // Tag for raycasting
      (pedestal as any).checkpointId = cp.id;
      (beacon as any).checkpointId = cp.id;
      (verticalBeam as any).checkpointId = cp.id;

      this.scene.add(group);
      this.checkpointMeshes.set(cp.id, group);
      this.checkpointStatuses.set(cp.id, cp.status);

      if (idx === 0) {
        this.targetRobotX = cp.position[0];
        this.currentRobotX = cp.position[0];
      }
    });
  }

  private getStatusColor(status: CheckpointStatus): number {
    switch (status) {
      case 'completed':
        return 0x10b981; // emerald
      case 'active':
        return 0x06b6d4; // cyan
      case 'warning':
        return 0xf59e0b; // amber
      case 'failed':
        return 0xef4444; // rose
      case 'idle':
      default:
        return 0x334155; // slate
    }
  }

  public updateCheckpointStatus(checkpointId: string, status: CheckpointStatus): void {
    this.checkpointStatuses.set(checkpointId, status);
    const beacon = this.beaconPillars.get(checkpointId);
    const ring = this.glowRings.get(checkpointId);
    const beam = this.verticalBeams.get(checkpointId);
    const beamCore = this.beamCoreLines.get(checkpointId);
    const color = this.getStatusColor(status);

    if (beacon && beacon.material instanceof THREE.MeshStandardMaterial) {
      beacon.material.color.setHex(color);
      beacon.material.emissive.setHex(color);
      beacon.material.emissiveIntensity = status === 'active' ? 1.2 : status === 'completed' ? 0.8 : 0.3;
    }

    if (ring && ring.material instanceof THREE.MeshBasicMaterial) {
      ring.material.color.setHex(color);
      ring.material.opacity = status === 'active' ? 0.95 : status === 'completed' ? 0.75 : 0.3;
    }

    if (beam && beam.material instanceof THREE.MeshBasicMaterial) {
      beam.material.color.setHex(color);
      beam.material.opacity = status === 'active' ? 0.75 : status === 'completed' ? 0.5 : status === 'failed' ? 0.8 : 0.08;
    }

    if (beamCore && beamCore.material instanceof THREE.MeshBasicMaterial) {
      beamCore.material.opacity = status === 'active' ? 0.9 : status === 'completed' ? 0.7 : status === 'failed' ? 0.95 : 0.05;
    }

    // Auto-glide drone to the active checkpoint
    if (status === 'active') {
      this.setRobotTargetCheckpoint(checkpointId);
    }
  }

  public setRobotTargetCheckpoint(checkpointId: string): void {
    const cp = MISSION_CHECKPOINTS.find(c => c.id === checkpointId);
    if (cp) {
      this.targetRobotX = cp.position[0];
    }
  }

  private setupListeners(): void {
    const dom = this.container;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);
      let hoveredId: string | null = null;

      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && !(cur as any).checkpointId) {
          cur = cur.parent;
        }
        if (cur && (cur as any).checkpointId) {
          hoveredId = (cur as any).checkpointId;
          break;
        }
      }

      dom.style.cursor = hoveredId ? 'pointer' : 'default';
      if (this.callbacks.onHoverCheckpoint) {
        this.callbacks.onHoverCheckpoint(hoveredId);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      for (const hit of intersects) {
        let cur: THREE.Object3D | null = hit.object;
        while (cur && !(cur as any).checkpointId) {
          cur = cur.parent;
        }
        if (cur && (cur as any).checkpointId) {
          const id = (cur as any).checkpointId;
          this.setRobotTargetCheckpoint(id);
          this.callbacks.onSelectCheckpoint(id);
          break;
        }
      }
    };

    dom.addEventListener('mousemove', handlePointerMove);
    dom.addEventListener('click', handleClick);

    (this as any).cleanupListeners = () => {
      dom.removeEventListener('mousemove', handlePointerMove);
      dom.removeEventListener('click', handleClick);
    };
  }

  public handleResize(width: number, height: number): void {
    if (!this.renderer || this.isDestroyed) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private startLoop(): void {
    this.isRendering = true;

    const render = () => {
      if (this.isDestroyed || !this.isRendering || !this.renderer) return;

      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      // 1. Smooth Robot Translation toward Target Checkpoint
      const speed = this.prefersReducedMotion ? 10.0 : 4.2;
      const prevX = this.currentRobotX;
      this.currentRobotX += (this.targetRobotX - this.currentRobotX) * Math.min(delta * speed, 0.2);
      this.robotGroup.position.x = this.currentRobotX;

      // Dynamic banking/tilt during horizontal flight
      const velocityX = (this.currentRobotX - prevX) / Math.max(delta, 0.001);
      this.robotGroup.rotation.z = THREE.MathUtils.lerp(this.robotGroup.rotation.z, -velocityX * 0.08, 0.1);

      // 2. Harmonic Drone Bobbing & Spinning Torus Gyros
      if (!this.prefersReducedMotion) {
        this.robotGroup.position.y = this.hoverElevation + Math.sin(elapsed * 2.6) * 0.08;

        if (this.robotHead) {
          this.robotHead.rotation.y = Math.sin(elapsed * 1.4) * 0.25;
        }

        // Spinning Wireframe Torus Gyros
        if (this.innerGyro) {
          this.innerGyro.rotation.x += delta * 2.8;
          this.innerGyro.rotation.y += delta * 1.9;
        }
        if (this.outerGyro) {
          this.outerGyro.rotation.y += delta * 1.4;
          this.outerGyro.rotation.z += delta * 2.2;
        }

        // Pulsing Cyan Core Light & Emission
        const corePulse = 1.8 + Math.sin(elapsed * 4.2) * 0.8;
        if (this.robotCore && this.robotCore.material instanceof THREE.MeshStandardMaterial) {
          this.robotCore.material.emissiveIntensity = corePulse;
        }
        if (this.robotLight) {
          this.robotLight.intensity = corePulse * 1.4;
        }
      }

      // 3. Rotating Apex Crystals & Pulsing Vertical Cylinder Beams
      this.beaconPillars.forEach((beacon, id) => {
        if (!this.prefersReducedMotion) {
          beacon.rotation.y += delta * 1.4;
          beacon.rotation.z = Math.sin(elapsed * 2.0 + id.length) * 0.12;
        }

        const status = this.checkpointStatuses.get(id);
        const beam = this.verticalBeams.get(id);
        if (beam && beam.material instanceof THREE.MeshBasicMaterial && status === 'active') {
          // Dynamic beam pulse on active checkpoint
          const pulse = 0.55 + Math.sin(elapsed * 5.5) * 0.25;
          beam.material.opacity = pulse;
        }
      });

      // 4. Floating Data Particle Field (300 points) Animation
      if (this.particlePoints && !this.prefersReducedMotion) {
        const positions = this.particlePositions;
        const velocities = this.particleVelocities;
        const count = 300;

        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          // Upward drift with gentle sinusoidal sway
          positions[idx + 1] += velocities[idx + 1] * delta * 4.5;
          positions[idx] += Math.sin(elapsed * 0.8 + i) * 0.003;
          positions[idx + 2] += Math.cos(elapsed * 0.8 + i) * 0.003;

          // Boundary reset: loop back to bottom
          if (positions[idx + 1] > 5.2) {
            positions[idx + 1] = 0.3;
            positions[idx] = (Math.random() - 0.5) * 18;
            positions[idx + 2] = (Math.random() - 0.5) * 8;
          }
        }

        this.particlePoints.geometry.attributes.position.needsUpdate = true;
      }

      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  public pause(): void {
    this.isRendering = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resume(): void {
    if (!this.isRendering && !this.isDestroyed) {
      this.clock.start();
      this.startLoop();
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.pause();

    if ((this as any).cleanupListeners) {
      (this as any).cleanupListeners();
    }

    if (this.floorReflector) {
      this.floorReflector.geometry?.dispose();
      if (Array.isArray(this.floorReflector.material)) {
        this.floorReflector.material.forEach(m => m.dispose());
      } else {
        this.floorReflector.material?.dispose();
      }
    }

    // Dispose geometries and materials cleanly
    this.scene.traverse((obj) => {
      if ((obj as any).isMesh || (obj as any).isPoints) {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
  }
}
