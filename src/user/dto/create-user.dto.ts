import { ApiProperty } from '@nestjs/swagger';
import { StatusDTO } from './status.dto';
import { GeoDTO } from './geo.dto';
import { PlacenameDTO } from './placename.dto';
import { ProfileDTO } from './profile.dto';

export class CreateUserDTO {
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

  readonly geo?: GeoDTO;

  @ApiProperty()
  readonly placenames?: PlacenameDTO[];

  @ApiProperty()
  readonly profiles: ProfileDTO[];

  @ApiProperty()
  readonly preview: string;

  @ApiProperty()
  readonly token: string;

  @ApiProperty()
  readonly login: Date;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
