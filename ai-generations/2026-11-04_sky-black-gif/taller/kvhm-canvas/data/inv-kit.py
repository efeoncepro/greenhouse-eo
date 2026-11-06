import os,re,subprocess
B=os.path.expanduser('~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base')
print('# Kit Despliegue Base (solo lectura)')
for root,ds,fs in os.walk(B):
    ds.sort()
    if 'ENTREGABLES BLACK' in root: continue
    rel=os.path.relpath(root,B)
    for f in sorted(fs):
        if f=='.DS_Store': continue
        p=os.path.join(root,f); info=''
        try:
            if f.lower().endswith('.svg'):
                h=open(p,'r',errors='ignore').read(3000)
                m=re.search(r'viewBox="([^"]+)"',h); info='viewBox '+(m.group(1) if m else '?')
            elif f.lower().endswith(('.png','.jpg','.jpeg')):
                o=subprocess.run(['sips','-g','pixelWidth','-g','pixelHeight',p],capture_output=True,text=True).stdout
                info='x'.join(re.findall(r'pixel\w+: (\d+)',o))
            elif f.lower().endswith(('.mp4','.mov','.gif','.wav','.mp3','.m4a')):
                o=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type,width,height,r_frame_rate','-show_entries','format=duration','-of','csv=p=0',p],capture_output=True,text=True).stdout
                info=o.replace('\n',';')
        except Exception as e: info='ERR '+str(e)
        print(f'{rel}/{f} | {info} | {os.path.getsize(p)}B')
