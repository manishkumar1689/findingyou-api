import { ApiProperty } from '@nestjs/swagger';
import { StatusDTO } from './status.dto';

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
  readonly roles: string[];

  @ApiProperty()
  readonly active: boolean;

  @ApiProperty()
  readonly test: boolean;

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
