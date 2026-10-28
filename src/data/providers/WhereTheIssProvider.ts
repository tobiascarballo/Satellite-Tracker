import { GeodeticLocation, SatelliteRecord } from '../../types';
import { IDataProvider } from './IDataProvider';
import { RateLimiter } from '../limiter/rateLimiter';

export class WhereTheIssProvider implements IDataProvider {
  public readonly name = 'WhereTheISSAt';
  private limiter = new RateLimiter(60); // 1 request / second max

  public async getCatalog(): Promise<SatelliteRecord[]> {
    const iss = await this.getOrbitalData(25544);
    return iss ? [iss] : [];
  }

  public async getOrbitalData(noradId: number): Promise<SatelliteRecord | null> {
    if (noradId !== 25544) {
      return null;
    }

    return this.limiter.schedule(async () => {
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544/tles');
      if (!res.ok) {
        throw new Error(`WhereTheISSAt HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        noradId: 25544,
        name: data.header || 'ISS (ZARYA)',
        line1: data.line1,
        line2: data.line2,
        category: 'station',
        lastUpdated: Date.now(),
      };
    });
  }

  public async getValidationPosition(noradId: number): Promise<GeodeticLocation | null> {
    if (noradId !== 25544) {
      return null;
    }

    return this.limiter.schedule(async () => {
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
      if (!res.ok) {
        throw new Error(`WhereTheISSAt HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude, // km
      };
    });
  }
}
