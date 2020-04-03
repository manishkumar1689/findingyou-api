import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Res,
  Req,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { CreateLexemeDTO } from './dto/create-lexeme.dto';

@Controller('dictionary')
export class DictionaryController {
  constructor(private dictionaryService: DictionaryService) {}

  @Get('list/:ref?')
  async listAll(@Res() res, @Param('ref') ref) {
    const filter = new Map<string, string>();
    if (ref.length > 0) {
      const filterName = ref.length < 3 ? 'init' : 'category';
      const filterVal = ref.length < 3 ? ref : ref + '__';
      filter.set(filterName, filterVal);
    }
    let result: any = { valid: false };
    const items = await this.dictionaryService.getAll(
      Object.fromEntries(filter),
    );
    if (items instanceof Array) {
      result = { valid: true, items };
    }
    return res.status(HttpStatus.OK).send(result);
  }

  // add a lexeme
  @Post('create')
  async addSnippet(@Res() res, @Body() createLexemeDTO: CreateLexemeDTO) {
    const lexeme = await this.dictionaryService.addLexeme(createLexemeDTO);
    return res.status(HttpStatus.OK).json({
      message: 'Lexeme has been created successfully',
      lexeme,
    });
  }

  @Put('edit/:lexemeID')
  async editSnippet(
    @Res() res,
    @Param('lexemeID') lexemeID,
    @Body() createLexemeDTO: CreateLexemeDTO,
  ) {
    const lexeme = await this.dictionaryService.updateLexeme(
      lexemeID,
      createLexemeDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Lexeme has been updated successfully',
      lexeme,
    });
  }
}
