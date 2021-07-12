import { HttpModule, Module } from '@nestjs/common';
import { SnippetController } from './snippet.controller';
import { SnippetService } from './snippet.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SnippetSchema } from './schemas/snippet.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: 'Snippet', schema: SnippetSchema }]),
  ],
  providers: [SnippetService],
  controllers: [SnippetController],
})
export class SnippetModule {}
