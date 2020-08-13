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

@Controller('snippet')
export class SnippetController {
  constructor(private snippetService: SnippetService) {}

  // add a snippet
  @Post('/create')
  async addSnippet(@Res() res, @Body() createSnippetDTO: CreateSnippetDTO) {
    const snippet = await this.snippetService.addSnippet(createSnippetDTO);
    return res.status(HttpStatus.OK).json({
      message: 'Snippet has been created successfully',
      snippet,
    });
  }

  // add a snippet
  @Post('/bulk-save')
  async bulkSave(@Res() res, @Body() bulkSnippetDTO: BulkSnippetDTO) {
    const result = await this.snippetService.bulkUpdate(bulkSnippetDTO);
    return res.status(HttpStatus.OK).json({
      message: 'Snippets saved successfully',
      result,
    });
  }

  @Put('/edit/:snippetID')
  async editSnippet(
    @Res() res,
    @Param('snippetID') snippetID,
    @Body() createSnippetDTO: CreateSnippetDTO,
  ) {
    const snippet = await this.snippetService.updateSnippet(
      snippetID,
      createSnippetDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Snippet has been updated successfully',
      snippet,
    });
  }

  // Retrieve snippets list
  @Get('list')
  async getAllSnippet(@Res() res) {
    const snippets = await this.snippetService.getAllSnippet();
    return res.status(HttpStatus.OK).json(snippets);
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
}
