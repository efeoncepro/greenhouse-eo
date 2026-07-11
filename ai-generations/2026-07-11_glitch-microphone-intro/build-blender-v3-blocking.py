import bpy
import math
import os
from mathutils import Matrix, Vector

MODE = os.environ.get("GLITCH_V3_MODE", "proxy")
if MODE not in {"proxy", "realistic"}:
    raise RuntimeError("GLITCH_V3_MODE must be proxy or realistic")
OUTPUT_ROOT = "/Users/jreye/Library/Application Support/Blender/5.1/greenhouse-renders/" + (
    "glitch-microphone-intro-v3" if MODE == "proxy" else "glitch-microphone-intro-v3-lookdev"
)
HUMAN_ASSET_BLEND = "/Users/jreye/Library/Application Support/Blender/5.1/assets/greenhouse-glitch/human-base-meshes-bundle-v1.0.0/human_base_meshes_bundle.blend"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, metallic=0.0, roughness=0.5, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def add_cube(name, location, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Soft edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
    obj.data.materials.append(mat)
    return obj


def add_cylinder(name, location, radius, depth, mat, rotation=(0.0, 0.0, 0.0), vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def add_capsule(name, location, radius, length, mat, rotation=(0.0, 0.0, 0.0)):
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    root.location = location
    root.rotation_euler = rotation
    shaft = add_cylinder(f"{name}.shaft", (0, 0, 0), radius, length, mat)
    shaft.parent = root
    for index, z in enumerate((-length / 2, length / 2)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=radius, location=(0, 0, z))
        cap = bpy.context.object
        cap.name = f"{name}.cap.{index}"
        cap.data.materials.append(mat)
        cap.parent = root
    return root


def aim_at(obj, point):
    direction = Vector(point) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def linear_key(obj, frame, location):
    obj.location = location
    obj.keyframe_insert(data_path="location", frame=frame)


def set_linear_interpolation(obj):
    if not obj.animation_data or not obj.animation_data.action:
        return
    for fcurve in obj.animation_data.action.fcurves:
        for point in fcurve.keyframe_points:
            point.interpolation = "BEZIER"
            point.easing = "EASE_IN_OUT"


def add_realistic_hand(skin):
    with bpy.data.libraries.load(HUMAN_ASSET_BLEND, link=False) as (source, target):
        if "Hand  - Realistic" not in source.objects:
            raise RuntimeError("Official realistic hand asset not found")
        target.objects = ["Hand  - Realistic"]
    hand = target.objects[0]
    bpy.context.collection.objects.link(hand)
    hand.name = "Realistic hand mesh"
    hand.data.materials.clear()
    hand.data.materials.append(skin)
    for modifier in list(hand.modifiers):
        if modifier.type == "MULTIRES":
            modifier.levels = min(1, modifier.total_levels)
            modifier.render_levels = min(2, modifier.total_levels)

    armature_data = bpy.data.armatures.new("Hand rig data")
    rig = bpy.data.objects.new("Hand rig", armature_data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    def bone(name, head, tail, parent=None, connected=False):
        item = armature_data.edit_bones.new(name)
        item.head = head
        item.tail = tail
        item.parent = parent
        item.use_connect = connected
        return item

    wrist = bone("wrist", (0.018, 0.0, 0.074), (0.018, 0.0, 0.020))
    palm = bone("palm", (0.018, 0.0, 0.020), (0.018, 0.0, -0.058), wrist, True)
    fingers = {
        "pinky": (-0.045, [-0.052, -0.095, -0.135, -0.164]),
        "ring": (-0.018, [-0.058, -0.108, -0.157, -0.188]),
        "middle": (0.012, [-0.060, -0.118, -0.171, -0.204]),
        "index": (0.043, [-0.052, -0.105, -0.153, -0.190])
    }
    for name, (x, zs) in fingers.items():
        previous = palm
        for segment in range(3):
            previous = bone(
                f"{name}.{segment + 1}",
                (x, 0.0, zs[segment]),
                (x, 0.0, zs[segment + 1]),
                previous,
                segment > 0,
            )
    thumb_1 = bone("thumb.1", (0.050, 0.0, -0.015), (0.076, 0.0, -0.045), palm)
    thumb_2 = bone("thumb.2", (0.076, 0.0, -0.045), (0.090, 0.0, -0.075), thumb_1, True)
    bone("thumb.3", (0.090, 0.0, -0.075), (0.095, 0.0, -0.105), thumb_2, True)
    bpy.ops.object.mode_set(mode="OBJECT")

    bpy.ops.object.select_all(action="DESELECT")
    hand.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    hand.matrix_parent_inverse = Matrix.Identity(4)
    hand.location = (0.0, 0.0, 0.0)
    hand.rotation_euler = (0.0, 0.0, 0.0)
    hand.scale = (1.0, 1.0, 1.0)

    rig.scale = (10.0, 10.0, 10.0)
    rig.rotation_euler = (math.radians(-4), math.radians(2), math.radians(-5))
    for name in ("middle", "ring", "pinky"):
        for segment, angle in ((1, -38), (2, -62), (3, -48)):
            pose_bone = rig.pose.bones[f"{name}.{segment}"]
            pose_bone.rotation_mode = "XYZ"
            pose_bone.rotation_euler.x = math.radians(angle)
    for segment, angle in ((1, -18), (2, -34), (3, -28)):
        pose_bone = rig.pose.bones[f"thumb.{segment}"]
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler.x = math.radians(angle)
        pose_bone.rotation_euler.z = math.radians(-18)
    for segment, angle in ((1, 2), (2, -4), (3, -3)):
        pose_bone = rig.pose.bones[f"index.{segment}"]
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler.x = math.radians(angle)
    forearm = add_capsule(
        "Forearm continuation",
        (-0.001, 0.0, 0.241),
        0.050,
        0.36,
        skin,
        rotation=(0.0, math.radians(-25), 0.0),
    )
    forearm.parent = rig
    return rig


def build():
    os.makedirs(OUTPUT_ROOT, exist_ok=True)
    clear_scene()
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 120
    scene.render.fps = 24
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 360
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    frames_root = os.path.join(OUTPUT_ROOT, "frames")
    os.makedirs(frames_root, exist_ok=True)
    scene.render.filepath = os.path.join(frames_root, "frame-")
    scene.render.film_transparent = False
    scene.world.color = (0.001, 0.003, 0.012)

    navy = material("Navy set", (0.005, 0.012, 0.035), roughness=0.72)
    black = material("Mic black", (0.008, 0.010, 0.014), metallic=0.65, roughness=0.28)
    grille = material("Grille", (0.035, 0.045, 0.055), metallic=0.9, roughness=0.34)
    skin = material("Skin proxy", (0.46, 0.20, 0.105), roughness=0.52)
    red = material("ON AIR emission", (0.25, 0.006, 0.004), roughness=0.35, emission=(1.0, 0.018, 0.006), strength=8.0)
    green = material("Console green", (0.005, 0.15, 0.025), roughness=0.35, emission=(0.02, 1.0, 0.08), strength=6.0)
    blue = material("Studio blue", (0.004, 0.03, 0.22), roughness=0.3, emission=(0.01, 0.09, 1.0), strength=4.0)

    add_cube("Backdrop", (0, 2.5, 2.6), (4.3, 0.15, 4.5), navy)
    add_cube("Desk", (0, 0.9, -0.15), (4.2, 2.1, 0.18), black, bevel=0.08)

    mic_shift = 1.15 if MODE == "realistic" else 0.0
    add_cylinder("Microphone body", (0.45 + mic_shift, 0.0, 1.45), 0.43, 2.7, black, rotation=(0, math.radians(90), 0))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, location=(-1.02 + mic_shift, 0.0, 1.45), scale=(0.62, 0.48, 0.48))
    mic_head = bpy.context.object
    mic_head.name = "Microphone grille"
    mic_head.data.materials.append(grille)
    bpy.ops.object.shade_smooth()
    if MODE == "realistic":
        wire = mic_head.modifiers.new("Woven grille proxy", "WIREFRAME")
        wire.thickness = 0.010
        wire.use_replace = True
        bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, location=(-1.02 + mic_shift, 0.08, 1.45), scale=(0.58, 0.42, 0.42))
        inner = bpy.context.object
        inner.name = "Microphone grille inner"
        inner.data.materials.append(black)
        bpy.ops.object.shade_smooth()
        for x in (0.10, 0.38, 0.66, 0.94, 1.22, 1.50, 1.78, 2.06):
            add_cylinder(f"Mic body ridge {x}", (x + mic_shift, 0.0, 1.45), 0.445, 0.035, grille, rotation=(0, math.radians(90), 0), vertices=64)
    add_cylinder("Boom", (1.65 + mic_shift, 0.2, 2.1), 0.12, 3.6, black, rotation=(0, math.radians(58), math.radians(2)))

    add_cube("Console", (-0.4, 1.15, 0.55), (2.6, 0.7, 0.13), navy, bevel=0.08)
    for i in range(9):
        add_cube(f"Console LED {i}", (-2.0 + i * 0.48, 0.62, 0.72), (0.08, 0.04, 0.025), green if i % 2 == 0 else blue, bevel=0.02)
    if MODE == "realistic":
        screen = add_cube("Waveform screen", (-1.65, 1.65, 1.38), (0.92, 0.08, 0.50), navy, bevel=0.05)
        for i, height in enumerate((0.08, 0.17, 0.28, 0.12, 0.34, 0.20, 0.11, 0.24, 0.15)):
            add_cube(f"Waveform bar {i}", (-2.25 + i * 0.15, 1.54, 1.38), (0.035, 0.02, height), green, bevel=0.01)
    for x in (-2.8, 2.65):
        add_cube("Blue practical", (x, 2.2, 2.7), (0.045, 0.08, 1.5), blue, bevel=0.02)

    sign_center_x = 1.30 if MODE == "realistic" else 1.25
    sign_z = 3.32 if MODE == "realistic" else 3.05
    add_cube("ON AIR housing", (sign_center_x, 2.15, sign_z), (0.78, 0.10, 0.32), black, bevel=0.08)
    bpy.ops.object.text_add(location=(sign_center_x - 0.53, 2.02, sign_z - 0.11), rotation=(math.radians(90), 0, 0))
    sign = bpy.context.object
    sign.name = "ON AIR physical letters"
    sign.data.body = "ON AIR"
    sign.data.align_x = "LEFT"
    sign.data.size = 0.38
    sign.data.extrude = 0.018
    sign.data.bevel_depth = 0.006
    sign.data.materials.append(red)

    if MODE == "realistic":
        hand_root = add_realistic_hand(skin)
        # Align the index (beside the thumb) over the curved grille; other fingers sit left of it.
        hover = (-0.25, -0.36, 3.55)
        contact = (-0.25, -0.36, 3.35)
        lifted = (-0.65, -0.36, 4.20)
    else:
        hand_root = bpy.data.objects.new("Hand proxy root", None)
        bpy.context.collection.objects.link(hand_root)
        palm = add_cube("Palm proxy", (-1.1, -0.35, 3.65), (0.70, 0.28, 0.42), skin, bevel=0.22)
        palm.parent = hand_root
        index = add_capsule("Index proxy", (-1.08, -0.34, 2.42), 0.18, 1.45, skin)
        index.parent = hand_root
        for i, x in enumerate((-1.65, -1.38, -0.80)):
            finger = add_capsule(f"Other finger {i}", (x, -0.28, 3.05 + 0.08 * i), 0.15, 0.82, skin, rotation=(0, math.radians(8 + i * 7), 0))
            finger.parent = hand_root
        # The mic grille top is z≈1.93. Index bottom is root z - 0.725 - 0.18.
        hover = (-0.02, 0.0, 0.36)
        contact = (-0.02, 0.0, 0.02)
        lifted = (-0.30, 0.0, 0.85)
    for frame, loc in [
        (1, hover), (13, hover), (14, (hover[0], hover[1], 0.17)), (15, contact),
        (16, hover), (26, hover), (27, (hover[0], hover[1], 0.17)), (28, contact),
        (29, hover), (40, lifted), (120, lifted)
    ]:
        linear_key(hand_root, frame, loc)
    bpy.ops.object.camera_add(location=(0.1, -8.8, 3.05))
    camera = bpy.context.object
    camera.name = "Locked portrait camera"
    camera.data.lens = 58
    camera.data.sensor_width = 36
    camera.data.dof.use_dof = True
    camera.data.dof.focus_object = mic_head
    camera.data.dof.aperture_fstop = 3.2
    aim_at(camera, ((0.40 if MODE == "realistic" else -0.15), 0.15, 2.05))
    scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-2.2, -2.4, 5.2))
    key = bpy.context.object
    key.name = "Warm hand key"
    key.data.energy = 900
    key.data.shape = "DISK"
    key.data.size = 3.2
    key.data.color = (1.0, 0.38, 0.16)
    aim_at(key, ((-0.2 if MODE == "realistic" else -1.0), 0.0, 2.7))

    bpy.ops.object.light_add(type="AREA", location=(2.8, 0.0, 4.5))
    fill = bpy.context.object
    fill.name = "Blue rim"
    fill.data.energy = 1100
    fill.data.size = 2.4
    fill.data.color = (0.02, 0.12, 1.0)
    aim_at(fill, (0.0, 0.0, 1.8))

    bpy.ops.object.light_add(type="POINT", location=(sign_center_x, 1.75, sign_z))
    practical = bpy.context.object
    practical.name = "ON AIR practical spill"
    practical.data.energy = 140
    practical.data.color = (1.0, 0.01, 0.003)

    scene.frame_set(1)
    scene_name = "glitch-microphone-intro-v3-blocking.blend" if MODE == "proxy" else "glitch-microphone-intro-v3-lookdev.blend"
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUTPUT_ROOT, scene_name))
    preview_frame = os.environ.get("GLITCH_V3_PREVIEW_FRAME")
    if preview_frame:
        scene.frame_set(int(preview_frame))
        scene.render.filepath = os.path.join(OUTPUT_ROOT, f"preview-frame-{int(preview_frame):04d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"LOOKDEV_PREVIEW={scene.render.filepath}")
        return
    bpy.ops.render.render(animation=True)
    print(f"BLOCKING_FRAMES={scene.render.filepath}")


build()
