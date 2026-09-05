"""Run inside Blender after tractor replacement; keep the approved trailer/cargo.

Checks evaluated web geometry, object transforms and material assignments against
the pre-replacement snapshot. Material shader edits are outside this hash's scope.
"""
import array
import hashlib
import json
from pathlib import Path

import bpy

baseline = json.loads(
    (Path(bpy.data.filepath).parent / "preserved-assemblies.json").read_text()
)
for name, expected in baseline.items():
    root = bpy.data.objects[name]
    digest = hashlib.sha256()
    count = triangles = 0
    for obj in sorted(root.children_recursive, key=lambda item: item.name):
        digest.update(obj.name.encode())
        digest.update(str(tuple(tuple(row) for row in obj.matrix_world)).encode())
        if obj.type != "MESH":
            continue
        count += 1
        mesh = obj.data
        mesh.calc_loop_triangles()
        triangles += len(mesh.loop_triangles)
        for collection, attribute, size, kind in [
            (mesh.vertices, "co", 3, "f"),
            (mesh.loops, "vertex_index", 1, "i"),
            (mesh.polygons, "material_index", 1, "i"),
        ]:
            values = array.array(kind, [0]) * (len(collection) * size)
            collection.foreach_get(attribute, values)
            digest.update(values.tobytes())
        digest.update(str([mat.name if mat else None for mat in mesh.materials]).encode())
    actual = {
        "sha256_geometry_transform_material_assignment": digest.hexdigest(),
        "meshes": count,
        "triangles": triangles,
    }
    assert actual == expected, f"Approved assembly changed: {name}: {actual}"
print("PRESERVED_ASSEMBLIES_CHECK: trailer and four cargo assemblies unchanged")
