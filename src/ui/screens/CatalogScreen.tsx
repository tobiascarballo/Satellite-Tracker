import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SatelliteRecord } from '../../types';

interface CatalogScreenProps {
  satellites: SatelliteRecord[];
  selectedSatId: number;
  onSelectSatellite: (sat: SatelliteRecord) => void;
  onFilterCategory: (category: 'stations' | 'starlink' | 'gps' | 'weather') => void;
  activeCategory: string;
  loading: boolean;
  dataSource: string;
  dataAgeHours: number;
}

export const CatalogScreen: React.FC<CatalogScreenProps> = ({
  satellites,
  selectedSatId,
  onSelectSatellite,
  onFilterCategory,
  activeCategory,
  loading,
  dataSource,
  dataAgeHours,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSatellites = satellites.filter((sat) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      sat.name.toLowerCase().includes(query) ||
      sat.noradId.toString().includes(query)
    );
  });

  const categories: Array<{ id: 'stations' | 'starlink' | 'gps' | 'weather'; label: string }> = [
    { id: 'stations', label: 'Estaciones' },
    { id: 'starlink', label: 'Starlink' },
    { id: 'gps', label: 'GPS' },
    { id: 'weather', label: 'Meteorología' },
  ];

  return (
    <View style={styles.container}>
      {/* Category Filter Chips */}
      <View style={styles.categoriesRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              activeCategory === cat.id && styles.activeCategoryChip,
            ]}
            onPress={() => onFilterCategory(cat.id)}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === cat.id && styles.activeCategoryText,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por nombre o NORAD ID (ej: 25544, ISS)..."
        placeholderTextColor="#64748B"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Source & Age info banner */}
      <View style={styles.sourceBanner}>
        <Text style={styles.sourceText}>
          Fuente: <Text style={styles.boldText}>{dataSource}</Text> | Antigüedad:{' '}
          <Text style={dataAgeHours > 24 ? styles.staleText : styles.boldText}>
            {dataAgeHours}h {dataAgeHours > 24 ? '(Desactualizado)' : '(Válido)'}
          </Text>
        </Text>
      </View>

      {/* Loading Indicator or List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingText}>Cargando catálogo orbital...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSatellites}
          keyExtractor={(item) => item.noradId.toString()}
          renderItem={({ item }) => {
            const isSelected = item.noradId === selectedSatId;
            return (
              <TouchableOpacity
                style={[styles.itemCard, isSelected && styles.selectedItemCard]}
                onPress={() => onSelectSatellite(item)}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemId}>NORAD #{item.noradId}</Text>
                </View>
                <Text style={styles.itemSub} numberOfLines={1}>
                  {item.line1}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron satélites.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeCategoryChip: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  categoryText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeCategoryText: {
    color: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
    fontSize: 14,
  },
  sourceBanner: {
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sourceText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  boldText: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  staleText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  itemCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedItemCard: {
    borderColor: '#0284C7',
    backgroundColor: '#172554',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
    flex: 1,
  },
  itemId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
  },
  itemSub: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 13,
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
});
