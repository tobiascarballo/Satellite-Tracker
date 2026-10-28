import { SatelliteRecord } from '../../types';
import { IDataProvider } from './IDataProvider';
import { RateLimiter } from '../limiter/rateLimiter';

export class CelesTrakProvider implements IDataProvider {
  public readonly name = 'CelesTrak';
  // Respect CelesTrak polite usage guidelines (< 30 req/min)
  private limiter = new RateLimiter(20);

  public async getCatalog(category: string = 'stations'): Promise<SatelliteRecord[]> {
    return this.limiter.schedule(async () => {
      let url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle';

      if (category === 'starlink') {
        // Supplementary Starlink or group starlink
        url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle';
      } else if (category === 'gps') {
        url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle';
      } else if (category === 'weather') {
        url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle';
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`CelesTrak HTTP ${res.status}`);
      }

      const text = await res.text();
      return this.parseTLEString(text, category as any);
    });
  }

  public async getOrbitalData(noradId: number): Promise<SatelliteRecord | null> {
    return this.limiter.schedule(async () => {
      const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`CelesTrak HTTP ${res.status}`);
      }

      const text = await res.text();
      const records = this.parseTLEString(text);
      return records.length > 0 ? records[0] : null;
    });
  }

  /**
   * Parses 3-line or 2-line TLE blocks into structured SatelliteRecord objects.
   */
  public parseTLEString(
    rawText: string,
    category: SatelliteRecord['category'] = 'other'
  ): SatelliteRecord[] {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const records: SatelliteRecord[] = [];
    let i = 0;

    while (i < lines.length) {
      if (lines[i].startsWith('1 ') && i + 1 < lines.length && lines[i + 1].startsWith('2 ')) {
        // 2-line element without explicit title line
        const line1 = lines[i];
        const line2 = lines[i + 1];
        const noradId = parseInt(line1.substring(2, 7).trim(), 10);
        records.push({
          noradId,
          name: `NORAD ${noradId}`,
          line1,
          line2,
          category,
          lastUpdated: Date.now(),
        });
        i += 2;
      } else if (
        i + 2 < lines.length &&
        lines[i + 1].startsWith('1 ') &&
        lines[i + 2].startsWith('2 ')
      ) {
        // Standard 3-line format (Name, Line 1, Line 2)
        const name = lines[i];
        const line1 = lines[i + 1];
        const line2 = lines[i + 2];
        const noradId = parseInt(line1.substring(2, 7).trim(), 10);
        records.push({
          noradId,
          name: name.replace(/^0\s+/, ''), // Strip prefix if present
          line1,
          line2,
          category,
          lastUpdated: Date.now(),
        });
        i += 3;
      } else {
        i++;
      }
    }

    return records;
  }
}
