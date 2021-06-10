import { ApiProperty } from '@nestjs/swagger';
import { ScoreDTO } from './score.dto';

export class PredictiveRuleSetDTO {

  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly text: string;

  @ApiProperty()
  readonly notes: string;

  @ApiProperty()
  readonly conditionSet: any;

  @ApiProperty()
  readonly scores: ScoreDTO[];

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
