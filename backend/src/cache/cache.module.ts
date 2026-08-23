import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { CacheService } from './cache.service';
import { MemoryCacheService } from './memory-cache.service';
import { RedisCacheService } from './redis-cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CacheService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = config.get<AppConfig['cache']>('cache');
        return cfg.driver === 'redis'
          ? new RedisCacheService(cfg.host, cfg.port)
          : new MemoryCacheService();
      },
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}
