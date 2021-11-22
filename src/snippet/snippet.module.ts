import { HttpModule, Module } from '@nestjs/common';
import { SnippetController } from './snippet.controller';
import { SnippetService } from './snippet.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SnippetSchema } from './schemas/snippet.schema';
import { TranslatedItemSchema } from './schemas/translated-item.schema';
import { UserSchema } from '../user/schemas/user.schema';
import { UserService } from '../user/user.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'Snippet', schema: SnippetSchema },
      { name: 'TranslatedItem', schema: TranslatedItemSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  providers: [SnippetService, UserService],
  controllers: [SnippetController],
})
export class SnippetModule {}
