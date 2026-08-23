import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './database.module';
import configuration from '../config/configuration';

dotenv.config();

(async () => {
  const cfg = configuration();
  const options = buildTypeOrmOptions(cfg.db) as any;
  const ds = new DataSource(options);
  await ds.initialize();
  const { SeedService } = await import('./seed.service');
  const { Cliente, Protocolo } = await import('./entities');
  const service = new SeedService(ds.getRepository(Cliente), ds.getRepository(Protocolo));
  await service.run();
  await ds.destroy();
  process.exit(0);
})();
