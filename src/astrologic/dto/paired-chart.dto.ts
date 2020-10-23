import { ApiProperty } from '@nestjs/swagger';
import { TagDTO } from './tag.dto';
import { BaseChartDTO } from './base-chart.dto';
import { GeoDTO } from '../../user/dto/geo.dto';

export class PairedChartDTO {
  @ApiProperty()
  readonly user: string;
  @ApiProperty()
  readonly c1: string;
  @ApiProperty()
  readonly c2: string;
  @ApiProperty()
  readonly timespace: BaseChartDTO;
  @ApiProperty()
  readonly surfaceGeo: GeoDTO;
  @ApiProperty()
  readonly surfaceAscendant: number;
  @ApiProperty()
  readonly surfaceTzOffset: number;
  @ApiProperty()
  readonly midMode: string;
  @ApiProperty()
  readonly relType: string;
  @ApiProperty()
  readonly tags: TagDTO[];
  @ApiProperty()
  readonly startYear?: number;
  @ApiProperty()
  readonly endYear?: number;
  @ApiProperty()
  readonly span?: number;
  @ApiProperty()
  readonly notes: string;
  @ApiProperty()
  readonly createdAt?: Date;
  @ApiProperty()
  readonly modifiedAt?: Date;
}
