"""Three physical orbit concepts for mugs; no printed logo or orbit decal.

Run: blender -b -noaudio --factory-startup --python render-mug-concepts.py
"""
import bpy
import math
import os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "mug-concepts-transparent")

COLORS = {
    "blanco": ("#F7F6F2", "#023C70"),
    "azul-efeonce": ("#0375DB", "#F7F6F2"),
    "naranja-globe": ("#FF6500", "#F7F6F2"),
    "magenta-globe": ("#BB1954", "#F7F6F2"),
}
CAMERAS = {
    "01-frente": ((0, -7, 2.9), (0, 0, 1.15)),
    "02-tres-cuartos": ((4.5, -6, 3.3), (0, 0, 1.15)),
    "03-perfil": ((7, -.8, 2.8), (0, 0, 1.15)),
    "04-cenital": ((3, -4, 8), (0, 0, .9)),
}


def rgba(h):
    v = h.lstrip("#")
    return tuple(int(v[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1,)


def mat(name, color, rough=.29):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba(color)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = rgba(color)
    p.inputs["Roughness"].default_value = rough
    return m


def cylinder(name, radius, depth, z, material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth, location=(0, 0, z))
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(material)
    bevel = ob.modifiers.new("rounded ceramic edge", "BEVEL")
    bevel.width = .04
    bevel.segments = 3
    ob.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return ob


def curve(name, points, material, radius=.07, cyclic=False):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = 5
    sp = data.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for p, xyz in zip(sp.points, points):
        p.co = (*xyz, 1)
    sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(material)
    return ob


def torus(name, major, minor, z, material):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=(0, 0, z), major_segments=96, minor_segments=16)
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(material)
    return ob


def plain_cup(body, inside, rim=None):
    seg = 96
    verts, faces = [], []
    for z, r in [(.1, .9), (2.18, 1.06)]:
        for j in range(seg):
            a = 2 * math.pi * j / seg
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for j in range(seg):
        k = (j + 1) % seg
        faces.append((j, k, seg + k, seg + j))
    mesh = bpy.data.meshes.new("tapered cup shell")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    ob = bpy.data.objects.new("glazed exterior", mesh)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(body)
    for poly in mesh.polygons:
        poly.use_smooth = True
    cylinder("foot", .9, .17, .08, body)
    cylinder("inner floor", .83, .05, .3, inside)
    inner_verts, inner_faces = [], []
    for z, r in [(.33, .82), (2.18, .95)]:
        for j in range(seg):
            a = 2 * math.pi * j / seg
            inner_verts.append((r * math.cos(a), r * math.sin(a), z))
    for j in range(seg):
        k = (j + 1) % seg
        inner_faces.append((k, j, seg + j, seg + k))
    inner = bpy.data.meshes.new("open inner wall")
    inner.from_pydata(inner_verts, [], inner_faces)
    inner.update()
    ob = bpy.data.objects.new("open inner glaze", inner)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(inside)
    torus("rounded ceramic lip", 1.005, .06, 2.18, rim or body)


def normal_handle(material):
    points = []
    for i in range(31):
        t = -math.pi / 2 + math.pi * i / 30
        points.append((1.02 + .62 * math.cos(t), 0, 1.17 + .72 * math.sin(t)))
    curve("small useful handle", points, material, .13)


def orbit_handle(material):
    # The orbit is the usable loop itself: wide oval, asymmetric to cup body.
    points = []
    for i in range(43):
        t = -math.pi / 2 + math.pi * i / 42
        x = 1.02 + .9 * math.cos(t)
        z = 1.16 + .9 * math.sin(t)
        points.append((x, 0, z))
    curve("wide orbital grip", points, material, .145)
    # Thumb landing is functional, not a detached decorative dot.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1, location=(1.16, -.02, 2.0))
    ob = bpy.context.object
    ob.name = "thumb landing at upper joint"
    ob.scale = (.22, .2, .085)
    ob.data.materials.append(material)


def concept_a(body, accent):
    plain_cup(body, body)
    orbit_handle(accent)


def concept_b(body, accent):
    plain_cup(body, body)
    normal_handle(body)
    # A recessed-looking in-glaze channel circles the lip, with a break at grip.
    points = []
    for i in range(78):
        t = math.radians(26) + math.radians(308) * i / 77
        points.append((.955 * math.cos(t), .955 * math.sin(t), 2.196))
    curve("inlaid interrupted lip channel", points, accent, .018)


def concept_c(body, accent):
    plain_cup(body, body)
    normal_handle(body)
    saucer = mat("saucer ceramic", "#F7F6F2", .36)
    cylinder("working saucer", 1.83, .1, .03, saucer)
    torus("raised seat keeps cup centered", 1.09, .035, .105, saucer)
    # Color is in the removable base, away from drinking surface.
    points = []
    for i in range(92):
        t = math.radians(28) + math.radians(304) * i / 91
        points.append((1.56 * math.cos(t), 1.56 * math.sin(t), .09))
    curve("interrupted saucer channel", points, accent, .055)


def setup():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 64
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("soft product world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes.get("Background").inputs["Color"].default_value = (1, 1, 1, 1)
    world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .8
    for name, loc, energy, size in [
        ("large key", (-3, -4, 7), 600, 5),
        ("soft fill", (4, -1, 5), 250, 4),
        ("rim light", (2, 4, 6), 350, 3),
    ]:
        bpy.ops.object.light_add(type="AREA", location=loc)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
    bpy.ops.object.camera_add(location=(0, -7, 3))
    cam = bpy.context.object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 4.6
    scene.camera = cam
    return cam


def render(concept, variant, camera):
    folder = os.path.join(OUT, concept, variant)
    os.makedirs(folder, exist_ok=True)
    for name, (loc, target) in CAMERAS.items():
        camera.location = loc
        direction = Vector(target) - camera.location
        camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.render.filepath = os.path.join(folder, name + ".png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", concept, variant, name)


for concept, builder in [
    ("A-asa-orbital", concept_a),
    ("B-borde-circular", concept_b),
    ("C-base-orbital", concept_c),
]:
    for variant, (base_hex, accent_hex) in COLORS.items():
        cam = setup()
        body = mat("body-" + variant, base_hex)
        accent = mat("accent-" + variant, accent_hex)
        builder(body, accent)
        render(concept, variant, cam)
