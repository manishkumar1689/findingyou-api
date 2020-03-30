import { ApiProperty } from '@nestjs/swagger';

export class LoginDTO {
  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly password: string;
}
