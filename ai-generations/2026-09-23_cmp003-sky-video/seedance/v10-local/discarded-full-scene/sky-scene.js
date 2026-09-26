(function(){
const M=MotionKit,$=id=>document.getElementById(id),p=M.progress,c=M.clamp;
const Q='¿A dónde viajar en Sudamérica?',fps=24;
const events=[{id:'enter',type:'enter',time:1.60},{id:'result-1',type:'tick',time:1.85},{id:'result-2',type:'tick',time:2.16},{id:'result-3',type:'tick',time:2.47},{id:'chat-morph',type:'swish',time:3.70},{id:'answer-1',type:'soft',time:4.18},{id:'answer-2',type:'soft',time:4.66},{id:'answer-3',type:'soft',time:5.14},{id:'citation-attach',type:'soft',time:5.67},{id:'citation-press',type:'press',time:8.54},{id:'citation-riser',type:'riser',time:8.62,duration:.84},{id:'flight-reveal',type:'impact',time:9.32},{id:'flight-pass',type:'jet',time:12.24,duration:4.5},{id:'year',type:'hit',time:15.12},{id:'plus-land',type:'hit',time:18.25},{id:'number-land',type:'soft',time:18.48},{id:'pieces-land',type:'soft',time:18.73},{id:'agency-intro',type:'soft',time:20.69},{id:'agency',type:'soft',time:21.12},{id:'seo',type:'hit',time:21.52},{id:'thanks',type:'hit',time:24.40},{id:'closing',type:'soft',time:26.08}];
for(let i=0;i<Q.length;i++)if(Q[i]!==' ')events.push({id:'key-'+i,type:'key',time:.20+(i+1)/Q.length*1.25});
window.skyEvents=M.compileEvents(events,fps);window.skyConfig={width:1080,height:1920,fps,duration:30,flightStart:9.28,flightDuration:5.54,flightSourceStart:10.083333,rigs:['A-frontal','B-lateral','C-elevada']};
const all=['search','results','user','answer','year','proof','news','thanks'];
const cameraKeys=[
{t:0,value:{x:65,y:50,z:140,rx:4,ry:-30,rz:-3,scale:.96}},
{t:1.38,value:{x:-15,y:0,z:0,rx:0,ry:-10,rz:-.7,scale:.98},ease:'inOut'},
{t:1.68,value:{x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:.98},ease:'out'},
{t:2.40,value:{x:5,y:20,z:0,rx:15,ry:-17,rz:1,scale:.94},ease:'inOut'},
{t:3.25,value:{x:0,y:0,z:0,rx:5,ry:-6,rz:0,scale:.95},ease:'out'},
{t:4.10,value:{x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1},ease:'inOut'}];
function show(id,yes){$(id).style.display=yes?'':'none'}
function layout(){const r=$('citation').getBoundingClientRect(),s=Number(getComputedStyle(document.documentElement).getPropertyValue('--scale'))||1;return{x:(r.left+r.width/2)/s,y:(r.top+r.height/2)/s}}
function frame(t){
 t=Math.max(0,Math.min(30,t));for(const id of all){show(id,false);M.pose($(id));$(id).style.clipPath='none'}
 $('closing').style.display='none';M.pose($('camera'));$('camera').style.transformOrigin='540px 840px';$('search').style.opacity=1;
 $('flare').style.opacity='0';$('portalHalo').style.opacity='0';$('cloudWipe').style.opacity='0';$('flight').style.opacity='0';$('sky').style.opacity='1';
 $('sky').style.transform=`scale(${1.12+t*.0008}) translate3d(${-38+t*2}px,${16-t*.48}px,0)`;
 $('skyNear').style.transform=`scale(1.19) translate(${-80+t*4}px,${20-t*1.3}px)`;$('skyNear').style.opacity='.10';
 if(t<4.10){
 show('search',true);$('search').style.display='flex';M.pose($('camera'),M.track(t,cameraKeys));
 $('search').style.top=(655-245*p(t,1.70,.35,'inOut'))+'px';
 const keyCount=window.skyEvents.filter(e=>e.type==='key'&&e.time<=t).length; // actual typing uses every character schedule below
 let typed=0;for(let i=0;i<Q.length;i++)if(Math.round((.20+(i+1)/Q.length*1.25)*fps)/fps<=t)typed=i+1;
 $('searchText').textContent=Q.slice(0,typed);$('cursor').style.opacity=t<1.6?'1':'0';$('enter').style.opacity=t>=1.48&&t<1.82?'1':'0';
 const press=t>=1.6&&t<1.78?Math.sin(c((t-1.6)/.18)*Math.PI):0;$('search').style.transform=`scale(${1-.035*press})`;
 if(t>=1.82){show('results',true);for(let i=0;i<3;i++){const id='result'+i;M.reveal($(id),t,window.skyEvents.find(e=>e.id==='result-'+(i+1)).time,{duration:.40,x:160+40*i,y:70,z:130+45*i,ry:-12});if(t>3.65){const out=p(t,3.65+i*.035,.24,'in');M.pose($(id),{x:-360*out,z:-200*out,alpha:1-out,blur:3*out})}}}
 if(t>=3.65){const u=p(t,3.65,.45,'inOut');$('search').style.opacity=1-u;show('user',true);M.pose($('user'),{x:85*(1-u),y:80*(1-u),scale:.96+.04*u,alpha:u});$('user').style.top='390px'}
 }else if(t<9.42){
 show('user',true);$('user').style.top=(390-35*p(t,4.1,.55))+'px';
 show('answer',true);const expand=p(t,4.10,1.5,'inOut');$('answer').style.height=(130+455*expand)+'px';$('answer').style.top=(600-28*p(t,4.1,1.55))+'px';
 M.pose($('answer'),{y:45*(1-p(t,4.1,.6)),rx:-7*(1-p(t,4.1,.7)),alpha:c((t-4.1)/.15)});
 for(let i=1;i<=3;i++)M.reveal($('phrase'+i),t,[0,4.18,4.66,5.14][i],{duration:.44,y:30,mask:true});M.reveal($('citationWrap'),t,5.67,{duration:.32,y:30});
 M.pose($('citation'));$('citation').style.boxShadow='none';$('citation').style.background='#701C74';
 if(t>=8.10){const f=p(t,8.1,.44,'inOut');const center=layout();$('camera').style.transformOrigin=`${center.x}px ${center.y}px`;M.pose($('camera'),{x:(540-center.x)*.18*f,y:(910-center.y)*.18*f,scale:1+.1*f});
 const press=t>=8.54&&t<8.70?Math.sin(c((t-8.54)/.16)*Math.PI):0;M.pose($('citation'),{scale:1-.06*press});const glow=p(t,8.50,.4,'in');$('citation').style.boxShadow=`0 0 0 ${3+glow*4}px #26DE00,0 0 ${25+glow*80}px #b334ffaa,0 0 ${40+glow*120}px #26de0077`;
 if(t>=8.68){const zoom=p(t,8.68,.72,'in');M.pose($('camera'),{x:(540-center.x)*(.18+.82*zoom),y:(925-center.y)*(.18+.82*zoom),scale:1.1+13*zoom,rz:2*zoom,alpha:1-p(t,9.25,.17)});$('portalHalo').style.opacity=String(p(t,8.8,.48));$('portalHalo').style.transform=`scale(${.2+6*zoom}) rotate(${zoom*35}deg)`;
 $('flare').style.opacity=String(p(t,9.08,.20,'in')*(1-p(t,9.3,.17)));}
 }
 }
 // Existing flight remains at original speed. Layer is already running under the light reveal.
 if(t>=9.28&&t<14.82){$('flight').style.opacity=String(p(t,9.28,.14));$('sky').style.opacity='0';$('skyNear').style.opacity='0';$('portalHalo').style.opacity=String(1-p(t,9.28,.15));$('flare').style.opacity=String(.9*(1-p(t,9.28,.20)));}
 if(t>=14.55&&t<15.2){const u=p(t,14.55,.65,'inOut');$('cloudWipe').style.opacity=String(Math.sin(Math.PI*u)*.85);$('cloudWipe').style.transform=`translateX(${-100+200*u}%) scale(1.8)`;}
 if(t>=14.75&&t<26){
 if(t<17.8){show('year',true);const u=t-14.75;M.pose($('camera'),{x:-150*(1-p(u,0,.7)),y:45*(1-p(u,0,.7)),ry:-28*(1-p(u,0,.9)),rx:3*(1-p(u,0,.6)),scale:.95+.05*p(u,0,.9)});M.reveal($('yearTop'),u,.06,{duration:.48,y:80,mask:true});M.reveal($('yearBottom'),u,.28,{duration:.6,y:110,z:150,rx:-15,mask:true});if(t>17.6)M.pose($('year'),{x:-130*p(t,17.6,.2,'in'),alpha:1-p(t,17.6,.2)})}
 else if(t<20.6){show('proof',true);const u=t-17.8,fly=p(u,0,.45,'out');M.pose($('plus'),{x:-350*(1-fly),y:-240*Math.sin((1-fly)*Math.PI*.65),z:350*(1-fly),rz:-100*(1-fly),scale:1+.6*(1-fly),alpha:c(u/.05)});M.reveal($('number'),t,18.28,{duration:.35,x:95,y:0,ry:-15,mask:true});M.reveal($('pieces'),t,18.54,{duration:.32,y:65,mask:true});M.pose($('camera'),{ry:6*(1-p(u,.2,.6)),x:15*(1-p(u,.2,.6))});if(t>20.4)M.pose($('proof'),{y:-80*p(t,20.4,.2,'in'),alpha:1-p(t,20.4,.2)})}
 else if(t<24.3){show('news',true);const u=t-20.6;M.pose($('camera'),{rx:18*(1-p(u,0,1.05)),ry:22*(1-p(u,0,1.05)),y:-55*(1-p(u,0,.8)),x:-55*(1-p(u,0,.8))});M.reveal($('intro'),t,20.64,{duration:.35,y:45,mask:true});M.reveal($('agency'),t,20.95,{duration:.4,y:70,mask:true});M.reveal($('seo'),t,21.32,{duration:.45,y:105,z:100,mask:true});if(t>24.12)M.pose($('news'),{z:-150*p(t,24.12,.18),alpha:1-p(t,24.12,.18)})}
 else{show('thanks',true);const u=t-24.3;M.reveal($('thanks'),t,24.3,{duration:.45,y:60,z:170});M.pose($('camera'),{scale:1.03-.03*p(u,0,1.5),ry:-7*(1-p(u,0,.6))})}
 }
 if(t>=26){$('closing').style.display='block';const b=p(t,27.6,.8,'inOut');$('closing').style.background=`rgb(${[2,42,78].map((v,i)=>Math.round(v+([112,28,116][i]-v)*b)).join(',')})`;M.pose($('brandrow'),{y:15*(1-p(t,26,.22)),alpha:p(t,26,.18)});M.pose($('url'),{alpha:p(t,26.06,.22),y:16*(1-p(t,26.06,.22))})}
 window.currentSkyTime=t;return{time:t,rig:t<1.5?'B':t<3.7?'C':t<9.28?'A':t<12.2?'A':t<12.6?'B':t<14.82?'C':t<17.8?'B→A':t<20.6?'A':t<24.3?'C→A':'A'};
}
window.frame=frame;window.seekFrame=async t=>{const video=$('flight');if(t>=9.28&&t<14.82){const vtime=Math.max(0,t-9.28);if(Math.abs(video.currentTime-vtime)>.0001){await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=vtime})}}return frame(t)};
frame(0);
})();
