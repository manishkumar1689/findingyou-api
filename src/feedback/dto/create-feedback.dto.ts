import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly targetUser: any;

  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly value: any;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
