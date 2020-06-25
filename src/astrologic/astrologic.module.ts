import { Module, HttpModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AstrologicController } from './astrologic.controller';
import { AstrologicService } from './astrologic.service';
import { GeoService } from './../geo/geo.service';
import { ChartSchema } from './schemas/chart.schema';
import { PairedChartSchema } from './schemas/paired-chart.schema';
import { BodySpeedSchema } from './schemas/body-speed.schema';
import { LexemeSchema } from '../dictionary/schemas/lexeme.schema';
import { DictionaryService } from './../dictionary/dictionary.service';
import { UserService } from './../user/user.service';
import { UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'BodySpeed', schema: BodySpeedSchema },
      { name: 'Chart', schema: ChartSchema },
      { name: 'Lexeme', schema: LexemeSchema },
      { name: 'User', schema: UserSchema },
      { name: 'PairedChart', schema: PairedChartSchema },
    ]),
  ],
  controllers: [AstrologicController],
  providers: [AstrologicService, GeoService, DictionaryService, UserService],
})
export class AstrologicModule {}
