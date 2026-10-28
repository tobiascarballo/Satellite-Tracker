import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as satellite from 'satellite.js';
import {
  GeodeticLocation,
  GroundTrackSegment,
  SatellitePass,
  SatellitePosition,
  SatelliteRecord,
  TopocentricCoordinates,
} from './src/types';
import { OrbitalEngine } from './src/core/orbital/orbitalEngine';
import { calculateFootprintRadiusKm } from './src/core/geometry/geometry';
import { PredictionService } from './src/core/prediction/predictionService';
import { SatelliteRepository } from './src/data/repository/SatelliteRepository';
import { DEFAULT_SATELLITES } from './src/data/repository/defaultSatellites';
import { DEFAULT_OBSERVER, LocationService } from './src/services/locationService';

// Screens
import { TrackerScreen } from './src/ui/screens/TrackerScreen';
import { CatalogScreen } from './src/ui/screens/CatalogScreen';
import { PassesScreen } from './src/ui/screens/PassesScreen';
import { CompassScreen } from './src/ui/screens/CompassScreen';
import { ValidationScreen } from './src/ui/screens/ValidationScreen';

type ScreenName = 'tracker' | 'catalog' | 'passes' | 'compass' | 'validation';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('tracker');

  // Selected Satellite & SatRec
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteRecord>(
    DEFAULT_SATELLITES[0]
  );
  const satrecRef = useRef<satellite.SatRec | null>(null);

  // Observer GPS
  const [observerLocation, setObserverLocation] = useState<GeodeticLocation>(DEFAULT_OBSERVER);

  // Dynamic Telemetry (Refreshed every 1 second locally)
  const [currentPosition, setCurrentPosition] = useState<SatellitePosition | null>(null);
  const [lookAngles, setLookAngles] = useState<TopocentricCoordinates | null>(null);

  // Geometry
  const [groundTrackSegments, setGroundTrackSegments] = useState<GroundTrackSegment[]>([]);
  const [minElevationDeg, setMinElevationDeg] = useState<number>(10);
  const [footprintRadiusKm, setFootprintRadiusKm] = useState<number>(2000);

  // Catalog & Constellation
  const [catalog, setCatalog] = useState<SatelliteRecord[]>(DEFAULT_SATELLITES);
  const [activeCategory, setActiveCategory] = useState<'stations' | 'starlink' | 'gps' | 'weather'>('stations');
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('Bundled');
  const [dataAgeHours, setDataAgeHours] = useState<number>(0);

  // Constellation Layer
  const [showConstellation, setShowConstellation] = useState<boolean>(false);
  const [constellationItems, setConstellationItems] = useState<
    Array<{ id: number; name: string; position: SatellitePosition }>
  >([]);

  // Passes
  const [passes, setPasses] = useState<SatellitePass[]>([]);

  // 1. Initialize Observer Location & Initial Catalog
  useEffect(() => {
    LocationService.getCurrentLocation().then(setObserverLocation);
    loadCatalog('stations');
  }, []);

  const loadCatalog = async (cat: 'stations' | 'starlink' | 'gps' | 'weather') => {
    setCatalogLoading(true);
    setActiveCategory(cat);
    try {
      const res = await SatelliteRepository.getCatalog(cat);
      setCatalog(res.satellites);
      setDataSource(res.source);
      setDataAgeHours(res.ageHours);
    } catch (e) {
      console.warn('Error loading catalog:', e);
    } finally {
      setCatalogLoading(false);
    }
  };

  // 2. Parse SatRec when selectedSatellite changes
  useEffect(() => {
    try {
      const satrec = OrbitalEngine.parseTLE(
        selectedSatellite.line1,
        selectedSatellite.line2
      );
      satrecRef.current = satrec;

      // Immediately calculate ground track and passes
      const tracks = OrbitalEngine.generateGroundTrack(satrec, new Date(), 45, 90, 60);
      setGroundTrackSegments(tracks);

      const predictedPasses = PredictionService.predictPasses(satrec, observerLocation, {
        daysAhead: 3,
        minElevationDeg,
      }).map((p) => ({ ...p, satelliteName: selectedSatellite.name }));
      setPasses(predictedPasses);
    } catch (e) {
      console.warn('Error updating satellite satrec:', e);
    }
  }, [selectedSatellite, observerLocation, minElevationDeg]);

  // 3. Real-Time Telemetry Loop (1 second local refresh)
  useEffect(() => {
    const updatePosition = () => {
      if (!satrecRef.current) return;
      const now = new Date();
      const pos = OrbitalEngine.getPosition(satrecRef.current, now);
      const angles = OrbitalEngine.getLookAngles(satrecRef.current, now, observerLocation);

      if (pos) {
        setCurrentPosition(pos);
        const fpRadius = calculateFootprintRadiusKm(pos.altitude, minElevationDeg);
        setFootprintRadiusKm(fpRadius);
      }
      if (angles) {
        setLookAngles(angles);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 1000);
    return () => clearInterval(interval);
  }, [observerLocation, minElevationDeg]);

  // 4. Constellation Layer Update (Batch calculation with 5s throttling to save battery/UI thread)
  useEffect(() => {
    if (!showConstellation) {
      setConstellationItems([]);
      return;
    }

    const updateConstellation = () => {
      const starlinks = catalog.filter((s) => s.category === 'starlink').slice(0, 30);
      const now = new Date();
      const items: Array<{ id: number; name: string; position: SatellitePosition }> = [];

      for (const sat of starlinks) {
        try {
          const rec = OrbitalEngine.parseTLE(sat.line1, sat.line2);
          const pos = OrbitalEngine.getPosition(rec, now);
          if (pos) {
            items.push({ id: sat.noradId, name: sat.name, position: pos });
          }
        } catch {
          // ignore corrupted TLE
        }
      }
      setConstellationItems(items);
    };

    updateConstellation();
    const interval = setInterval(updateConstellation, 5000);
    return () => clearInterval(interval);
  }, [showConstellation, catalog]);

  const handleSelectSatellite = (sat: SatelliteRecord) => {
    setSelectedSatellite(sat);
    setCurrentScreen('tracker');
  };

  const handleSelectConstellationSat = (id: number) => {
    const found = catalog.find((s) => s.noradId === id);
    if (found) {
      setSelectedSatellite(found);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Screen Body */}
      <View style={styles.screenContainer}>
        {currentScreen === 'tracker' && (
          <TrackerScreen
            selectedSatellite={selectedSatellite}
            currentPosition={currentPosition}
            lookAngles={lookAngles}
            groundTrackSegments={groundTrackSegments}
            footprintRadiusKm={footprintRadiusKm}
            observerLocation={observerLocation}
            minElevationDeg={minElevationDeg}
            onChangeMinElevation={setMinElevationDeg}
            showConstellation={showConstellation}
            onToggleConstellation={setShowConstellation}
            constellationSatellites={constellationItems}
            onSelectConstellationSat={handleSelectConstellationSat}
            onOpenPasses={() => setCurrentScreen('passes')}
            onOpenCompass={() => setCurrentScreen('compass')}
            onOpenValidation={() => setCurrentScreen('validation')}
          />
        )}

        {currentScreen === 'catalog' && (
          <CatalogScreen
            satellites={catalog}
            selectedSatId={selectedSatellite.noradId}
            onSelectSatellite={handleSelectSatellite}
            onFilterCategory={loadCatalog}
            activeCategory={activeCategory}
            loading={catalogLoading}
            dataSource={dataSource}
            dataAgeHours={dataAgeHours}
          />
        )}

        {currentScreen === 'passes' && (
          <PassesScreen
            satelliteName={selectedSatellite.name}
            passes={passes}
            currentCoordinates={lookAngles}
            onBack={() => setCurrentScreen('tracker')}
          />
        )}

        {currentScreen === 'compass' && (
          <CompassScreen
            satelliteName={selectedSatellite.name}
            lookAngles={lookAngles}
            onBack={() => setCurrentScreen('tracker')}
          />
        )}

        {currentScreen === 'validation' && (
          <ValidationScreen onBack={() => setCurrentScreen('tracker')} />
        )}
      </View>

      {/* Persistent Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('tracker')}
        >
          <Text style={[styles.navIcon, currentScreen === 'tracker' && styles.activeNavIcon]}>
            🛰️
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'tracker' && styles.activeNavLabel]}>
            Seguimiento
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('catalog')}
        >
          <Text style={[styles.navIcon, currentScreen === 'catalog' && styles.activeNavIcon]}>
            🔍
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'catalog' && styles.activeNavLabel]}>
            Catálogo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('passes')}
        >
          <Text style={[styles.navIcon, currentScreen === 'passes' && styles.activeNavIcon]}>
            📅
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'passes' && styles.activeNavLabel]}>
            Pases
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('compass')}
        >
          <Text style={[styles.navIcon, currentScreen === 'compass' && styles.activeNavIcon]}>
            🧭
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'compass' && styles.activeNavLabel]}>
            Brújula
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('validation')}
        >
          <Text style={[styles.navIcon, currentScreen === 'validation' && styles.activeNavIcon]}>
            🔬
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'validation' && styles.activeNavLabel]}>
            Validación
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0B132B',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.6,
  },
  activeNavIcon: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  navLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  activeNavLabel: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
});
