import sha1 from 'sha1';
import DBClient from '../utils/db';
import redisClient from '../utils/redis';

const { v4: uuidv4 } = require('uuid');

class AuthController {
  static async getConnect(req, resp) {
    const auth = req.header('Authorization');

    if (!auth.startsWith('Basic ')) {
      resp.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = auth.split(' ')[1];
    const decodeCred = Buffer.from(credentials, 'base64').toString('utf-8');
    const [email, password] = decodeCred.split(':');
    const shPwd = sha1(password);
    const user = await DBClient.userCollection.findOne({ email, password: shPwd });

    if (!user) {
      resp.status(401).json({ error: 'Unauthorized' });
    }
    const token = uuidv4();
    const userId = user._id.toString();
    await redisClient.set(`auth_${token}`, userId, 24 * 3600);
    return resp.status(200).json({ token });
  }

  static async getDisconnect(req, resp) {
    const tkn = req.header('X-Token');
    if (!tkn) {
      resp.status(401).json({ error: 'Unauthorized' });
    }
    const user = await redisClient.get(`auth_${tkn}`);
    if (!user) {
      resp.status(401).json({ error: 'Unauthorized' });
    }
    await redisClient.del(`auth_${tkn}`);
    return resp.status(204).json();
  }
}

module.exports = AuthController;
