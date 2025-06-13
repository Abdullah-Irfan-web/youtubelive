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
    acl: 'public-read',
    key: (req, file, cb) => {
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
  }),
});

app.post('/upload', upload.single('video'), (req, res) => {
  const videoUrl = req.file.location;
  const { streamKey, userId } = req.body;

  if (!streamKey || !userId) {
    return res.status(400).json({ error: 'Missing streamKey or userId' });
  }

  const streamName = `stream-${userId}-${Date.now()}`;
  const command = `pm2 start streamer.js --name "${streamName}" -- ${videoUrl} ${streamKey}`;

  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error('Error running stream:', stderr);
      return res.status(500).json({ error: 'Failed to start streaming' });
    }

    console.log(`Started stream for user ${userId}`);
    return res.json({
      message: 'Streaming started',
      videoUrl,
      userId,
      streamName,
    });
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
