import { ApiProperty } from '@nestjs/swagger';

export class SubjectDTO {
  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly type: string;

  @ApiProperty()
  readonly gender: string;

  @ApiProperty()
  readonly eventType: string;

  @ApiProperty()
  readonly roddenScale: string;
}
