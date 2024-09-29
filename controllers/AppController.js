import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

class AppController {
  static async getStatus(req, resp) {
    const redisStatus = await RedisClient.isAlive();
    const dbStatus = await DBClient.isAlive();

    resp.status(200).json({
      redis: redisStatus,
      db: dbStatus,
    });
  }

  static async getstats(req, resp) {
    const nbrUsers = await DBClient.nbUsers();
    const nbrFiles = await DBClient.nbFiles();

    resp.status(200).json({
      users: nbrUsers,
      files: nbrFiles,
    });
  }
}

export default AppController;
