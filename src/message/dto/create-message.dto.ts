import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly subject: string;

  @ApiProperty()
  readonly body: string;

  @ApiProperty()
  readonly fromName: string;

  @ApiProperty()
  readonly fromMail: string;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
