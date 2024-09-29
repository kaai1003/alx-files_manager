import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const url = `mongodb://${host}:${port}`;
    const DB = process.env.DB_DATABASE || 'files_manager';
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect((err, client) => {
      if (!err) {
        this.db = client.db(DB);
        this.status = true;
      } else {
        this.status = false;
      }
    });
  }

  isAlive() {
    return this.status;
  }

  async nbUsers() {
    const userCount = await this.db.collection('users').countDocuments();
    return userCount;
  }

  async nbFiles() {
    const fileCount = await this.db.collection('files').countDocuments();
    return fileCount;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
