import { Controller } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { UserService } from 'src/user/user.service';
import { SettingService } from 'src/setting/setting.service';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private feedbackService: FeedbackService,
    private userService: UserService,
    private settingService: SettingService,
  ) {}
}
