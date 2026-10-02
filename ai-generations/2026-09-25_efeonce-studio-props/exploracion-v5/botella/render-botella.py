# Botella deportiva de acero con pintura en polvo, hombro redondeado, tapa rosca con asa. Lathe con UV cilíndrica.
import bpy,math,json,os,bmesh
from mathutils import Vector
from pathlib import Path
D=Path(__file__).parent.resolve();M=.001
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=64;sc.cycles.use_denoising=True
pr=bpy.context.preferences.addons['cycles'].preferences;pr.compute_device_type='METAL';pr.get_devices()
for d in pr.devices:d.use=d.type=='METAL'
sc.cycles.device='GPU';sc.render.resolution_x=1200;sc.render.resolution_y=1200
sc.render.image_settings.file_format='PNG';sc.render.image_settings.color_mode='RGBA';sc.render.film_transparent=True
sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast'
sc.world.use_nodes=True;bg=sc.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(1,1,1,1);bg.inputs['Strength'].default_value=.65
def lin(h):
 a=[int(h[i:i+2],16)/255 for i in (1,3,5)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a)+(1,)
def mat(n,c,rough=.45,metal=0,coat=.1):
 m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=lin(c);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Coat Weight'].default_value=coat;return m
body_m=mat('Pintura_polvo','#001A33',.55,0,.05);steel=mat('Acero_cepillado','#C9CDD2',.28,1,0);lid=mat('Tapa','#1B1F24',.4,0,.15);slider=mat('Deslizador','#2A3038',.35)
tex=body_m.node_tree.nodes.new('ShaderNodeTexImage');body_m.node_tree.links.new(tex.outputs['Color'],body_m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);tex.extension='EXTEND'
H0,H1=6,206  # zona imprimible (mm)
def lathe(profile,name,mats_fn,N=256,uv=None):
 v=[];f=[];uvs=[];mi=[]
 for r,z in profile:
  for i in range(N):a=2*math.pi*i/N-math.pi;v.append((r*math.cos(a)*M,r*math.sin(a)*M,z*M))
 for j in range(len(profile)-1):
  for i in range(N):
   k=(i+1)%N;f.append((j*N+i,j*N+k,(j+1)*N+k,(j+1)*N+i));z0,z1=profile[j][1],profile[j+1][1]
   uvs.append([(i/N,(z0-H0)/(H1-H0)),((i+1)/N,(z0-H0)/(H1-H0)),((i+1)/N,(z1-H0)/(H1-H0)),(i/N,(z1-H0)/(H1-H0))]);mi.append(mats_fn(j,profile))
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();ob=bpy.data.objects.new(name,me);sc.collection.objects.link(ob)
 u=me.uv_layers.new(name='UV')
 for p,uvq,m in zip(me.polygons,uvs,mi):
  p.material_index=m;p.use_smooth=True
  for li,c in zip(p.loop_indices,uvq):u.data[li].uv=c
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();me.update();return ob,me
# Cuerpo recto (r 36), hombro redondeado hasta el cuello (r 22) y rosca metálica.
prof=[(0,0),(28,0),(33,.8),(35.6,3),(36,6)]
for j in range(1,21):prof.append((36,6+200*j/20))
for j in range(1,13):a=math.pi/2*j/12;prof.append((22+14*math.cos(a),206+14*math.sin(a)))
prof+=[(22,222),(21.6,223),(21.6,229)]
body,bme=lathe(prof,'Cuerpo',lambda j,p:0 if p[j][1]<221 else 1)
for m in [body_m,steel]:bme.materials.append(m)
lp=[(23.4,229),(24.2,230),(24.2,248),(23.4,250),(16,251),(0,251.2)]
lo,lme=lathe(lp,'Tapa',lambda j,p:0);lme.materials.append(lid)
bpy.ops.mesh.primitive_torus_add(major_radius=.013,minor_radius=.0032,location=(0,0,.258),rotation=(math.pi/2,0,0));t=bpy.context.object;t.scale=(1,1.25,1);t.data.materials.append(lid)
for p in t.data.polygons:p.use_smooth=True
def area(n,loc,pw,s,t=(0,0,.09)):
 d=bpy.data.lights.new(n,'AREA');ob=bpy.data.objects.new(n,d);sc.collection.objects.link(ob);ob.location=loc;d.energy=pw;d.size=s;ob.rotation_euler=(Vector(t)-ob.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-.3,-.34,.44),3.2,.28,(0,0,.13));area('Fill',(.36,-.14,.26),1.1,.24,(0,0,.13));area('Rim',(.06,.36,.42),2.2,.26,(0,0,.13))
bpy.ops.mesh.primitive_plane_add(size=200);g=bpy.context.object;g.is_shadow_catcher=True
bpy.ops.object.camera_add();cam=bpy.context.object;sc.camera=cam;cam.data.lens=85;cam.data.sensor_width=36
routes=json.loads((D/'rutas-botella.json').read_text())
for r in routes:
 tex.image=bpy.data.images.load(str(D/'texturas'/f"{r['id']}.png"),check_existing=True)
 lid.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=lin(r['tapa'])
 out=D/'renders'/r['id'];out.mkdir(parents=True,exist_ok=True)
 for name,azi,el in [('01-frente',-90,8),('02-tres-cuartos',-50,18),('06-reverso',90,8)]:
  az=math.radians(azi);e=math.radians(el);t=Vector((0,0,.13));dist=.8
  cam.location=t+Vector((dist*math.cos(e)*math.cos(az),dist*math.cos(e)*math.sin(az),dist*math.sin(e)));cam.rotation_euler=(t-cam.location).to_track_quat('-Z','Y').to_euler()
  sc.render.filepath=str(out/f'{name}.png');bpy.ops.render.render(write_still=True)
print('RENDER_FINISHED')
