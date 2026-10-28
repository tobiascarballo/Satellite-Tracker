import * as satellite from 'satellite.js';
import {
  GeodeticLocation,
  TopocentricCoordinates,
  SatellitePosition,
  GroundTrackSegment,
} from '../../types';
import { splitTrackAtAntimeridian } from '../geometry/geometry';

export class OrbitalEngine {
  /**
   * Initializes a satellite record from Two-Line Element (TLE) set or 3-line format.
   */
  public static parseTLE(line1: string, line2: string): satellite.SatRec {
    return satellite.twoline2satrec(line1.trim(), line2.trim());
  }

  /**
   * Initializes a satellite record from OMM / JSON format (for 6-digit catalog numbers / Starlink).
   */
  public static parseOMM(ommJson: any): satellite.SatRec {
    if (typeof (satellite as any).json2satrec === 'function') {
      return (satellite as any).json2satrec(ommJson);
    }
    // Fallback if provided with TLE representation inside OMM
    if (ommJson.TLE_LINE1 && ommJson.TLE_LINE2) {
      return satellite.twoline2satrec(ommJson.TLE_LINE1, ommJson.TLE_LINE2);
    }
    throw new Error('Unsupported OMM format: json2satrec is not available or lines missing');
  }

  /**
   * Calculates instantaneous satellite geodetic position and velocity at a given Date.
   */
  public static getPosition(
    satrec: satellite.SatRec,
    date: Date = new Date()
  ): SatellitePosition | null {
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (
      !positionAndVelocity ||
      !positionAndVelocity.position ||
      typeof positionAndVelocity.position === 'boolean' ||
      !positionAndVelocity.velocity ||
      typeof positionAndVelocity.velocity === 'boolean'
    ) {
      return null;
    }

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(
      positionAndVelocity.position as satellite.EciVec3<number>,
      gmst
    );

    const lat = satellite.degreesLat(geodetic.latitude);
    const lon = satellite.degreesLong(geodetic.longitude);
    const alt = geodetic.height; // Kilometers

    const vel = positionAndVelocity.velocity as satellite.EciVec3<number>;
    const velocityKmS = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

    return {
      latitude: lat,
      longitude: lon,
      altitude: alt,
      velocityKmS,
      timestamp: date.getTime(),
    };
  }

  /**
   * Calculates topocentric look angles (Azimuth, Elevation, Range)
   * relative to a ground observer location at a given Date.
   */
  public static getLookAngles(
    satrec: satellite.SatRec,
    date: Date,
    observer: GeodeticLocation
  ): TopocentricCoordinates | null {
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (
      !positionAndVelocity ||
      !positionAndVelocity.position ||
      typeof positionAndVelocity.position === 'boolean'
    ) {
      return null;
    }

    const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
    const gmst = satellite.gstime(date);

    // Convert observer location to radians and geodetic coords
    const observerGeodetic = {
      longitude: (observer.longitude * Math.PI) / 180,
      latitude: (observer.latitude * Math.PI) / 180,
      height: observer.altitude, // in km
    };

    // Calculate ECF coordinates
    const positionEcf = satellite.eciToEcf(positionEci, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGeodetic, positionEcf);

    const radToDeg = (rad: number) => (rad * 180) / Math.PI;
    const azimuth = (radToDeg(lookAngles.azimuth) + 360) % 360;
    const elevation = radToDeg(lookAngles.elevation);
    const rangeKm = lookAngles.rangeSat;

    return {
      azimuth,
      elevation,
      rangeKm,
    };
  }

  /**
   * Generates past and future ground track coordinates, cleanly splitting at the antimeridian.
   * 
   * @param satrec Satellite record
   * @param centerDate Center time (typically current time)
   * @param pastMinutes Minutes to trace backwards (default 45 min)
   * @param futureMinutes Minutes to trace forward (default 90 min - full LEO orbit)
   * @param stepSeconds Sampling step in seconds (default 30 s)
   */
  public static generateGroundTrack(
    satrec: satellite.SatRec,
    centerDate: Date = new Date(),
    pastMinutes: number = 45,
    futureMinutes: number = 90,
    stepSeconds: number = 30
  ): GroundTrackSegment[] {
    const totalDurationSeconds = (pastMinutes + futureMinutes) * 60;
    const totalSteps = Math.floor(totalDurationSeconds / stepSeconds);
    const startTimeMs = centerDate.getTime() - pastMinutes * 60 * 1000;

    const rawPoints: Array<{ latitude: number; longitude: number }> = [];

    for (let i = 0; i <= totalSteps; i++) {
      const stepDate = new Date(startTimeMs + i * stepSeconds * 1000);
      const pos = this.getPosition(satrec, stepDate);
      if (pos) {
        rawPoints.push({
          latitude: pos.latitude,
          longitude: pos.longitude,
        });
      }
    }

    const splitSegments = splitTrackAtAntimeridian(rawPoints);
    return splitSegments.map((segment) => ({ points: segment }));
  }
}
