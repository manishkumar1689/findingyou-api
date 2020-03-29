import { Module, HttpModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AstrologicController } from './astrologic.controller';
import { AstrologicService } from './astrologic.service';
import { GeoService } from './../geo/geo.service';
import { BodySpeedSchema } from './schemas/body-speed.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: 'BodySpeed', schema: BodySpeedSchema }]),
  ],
  controllers: [AstrologicController],
  providers: [AstrologicService, GeoService],
})
export class AstrologicModule {}
