/* Offline, deterministic animation primitives. Sample any time in any order. No timers/network. */
(function(root){
 const clamp=x=>Math.min(1,Math.max(0,x)),lerp=(a,b,t)=>a+(b-a)*t;
 const curves={linear:clamp,out:x=>1-(1-clamp(x))**3,in:x=>clamp(x)**3,inOut:x=>{x=clamp(x);return x*x*(3-2*x)},back:x=>{x=clamp(x)-1;return 1+2.1*x*x*x+1.1*x*x}};
 function progress(t,start,duration,ease='out'){return curves[ease](duration?((t-start)/duration):(t>=start?1:0))}
 function track(t,keys){if(t<=keys[0].t)return{...keys[0].value};for(let i=1;i<keys.length;i++){if(t<=keys[i].t){const p=progress(t,keys[i-1].t,keys[i].t-keys[i-1].t,keys[i].ease||'inOut'),a=keys[i-1].value,b=keys[i].value;return Object.fromEntries(Object.keys({...a,...b}).map(k=>[k,lerp(a[k]??0,b[k]??0,p)]));}}return{...keys.at(-1).value}}
 function pose(el,{x=0,y=0,z=0,rx=0,ry=0,rz=0,scale=1,alpha=1,blur=0}={}){Object.assign(el.style,{transform:`translate3d(${x}px,${y}px,${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${scale})`,opacity:String(clamp(alpha)),filter:blur?`blur(${blur}px)`:'none'})}
 function reveal(el,t,start,{duration=.42,y=65,x=0,z=0,rx=0,ry=0,mask=false}={}){const p=progress(t,start,duration);pose(el,{x:x*(1-p),y:y*(1-p),z:z*(1-p),rx:rx*(1-p),ry:ry*(1-p),alpha:clamp((t-start)/.1)});el.style.clipPath=mask?`inset(0 0 ${100*(1-p)}% 0)`:'none';return p}
 function compileEvents(events,fps){return events.map(e=>({...e,frame:Math.round(e.time*fps),time:Math.round(e.time*fps)/fps})).sort((a,b)=>a.frame-b.frame)}
 root.MotionKit={clamp,lerp,curves,progress,track,pose,reveal,compileEvents};
})(typeof window!=='undefined'?window:globalThis);
