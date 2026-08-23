import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MocksService } from './mocks.service';

@Controller('api/v1/mock')
export class MocksController {
  constructor(private readonly mocks: MocksService) {}

  @Post('network/reset-signal')
  resetSignal(@Body() body: { equipamento?: string }) {
    return this.mocks.resetSignal(body?.equipamento ?? 'modem');
  }

  @Get('catalog/offers')
  offers(@Query('q') q?: string) {
    return this.mocks.listarOfertas(q);
  }
}
