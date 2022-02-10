import { ApiProperty } from '@nestjs/swagger';

export class LogoutDTO {
  @ApiProperty()
  readonly identifier: string;
}
