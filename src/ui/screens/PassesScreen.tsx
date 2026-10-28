import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SatellitePass, TopocentricCoordinates } from '../../types';
import { SkyChart } from '../components/SkyChart';
import { NotificationService } from '../../services/notificationService';

interface PassesScreenProps {
  satelliteName: string;
  passes: SatellitePass[];
  currentCoordinates: TopocentricCoordinates | null;
  onBack: () => void;
}

export const PassesScreen: React.FC<PassesScreenProps> = ({
  satelliteName,
  passes,
  currentCoordinates,
  onBack,
}) => {
  const [selectedPass, setSelectedPass] = useState<SatellitePass | null>(
    passes.length > 0 ? passes[0] : null
  );
  const [scheduledPassIds, setScheduledPassIds] = useState<Set<string>>(new Set());

  const handleScheduleAlert = async (pass: SatellitePass) => {
    const notifId = await NotificationService.schedulePassAlert(pass, 10);
    if (notifId) {
      setScheduledPassIds((prev) => new Set(prev).add(pass.id));
      Alert.alert(
        '¡Notificación Programada!',
        `Recibirás un recordatorio 10 minutos antes del inicio del pase de ${satelliteName} (AOS: ${new Date(
          pass.aos.time
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`
      );
    } else {
      Alert.alert(
        'Aviso',
        'No se pudo programar el recordatorio (el pase está muy próximo o los permisos de notificación fueron denegados).'
      );
    }
  };

  const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Predicción de Pases</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Sky Chart Section */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Sky Chart Polar de Visibilidad</Text>
        <SkyChart
          pass={selectedPass}
          currentCoordinates={currentCoordinates}
          size={240}
        />
        {selectedPass && (
          <Text style={styles.chartSubtitle}>
            Trayectoria del pase: AOS {selectedPass.aos.azimuth}° → Max {selectedPass.maxElevation.elevation}° → LOS {selectedPass.los.azimuth}°
          </Text>
        )}
      </View>

      {/* Passes List */}
      <Text style={styles.listHeader}>Próximos Pases Calculados ({passes.length})</Text>

      <FlatList
        data={passes}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isSelected = selectedPass?.id === item.id;
          const isScheduled = scheduledPassIds.has(item.id);

          return (
            <TouchableOpacity
              style={[styles.passCard, isSelected && styles.selectedPassCard]}
              onPress={() => setSelectedPass(item)}
            >
              <View style={styles.passHeader}>
                <View>
                  <Text style={styles.passDate}>{formatDateTime(item.aos.time)}</Text>
                  <Text style={styles.passDuration}>
                    Duración: {Math.floor(item.durationSeconds / 60)}m {item.durationSeconds % 60}s
                  </Text>
                </View>
                <View style={styles.maxElBadge}>
                  <Text style={styles.maxElText}>Max {item.maxElevation.elevation}°</Text>
                </View>
              </View>

              <View style={styles.passDetails}>
                <Text style={styles.detailText}>
                  AOS: {new Date(item.aos.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.aos.azimuth}°)
                </Text>
                <Text style={styles.detailText}>
                  LOS: {new Date(item.los.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.los.azimuth}°)
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.alertBtn, isScheduled && styles.alertBtnActive]}
                onPress={() => handleScheduleAlert(item)}
              >
                <Text style={styles.alertBtnText}>
                  {isScheduled ? '✓ Recordatorio Activo (10 min)' : '🔔 Notificarme antes'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No se detectaron pases visibles con el umbral de elevación actual para los próximos 3 días.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#38BDF8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  chartCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#38BDF8',
    marginTop: 8,
    textAlign: 'center',
  },
  listHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
  },
  passCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedPassCard: {
    borderColor: '#0284C7',
    backgroundColor: '#172554',
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  passDuration: {
    fontSize: 11,
    color: '#94A3B8',
  },
  maxElBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  maxElText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  passDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  alertBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  alertBtnActive: {
    backgroundColor: '#065F46',
    borderColor: '#10B981',
  },
  alertBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
  },
});
