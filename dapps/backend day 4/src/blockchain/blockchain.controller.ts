import { Body, Controller, Get, Post } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  // GET /blockchain/value
  @Get('value')
  getValue() {
    return this.blockchainService.getLatestValue();
  }

  // POST /blockchain/update-events
  // trigger untuk update events incremental ke file JSON
  @Post('update-events')
  updateEvents() {
    return this.blockchainService.updateEvents();
  }

  // GET /blockchain/events
  // baca events dari file JSON
  @Get('events')
  getEvents() {
    return this.blockchainService.getEventsFromFile();
  }
}
