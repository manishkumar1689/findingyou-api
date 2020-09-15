import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Put,
  Query,
  NotFoundException,
  Delete,
  Param,
} from '@nestjs/common';
import { SnippetService } from './snippet.service';
import { CreateSnippetDTO } from './dto/create-snippet.dto';
import { BulkSnippetDTO } from './dto/bulk-snippet.dto';
import { smartCastBool, smartCastString } from 'src/lib/converters';

/*
Provide alternative versions of snippets if not available
The English version will always be available but for some languages
an alternative closer match may be provided, e.g. Ukrainians may understand Russian
This is separate from the preferred locale variants. These alternative then become available 
without having to re-download a new set of snippets or provide all users with all languages (which would be manageable for small number)
*/
const defaultLangCodes = (baseLang = '') => {
  const codes = ['en'];
  switch (baseLang) {
    case 'uk':
      codes.push('ru');
      break;
  }
  return codes;
};

@Controller('snippet')
export class SnippetController {
  constructor(private snippetService: SnippetService) {}

  // add a snippet
  @Post('/bulk-save')
  async bulkSave(@Res() res, @Body() bulkSnippetDTO: BulkSnippetDTO) {
    const result = await this.snippetService.bulkUpdate(bulkSnippetDTO);
    return res.status(HttpStatus.OK).json({
      message: 'Snippets saved successfully',
      result,
    });
  }

  @Post('/save')
  async save(@Res() res, @Body() createSnippetDTO: CreateSnippetDTO) {
    const snippet = await this.snippetService.save(createSnippetDTO);
    return res.status(HttpStatus.OK).json({
      message: 'Snippet has been edited successfully',
      snippet,
    });
  }

  // Retrieve snippets list
  @Get('list/:lang?/:published?/:active?/:approved?')
  async list(
    @Res() res,
    @Param('lang') lang,
    @Param('published') published,
    @Param('active') active,
    @Param('approved') approved,
  ) {
    const langCode = smartCastString(lang, 'all');
    const baseLangCode = langCode.split('-').shift();
    const publishedMode = smartCastBool(published, true);
    const activeMode = smartCastBool(active, true);
    const approvedMode = smartCastBool(approved, true);
    const snippets = await this.snippetService.list(publishedMode);
    const filtered = snippets.map(record => {
      const snippet = record.toObject();
      const values = snippet.values
        .filter(val => {
          let valid = true;
          if (langCode !== 'all') {
            const baseLang = val.lang.split('-').shift();
            valid =
              val.lang === langCode ||
              baseLang === baseLangCode ||
              defaultLangCodes(baseLang).includes(baseLang);
          }
          if (activeMode && valid) {
            valid = val.active;
          }
          if (approvedMode && valid) {
            valid = val.approved;
          }
          return valid;
        })
        .map(val => {
          if (publishedMode) {
            const { lang, text } = val;
            return {
              lang,
              text,
            };
          } else {
            return val;
          }
        });
      return { ...snippet, values };
    });
    return res.status(HttpStatus.OK).json({
      valid: filtered.length > 0,
      items: filtered,
    });
  }

  // Retrieve snippets list
  @Get('categories')
  async categories(@Res() res) {
    const categories = await this.snippetService.categories();
    return res.status(HttpStatus.OK).json({
      valid: categories.length > 0,
      categories,
    });
  }

  // Fetch a particular snippet using ID
  @Get('snippet/:snippetID')
  async getSnippet(@Res() res, @Param('snippetID') snippetID) {
    const snippet = await this.snippetService.getSnippet(snippetID);
    if (!snippet) {
      throw new NotFoundException('Snippet does not exist!');
    }
    return res.status(HttpStatus.OK).json(snippet);
  }

  @Delete('delete/:key/:user')
  async delete(@Res() res, @Param('key') key, @Param('user') user) {
    let data: any = { valid: false, message: 'not authorised' };
    if (user.length > 10) {
      data = await this.snippetService.deleteByKey(key);
    }
    return res.status(HttpStatus.OK).json(data);
  }
}