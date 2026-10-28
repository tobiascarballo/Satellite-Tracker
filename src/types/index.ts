export interface GeodeticLocation {
  latitude: number;   // Degrees (-90 to 90)
  longitude: number;  // Degrees (-180 to 180)
  altitude: number;   // Kilometers (above sea level)
}

export interface TopocentricCoordinates {
  azimuth: number;    // Degrees (0 to 360, 0 = North, 90 = East)
  elevation: number;  // Degrees (-90 to 90)
  rangeKm: number;    // Slant range to satellite in kilometers
}

export interface SatellitePosition {
  latitude: number;   // Subsatellite point latitude in degrees
  longitude: number;  // Subsatellite point longitude in degrees
  altitude: number;   // Altitude in km
  velocityKmS: number;// Velocity in km/s
  timestamp: number;  // Unix timestamp (ms)
}

export interface SatellitePass {
  id: string;
  satelliteNoradId: number;
  satelliteName: string;
  aos: {
    time: number;       // Unix timestamp ms
    azimuth: number;    // Degrees
    elevation: number;  // Degrees
  };
  maxElevation: {
    time: number;       // Unix timestamp ms
    azimuth: number;    // Degrees
    elevation: number;  // Degrees
  };
  los: {
    time: number;       // Unix timestamp ms
    azimuth: number;    // Degrees
    elevation: number;  // Degrees
  };
  durationSeconds: number;
  isVisible: boolean;   // Passes during night/twilight where satellite is illuminated (optional flag)
}

export interface GroundTrackSegment {
  points: Array<{ latitude: number; longitude: number }>;
}

export interface SatelliteRecord {
  noradId: number;
  name: string;
  line1: string;
  line2: string;
  epoch?: string;
  category?: 'station' | 'starlink' | 'gps' | 'weather' | 'other';
  lastUpdated: number; // Unix timestamp ms
}

export interface ValidationResult {
  noradId: number;
  satelliteName: string;
  timestamp: number;
  calculated: GeodeticLocation;
  external: GeodeticLocation;
  errorKm: number;
  source: 'WhereTheISSAt' | 'N2YO';
  tleAgeHours: number;
}
