from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
import json, zipfile
p=Path(__file__).resolve().parent
pdfmetrics.registerFont(TTFont('Poppins','/Users/jreye/Library/Fonts/Poppins-Regular.ttf'))
pdfmetrics.registerFont(TTFont('PoppinsSemi','/Users/jreye/Library/Fonts/Poppins-SemiBold.ttf'))
c=canvas.Canvas(str(p/'revision-efeonce-v3.pdf'),pagesize=(1200,900))
c.setTitle('Efeonce — Enlace / propuesta 03')
c.setAuthor('Efeonce')
sections=json.loads((p/'sections.json').read_text())
for i,(file,kicker,title,desc) in enumerate(sections):
    c.setFillColor(HexColor('#023C70'));c.setFont('Poppins',10);c.drawString(40,870,kicker.upper()+'  /  EFEONCE')
    c.setFont('PoppinsSemi',25);c.drawString(40,826,title)
    words=desc.split();lines=[];line=''
    for w in words:
        if pdfmetrics.stringWidth(line+' '+w,'Poppins',11)>1110:
            lines.append(line);line=w
        else:line=(line+' '+w).strip()
    lines.append(line)
    c.setFont('Poppins',11)
    for n,s in enumerate(lines):c.drawString(40,799-n*17,s)
    reader=ImageReader(str(p/file));iw,ih=reader.getSize();scale=min(1120/iw,712/ih);w,h=iw*scale,ih*scale
    c.drawImage(reader,(1200-w)/2,48+(712-h)/2,width=w,height=h,mask='auto')
    c.setFillColor(HexColor('#526573'));c.setFont('Poppins',9);c.drawString(40,23,'Propuesta 03 para aprobación · Referencias visuales · Septiembre 2026');c.drawRightString(1160,23,f'{i+1:02d} / {len(sections):02d}')
    c.showPage()
c.save()
with zipfile.ZipFile(p/'referencias-efeonce-v3.zip','w',zipfile.ZIP_DEFLATED) as z:
    for folder in ['individuales','art','pruebas']:
        for f in sorted((p/folder).glob('*')):
            if f.is_file():z.write(f,str(f.relative_to(p)))
    for file in ['README.md','manifest.json','VALIDACION.md']:
        z.write(p/file,file)
print('PDF: 9 páginas. ZIP: 28 vistas, artes, estímulos y notas.')
