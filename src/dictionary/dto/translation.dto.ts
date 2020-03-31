import { ApiProperty } from '@nestjs/swagger';

export class TranslationDTO {
  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly text: string;
}
