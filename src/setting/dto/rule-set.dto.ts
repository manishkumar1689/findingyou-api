import { ApiProperty } from '@nestjs/swagger';
import { ScoreDTO } from './score.dto';

export class RuleSetDTO {
  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly category: string;

  @ApiProperty()
  readonly conditionSet: any;

  @ApiProperty()
  readonly scores: ScoreDTO[];
}
