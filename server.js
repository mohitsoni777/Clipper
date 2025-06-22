const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

const fileTimestamps = [];

app.use(cors());
app.use(express.static('public'));
app.use('/output', express.static('output'));

// Multer config
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads'),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Serve the UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload & clip API
app.post('/clip', upload.single('video'), (req, res) => {
  const filePath = req.file.path;
  const duration = parseInt(req.body.duration) || 10;
  const outputDir = `output/${Date.now()}`;
  const absOutputDir = path.join(__dirname, outputDir);

  fs.mkdirSync(absOutputDir, { recursive: true });

  ffmpeg(filePath)
    .outputOptions([
      '-f', 'segment',
      `-segment_time`, `${duration}`,
      '-reset_timestamps', '1',
      '-c', 'copy',
    ])
    .output(`${absOutputDir}/clip%03d.mp4`)
    .on('end', () => {
      const clips = fs.readdirSync(absOutputDir)
        .filter(f => f.endsWith('.mp4'))
        .map(f => `${req.protocol}://${req.get('host')}/${outputDir}/${f}`);

      fileTimestamps.push({
        input: filePath,
        outputDir: absOutputDir,
        createdAt: Date.now(),
      });

      res.json({ clips });
    })
    .on('error', err => {
      console.error('FFmpeg error:', err);
      res.status(500).json({ error: 'Video processing failed' });
    })
    .run();
});

// Cleanup: delete files older than 24 hours
function cleanOldFiles() {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000; // 24 hours

  for (let i = fileTimestamps.length - 1; i >= 0; i--) {
    const file = fileTimestamps[i];
    if (file.createdAt < cutoff) {
      try {
        if (fs.existsSync(file.input)) fs.unlinkSync(file.input);
        if (fs.existsSync(file.outputDir)) fs.rmSync(file.outputDir, { recursive: true, force: true });
        console.log('🧹 Deleted expired files:', file.input, file.outputDir);
        fileTimestamps.splice(i, 1);
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
  }
}

// Run cleanup every hour
setInterval(cleanOldFiles, 60 * 60 * 1000);

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
