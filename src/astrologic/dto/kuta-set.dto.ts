import { ApiProperty } from '@nestjs/swagger';
import { KeyNumValueDTO } from './key-num-value.dto';
import { RashiDTO } from './rashi.dto';

export class KutaSetDTO {
  @ApiProperty()
  readonly k1: string;

  @ApiProperty()
  readonly k2: string;

  @ApiProperty()
  readonly values: KeyNumValueDTO[];
}
