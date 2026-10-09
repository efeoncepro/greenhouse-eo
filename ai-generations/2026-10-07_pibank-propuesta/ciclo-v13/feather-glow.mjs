// Lámina 22: el halo del tramo activo de la órbita salía recortado en un rectángulo detrás del ícono «Crear».
// Difumina el corte: dentro del rectángulo, mezcla hacia el fondo exterior según la distancia a cada borde cortado.
import sharp from 'sharp'
const [inp,out]=process.argv.slice(2)
const {data,info}=await sharp(inp).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width
const X0=1626,Y0=531,X1=1676,Y1=580,F=18
const g=(x,y,c)=>data[(y*W+x)*3+c]
const orig=Buffer.from(data)
const og=(x,y,c)=>orig[(y*W+x)*3+c]
const ss=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
let n=0
for(let y=Y0;y<Y1;y++)for(let x=X0;x<X1;x++){
 if(x<1642?og(x,y,1)>120:og(x,y,0)>90)continue // arco brillante (a la izquierda) e ícono
 const dl=x-X0,dt=y-Y0,db=Y1-1-y,dr=X1-1-x
 const w=ss(Math.min(dl,dt*0.6,db,dr*2)/F)
 // fondo exterior: interpolado entre la columna izquierda y la fila superior/inferior fuera del rectángulo
 const L=[0,1,2].map(c=>og(X0-3,y,c)),T=[0,1,2].map(c=>og(x,Y0-3,c)),B=[0,1,2].map(c=>og(x,Y1+2,c))
 const wl=1/(dl+1),wt=1/(dt+1),wb=1/(db+1),s=wl+wt+wb
 for(let c=0;c<3;c++){const bg=(L[c]*wl+T[c]*wt+B[c]*wb)/s;const v=og(x,y,c);data[(y*W+x)*3+c]=Math.round(bg+(v-bg)*w)}
 n++}
await sharp(data,{raw:info}).png().toFile(out);console.log('px',n)
