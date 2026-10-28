import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEnvelope<T> {
  timestamp: number;
  data: T;
}

export class CacheService {
  private static PREFIX = '@satellite_cache_';

  /**
   * Saves data with current timestamp.
   */
  public static async set<T>(key: string, data: T): Promise<void> {
    try {
      const envelope: CacheEnvelope<T> = {
        timestamp: Date.now(),
        data,
      };
      await AsyncStorage.setItem(this.PREFIX + key, JSON.stringify(envelope));
    } catch (e) {
      console.warn('CacheService.set error:', e);
    }
  }

  /**
   * Retrieves data if not older than maxAgeHours.
   * If expired or not found, returns null.
   * If allowStale is true, returns cached data even if expired (useful for offline mode).
   */
  public static async get<T>(
    key: string,
    maxAgeHours: number = 24,
    allowStale: boolean = false
  ): Promise<{ data: T; ageHours: number; isStale: boolean } | null> {
    try {
      const raw = await AsyncStorage.getItem(this.PREFIX + key);
      if (!raw) return null;

      const envelope: CacheEnvelope<T> = JSON.parse(raw);
      const ageHours = (Date.now() - envelope.timestamp) / (1000 * 60 * 60);
      const isStale = ageHours > maxAgeHours;

      if (isStale && !allowStale) {
        return null;
      }

      return {
        data: envelope.data,
        ageHours: Math.round(ageHours * 10) / 10,
        isStale,
      };
    } catch (e) {
      console.warn('CacheService.get error:', e);
      return null;
    }
  }

  public static async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter((k) => k.startsWith(this.PREFIX));
      if (appKeys.length > 0) {
        await AsyncStorage.multiRemove(appKeys);
      }
    } catch (e) {
      console.warn('CacheService.clear error:', e);
    }
  }
}
