import { ApiProperty } from '@nestjs/swagger';

export class Payment {
  @ApiProperty()
  readonly service: string;

  @ApiProperty()
  readonly ref: string;

  @ApiProperty()
  readonly amount: number;

  @ApiProperty()
  readonly curr: string;

  @ApiProperty()
  readonly createdAt: Date;
}
