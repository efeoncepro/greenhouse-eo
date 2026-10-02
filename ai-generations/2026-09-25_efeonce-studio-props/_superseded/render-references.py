"""Render isolated white-background product references with exact vector-derived art.

Run: blender -b -noaudio --factory-startup --python render-references.py
"""
import bpy
import math
import os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, "reference-art")
OUT = os.path.join(HERE, "references-transparent")


def rgba(hex_value):
    value = hex_value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1,)


def material(name, color, roughness=0.42, metallic=0.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = rgba(color)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = rgba(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Transmission Weight"].default_value = transmission
    return m


def texture_material(name, filename, roughness=0.35, metallic=0):
    m = material(name, "#FFFFFF", roughness, metallic)
    nodes = m.node_tree.nodes
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(ART, filename), check_existing=True)
    m.node_tree.links.new(tex.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])
    return m


def cube(name, loc, scale, mat, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new("Soft manufactured edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.affect = "EDGES"
        o.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    o.data.materials.append(mat)
    return o


def cylinder(name, radius, depth, loc, mat, rotation=None, vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    if rotation:
        o.rotation_euler = rotation
    o.data.materials.append(mat)
    mod = o.modifiers.new("Soft edge", "BEVEL")
    mod.width = min(radius, depth) * 0.08
    mod.segments = 3
    o.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return o


def image_plane(name, filename, vertices, uv, roughness=0.4, metallic=0):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    mesh.update()
    layer = mesh.uv_layers.new()
    for i, coord in enumerate(uv):
        layer.data[i].uv = coord
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(texture_material(name + "-art", filename, roughness, metallic))
    return obj


def curve_line(name, points, mat, radius=0.04, cyclic=False):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.resolution_u = 32
    cu.bevel_depth = radius
    cu.bevel_resolution = 3
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for p, xyz in zip(sp.points, points):
        p.co = (*xyz, 1)
    sp.use_cyclic_u = cyclic
    ob = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(ob)
    cu.materials.append(mat)
    return ob


def clear_objects():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def setup():
    clear_objects()
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
    scene.world.color = (1, 1, 1)
    world = bpy.data.worlds.new("White seamless")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes.get("Background").inputs["Color"].default_value = (1, 1, 1, 1)
    world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .8
    for name, loc, power, size in [
        ("large key", (-3, -4, 7), 600, 5),
        ("fill", (4, -1, 5), 250, 4),
        ("rim", (2, 4, 6), 350, 3),
    ]:
        bpy.ops.object.light_add(type="AREA", location=loc)
        light = bpy.context.object
        light.name = name
        light.data.energy = power
        light.data.shape = "DISK"
        light.data.size = size
    bpy.ops.object.camera_add(location=(0, -7, 3))
    camera = bpy.context.object
    camera.name = "camera"
    camera.data.type = "ORTHO"
    scene.camera = camera
    return camera


def aim(camera, location, target, scale):
    camera.location = location
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = scale


def render_item(name, view, loc, target, scale, camera):
    target_dir = os.path.join(OUT, name)
    os.makedirs(target_dir, exist_ok=True)
    aim(camera, loc, target, scale)
    bpy.context.scene.render.filepath = os.path.join(target_dir, view + ".png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", name, view)


def build_mug(variant):
    outer = texture_material("ceramic decal " + variant, "mug-" + variant + ".png", .27)
    base_hex = {"blanco": "#F7F6F2", "azul-efeonce": "#0375DB", "naranja-globe": "#FF6500", "magenta-globe": "#BB1954"}[variant]
    ceramic = material("ceramic " + variant, base_hex, .25)
    inside = material("inner glaze " + variant, "#F7F6F2" if variant == "blanco" else base_hex, .19)
    seg = 96
    verts = []
    faces = []
    for z, r in [(0.12, .91), (2.19, 1.06)]:
        for j in range(seg + 1):
            a = -math.pi + 2 * math.pi * j / seg
            verts.append((r * math.sin(a), -r * math.cos(a), z))
    for j in range(seg):
        faces.append((j, j + 1, seg + 2 + j, seg + 1 + j))
    mesh = bpy.data.meshes.new("mug wrap")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    layer = mesh.uv_layers.new()
    for poly in mesh.polygons:
        j = poly.index
        for offset, loop_index in enumerate(poly.loop_indices):
            u, v = [(j / seg, 0), ((j + 1) / seg, 0), ((j + 1) / seg, 1), (j / seg, 1)][offset]
            layer.data[loop_index].uv = (u, v)
        poly.use_smooth = True
    shell = bpy.data.objects.new("outer ceramic artwork", mesh)
    bpy.context.collection.objects.link(shell)
    shell.data.materials.append(outer)
    cylinder("ceramic foot", .91, .17, (0, 0, .07), ceramic)
    cylinder("inner floor", .93, .06, (0, 0, .31), inside)
    # Open inner wall. A capped cone would make the cup look plugged.
    inner_verts = []
    inner_faces = []
    for z, r in [(.35, .82), (2.2, .95)]:
        for j in range(seg):
            a = 2 * math.pi * j / seg
            inner_verts.append((r * math.cos(a), r * math.sin(a), z))
    for j in range(seg):
        k = (j + 1) % seg
        inner_faces.append((k, j, seg + j, seg + k))
    inner_mesh = bpy.data.meshes.new("open inner well")
    inner_mesh.from_pydata(inner_verts, [], inner_faces)
    inner_mesh.update()
    well = bpy.data.objects.new("open inner glazed wall", inner_mesh)
    bpy.context.collection.objects.link(well)
    well.data.materials.append(inside)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.01, minor_radius=.075, location=(0, 0, 2.19), major_segments=96, minor_segments=16)
    bpy.context.object.name = "rounded lip"
    bpy.context.object.data.materials.append(ceramic)
    points = []
    for i in range(29):
        t = -math.pi / 2 + math.pi * i / 28
        points.append((1.05 + .72 * math.cos(t), 0, 1.16 + .82 * math.sin(t)))
    curve_line("ceramic handle", points, ceramic, .15)


def build_agenda():
    navy = material("navy book cloth", "#023C70", .8)
    paper = material("ivory paper", "#F7F3E9", .88)
    cube("A5 paper block", (.025, 0, 1.67), (2.33, .23, 3.22), paper, .025)
    cube("front bookcloth cover", (0, -.145, 1.67), (2.43, .07, 3.36), navy, .035)
    cube("back bookcloth cover", (0, .145, 1.67), (2.43, .07, 3.36), navy, .035)
    cube("cloth spine", (-1.2, 0, 1.67), (.08, .31, 3.36), navy, .025)
    image_plane("orbital cover", "agenda-frente.png", [(-1.18, -.182, .045), (1.18, -.182, .045), (1.18, -.182, 3.29), (-1.18, -.182, 3.29)], [(0, 0), (1, 0), (1, 1), (0, 1)], .8)
    ribbon = material("active blue ribbon", "#0375DB", .55)
    cube("page ribbon", (.72, -.05, .026), (.035, .26, .16), ribbon, .01)


def build_pen():
    navy = material("pen anodized navy", "#023C70", .39, .18)
    silver = material("brushed aluminum", "#BDC8CA", .33, .76)
    white = material("orbit white", "#FFFFFF", .38)
    cylinder("pen barrel", .14, 3.05, (0, 0, .19), navy, (0, math.pi / 2, 0))
    cylinder("pen cap", .16, .39, (-1.4, 0, .19), silver, (0, math.pi / 2, 0))
    bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=.14, radius2=.008, depth=.39, location=(1.71, 0, .19), rotation=(0, math.pi / 2, 0))
    bpy.context.object.name = "metal writing tip"
    bpy.context.object.data.materials.append(silver)
    for x in (-.49, -.36):
        points = []
        for i in range(33):
            a = -.83 * math.pi + (1.65 * math.pi) * i / 32
            points.append((x, .145 * math.sin(a), .19 + .145 * math.cos(a)))
        curve_line("interrupted orbital pen ring", points, white, .012)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=.035, location=(-.425, 0, .345))
    bpy.context.object.name = "orbital node"
    bpy.context.object.data.materials.append(white)


def build_laptop():
    metal = material("satin laptop aluminum", "#BDC8CA", .38, .65)
    shadow = material("hinge detail", "#7D8B92", .5, .45)
    cube("closed laptop lower case", (0, 0, .105), (3.48, 2.55, .17), metal, .075)
    cube("closed laptop lid", (0, .04, .225), (3.45, 2.5, .07), metal, .06)
    image_plane("removable orbit sticker arrangement", "laptop-tapa.png", [(-1.67, -1.17, .263), (1.67, -1.17, .263), (1.67, 1.25, .263), (-1.67, 1.25, .263)], [(0, 0), (1, 0), (1, 1), (0, 1)], .38, .45)
    cube("hinge line", (0, 1.29, .18), (3.13, .055, .08), shadow, .02)


def build_board():
    glass = material("translucent acrylic", "#D3E9F2", .18, 0, .25)
    edge = material("polished acrylic edge", "#91B2C2", .22, .04, .15)
    steel = material("anodized base", "#8EA5AF", .28, .72)
    cube("acrylic board", (0, 0, 1.56), (3.35, .06, 2.7), glass, .015)
    for x in (-1.67, 1.67):
        cube("polished side edge", (x, -.001, 1.56), (.022, .07, 2.7), edge, .006)
    for z in (.21, 2.91):
        cube("polished horizontal edge", (0, -.001, z), (3.35, .07, .022), edge, .006)
    image_plane("frosted branded header", "pizarra-cabecera.png", [(-1.6, -.041, 2.61), (1.6, -.041, 2.61), (1.6, -.041, 2.88), (-1.6, -.041, 2.88)], [(0, 0), (1, 0), (1, 1), (0, 1)], .52)
    for x in (-1.28, 1.28):
        cube("board standoff", (x, .14, .21), (.18, .42, .28), steel, .035)
        cube("board foot", (x, 0, .065), (.35, 1.15, .12), steel, .035)


def build_tray():
    beige = material("sand aluminum", "#D6D0C6", .5, .3)
    navy = material("navy inner line", "#023C70", .55)
    cube("technical tray base", (0, 0, .1), (3.25, 2.2, .2), beige, .09)
    for x in (-1.58, 1.58):
        cube("tray side rim", (x, 0, .23), (.13, 2.18, .29), beige, .04)
    for y in (-1.04, 1.04):
        cube("tray end rim", (0, y, .23), (3.18, .13, .29), beige, .04)
    for x in (-1.1, -.6, -.1, .4, .9):
        cube("reconfigurable divider", (x, .53, .24), (.035, .8, .16), navy, .01)
    # The graphic is expressed by the asymmetric double arc and node, no logo.
    for sign in (-1, 1):
        points = []
        for i in range(25):
            t = math.pi * i / 24
            xx = sign * (.17 + 1.03 * i / 24)
            yy = -.25 + .29 * math.sin(t)
            points.append((xx, yy, .213))
        curve_line("orbit in tray floor", points, navy, .018)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=.07, location=(0, -.25, .215))
    bpy.context.object.data.materials.append(navy)


def make_one(name, builder, views, scale):
    camera = setup()
    builder()
    for key, pos, target in views:
        render_item(name, key, pos, target, scale, camera)


MUG_VIEWS = [
    ("01-frente", (0, -7, 3.0), (0, 0, 1.15)),
    ("02-tres-cuartos", (4.6, -6, 3.3), (0, 0, 1.1)),
    ("03-perfil", (7, -.8, 2.8), (0, 0, 1.1)),
    ("04-reverso", (0, 7, 2.8), (0, 0, 1.1)),
    ("05-cenital", (3, -4, 8), (0, 0, 1.1)),
]
UPRIGHT = [
    ("01-frente", (0, -7, 2.5), (0, 0, 1.65)),
    ("02-tres-cuartos", (4.5, -6, 3.0), (0, 0, 1.65)),
    ("03-perfil", (7, -.7, 2.7), (0, 0, 1.65)),
    ("04-reverso", (0, 7, 2.6), (0, 0, 1.65)),
]
HORIZONTAL = [
    ("01-frente", (0, -7, 3), (0, 0, .25)),
    ("02-tres-cuartos", (4.5, -6, 4), (0, 0, .2)),
    ("03-perfil", (7, -.6, 2.0), (0, 0, .2)),
    ("04-cenital", (0, -1, 8), (0, 0, .2)),
]

for variant in ("blanco", "azul-efeonce", "naranja-globe", "magenta-globe"):
    make_one("mug-" + variant, lambda v=variant: build_mug(v), MUG_VIEWS, 4.25)
make_one("agenda-navy", build_agenda, UPRIGHT, 4.5)
make_one("lapicero-navy", build_pen, HORIZONTAL, 4.4)
make_one("laptop-stickers", build_laptop, HORIZONTAL, 5.15)
make_one("pizarra-acrilica", build_board, UPRIGHT, 4.9)
make_one("bandeja-tecnica", build_tray, HORIZONTAL, 4.7)
