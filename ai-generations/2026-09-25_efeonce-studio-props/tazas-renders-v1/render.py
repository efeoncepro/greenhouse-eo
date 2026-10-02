import bpy,math,json,sys,os,bmesh
from mathutils import Vector
from pathlib import Path
D=Path(__file__).parent.resolve();M=.001
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
probe='--probe' in args
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24 if probe else 64
scene.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='METAL';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='METAL'
scene.cycles.device='GPU'
scene.render.resolution_x=800 if probe else 1600
scene.render.resolution_y=800 if probe else 1600
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=0
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(1,1,1,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65

def linear(h):
 a=[int(h[i:i+2],16)/255 for i in (1,3,5)]
 return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a)+(1,)
def mat(name,col,rough=.2):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=linear(col);p.inputs['Roughness'].default_value=rough;p.inputs['IOR'].default_value=1.48;p.inputs['Coat Weight'].default_value=.23;p.inputs['Coat Roughness'].default_value=.16
 return m
outer=mat('Ceramica_exterior','#F7F8F6');inner=mat('Esmalte_interior','#0375DB',.16);handle=mat('Asa_mismo_esmalte','#F7F8F6');bottom=mat('Base_porcelana_sin_impresion','#EAE8E2',.58)
tex=outer.node_tree.nodes.new('ShaderNodeTexImage');tex.interpolation='Linear';outer.node_tree.links.new(tex.outputs['Color'],outer.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
# Lathed, closed porcelain cross section; physical wall, rolled lip, concave floor and foot ring.
profile=[(35,2),(36.4,2.4),(38,3.4),(39.4,5),(40.4,7),(40.9,9),(41,12),(41,30),(41,55),(41,78),(41,92)]
outer_end=len(profile)-1
for j in range(1,17):
 a=math.pi*j/16;profile.append((39+2*math.cos(a),92+2*math.sin(a)))
rim_end=len(profile)-1
profile += [(37,78),(37,55),(37,30),(37,16)]
for j in range(1,13):
 a=math.pi/2*j/12;profile.append((30+7*math.cos(a),16-7*math.sin(a)))
profile += [(20,9),(8,9),(0,9),(0,3),(20,3),(30,3),(32,2),(32.8,.8),(34,.5),(35,.9),(35,2)]
N=256;verts=[];faces=[];uvs=[];mats=[]
for r,z in profile:
 for i in range(N):
  a=2*math.pi*i/N-math.pi;verts.append((r*math.cos(a)*M,r*math.sin(a)*M,z*M))
for j in range(len(profile)-1):
 for i in range(N):
  k=(i+1)%N;faces.append((j*N+i,j*N+k,(j+1)*N+k,(j+1)*N+i))
  uvs.append([(i/N,profile[j][1]/98),((i+1)/N,profile[j][1]/98),((i+1)/N,profile[j+1][1]/98),(i/N,profile[j+1][1]/98)])
  mats.append(0 if j<outer_end else 1 if j<len(profile)-9 else 2)
mesh=bpy.data.meshes.new('Porcelana_lathe');mesh.from_pydata(verts,[],faces);mesh.update()
body=bpy.data.objects.new('Taza_cuerpo_unico',mesh);scene.collection.objects.link(body)
for m in [outer,inner,bottom]:mesh.materials.append(m)
u=mesh.uv_layers.new(name='Impresion_cilindrica')
for poly,uv,mi in zip(mesh.polygons,uvs,mats):
 poly.material_index=mi;poly.use_smooth=True
 for li,coord in zip(poly.loop_indices,uv):u.data[li].uv=coord
# Weld the coincident axis poles and closed profile seam; prevent degenerate fan artifacts.
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
# D-shaped ceramic handle, smooth variable oval section; invariant in every color/view.
segs=[[(39,78),(62,85),(76,75),(76,56)],[(76,56),(76,33),(62,19),(39,25)]]
pts=[]
for si,seg in enumerate(segs):
 ps=[Vector((x,0,z)) for x,z in seg]
 for j in range(49):
  if si and j==0:continue
  t=j/48;v=(1-t)**3*ps[0]+3*(1-t)**2*t*ps[1]+3*(1-t)*t*t*ps[2]+t**3*ps[3]
  dv=3*(1-t)**2*(ps[1]-ps[0])+6*(1-t)*t*(ps[2]-ps[1])+3*t*t*(ps[3]-ps[2]);pts.append((v,dv.normalized()))
hv=[];hf=[];sides=32
for i,(p,t) in enumerate(pts):
 normal=Vector((-t.z,0,t.x));frac=i/(len(pts)-1);r=5.3+2.0*math.exp(-min(frac,1-frac)*25)
 for j in range(sides):
  a=2*math.pi*j/sides;v=p+normal*(math.cos(a)*r)+Vector((0,math.sin(a)*r*.92,0));hv.append(tuple(v*M))
for i in range(len(pts)-1):
 for j in range(sides):hf.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
hf.append(tuple(reversed(range(sides))));hf.append(tuple((len(pts)-1)*sides+j for j in range(sides)))
hm=bpy.data.meshes.new('Asa_D');hm.from_pydata(hv,[],hf);hm.update();ho=bpy.data.objects.new('Asa',hm);scene.collection.objects.link(ho);hm.materials.append(handle)
for p in hm.polygons:p.use_smooth=True
# Softbox studio, stable orientation for actual geometry cues.
def area(name,loc,power,size,target=(0,0,.045),ratio=1):
 data=bpy.data.lights.new(name,'AREA');ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc;data.energy=power;data.shape='RECTANGLE';data.size=size;data.size_y=size*ratio;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
area('Softbox_izquierda',(-.19,-.2,.27),1.2,.19,ratio=1.3)
area('Relleno_derecha',(.22,-.08,.14),.4,.15,ratio=1.1)
area('Recorte_posterior',(.04,.2,.24),.8,.17,ratio=1.3)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0));ground=bpy.context.object;ground.name='Shadow_catcher';ground.is_shadow_catcher=True;ground.data.materials.append(mat('Suelo_blanco','#FFFFFF',.8))
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.lens=72;cam.data.sensor_width=36;cam.data.clip_start=.005;cam.data.clip_end=10
views=[('01-frente-palabra',-90,10),('02-tres-cuartos-palabra-asa',-45,22),('03-tres-cuartos-palabra-opuesto',-135,22),('04-perfil-asa',0,12),('05-perfil-sin-asa',180,12),('06-reverso-logo',90,10),('07-tres-cuartos-logo-asa',45,22),('08-tres-cuartos-logo-opuesto',135,22),('09-cenital',-90,90),('10-base-inferior',-90,-65)]
colors=json.loads((D/'colores.json').read_text());manifest=[]
for color in colors:
 if probe and color['id']!='blanco':continue
 tex.image=bpy.data.images.load(str(D/'texturas'/f"{color['id']}.png"),check_existing=True)
 inner.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=linear(color['interior'])
 handle.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=linear(color['base'])
 out=D/('pruebas' if probe else 'rgba')/color['id'];out.mkdir(parents=True,exist_ok=True)
 for name,azi,el in views:
  if probe and name not in ['01-frente-palabra','09-cenital','10-base-inferior']:continue
  az=math.radians(azi);e=math.radians(el);target=Vector((.012,0,.047));dist=.345
  cam.location=target+Vector((dist*math.cos(e)*math.cos(az),dist*math.cos(e)*math.sin(az),dist*math.sin(e)))
  cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();ground.hide_render=True
  scene.render.filepath=str(out/f'{name}.png');bpy.ops.render.render(write_still=True)
  manifest.append({'color':color['id'],'file':f"{color['id']}/{name}.png",'view':name,'azimuth_deg':azi,'elevation_deg':el})
 if not probe:
  bpy.ops.wm.save_as_mainfile(filepath=str(D/'taza-master.blend'))
if not probe:
 bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(D/'taza-master.blend'))
(D/('probe-manifest.json' if probe else 'renders.json')).write_text(json.dumps(manifest,indent=2))
print('RENDER_FINISHED',len(manifest),flush=True)
