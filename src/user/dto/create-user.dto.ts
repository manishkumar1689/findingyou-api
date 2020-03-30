import { ApiProperty } from '@nestjs/swagger';
import { StatusDTO } from './status.dto';
import { RoleDTO } from './role.dto';

export class CreateUserDTO {
  @ApiProperty()
  readonly uid: number;

  @ApiProperty()
  readonly firstName: string;

  @ApiProperty()
  readonly lastName: string;

  @ApiProperty()
  readonly identifier: string;

  @ApiProperty()
  readonly password: string;

  @ApiProperty()
  readonly mode: string;

  @ApiProperty()
  readonly role: RoleDTO[];

  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly status: StatusDTO[];

  @ApiProperty()
  readonly token: string;

  @ApiProperty()
  readonly login: Date;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
