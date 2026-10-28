import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ValidationResult } from '../../types';
import { ValidationService } from '../../data/validation/validationService';

interface ValidationScreenProps {
  onBack: () => void;
}

export const ValidationScreen: React.FC<ValidationScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<ValidationResult[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const runValidation = async () => {
    setLoading(true);
    setStatusMessage('Consultando API externa y propagando SGP4 local...');
    try {
      const res = await ValidationService.validateISS();
      if (res) {
        setCurrentResult(res);
        setHistory((prev) => [res, ...prev.slice(0, 9)]); // keep last 10
        setStatusMessage(
          `✓ Validación completada. Discrepancia calculada: ${res.errorKm} km.`
        );
      } else {
        setStatusMessage('Error: No se pudo obtener la posición externa de validación.');
      }
    } catch (e: any) {
      setStatusMessage(`Error en validación: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Laboratorio de Validación</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.description}>
        Compara la geoposición calculada localmente con el modelo SGP4 contra fuentes externas independientes (Where the ISS at? / N2YO) para medir y registrar la exactitud del cálculo.
      </Text>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.validateBtn, loading && styles.disabledBtn]}
        onPress={runValidation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.validateBtnText}>▶ Ejecutar Validación Cruzada (ISS)</Text>
        )}
      </TouchableOpacity>

      {statusMessage ? (
        <Text style={styles.statusText}>{statusMessage}</Text>
      ) : null}

      {/* Latest Result Card */}
      {currentResult && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {currentResult.satelliteName} (NORAD #{currentResult.noradId})
            </Text>
            <Text style={styles.resultSource}>Fuente: {currentResult.source}</Text>
          </View>

          {/* Big Error Metric */}
          <View style={styles.errorBanner}>
            <Text style={styles.errorLabel}>ERROR OBSERVADO EN SUPERFICIE</Text>
            <Text
              style={[
                styles.errorValue,
                { color: currentResult.errorKm < 15 ? '#10B981' : '#F59E0B' },
              ]}
            >
              {currentResult.errorKm} km
            </Text>
            <Text style={styles.errorSub}>
              {currentResult.errorKm < 15
                ? '✓ Alta precisión orbital dentro de la tolerancia SGP4 esperada'
                : '⚠ Desviación moderada debida a la antigüedad de los elementos orbitales'}
            </Text>
          </View>

          {/* Side by side comparison */}
          <View style={styles.comparisonRow}>
            <View style={styles.col}>
              <Text style={styles.colTitle}>CÁLCULO LOCAL (SGP4)</Text>
              <Text style={styles.colData}>Lat: {currentResult.calculated.latitude}°</Text>
              <Text style={styles.colData}>Lon: {currentResult.calculated.longitude}°</Text>
              <Text style={styles.colData}>Alt: {currentResult.calculated.altitude} km</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.colTitle}>REFERENCIA EXTERNA</Text>
              <Text style={styles.colData}>Lat: {currentResult.external.latitude}°</Text>
              <Text style={styles.colData}>Lon: {currentResult.external.longitude}°</Text>
              <Text style={styles.colData}>Alt: {currentResult.external.altitude} km</Text>
            </View>
          </View>
        </View>
      )}

      {/* Table of Historic Runs */}
      {history.length > 0 && (
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Registro de Muestras de Validación</Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { flex: 1.2 }]}>Hora</Text>
            <Text style={[styles.th, { flex: 1 }]}>Calc Lat/Lon</Text>
            <Text style={[styles.th, { flex: 1 }]}>Ext Lat/Lon</Text>
            <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>Error</Text>
          </View>

          {history.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1.2 }]}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
              <Text style={[styles.td, { flex: 1 }]}>
                {item.calculated.latitude.toFixed(1)}° / {item.calculated.longitude.toFixed(1)}°
              </Text>
              <Text style={[styles.td, { flex: 1 }]}>
                {item.external.latitude.toFixed(1)}° / {item.external.longitude.toFixed(1)}°
              </Text>
              <Text
                style={[
                  styles.td,
                  { flex: 0.8, textAlign: 'right', fontWeight: 'bold', color: '#38BDF8' },
                ]}
              >
                {item.errorKm} km
              </Text>
            </View>
          ))}
        </View>
      )}
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
  description: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  validateBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  validateBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusText: {
    fontSize: 12,
    color: '#38BDF8',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  resultSource: {
    fontSize: 11,
    color: '#64748B',
  },
  errorBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  errorLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 4,
  },
  errorValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  errorSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
  },
  colTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#38BDF8',
    marginBottom: 6,
  },
  colData: {
    fontSize: 11,
    color: '#CBD5E1',
    marginBottom: 3,
  },
  tableCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 6,
  },
  th: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  td: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
