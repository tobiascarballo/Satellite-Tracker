import { describe, test, expect } from '@jest/globals';
import { haversineDistanceKm, calculateFootprintRadiusKm, splitTrackAtAntimeridian } from '../geometry/geometry';
import { OrbitalEngine } from '../orbital/orbitalEngine';
import { PredictionService } from '../prediction/predictionService';

describe('Orbital and Geometric Core Modules', () => {
  // ISS TLE
  const issLine1 = '1 25544U 98067A   24080.52847222  .00014856  00000-0  26857-3 0  9993';
  const issLine2 = '2 25544  51.6416 254.9125 0004562 301.7694  58.3306 15.49842448444453';

  // Observer in Buenos Aires / Concepción del Uruguay (-32.48, -58.23)
  const observer = {
    latitude: -32.48,
    longitude: -58.23,
    altitude: 0.025, // 25 meters
  };

  test('Haversine distance calculates accurate surface distance', () => {
    // Distance between Buenos Aires (-34.6037, -58.3816) and Concepción del Uruguay (-32.4845, -58.2328)
    const dist = haversineDistanceKm(-34.6037, -58.3816, -32.4845, -58.2328);
    // Approximately 236 km
    expect(dist).toBeGreaterThan(230);
    expect(dist).toBeLessThan(245);
  });

  test('Footprint calculation adheres to ITU-R geometric coverage', () => {
    // For ISS at altitude ~420 km and min elevation 0°:
    // Earth central angle: acos(6371 / (6371 + 420)) ≈ 20.3° ≈ 0.355 rad
    // Radius ≈ 6371 * 0.355 ≈ 2260 km
    const radius0 = calculateFootprintRadiusKm(420, 0);
    expect(radius0).toBeGreaterThan(2100);
    expect(radius0).toBeLessThan(2400);

    // Higher min elevation angle (e.g. 10°) reduces footprint
    const radius10 = calculateFootprintRadiusKm(420, 10);
    expect(radius10).toBeLessThan(radius0);
    expect(radius10).toBeGreaterThan(1000);
  });

  test('splitTrackAtAntimeridian splits polylines crossing +/-180°', () => {
    const track = [
      { latitude: 10, longitude: 170 },
      { latitude: 12, longitude: 179 },
      { latitude: 14, longitude: -179 }, // Jump across antimeridian (+179 to -179 = delta 358°)
      { latitude: 16, longitude: -170 },
    ];

    const segments = splitTrackAtAntimeridian(track);
    expect(segments.length).toBe(2);
    // First segment ends at 180°
    expect(segments[0][segments[0].length - 1].longitude).toBe(180);
    // Second segment starts at -180°
    expect(segments[1][0].longitude).toBe(-180);
  });

  test('OrbitalEngine propagates position and velocity correctly', () => {
    const satrec = OrbitalEngine.parseTLE(issLine1, issLine2);
    expect(satrec).toBeDefined();

    // Propagate at epoch date (2024 Day 80: ~March 20, 2024)
    const epochDate = new Date(Date.UTC(2024, 2, 20, 12, 0, 0));
    const pos = OrbitalEngine.getPosition(satrec, epochDate);

    expect(pos).not.toBeNull();
    if (pos) {
      expect(pos.latitude).toBeGreaterThanOrEqual(-90);
      expect(pos.latitude).toBeLessThanOrEqual(90);
      expect(pos.longitude).toBeGreaterThanOrEqual(-180);
      expect(pos.longitude).toBeLessThanOrEqual(180);
      // LEO altitude for ISS is between 400 and 430 km
      expect(pos.altitude).toBeGreaterThan(380);
      expect(pos.altitude).toBeLessThan(450);
      // LEO velocity is around 7.5 - 7.7 km/s
      expect(pos.velocityKmS).toBeGreaterThan(7.0);
      expect(pos.velocityKmS).toBeLessThan(8.0);
    }
  });

  test('OrbitalEngine computes look angles (Azimuth and Elevation)', () => {
    const satrec = OrbitalEngine.parseTLE(issLine1, issLine2);
    const date = new Date(Date.UTC(2024, 2, 20, 12, 0, 0));
    const angles = OrbitalEngine.getLookAngles(satrec, date, observer);

    expect(angles).not.toBeNull();
    if (angles) {
      expect(angles.azimuth).toBeGreaterThanOrEqual(0);
      expect(angles.azimuth).toBeLessThanOrEqual(360);
      expect(angles.elevation).toBeGreaterThanOrEqual(-90);
      expect(angles.elevation).toBeLessThanOrEqual(90);
      expect(angles.rangeKm).toBeGreaterThan(300);
    }
  });

  test('OrbitalEngine generates ground track without gaps', () => {
    const satrec = OrbitalEngine.parseTLE(issLine1, issLine2);
    const centerDate = new Date(Date.UTC(2024, 2, 20, 12, 0, 0));
    const segments = OrbitalEngine.generateGroundTrack(satrec, centerDate, 45, 45, 60);

    expect(segments.length).toBeGreaterThanOrEqual(1);
    const totalPoints = segments.reduce((sum, s) => sum + s.points.length, 0);
    expect(totalPoints).toBeGreaterThan(80);
  });

  test('PredictionService detects visible satellite passes', () => {
    const satrec = OrbitalEngine.parseTLE(issLine1, issLine2);
    const startDate = new Date(Date.UTC(2024, 2, 20, 0, 0, 0));
    
    // Search over 2 days with 10° threshold
    const passes = PredictionService.predictPasses(satrec, observer, {
      startDate,
      daysAhead: 2,
      minElevationDeg: 10,
    });

    expect(passes.length).toBeGreaterThan(0);
    const pass = passes[0];
    expect(pass.aos.time).toBeLessThan(pass.maxElevation.time);
    expect(pass.maxElevation.time).toBeLessThan(pass.los.time);
    expect(pass.maxElevation.elevation).toBeGreaterThanOrEqual(10);
    expect(pass.durationSeconds).toBeGreaterThan(60); // Passes last more than a minute
  });
});
