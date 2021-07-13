import { HttpModule, Module } from '@nestjs/common';
import { SnippetController } from './snippet.controller';
import { SnippetService } from './snippet.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SnippetSchema } from './schemas/snippet.schema';
import { TranslatedItemSchema } from './schemas/translated-item.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'Snippet', schema: SnippetSchema },
      { name: 'TranslatedItem', schema: TranslatedItemSchema }
    ]),
  ],
  providers: [SnippetService],
  controllers: [SnippetController],
})
export class SnippetModule {}
