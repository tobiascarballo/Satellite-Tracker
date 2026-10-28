import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import Svg, { Circle, Polygon, Line, G } from 'react-native-svg';
import { TopocentricCoordinates } from '../../types';

interface CompassOverlayProps {
  targetCoordinates: TopocentricCoordinates | null;
  satelliteName: string;
}

export const CompassOverlay: React.FC<CompassOverlayProps> = ({
  targetCoordinates,
  satelliteName,
}) => {
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [sensorAvailable, setSensorAvailable] = useState<boolean>(true);

  useEffect(() => {
    let subscription: any = null;

    const setupSensor = async () => {
      const isAvailable = await Magnetometer.isAvailableAsync();
      setSensorAvailable(isAvailable);
      if (!isAvailable) return;

      Magnetometer.setUpdateInterval(100);
      subscription = Magnetometer.addListener((data) => {
        let { x, y } = data;
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        let heading = (angle + 360) % 360;
        setDeviceHeading(Math.round(heading));
      });
    };

    setupSensor();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const size = Math.min(Dimensions.get('window').width - 60, 280);
  const center = size / 2;
  const radius = center - 20;

  const targetAzimuth = targetCoordinates ? targetCoordinates.azimuth : 0;
  const targetElevation = targetCoordinates ? targetCoordinates.elevation : 0;

  // Relative angle to turn: targetAzimuth - deviceHeading
  const relativeAngleDeg = ((targetAzimuth - deviceHeading + 540) % 360) - 180;
  const isAligned = Math.abs(relativeAngleDeg) < 6;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Modo Orientación Asistida (Brújula)</Text>
      <Text style={styles.subtitle}>
        Apunta tu teléfono hacia {satelliteName}
      </Text>

      <View style={[styles.svgContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Compass Dial Outer Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="#0F172A"
            stroke={isAligned ? '#10B981' : '#334155'}
            strokeWidth={isAligned ? '3' : '2'}
          />

          {/* Compass Rose Tick Marks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const rad = ((deg - deviceHeading) * Math.PI) / 180;
            const x1 = center + (radius - 8) * Math.sin(rad);
            const y1 = center - (radius - 8) * Math.cos(rad);
            const x2 = center + radius * Math.sin(rad);
            const y2 = center - radius * Math.cos(rad);
            return (
              <Line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#64748B"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Target Satellite Direction Needle (rotated by relative angle) */}
          <G rotation={relativeAngleDeg} origin={`${center}, ${center}`}>
            {/* Pointer arrow to target */}
            <Polygon
              points={`${center},${center - radius + 15} ${center - 10},${center} ${center + 10},${center}`}
              fill={isAligned ? '#10B981' : '#38BDF8'}
            />
            <Polygon
              points={`${center},${center + radius - 15} ${center - 6},${center} ${center + 6},${center}`}
              fill="#475569"
            />
          </G>

          {/* Center Hub */}
          <Circle
            cx={center}
            cy={center}
            r={12}
            fill={isAligned ? '#10B981' : '#1E293B'}
            stroke="#64748B"
            strokeWidth="2"
          />
        </Svg>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Rumbo Actual</Text>
          <Text style={styles.metricValue}>{deviceHeading}°</Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Azimut Satélite</Text>
          <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
            {Math.round(targetAzimuth)}°
          </Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Elevación Requerida</Text>
          <Text
            style={[
              styles.metricValue,
              { color: targetElevation >= 0 ? '#10B981' : '#EF4444' },
            ]}
          >
            {Math.round(targetElevation)}°
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.statusText,
          { color: isAligned ? '#10B981' : '#F59E0B' },
        ]}
      >
        {isAligned
          ? '✓ ¡Alineado con el satélite!'
          : `Gira ${Math.abs(Math.round(relativeAngleDeg))}° hacia la ${
              relativeAngleDeg > 0 ? 'derecha' : 'izquierda'
            }`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  statusText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
});
