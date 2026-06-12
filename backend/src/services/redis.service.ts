import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      retryStrategy: (times) => {
        // Retry connection logic
        return Math.min(times * 50, 2000);
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully.');
    });
  }

  public getClient(): Redis {
    return this.client;
  }

  public async getLatestReading(deviceUid: string): Promise<any | null> {
    try {
      const data = await this.client.get(`device:${deviceUid}:latest`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Failed to get latest reading for device ${deviceUid} from Redis:`, err);
      return null;
    }
  }

  public async setLatestReading(deviceUid: string, payload: any, ttlSeconds: number = 120): Promise<void> {
    try {
      await this.client.set(
        `device:${deviceUid}:latest`,
        JSON.stringify(payload),
        'EX',
        ttlSeconds
      );
    } catch (err) {
      console.error(`Failed to set latest reading for device ${deviceUid} in Redis:`, err);
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
}

export const redisService = new RedisService();
export default redisService;
