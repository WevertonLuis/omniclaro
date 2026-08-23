import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

@Injectable()
export class RedisCacheService extends CacheService {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis;

  constructor(host: string, port: number) {
    super();
    this.client = new Redis({ host, port, lazyConnect: false, maxRetriesPerRequest: 2 });
    this.client.on('error', (e) => this.logger.error(`Redis: ${e.message}`));
    this.logger.log(`Redis ativo em ${host}:${port} (CACHE_DRIVER=redis)`);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
    else await this.client.set(key, value);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async ttl(key: string) {
    return this.client.ttl(key);
  }

  async keys(pattern: string) {
    return this.client.keys(pattern);
  }

  driver() {
    return 'redis';
  }

  async close() {
    await this.client.quit();
  }
}
