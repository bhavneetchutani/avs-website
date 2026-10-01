import bpy
# Reopen the saved original model and restart the user's already installed MCP addon.
if not hasattr(bpy.types,'BLENDERMCP_OT_StartServer'):
    import blender_mcp
    blender_mcp.register()
bpy.ops.blendermcp.start_server()
print('AVS saved model restored; Blender MCP ready')
