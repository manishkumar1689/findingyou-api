import { ApiProperty } from '@nestjs/swagger';
import { SubjectDTO } from './subject.dto';
import { PlacenameDTO } from 'src/user/dto/placename.dto';
import { GeoDTO } from 'src/user/dto/geo.dto';
import { BaseGrahaDTO } from './base-graha.dto';
import { HouseSystemDTO } from './house-system.dto';
import { ITimeDTO } from './i-time.dto';
import { KeyNumValueDTO } from './key-num-value.dto';
import { ObjectMatchDTO } from './object-match.dto';
import { VariantDTO } from './variant.dto';

export class CreateChartDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly isDefaultBirthChart: boolean;

  @ApiProperty()
  readonly subject: SubjectDTO;

  @ApiProperty()
  readonly datetime: Date;

  @ApiProperty()
  readonly jd: number;

  @ApiProperty()
  readonly geo: GeoDTO;

  @ApiProperty()
  readonly placenames: PlacenameDTO[];

  @ApiProperty()
  readonly tz: string;

  @ApiProperty()
  readonly tzOffset: number;

  @ApiProperty()
  readonly grahas: Array<BaseGrahaDTO>;

  @ApiProperty()
  readonly houses: Array<HouseSystemDTO>;

  @ApiProperty()
  indianTime: ITimeDTO;

  @ApiProperty()
  variants: Array<VariantDTO>;

  @ApiProperty()
  upagrahas: Array<KeyNumValueDTO>;

  @ApiProperty()
  sphutas: Array<KeyNumValueDTO>;

  @ApiProperty()
  keyValues: Array<KeyNumValueDTO>;

  @ApiProperty()
  objects: Array<ObjectMatchDTO>;
}
