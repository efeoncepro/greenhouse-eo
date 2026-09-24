(function(){
 const M=MotionKit,plan=window.TITLE_PLAN,$=id=>document.getElementById(id);
 const cues=[];
 for(const scene of plan.scenes)for(const e of scene.elements)cues.push({id:e.id+'-land',type:['plus','seo'].includes(e.id)?'accent':'soft',time:plan.insertAt+e.land,localTime:e.land});
 window.titleCues=M.compileEvents(cues,plan.fps);
 // Text faces and extrusion belong to the foreground. The generated camera is never animated here.
 for(const scene of plan.scenes)for(const e of scene.elements){const el=$(e.id);if(e.text){el.dataset.copy=e.text;el.innerHTML='<span class="ink"></span>';el.firstChild.textContent=e.text;}}
 window.frame=t=>{
 t=Math.max(0,Math.min(plan.duration,t));
 const bubble=$('urlBubble');bubble.style.display=t>=10.25&&t<14.25?'block':'none';bubble.style.opacity=String(.72*M.progress(t,10.30,.20,'out'));
 for(const scene of plan.scenes){const node=$(scene.id);node.style.display=t>=scene.start&&t<scene.end?'':'none';M.pose(node);if(node.style.display==='none')continue;
 const out=scene.exit||{};const exit=out.duration?M.progress(t,out.start,out.duration,'in'):0;
 // An accelerating foreground exit passes its momentum to the next title. No background shake.
 M.pose(node,{x:(out.x||0)*exit,y:(out.y||0)*exit,z:(out.z||0)*exit,rx:(out.rx||0)*exit,rz:(out.rz||0)*exit,scale:1+((out.scale??1)-1)*exit,alpha:1-exit,blur:(out.blur||0)*exit});
 for(const e of scene.elements){if(e.id==='urlBubble')continue;const el=$(e.id),age=t-e.start,flight=e.land-e.start,hit=age-flight;
 if(e.preset==='fade'){M.pose(el,{alpha:M.progress(t,e.start,e.duration,'out')});continue;}
 const q=M.progress(t,e.start,flight,'in'),f=e.from||{};
 const ring=hit>=0?Math.exp(-hit*17)*Math.sin(hit*31):0;
 const settle=hit>=0?Math.exp(-hit*15)*Math.cos(hit*28):0;
 let x=(f.x||0)*(1-q),y=(f.y||0)*(1-q),z=(f.z||0)*(1-q),rx=(f.rx||0)*(1-q),ry=(f.ry||0)*(1-q),rz=(f.rz||0)*(1-q);
 let scale=1+((f.scale??1)-1)*(1-q);
 if(e.preset==='arc'){
  const a=M.progress(t,e.start,flight,'out');x=(f.x||0)*(1-a);y=(f.y||0)*Math.sin((1-a)*Math.PI*.8);z=(f.z||0)*(1-a);rz=(f.rz||0)*(1-a)+11*ring;scale=1+.20*(1-a)+.085*ring;
 }else if(['sweep','rise','unfold','emotive'].includes(e.preset)){
  const a=M.progress(t,e.start,flight,'out');x=(f.x||0)*(1-a);y=(f.y||0)*(1-a);z=(f.z||0)*(1-a);rx=(f.rx||0)*(1-a);ry=(f.ry||0)*(1-a);rz=(f.rz||0)*(1-a);scale=1+((f.scale??1)-1)*(1-a);
 }else {scale+=.045*ring;y+=-9*ring;rx+=-3*ring;}
 const blur=age<0?0:hit<0?(e.preset==='arc'?3:7)*(1-M.clamp(age/flight)):Math.max(0,1.2*settle);
 M.pose(el,{x,y,z,rx,ry,rz,scale,alpha:M.clamp(age/(e.preset==='emotive'?.22:.055)),blur:e.preset==='emotive'?0:blur});
 el.style.clipPath=e.preset==='unfold'?`inset(-30px ${100*(1-M.progress(t,e.start,flight,'out'))}% -30px -30px)`:'none';
 if(e.id==='plus'){const glow=hit>=0?Math.exp(-hit*16)*12:0;el.style.filter=`drop-shadow(0 0 ${glow}px rgba(38,222,0,${glow/18}))`;}
 if(e.text){
  const ink=el.firstChild;const shine=M.progress(t,e.land-.035,.25,'linear');
  ink.style.backgroundPosition=(120-240*shine)+'% 50%';ink.style.backgroundImage=hit>=0&&hit<.25?'linear-gradient(110deg,#f4f8fc 0%,#f4f8fc 38%,#ffffff 48%,#f4f8fc 58%,#f4f8fc 100%)':'none';ink.style.backgroundColor='#f4f8fc';
  // Two short typographic echoes communicate speed; they disappear before the reading hold.
  const trail=['slam','sweep'].includes(e.preset)&&hit<0&&age>0?Math.sin(Math.PI*M.clamp(age/flight))*.12:0;
  el.style.setProperty('--echo-opacity',String(trail));
  el.style.setProperty('--echo-x',(e.preset==='sweep'?-34:0)+'px');
  el.style.setProperty('--echo-y',(e.preset==='sweep'?0:30)+'px');
  el.style.setProperty('--echo-scale',e.preset==='sweep'?'1':'1.075');
 }
 }
 }
 return{localTime:t,filmTime:t+plan.insertAt,scene:plan.scenes.find(s=>t>=s.start&&t<s.end)?.id||'closing'};
 };
})();
