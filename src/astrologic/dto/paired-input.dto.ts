import { ApiProperty } from '@nestjs/swagger';
import { DtCoordsDTO } from "./dt-coords.dto";

export class PairedInputDTO {
  @ApiProperty()
  readonly pairs: DtCoordsDTO[][];

  @ApiProperty()
  readonly eq?: number;

  @ApiProperty()
  readonly topo?: number;

  @ApiProperty()
  readonly ayanamsha?: string;

  @ApiProperty()
  readonly allCombos?: boolean;

  @ApiProperty()
  readonly bodies?: string[];

  @ApiProperty()
  readonly kutaSetKey?: string;

}
