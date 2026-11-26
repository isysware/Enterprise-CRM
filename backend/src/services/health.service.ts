import os from 'os';
import { env } from '../config';

export interface HealthCheckData {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
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
  public static getHealth(verbose = false): HealthCheckData {
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024));

    const response: HealthCheckData = {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    if (verbose) {
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
