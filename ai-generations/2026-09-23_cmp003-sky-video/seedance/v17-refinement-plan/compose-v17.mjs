import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import sharp from 'sharp';
import {compositeLuminosity} from '../../../../scripts/creative/layout-compiler/compiler.mjs';
const D=path.dirname(new URL(import.meta.url).pathname), V16=path.resolve(D,'../v16-brand-repair'), approved=path.resolve(D,'../v10-local');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const approval=JSON.parse(fs.readFileSync(approved+'/approval-punch-v3.json'));
for(const [p,h] of Object.entries(approval.files)) if(sha(approved+'/'+p)!==h) throw Error('Approved source changed: '+p);
const source=V16+'/topaz-full-4k.mp4', bubbleDir=path.resolve(D,'../v14-finish/qa/bubble-alpha');
const outputs=['4k','1080p'].map(s=>D+'/sky-v17-restored-'+s+'.mp4');
for(const o of outputs) if(fs.existsSync(o)) throw Error('Preserve existing output: '+o);
const frameMap=[...Array(144).keys(),...Array.from({length:60},(_,i)=>144+Math.round(i*71/59)),...Array.from({length:504},(_,i)=>216+i)];
if(frameMap.length!==708||new Set(frameMap).size!==708||frameMap.at(-1)!==719) throw Error('Invalid frame map');
const selected=new Set(frameMap);
const filter='[0:v]trim=duration=26,setpts=PTS-STARTPTS,setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=limited,scale=in_color_matrix=bt709:out_range=pc,format=rgb24[restored];[1:v]trim=start=26:end=30,setpts=PTS-STARTPTS,scale=2160:3840:flags=lanczos,format=rgb24[tail];[restored][tail]concat=n=2:v=1:a=0[base];[2:v]trim=end=10.25,scale=2160:3840:flags=lanczos,format=rgba,fade=t=out:st=9.60:d=0.65:alpha=1,setpts=PTS+15.75/TB[title];[3:v]format=rgba,setpts=PTS+26/TB[closing];[base][title]overlay=eof_action=pass:format=rgb[a];[a][closing]overlay=eof_action=pass:enable=gte(t\\,26):format=rgb[out]';
const decoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-filter_complex_threads','2','-i',source,'-i',path.resolve(D,'../v15-review/picture-lossless.mkv'),'-i',approved+'/titulos-y-firma-alpha.mov','-framerate','24','-i',D+'/closing-alpha/frame-%03d.png','-filter_complex',filter,'-map','[out]','-an','-frames:v','720','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{stdio:['ignore','pipe','inherit']});
const color=['-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0','-movflags','+faststart+write_colr'];
const options=(label,out,crf)=>['-map',label,'-map','1:a:0','-frames:v','708','-t','29.5','-c:v','libx264','-crf',crf,'-preset','medium','-threads','4','-pix_fmt','yuv420p','-c:a','aac','-b:a','320k','-ar','48000',...color,out];
const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-n','-filter_complex_threads','2','-f','rawvideo','-pixel_format','rgba','-video_size','2160x3840','-framerate','24','-i','pipe:0','-i',D+'/audio/master.wav','-filter_complex','[0:v]split=2[a][b];[a]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v4];[b]scale=1080:1920:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p[v1]',...options('[v4]',outputs[0],'15'),...options('[v1]',outputs[1],'14')],{stdio:['pipe','ignore','inherit']});
encoder.stdin.on('error',e=>{console.error(e.message);decoder.kill();});
const dDone=once(decoder,'close'),eDone=once(encoder,'close');
const size=2160*3840*4;let frame=Buffer.allocUnsafe(size),filled=0,index=0,written=0;const samples=[];
for await(const chunk of decoder.stdout){let offset=0;while(offset<chunk.length){const take=Math.min(size-filled,chunk.length-offset);chunk.copy(frame,filled,offset,offset+take);filled+=take;offset+=take;if(filled!==size)continue;
 if(selected.has(index)){
  let pixels=frame;
  if(index>=624){
   const backdropBytes=await sharp(frame,{raw:{width:2160,height:3840,channels:4}}).png().toBuffer();
   const sourceBytes=await sharp(fs.readFileSync(bubbleDir+'/frame-'+String(index-623).padStart(3,'0')+'.png')).resize({width:640}).png().toBuffer();
   const mixed=await compositeLuminosity({backdropBytes,sourceBytes,left:760,top:2490,width:640,opacity:1});
   pixels=await sharp(mixed.output).ensureAlpha().raw().toBuffer();
   if([624,630,648,684,719].includes(index))samples.push({sourceFrame:index,outputFrame:written,...mixed.evidence});
  }
  if(!encoder.stdin.write(pixels))await once(encoder.stdin,'drain'); written++;
 }
 index++;filled=0;frame=Buffer.allocUnsafe(size);
 if(index%120===0)console.log('Source '+index+'/720; output '+written+'/708');
}}
encoder.stdin.end();const codes=await Promise.all([dDone,eDone]);if(codes.some(c=>c[0]!==0)||index!==720||written!==708||filled)throw Error('Incomplete render');
execFileSync('python3',[D+'/finalize-color.py'],{stdio:'inherit'});
fs.writeFileSync(D+'/qa/composition.json',JSON.stringify({source,sourceSha256:sha(source),frames:written,duration:29.5,fps:24,sourceFrames:frameMap,approvedSourceHashesVerified:true,titleOffset:15.25,closingOffset:25.5,logoSha256:sha(D+'/sky-white-separated.svg'),urlWidth4K:640,urlMode:'non-separable-luminosity',paidCalls:0,outputs:outputs.map(p=>({path:p,sha256:sha(p)})),samples},null,2));
console.log('Both exports completed from the same uncompressed composition');
