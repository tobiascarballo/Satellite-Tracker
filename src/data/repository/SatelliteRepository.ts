import { SatelliteRecord } from '../../types';
import { CacheService } from '../cache/cacheService';
import { CelesTrakProvider } from '../providers/CelesTrakProvider';
import { WhereTheIssProvider } from '../providers/WhereTheIssProvider';
import { DEFAULT_SATELLITES } from './defaultSatellites';

export class SatelliteRepository {
  private static celestrak = new CelesTrakProvider();
  private static whereTheIss = new WhereTheIssProvider();

  // Cache TTL: 18 hours (meets the 12-24h requirement)
  private static TTL_HOURS = 18;

  /**
   * Fetches satellite catalog by category with automatic caching, fallback, and offline handling.
   */
  public static async getCatalog(
    category: 'stations' | 'starlink' | 'gps' | 'weather' = 'stations',
    forceRefresh: boolean = false
  ): Promise<{ satellites: SatelliteRecord[]; source: string; ageHours: number; isStale: boolean }> {
    const cacheKey = `catalog_${category}`;

    if (!forceRefresh) {
      const cached = await CacheService.get<SatelliteRecord[]>(cacheKey, this.TTL_HOURS, true);
      if (cached && cached.data.length > 0) {
        return {
          satellites: cached.data,
          source: 'cache',
          ageHours: cached.ageHours,
          isStale: cached.isStale,
        };
      }
    }

    // Try live fetch from CelesTrak
    try {
      const liveData = await this.celestrak.getCatalog(category);
      if (liveData && liveData.length > 0) {
        await CacheService.set(cacheKey, liveData);
        return {
          satellites: liveData,
          source: 'CelesTrak',
          ageHours: 0,
          isStale: false,
        };
      }
    } catch (err) {
      console.warn(`SatelliteRepository live fetch failed for ${category}:`, err);
    }

    // Secondary fallback for ISS if stations failed
    if (category === 'stations') {
      try {
        const iss = await this.whereTheIss.getCatalog();
        if (iss && iss.length > 0) {
          return {
            satellites: iss,
            source: 'WhereTheISSAt (Fallback)',
            ageHours: 0,
            isStale: false,
          };
        }
      } catch (err) {
        console.warn('Fallback to WhereTheIss failed:', err);
      }
    }

    // Ultimate fallback: preloaded default records filtered by category
    const defaultFiltered = DEFAULT_SATELLITES.filter(
      (s) => category === 'stations' ? (s.category === 'station' || s.category === 'other') : s.category === category
    );

    return {
      satellites: defaultFiltered.length > 0 ? defaultFiltered : DEFAULT_SATELLITES,
      source: 'offline_bundled',
      ageHours: 24,
      isStale: true,
    };
  }

  /**
   * Retrieves orbital data for a specific NORAD ID.
   */
  public static async getSatellite(
    noradId: number,
    forceRefresh: boolean = false
  ): Promise<{ satellite: SatelliteRecord | null; source: string; ageHours: number }> {
    const cacheKey = `sat_${noradId}`;

    if (!forceRefresh) {
      const cached = await CacheService.get<SatelliteRecord>(cacheKey, this.TTL_HOURS, true);
      if (cached && cached.data) {
        return {
          satellite: cached.data,
          source: 'cache',
          ageHours: cached.ageHours,
        };
      }
    }

    // 1. WhereTheISS for ISS (25544)
    if (noradId === 25544) {
      try {
        const iss = await this.whereTheIss.getOrbitalData(25544);
        if (iss) {
          await CacheService.set(cacheKey, iss);
          return { satellite: iss, source: 'WhereTheISSAt', ageHours: 0 };
        }
      } catch (e) {
        console.warn('WhereTheISS fetch failed:', e);
      }
    }

    // 2. CelesTrak query
    try {
      const sat = await this.celestrak.getOrbitalData(noradId);
      if (sat) {
        await CacheService.set(cacheKey, sat);
        return { satellite: sat, source: 'CelesTrak', ageHours: 0 };
      }
    } catch (e) {
      console.warn('CelesTrak fetch failed:', e);
    }

    // 3. Bundled fallback
    const fallback = DEFAULT_SATELLITES.find((s) => s.noradId === noradId);
    return {
      satellite: fallback || null,
      source: 'offline_bundled',
      ageHours: 24,
    };
  }
}
