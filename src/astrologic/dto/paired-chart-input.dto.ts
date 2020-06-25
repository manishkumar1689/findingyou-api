import { ApiProperty } from '@nestjs/swagger';
import { TagDTO } from './tag.dto';

/*
Simple DTO for core input data required to construct a chart
*/
export class PairedChartInputDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly c1: string;

  @ApiProperty()
  readonly c2: string;

  @ApiProperty()
  readonly tags: TagDTO[];

  @ApiProperty()
  readonly notes: string;
}
