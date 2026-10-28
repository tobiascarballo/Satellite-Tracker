import { ValidationResult } from '../../types';
import { OrbitalEngine } from '../../core/orbital/orbitalEngine';
import { haversineDistanceKm, distance3DKm } from '../../core/geometry/geometry';
import { WhereTheIssProvider } from '../providers/WhereTheIssProvider';
import { N2yoProvider } from '../providers/N2yoProvider';
import { SatelliteRepository } from '../repository/SatelliteRepository';

export class ValidationService {
  private static whereTheIss = new WhereTheIssProvider();
  private static n2yo = new N2yoProvider();

  public static setN2yoApiKey(key: string) {
    this.n2yo.setApiKey(key);
  }

  /**
   * Compares the locally calculated SGP4 position against WhereTheISSAt live position.
   */
  public static async validateISS(): Promise<ValidationResult | null> {
    const satData = await SatelliteRepository.getSatellite(25544);
    if (!satData.satellite) return null;

    const satrec = OrbitalEngine.parseTLE(
      satData.satellite.line1,
      satData.satellite.line2
    );

    const now = new Date();
    // 1. Fetch real-time position from WhereTheISSAt
    const livePos = await this.whereTheIss.getValidationPosition(25544);
    if (!livePos) return null;

    // 2. Propagate locally via SGP4 for the same moment
    const localPos = OrbitalEngine.getPosition(satrec, now);
    if (!localPos) return null;

    // 3. Compute surface error in km via Haversine
    const errorKm = haversineDistanceKm(
      localPos.latitude,
      localPos.longitude,
      livePos.latitude,
      livePos.longitude
    );

    const total3DErrorKm = distance3DKm(
      localPos.latitude,
      localPos.longitude,
      localPos.altitude,
      livePos.latitude,
      livePos.longitude,
      livePos.altitude
    );

    return {
      noradId: 25544,
      satelliteName: satData.satellite.name,
      timestamp: now.getTime(),
      calculated: {
        latitude: Math.round(localPos.latitude * 10000) / 10000,
        longitude: Math.round(localPos.longitude * 10000) / 10000,
        altitude: Math.round(localPos.altitude * 10) / 10,
      },
      external: {
        latitude: Math.round(livePos.latitude * 10000) / 10000,
        longitude: Math.round(livePos.longitude * 10000) / 10000,
        altitude: Math.round(livePos.altitude * 10) / 10,
      },
      errorKm: Math.round(errorKm * 100) / 100,
      source: 'WhereTheISSAt',
      tleAgeHours: satData.ageHours,
    };
  }

  /**
   * Compares locally calculated SGP4 position against N2YO live position.
   */
  public static async validateWithN2yo(
    noradId: number,
    observerLat: number = 0,
    observerLon: number = 0,
    observerAlt: number = 0
  ): Promise<ValidationResult | null> {
    const satData = await SatelliteRepository.getSatellite(noradId);
    if (!satData.satellite) return null;

    const satrec = OrbitalEngine.parseTLE(
      satData.satellite.line1,
      satData.satellite.line2
    );

    const now = new Date();
    const livePos = await this.n2yo.getValidationPosition(
      noradId,
      observerLat,
      observerLon,
      observerAlt
    );

    if (!livePos) return null;

    const localPos = OrbitalEngine.getPosition(satrec, now);
    if (!localPos) return null;

    const errorKm = haversineDistanceKm(
      localPos.latitude,
      localPos.longitude,
      livePos.latitude,
      livePos.longitude
    );

    return {
      noradId,
      satelliteName: satData.satellite.name,
      timestamp: now.getTime(),
      calculated: {
        latitude: Math.round(localPos.latitude * 10000) / 10000,
        longitude: Math.round(localPos.longitude * 10000) / 10000,
        altitude: Math.round(localPos.altitude * 10) / 10,
      },
      external: {
        latitude: Math.round(livePos.latitude * 10000) / 10000,
        longitude: Math.round(livePos.longitude * 10000) / 10000,
        altitude: Math.round(livePos.altitude * 10) / 10,
      },
      errorKm: Math.round(errorKm * 100) / 100,
      source: 'N2YO',
      tleAgeHours: satData.ageHours,
    };
  }
}
