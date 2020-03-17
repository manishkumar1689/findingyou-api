import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from 'nestjs-redis';
import { mongo, redisOptions } from './.config';
import { AstrologicModule } from './astrologic/astrologic.module';

@Module({
  imports: [
  MongooseModule.forRoot(
      `mongodb://${mongo.user}:${mongo.pass}@localhost/${mongo.name}`,
      {
        useNewUrlParser: true,
      },
    ),
    RedisModule.register(redisOptions),
    AstrologicModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
