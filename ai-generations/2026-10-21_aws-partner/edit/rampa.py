import sys, os
# Mapa PCHIP (Fritsch-Carlson) tiempo de salida -> tiempo de fuente; desenfoque de obturador con K muestras a 96 fps
def pchip(xs, ys):
    n=len(xs); h=[xs[i+1]-xs[i] for i in range(n-1)]; d=[(ys[i+1]-ys[i])/h[i] for i in range(n-1)]
    m=[0]*n; m[0]=d[0]; m[-1]=d[-1]
    for i in range(1,n-1):
        m[i]=0 if d[i-1]*d[i]<=0 else 3*(h[i-1]+h[i])/((2*h[i]+h[i-1])/d[i-1]+(h[i]+2*h[i-1])/d[i])
    def f(x):
        i=max(0,min(n-2,max(k for k in range(n-1) if xs[k]<=x) if x>=xs[0] else 0)); t=(x-xs[i])/h[i]
        h00=2*t**3-3*t**2+1; h10=t**3-2*t**2+t; h01=-2*t**3+3*t**2; h11=t**3-t**2
        return h00*ys[i]+h10*h[i]*m[i]+h01*ys[i+1]+h11*h[i]*m[i+1]
    return f
seg, keys, nout, nsrc = sys.argv[1], eval(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
xs=[k[0] for k in keys]; ys=[k[1] for k in keys]; f=pchip(xs,ys); K=4; shutter=0.5
lines=[]
for i in range(nout):
    t=i/24; s=f(t); s2=f(min(xs[-1],t+1/24)); speed=max(0,(s2-s)*24)
    span=shutter*speed/24  # segundos de fuente cubiertos por el obturador
    for k in range(K):
        ss=s-span*(K-1-k)/(K-1)
        idx=min(nsrc,max(1,int(round(ss*96))+1))
        lines.append(f"file 'i96-{seg}/f{idx:05d}.jpg'\nduration {1/96:.6f}")
open(f'lista-{seg}.txt','w').write('\n'.join(lines)+'\n')
print(seg, 'velocidad inicial %.2fx, final %.2fx' % ((f(1/24)-f(0))*24, (f(xs[-1])-f(xs[-1]-1/24))*24))
