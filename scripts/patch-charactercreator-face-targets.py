#!/usr/bin/env python3
"""Patch a pinned CharacterCreator build script to bake CC0 ARKit + Meta viseme targets.

The CharacterCreator source itself is downloaded at CI time and remains under its upstream GPL.
This small patcher only injects target sampling declarations into that external build. Generated
assets remain subject to their input asset licences and are not promoted automatically.
"""
from __future__ import annotations
import pathlib
import sys

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

    # The pinned CharacterCreator build still imports MPFB from Blender's old
    # user_default extension namespace. Blender 5.2 installs the verified MPFB
    # package from the official repository under blender_org. Rewrite all MPFB
    # imports before upstream code executes; otherwise the outer MPFB smoke test
    # passes but the real CharacterCreator build fails as soon as build_base.py
    # imports its own MPFB services.
    old_namespace = 'bl_ext.user_default.mpfb'
    new_namespace = 'bl_ext.blender_org.mpfb'
    namespace_count = text.count(old_namespace)
    if namespace_count < 1:
        raise RuntimeError('MPFB namespace patch: legacy namespace not found in pinned CharacterCreator build')
    text = text.replace(old_namespace, new_namespace)
    if old_namespace in text:
        raise RuntimeError('MPFB namespace patch incomplete')

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

    # build_base.py can terminate Blender immediately after its final BUILD done
    # line, so a marker written by the outer runpy wrapper is not reliable. Put
    # the marker inside the pinned build itself, after every required output has
    # been exported and the .blend snapshot has been saved. The workflow also
    # starts from a clean output directory, so this cannot be satisfied by an
    # upstream prebuilt file from an earlier run.
    old_done = 'print("BUILD done", args.out)'
    new_done = old_done + '\nwith open("/tmp/cc-build-ready", "w", encoding="utf-8") as _ready:\n    _ready.write("ok")'
    text = replace_once(text, old_done, new_done, 'write in-build success marker')

    path.write_text(text, encoding='utf-8')
    print(f'PATCH OK mpfb_namespace={namespace_count} arkit={len(ARKIT)} visemes={len(VISEMES)} build_marker=inside file={path}')


if __name__ == '__main__':
    main()
