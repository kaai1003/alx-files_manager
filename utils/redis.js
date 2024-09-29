import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.status = true;
    this.client.on('connect', () => {
      this.status = true;
    });
    this.client.on('error', (err) => {
      this.status = false;
      console.log(`Error connecting to Redis : ${err}`);
    });
  }

  isAlive() {
    return this.status;
  }

  async get(key) {
    const getAsyn = promisify(this.client.get).bind(this.client);
    const value = await getAsyn(key);
    if (!value) {
      return null;
    }
    return value;
  }

  async set(key, value, duration) {
    const setAsyn = promisify(this.client.setex).bind(this.client);
    await setAsyn(key, duration, value);
  }

  async del(key) {
    const delAsyn = promisify(this.client.del).bind(this.client);
    await delAsyn(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
