import Queue, { Job } from 'bull';
import { ObjectId } from 'mongodb';
import path from 'path';
import fs from 'fs';
import thumbnail from 'image-thumbnail';
import DBClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (Job, done) => {
  const { fileId, userId } = Job.data;
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }
  const image = await DBClient.fileCollection.findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  });
  if (!image) {
    throw new Error('File not found');
  }
  const sizes = [500, 250, 100];
  const imagePath = image.localPath;
  for (const size of sizes) {
    const opt = { width: size };
    const thumb = await thumbnail(imagePath, opt);
    const thumbnailPath = path.join(path.dirname(localPath), `${path.basename(localPath)}_${size}`);
  }
});
