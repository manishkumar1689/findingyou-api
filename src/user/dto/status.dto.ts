import { ApiProperty } from '@nestjs/swagger';
import { RoleDTO } from './role.dto';

export class StatusDTO {
  @ApiProperty()
  readonly role: RoleDTO;

  @ApiProperty()
  readonly current: boolean;

  @ApiProperty()
  readonly expiresAt: Date;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
