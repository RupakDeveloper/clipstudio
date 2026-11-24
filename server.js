import express from 'express';
import multer from 'multer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
app.use(express.static('public'));
app.post('/export', upload.single('video'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('Please upload a video file.');
  const start = Number(req.body.start || 0), end = Number(req.body.end || 0);
  const height = Number(req.body.height || 1440);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || ![720,1080,1440,2160].includes(height)) {
    fs.rmSync(file.path, {force:true}); return res.status(400).send('Invalid trim time or resolution.');
  }
  const output = path.join('uploads', `${file.filename}_export.mp4`);
  const ff = spawn('ffmpeg', ['-y','-ss',String(start),'-i',file.path,'-t',String(end-start),'-vf',`scale=-2:${height}:flags=lanczos`,'-c:v','libx264','-preset','medium','-crf','18','-c:a','aac','-b:a','192k','-movflags','+faststart',output]);
  let error = '';
  ff.stderr.on('data', d => error += d.toString());
  ff.on('close', code => {
    fs.rmSync(file.path,{force:true});
    if(code !== 0){ fs.rmSync(output,{force:true}); return res.status(500).send('Export failed. Check FFmpeg installation and the video file.'); }
    res.download(output, `clip-${height}p.mp4`, () => fs.rmSync(output,{force:true}));
  });
});
app.listen(3000, () => console.log('Clip Studio running at http://localhost:3000'));
