import { Module, HttpModule } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { UserService } from 'src/user/user.service';
import { UserSchema } from 'src/user/schemas/user.schema';
import { FeedbackSchema } from './schemas/feedback.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingSchema } from 'src/setting/schemas/setting.schema';
import { SettingService } from 'src/setting/setting.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'Feedback', schema: FeedbackSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Setting', schema: SettingSchema },
    ]),
  ],
  providers: [FeedbackService, UserService, SettingService],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
