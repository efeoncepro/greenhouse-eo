// Run only after visual review accepts the generated plate. Changes foreground titles only.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import sharp from 'sharp';
import { compositeLuminosity } from '../../../../scripts/creative/layout-compiler/compiler.mjs';

const D = path.dirname(new URL(import.meta.url).pathname);
const approved = path.resolve(D, '../v10-local');
const check = JSON.parse(fs.readFileSync(D + '/qa/picture-review.json'));
if (check.acceptForTitleComposition !== true) throw Error('Generated plate has not passed visual review');
const source = D + '/sky-v12-picture-conformed.mp4';
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if (check.sourceSha256 !== sha(source)) throw Error('Review belongs to another plate');
const approval = JSON.parse(fs.readFileSync(approved + '/approval-punch-v3.json'));
for (const [file, hash] of Object.entries(approval.files)) {
  if (sha(approved + '/' + file) !== hash) throw Error('Approved asset changed: ' + file);
}
const meta = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', source]));
const v = meta.streams.find(s => s.codec_type === 'video');
if (v.width !== 1080 || v.height !== 1920 || v.r_frame_rate !== '24/1' || +meta.format.duration < 30) throw Error('Plate requires explicit conform review');
const bubbleDir = D + '/qa/bubble-alpha';
fs.mkdirSync(bubbleDir, { recursive: true });
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', approved + '/url-bubble-luminosidad-alpha.mov', '-vf', 'crop=620:160:230:1215', '-frames:v', '96', bubbleDir + '/frame-%03d.png']);
const output = D + '/sky-v12-picture-final.mp4';
if (fs.existsSync(output)) throw Error('Output exists; preserve existing review version');
const decoder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', source, '-i', approved + '/titulos-y-firma-alpha.mov', '-filter_complex', '[0:v]trim=duration=30,setpts=PTS-STARTPTS[base];[1:v]setpts=PTS-STARTPTS+15.75/TB[title];[base][title]overlay=eof_action=pass:format=auto[out]', '-map', '[out]', '-an', '-frames:v', '720', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], { stdio: ['ignore', 'pipe', 'inherit'] });
const encoder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '1080x1920', '-framerate', '24', '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output], { stdio: ['pipe', 'ignore', 'inherit'] });
const decoderDone = once(decoder, 'close'), encoderDone = once(encoder, 'close');
const frameSize = 1080 * 1920 * 4;
let frame = Buffer.allocUnsafe(frameSize), filled = 0, index = 0;
const samples = [];
for await (const chunk of decoder.stdout) {
  let offset = 0;
  while (offset < chunk.length) {
    const take = Math.min(frameSize - filled, chunk.length - offset);
    chunk.copy(frame, filled, offset, offset + take); filled += take; offset += take;
    if (filled !== frameSize) continue;
    let pixels = frame;
    if (index >= 624) {
      const backdropBytes = await sharp(frame, { raw: { width: 1080, height: 1920, channels: 4 } }).png().toBuffer();
      const sourceBytes = fs.readFileSync(bubbleDir + '/frame-' + String(index - 623).padStart(3, '0') + '.png');
      const mixed = await compositeLuminosity({ backdropBytes, sourceBytes, left: 230, top: 1215, width: 620, opacity: 1 });
      pixels = await sharp(mixed.output).ensureAlpha().raw().toBuffer();
      if ([624, 630, 648, 684, 719].includes(index)) samples.push({ frame: index, ...mixed.evidence });
    }
    if (!encoder.stdin.write(pixels)) await once(encoder.stdin, 'drain');
    index++; filled = 0; frame = Buffer.allocUnsafe(frameSize);
    if (index % 120 === 0) console.log('Composed ' + index + '/720');
  }
}
encoder.stdin.end();
const codes = await Promise.all([decoderDone, encoderDone]);
if (codes.some(c => c[0] !== 0) || index !== 720 || filled) throw Error('Incomplete encode');
fs.writeFileSync(D + '/qa/composition.json', JSON.stringify({ sourceSha256: sha(source), outputSha256: sha(output), frames: index, titleOffset: 15.75, urlOffset: 26, urlMode: 'non-separable-luminosity', opacity: '1 on approved alpha containing original .72 and fade', audio: false, approvedSourceHashesVerified: true, samples, review: 'pending' }, null, 2));
console.log('Silent picture composite exported for review');
