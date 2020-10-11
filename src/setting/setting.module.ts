import { Module } from '@nestjs/common';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingSchema } from './schemas/setting.schema';
import { UserService } from './../user/user.service';
import { UserSchema } from '../user/schemas/user.schema';
import { RulesCollectionSchema } from './schemas/rules-collection.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Setting', schema: SettingSchema },
      { name: 'RulesCollection', schema: RulesCollectionSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [SettingService, UserService],
  controllers: [SettingController],
})
export class SettingModule {}
