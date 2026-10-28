import * as satellite from 'satellite.js';
import { GeodeticLocation, SatellitePass } from '../../types';
import { OrbitalEngine } from '../orbital/orbitalEngine';

export interface PredictPassesOptions {
  startDate?: Date;
  daysAhead?: number;          // Default 3 days
  minElevationDeg?: number;     // Default 10°
  coarseStepSeconds?: number;   // Default 120s
  fineStepSeconds?: number;     // Default 5s
  maxPasses?: number;           // Default 20
}

export class PredictionService {
  /**
   * Predicts visible passes for a satellite over an observer location.
   * Employs coarse-to-fine step refinement to ensure sub-second UI responsiveness.
   */
  public static predictPasses(
    satrec: satellite.SatRec,
    observer: GeodeticLocation,
    options: PredictPassesOptions = {}
  ): SatellitePass[] {
    const {
      startDate = new Date(),
      daysAhead = 3,
      minElevationDeg = 10,
      coarseStepSeconds = 120,
      fineStepSeconds = 5,
      maxPasses = 20,
    } = options;

    const passes: SatellitePass[] = [];
    const startTimeMs = startDate.getTime();
    const endTimeMs = startTimeMs + daysAhead * 24 * 60 * 60 * 1000;

    let currentTimeMs = startTimeMs;
    let prevElevation: number | null = null;
    let prevTimeMs = currentTimeMs;

    while (currentTimeMs < endTimeMs && passes.length < maxPasses) {
      const angles = OrbitalEngine.getLookAngles(
        satrec,
        new Date(currentTimeMs),
        observer
      );

      if (!angles) {
        currentTimeMs += coarseStepSeconds * 1000;
        continue;
      }

      const currentElevation = angles.elevation;

      // Check if satellite just rose above threshold or is rising
      if (prevElevation !== null && prevElevation < minElevationDeg && currentElevation >= minElevationDeg) {
        // Refine AOS backwards from currentTimeMs towards prevTimeMs
        const pass = this.refinePass(
          satrec,
          observer,
          prevTimeMs,
          currentTimeMs,
          minElevationDeg,
          fineStepSeconds
        );

        if (pass && pass.maxElevation.elevation >= minElevationDeg) {
          passes.push(pass);
          // Jump ahead to after LOS to search for the next pass
          currentTimeMs = pass.los.time + 60 * 1000;
          prevElevation = null;
          continue;
        }
      }

      prevElevation = currentElevation;
      prevTimeMs = currentTimeMs;
      currentTimeMs += coarseStepSeconds * 1000;
    }

    return passes;
  }

  /**
   * Refines the full pass (AOS, Max Elevation, LOS) using fine steps.
   */
  private static refinePass(
    satrec: satellite.SatRec,
    observer: GeodeticLocation,
    searchStartMs: number,
    approxRiseMs: number,
    minElevationDeg: number,
    fineStepSeconds: number
  ): SatellitePass | null {
    const fineStepMs = fineStepSeconds * 1000;

    // 1. Find exact AOS between searchStartMs and approxRiseMs
    let aosTimeMs = approxRiseMs;
    let aosAzimuth = 0;
    let aosElevation = minElevationDeg;

    for (let t = searchStartMs; t <= approxRiseMs + fineStepMs; t += fineStepMs) {
      const ang = OrbitalEngine.getLookAngles(satrec, new Date(t), observer);
      if (ang && ang.elevation >= minElevationDeg) {
        aosTimeMs = t;
        aosAzimuth = ang.azimuth;
        aosElevation = ang.elevation;
        break;
      }
    }

    // 2. Track pass until LOS (drops below minElevationDeg) and find peak max elevation
    let t = aosTimeMs;
    let maxEl = -90;
    let maxElTimeMs = t;
    let maxElAzimuth = 0;

    let losTimeMs = t;
    let losAzimuth = 0;
    let losElevation = minElevationDeg;

    // A typical LEO pass lasts between 5 and 20 minutes (max 30 mins)
    const maxSearchLimitMs = aosTimeMs + 35 * 60 * 1000;

    while (t <= maxSearchLimitMs) {
      const ang = OrbitalEngine.getLookAngles(satrec, new Date(t), observer);
      if (!ang) {
        t += fineStepMs;
        continue;
      }

      if (ang.elevation > maxEl) {
        maxEl = ang.elevation;
        maxElTimeMs = t;
        maxElAzimuth = ang.azimuth;
      }

      if (ang.elevation < minElevationDeg && t > aosTimeMs + fineStepMs) {
        losTimeMs = t;
        losAzimuth = ang.azimuth;
        losElevation = ang.elevation;
        break;
      }

      losTimeMs = t;
      losAzimuth = ang.azimuth;
      losElevation = ang.elevation;
      t += fineStepMs;
    }

    const durationSeconds = Math.round((losTimeMs - aosTimeMs) / 1000);
    if (durationSeconds <= 0 || maxEl < minElevationDeg) {
      return null;
    }

    return {
      id: `${satrec.satnum || 'sat'}_${aosTimeMs}`,
      satelliteNoradId: typeof satrec.satnum === 'number' ? satrec.satnum : parseInt(satrec.satnum as any, 10) || 0,
      satelliteName: '',
      aos: {
        time: aosTimeMs,
        azimuth: Math.round(aosAzimuth * 10) / 10,
        elevation: Math.round(aosElevation * 10) / 10,
      },
      maxElevation: {
        time: maxElTimeMs,
        azimuth: Math.round(maxElAzimuth * 10) / 10,
        elevation: Math.round(maxEl * 10) / 10,
      },
      los: {
        time: losTimeMs,
        azimuth: Math.round(losAzimuth * 10) / 10,
        elevation: Math.round(losElevation * 10) / 10,
      },
      durationSeconds,
      isVisible: maxEl >= minElevationDeg,
    };
  }
}
