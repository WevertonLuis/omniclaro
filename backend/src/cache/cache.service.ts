/**
 * Subconjunto da interface do ioredis usado pelo orquestrador.
 * Permite trocar Redis real por implementacao em memoria sem tocar no dominio.
 */
export abstract class CacheService {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  abstract del(key: string): Promise<void>;
  abstract ttl(key: string): Promise<number>;
  abstract keys(pattern: string): Promise<string[]>;
  abstract driver(): string;
  abstract close(): Promise<void>;
}
