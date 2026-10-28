import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TopocentricCoordinates } from '../../types';
import { CompassOverlay } from '../components/CompassOverlay';

interface CompassScreenProps {
  satelliteName: string;
  lookAngles: TopocentricCoordinates | null;
  onBack: () => void;
}

export const CompassScreen: React.FC<CompassScreenProps> = ({
  satelliteName,
  lookAngles,
  onBack,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Orientación Asistida</Text>
        <View style={{ width: 60 }} />
      </View>

      <CompassOverlay
        targetCoordinates={lookAngles}
        satelliteName={satelliteName}
      />

      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>¿Cómo usar la orientación asistida?</Text>
        <Text style={styles.guideStep}>
          1. Sostén el teléfono de forma horizontal (como una brújula tradicional).
        </Text>
        <Text style={styles.guideStep}>
          2. Gira tu cuerpo en la dirección de la flecha azul hasta que el anillo se ilumine en verde.
        </Text>
        <Text style={styles.guideStep}>
          3. Una vez alineado en azimut, inclina la vista hacia arriba respetando el ángulo de elevación indicado.
        </Text>
        <Text style={styles.guideTip}>
          💡 Consejo: Si la elevación es negativa (&lt; 0°), el satélite se encuentra debajo del horizonte terrestre y no será visible aún.
        </Text>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  guideCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  guideStep: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
    lineHeight: 18,
  },
  guideTip: {
    fontSize: 11,
    color: '#38BDF8',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
