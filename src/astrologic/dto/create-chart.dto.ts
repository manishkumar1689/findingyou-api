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
import { VariantSetDTO } from './variant-set.dto';

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
  readonly ascendant: number;

  @ApiProperty()
  readonly mc: number;

  @ApiProperty()
  readonly vertex: number;

  @ApiProperty()
  readonly grahas: BaseGrahaDTO[];

  @ApiProperty()
  readonly houses: HouseSystemDTO[];

  @ApiProperty()
  indianTime: ITimeDTO;

  @ApiProperty()
  upagrahas: KeyNumValueDTO[];

  @ApiProperty()
  sphutas: VariantSetDTO[];

  @ApiProperty()
  keyValues: Array<KeyNumValueDTO>;

  @ApiProperty()
  objects: Array<ObjectMatchDTO>;
}
