#!/usr/bin/env python3
"""Patch a pinned CharacterCreator build script to bake CC0 ARKit + Meta viseme targets.

The CharacterCreator source itself is downloaded at CI time and remains under its upstream GPL.
This small patcher only injects target sampling declarations into that external build. Generated
assets remain subject to their input asset licences and are not promoted automatically.
"""
from __future__ import annotations
import pathlib
import sys

# Rebuild trigger: validate the latest unified skeleton/module runtime against fresh CC0 output.

ARKIT = [
    'browDownLeft','browDownRight','browInnerUp','browOuterUpLeft','browOuterUpRight',
    'cheekPuff','cheekSquintLeft','cheekSquintRight','eyeBlinkLeft','eyeBlinkRight',
    'eyeLookDownLeft','eyeLookDownRight','eyeLookInLeft','eyeLookInRight','eyeLookOutLeft',
    'eyeLookOutRight','eyeLookUpLeft','eyeLookUpRight','eyeSquintLeft','eyeSquintRight',
    'eyeWideLeft','eyeWideRight','jawForward','jawLeft','jawOpen','jawRight','mouthClose',
    'mouthDimpleLeft','mouthDimpleRight','mouthFrownLeft','mouthFrownRight','mouthFunnel',
    'mouthLeft','mouthLowerDownLeft','mouthLowerDownRight','mouthPressLeft','mouthPressRight',
    'mouthPucker','mouthRight','mouthRollLower','mouthRollUpper','mouthShrugLower','mouthShrugUpper',
    'mouthSmileLeft','mouthSmileRight','mouthStretchLeft','mouthStretchRight','mouthUpperUpLeft',
    'mouthUpperUpRight','noseSneerLeft','noseSneerRight','tongueOut'
]
VISEMES = [
    'viseme_sil','viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk','viseme_CH',
    'viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E','viseme_I','viseme_O','viseme_U'
]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit('usage: patch-charactercreator-face-targets.py <build_base.py>')
    path = pathlib.Path(sys.argv[1])
    text = path.read_text(encoding='utf-8')

    old_namespace = 'bl_ext.user_default.mpfb'
    new_namespace = 'bl_ext.blender_org.mpfb'
    namespace_count = text.count(old_namespace)
    if namespace_count < 1:
        raise RuntimeError('MPFB namespace patch: legacy namespace not found in pinned CharacterCreator build')
    text = text.replace(old_namespace, new_namespace)
    if old_namespace in text:
        raise RuntimeError('MPFB namespace patch incomplete')

    mpfb_import = 'from bl_ext.blender_org.mpfb.entities.clothes.mhclo import Mhclo\n'
    mpfb_guard = mpfb_import + '''\n# Added by liaotian123 candidate build: the workflow version label must match\n# the extension Blender actually installed. This prevents a future repository\n# update from silently changing the geometry generator while reports still claim\n# the old MPFB version.\nimport importlib as _cc_importlib\nimport pathlib as _cc_pathlib\nimport tomllib as _cc_tomllib\n_cc_mpfb_module = _cc_importlib.import_module("bl_ext.blender_org.mpfb.services.humanservice")\n_cc_mpfb_manifest = next((_p / "blender_manifest.toml" for _p in _cc_pathlib.Path(_cc_mpfb_module.__file__).resolve().parents if (_p / "blender_manifest.toml").is_file()), None)\nif _cc_mpfb_manifest is None:\n    raise RuntimeError("MPFB blender_manifest.toml not found")\n_cc_actual_mpfb = str(_cc_tomllib.loads(_cc_mpfb_manifest.read_text(encoding="utf-8")).get("version") or "")\n_cc_expected_mpfb = str(os.environ.get("MPFB_VERSION") or "")\nif not _cc_expected_mpfb:\n    raise RuntimeError("MPFB_VERSION must be set for reproducible candidate builds")\nif _cc_actual_mpfb != _cc_expected_mpfb:\n    raise RuntimeError("MPFB version mismatch: installed=%s expected=%s" % (_cc_actual_mpfb, _cc_expected_mpfb))\nprint("BUILD MPFB version", _cc_actual_mpfb)\n'''
    text = replace_once(text, mpfb_import, mpfb_guard, 'pin actual MPFB extension version')

    declaration = f'''\n# Added by liaotian123 candidate build: pinned CC0 extra-target packs.\nEXTRA_TARGET_ROOT = os.environ.get("CC_EXTRA_TARGETS", "")\nARKIT_TARGET_NAMES = {ARKIT!r}\nMETA_VISEME_NAMES = {VISEMES!r}\nif not EXTRA_TARGET_ROOT:\n    raise RuntimeError("CC_EXTRA_TARGETS must point at extra-targets/assets")\nARKIT_MORPHS = [(name, [os.path.join(EXTRA_TARGET_ROOT, "faceunits01", "targets", "faceunits", name + ".target")])\n                for name in ARKIT_TARGET_NAMES]\nMETA_VISEME_MORPHS = [(name, [os.path.join(EXTRA_TARGET_ROOT, "visemes02", "targets", "visemes", name + ".target")])\n                      for name in META_VISEME_NAMES]\n'''
    text = replace_once(
        text,
        '# Corrective morphs for macro interactions:',
        declaration + '\n# Corrective morphs for macro interactions:',
        'inject target declarations',
    )

    marker = 'for _k, _ in DYN_MORPHS:\n    MORPH_KIND[_k] = "dyn"\n'
    extra_kinds = marker + 'for _k, _ in ARKIT_MORPHS:\n    MORPH_KIND[_k] = "arkit"\nfor _k, _ in META_VISEME_MORPHS:\n    MORPH_KIND[_k] = "viseme"\n'
    text = replace_once(text, marker, extra_kinds, 'inject morph kinds')

    old_files = 'TARGET_FILES = dict(FACE_MORPHS + EXPR_TARGETS + BDET_MORPHS)'
    new_files = old_files + '\nTARGET_FILES.update(dict(ARKIT_MORPHS + META_VISEME_MORPHS))'
    text = replace_once(text, old_files, new_files, 'extend target files')

    old_zero = 'ZERO_BELOW = {"face": 5e-5, "expr": 5e-5, "corr": 2e-4, "bdet": 5e-5, "dyn": 5e-5}'
    new_zero = 'ZERO_BELOW = {"face": 5e-5, "expr": 5e-5, "corr": 2e-4, "bdet": 5e-5, "dyn": 5e-5, "arkit": 5e-5, "viseme": 5e-5}'
    text = replace_once(text, old_zero, new_zero, 'extend sparse thresholds')

    old_full = '        full = os.path.join(MPFB_TARGETS, rel + ".target.gz")\n        assert os.path.isfile(full), "target missing: %s" % full'
    new_full = '        full = rel if (os.path.isabs(rel) or str(rel).endswith(".target")) else os.path.join(MPFB_TARGETS, rel + ".target.gz")\n        assert os.path.isfile(full), "target missing: %s" % full'
    text = replace_once(text, old_full, new_full, 'allow pinned external target files')

    old_offs = '    if kind in ("expr", "dyn"):\n        offs = {}'
    new_offs = '    if kind in ("expr", "dyn", "arkit", "viseme"):\n        offs = {}'
    text = replace_once(text, old_offs, new_offs, 'disable facial joint offsets')

    # Keep provenance beside the generated candidate rather than beside the
    # Blender snapshot. The workflow starts with a clean output/ directory and
    # all later promotion gates consume only that candidate directory, so a
    # stale upstream license inventory cannot accidentally satisfy the gate.
    old_license = 'with open(os.path.join(os.path.dirname(args.blend), "asset_licenses.json"), "w", encoding="utf-8") as f:'
    new_license = 'with open(os.path.join(out_dir, "asset_licenses.json"), "w", encoding="utf-8") as f:'
    text = replace_once(text, old_license, new_license, 'write license inventory with candidate output')

    # The upstream exporter intentionally puts every morph target on every mesh.
    # That is useful while fitting garments and hair in Blender, but wasteful on
    # mobile GPUs. Keep the full build during fitting, then prune the glTF target
    # references. Blender may duplicate targetNames into primitive.extras; those
    # copies must be removed so mesh.extras.targetNames remains the single
    # canonical ordering shared by targets and weights. The generated asset is a
    # neutral Basis, so exported mesh and node default morph weights are always 0.
    prune_block = r'''

def _cc_keep_runtime_morph(name, policy):
    n = str(name or "")
    structural = n.startswith(("gender_", "age_", "weight_", "muscle_", "height_", "proportions_", "corr_gender_", "corr_weight_"))
    face = n.startswith("face_")
    chest = n.startswith(("breast_", "bdet_", "dyn_", "corr_breast_"))
    viseme = n.startswith("viseme_")
    mouth = n.startswith(("mouth", "jaw")) or n == "tongueOut"
    eye = n.startswith(("eye", "look_", "blink_"))
    brow = n.startswith(("brow", "cheek", "noseSneer"))
    if policy == "all":
        return True
    if policy == "hair":
        return structural or face
    if policy == "cloth":
        return structural or chest
    if policy == "eyes":
        return structural or face or eye
    if policy == "mouth":
        return structural or face or viseme or mouth
    if policy == "facecard":
        return structural or face or eye or brow
    return False


def _cc_prune_runtime_morphs(path, mode):
    g, binary = read_glb(path)
    changed = False
    summary = []
    mesh_counts = {}
    for mesh_index, mesh in enumerate(g.get("meshes", [])):
        names = list((mesh.get("extras") or {}).get("targetNames") or [])
        if not names:
            continue
        mesh_name = str(mesh.get("name") or "")
        if mode == "base":
            if mesh_name == "base":
                policy = "all"
            elif mesh_name == "Eyes":
                policy = "eyes"
            elif mesh_name in ("Teeth", "Tongue"):
                policy = "mouth"
            else:
                policy = "facecard"
        else:
            policy = mode
        keep = [i for i, name in enumerate(names) if _cc_keep_runtime_morph(name, policy)]
        assert keep, "runtime morph pruning removed every target from %s" % mesh_name
        kept_names = [names[i] for i in keep]
        mesh_counts[mesh_index] = (len(names), len(kept_names), mesh_name)
        for primitive in mesh.get("primitives", []):
            targets = primitive.get("targets") or []
            assert len(targets) == len(names), "%s: targetNames/targets mismatch before prune" % mesh_name
            if len(keep) != len(names):
                primitive["targets"] = [targets[i] for i in keep]
                changed = True
            # Blender 5.2 can emit a duplicate full targetNames list here. If it
            # survives a mesh-level prune, validators and runtimes see 159 names
            # beside only 54/60 targets. Keep target names canonical at mesh level.
            primitive_extras = primitive.get("extras")
            if isinstance(primitive_extras, dict) and "targetNames" in primitive_extras:
                primitive_names = list(primitive_extras.get("targetNames") or [])
                assert not primitive_names or len(primitive_names) == len(names), "%s: primitive targetNames mismatch before prune" % mesh_name
                primitive_extras.pop("targetNames", None)
                if not primitive_extras:
                    primitive.pop("extras", None)
                changed = True
            assert len(primitive.get("targets") or []) == len(kept_names), "%s: targets mismatch after prune" % mesh_name
        if "weights" in mesh:
            weights = list(mesh["weights"])
            assert len(weights) == len(names), "%s: targetNames/weights mismatch before prune" % mesh_name
            had_nonzero = any(abs(float(value)) > 1e-7 for value in weights)
            mesh["weights"] = [0.0] * len(kept_names)
            if len(keep) != len(names) or had_nonzero:
                changed = True
            assert len(mesh["weights"]) == len(kept_names), "%s: weights mismatch after prune" % mesh_name
            assert not any(abs(float(value)) > 1e-12 for value in mesh["weights"]), "%s: non-zero default morph weight after normalization" % mesh_name
        if kept_names != names:
            mesh.setdefault("extras", {})["targetNames"] = kept_names
            changed = True
        assert list((mesh.get("extras") or {}).get("targetNames") or []) == kept_names, "%s: canonical targetNames mismatch after prune" % mesh_name
        summary.append((mesh_name, len(names), len(kept_names), policy))

    # glTF nodes may override mesh.weights. Neutralize those too so a runtime
    # cannot reactivate the sampled morph values even when the mesh is neutral.
    for node in g.get("nodes", []):
        mesh_index = node.get("mesh")
        if mesh_index not in mesh_counts or "weights" not in node:
            continue
        original_count, kept_count, mesh_name = mesh_counts[mesh_index]
        node_weights = list(node["weights"])
        assert len(node_weights) in (original_count, kept_count), "%s: node weights mismatch before normalization" % mesh_name
        had_nonzero = any(abs(float(value)) > 1e-7 for value in node_weights)
        node["weights"] = [0.0] * kept_count
        if len(node_weights) != kept_count or had_nonzero:
            changed = True
        assert len(node["weights"]) == kept_count, "%s: node weights mismatch after normalization" % mesh_name
        assert not any(abs(float(value)) > 1e-12 for value in node["weights"]), "%s: non-zero node morph weight after normalization" % mesh_name

    if changed:
        write_glb(path, g, binary)
    print("BUILD runtime morph prune", os.path.basename(path), summary)
    return summary


_cc_prune_runtime_morphs(args.out, "base")
for _hid, _labels in HAIR_STYLES:
    _hp = os.path.join(out_dir, "hair_%s.glb" % _hid)
    if os.path.isfile(_hp):
        _cc_prune_runtime_morphs(_hp, "hair")
for _fn in sorted(os.listdir(out_dir)):
    if _fn.startswith("clothing_") and _fn.endswith(".glb"):
        _cc_prune_runtime_morphs(os.path.join(out_dir, _fn), "cloth")
'''
    text = replace_once(text, '\nif LICENSES:\n', prune_block + '\nif LICENSES:\n', 'inject mobile runtime morph pruning')

    # build_base.py may end the Blender process before the outer runpy wrapper
    # gets control again. Write the success marker from inside the build, only
    # after every GLB, skeleton sidecar, license inventory and .blend snapshot
    # has been written.
    old_done = 'print("BUILD done", args.out)'
    new_done = old_done + '\nwith open("/tmp/cc-build-ready", "w", encoding="utf-8") as _ready:\n    _ready.write("ok")'
    text = replace_once(text, old_done, new_done, 'write in-build success marker')

    path.write_text(text, encoding='utf-8')
    print(f'PATCH OK mpfb_namespace={namespace_count} arkit={len(ARKIT)} visemes={len(VISEMES)} license=output morph_prune=runtime-neutral mpfb_version=verified build_marker=inside file={path}')


if __name__ == '__main__':
    main()