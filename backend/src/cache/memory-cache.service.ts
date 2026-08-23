import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

interface Entry {
  value: string;
  expiresAt: number | null;
}

/** Redis em memoria: mesma semantica de TTL, sem dependencia de Docker. */
@Injectable()
export class MemoryCacheService extends CacheService {
  private readonly logger = new Logger(MemoryCacheService.name);
  private readonly store = new Map<string, Entry>();

  constructor() {
    super();
    this.logger.log('Cache em memoria ativo (CACHE_DRIVER=memory)');
  }

  private alive(key: string): Entry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async get(key: string) {
    return this.alive(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async ttl(key: string) {
    const entry = this.alive(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  async keys(pattern: string) {
    // Converte o glob do Redis (apenas `*`) em expressao regular equivalente.
    const partes = pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, (c) => `\\${c}`));
    const rx = new RegExp(`^${partes.join('.*')}$`);
    return [...this.store.keys()].filter((k) => rx.test(k) && this.alive(k));
  }

  driver() {
    return 'memory';
  }

  async close() {
    this.store.clear();
  }
}
