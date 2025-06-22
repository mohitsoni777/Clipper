// const express = require('express');
// const multer = require('multer');
// const ffmpeg = require('fluent-ffmpeg');
// const fs = require('fs');
// const path = require('path');
// const cors = require('cors');

// const app = express();
// const port = 3000;

// const fileTimestamps = [];

// app.use(cors());
// app.use(express.static('public'));
// app.use('/output', express.static('output'));

// // Multer config
// const storage = multer.diskStorage({
//   destination: (_, __, cb) => cb(null, 'uploads'),
//   filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
// });
// const upload = multer({ storage });

// // Serve the UI
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// // Upload & clip API
// app.post('/clip', upload.single('video'), (req, res) => {
//   const filePath = req.file.path;
//   const duration = parseInt(req.body.duration) || 10;
//   const outputDir = `output/${Date.now()}`;
//   const absOutputDir = path.join(__dirname, outputDir);

//   fs.mkdirSync(absOutputDir, { recursive: true });

//   ffmpeg(filePath)
//     .outputOptions([
//       '-f', 'segment',
//       `-segment_time`, `${duration}`,
//       '-reset_timestamps', '1',
//       '-c', 'copy',
//     ])
//     .output(`${absOutputDir}/clip%03d.mp4`)
//     .on('end', () => {
//       const clips = fs.readdirSync(absOutputDir)
//         .filter(f => f.endsWith('.mp4'))
//         .map(f => `${req.protocol}://${req.get('host')}/${outputDir}/${f}`);

//       fileTimestamps.push({
//         input: filePath,
//         outputDir: absOutputDir,
//         createdAt: Date.now(),
//       });

//       res.json({ clips });
//     })
//     .on('error', err => {
//       console.error('FFmpeg error:', err);
//       res.status(500).json({ error: 'Video processing failed' });
//     })
//     .run();
// });

// // Cleanup: delete files older than 24 hours
// function cleanOldFiles() {
//   const now = Date.now();
//   const cutoff = now - 24 * 60 * 60 * 1000; // 24 hours

//   for (let i = fileTimestamps.length - 1; i >= 0; i--) {
//     const file = fileTimestamps[i];
//     if (file.createdAt < cutoff) {
//       try {
//         if (fs.existsSync(file.input)) fs.unlinkSync(file.input);
//         if (fs.existsSync(file.outputDir)) fs.rmSync(file.outputDir, { recursive: true, force: true });
//         console.log('🧹 Deleted expired files:', file.input, file.outputDir);
//         fileTimestamps.splice(i, 1);
//       } catch (err) {
//         console.error('Cleanup error:', err);
//       }
//     }
//   }
// }

// // Run cleanup every hour
// setInterval(cleanOldFiles, 60 * 60 * 1000);

// app.listen(port, () => {
//   console.log(`🚀 Server running at http://localhost:${port}`);
// });
// const express = require('express');
// const multer = require('multer');
// const ffmpeg = require('fluent-ffmpeg');
// const ffmpegPath = require('ffmpeg-static');
// const fs = require('fs');
// const path = require('path');
// const cors = require('cors');

// const app = express();
// const port = process.env.PORT || 3000;

// // FFmpeg path for Render
// ffmpeg.setFfmpegPath(ffmpegPath);

// // CORS and static files
// app.use(cors());
// app.use(express.static('public'));
// app.use('/output', express.static('output'));

// // Ensure folders exist
// ['uploads', 'output'].forEach(dir => {
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir);
//     console.log(`📂 Created missing folder: ${dir}`);
//   }
// });

// // In-memory file tracking
// const fileTimestamps = [];

// // Multer setup
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads');
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = Date.now() + '-' + file.originalname;
//     console.log(`📁 Receiving upload: ${uniqueName}`);
//     cb(null, uniqueName);
//   }
// });
// const upload = multer({ storage });

// // Serve the UI
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// // Upload & clip route
// app.post('/clip', upload.single('video'), async (req, res) => {
//   if (!req.file) {
//     console.error('❌ No video file received.');
//     return res.status(400).json({ error: 'No video uploaded' });
//   }

//   const inputFile = req.file.path;
//   const duration = parseInt(req.body.duration) || 10;
//   const outputFolderName = `output/${Date.now()}`;
//   const outputDir = path.join(__dirname, outputFolderName);

//   if (!fs.existsSync(inputFile)) {
//     console.error(`❌ Uploaded file not found: ${inputFile}`);
//     return res.status(404).json({ error: 'Uploaded file missing on server' });
//   }

//   try {
//     console.log(`🎬 Processing video: ${inputFile} | Duration: ${duration}s`);

//     fs.mkdirSync(outputDir, { recursive: true });

//     ffmpeg(inputFile)
//       .outputOptions([
//         '-f', 'segment',
//         `-segment_time`, `${duration}`,
//         '-reset_timestamps', '1',
//         '-c', 'copy'
//       ])
//       .output(`${outputDir}/clip%03d.mp4`)
//       .on('start', (cmdLine) => {
//         console.log(`🚀 FFmpeg started: ${cmdLine}`);
//       })
//       .on('end', () => {
//         console.log(`✅ FFmpeg finished for: ${inputFile}`);

//         const files = fs.readdirSync(outputDir)
//           .filter(f => f.endsWith('.mp4'))
//           .map(f => `${req.protocol}://${req.get('host')}/${outputFolderName}/${f}`);

//         console.log(`🎞️ Generated clips: ${files.join(', ')}`);

//         fileTimestamps.push({
//           input: inputFile,
//           outputDir,
//           createdAt: Date.now(),
//         });

//         res.json({ clips: files });
//       })
//       .on('error', (err) => {
//         console.error(`❌ FFmpeg error:`, err.message);
//         res.status(500).json({ error: 'FFmpeg processing failed' });
//       })
//       .run();
//   } catch (error) {
//     console.error(`❌ Unexpected error:`, error.message);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Cleanup old files (older than 24h)
// function cleanOldFiles() {
//   const now = Date.now();
//   const cutoff = now - 24 * 60 * 60 * 1000;

//   for (let i = fileTimestamps.length - 1; i >= 0; i--) {
//     const file = fileTimestamps[i];
//     if (file.createdAt < cutoff) {
//       try {
//         if (fs.existsSync(file.input)) {
//           fs.unlinkSync(file.input);
//           console.log(`🧹 Deleted old input: ${file.input}`);
//         }
//         if (fs.existsSync(file.outputDir)) {
//           fs.rmSync(file.outputDir, { recursive: true, force: true });
//           console.log(`🧹 Deleted old output: ${file.outputDir}`);
//         }
//         fileTimestamps.splice(i, 1);
//       } catch (err) {
//         console.error('🛑 Cleanup error:', err.message);
//       }
//     }
//   }
// }

// // Run cleanup every hour
// setInterval(cleanOldFiles, 60 * 60 * 1000);

// app.listen(port, () => {
//   console.log(`🌐 Server is running on http://localhost:${port}`);
// });
const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Resolve and set FFmpeg binary path
const resolvedFFmpegPath = fs.realpathSync(ffmpegStatic);
ffmpeg.setFfmpegPath(resolvedFFmpegPath);
console.log("🔧 FFmpeg binary path:", resolvedFFmpegPath);

try {
  fs.accessSync(resolvedFFmpegPath, fs.constants.X_OK);
  console.log("✅ FFmpeg binary is executable.");
} catch (err) {
  console.error("🚫 FFmpeg binary is NOT executable:", err.message);
}

// Middleware setup
app.use(cors());
app.use(express.static('public'));
app.use('/output', express.static('output'));

// Ensure required folders exist
['uploads', 'output'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`📂 Created missing folder: ${dir}`);
  }
});

const fileTimestamps = [];

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    console.log(`📁 Receiving upload: ${uniqueName}`);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Serve the frontend UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Video upload and clip route
app.post('/clip', upload.single('video'), async (req, res) => {
  if (!req.file) {
    console.error('❌ No video file received.');
    return res.status(400).json({ error: 'No video uploaded' });
  }

  const inputFile = req.file.path;
  const duration = parseInt(req.body.duration) || 10;
  const outputFolderName = `output/${Date.now()}`;
  const outputDir = path.join(__dirname, outputFolderName);

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Uploaded file not found: ${inputFile}`);
    return res.status(404).json({ error: 'Uploaded file missing on server' });
  }

  try {
    console.log(`🎬 Processing video: ${inputFile} | Duration: ${duration}s`);

    fs.mkdirSync(outputDir, { recursive: true });

    ffmpeg(inputFile)
      .outputOptions([
        '-f', 'segment',
        `-segment_time`, `${duration}`,
        '-reset_timestamps', '1',
        '-c', 'copy'
      ])
      .output(`${outputDir}/clip%03d.mp4`)
      .on('start', (cmdLine) => {
        console.log(`🚀 FFmpeg started: ${cmdLine}`);
      })
      .on('end', () => {
        console.log(`✅ FFmpeg finished for: ${inputFile}`);

        const files = fs.readdirSync(outputDir)
          .filter(f => f.endsWith('.mp4'))
          .map(f => `${req.protocol}://${req.get('host')}/${outputFolderName}/${f}`);

        console.log(`🎞️ Generated clips: ${files.join(', ')}`);

        fileTimestamps.push({
          input: inputFile,
          outputDir,
          createdAt: Date.now(),
        });

        res.json({ clips: files });
      })
      .on('error', (err) => {
        console.error(`❌ FFmpeg error:`, err.message);
        res.status(500).json({ error: 'FFmpeg processing failed' });
      })
      .run();
  } catch (error) {
    console.error(`❌ Unexpected error:`, error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup task: deletes files older than 24 hours
function cleanOldFiles() {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;

  for (let i = fileTimestamps.length - 1; i >= 0; i--) {
    const file = fileTimestamps[i];
    if (file.createdAt < cutoff) {
      try {
        if (fs.existsSync(file.input)) {
          fs.unlinkSync(file.input);
          console.log(`🧹 Deleted old input: ${file.input}`);
        }
        if (fs.existsSync(file.outputDir)) {
          fs.rmSync(file.outputDir, { recursive: true, force: true });
          console.log(`🧹 Deleted old output: ${file.outputDir}`);
        }
        fileTimestamps.splice(i, 1);
      } catch (err) {
        console.error('🛑 Cleanup error:', err.message);
      }
    }
  }
}

setInterval(cleanOldFiles, 60 * 60 * 1000); // run every 1 hour

// Start server
app.listen(port, () => {
  console.log(`🌐 Server is running on http://localhost:${port}`);
});
