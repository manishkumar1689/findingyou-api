import { Module, HttpModule } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { UserService } from '../user/user.service';
import { UserSchema } from '../user/schemas/user.schema';
import { FeedbackSchema } from './schemas/feedback.schema';
import { FlagSchema } from './schemas/flag.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingSchema } from '../setting/schemas/setting.schema';
import { SettingService } from '../setting/setting.service';
import { RulesCollectionSchema } from '../setting/schemas/rules-collection.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'Feedback', schema: FeedbackSchema },
      { name: 'Flag', schema: FlagSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Setting', schema: SettingSchema },
      { name: 'RulesCollection', schema: RulesCollectionSchema },
    ]),
  ],
  providers: [FeedbackService, UserService, SettingService],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
