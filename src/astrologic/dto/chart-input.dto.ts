import { ApiProperty } from '@nestjs/swagger';

/*
Simple DTO for core input data required to construct a chart
*/
export class ChartInputDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly datetime: string;

  @ApiProperty()
  readonly lat: number;

  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly alt: number;

  @ApiProperty()
  readonly isDefaultBirthChart: boolean;

  @ApiProperty()
  readonly name?: string;

  @ApiProperty()
  readonly type?: string;

  @ApiProperty()
  readonly gender?: string;

  @ApiProperty()
  readonly eventType?: string;

  @ApiProperty()
  readonly roddenScale?: string;
}
