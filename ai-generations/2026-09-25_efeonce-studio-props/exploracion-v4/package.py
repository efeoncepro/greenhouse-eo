from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import zipfile,json
p=Path(__file__).parent
names=['00-comparacion','01-a-ruta','01-a-objetos','02-b-ruta','02-b-objetos','03-c-ruta','03-c-objetos','04-colores-encuentro','05-acrilico','06-materia']
c=canvas.Canvas(str(p/'revision-efeonce-v4.pdf'),pagesize=(1200,840))
c.setTitle('Efeonce · Exploración gráfica 04')
c.setAuthor('Efeonce · Estudio de diseño')
for n in names:
 im=Image.open(p/(n+'.png'));w,h=im.size
 ph=1200*h/w;c.setPageSize((1200,ph));c.drawImage(ImageReader(im),0,0,width=1200,height=ph);c.showPage()
c.save()
files=list(p.glob('*.svg'))+list((p/'art').glob('*'))+list((p/'vistas').glob('*'))+[p/'README.md',p/'BRIEF.md',p/'build.mjs',p/'types.mjs',p/'FEEDBACK-ABIERTO.md']
with zipfile.ZipFile(p/'fuentes-efeonce-v4.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in files:z.write(f,f.relative_to(p))
manifest={'status':'open_not_approved','recommended_for_development':None,'selected_route':None,'operator_feedback':'../FEEDBACK-ABIERTO.md','retained_preferences':['low_logo_with_space','words_using_mug_surface','agenda_word_field_with_one_emphasis_as_exploration','outline_words_filled_inside_circle'],'unresolved':['word_field_pattern_execution','overall_graphic_line'],'approval':False,'brand_lift_measured':False,'format':'vector_concept_boards_and_schematic_views','photographic_generation':False,'pdf_pages':len(names),'individual_png_views':len(list((p/'vistas').glob('*.png'))),'routes':['a-memoria','b-encuentro','c-criterio'],'source_brief':'BRIEF.md','files':[n+'.png' for n in names]}
(p/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'pdf_pages':len(names),'views':manifest['individual_png_views'],'zip_files':len(files)},ensure_ascii=False))
