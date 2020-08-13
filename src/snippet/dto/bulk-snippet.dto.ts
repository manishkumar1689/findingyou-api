import { ApiModelProperty } from '@nestjs/swagger';
import { CreateSnippetDTO } from './create-snippet.dto';

export class BulkSnippetDTO {

  @ApiModelProperty()
  readonly items: CreateSnippetDTO[];

}
