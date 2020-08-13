import { ApiModelProperty } from '@nestjs/swagger';

export class CreateSnippetDTO {
  @ApiModelProperty()
  readonly key: string;

  @ApiModelProperty()
  readonly value: string;

  @ApiModelProperty()
  readonly format: string;

  @ApiModelProperty()
  readonly createdAt: Date;

  @ApiModelProperty()
  readonly modifiedAt: Date;
}
