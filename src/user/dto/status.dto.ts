import { ApiProperty } from '@nestjs/swagger';

export class StatusDTO {
  @ApiProperty()
  readonly role: string;

  @ApiProperty()
  readonly current: boolean;

  @ApiProperty()
  readonly expiresAt: Date;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
