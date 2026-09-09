import { Global, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AppConfig } from '../config/configuration';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = config.get<AppConfig['auth']>('auth');
        // `expiresIn` e tipado como StringValue ("8h", "30m"); vem de env como string.
        return { secret: cfg.jwtSecret, signOptions: { expiresIn: cfg.jwtExpiraEm as any } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule implements OnApplicationBootstrap {
  constructor(private readonly auth: AuthService) {}

  async onApplicationBootstrap() {
    await this.auth.semear();
  }
}
