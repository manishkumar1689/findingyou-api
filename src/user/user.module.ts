import { Module, HttpModule } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MessageService } from '../message/message.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './schemas/user.schema';
import { MessageSchema } from '../message/schemas/message.schema';
import { GeoService } from './../geo/geo.service';
import { SettingService } from './../setting/setting.service';
import { SettingSchema } from '../setting/schemas/setting.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Message', schema: MessageSchema },
      { name: 'Setting', schema: SettingSchema },
    ]),
  ],
  providers: [UserService, MessageService, SettingService, GeoService],
  controllers: [UserController],
})
export class UserModule {}
