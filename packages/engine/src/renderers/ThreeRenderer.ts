// ============================================================================
// @swarming/engine — Three.js Renderer
//
// Vanilla Three.js renderer for the swarming simulation.
// No React/Vue/Svelte dependency — pure Three.js + DOM.
// ============================================================================

import * as THREE from 'three';
import type { SimNode, SimEdge, SwarmingTheme } from '../types';

export interface RendererConfig {
  theme: SwarmingTheme;
  fov: number;
  cameraPosition: [number, number, number];
  showLabels: boolean;
}

export class ThreeRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  // Instanced meshes
  private hubMesh: THREE.InstancedMesh | null = null;
  private leafMesh: THREE.InstancedMesh | null = null;
  private edgeLines: THREE.LineSegments | null = null;

  // Buffers
  private edgePositions: Float32Array;
  private edgeColors: Float32Array;
  private maxEdges = 20000;
  private maxLeaves = 5000;

  // Labels
  private labelContainer: HTMLDivElement;
  private labelElements: Map<string, HTMLDivElement> = new Map();

  // Temp objects
  private tempObj = new THREE.Object3D();
  private tempColor = new THREE.Color();

  // Mouse interaction
  private isDragging = false;
  private prevMouse = { x: 0, y: 0 };
  private spherical = new THREE.Spherical();

  private config: RendererConfig;
  private animFrameId: number | null = null;
  private disposed = false;

  constructor(container: HTMLElement, config: RendererConfig) {
    this.container = container;
    this.config = config;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.theme.background);

    // Camera
    const rect = container.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(
      config.fov,
      rect.width / rect.height,
      0.1,
      500,
    );
    this.camera.position.set(...config.cameraPosition);
    this.camera.lookAt(0, 0, 0);

    // Spherical for orbit
    this.spherical.setFromVector3(this.camera.position);

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(20, 40, 20);
    this.scene.add(dirLight);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // Hub instanced mesh
    const hubGeo = new THREE.SphereGeometry(1, 32, 32);
    const hubMat = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.1,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: config.theme.hubEmissive,
      toneMapped: false,
    });
    this.hubMesh = new THREE.InstancedMesh(hubGeo, hubMat, 20);
    this.hubMesh.count = 0;
    this.hubMesh.frustumCulled = false;
    this.scene.add(this.hubMesh);

    // Leaf instanced mesh
    const leafGeo = new THREE.SphereGeometry(1, 8, 8);
    const leafMat = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.0,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: config.theme.leafEmissive,
      toneMapped: false,
    });
    this.leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, this.maxLeaves);
    this.leafMesh.count = 0;
    this.leafMesh.frustumCulled = false;
    this.scene.add(this.leafMesh);

    // Edge lines
    this.edgePositions = new Float32Array(this.maxEdges * 6);
    this.edgeColors = new Float32Array(this.maxEdges * 6);
    const edgeGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.Float32BufferAttribute(this.edgePositions, 3);
    const colAttr = new THREE.Float32BufferAttribute(this.edgeColors, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    edgeGeo.setAttribute('position', posAttr);
    edgeGeo.setAttribute('color', colAttr);
    edgeGeo.setDrawRange(0, 0);

    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      toneMapped: false,
    });
    this.edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    this.scene.add(this.edgeLines);

    // Label container
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    container.appendChild(this.labelContainer);

    // Resize
    this.resize();
    window.addEventListener('resize', this.resize);

    // Mouse orbit controls
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private resize = () => {
    const rect = this.container.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
  };

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.prevMouse.x = e.clientX;
    this.prevMouse.y = e.clientY;
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    this.prevMouse.x = e.clientX;
    this.prevMouse.y = e.clientY;

    this.spherical.setFromVector3(this.camera.position);
    this.spherical.theta -= dx * 0.005;
    this.spherical.phi -= dy * 0.005;
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    this.camera.position.setFromSpherical(this.spherical);
    this.camera.lookAt(0, 0, 0);
  };

  private onMouseUp = () => {
    this.isDragging = false;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.spherical.setFromVector3(this.camera.position);
    this.spherical.radius = Math.max(10, Math.min(150, this.spherical.radius + e.deltaY * 0.05));
    this.camera.position.setFromSpherical(this.spherical);
    this.camera.lookAt(0, 0, 0);
  };

  /** Update the rendered scene from simulation state */
  render(nodes: SimNode[], edges: SimEdge[]): void {
    if (this.disposed) return;

    const hubs = nodes.filter((n) => n.type === 'hub');
    const leaves = nodes.filter((n) => n.type === 'leaf');

    // Update hub instances
    if (this.hubMesh) {
      this.hubMesh.count = hubs.length;
      for (let i = 0; i < hubs.length; i++) {
        const n = hubs[i];
        this.tempObj.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        this.tempObj.scale.setScalar(n.radius);
        this.tempObj.updateMatrix();
        this.hubMesh.setMatrixAt(i, this.tempObj.matrix);
        this.tempColor.set(n.color);
        this.hubMesh.setColorAt(i, this.tempColor);
      }
      this.hubMesh.instanceMatrix.needsUpdate = true;
      if (this.hubMesh.instanceColor) this.hubMesh.instanceColor.needsUpdate = true;
    }

    // Update leaf instances
    if (this.leafMesh) {
      const count = Math.min(leaves.length, this.maxLeaves);
      this.leafMesh.count = count;
      for (let i = 0; i < count; i++) {
        const n = leaves[i];
        this.tempObj.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        this.tempObj.scale.setScalar(n.radius);
        this.tempObj.updateMatrix();
        this.leafMesh.setMatrixAt(i, this.tempObj.matrix);
        this.tempColor.set(n.color);
        this.leafMesh.setColorAt(i, this.tempColor);
      }
      this.leafMesh.instanceMatrix.needsUpdate = true;
      if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;
    }

    // Update edge lines
    if (this.edgeLines) {
      const count = Math.min(edges.length, this.maxEdges);
      for (let i = 0; i < count; i++) {
        const edge = edges[i];
        const src = edge.source as SimNode;
        const tgt = edge.target as SimNode;
        const idx = i * 6;

        this.edgePositions[idx] = src.x ?? 0;
        this.edgePositions[idx + 1] = src.y ?? 0;
        this.edgePositions[idx + 2] = src.z ?? 0;
        this.edgePositions[idx + 3] = tgt.x ?? 0;
        this.edgePositions[idx + 4] = tgt.y ?? 0;
        this.edgePositions[idx + 5] = tgt.z ?? 0;

        const isHubEdge = src.type === 'hub' && tgt.type === 'hub';
        const gray = isHubEdge ? 0.45 : 0.75;
        this.edgeColors[idx] = gray;
        this.edgeColors[idx + 1] = gray;
        this.edgeColors[idx + 2] = gray;
        this.edgeColors[idx + 3] = gray;
        this.edgeColors[idx + 4] = gray;
        this.edgeColors[idx + 5] = gray;
      }
      const posAttr = this.edgeLines.geometry.getAttribute('position') as THREE.Float32BufferAttribute;
      const colAttr = this.edgeLines.geometry.getAttribute('color') as THREE.Float32BufferAttribute;
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      this.edgeLines.geometry.setDrawRange(0, count * 2);
    }

    // Update labels
    if (this.config.showLabels) {
      this.updateLabels(hubs);
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  private updateLabels(hubs: SimNode[]): void {
    const seen = new Set<string>();

    for (const hub of hubs) {
      seen.add(hub.id);
      let el = this.labelElements.get(hub.id);
      if (!el) {
        el = document.createElement('div');
        el.style.cssText = `
          position:absolute;font-family:monospace;font-size:11px;font-weight:700;
          padding:2px 6px;border-radius:3px;white-space:nowrap;user-select:none;
          transform:translate(-50%,-100%);
          color:${this.config.theme.labelColor};
          background:${this.config.theme.labelBackground};
        `;
        this.labelContainer.appendChild(el);
        this.labelElements.set(hub.id, el);
      }
      el.textContent = hub.label;

      // Project 3D → 2D
      const pos = new THREE.Vector3(hub.x ?? 0, (hub.y ?? 0) + hub.radius + 0.5, hub.z ?? 0);
      pos.project(this.camera);
      const rect = this.container.getBoundingClientRect();
      const x = (pos.x * 0.5 + 0.5) * rect.width;
      const y = (-pos.y * 0.5 + 0.5) * rect.height;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.display = pos.z > 1 ? 'none' : '';
    }

    // Remove stale labels
    for (const [id, el] of this.labelElements) {
      if (!seen.has(id)) {
        el.remove();
        this.labelElements.delete(id);
      }
    }
  }

  /** Update theme at runtime */
  setTheme(theme: SwarmingTheme): void {
    this.config.theme = theme;
    this.scene.background = new THREE.Color(theme.background);

    if (this.hubMesh) {
      (this.hubMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = theme.hubEmissive;
    }
    if (this.leafMesh) {
      (this.leafMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = theme.leafEmissive;
    }
  }

  /** Capture as PNG data URL */
  takeSnapshot(): string | null {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png', 1.0);
  }

  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Destroy the renderer */
  destroy(): void {
    this.disposed = true;
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.resize);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);

    for (const el of this.labelElements.values()) el.remove();
    this.labelElements.clear();
    this.labelContainer.remove();

    this.renderer.dispose();
    this.scene.clear();
  }
}
