# Builds the game's people (assets/models/person_{kid_m,kid_f,man,woman}.glb) with MakeHuman's MPFB 2 in Blender.
# Characters are CC0 (MPFB + makehuman_system_assets_cc0). Idle/Walk/Run are baked from the CC0 Quaternius "Man"
# clips, then each model is made web-friendly: Shirt/Pants/Shoes/Hair/Skin materials the game tints, small WebP
# textures, decimated meshes.
#
# Needs: Blender 4.2+ with the MPFB extension, the asset pack
#   https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
# unzipped into MPFB's user data folder, and the Quaternius Man clips saved as tools/quaternius_man.glb
#   (https://poly.pizza/m/HMnuH5geEG).
# Run: blender --background --python tools/build_people.py
import bpy, importlib, os, numpy as np
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'models')
P = 'bl_ext.user_default.mpfb.services.'
HS = importlib.import_module(P + 'humanservice').HumanService
TS = importlib.import_module(P + 'targetservice').TargetService
ES = importlib.import_module(P + 'exportservice').ExportService

# ---- retargeting ----
# target bone: (source bone, source bone whose head gives the segment direction or None)
MAP = {
    'pelvis': ('Hips', None), 'spine_01': ('Abdomen', None), 'spine_03': ('Torso', None),
    'neck_01': ('Neck', None), 'head': ('Head', None),
}
for s, S in (('l', 'L'), ('r', 'R')):
    MAP.update({
        f'clavicle_{s}': (f'Shoulder.{S}', f'UpperArm.{S}'), f'upperarm_{s}': (f'UpperArm.{S}', f'LowerArm.{S}'),
        f'lowerarm_{s}': (f'LowerArm.{S}', f'Palm.{S}'), f'hand_{s}': (f'Palm.{S}', None),
        f'thigh_{s}': (f'UpperLeg.{S}', f'LowerLeg.{S}'), f'calf_{s}': (f'LowerLeg.{S}', f'Foot.{S}'), f'foot_{s}': (f'Foot.{S}', None),
    })


def wrot(m):
    return m.to_3x3().normalized().to_quaternion()


def bake(src, tgt, src_action, name):
    vl = bpy.context.view_layer
    # rest data
    src.animation_data.action = None
    for pb in src.pose.bones: pb.matrix_basis = Matrix()
    for pb in tgt.pose.bones: pb.matrix_basis = Matrix()
    vl.update()
    s_rest = {n: wrot(src.matrix_world @ src.data.bones[n].matrix_local) for n, _ in MAP.values()}
    s_head = lambda n, posed: (src.matrix_world @ (src.pose.bones[n].head if posed else src.data.bones[n].head_local))
    t_rest = {n: wrot(tgt.matrix_world @ tgt.data.bones[n].matrix_local) for n in MAP}
    align = {}
    for t, (s, sc) in MAP.items():
        if sc is None:
            align[t] = Quaternion()
            continue
        b = tgt.data.bones[t]
        td = (tgt.matrix_world @ b.tail_local) - (tgt.matrix_world @ b.head_local)
        sd = s_head(sc, False) - s_head(s, False)
        align[t] = td.rotation_difference(sd)
    # hands follow the forearm alignment so wrists don't snap
    for s in 'lr': align[f'hand_{s}'] = align[f'lowerarm_{s}']
    hip0 = s_head('Hips', False)
    k = (tgt.matrix_world @ tgt.data.bones['pelvis'].head_local).z / hip0.z
    order = sorted(MAP, key=lambda n: len(tgt.data.bones[n].parent_recursive))
    levels = sorted({len(tgt.data.bones[n].parent_recursive) for n in order})

    tgt.animation_data_create()
    act = bpy.data.actions.new(name); act.use_fake_user = True
    tgt.animation_data.action = act
    src.animation_data.action = src_action
    f0, f1 = (int(round(v)) for v in src_action.frame_range)
    bpy.context.scene.frame_set(f0 + 1); bpy.context.scene.frame_set(f0); vl.update()   # a fresh action isn't evaluated until a frame change
    tw_inv = tgt.matrix_world.inverted()
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        for pb in tgt.pose.bones: pb.matrix_basis = Matrix()
        vl.update()
        for lv in levels:
            for t in order:
                if len(tgt.data.bones[t].parent_recursive) != lv: continue
                s = MAP[t][0]
                delta = wrot(src.matrix_world @ src.pose.bones[s].matrix) @ s_rest[s].inverted()
                q = delta @ align[t] @ t_rest[t]
                pb = tgt.pose.bones[t]
                if t == 'pelvis':
                    head = (tgt.matrix_world @ tgt.data.bones[t].head_local) + (s_head('Hips', True) - hip0) * k
                else:
                    head = tgt.matrix_world @ pb.head
                pb.matrix = tw_inv @ Matrix.LocRotScale(head, q, None)
            vl.update()
        for t in order:
            pb = tgt.pose.bones[t]
            pb.rotation_mode = 'QUATERNION'
            pb.keyframe_insert('rotation_quaternion', frame=f - f0)
            if t == 'pelvis': pb.keyframe_insert('location', frame=f - f0)
    src.animation_data.action = None
    tgt.animation_data.action = None
    return act


# ---- build and export ----
from mathutils import Vector



def build(name, pheno, skin, hair, clothes):
    info = HS._create_default_human_info_dict()
    info['phenotype'].update(pheno); info['rig'] = 'game_engine'; info['name'] = name
    info['skin_mhmat'] = skin; info['skin_material_type'] = 'MAKESKIN'
    info['eyes'] = 'low-poly/low-poly.mhclo'; info['eyes_material_type'] = 'MAKESKIN'
    info['eyebrows'] = 'eyebrow001/eyebrow001.mhclo'; info['hair'] = hair or ''
    info['clothes'] = clothes
    s = HS.get_default_deserialization_settings(); s['subdiv_levels'] = 0
    return HS.deserialize_from_dict(info, s)


def pixels(img, size):
    if not img.has_data: img.reload()
    img.pixels[0]   # force the file to load; an unloaded copy scales to black
    c = img.copy(); c.scale(size, size)
    a = np.empty(size * size * 4, np.float32); c.pixels.foreach_get(a)
    bpy.data.images.remove(c)
    return a.reshape(size, size, 4)


def new_image(name, arr, non_color=False):
    h, w, _ = arr.shape
    old = bpy.data.images.get(name)
    if old: bpy.data.images.remove(old)
    im = bpy.data.images.new(name, w, h, alpha=True)
    if non_color: im.colorspace_settings.name = 'Non-Color'   # before writing: changing it resets the pixels
    im.pixels.foreach_set(np.ascontiguousarray(arr, np.float32).ravel())
    im.pack()
    return im


def gray(arr, top=0.95, floor=0.0):
    # luminance, stretched so the bright end is ~white: the game multiplies it by the wanted colour
    l = arr[..., 0] * 0.3 + arr[..., 1] * 0.59 + arr[..., 2] * 0.11
    hi = np.percentile(l[arr[..., 3] > 0.5] if (arr[..., 3] > 0.5).any() else l, 98) or 1
    l = np.clip(l / hi * top, 0, 1)
    l = floor + (1 - floor) * l   # soften AO so tinted cloth stays clean
    out = arr.copy(); out[..., 0] = out[..., 1] = out[..., 2] = l
    return out


def material(name, tex=None, normal=None, alpha=False, rough=0.8):
    old = bpy.data.materials.get(name)
    if old: bpy.data.materials.remove(old)   # keep exported names exact
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = 0
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = tex
        nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
        if alpha: nt.links.new(t.outputs['Alpha'], p.inputs['Alpha'])
    if normal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = normal
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
    return m


def tex_of(obj, key):
    for m in obj.data.materials:
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and n.name.startswith(key): return n.image
    return None


def smooth_split(obj, rounds=4):
    """Majority vote over edge neighbours so labels, pockets and stitching don't leave shirt specks on trousers."""
    import bmesh
    bm_ = bmesh.new(); bm_.from_mesh(obj.data); bm_.faces.ensure_lookup_table()
    for _ in range(rounds):
        new = []
        for f in bm_.faces:
            nb = [g.material_index for e in f.edges for g in e.link_faces if g is not f]
            new.append(round(sum(nb) / len(nb)) if nb else f.material_index)
        for f, m in zip(bm_.faces, new): f.material_index = m
    bm_.to_mesh(obj.data); bm_.free()


def decimate(obj, ratio):
    if ratio >= 1: return
    md = obj.modifiers.new('dec', 'DECIMATE'); md.ratio = ratio
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_move_to_index(modifier='dec', index=0)
    bpy.ops.object.modifier_apply(modifier='dec')


def webify(bm, split, body_ratio=0.22, cloth_ratio=0.35):
    """split: {'clothes asset name': ('color'|'z', threshold)} turns each suit into Shirt/Pants materials."""
    rig = bm.parent
    TS.bake_targets(bm)
    ES.bake_modifiers_remove_helpers(bm, bake_masks=True, remove_helpers=True)
    pelvis_z = (rig.matrix_world @ rig.data.bones['pelvis'].head_local).z
    for o in list(rig.children):
        if o.type != 'MESH': continue
        n = o.name.split('.', 1)[1] if '.' in o.name else o.name
        diff = tex_of(o, 'diffuse'); ao = tex_of(o, 'aomap'); nrm = tex_of(o, 'normalmap')
        o.data.materials.clear()
        if o is bm:
            o.data.materials.append(material('Skin', new_image('skin', pixels(diff, 1024)), rough=0.6))
            decimate(o, body_ratio)
        elif n.startswith('eyebrow') or n.startswith('eyelash'):
            o.data.materials.append(material('Brows', new_image(n, gray(pixels(diff, 256), 0.6)), alpha=True))
        elif n.startswith('low-poly') or 'eye' in n:
            o.data.materials.append(material('Eyes', new_image('eyes', pixels(diff, 256)), rough=0.3))
        elif n in split:
            base = new_image(n + '_ao', gray(pixels(ao or diff, 512), 1.0, 0.55))
            nm = new_image(n + '_n', pixels(nrm, 512), True) if nrm else None
            o.data.materials.append(material('Shirt', base, nm))
            o.data.materials.append(material('Pants', base, nm))
            how, thr = split[n]
            col = pixels(diff, 256)
            uv = o.data.uv_layers.active.data
            for poly in o.data.polygons:
                if how == 'color':
                    u = sum((uv[i].uv for i in poly.loop_indices), Vector((0, 0))) / poly.loop_total
                    r, g, b, _ = col[int(min(255, max(0, u.y * 256))), int(min(255, max(0, u.x * 256)))]
                    # labels and rivets are separate little islands: below the hips they still belong to the trousers
                    pants = b > r + thr or (o.matrix_world @ poly.center).z < pelvis_z + 0.02
                else:
                    pants = (o.matrix_world @ poly.center).z < pelvis_z + thr
                poly.material_index = 1 if pants else 0
            smooth_split(o)
            decimate(o, cloth_ratio)
        elif n.startswith('shoes'):
            base = new_image(n + '_ao', gray(pixels(ao or diff, 256), 1.0, 0.45))
            o.data.materials.append(material('Shoes', base, new_image(n + '_n', pixels(nrm, 256), True) if nrm else None, rough=0.5))
            decimate(o, cloth_ratio)
        else:  # hair
            o.data.materials.append(material('Hair', new_image(n, gray(pixels(diff, 512), 0.9)), alpha=True, rough=0.55))
            decimate(o, 0.5)
    return rig


def animate(rig):
    src = bpy.data.objects['SRC_HumanArmature']
    for clip in ('Idle', 'Walk', 'Run'):
        act = bake(src, rig, bpy.data.actions['HumanArmature|Man_' + clip], clip)
        tr = rig.animation_data.nla_tracks.new(); tr.name = clip
        tr.strips.new(clip, 0, act)


def export(rig, fname):
    bpy.ops.object.select_all(action='DESELECT')
    for o in [rig] + list(rig.children):
        o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, fname), export_format='GLB', use_selection=True, export_apply=True,
        export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1,
        export_morph=False, export_image_format='WEBP', export_image_quality=80, export_texcoords=True, export_normals=True,
        export_tangents=False, export_def_bones=True, export_skins=True, export_extras=False, export_cameras=False, export_lights=False)


# ---- the four body types ----
ASIAN = {'asian': 1.0, 'caucasian': 0.0, 'african': 0.0}
PEOPLE = {
    'kid_m': ({'gender': 1.0, 'age': 0.1875, 'race': ASIAN}, 'young_asian_male/young_asian_male.mhmat', 'short02/short02.mhclo',
              ['male_casualsuit06/male_casualsuit06.mhclo', 'shoes01/shoes01.mhclo'], {'male_casualsuit06': ('color', 0.08)}),
    'kid_f': ({'gender': 0.0, 'age': 0.1875, 'race': ASIAN}, 'young_asian_female/young_asian_female.mhmat', 'ponytail01/ponytail01.mhclo',
              ['male_casualsuit03/male_casualsuit03.mhclo', 'shoes01/shoes01.mhclo'], {'male_casualsuit03': ('color', 0.08)}),
    'man': ({'gender': 1.0, 'age': 0.5, 'muscle': 0.55, 'weight': 0.55, 'race': ASIAN}, 'young_asian_male/young_asian_male.mhmat', 'short04/short04.mhclo',
            ['male_casualsuit03/male_casualsuit03.mhclo', 'shoes02/shoes02.mhclo'], {'male_casualsuit03': ('color', 0.08)}),
    'woman': ({'gender': 0.0, 'age': 0.5, 'race': ASIAN}, 'young_asian_female/young_asian_female.mhmat', 'bob02/bob02.mhclo',
              ['male_casualsuit03/male_casualsuit03.mhclo', 'shoes01/shoes01.mhclo'], {'male_casualsuit03': ('color', 0.08)}),
}


def make(key):
    for o in [o for o in bpy.data.objects if o.name.split('.')[0] == key]:
        bpy.data.objects.remove(o, do_unlink=True)
    pheno, skin, hair, clothes, split = PEOPLE[key]
    rig = webify(build(key, pheno, skin, hair, clothes), split)
    animate(rig)
    export(rig, f'person_{key}.glb')
    for o in [rig] + list(rig.children): o.hide_set(True)
    return rig

if __name__ == '__main__':
    if 'SRC_HumanArmature' not in bpy.data.objects:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'tools', 'quaternius_man.glb'))
        for o in set(bpy.data.objects) - before: o.name = 'SRC_' + o.name
    for key in PEOPLE: make(key)
