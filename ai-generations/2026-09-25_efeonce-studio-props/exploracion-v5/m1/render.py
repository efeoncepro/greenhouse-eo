# M1 · Objeto real: esfera mate teal apoyada como punto final de una palabra impresa en un muro de papel.
import bpy,math,sys
from mathutils import Vector
from pathlib import Path
D=Path(__file__).parent.resolve()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete()
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=160;sc.cycles.use_denoising=True
pr=bpy.context.preferences.addons['cycles'].preferences;pr.compute_device_type='METAL';pr.get_devices()
for d in pr.devices:d.use=d.type=='METAL'
sc.cycles.device='GPU';sc.view_settings.view_transform='Standard';sc.view_settings.look='None';sc.view_settings.exposure=-1.45
sc.world.use_nodes=True;bg=sc.world.node_tree.nodes['Background'];bg.inputs['Color'].default_value=(0.93,0.91,0.88,1);bg.inputs['Strength'].default_value=0.22
def lin(h):
 c=[int(h[i:i+2],16)/255 for i in (1,3,5)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)+(1,)
def mat(name,col,rough=.8,tex=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=lin(col);p.inputs['Roughness'].default_value=rough
 if tex:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(tex));m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
 return m
def scene(tex,word_end_px,sphere_d,res,cam_loc,cam_target,lens,out,gapm=-0.012,fstop=3.2):
 for o in list(bpy.data.objects):bpy.data.objects.remove(o)
 # muro 4×2 m (x -2..2, z 0..2) en y=0, mirando a -y; piso
 bpy.ops.mesh.primitive_plane_add(size=1);w=bpy.context.object;w.scale=(4,2,1);w.rotation_euler=(math.radians(90),0,0);w.location=(0,0,1)
 w.data.materials.append(mat('muro','#ECE8E1',.85,tex))
 bpy.ops.mesh.primitive_plane_add(size=1);w2=bpy.context.object;w2.scale=(30,12,1);w2.rotation_euler=(math.radians(90),0,0);w2.location=(0,0.003,5.99);w2.data.materials.append(mat('fondo','#ECE8E1',.85))
 bpy.ops.mesh.primitive_plane_add(size=12,location=(0,-5.9,0));f=bpy.context.object;f.data.materials.append(mat('piso','#E2DDD4',.9))
 r=sphere_d/2;end=word_end_px/1000-2
 bpy.ops.mesh.primitive_uv_sphere_add(radius=r,segments=128,ring_count=64,location=(end+gapm+r,-r-0.004,r));s=bpy.context.object
 bpy.ops.object.shade_smooth();sm=mat('esfera','#12AFA2',.5);p=sm.node_tree.nodes['Principled BSDF'];p.inputs['Subsurface Weight'].default_value=0.04;s.data.materials.append(sm)
 def area(loc,en,size,tgt):
  L=bpy.data.lights.new('a','AREA');L.energy=en;L.size=size;o=bpy.data.objects.new('a',L);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(tgt)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
 area((-2.6,-2.6,2.6),520,2.2,(0.2,0,0.3));area((3,-3.5,1.2),70,2.5,(0.5,0,0.3))
 bpy.ops.object.camera_add(location=cam_loc);c=bpy.context.object;c.data.lens=lens;c.rotation_euler=(Vector(cam_target)-Vector(cam_loc)).to_track_quat('-Z','Y').to_euler();sc.camera=c;c.data.dof.use_dof=True;c.data.dof.focus_object=s;c.data.dof.aperture_fstop=fstop
 sc.render.resolution_x,sc.render.resolution_y=res;sc.render.filepath=str(D/out);bpy.ops.render.render(write_still=True)
#MURO_OK scene(D/'muro-hacer.png',2587,0.19,(1920,1080),(0.1,-5.2,0.95),(0.1,0,0.42),55,'m1-muro.png')
scene(D/'muro-siempre.png',2415,0.15,(1080,1350),(0.05,-1.75,0.42),(0.05,0,0.3),42,'m1-post.png',gapm=-0.008,fstop=2.8)
print('M1_DONE')
