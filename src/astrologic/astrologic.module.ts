import { Module } from '@nestjs/common';
import { AstrologicController } from './astrologic.controller';

@Module({
  controllers: [AstrologicController]
})
export class AstrologicModule {}
