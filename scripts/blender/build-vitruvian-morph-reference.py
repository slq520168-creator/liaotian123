# Build a structural Vitruvian GLB from pinned CC0 sources.
# This script intentionally exports no production clothing/hair and never edits the site manifest.
# It proves one exact-topology human can carry: skinning + ARKit 52 + native visemes + real body morphs.
import bpy
import json
import os
import sys
import numpy as np
from mathutils import Vector


def args_after_dash():
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def parse_args(argv):
    out = {}
    i = 0
    while i < len(argv):
        key = argv[i]
        if not key.startswith('--') or i + 1 >= len(argv):
            raise RuntimeError('invalid argument list')
        out[key[2:]] = argv[i + 1]
        i += 2
    for key in ('map', 'morph-dir', 'output'):
        if not out.get(key):
            raise RuntimeError('missing --' + key)
    return out


def remove_shape_keys(obj):
    if not obj.data.shape_keys:
        return
    for key in list(obj.data.shape_keys.key_blocks)[::-1]:
        obj.shape_key_remove(key)


def source_file(morph_dir, source):
    return os.path.join(morph_dir, source['level'], source['morph'] + '.npz')


def load_sparse(path):
    if not os.path.isfile(path):
        raise RuntimeError('missing morph source: ' + path)
    z = np.load(path, allow_pickle=False)
    if 'idx' not in z or 'delta' not in z:
        raise RuntimeError('morph does not contain idx+delta: ' + path)
    idx = z['idx'].astype(np.int64)
    delta = z['delta'].astype(np.float64)
    if len(idx) != len(delta) or delta.ndim != 2 or delta.shape[1] != 3:
        raise RuntimeError('invalid morph dimensions: ' + path)
    return idx, delta


def add_shape(obj, name, sources, morph_dir, vertex_count):
    key = obj.shape_key_add(name=name, from_mix=False)
    touched = set()
    for source in sources:
        idx, delta = load_sparse(source_file(morph_dir, source))
        weight = float(source.get('weight', 1.0))
        if not np.isfinite(weight) or weight == 0:
            raise RuntimeError('invalid morph weight for ' + name)
        for source_index, offset in zip(idx, delta):
            i = int(source_index)
            if i < 0 or i >= vertex_count:
                raise RuntimeError(f'{name}: source vertex {i} outside topology 0..{vertex_count - 1}')
            if not np.any(offset):
                continue
            key.data[i].co = key.data[i].co + Vector((float(offset[0] * weight), float(offset[1] * weight), float(offset[2] * weight)))
            touched.add(i)
    if not touched:
        obj.shape_key_remove(key)
        raise RuntimeError(name + ': morph moved zero vertices')
    key.value = 0.0
    key.slider_min = 0.0
    key.slider_max = 1.0
    return len(touched)


def strip_mixamo_prefix(armature, body):
    rename = {}
    for bone in list(armature.data.bones):
        old = bone.name
        new = old[len('mixamorig:'):] if old.startswith('mixamorig:') else old
        if new != old:
            rename[old] = new
            bone.name = new
    for group in body.vertex_groups:
        if group.name in rename:
            group.name = rename[group.name]
    return rename


def simple_material(body):
    body.data.materials.clear()
    mat = bpy.data.materials.new('ReferenceSkin')
    mat.diffuse_color = (0.58, 0.38, 0.29, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.58, 0.38, 0.29, 1.0)
        bsdf.inputs['Roughness'].default_value = 0.55
        bsdf.inputs['Metallic'].default_value = 0.0
    body.data.materials.append(mat)
    for poly in body.data.polygons:
        poly.material_index = 0


def main():
    opts = parse_args(args_after_dash())
    with open(opts['map'], 'r', encoding='utf-8') as handle:
        mapping = json.load(handle)
    morph_dir = opts['morph-dir']
    output = os.path.abspath(opts['output'])

    body = bpy.data.objects.get('cm_vitruvian')
    arm = bpy.data.objects.get('mixamo_vitruvian')
    if body is None or body.type != 'MESH':
        raise RuntimeError('source blend missing mesh cm_vitruvian')
    if arm is None or arm.type != 'ARMATURE':
        raise RuntimeError('source blend missing armature mixamo_vitruvian')

    # Keep exact source topology. Shape-key NPZ indices address this mesh directly.
    for modifier in list(body.modifiers):
        if modifier.type == 'PARTICLE_SYSTEM':
            body.modifiers.remove(modifier)
    vertex_count = len(body.data.vertices)
    if vertex_count < 1000:
        raise RuntimeError('unexpectedly small Vitruvian topology')

    remove_shape_keys(body)
    body.shape_key_add(name='Basis', from_mix=False)
    built = {}
    for group_name in ('body', 'arkit', 'visemes'):
        group = mapping.get(group_name, {})
        for target, sources in group.items():
            built[target] = add_shape(body, target, sources, morph_dir, vertex_count)

    rename = strip_mixamo_prefix(arm, body)
    simple_material(body)
    body.name = 'Human'
    body.data.name = 'HumanMesh'
    arm.name = 'Armature'
    arm.data.name = 'Armature'
    if arm.animation_data:
        arm.animation_data_clear()

    # Remove animation datablocks from the export proof. Natural motion is runtime-driven.
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)

    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = body
    os.makedirs(os.path.dirname(output), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output,
        export_format='GLB',
        use_selection=True,
        export_animations=False,
        export_morph=True,
        export_morph_normal=False,
        export_morph_tangent=False,
        export_materials='EXPORT'
    )
    if not os.path.isfile(output):
        raise RuntimeError('Blender did not create GLB output')

    report = {
        'vertices': vertex_count,
        'shapeKeys': list(built.keys()),
        'movedVertices': built,
        'renamedBones': len(rename),
        'outputBytes': os.path.getsize(output)
    }
    print('VITRUVIAN_MORPH_BUILD=' + json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == '__main__':
    main()
