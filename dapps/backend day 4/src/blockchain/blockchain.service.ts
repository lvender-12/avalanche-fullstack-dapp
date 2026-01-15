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
      transport: http('https://api.avax-test.network/ext/bc/C/rpc'),
    });

    this.contractAddress =
      '0x25F0B33C6A83eA7ee53f24a6c2871c50899B5ab2' as `0x${string}`;
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
  // 🔹 READ VALUE UPDATED EVENTS
  // =============================
  async getValueUpdatedEvents(
    fromBlock?: number,
    toBlock?: number,
  ) {
    try {
      const latestBlock = await this.client.getBlockNumber();

      // Default: 500 block terakhir
      const from = fromBlock
        ? BigInt(fromBlock)
        : latestBlock - 500n;

      const to = toBlock
        ? BigInt(toBlock)
        : latestBlock;

      if (from > to) {
        throw new BadRequestException(
          'fromBlock harus lebih kecil dari toBlock',
        );
      }

      if (to - from > 2048n) {
        throw new BadRequestException(
          'Range block terlalu besar (maksimal 2048 block)',
        );
      }

      const events = await this.client.getLogs({
        address: this.contractAddress,
        event: {
          type: 'event',
          name: 'ValueUpdated',
          inputs: [
            {
              name: 'newValue',
              type: 'uint256',
              indexed: false,
            },
          ],
        },
        fromBlock: from,
        toBlock: to,
      });

      return {
        meta: {
          fromBlock: from.toString(),
          toBlock: to.toString(),
          totalEvents: events.length,
        },
        data: events.map((event) => ({
          blockNumber: event.blockNumber?.toString(),
          value: event.args.newValue?.toString(),
          txHash: event.transactionHash,
        })),
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
      throw new ServiceUnavailableException(
        'RPC timeout. Silakan coba lagi.',
      );
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed')
    ) {
      throw new ServiceUnavailableException(
        'Gagal terhubung ke blockchain RPC.',
      );
    }

    throw new InternalServerErrorException(
      'Terjadi kesalahan saat membaca data blockchain.',
    );
  }
}
