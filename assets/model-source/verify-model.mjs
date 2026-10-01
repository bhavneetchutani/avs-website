import fs from 'node:fs';
import assert from 'node:assert/strict';
const b=fs.readFileSync('models/avs-freight.glb');
assert.equal(b.toString('ascii',0,4),'glTF');
assert.equal(b.readUInt32LE(4),2);
assert.equal(b.readUInt32LE(8),b.length);
const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
const report=JSON.parse(fs.readFileSync('assets/model-source/model-report.json'));
const groups=['Tractor','Trailer','Cargo_Steel','Cargo_Precast','Cargo_Wire','Cargo_Machinery'];
const descendants = index => [index, ...(gltf.nodes[index].children || []).flatMap(descendants)];
let countedTriangles=0;
for(const name of groups) {
  const matching=gltf.nodes.map((node,index)=>({node,index})).filter(({node})=>node.name===name);
  assert.equal(matching.length,1,`Assembly ${name} must have one unambiguous root`);
  const {node,index}=matching[0];
  assert(node?.children?.length,`Missing assembly ${name}`);
  const meshes=descendants(index).map(i=>gltf.nodes[i].mesh).filter(i=>i!==undefined);
  const triangles=meshes.flatMap(i=>gltf.meshes[i].primitives).reduce((sum,p)=>{
    assert.equal(p.mode??4,4,`${name} must export triangle primitives`);
    const count=gltf.accessors[p.indices??p.attributes.POSITION].count;
    assert.equal(count%3,0,`${name} has an incomplete triangle`);
    return sum+count/3;
  },0);
  assert.equal(meshes.length,report.assemblies[name].meshes,`${name} mesh count differs from Blender report`);
  assert.equal(triangles,report.assemblies[name].triangles,`${name} triangle count differs from Blender report`);
  countedTriangles+=triangles;
}
assert.equal(gltf.meshes.length,report.total_meshes,'Mesh count differs from Blender report');
assert.equal(countedTriangles,report.total_triangles,'Triangle count differs from Blender report');
assert.deepEqual(gltf.materials.map(m=>m.name).sort(),[...report.materials].sort(),'Named PBR materials must survive compression');
for(const mesh of gltf.meshes)for(const p of mesh.primitives){
  assert(Number.isInteger(p.material)&&gltf.materials[p.material],'Missing material assignment');
  assert(p.attributes.POSITION!==undefined&&p.attributes.NORMAL!==undefined,`${mesh.name} is missing surface geometry or normals`);
}
for(const m of gltf.materials){
  assert(m.pbrMetallicRoughness,`${m.name} is missing a PBR material`);
  const color=m.pbrMetallicRoughness.baseColorFactor??[1,1,1,1];
  assert(color.length===4&&color.every(v=>Number.isFinite(v)&&v>=0&&v<=1),`${m.name} has an invalid base color`);
}
const paint=gltf.materials.find(m=>m.name==='Tractor | AVS cobalt enamel');
const brandLinear=[0x21,0x96,0xe8].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
assert(paint,'AVS blue body paint must survive compression');
brandLinear.forEach((v,i)=>assert(Math.abs(paint.pbrMetallicRoughness.baseColorFactor[i]-v)<1e-6,'Paint must match logo and CSS sRGB #2196E8'));
assert(!gltf.materials.some(m=>/pinstripe|pearl silver paint/i.test(m.name)),'Contrasting body paint must not be exported');
assert(gltf.extensionsRequired.includes('EXT_meshopt_compression'));
for(const image of gltf.images||[])assert(image.bufferView!==undefined&&!image.uri,'Web textures must be embedded in the GLB');
assert(gltf.buffers.every(buffer=>!buffer.uri),'Web geometry must be embedded in the GLB');
assert(b.length<3_000_000,'Web asset exceeds reviewed 3 MB budget');
report.web_bytes=b.length;
report.compression='EXT_meshopt_compression; glTF Transform 4.2.1, level high';
report.validated_materials=gltf.materials.length;
report.validated_groups=groups;
fs.writeFileSync('assets/model-source/model-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({bytes:b.length,meshes:gltf.meshes.length,materials:gltf.materials.length,groups,triangles:report.total_triangles},null,2));
