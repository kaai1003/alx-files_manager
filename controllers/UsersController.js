import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import DBClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, resp) {
    const { email, password } = req.body;

    if (!email) {
      return resp.status(400).json({
        error: 'Missing email',
      });
    }
    if (!password) {
      return resp.status(400).json({
        error: 'Missing password',
      });
    }

    const user = await DBClient.userCollection.findOne({ email });
    if (user) {
      return resp.status(400).json({
        error: 'Already exist',
      });
    }

    const hashPwd = sha1(password);
    const newUser = await DBClient.userCollection.insertOne({
      email,
      password: hashPwd,
    });

    return resp.status(201).json({
      id: newUser.insertedId,
      email,
    });
  }

  static async getMe(req, resp) {
    const tkn = req.header('X-Token');
    if (!tkn) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${tkn}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    let objectId;
    try {
      objectId = new ObjectId(userId);
    } catch (error) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    const user = await DBClient.userCollection.findOne(
      { _id: objectId },
      { projection: { email: 1 } },
    );
    if (!user) {
      return resp.status(401).json({ error: 'Unauthorized' });
    }
    return resp.status(200).json({
      id: userId,
      email: user.email,
    });
  }
}

module.exports = UsersController;
