import { ObjectId } from 'mongodb';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import Queue from 'bull';
import redisClient from '../utils/redis';
import DBClient from '../utils/db';

const { v4: uuidv4 } = require('uuid');

const fileQueue = new Queue('fileQueue');

async function getUser(token) {
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (!userId) {
    return null;
  }
  let objectId;
  try {
    objectId = new ObjectId(userId);
  } catch (error) {
    return null;
  }
  const user = await DBClient.userCollection.findOne(
    { _id: objectId },
    { projection: { email: 1 } },
  );
  return user;
}

async function getFile(id) {
  let objectId;
  try {
    objectId = new ObjectId(id);
  } catch (error) {
    return null;
  }
  const file = await DBClient.fileCollection.findOne(
    { _id: objectId },
  );
  return file;
}

const decode64 = (data) => {
  const matches = data.match(/^data:.+;base64,(.+)$/);
  const dt = matches ? matches[1] : data;
  const buffer = Buffer.from(dt, 'base64');
  return buffer;
};
class FilesController {
  static async postUpload(req, resp) {
    const tkn = req.header('X-Token');
    const user = await getUser(tkn);
    if (!user) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = req.body;
    if (!name) {
      return resp.status(400).json({ error: 'Missing name' });
    }
    const fileTypes = ['folder', 'file', 'image'];
    if (!type || !fileTypes.includes(type)) {
      return resp.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return resp.status(400).json({ error: 'Missing data' });
    }
    if (parentId !== 0) {
      const parentFile = await getFile(parentId);
      if (!parentFile) {
        return resp.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return resp.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      const newFolder = await DBClient.fileCollection.insertOne({
        userId: user._id,
        name,
        type,
        isPublic,
        parentId,
      });
      return resp.status(201).json({
        id: newFolder.insertedId,
        userId: user._id,
        name,
        type,
        isPublic,
        parentId,
      });
    }
    let PATH = process.env.FOLDER_PATH;
    if (!PATH || PATH === '') {
      PATH = '/tmp/files_manager';
    }
    if (!fs.existsSync(PATH)) {
      fs.mkdirSync(PATH, { recursive: true });
    }
    const fileUuid = uuidv4();
    const localPath = path.join(PATH, fileUuid);
    const fileContent = decode64(data);
    fs.writeFileSync(localPath, fileContent);
    const newFile = await DBClient.fileCollection.insertOne({
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    });
    if (type === 'image') {
      await fileQueue.add({
        userId: user._id.toString(),
        fileId: newFile.insertedId.toString(),
      });
    }
    return resp.status(201).json({
      id: newFile.insertedId,
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    });
  }

  static async getShow(req, resp) {
    const tkn = req.header('X-Token');
    const user = await getUser(tkn);
    if (!user) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const file = await DBClient.fileCollection.findOne({
      _id: new ObjectId(fileId),
    });
    if (!file || file.userId.toString() !== user._id.toString()) {
      return resp.status(404).json({ error: 'Not found' });
    }
    return resp.status(201).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, resp) {
    const tkn = req.header('X-Token');
    const user = await getUser(tkn);
    if (!user) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    const parentId = req.query.parentId || 0;
    const page = Number(req.query.page) || 0;
    const size = 20;
    const skip = page * size;
    const query = { userId: user._id };
    if (parentId !== 0 && parentId !== '0') {
      query.parentId = new ObjectId(parentId);
    }
    const fileArray = [];
    const pipeline = [
      {
        $match: query,
      },
      {
        $skip: skip,
      },
      {
        $limit: size,
      },
      {
        $project: {
          id: 1,
          name: 1,
          type: 1,
          isPublic: 1,
          parentId: 1,
        },
      },
    ];
    const allFiles = await DBClient.fileCollection.aggregate(pipeline).toArray();
    for (const file of allFiles) {
      fileArray.push({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    }
    return resp.status(200).json(fileArray);
  }

  static async putPublish(req, resp) {
    const tkn = req.header('X-Token');
    const user = await getUser(tkn);
    if (!user) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const file = await getFile(fileId);
    if (!file || file.userId.toString() !== user._id.toString()) {
      return resp.status(404).json({ error: 'Not found' });
    }
    await DBClient.fileCollection.updateOne(
      { _id: file._id },
      { $set: { isPublic: true } },
    );
    const updatedFile = await getFile(fileId);
    return resp.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async putUnpublish(req, resp) {
    const tkn = req.header('X-Token');
    const user = await getUser(tkn);
    if (!user) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const file = await getFile(fileId);
    if (!file || file.userId.toString() !== user._id.toString()) {
      return resp.status(404).json({ error: 'Not found' });
    }
    await DBClient.fileCollection.updateOne(
      { _id: file._id },
      { $set: { isPublic: false } },
    );
    const updatedFile = await getFile(fileId);
    return resp.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async getFile(req, resp) {
    const fileId = req.params.id;
    const { size } = req.query;
    const file = await getFile(fileId);
    if (!file) {
      return resp.status(404).json({ error: 'Not found' });
    }
    if (file.isPublic === true) {
      const tkn = req.header('X-Token') || '';
      const user = await getUser(tkn);
      if (!user || file.userId.toString() !== user._id.toString()) {
        return resp.status(404).json({ error: 'Not found' });
      }
    }
    if (file.type === 'folder') {
      return resp.status(400).json({ error: "A folder doesn't have content" });
    }
    let filePath = file.localPath;

    if (size && [500, 250, 100].includes(Number(size))) {
      const thumbnailPath = `${filePath}_${size}`;
      if (fs.existsSync(thumbnailPath)) {
        filePath = thumbnailPath;
      } else {
        return resp.status(404).json({ error: 'Thumbnail not found' });
      }
    }
    if (!fs.existsSync(filePath)) {
      return resp.status(404).json({ error: 'Not found' });
    }
    const mimeType = mime.lookup(file.name);
    resp.setHeader('Content-Type', mimeType);
    const data = fs.readFileSync(file.localPath);
    return resp.status(200).send(data);
  }
}

module.exports = FilesController;
