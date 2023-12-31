import { HttpModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from 'nestjs-redis';
import { HandlebarsAdapter, MailerModule } from '@nest-modules/mailer';
import { mongo, redisOptions, mailDetails } from './.config';
import { AstrologicModule } from './astrologic/astrologic.module';
import { GeoModule } from './geo/geo.module';
import { UserModule } from './user/user.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { SettingModule } from './setting/setting.module';
import { MessageModule } from './message/message.module';
import { SnippetModule } from './snippet/snippet.module';
import { UserService } from './user/user.service';
import { UserSchema } from './user/schemas/user.schema';
import { AppGateway } from './app.gateway';
import { FeedbackModule } from './feedback/feedback.module';
import { PublicUserSchema } from './user/schemas/public-user.schema';
import { AnswerSetSchema } from './user/schemas/answer-set.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forRoot(
      `mongodb://${mongo.user}:${mongo.pass}@localhost/${mongo.name}`,
      {
        useNewUrlParser: true,
      },
    ),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      {
        name: 'PublicUser',
        schema: PublicUserSchema,
      },
      {
        name: 'AnswerSet',
        schema: AnswerSetSchema,
      },
    ]),
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
    SnippetModule,
    FeedbackModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserService, AppGateway],
})
export class AppModule {}
