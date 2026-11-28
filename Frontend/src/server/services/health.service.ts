import os from 'os';
import { env } from '../config';
import { verifyDatabaseConnection } from '../database/connection';

export interface HealthCheckData {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
  database: {
    status: 'connected' | 'disconnected';
    database?: string;
    serverVersion?: string;
    latencyMs?: number;
    error?: string;
  };
  system?: {
    memory: {
      totalMb: number;
      freeMb: number;
      usedMb: number;
    };
    nodeVersion: string;
    platform: string;
  };
}

export class HealthService {
  public static async getHealth(verbose = false): Promise<HealthCheckData> {
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024));

    const dbCheck = await verifyDatabaseConnection();
    const isProduction = env.NODE_ENV === 'production';

    const response: HealthCheckData = {
      status: dbCheck.connected ? 'healthy' : 'degraded',
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: isProduction
        ? {
            status: dbCheck.connected ? 'connected' : 'disconnected',
          }
        : {
            status: dbCheck.connected ? 'connected' : 'disconnected',
            database: dbCheck.database,
            serverVersion: dbCheck.serverVersion,
            latencyMs: dbCheck.latencyMs,
            error: dbCheck.error,
          },
    };

    if (verbose && !isProduction) {
      response.system = {
        memory: {
          totalMb: totalMem,
          freeMb: freeMem,
          usedMb: totalMem - freeMem,
        },
        nodeVersion: process.version,
        platform: process.platform,
      };
    }

    return response;
  }
}
