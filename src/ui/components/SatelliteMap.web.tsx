import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Svg, { Rect, Line, Circle, Polyline, G, Text as SvgText } from 'react-native-svg';
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

const MAP_WIDTH = 600;
const MAP_HEIGHT = 300;

// Converts geodetic lat/lon to 2D equirectangular SVG coordinates
function lonToX(lon: number): number {
  // Normalize lon to [-180, 180]
  const normalizedLon = (((lon + 180) % 360) + 360) % 360 - 180;
  return ((normalizedLon + 180) / 360) * MAP_WIDTH;
}

function latToY(lat: number): number {
  // Clamped to [-90, 90]
  const clampedLat = Math.max(-90, Math.min(90, lat));
  return ((90 - clampedLat) / 180) * MAP_HEIGHT;
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
  const obsX = lonToX(observerLocation.longitude);
  const obsY = latToY(observerLocation.latitude);

  const satX = currentPosition ? lonToX(currentPosition.longitude) : 0;
  const satY = currentPosition ? latToY(currentPosition.latitude) : 0;

  // Approximate pixel radius for the footprint
  // Earth circumference approx 40,075 km -> 360 degrees
  const kmPerPixelX = 40075 / MAP_WIDTH;
  const footprintPxRadius = Math.max(10, Math.min(MAP_WIDTH / 2, footprintRadiusKm / kmPerPixelX));

  return (
    <View style={styles.container}>
      {/* Header bar indicating web projection mode */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🌐 Modo Web: Proyección 2D Equirrectangular</Text>
        </View>
        <Text style={styles.subtext}>
          Para mapa satelital interactivo completo, abre la app en Android/iOS con Expo Go.
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <Svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width="100%"
          height="100%"
          style={styles.svg}
        >
          {/* Map Ocean Background */}
          <Rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0B132B" rx="8" />

          {/* Grid Lines - Longitude (every 30 deg) */}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => {
            const x = lonToX(lon);
            const isPrimeMeridian = lon === 0;
            return (
              <Line
                key={`grid_lon_${lon}`}
                x1={x}
                y1={0}
                x2={x}
                y2={MAP_HEIGHT}
                stroke={isPrimeMeridian ? '#38BDF8' : '#1E293B'}
                strokeWidth={isPrimeMeridian ? 1 : 0.8}
                strokeDasharray={isPrimeMeridian ? undefined : '4, 4'}
              />
            );
          })}

          {/* Grid Lines - Latitude (every 30 deg) */}
          {[-60, -30, 0, 30, 60].map((lat) => {
            const y = latToY(lat);
            const isEquator = lat === 0;
            return (
              <Line
                key={`grid_lat_${lat}`}
                x1={0}
                y1={y}
                x2={MAP_WIDTH}
                y2={y}
                stroke={isEquator ? '#38BDF8' : '#1E293B'}
                strokeWidth={isEquator ? 1.2 : 0.8}
                strokeDasharray={isEquator ? undefined : '4, 4'}
              />
            );
          })}

          {/* Equator & Meridian Labels */}
          <SvgText x={6} y={latToY(0) - 4} fill="#64748B" fontSize="9">
            Ecuador (0°)
          </SvgText>
          <SvgText x={lonToX(0) + 4} y={MAP_HEIGHT - 6} fill="#64748B" fontSize="9">
            Meridiano 0°
          </SvgText>

          {/* Ground Track Polylines */}
          {groundTrackSegments.map((segment, idx) => {
            const pointsString = segment.points
              .map((p) => `${lonToX(p.longitude)},${latToY(p.latitude)}`)
              .join(' ');

            return (
              <Polyline
                key={`web_track_${idx}`}
                points={pointsString}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeDasharray="4, 3"
                opacity={0.8}
              />
            );
          })}

          {/* Observer GPS Location */}
          <G>
            <Circle cx={obsX} cy={obsY} r={10} fill="rgba(16, 185, 129, 0.2)" />
            <Circle cx={obsX} cy={obsY} r={5} fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
            <SvgText x={obsX + 8} y={obsY + 3} fill="#10B981" fontSize="10" fontWeight="bold">
              Observador
            </SvgText>
          </G>

          {/* Constellation Satellites Layer */}
          {showConstellation &&
            constellationSatellites.map((sat) => {
              const cx = lonToX(sat.position.longitude);
              const cy = latToY(sat.position.latitude);
              return (
                <G key={`web_const_${sat.id}`}>
                  <Circle cx={cx} cy={cy} r={3.5} fill="#F59E0B" stroke="#FFFFFF" strokeWidth="0.8" />
                </G>
              );
            })}

          {/* Satellite Footprint Circle */}
          {currentPosition && footprintRadiusKm > 0 && (
            <Circle
              cx={satX}
              cy={satY}
              r={footprintPxRadius}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeDasharray="3, 3"
            />
          )}

          {/* Active Satellite Marker */}
          {currentPosition && (
            <G>
              <Circle cx={satX} cy={satY} r={16} fill="rgba(14, 165, 233, 0.25)" />
              <Circle cx={satX} cy={satY} r={8} fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
              <SvgText
                x={satX}
                y={satY - 12}
                textAnchor="middle"
                fill="#38BDF8"
                fontSize="11"
                fontWeight="bold"
              >
                🛰️ {satelliteName}
              </SvgText>
            </G>
          )}
        </Svg>
      </View>

      {/* Telemetry Footer */}
      {currentPosition && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Lat: {currentPosition.latitude.toFixed(2)}° | Lon: {currentPosition.longitude.toFixed(2)}° | Alt: {currentPosition.altitude.toFixed(0)} km | Vel: {currentPosition.velocityKmS.toFixed(1)} km/s
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 340,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0369A1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#F0F9FF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  subtext: {
    color: '#94A3B8',
    fontSize: 11,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});

