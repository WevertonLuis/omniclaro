export type DbDriver = 'sqlite' | 'postgres';
export type CacheDriver = 'memory' | 'redis';

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  db: {
    driver: DbDriver;
    sqliteFile: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  cache: {
    driver: CacheDriver;
    host: string;
    port: number;
    sessionTtlSeconds: number;
  };
  gemini: {
    apiKey: string;
    model: string;
    /** 'low' | 'high' nos modelos Gemini 3.x; vazio omite o campo. */
    thinkingLevel: string;
  };
  handoffConfidenceThreshold: number;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  db: {
    driver: (process.env.DB_DRIVER as DbDriver) ?? 'sqlite',
    sqliteFile: process.env.DB_SQLITE_FILE ?? './data/omniclaro.db',
    host: process.env.PGHOST ?? 'localhost',
    port: parseInt(process.env.PGPORT ?? '5432', 10),
    username: process.env.PGUSER ?? 'omniclaro',
    password: process.env.PGPASSWORD ?? 'omniclaro',
    database: process.env.PGDATABASE ?? 'omniclaro',
  },
  cache: {
    driver: (process.env.CACHE_DRIVER as CacheDriver) ?? 'memory',
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS ?? '86400', 10),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
    thinkingLevel: (process.env.GEMINI_THINKING_LEVEL ?? 'low').trim(),
  },
  handoffConfidenceThreshold: parseFloat(process.env.HANDOFF_CONFIDENCE_THRESHOLD ?? '0.80'),
});

/**
 * Tipo de coluna de data/hora compativel com os dois drivers suportados.
 * Avaliado na importacao das entidades, antes do TypeORM montar o schema.
 */
export const DATETIME_TYPE =
  (process.env.DB_DRIVER ?? 'sqlite') === 'postgres' ? 'timestamptz' : 'datetime';
