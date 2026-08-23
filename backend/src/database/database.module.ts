import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig } from '../config/configuration';
import * as entities from './entities';

const ENTITIES = Object.values(entities).filter((e) => typeof e === 'function');

export function buildTypeOrmOptions(cfg: AppConfig['db']): TypeOrmModuleOptions {
  if (cfg.driver === 'postgres') {
    return {
      type: 'postgres',
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      password: cfg.password,
      database: cfg.database,
      entities: ENTITIES as any,
      synchronize: true,
    };
  }

  // sql.js: SQLite compilado em WebAssembly. Nao exige node-gyp / build tools,
  // o que mantem o `npm install` viavel no Windows sem Docker.
  const file = path.resolve(process.cwd(), cfg.sqliteFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return {
    type: 'sqljs',
    location: file,
    autoSave: true,
    entities: ENTITIES as any,
    synchronize: true,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config.get<AppConfig['db']>('db')),
    }),
    TypeOrmModule.forFeature(ENTITIES as any),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
