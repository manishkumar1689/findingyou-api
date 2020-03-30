import { ApiProperty } from '@nestjs/swagger';

export class RoleDTO {
  @ApiProperty()
  readonly key: string;

  @ApiProperty()
  readonly name: string;
}
