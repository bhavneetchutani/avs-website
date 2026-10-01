"""Run inside Blender (or through Blender MCP) to rebuild the AVS source and GLB.

Creates its own scenes and preserves the default scene. The .blend retains both
editable component geometry and the consolidated browser geometry. Re-run in a
fresh Blender file so previously named assemblies cannot collide.
"""
from pathlib import Path
BASE=Path(__file__).resolve().parent
namespace={'__name__':'__main__'}
for script in ['build_truck.py','build_trailer.py','build_cargo.py','refine_model.py','prepare_export.py','studio.py']:
    exec(compile((BASE/script).read_text(),str(BASE/script),'exec'),namespace)
print('AVS source blend and uncompressed GLB complete. Run compress-model.sh next.')
