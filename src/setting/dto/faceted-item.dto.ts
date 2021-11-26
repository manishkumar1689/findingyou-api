import { ApiProperty } from '@nestjs/swagger';

export class FacetedItemDTO {
  @ApiProperty()
  readonly key: string;
  readonly value: number;
}
