import { GeodeticLocation, SatelliteRecord } from '../../types';
import { IDataProvider } from './IDataProvider';
import { RateLimiter } from '../limiter/rateLimiter';

export class N2yoProvider implements IDataProvider {
  public readonly name = 'N2YO';
  private apiKey: string;
  private limiter = new RateLimiter(15); // Safe rate limit

  constructor(apiKey: string = '') {
    this.apiKey = apiKey;
  }

  public setApiKey(key: string) {
    this.apiKey = key;
  }

  public async getCatalog(): Promise<SatelliteRecord[]> {
    return []; // N2YO is primarily queried per satellite id, not bulk catalog
  }

  public async getOrbitalData(noradId: number): Promise<SatelliteRecord | null> {
    if (!this.apiKey) return null;

    return this.limiter.schedule(async () => {
      const url = `https://api.n2yo.com/rest/v1/satellite/tle/${noradId}&apiKey=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`N2YO HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.tle) return null;

      const lines = (data.tle as string).split('\r\n').filter(Boolean);
      return {
        noradId: data.info?.satid || noradId,
        name: data.info?.satname || `NORAD ${noradId}`,
        line1: lines[0] || '',
        line2: lines[1] || '',
        lastUpdated: Date.now(),
      };
    });
  }

  public async getValidationPosition(
    noradId: number,
    observerLat: number = 0,
    observerLon: number = 0,
    observerAlt: number = 0
  ): Promise<GeodeticLocation | null> {
    if (!this.apiKey) return null;

    return this.limiter.schedule(async () => {
      const url = `https://api.n2yo.com/rest/v1/satellite/positions/${noradId}/${observerLat}/${observerLon}/${observerAlt}/1/&apiKey=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`N2YO HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && data.positions && data.positions.length > 0) {
        const p = data.positions[0];
        return {
          latitude: p.satlatitude,
          longitude: p.satlongitude,
          altitude: p.sataltitude,
        };
      }
      return null;
    });
  }
}
