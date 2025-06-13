const { spawn } = require('child_process');
require('dotenv').config();

const videoUrl = process.argv[2];
const streamKey = process.argv[3];

if (!videoUrl || !streamKey) {
  console.error("Missing arguments: videoUrl or streamKey");
  process.exit(1);
}

const rtmpUrl = `${process.env.YOUTUBE_RTMP_BASE}${streamKey}`;

const ffmpegArgs = [
  '-re',
  '-stream_loop', '-1',   
  '-i', videoUrl,
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-maxrate', '3000k',
  '-bufsize', '6000k',
  '-pix_fmt', 'yuv420p',
  '-g', '50',
  '-c:a', 'aac',
  '-b:a', '160k',
  '-ar', '44100',
  '-f', 'flv',
  rtmpUrl,
];

const ffmpeg = spawn('ffmpeg', ffmpegArgs);

ffmpeg.stdout.on('data', (data) => {
  console.log(`FFmpeg stdout: ${data}`);
});

ffmpeg.stderr.on('data', (data) => {
  console.error(`FFmpeg stderr: ${data}`);
});

ffmpeg.on('close', (code) => {
  console.log(`FFmpeg exited with code ${code}`);
});