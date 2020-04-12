import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from 'nestjs-redis';
import { HandlebarsAdapter, MailerModule } from '@nest-modules/mailer';
import { mongo, redisOptions } from './.config';
import { AstrologicModule } from './astrologic/astrologic.module';
import { GeoModule } from './geo/geo.module';
import { UserModule } from './user/user.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { SettingModule } from './setting/setting.module';
import { MessageModule } from './message/message.module';
import { mailDetails } from './.config';

@Module({
  imports: [
    MongooseModule.forRoot(
      `mongodb://${mongo.user}:${mongo.pass}@localhost/${mongo.name}`,
      {
        useNewUrlParser: true,
      },
    ),
    RedisModule.register(redisOptions),
    MailerModule.forRoot({
      transport: mailDetails.transport,
      defaults: {
        from: `"${mailDetails.fromName}" <${mailDetails.fromAddress}>`,
      },
      template: {
        dir: __dirname + '/templates',
        adapter: new HandlebarsAdapter(), // or new PugAdapter()
        options: {
          strict: true,
        },
      },
    }),
    AstrologicModule,
    GeoModule,
    UserModule,
    DictionaryModule,
    SettingModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
