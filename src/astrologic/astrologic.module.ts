import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AstrologicController } from './astrologic.controller';
import { AstrologicService } from './astrologic.service';
import { BodySpeedSchema } from './schemas/body-speed.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'BodySpeed', schema: BodySpeedSchema },
    ]),
  ],
  controllers: [AstrologicController],
  providers: [AstrologicService]
})
export class AstrologicModule {}
