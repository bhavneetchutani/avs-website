import fs from 'node:fs';
import assert from 'node:assert/strict';
const b=fs.readFileSync('models/avs-freight.glb');
assert.equal(b.toString('ascii',0,4),'glTF');
assert.equal(b.readUInt32LE(4),2);
assert.equal(b.readUInt32LE(8),b.length);
const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
const groups=['Tractor','Trailer','Cargo_Steel','Cargo_Precast','Cargo_Wire','Cargo_Machinery'];
for(const name of groups) {
  const node=gltf.nodes.find(node=>node.name===name);
  assert(node?.children?.length,`Missing assembly ${name}`);
}
assert.equal(gltf.materials.length,26,'Named PBR materials must survive compression');
for(const mesh of gltf.meshes)for(const p of mesh.primitives)assert(Number.isInteger(p.material),'Missing material assignment');
assert(gltf.materials.find(m=>m.name==='AVS | midnight cobalt paint')?.pbrMetallicRoughness.baseColorFactor[2]>.2);
assert(gltf.extensionsRequired.includes('EXT_meshopt_compression'));
assert.equal(gltf.images?.length||0,0,'The original asset needs no texture downloads');
assert(b.length<3_000_000,'Web asset exceeds reviewed 3 MB budget');
const report=JSON.parse(fs.readFileSync('assets/model-source/model-report.json'));
report.web_bytes=b.length;
report.compression='EXT_meshopt_compression; glTF Transform 4.2.1, level high';
report.validated_materials=gltf.materials.length;
report.validated_groups=groups;
fs.writeFileSync('assets/model-source/model-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({bytes:b.length,meshes:gltf.meshes.length,materials:gltf.materials.length,groups,triangles:report.total_triangles},null,2));
