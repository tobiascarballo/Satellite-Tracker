import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { GeodeticLocation, GroundTrackSegment, SatellitePosition } from '../../types';

interface ConstellationItem {
  id: number;
  name: string;
  position: SatellitePosition;
}

interface SatelliteMapProps {
  currentPosition: SatellitePosition | null;
  satelliteName: string;
  groundTrackSegments: GroundTrackSegment[];
  footprintRadiusKm: number;
  observerLocation: GeodeticLocation;
  showConstellation: boolean;
  constellationSatellites: ConstellationItem[];
  onSelectSatellite?: (id: number) => void;
}

export const SatelliteMap: React.FC<SatelliteMapProps> = ({
  currentPosition,
  satelliteName,
  groundTrackSegments,
  footprintRadiusKm,
  observerLocation,
  showConstellation,
  constellationSatellites,
  onSelectSatellite,
}) => {
  const initialRegion = {
    latitude: currentPosition ? currentPosition.latitude : observerLocation.latitude,
    longitude: currentPosition ? currentPosition.longitude : observerLocation.longitude,
    latitudeDelta: 60,
    longitudeDelta: 60,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        mapType="standard"
      >
        {/* Observer (User GPS) Location Marker */}
        <Marker
          coordinate={{
            latitude: observerLocation.latitude,
            longitude: observerLocation.longitude,
          }}
          title="Tu ubicación (Observador)"
          description={`Lat: ${observerLocation.latitude.toFixed(2)}°, Lon: ${observerLocation.longitude.toFixed(2)}°`}
          pinColor="#10B981"
        />

        {/* Selected Satellite Footprint Coverage (Circle in meters) */}
        {currentPosition && footprintRadiusKm > 0 && (
          <Circle
            center={{
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
            }}
            radius={footprintRadiusKm * 1000} // Convert km to meters
            fillColor="rgba(56, 189, 248, 0.15)"
            strokeColor="rgba(56, 189, 248, 0.6)"
            strokeWidth={1.5}
          />
        )}

        {/* Ground Track Polylines (split across antimeridian) */}
        {groundTrackSegments.map((segment, index) => (
          <Polyline
            key={`gt_segment_${index}`}
            coordinates={segment.points}
            strokeColor="#0EA5E9"
            strokeWidth={2.5}
            lineDashPattern={[6, 3]}
          />
        ))}

        {/* Constellation Satellites Layer (e.g. Starlink subset) */}
        {showConstellation &&
          constellationSatellites.map((sat) => (
            <Marker
              key={`constellation_${sat.id}`}
              coordinate={{
                latitude: sat.position.latitude,
                longitude: sat.position.longitude,
              }}
              title={sat.name}
              description={`Alt: ${sat.position.altitude.toFixed(0)} km`}
              onPress={() => onSelectSatellite && onSelectSatellite(sat.id)}
            >
              <View style={styles.constellationMarker}>
                <View style={styles.constellationDot} />
              </View>
            </Marker>
          ))}

        {/* Primary Selected Satellite Marker */}
        {currentPosition && (
          <Marker
            coordinate={{
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
            }}
            title={satelliteName}
            description={`Alt: ${currentPosition.altitude.toFixed(0)} km | Vel: ${currentPosition.velocityKmS.toFixed(1)} km/s`}
            pinColor="#0284C7"
          >
            <View style={styles.primaryMarkerContainer}>
              <View style={styles.radarPulse} />
              <View style={styles.satelliteIconBubble}>
                <Text style={styles.satelliteIconText}>🛰️</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 320,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  primaryMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  radarPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  satelliteIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  satelliteIconText: {
    fontSize: 14,
  },
  constellationMarker: {
    padding: 3,
  },
  constellationDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
