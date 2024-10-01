import { ObjectId } from 'mongodb';
import path from 'path';
import fs from 'fs';
import redisClient from '../utils/redis';
import DBClient from '../utils/db';

const { v4: uuidv4 } = require('uuid');

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

async function getFile(parentId) {
  let objectId;
  try {
    objectId = new ObjectId(parentId);
  } catch (error) {
    return null;
  }
  const parentFile = await DBClient.fileCollection.findOne(
    { _id: objectId },
  );
  return parentFile;
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
        id: newFolder.ops[0]._id,
        userId: newFolder.ops[0].userId,
        name: newFolder.ops[0].name,
        type: newFolder.ops[0].type,
        isPublic: newFolder.ops[0].isPublic,
        parentId: newFolder.ops[0].parentId,
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
    return resp.status(201).json({
      id: newFile.ops[0]._id,
      userId: newFile.ops[0].userId,
      name: newFile.ops[0].name,
      type: newFile.ops[0].type,
      isPublic: newFile.ops[0].isPublic,
      parentId: newFile.ops[0].parentId,
    });
  }
}

module.exports = FilesController;
