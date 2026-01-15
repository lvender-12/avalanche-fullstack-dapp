import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { createPublicClient, http, PublicClient } from 'viem';
import { avalancheFuji } from 'viem/chains';
import SIMPLE_STORAGE from './simple-storage.json';
import fs from 'fs';
import path from 'path';

@Injectable()
export class BlockchainService {
  private client: PublicClient;
  private contractAddress: `0x${string}`;
  private filePath = path.join(process.cwd(), 'data/events.json');

  // =============================
  // 🔹 GANTI INI DENGAN BLOCK DEPLOY KONTRAKMU
  // =============================
  private FIRST_CONTRACT_BLOCK = 50434269n;

  constructor() {
    this.client = createPublicClient({
      chain: avalancheFuji,
      transport: http(process.env.RPC_URL),
    });

    this.contractAddress = process.env.CONTRACT_ADDRESS as `0x${string}`;

    // Jika file JSON belum ada, buat default
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(
          { meta: { lastBlock: this.FIRST_CONTRACT_BLOCK - 1n, totalEvents: 0 }, data: [] },
          null,
          2,
        ),
      );
    }
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
  // 🔹 UPDATE EVENTS KE FILE JSON (INCREMENTAL)
  // =============================
  async updateEvents() {
    try {
      const latestBlock = await this.client.getBlockNumber();

      // baca file JSON
      const fileContent = fs.readFileSync(this.filePath, 'utf-8');
      const json = JSON.parse(fileContent);

      // Mulai dari block terakhir + 1, minimal FIRST_CONTRACT_BLOCK
      let fromBlock = BigInt(json.meta.lastBlock ?? this.FIRST_CONTRACT_BLOCK - 1n) + 1n;
      if (fromBlock < this.FIRST_CONTRACT_BLOCK) fromBlock = this.FIRST_CONTRACT_BLOCK;

      if (fromBlock > latestBlock)
        return { message: 'Sudah update sampai latest block', totalEvents: json.data.length };

      // batch size aman
      const BATCH_SIZE = 2048n;
      let currentFrom = fromBlock;

      while (currentFrom <= latestBlock) {
        const currentTo =
          currentFrom + BATCH_SIZE - 1n > latestBlock ? latestBlock : currentFrom + BATCH_SIZE - 1n;

        try {
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

          const mapped = events.map(e => ({
            blockNumber: e.blockNumber?.toString(),
            value: e.args.newValue?.toString(),
            txHash: e.transactionHash,
          }));

          if (mapped.length > 0) {
            json.data.push(...mapped);
          }

          console.log(`Fetched events from ${currentFrom} to ${currentTo} (batch ${BATCH_SIZE})`);

          // update meta dan simpan ke file setiap batch
          json.meta.lastBlock = Number(currentTo);
          json.meta.totalEvents = json.data.length;
          fs.writeFileSync(this.filePath, JSON.stringify(json, null, 2));

          currentFrom = currentTo + 1n;
        } catch (e) {
          console.warn(`Batch ${BATCH_SIZE} gagal di ${currentFrom} → ${currentTo}. Coba batch lebih kecil nanti.`);
          throw new ServiceUnavailableException(
            'RPC tidak bisa menangani batch saat ini. Coba range lebih kecil.',
          );
        }
      }

      return {
        message: `Update selesai sampai block ${latestBlock}`,
        totalEvents: json.data.length,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Gagal update events');
    }
  }

  // =============================
  // 🔹 GET EVENTS DARI FILE JSON
  // =============================
  getEventsFromFile() {
    try {
      const fileContent = fs.readFileSync(this.filePath, 'utf-8');
      const json = JSON.parse(fileContent);
      return { ...json, data: json.data.slice().reverse() }; // paling baru di atas
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Gagal baca events');
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

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('failed')
    ) {
      throw new ServiceUnavailableException('Gagal terhubung ke blockchain RPC.');
    }

    throw new InternalServerErrorException('Terjadi kesalahan saat membaca data blockchain.');
  }
}
