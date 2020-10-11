import { ApiProperty } from '@nestjs/swagger';
import { CategoryDTO } from './category.dto';
import { RuleSetDTO } from './rule-set.dto';

export class RulesCollectionDTO {
  @ApiProperty()
  readonly user: string;

  @ApiProperty()
  readonly name: string;
  @ApiProperty()
  readonly notes?: string;

  @ApiProperty()
  readonly rules: RuleSetDTO[];

  @ApiProperty()
  readonly categories: CategoryDTO[];

  @ApiProperty()
  readonly weight: number;

  @ApiProperty()
  readonly createdAt: Date;

  @ApiProperty()
  readonly modifiedAt: Date;
}
