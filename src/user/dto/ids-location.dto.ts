import { ApiProperty } from '@nestjs/swagger';

export class IdsLocationDTO {
  @ApiProperty()
  readonly ids: string[];

  @ApiProperty()
  readonly lng: number;

  @ApiProperty()
  readonly lat: number;

  @ApiProperty()
  readonly name: string;
}
