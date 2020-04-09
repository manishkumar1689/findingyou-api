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
import { Lexeme } from './interfaces/lexeme.interface';
import { Translation } from './interfaces/translation.interface';
import { notEmptyString } from 'src/lib/validators';
import { TranslationDTO } from './dto/translation.dto';

const mapTranslation = (item: Translation): any => {
  const keys = ['lang', 'text', 'type'];
  const mp = new Map<string, any>();
  keys.forEach(k => {
    mp.set(k, item[k]);
  });
  return Object.fromEntries(mp);
};

const mapLexeme = (item: Lexeme): any => {
  const keys = ['key', 'lang', 'name', 'original', 'unicode', 'translations'];
  const mp = new Map<string, any>();
  keys.forEach(k => {
    switch (k) {
      case 'translations':
        mp.set(k, item.translations.map(mapTranslation));
        break;
      default:
        mp.set(k, item[k]);
        break;
    }
  });
  return Object.fromEntries(mp);
};

@Controller('dictionary')
export class DictionaryController {
  constructor(private dictionaryService: DictionaryService) {}

  @Get('list/:ref?')
  async listAll(@Res() res, @Param('ref') ref) {
    const filter = new Map<string, string>();
    if (notEmptyString(ref, 1)) {
      const filterName = ref.length < 3 ? 'init' : 'category';
      const filterVal = ref;
      filter.set(filterName, filterVal);
    }
    let result: any = { valid: false };
    const items = await this.dictionaryService.getAll(
      Object.fromEntries(filter),
    );
    if (items instanceof Array) {
      result = { valid: true, items: items.map(mapLexeme) };
    }
    return res.status(HttpStatus.OK).send(result);
  }

  @Get('categories')
  async listCategories(@Res() res) {
    let result: any = { valid: false };
    const categories = await this.dictionaryService.getCategories();
    if (categories instanceof Array) {
      result = { valid: true, categories };
    }
    return res.status(HttpStatus.OK).send(result);
  }

  @Get('categories-keys')
  async listCategoriesKeys(@Res() res) {
    let result: any = { valid: false };
    const categories = await this.dictionaryService.getCategoriesAndKeys();
    if (categories instanceof Array) {
      result = { valid: true, categories };
    }
    return res.status(HttpStatus.OK).send(result);
  }

  // add a lexeme
  @Post('create')
  async addLexeme(@Res() res, @Body() createLexemeDTO: CreateLexemeDTO) {
    const lexeme = await this.dictionaryService.addLexeme(createLexemeDTO);
    return res.status(HttpStatus.OK).json({
      message: 'Lexeme has been created successfully',
      lexeme,
    });
  }

  @Put('edit/:key')
  async editLexeme(
    @Res() res,
    @Param('key') key,
    @Body() createLexemeDTO: CreateLexemeDTO,
  ) {
    const lexeme = await this.dictionaryService.updateLexeme(
      key,
      createLexemeDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Lexeme has been updated successfully',
      lexeme,
    });
  }

  @Put('add-translation/:key')
  async addTranslation(
    @Res() res,
    @Param('key') key,
    @Body() translationDTO: TranslationDTO,
  ) {
    const lexeme = await this.dictionaryService.saveTranslationByKey(
      key,
      translationDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Lexeme has been updated successfully',
      lexeme,
    });
  }
}
