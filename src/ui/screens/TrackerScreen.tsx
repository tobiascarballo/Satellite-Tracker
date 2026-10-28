import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  GeodeticLocation,
  GroundTrackSegment,
  SatellitePosition,
  SatelliteRecord,
  TopocentricCoordinates,
} from '../../types';
import { SatelliteMap } from '../components/SatelliteMap';

interface TrackerScreenProps {
  selectedSatellite: SatelliteRecord;
  currentPosition: SatellitePosition | null;
  lookAngles: TopocentricCoordinates | null;
  groundTrackSegments: GroundTrackSegment[];
  footprintRadiusKm: number;
  observerLocation: GeodeticLocation;
  minElevationDeg: number;
  onChangeMinElevation: (deg: number) => void;
  showConstellation: boolean;
  onToggleConstellation: (val: boolean) => void;
  constellationSatellites: Array<{ id: number; name: string; position: SatellitePosition }>;
  onSelectConstellationSat: (id: number) => void;
  onOpenPasses: () => void;
  onOpenCompass: () => void;
  onOpenValidation: () => void;
}

export const TrackerScreen: React.FC<TrackerScreenProps> = ({
  selectedSatellite,
  currentPosition,
  lookAngles,
  groundTrackSegments,
  footprintRadiusKm,
  observerLocation,
  minElevationDeg,
  onChangeMinElevation,
  showConstellation,
  onToggleConstellation,
  constellationSatellites,
  onSelectConstellationSat,
  onOpenPasses,
  onOpenCompass,
  onOpenValidation,
}) => {
  const isVisibleNow = lookAngles && lookAngles.elevation >= minElevationDeg;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Selected Satellite Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.satName}>{selectedSatellite.name}</Text>
            <Text style={styles.satMeta}>
              NORAD #{selectedSatellite.noradId} • Categoría: {selectedSatellite.category || 'General'}
            </Text>
          </View>
          <View
            style={[
              styles.visibilityBadge,
              isVisibleNow ? styles.visibleBadge : styles.hiddenBadge,
            ]}
          >
            <Text style={styles.visibilityText}>
              {isVisibleNow ? 'EN COBERTURA' : 'BAJO HORIZONTE'}
            </Text>
          </View>
        </View>

        {/* Action Shortcuts */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity style={styles.shortcutBtn} onPress={onOpenPasses}>
            <Text style={styles.shortcutBtnText}>📅 Próximos Pases</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutBtn} onPress={onOpenCompass}>
            <Text style={styles.shortcutBtnText}>🧭 Brújula</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcutBtn} onPress={onOpenValidation}>
            <Text style={styles.shortcutBtnText}>🔬 Validar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map View */}
      <SatelliteMap
        currentPosition={currentPosition}
        satelliteName={selectedSatellite.name}
        groundTrackSegments={groundTrackSegments}
        footprintRadiusKm={footprintRadiusKm}
        observerLocation={observerLocation}
        showConstellation={showConstellation}
        constellationSatellites={constellationSatellites}
        onSelectSatellite={onSelectConstellationSat}
      />

      {/* Telemetry Dashboard */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Telemetría en Tiempo Real (SGP4)</Text>
      </View>

      <View style={styles.grid}>
        {/* Geodetic Coordinates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PUNTO SUBSATELITAL</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Latitud:</Text>
            <Text style={styles.statValue}>
              {currentPosition ? `${currentPosition.latitude.toFixed(4)}°` : '--'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Longitud:</Text>
            <Text style={styles.statValue}>
              {currentPosition ? `${currentPosition.longitude.toFixed(4)}°` : '--'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Altitud:</Text>
            <Text style={styles.statValue}>
              {currentPosition ? `${currentPosition.altitude.toFixed(1)} km` : '--'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Velocidad:</Text>
            <Text style={styles.statValue}>
              {currentPosition ? `${currentPosition.velocityKmS.toFixed(2)} km/s` : '--'}
            </Text>
          </View>
        </View>

        {/* Topocentric Look Angles (Relative to Observer GPS) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ÁNGULOS DE APUNTAMIENTO</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Azimut:</Text>
            <Text style={[styles.statValue, { color: '#38BDF8' }]}>
              {lookAngles ? `${lookAngles.azimuth.toFixed(1)}°` : '--'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Elevación:</Text>
            <Text
              style={[
                styles.statValue,
                { color: lookAngles && lookAngles.elevation >= 0 ? '#10B981' : '#EF4444' },
              ]}
            >
              {lookAngles ? `${lookAngles.elevation.toFixed(1)}°` : '--'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Distancia (Slant):</Text>
            <Text style={styles.statValue}>
              {lookAngles ? `${lookAngles.rangeKm.toFixed(0)} km` : '--'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Radio Footprint:</Text>
            <Text style={styles.statValue}>
              {footprintRadiusKm.toFixed(0)} km
            </Text>
          </View>
        </View>
      </View>

      {/* Configuration Controls */}
      <View style={styles.configCard}>
        <Text style={styles.configTitle}>Configuración de Visualización</Text>

        {/* Min Elevation Selector */}
        <Text style={styles.configSubtitle}>
          Elevación mínima de enlace (ITU-R): {minElevationDeg}°
        </Text>
        <View style={styles.chipRow}>
          {[0, 5, 10, 25].map((angle) => (
            <TouchableOpacity
              key={angle}
              style={[
                styles.elevChip,
                minElevationDeg === angle && styles.activeElevChip,
              ]}
              onPress={() => onChangeMinElevation(angle)}
            >
              <Text
                style={[
                  styles.elevChipText,
                  minElevationDeg === angle && styles.activeElevChipText,
                ]}
              >
                {angle}°
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Constellation Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Capa de Constelación (Starlink)</Text>
            <Text style={styles.toggleDesc}>
              Muestra satélites simultáneos con cálculo optimizado
            </Text>
          </View>
          <Switch
            value={showConstellation}
            onValueChange={onToggleConstellation}
            trackColor={{ false: '#334155', true: '#0284C7' }}
            thumbColor={showConstellation ? '#38BDF8' : '#64748B'}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  satName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  satMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  visibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visibleBadge: {
    backgroundColor: '#065F46',
  },
  hiddenBadge: {
    backgroundColor: '#374151',
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  shortcutBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  configCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  configTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  configSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  elevChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeElevChip: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  elevChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeElevChipText: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  toggleDesc: {
    fontSize: 11,
    color: '#64748B',
  },
});
