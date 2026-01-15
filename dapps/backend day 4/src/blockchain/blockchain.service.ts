import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { createPublicClient, http, PublicClient } from 'viem';
import { avalancheFuji } from 'viem/chains';
import SIMPLE_STORAGE from './simple-storage.json';

@Injectable()
export class BlockchainService {
  private client: PublicClient;
  private contractAddress: `0x${string}`;

  constructor() {
    this.client = createPublicClient({
      chain: avalancheFuji,
      transport: http(process.env.RPC_URL),
    });

    this.contractAddress =
      process.env.CONTRACT_ADDRESS as `0x${string}`;
  }

  // =============================
  // 🔹 READ LATEST VALUE
  // =============================
  async getLatestValue() {
    try {
      const value = (await this.client.readContract({
        address: this.contractAddress,
        abi: SIMPLE_STORAGE.abi,
        functionName: 'getValue',
      })) as bigint;

      return { value: value.toString() };
    } catch (error) {
      this.handleRpcError(error);
    }
  }

  // =============================
  // 🔹 READ VALUE UPDATED EVENTS (AUTO BATCH UNTUK BLOCK BESAR)
  // =============================
  async getValueUpdatedEvents(fromBlock?: number, toBlock?: number) {
    try {
      const latestBlock = await this.client.getBlockNumber();

      let from = fromBlock !== undefined ? BigInt(fromBlock) : latestBlock - 50_000n;
      let to = toBlock !== undefined ? BigInt(toBlock) : latestBlock;

      // =============================
      // ✅ SAFE LIMIT BLOCK
      // =============================
      if (from > latestBlock) from = latestBlock;
      if (to > latestBlock) to = latestBlock;

      if (from > to) {
        throw new BadRequestException('fromBlock harus <= toBlock (latest block)');
      }

      const MAX_BATCH = 2048n;
      let allEvents: any[] = [];
      let currentFrom = from;

      while (currentFrom <= to) {
        const currentTo =
          currentFrom + MAX_BATCH - 1n > to ? to : currentFrom + MAX_BATCH - 1n;

        const events = await this.client.getLogs({
          address: this.contractAddress,
          event: {
            type: 'event',
            name: 'ValueUpdated',
            inputs: [{ name: 'newValue', type: 'uint256', indexed: false }],
          },
          fromBlock: currentFrom,
          toBlock: currentTo,
        });

        allEvents.push(
          ...events.map(e => ({
            blockNumber: e.blockNumber?.toString(),
            value: e.args.newValue?.toString(),
            txHash: e.transactionHash,
          }))
        );

        currentFrom = currentTo + 1n;
      }

      return {
        meta: {
          fromBlock: from.toString(),
          toBlock: to.toString(),
          totalEvents: allEvents.length,
        },
        data: allEvents.reverse(),
      };
    } catch (error) {
      this.handleRpcError(error);
    }
  }


  // =============================
  // 🔹 RPC ERROR HANDLER
  // =============================
  private handleRpcError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);

    console.error('Blockchain error:', message);

    if (message.includes('timeout')) {
      throw new ServiceUnavailableException('RPC timeout. Silakan coba lagi.');
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('failed')) {
      throw new ServiceUnavailableException('Gagal terhubung ke blockchain RPC.');
    }

    throw new InternalServerErrorException('Terjadi kesalahan saat membaca data blockchain.');
  }
}
