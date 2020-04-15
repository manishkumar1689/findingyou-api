import { Module, HttpModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AstrologicController } from './astrologic.controller';
import { AstrologicService } from './astrologic.service';
import { GeoService } from './../geo/geo.service';
import { BodySpeedSchema } from './schemas/body-speed.schema';
import { LexemeSchema } from '../dictionary/schemas/lexeme.schema';
import { DictionaryService } from './../dictionary/dictionary.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'BodySpeed', schema: BodySpeedSchema },
      { name: 'Lexeme', schema: LexemeSchema },
    ]),
  ],
  controllers: [AstrologicController],
  providers: [AstrologicService, GeoService, DictionaryService],
})
export class AstrologicModule {}
