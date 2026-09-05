import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const canvas = document.querySelector('#truck-canvas');
const view = document.querySelector('#model-view');
const experience = document.querySelector('#experience');
const chapters = [...document.querySelectorAll('[data-chapter]')];
const chapterLinks = [...document.querySelectorAll('[data-step]')];
const toggle = document.querySelector('#motion-toggle');
const status = document.querySelector('#model-status');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 700px)');
const clamp = (x, min = 0, max = 1) => Math.min(max, Math.max(min, x));
const ease = (x) => x * x * (3 - 2 * x);
const chapterStates = [
  { group: null, title: 'FLATBED / READY TO LOAD', eye: [-18, 10, 28], target: [0, 1.1, 0] },
  { group: 'Cargo_Steel', title: 'STRUCTURAL STEEL / OPEN DECK', eye: [-14, 12, 30], target: [-0.3, 1.5, 0] },
  { group: 'Cargo_Precast', title: 'PRECAST CONCRETE / OPEN DECK', eye: [-9, 11, 31], target: [-0.3, 1.5, 0] },
  { group: 'Cargo_Wire', title: 'WIRE & REINFORCEMENT / OPEN DECK', eye: [-5, 14, 30], target: [-0.3, 1.5, 0] },
  { group: 'Cargo_Machinery', title: 'INDUSTRIAL EQUIPMENT / OPEN DECK', eye: [-16, 12, 28], target: [-0.3, 1.6, 0] },
];
const assemblyNames = ['Tractor', 'Trailer', ...chapterStates.slice(1).map(({ group }) => group)];

let renderer, scene, camera, rig;
let groups = [];
const glazingMeshes = [];
const assemblyDiagnostics = [];
let current = 0;
let desired = 0;
let frame = 0;
let lastTime = 0;
let ready = false;
let paused = reduceMotion.matches;
let activeChapter = -1;
let inView = true;
let viewportWidth = 0;
let viewportHeight = 0;
const cameraPosition = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const scratch = new THREE.Vector3();

function renderSoon() {
  if (!frame && ready && !document.hidden && inView) frame = requestAnimationFrame(render);
}

function updateScroll() {
  if (!ready) return;
  if (reduceMotion.matches) {
    desired = 1;
  } else {
    // Native scroll position is the timeline; wheel and touch events are never intercepted.
    const range = chapters[chapters.length - 1].offsetTop - chapters[0].offsetTop;
    const travelled = -experience.getBoundingClientRect().top;
    desired = range > 0 ? clamp(travelled / range) * 4 : 0;
  }
  if (paused) current = desired;
  renderSoon();
}

function setChapter(index) {
  if (index === activeChapter) return;
  activeChapter = index;
  document.querySelector('#scene-label').textContent = chapterStates[index].title;
  document.querySelector('#scene-number').textContent = `${String(index).padStart(2, '0')} / 04`;
  chapterLinks.forEach((link, i) => {
    if (i === index) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  view.setAttribute('aria-label', `Detailed blue AVS semi truck with a flatbed trailer. ${index ? chapterStates[index].title.toLowerCase().replace(' / ', ', ') : 'Ready to load'}.`);
}

function sizeRenderer() {
  const { width, height } = view.getBoundingClientRect();
  if (width === viewportWidth && height === viewportHeight) return;
  viewportWidth = width;
  viewportHeight = height;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function pose(progress) {
  const lower = Math.min(3, Math.floor(progress));
  const blend = ease(progress - lower);
  const a = chapterStates[lower];
  const b = chapterStates[lower + 1];
  const selected = Math.round(progress);
  setChapter(selected);
  cameraPosition.fromArray(paused ? chapterStates[selected].eye : a.eye);
  cameraTarget.fromArray(paused ? chapterStates[selected].target : a.target);
  if (!paused) {
    cameraPosition.lerp(scratch.fromArray(b.eye), blend);
    cameraTarget.lerp(scratch.fromArray(b.target), blend);
  }
  // On a narrow screen, fit the long trailer inside the wider-than-tall model area.
  const fit = (compact.matches ? 1 : 0.92) * Math.max(1, 1.6 / camera.aspect);
  cameraPosition.sub(cameraTarget).multiplyScalar(fit).add(cameraTarget);
  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);

  groups.forEach(({ object, home, materials, chapter }) => {
    const distance = Math.abs(progress - chapter);
    const amount = paused ? +(selected === chapter) : 1 - ease(clamp((distance - 0.28) / 0.42));
    object.visible = amount > 0.003;
    object.position.copy(home);
    object.position.y += paused ? 0 : (1 - amount) * 1.7;
    for (const material of materials) {
      material.opacity = amount * material.userData.originalOpacity;
      material.transparent = amount < 0.995 || material.userData.originalTransparent;
      material.depthWrite = amount > 0.995 && material.userData.originalDepthWrite;
    }
  });
  document.querySelector('#scroll-progress').style.transform = `scaleX(${progress / 4})`;
}

function render(time) {
  frame = 0;
  sizeRenderer();
  const delta = Math.min((time - (lastTime || time)) / 1000, 0.06);
  lastTime = time;
  current += (desired - current) * (1 - Math.exp(-delta * 13));
  if (Math.abs(desired - current) < 0.0005) current = desired;
  pose(current);
  renderer.render(scene, camera);
  // Stop rendering once the scroll interpolation settles; no idle animation loop.
  if (current !== desired) renderSoon();
}

function staticFallback(reason) {
  document.body.classList.add('is-static');
  status.textContent = 'STATIC VIEW';
  toggle.hidden = true;
  document.querySelector('#scene-label').textContent = 'AVS FREIGHT / FLATBED';
  view.classList.remove('is-ready');
  const poster = document.querySelector('#poster');
  poster.hidden = poster.complete && !poster.naturalWidth;
  console.warn(`Freight experience uses its static fallback: ${reason}`);
}

function updateMotionPreference() {
  paused = reduceMotion.matches;
  document.body.classList.toggle('is-static', reduceMotion.matches);
  toggle.textContent = paused ? 'Motion reduced' : 'Pause motion';
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.disabled = reduceMotion.matches;
  updateScroll();
}

async function initialize() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact.matches ? 1.5 : 1.75));
    renderer.setClearColor(0x050a12, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 160);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.75;
    room.dispose();
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xb5d9ff, 0x142033, 1.3));
    const key = new THREE.DirectionalLight(0xe5f1ff, 2.7);
    key.position.set(-12, 18, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -21, right: 21, top: 20, bottom: -20, near: 0.5, far: 70 });
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x4b9cff, 2.0);
    rim.position.set(8, 8, -14);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffe3c4, 0.9);
    fill.position.set(-18, 4, -3);
    scene.add(fill);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.44 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.012;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(70, 35, 0x1a3550, 0x183045);
    grid.position.y = -0.025;
    grid.material.transparent = true;
    grid.material.opacity = 0.11;
    scene.add(grid);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('/models/avs-freight.glb', (event) => {
      if (event.total) status.textContent = `LOADING THE TRUCK / ${Math.round(event.loaded / event.total * 100)}%`;
    });
    rig = gltf.scene;
    rig.traverse((object) => {
      if (object.isLight || object.isCamera) object.visible = false;
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const isGlass = (material) => material?.userData.surface === 'glass'
        || /\b(?:glass|glazing|windscreen|windshield)\b/i.test(material?.name || '');
      const dedicatedGlazing = materials.length > 0 && (materials.every(isGlass)
        || (materials.length === 1 && object.userData.surface === 'glass'));
      if (dedicatedGlazing) {
        // Thin glazing and nearby seals should not shadow each other. Keep
        // shadows on mixed body/glass meshes until their glazing is separated.
        object.castShadow = false;
        object.receiveShadow = false;
        glazingMeshes.push(object);
      }
    });
    for (const name of assemblyNames) {
      const assembly = rig.getObjectByName(name);
      let meshes = 0;
      assembly?.traverse((object) => { if (object.isMesh) meshes++; });
      if (!meshes) throw new Error(`Model is missing geometry for ${name}`);
      assemblyDiagnostics.push({ name, meshes });
    }
    // Calculate once, before hiding cargo. Preserve the Blender group hierarchy.
    const box = new THREE.Box3().setFromObject(rig);
    const center = box.getCenter(new THREE.Vector3());
    rig.position.x -= center.x;
    rig.position.z -= center.z;
    rig.position.y -= box.min.y;
    scene.add(rig);
    for (let chapter = 1; chapter < chapterStates.length; chapter++) {
      const object = rig.getObjectByName(chapterStates[chapter].group);
      if (!object) throw new Error(`Model is missing ${chapterStates[chapter].group}`);
      const materials = new Set();
      const copies = new Map();
      object.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const cloneMaterial = (material) => {
          if (!copies.has(material)) {
            const copy = material.clone();
            copy.userData.originalOpacity = material.opacity;
            copy.userData.originalTransparent = material.transparent;
            copy.userData.originalDepthWrite = material.depthWrite;
            copies.set(material, copy);
            materials.add(copy);
          }
          return copies.get(material);
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneMaterial) : cloneMaterial(mesh.material);
      });
      groups.push({ object, materials, home: object.position.clone(), chapter });
    }
    ready = true;
    document.querySelector('#poster').hidden = true;
    view.classList.add('is-ready');
    status.textContent = 'EXPLORE THE LOAD';
    updateMotionPreference();
    sizeRenderer();
    current = desired;
    renderSoon();
    new ResizeObserver(() => { viewportWidth = 0; updateScroll(); renderSoon(); }).observe(view);
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) renderSoon(); }, { rootMargin: '100px' }).observe(experience);
    // Read-only diagnostics for local verification, not visible product copy.
    window.freightExperience = {
      getState: () => ({ ready, desired, current, chapter: activeChapter, camera: camera.position.toArray(), cargo: groups.filter(({ object }) => object.visible).map(({ object }) => object.name), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, width: viewportWidth, height: viewportHeight, reducedMotion: reduceMotion.matches, paused, assemblies: assemblyDiagnostics, glazing: glazingMeshes.map(({ name, castShadow, receiveShadow }) => ({ name, castShadow, receiveShadow })) }),
    };
  } catch (error) {
    staticFallback(error.message);
  }
}

document.addEventListener('scroll', updateScroll, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderSoon(); });
reduceMotion.addEventListener('change', updateMotionPreference);
toggle.addEventListener('click', () => {
  paused = !paused;
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.textContent = paused ? 'Resume motion' : 'Pause motion';
  updateScroll();
});
canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); staticFallback('WebGL context lost'); });
document.querySelector('#poster').addEventListener('error', (event) => { event.currentTarget.hidden = true; });
initialize();
