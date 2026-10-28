export const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates the great-circle distance between two geodetic coordinates using the Haversine formula.
 * @returns Distance in kilometers
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * 3D Euclidean distance between two points in geodetic space (lat, lon, alt)
 * taking Earth curvature and satellite altitude into account.
 */
export function distance3DKm(
  lat1: number,
  lon1: number,
  alt1Km: number,
  lat2: number,
  lon2: number,
  alt2Km: number
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const r1 = EARTH_RADIUS_KM + alt1Km;
  const r2 = EARTH_RADIUS_KM + alt2Km;

  const x1 = r1 * Math.cos(toRad(lat1)) * Math.cos(toRad(lon1));
  const y1 = r1 * Math.cos(toRad(lat1)) * Math.sin(toRad(lon1));
  const z1 = r1 * Math.sin(toRad(lat1));

  const x2 = r2 * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2));
  const y2 = r2 * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2));
  const z2 = r2 * Math.sin(toRad(lat2));

  return Math.sqrt(
    (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) + (z2 - z1) * (z2 - z1)
  );
}

/**
 * Calculates satellite footprint radius on Earth surface in kilometers,
 * given the satellite altitude and the minimum operational elevation angle.
 * 
 * Formula:
 * Earth central angle: theta = acos( (Re / (Re + h)) * cos(eps_min) ) - eps_min
 * Ground distance (radius): d = Re * theta
 * 
 * @param altitudeKm Satellite altitude above mean sea level in km
 * @param minElevationDeg Minimum elevation angle (ITU-R, e.g. 0° for radio horizon, 5°-25° for telecom/VSAT)
 * @returns Radius of coverage circle on Earth in kilometers
 */
export function calculateFootprintRadiusKm(
  altitudeKm: number,
  minElevationDeg: number = 0
): number {
  if (altitudeKm <= 0) return 0;
  const epsRad = (minElevationDeg * Math.PI) / 180;
  const ratio = (EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm)) * Math.cos(epsRad);
  const clampedRatio = Math.max(-1, Math.min(1, ratio));
  const centralAngleRad = Math.acos(clampedRatio) - epsRad;

  if (centralAngleRad <= 0) return 0;
  return EARTH_RADIUS_KM * centralAngleRad;
}

/**
 * Splits a list of consecutive track points across the Antimeridian (+180° / -180° longitude jump).
 * If consecutive points jump more than 180 degrees in longitude, the polyline is split into
 * separate segments to avoid rendering artifact lines across the world map.
 */
export function splitTrackAtAntimeridian(
  points: Array<{ latitude: number; longitude: number }>
): Array<Array<{ latitude: number; longitude: number }>> {
  if (points.length === 0) return [];

  const segments: Array<Array<{ latitude: number; longitude: number }>> = [];
  let currentSegment: Array<{ latitude: number; longitude: number }> = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const deltaLon = Math.abs(curr.longitude - prev.longitude);

    if (deltaLon > 180) {
      // Crossed antimeridian (+180 / -180)
      // Interpolate latitude at the antimeridian boundary for smooth appearance
      const prevSign = Math.sign(prev.longitude);
      const boundaryLonPrev = prevSign * 180;
      const boundaryLonCurr = -prevSign * 180;

      // Fraction of jump
      const wrappedPrev = prev.longitude;
      const wrappedCurr = curr.longitude + (prevSign > 0 ? 360 : -360);
      const fraction = (boundaryLonPrev - wrappedPrev) / (wrappedCurr - wrappedPrev || 1);
      const boundaryLat = prev.latitude + fraction * (curr.latitude - prev.latitude);

      currentSegment.push({ latitude: boundaryLat, longitude: boundaryLonPrev });
      segments.push(currentSegment);

      currentSegment = [{ latitude: boundaryLat, longitude: boundaryLonCurr }, curr];
    } else {
      currentSegment.push(curr);
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}
