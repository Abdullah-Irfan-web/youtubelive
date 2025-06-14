require('dotenv').config();
const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const { exec } = require('child_process');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// AWS SDK auto-uses IAM role, no need to pass accessKeyId/secret
const s3 = new AWS.S3({ region: process.env.AWS_REGION });

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
   
    key: (req, file, cb) => {
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
  }),
});

const { exec } = require('child_process');

app.post('/upload', upload.single('video'), (req, res) => {
  const videoUrl = req.file.location;
  const { streamKey, userId } = req.body;

  if (!streamKey || !userId) {
    return res.status(400).json({ error: 'Missing streamKey or userId' });
  }

  const streamName = `stream-${userId}`;

  // Step 1: Delete the existing process if it exists
  exec(`pm2 delete ${streamName}`, (deleteErr) => {
    if (deleteErr) {
      console.log(`No existing stream found for ${streamName}, proceeding...`);
    } else {
      console.log(`Deleted existing stream: ${streamName}`);
    }

    // Step 2: Start the new stream forcibly
    const command = `pm2 start streamer.js --name "${streamName}" -- ${videoUrl} ${streamKey}`;

    exec(command, (startErr, stdout, stderr) => {
      if (startErr) {
        console.error('Failed to start stream:', stderr);
        return res.status(500).json({ error: 'Failed to start streaming' });
      }

      console.log(`Started new stream for user ${userId}`);
      return res.json({
        message: 'Streaming started',
        videoUrl,
        userId,
        streamName,
      });
    });
  });
});

app.post('/end', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const streamName = `stream-${userId}`;

 
  exec(`pm2 delete ${streamName}`, (err, stdout, stderr) => {
    if (err && !stderr.includes('process or namespace not found')) {
      console.error(`Error stopping stream for user ${userId}:`, stderr);
      return res.status(500).json({ error: 'Failed to stop the stream' });
    }

    console.log(`Stream stopped for user ${userId}`);
    return res.json({ message: `Stream stopped for user ${userId}` });
  });
});



app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
