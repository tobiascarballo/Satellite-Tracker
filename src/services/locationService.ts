import * as Location from 'expo-location';
import { GeodeticLocation } from '../types';

export const DEFAULT_OBSERVER: GeodeticLocation = {
  latitude: -32.4845,
  longitude: -58.2328,
  altitude: 0.025, // 25m
};

export class LocationService {
  public static async getCurrentLocation(): Promise<GeodeticLocation> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied, using default coordinates');
        return DEFAULT_OBSERVER;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: (loc.coords.altitude || 25) / 1000, // convert meters to km
      };
    } catch (e) {
      console.warn('Error fetching GPS location, using fallback:', e);
      return DEFAULT_OBSERVER;
    }
  }
}
