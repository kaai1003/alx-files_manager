import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const url = `mongodb://${host}:${port}`;
    const DB = process.env.DB_DATABASE || 'files_manager';
    this.status = false;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect((err) => {
      if (!err) {
        this.status = true;
      } else {
        this.status = false;
      }
    });
    this.userCollection = this.client.db(DB).collection('users');
    this.fileCollection = this.client.db(DB).collection('files');
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
