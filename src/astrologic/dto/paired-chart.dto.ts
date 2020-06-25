import { ApiProperty } from '@nestjs/swagger';
import { TagDTO } from './tag.dto';
import { BaseChartDTO } from './base-chart.dto';

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
  readonly midMode: string;
  @ApiProperty()
  readonly tags: TagDTO[];
  @ApiProperty()
  readonly notes: string;
  @ApiProperty()
  readonly createdAt?: Date;
  @ApiProperty()
  readonly modifiedAt?: Date;
}
