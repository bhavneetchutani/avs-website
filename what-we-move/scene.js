import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#truck-canvas'), view = $('#model-view'), experience = $('#experience');
const chapters = [...document.querySelectorAll('[data-chapter]')];
const chapterLinks = [...document.querySelectorAll('[data-step]')];
const stops = [...document.querySelectorAll('[data-stop]')];
const chapterSlugs = ['intro','steel','precast','wire','machinery'];
const toggle = $('#motion-toggle'), status = $('#model-status');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 850px)');
const shortScreen = matchMedia('(max-height: 540px) and (max-width: 1000px)');
const clamp = (x, a=0, b=1) => Math.min(b, Math.max(a,x));
const smooth = (x) => { x=clamp(x); return x*x*(3-2*x); };
const ramp = (x,a,b) => smooth((x-a)/(b-a));
const lerp = THREE.MathUtils.lerp;
const isStatic = () => reduceMotion.matches || shortScreen.matches || failed;

// Coordinates are the original model's metres: nose -5.6, deck 0..16.15,
// height Y. Each chapter moves from context to detail and back to the next load.
const shots = [
  {group:null, title:'THE OPEN ROAD', detail:'A closer look. A better fit.', keys:[
    [0,[-11.5,3.4,5.8],[-4.05,1.95,0],35],
    [.26,[-8,4.1,9],[-2.7,1.8,0],36],
    [.64,[2.4,7.5,14.5],[5.3,1.5,0],39],
    [1,[5,9,19],[8,1.5,0],40],
  ]},
  {group:'Cargo_Steel', title:'STRUCTURAL STEEL', detail:'Long sections. Open access.', keys:[
    [0,[5,9,19],[8,1.5,0],40],
    [.38,[2.4,7.6,14.8],[7.7,2,0],39],
    [.70,[.1,4.4,8.3],[5.4,2.2,0],38],
    [1,[6.4,10.4,16],[8,1.6,0],40],
  ]},
  {group:'Cargo_Precast', title:'PRECAST CONCRETE', detail:'Every piece has its place.', keys:[
    [0,[6.4,10.4,16],[8,1.6,0],40],
    [.38,[9.6,10.8,12.5],[8.3,1.9,0],39],
    [.70,[12.7,5.7,8.2],[10.1,2.05,0],38],
    [1,[14.8,9.8,14.8],[8.5,1.6,0],40],
  ]},
  {group:'Cargo_Wire', title:'WIRE & REINFORCEMENT', detail:'Small details. Lasting strength.', keys:[
    [0,[14.8,9.8,14.8],[8.5,1.6,0],40],
    [.36,[14.2,11.7,10.3],[10,1.75,0],39],
    [.7,[9.2,6.5,6.7],[11.4,1.9,0],38],
    [1,[5.8,9.4,17],[7.6,1.6,0],40],
  ]},
  {group:'Cargo_Machinery', title:'INDUSTRIAL EQUIPMENT', detail:'From the factory to what comes next.', keys:[
    [0,[5.8,9.4,17],[7.6,1.6,0],40],
    [.35,[1,7,12],[5.2,2.1,0],39],
    [.62,[8.5,4.7,7.9],[7.4,2.5,0],38],
    [.82,[13.5,5.5,8.8],[11.8,2.5,0],38],
    [1,[-7,11,26],[5.1,1.8,0],42],
  ]},
];
const assemblyNames = ['Tractor','Trailer',...shots.slice(1).map(s=>s.group)];
const assemblyDiagnostics=[], glazingMeshes=[], groups=[];
let renderer, scene, camera, rig, portal, deckGuide;
let ready=false, failed=false, paused=false, inView=true;
let firstFrameDrawn=false;
let current=0, desired=0, renderProgress=0, activeChapter=-1, activeVisualChapter=-1, frame=0, lastTime=0;
let viewportWidth=0, viewportHeight=0, scrollStops=[], loadAmount=0;
let modelBounds;
const eye = new THREE.Vector3(), target=new THREE.Vector3(), scratch=new THREE.Vector3();

function text(id,value) { const element=$(id); if(element && element.textContent!==value) element.textContent=value; }
function measureTimeline() {
  scrollStops=stops.map(stop=>({top:stop.getBoundingClientRect().top+scrollY,height:stop.offsetHeight}));
}
function renderSoon() {
  if(!frame && ready && !document.hidden && inView) frame=requestAnimationFrame(render);
}
function updateScroll() {
  if(!ready) return;
  if(isStatic()) desired=1.55;
  else {
    let i=0;
    for(let j=1;j<scrollStops.length;j++) if(scrollY>=scrollStops[j].top) i=j;
    const stop=scrollStops[i];
    desired=stop ? clamp(i+(scrollY-stop.top)/stop.height,0,4.999) : 0;
  }
  if(paused) { current=desired; updateStory(desired); }
  renderSoon();
}
function updateStory(progress) {
  const selected=Math.min(4,Math.floor(progress));
  const phase=progress-selected;
  if(activeChapter!==selected || isStatic()) {
    activeChapter=selected;
    chapters.forEach((chapter,i)=>{
      chapter.classList.toggle('is-active',i===selected);
      chapter.inert=!isStatic() && i!==selected;
      if(isStatic()) chapter.removeAttribute('aria-hidden');
      else chapter.setAttribute('aria-hidden',String(i!==selected));
    });
    chapterLinks.forEach((link,i)=>{
      if(i===selected) link.setAttribute('aria-current','step');
      else link.removeAttribute('aria-current');
    });
    experience.dataset.chapter=String(selected);
  }
  text('#journey-step',paused?'MOTION PAUSED / KEEP READING':selected===0?'SCROLL TO FOLLOW THE TRUCK':phase<.38?'SCROLL TO LOAD':phase<.84?'SCROLL TO LOOK CLOSER':'KEEP THE JOURNEY MOVING');
  const fill=$('#scroll-progress');
  if(fill) fill.style.transform='scaleX('+(progress/4.999)+')';
  chapterLinks.forEach((link,i)=>link.style.setProperty('--chapter-progress',i<selected?1:i===selected?phase:0));
}
function sizeRenderer() {
  const {width,height}=view.getBoundingClientRect();
  if(width<1 || height<1 || width===viewportWidth && height===viewportHeight) return;
  viewportWidth=width;viewportHeight=height;
  renderer.setPixelRatio(Math.min(devicePixelRatio,compact.matches?1.5:1.75));
  renderer.setSize(width,height,false);
  camera.aspect=width/height;
  // Shift the composition up, leaving the lower edge clear for its caption.
  camera.setViewOffset(width,height,0,height*(compact.matches ? .09 : .035),width,height);
  camera.updateProjectionMatrix();
}
function sampleCamera(progress) {
  if(isStatic() && modelBounds) {
    // A reading layout needs a complete illustration, not a cinematic detail
    // crop. Fit the real assembly bounds in camera space at the current aspect.
    const min=new THREE.Vector3().fromArray(modelBounds.min);
    const max=new THREE.Vector3().fromArray(modelBounds.max);
    const direction=new THREE.Vector3(-.55,.36,1).normalize();
    const right=new THREE.Vector3(0,1,0).cross(direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right);
    target.addVectors(min,max).multiplyScalar(.5);
    camera.fov=40;
    camera.clearViewOffset();
    const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    const horizontal=vertical*camera.aspect;
    let distance=1;
    for(const x of [min.x,max.x]) for(const y of [min.y,max.y]) for(const z of [min.z,max.z]) {
      scratch.set(x,y,z).sub(target);
      const depth=scratch.dot(direction);
      distance=Math.max(distance,depth+Math.abs(scratch.dot(right))/(horizontal*.84),depth+Math.abs(scratch.dot(up))/(vertical*.74));
    }
    eye.copy(direction).multiplyScalar(distance).add(target);
    camera.position.copy(eye);
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    return;
  }
  const selected=Math.min(4,Math.floor(progress)), phase=progress-selected;
  const keys=shots[selected].keys;
  let index=0;
  for(let i=1;i<keys.length-1;i++) if(phase>=keys[i][0]) index=i;
  const a=keys[index], b=keys[index+1], t=smooth((phase-a[0])/(b[0]-a[0]));
  eye.fromArray(a[1]).lerp(scratch.fromArray(b[1]),t);
  target.fromArray(a[2]).lerp(scratch.fromArray(b[2]),t);
  // Mobile frames the subject, not the entire 72-foot silhouette. Wider cargo
  // shots pull back slightly; detail shots keep their close-up crop intentionally.
  const fit=compact.matches ? Math.max(1,1.22/camera.aspect) : Math.max(1,1.30/camera.aspect);
  eye.sub(target).multiplyScalar(fit).add(target);
  camera.position.copy(eye);
  camera.fov=lerp(a[3],b[3],t)+(compact.matches?3:0);
  camera.updateProjectionMatrix();
  camera.lookAt(target);
}
function pose(progress) {
  const selected=Math.min(4,Math.floor(progress)), phase=progress-selected;
  if(selected!==activeVisualChapter) {
    activeVisualChapter=selected;
    text('#scene-label',shots[selected].title);
    text('#scene-number',String(selected).padStart(2,'0')+' / 04');
    text('#detail-label',shots[selected].detail);
    view.setAttribute('aria-label','Blue Peterbilt tractor and flatbed. '+(selected?shots[selected].title.toLowerCase()+'.':'Front-to-trailer view.'));
  }
  sampleCamera(progress);
  loadAmount=selected ? ramp(phase,.035,.38) : 0;
  groups.forEach(({object,home,parts,plane,chapter})=>{
    const showing=chapter===selected;
    const exit=selected===4?1:1-ramp(phase,.88,1);
    object.visible=showing && loadAmount>.0005 && exit>.001;
    if(!showing) return;
    object.position.copy(home);
    // A blue survey line walks from the headboard toward the rear, revealing
    // each load. Supports settle first, freight next, then its restraint details.
    plane.constant=lerp(.8,16.4,loadAmount);
    for(const part of parts) {
      const arrive=ramp(phase,.03+part.delay,.32+part.delay);
      part.mesh.position.copy(part.home);
      part.mesh.position.y+=(1-arrive)*part.lift+(1-exit)*.6;
      for(const material of part.materials) {
        const opacity=ramp(phase,.02,.09)*exit;
        material.opacity=opacity*material.userData.originalOpacity;
        material.transparent=opacity<.999 || material.userData.originalTransparent;
        material.depthWrite=opacity>.999 && material.userData.originalDepthWrite;
      }
    }
  });
  portal.visible=!isStatic() && selected>0 && phase>.035 && phase<.40;
  portal.position.x=lerp(.8,16.4,loadAmount);
  portal.material.opacity=.7*Math.sin(Math.PI*loadAmount);
  deckGuide.material.opacity=selected===0?ramp(phase,.42,.68)*.4:(1-ramp(phase,.4,.62))*.25;
  const meter=$('#load-meter');
  if(meter) meter.style.transform='scaleX('+(selected?loadAmount:phase)+')';
}
function render(time) {
  frame=0;
  if(!ready || document.hidden || !inView) return;
  sizeRenderer();
  // An idle interval predates the new scroll target. Resume with one normal frame,
  // then use measured frame time for the uninterrupted easing sequence.
  const delta=lastTime ? Math.min((time-lastTime)/1000,.065) : 1/60;
  lastTime=time;
  current+=(desired-current)*(1-Math.exp(-delta*11));
  if(Math.abs(desired-current)<.0005) current=desired;
  updateStory(current);
  if(!paused || isStatic()) renderProgress=current;
  pose(renderProgress);
  renderer.render(scene,camera);
  if(!firstFrameDrawn) {
    firstFrameDrawn=true;
    requestAnimationFrame(()=>window.freightLoader?.finish());
  }
  if(current!==desired) renderSoon();
  else lastTime=0;
}
function staticFallback(reason) {
  window.freightLoader?.finish(false);
  failed=true;
  ready=false;
  if(frame) cancelAnimationFrame(frame);
  frame=0;
  document.body.classList.add('is-static');
  text('#model-status','FREIGHT AT A GLANCE');
  toggle.hidden=true;
  text('#scene-label','OPEN DECK / FOUR POSSIBILITIES');
  view.classList.remove('is-ready');
  $('#poster').hidden=false;
  chapters.forEach(c=>{c.inert=false;c.removeAttribute('aria-hidden');});
  // Static anchor targets must live on the readable sections, not a hidden track.
  setAnchorMode(true);
  console.warn('Freight experience uses its static fallback: '+reason);
}
function setAnchorMode(staticMode) {
  chapters.forEach((chapter,i)=>chapter.id=staticMode?chapterSlugs[i]:'story-'+chapterSlugs[i]);
  stops.forEach((stop,i)=>stop.id=staticMode?'scroll-'+chapterSlugs[i]:chapterSlugs[i]);
}
function selectChapter(hash, behavior='smooth') {
  const index=chapterSlugs.indexOf(hash.replace(/^#/,''));
  if(index<0) return false;
  if(isStatic()) {
    document.getElementById(chapterSlugs[index])?.scrollIntoView({behavior,block:'start'});
  } else {
    measureTimeline();
    const stop=scrollStops[index];
    if(!stop) return false;
    // A link arrives at a loaded composition. Scrolling still plays every frame.
    scrollTo({top:stop.top+(index ? .43 : 0)*stop.height,behavior});
    updateScroll();
  }
  return true;
}
function updateMotionPreference() {
  const wasStatic=document.body.classList.contains('is-static');
  const nextStatic=isStatic();
  const box=experience.getBoundingClientRect();
  const header=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))||78;
  const preserve=ready && activeChapter>=0 && wasStatic!==nextStatic && box.bottom>header && box.top<innerHeight;
  let readingChapter=Math.max(0,activeChapter);
  if(preserve && wasStatic) {
    // In reading mode every section is visible. Keep the one occupying the
    // largest part of the viewport, rather than the static illustration's load.
    let largest=0;readingChapter=0;
    chapters.forEach((chapter,index)=>{
      const rect=chapter.getBoundingClientRect();
      const visible=Math.max(0,Math.min(rect.bottom,innerHeight)-Math.max(rect.top,header));
      if(visible>largest) { largest=visible;readingChapter=index; }
    });
  }
  document.body.classList.toggle('is-static',nextStatic);
  setAnchorMode(nextStatic);
  toggle.hidden=nextStatic;
  paused=false;toggle.setAttribute('aria-pressed','false');toggle.textContent='Pause motion';
  viewportWidth=0;
  measureTimeline();updateScroll();
  if(preserve) requestAnimationFrame(()=>selectChapter('#'+chapterSlugs[readingChapter],'instant'));
}
function addSurveyLines() {
  const lineMaterial=new THREE.LineBasicMaterial({color:0x2196e8,transparent:true,opacity:0,toneMapped:false});
  const points=[0,1.58,-1.47,0,1.58,1.47, 0,1.58,-1.47,16.15,1.58,-1.47, 0,1.58,1.47,16.15,1.58,1.47, 16.15,1.58,-1.47,16.15,1.58,1.47];
  for(let x=0;x<=16;x+=1) points.push(x,1.58,1.47,x,1.58,1.62);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  deckGuide=new THREE.LineSegments(geometry,lineMaterial);scene.add(deckGuide);
  const portalGeometry=new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,1.59,-1.45),new THREE.Vector3(0,4.5,-1.45),new THREE.Vector3(0,4.5,1.45),new THREE.Vector3(0,1.59,1.45),
  ]);
  portal=new THREE.Line(portalGeometry,new THREE.LineBasicMaterial({color:0x6fc2f2,transparent:true,opacity:0,toneMapped:false}));
  portal.visible=false;scene.add(portal);
}
async function initialize() {
  if(window.freightLoader?.cancelled) { staticFallback('Loading skipped');return; }
  try {
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0x050a12,0);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled=true;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(38,1,.1,140);
    const pmrem=new THREE.PMREMGenerator(renderer), room=new RoomEnvironment();
    scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.62;
    room.dispose();pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xc2deff,0x142033,.85));
    const key=new THREE.DirectionalLight(0xe5f1ff,2.15);
    key.position.set(-8,18,12);key.target.position.set(5,0,0);key.castShadow=true;
    key.shadow.mapSize.set(compact.matches?1024:2048,compact.matches?1024:2048);
    Object.assign(key.shadow.camera,{left:-18,right:18,top:19,bottom:-19,near:.5,far:65});
    key.shadow.bias=-.0003;key.shadow.normalBias=.02;scene.add(key,key.target);
    const rim=new THREE.DirectionalLight(0x4b9cff,1.6);rim.position.set(8,8,-14);scene.add(rim);
    const fill=new THREE.DirectionalLight(0xffe3c4,.65);fill.position.set(-18,4,-3);scene.add(fill);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({color:0x000000,opacity:.42}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.016;ground.receiveShadow=true;scene.add(ground);
    // The brand lattice lives behind the transparent renderer in CSS. A ground
    // grid would project into changing angles as the camera travels.
    addSurveyLines();
    const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf=await loader.loadAsync('/models/avs-freight.glb',event=>{
      if(failed || window.freightLoader?.cancelled) return;
      window.freightLoader?.update(event.loaded,event.total);
      if(event.total) text('#model-status','PREPARING YOUR VIEW / '+Math.round(event.loaded/event.total*100)+'%');
    });
    if(failed || window.freightLoader?.cancelled) { renderer.dispose();return; }
    rig=gltf.scene;
    rig.traverse(object=>{
      if(object.isLight || object.isCamera) object.visible=false;
      if(!object.isMesh) return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      const glass=materials.every(m=>m?.userData.surface==='glass'||/\b(glass|glazing|windscreen|windshield)\b/i.test(m?.name||''));
      object.castShadow=!glass;object.receiveShadow=!glass;
      if(glass) {
        // A broad showroom reflection looked like a white window in close-up.
        // Keep tinted, opaque glazing with softer reflections as the camera moves.
        materials.forEach(material=>{
          material.roughness=.28;material.metalness=.08;material.envMapIntensity=.06;
          if('clearcoat' in material) material.clearcoat=0;
          if('specularIntensity' in material) material.specularIntensity=.25;
        });
        glazingMeshes.push(object);
      }
    });
    for(const name of assemblyNames) {
      const object=rig.getObjectByName(name);let meshes=0;
      object?.traverse(o=>{if(o.isMesh) meshes++;});
      if(!meshes) throw new Error('Missing geometry for '+name);
      assemblyDiagnostics.push({name,meshes});
    }
    scene.add(rig);
    const bounds=new THREE.Box3().setFromObject(rig);
    modelBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
    for(let chapter=1;chapter<shots.length;chapter++) {
      const object=rig.getObjectByName(shots[chapter].group),parts=[];
      const plane=new THREE.Plane(new THREE.Vector3(-1,0,0),16.4);
      object.traverse(mesh=>{
        if(!mesh.isMesh) return;
        const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
        const materials=originals.map(material=>{
          const copy=material.clone();
          Object.assign(copy.userData,{originalOpacity:material.opacity,originalTransparent:material.transparent,originalDepthWrite:material.depthWrite});
          copy.clippingPlanes=[plane];copy.clipShadows=true;
          return copy;
        });
        mesh.material=Array.isArray(mesh.material)?materials:materials[0];
        const name=materials.map(m=>m.name).join(' ');
        const restraint=/webbing/.test(name), support=/hardwood/.test(name);
        parts.push({mesh,materials,home:mesh.position.clone(),delay:restraint ? .09 : support ? 0 : .035,lift:restraint ? 1.8 : support ? .35 : 1.15});
      });
      groups.push({object,parts,plane,home:object.position.clone(),chapter});
    }
    ready=true;
    $('#poster').hidden=true;view.classList.add('is-ready');
    text('#model-status','DRAG THE PAGE. FOLLOW THE LOAD.');
    updateMotionPreference();sizeRenderer();current=desired;renderProgress=desired;renderSoon();
    new ResizeObserver(()=>{viewportWidth=0;measureTimeline();updateScroll();renderSoon();}).observe(view);
    new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;if(inView){lastTime=0;renderSoon();}},{rootMargin:'80px'}).observe(experience);
    window.freightExperience={getState:()=>({
      ready,desired,current,renderProgress,chapter:activeChapter,phase:current-Math.floor(current),
      load:loadAmount,camera:camera.position.toArray(),cameraTarget:target.toArray(),
      cargo:groups.filter(g=>g.object.visible).map(g=>g.object.name),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
      width:viewportWidth,height:viewportHeight,mobile:compact.matches,reducedMotion:reduceMotion.matches,static:isStatic(),paused,
      assemblies:assemblyDiagnostics,modelBounds,glazing:glazingMeshes.map(({name,castShadow,receiveShadow})=>({name,castShadow,receiveShadow})),
    })};
    // Respect a linked freight chapter after layout changes from static to sticky.
    if(location.hash) {
      if(!selectChapter(location.hash,'instant')) {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'instant',block:'start'});
      }
    }
  } catch(error) { staticFallback(error.message); }
}
document.addEventListener('scroll',updateScroll,{passive:true});
document.addEventListener('visibilitychange',()=>{lastTime=0;if(!document.hidden) renderSoon();});
window.addEventListener('resize',()=>{measureTimeline();updateScroll();},{passive:true});
reduceMotion.addEventListener('change',updateMotionPreference);
shortScreen.addEventListener('change',updateMotionPreference);
compact.addEventListener('change',()=>{viewportWidth=0;renderSoon();});
toggle.addEventListener('click',()=>{
  paused=!paused;toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'Resume motion':'Pause motion';
  text('#model-status',paused?'VIEW PAUSED / SCROLL TO READ':'DRAG THE PAGE. FOLLOW THE LOAD.');
  if(!paused) {renderProgress=current;lastTime=0;}updateScroll();
});
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  if(isStatic() || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const hash=link.getAttribute('href');
  if(!chapterSlugs.includes(hash.slice(1))) return;
  event.preventDefault();
  history.replaceState(null,'',hash);
  selectChapter(hash);
}));
window.addEventListener('hashchange',()=>{if(ready) selectChapter(location.hash,reduceMotion.matches?'instant':'smooth');});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();staticFallback('WebGL context lost');});
window.addEventListener('freight:skip',()=>staticFallback('Loading skipped'));
$('#poster').addEventListener('error',event=>{event.currentTarget.hidden=true;});
initialize();
