"""Kit de referencia 3D del logo completo de Efeonce (geometría exacta del SVG oficial).

Uso: blender -b --factory-startup --python render_logo.py -- <config.json> <out_dir> [--only <id>] [--preview]
El config declara color, escala (altura real de las letras en metros, grosor, bisel) y cámaras.
Salida por cámara y luz: <prefijo>-<id>-luz-<izq|der>-transparente.png y manifiesto.json (el fondo de estudio se
compone después).
"""
import bpy, sys, json, math, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:]
cfg = json.load(open(argv[0])); out_dir = argv[1]; os.makedirs(out_dir, exist_ok=True)
only = argv[argv.index('--only') + 1] if '--only' in argv else None
preview = '--preview' in argv
here = os.path.dirname(os.path.abspath(argv[0]))
svg = os.path.normpath(os.path.join(here, cfg['svg']))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# --- Geometría: SVG oficial → malla plana → solidify + bisel (el contorno oficial no engorda) --------------------
# Probado y descartado: extrusión/bisel nativos de curva con offset negativo (la aleta quedaba hueca y los extremos
# de la órbita se deformaban). Con malla: fusionar vértices para la costura del subtrazado de la órbita y triangular
# las tapas para evitar rayas de sombreado en n-gons con agujeros.
bpy.ops.import_curve.svg(filepath=svg)
curves = [o for o in scene.objects if o.type == 'CURVE']
for o in curves:
    o.data.dimensions = '2D'; o.data.fill_mode = 'BOTH'; o.data.resolution_u = 24
bpy.ops.object.select_all(action='DESELECT')
for o in curves: o.select_set(True)
bpy.context.view_layer.objects.active = curves[0]
bpy.ops.object.convert(target='MESH')
bpy.ops.object.join()
logo = bpy.context.view_layer.objects.active
logo.name = 'logo-efeonce'
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
logo.location = (0, 0, 0)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
esc = cfg['escala']
k = esc['ancho_m'] / logo.dimensions.x
logo.scale = (k, k, k)
bpy.ops.object.transform_apply(scale=True)
# Tapas limpias: fusionar coincidentes, conservar sólo los contornos (el relleno de curva une agujeros con aristas
# puente que el solidify convierte en líneas visibles) y re-triangular con scanfill, que respeta los agujeros.
import bmesh
bm = bmesh.new(); bm.from_mesh(logo.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=esc['ancho_m'] * 0.0015)
boundary = [e for e in bm.edges if len(e.link_faces) == 1]
bmesh.ops.delete(bm, geom=list(bm.faces), context='FACES_ONLY')
bmesh.ops.delete(bm, geom=[e for e in bm.edges if e not in set(boundary)], context='EDGES')
bmesh.ops.triangle_fill(bm, edges=boundary, use_beauty=True, use_dissolve=False)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(logo.data); bm.free()
sol = logo.modifiers.new('grosor', 'SOLIDIFY'); sol.thickness = esc['grosor_m']; sol.offset = 0
bev = logo.modifiers.new('bisel', 'BEVEL'); bev.width = esc['bisel_m']; bev.segments = 4
bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(40); bev.harden_normals = True
logo.rotation_euler = (math.radians(90), 0, 0)
bpy.ops.object.transform_apply(rotation=True)
bpy.context.view_layer.update()
zmin = min((logo.matrix_world @ Vector(c)).z for c in logo.bound_box)
logo.location.z -= zmin
base_z = logo.location.z
bpy.ops.object.shade_smooth()
logo.data.set_sharp_from_angle(angle=math.radians(35)) if hasattr(logo.data, 'set_sharp_from_angle') else None

mat = bpy.data.materials.new('laca'); mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']
hexcol = cfg['color_hex'].lstrip('#')
lin = lambda c: (c / 255) / 12.92 if c / 255 <= 0.04045 else (((c / 255) + 0.055) / 1.055) ** 2.4
bsdf.inputs['Base Color'].default_value = (*[lin(int(hexcol[i:i + 2], 16)) for i in (0, 2, 4)], 1)
bsdf.inputs['Roughness'].default_value = cfg.get('rugosidad', 0.3)
bsdf.inputs['Coat Weight'].default_value = cfg.get('coat', 0.3)
bsdf.inputs['Coat Roughness'].default_value = 0.05
logo.data.materials.clear()
logo.data.materials.append(mat)
for poly in logo.data.polygons: poly.material_index = 0

# Sin piso ni superficie: el kit es el objeto aislado; la escena la pone el agente.
world = bpy.data.worlds.new('estudio'); scene.world = world; world.use_nodes = True
nt = world.node_tree; bg = nt.nodes['Background']
if cfg.get('hdri'):
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(os.path.join(bpy.utils.resource_path('LOCAL'), 'datafiles', 'studiolights', 'world', cfg['hdri']))
    nt.links.new(env.outputs['Color'], bg.inputs['Color'])
else:
    # Entorno neutro controlado: los reflejos de un HDRI plateaban caras y cantos y alejaban el navy del color de marca.
    bg.inputs['Color'].default_value = (0.5, 0.5, 0.52, 1)
bg.inputs['Strength'].default_value = cfg.get('entorno_fuerza', 0.35)

# Luz principal (sol) + relleno de cielo suave.
sun_data = bpy.data.lights.new('sol', 'SUN'); sun_data.energy = cfg.get('sol_fuerza', 4.0); sun_data.angle = math.radians(4)
sun = bpy.data.objects.new('sol', sun_data); scene.collection.objects.link(sun)
W = esc['ancho_m']; e2 = (W / 20) ** 2
def area(name, size, energy):
    d = bpy.data.lights.new(name, 'AREA'); d.shape = 'RECTANGLE'; d.size = size; d.size_y = size * 0.6; d.energy = energy * e2
    o = bpy.data.objects.new(name, d); scene.collection.objects.link(o); return o
softbox = area('softbox', W * 0.9, cfg.get('softbox_fuerza', 16000))   # caja grande: sólo luz difusa
# Sin reflejo especular de la caja: en contrapicados su reflejo lavaba media palabra a gris plateado (medido: sin la
# caja, mitades izq/der parejas; con ella, una mitad 60 % más clara) y la referencia dejaba de mostrar el navy de marca.
softbox.data.specular_factor = 0.0
softbox.visible_glossy = False  # Cycles ignora specular_factor: la visibilidad glossy del objeto es la que manda
# El sol también: su brillo, ensanchado por la rugosidad satinada, se reflejaba hacia las cámaras en contrapicado y
# lavaba la cara frontal completa a gris. Queda un brillo mínimo para que el volumen se lea.
sun_data.specular_factor = cfg.get('sol_especular', 0.15)
rim = area('contraluz', W * 0.8, cfg.get('contraluz_fuerza', 5000))     # contraluz: separa el canto del fondo
def point_at(o, target=(0, 0, 0)):
    d = Vector(target) - o.location; o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    scene.cycles.device = 'GPU'
except Exception:
    pass
scene.cycles.samples = 48 if preview else cfg.get('samples', 256)
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = cfg['resolucion']
scene.render.resolution_percentage = 50 if preview else 100
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'

cam_data = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam); scene.camera = cam
cam_data.sensor_width = 36

def fit(margin=0.84):
    # Encuadre: ajusta lente y desplazamiento (no la posición) para que el logo ocupe `margin` del cuadro sin cambiar
    # la perspectiva, que depende sólo de dónde está la cámara.
    dg = bpy.context.evaluated_depsgraph_get()
    ev = logo.evaluated_get(dg); me = ev.to_mesh()
    pts = [ev.matrix_world @ v.co for v in me.vertices]
    rx, ry = scene.render.resolution_x, scene.render.resolution_y
    for _ in range(3):
        bpy.context.view_layer.update()
        co = [world_to_camera_view(scene, cam, p) for p in pts]
        xs = [c.x for c in co]; ys = [c.y for c in co]
        ex, ey = max(xs) - min(xs), max(ys) - min(ys)
        sc = max(ex / margin, ey / margin)
        dx = (max(xs) + min(xs)) / 2 - 0.5; dy = (max(ys) + min(ys)) / 2 - 0.5
        cam_data.lens = cam_data.lens / sc
        big = max(rx, ry)
        cam_data.shift_x += dx * rx / big
        cam_data.shift_y += dy * ry / big
    ev.to_mesh_clear()

def aim(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

manifest = []
for c in cfg['camaras']:
    if only and c['id'] != only: continue
    # Elevación del objeto por cámara (p. ej. sobre una fachada o azotea) para ver su cara inferior desde abajo sin
    # recurrir a un gran angular extremo, que curva la palabra.
    logo.location.z = base_z + c.get('elevacion_objeto_m', 0); bpy.context.view_layer.update()
    cam.location = Vector(c['pos']); aim(cam, c['mira']); cam_data.lens = c['lente_mm']
    cam_data.shift_x = 0; cam_data.shift_y = 0
    cam_data.clip_end = 5000
    fit(c.get('margen', 0.84))
    for lado, sgn in (('izq', -1), ('der', 1)):
        # Sol desde arriba a 45°, entrando por el lado indicado y desde el frente.
        sun.rotation_euler = (math.radians(55), 0, math.radians(sgn * -70))
        # Luces relativas al centro REAL del objeto (incluida su elevación): fijas en el mundo, al elevar el logo la
        # caja quedaba casi a su altura y lavaba a gris el lado cercano de la palabra.
        cz = logo.location.z + logo.dimensions.z / 2
        softbox.location = (sgn * W * 1.2, -W * 2.2, cz + W * 1.0); point_at(softbox, (0, 0, cz))
        rim.location = (-sgn * W * 0.8, W * 1.6, cz + W * 0.8); point_at(rim, (0, 0, cz))
        base = f"{cfg['prefijo']}-{c['id']}-luz-{lado}"
        scene.render.film_transparent = True
        scene.render.filepath = os.path.join(out_dir, base + '-transparente.png')
        bpy.ops.render.render(write_still=True)
        manifest.append({**{k: c[k] for k in ('id', 'descripcion', 'usos')}, 'luz': lado, 'archivo': base + '-transparente.png',
                         'camara': {'posicion_m': c['pos'], 'mira_m': c['mira'], 'lente_mm_efectiva': round(cam_data.lens, 1),
                                    'altura_camara_m': c['pos'][2], 'elevacion_objeto_m': c.get('elevacion_objeto_m', 0)}, 'color': cfg['color'], 'escala': esc})
        print('OK', base)

mpath = os.path.join(out_dir, f"{cfg['prefijo']}-manifiesto.json")
if only and os.path.exists(mpath):
    # Re-render parcial: conservar las entradas de las demás cámaras.
    previo = [r for r in json.load(open(mpath))['renders'] if r['id'] != only]
    manifest = sorted(previo + manifest, key=lambda r: (r['id'], r['luz']))
json.dump({'logo': cfg['svg'], 'color_hex': cfg['color_hex'], 'regla_camara': cfg.get('regla_camara'), 'renders': manifest},
          open(mpath, 'w'), ensure_ascii=False, indent=2)
