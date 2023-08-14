import { ApiProperty } from '@nestjs/swagger';

export class DtCoordsDTO {
  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly lat: number;

  @ApiProperty()
  readonly dt: string;

  @ApiProperty()
  readonly name?: string;

  @ApiProperty()
  readonly gender?: string;

}
