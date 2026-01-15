import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetEventsDto {
  @ApiPropertyOptional({
    description: 'Block awal (optional)',
    example: 3000000,
  })
  fromBlock?: number;

  @ApiPropertyOptional({
    description: 'Block akhir (optional)',
    example: 3000500,
  })
  toBlock?: number;
}
