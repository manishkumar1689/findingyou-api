import { ApiModelProperty } from '@nestjs/swagger';

export class CreateMessageDTO {
  @ApiModelProperty()
  readonly key: string;

  @ApiModelProperty()
  readonly subject: string;

  @ApiModelProperty()
  readonly body: string;

  @ApiModelProperty()
  readonly fromName: string;

  @ApiModelProperty()
  readonly fromMail: string;

  @ApiModelProperty()
  readonly createdAt: Date;

  @ApiModelProperty()
  readonly modifiedAt: Date;
}
