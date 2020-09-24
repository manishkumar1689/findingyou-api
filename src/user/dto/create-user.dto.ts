import { ApiProperty } from '@nestjs/swagger';
import { StatusDTO } from './status.dto';
import { GeoDTO } from './geo.dto';
import { PlacenameDTO } from './placename.dto';
import { ProfileDTO } from './profile.dto';
import { PreferenceDTO } from './preference.dto';
import { ContactDTO } from './contact.dto';

export class CreateUserDTO {
  @ApiProperty()
  readonly fullName: string;

  @ApiProperty()
  readonly nickName: string;

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
  readonly geo?: GeoDTO;

  @ApiProperty()
  readonly coords?: number[];

  @ApiProperty()
  readonly contacts?: ContactDTO[];

  @ApiProperty()
  readonly placenames?: PlacenameDTO[];

  @ApiProperty()
  readonly preferences: PreferenceDTO[];

  @ApiProperty()
  readonly profiles: ProfileDTO[];

  @ApiProperty()
  readonly preview: string;

  @ApiProperty()
  readonly dob?: Date;

  @ApiProperty()
  readonly token: string;

  @ApiProperty()
  readonly login: Date;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
