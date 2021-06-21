import { Module, HttpModule, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MessageService } from '../message/message.service';
import { UserSchema } from './schemas/user.schema';
import { MessageSchema } from '../message/schemas/message.schema';
import { GeoService } from './../geo/geo.service';
import { SettingService } from './../setting/setting.service';
import { SettingSchema } from '../setting/schemas/setting.schema';
import { ChartSchema } from '../astrologic/schemas/chart.schema';
import { AstrologicService } from '../astrologic/astrologic.service';
import { BodySpeedSchema } from '../astrologic/schemas/body-speed.schema';
import { PairedChartSchema } from '../astrologic/schemas/paired-chart.schema';
import { SnippetSchema } from '../snippet/schemas/snippet.schema';
import { SnippetService } from '../snippet/snippet.service';
import { ProtocolSchema } from '../setting/schemas/protocol.schema';
import { GeoNameSchema } from '../geo/schemas/geo-name.schema';
import { PredictiveRuleSetSchema } from '../setting/schemas/predictive-rule-set.schema';

@Global()
@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Message', schema: MessageSchema },
      { name: 'Setting', schema: SettingSchema },
      { name: 'GeoName', schema: GeoNameSchema },
      { name: 'Snippet', schema: SnippetSchema },
      { name: 'Chart', schema: ChartSchema },
      { name: 'BodySpeed', schema: BodySpeedSchema },
      { name: 'PairedChart', schema: PairedChartSchema },
      { name: 'Protocol', schema: ProtocolSchema },
      { name: 'PredictiveRuleSet', schema: PredictiveRuleSetSchema },
    ]),
  ],
  providers: [
    UserService,
    MessageService,
    SettingService,
    SnippetService,
    AstrologicService,
    GeoService,
  ],
  controllers: [UserController],
})
export class UserModule {}
