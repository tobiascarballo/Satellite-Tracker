import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, Path } from 'react-native-svg';
import { SatellitePass, TopocentricCoordinates } from '../../types';

interface SkyChartProps {
  pass?: SatellitePass | null;
  currentCoordinates?: TopocentricCoordinates | null;
  size?: number;
}

export const SkyChart: React.FC<SkyChartProps> = ({
  pass,
  currentCoordinates,
  size = Math.min(Dimensions.get('window').width - 40, 320),
}) => {
  const center = size / 2;
  const radius = center - 25; // padding for labels

  // Maps Azimuth & Elevation to (x, y) coordinates on the polar chart
  const polarToXY = (azimuthDeg: number, elevationDeg: number) => {
    const elClamped = Math.max(0, Math.min(90, elevationDeg));
    const r = radius * ((90 - elClamped) / 90);
    const azRad = (azimuthDeg * Math.PI) / 180;
    const x = center + r * Math.sin(azRad);
    const y = center - r * Math.cos(azRad);
    return { x, y };
  };

  // Generate trajectory path for the pass (AOS -> Max -> LOS)
  let trajectoryPath = '';
  let aosPoint = { x: 0, y: 0 };
  let maxPoint = { x: 0, y: 0 };
  let losPoint = { x: 0, y: 0 };

  if (pass) {
    aosPoint = polarToXY(pass.aos.azimuth, pass.aos.elevation);
    maxPoint = polarToXY(pass.maxElevation.azimuth, pass.maxElevation.elevation);
    losPoint = polarToXY(pass.los.azimuth, pass.los.elevation);

    // Quadratic Bezier curve through max elevation
    trajectoryPath = `M ${aosPoint.x.toFixed(1)} ${aosPoint.y.toFixed(1)} Q ${maxPoint.x.toFixed(1)} ${maxPoint.y.toFixed(1)} ${losPoint.x.toFixed(1)} ${losPoint.y.toFixed(1)}`;
  }

  // Current position point
  const currentPoint =
    currentCoordinates && currentCoordinates.elevation >= 0
      ? polarToXY(currentCoordinates.azimuth, currentCoordinates.elevation)
      : null;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Sky Background Circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="#0B132B"
          stroke="#1C2541"
          strokeWidth="2"
        />

        {/* Concentric Elevation Rings (30°, 60°) */}
        <Circle
          cx={center}
          cy={center}
          r={radius * (60 / 90)}
          fill="none"
          stroke="#3A506B"
          strokeDasharray="4,4"
          strokeWidth="1"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius * (30 / 90)}
          fill="none"
          stroke="#3A506B"
          strokeDasharray="4,4"
          strokeWidth="1"
        />

        {/* Center Point (Zenith 90°) */}
        <Circle cx={center} cy={center} r={3} fill="#48CAE4" />

        {/* Crosshair Axes (N-S, E-W) */}
        <Line
          x1={center}
          y1={center - radius}
          x2={center}
          y2={center + radius}
          stroke="#1C2541"
          strokeWidth="1.5"
        />
        <Line
          x1={center - radius}
          y1={center}
          x2={center + radius}
          y2={center}
          stroke="#1C2541"
          strokeWidth="1.5"
        />

        {/* Cardinal Directions Labels */}
        <SvgText
          x={center}
          y={center - radius - 8}
          fontSize="12"
          fontWeight="bold"
          fill="#48CAE4"
          textAnchor="middle"
        >
          N
        </SvgText>
        <SvgText
          x={center + radius + 12}
          y={center + 4}
          fontSize="12"
          fontWeight="bold"
          fill="#90E0EF"
          textAnchor="middle"
        >
          E
        </SvgText>
        <SvgText
          x={center}
          y={center + radius + 16}
          fontSize="12"
          fontWeight="bold"
          fill="#90E0EF"
          textAnchor="middle"
        >
          S
        </SvgText>
        <SvgText
          x={center - radius - 12}
          y={center + 4}
          fontSize="12"
          fontWeight="bold"
          fill="#90E0EF"
          textAnchor="middle"
        >
          W
        </SvgText>

        {/* Elevation Ring Labels */}
        <SvgText
          x={center + 6}
          y={center - radius * (60 / 90) + 4}
          fontSize="9"
          fill="#6C757D"
        >
          30°
        </SvgText>
        <SvgText
          x={center + 6}
          y={center - radius * (30 / 90) + 4}
          fontSize="9"
          fill="#6C757D"
        >
          60°
        </SvgText>

        {/* Trajectory curve if pass is present */}
        {pass && (
          <>
            <Path
              d={trajectoryPath}
              stroke="#00B4D8"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* AOS marker (Green) */}
            <Circle cx={aosPoint.x} cy={aosPoint.y} r={4.5} fill="#2EC4B6" />
            <SvgText
              x={aosPoint.x}
              y={aosPoint.y - 8}
              fontSize="10"
              fill="#2EC4B6"
              fontWeight="600"
              textAnchor="middle"
            >
              AOS ({pass.aos.elevation}°)
            </SvgText>

            {/* Max Elevation marker (Yellow) */}
            <Circle cx={maxPoint.x} cy={maxPoint.y} r={5} fill="#FFB703" />
            <SvgText
              x={maxPoint.x}
              y={maxPoint.y - 8}
              fontSize="10"
              fill="#FFB703"
              fontWeight="bold"
              textAnchor="middle"
            >
              Max {pass.maxElevation.elevation}°
            </SvgText>

            {/* LOS marker (Red) */}
            <Circle cx={losPoint.x} cy={losPoint.y} r={4.5} fill="#E63946" />
            <SvgText
              x={losPoint.x}
              y={losPoint.y + 14}
              fontSize="10"
              fill="#E63946"
              fontWeight="600"
              textAnchor="middle"
            >
              LOS ({pass.los.elevation}°)
            </SvgText>
          </>
        )}

        {/* Instantaneous live satellite position */}
        {currentPoint && (
          <>
            <Circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r={7}
              fill="rgba(0, 180, 216, 0.4)"
            />
            <Circle cx={currentPoint.x} cy={currentPoint.y} r={4} fill="#00F5D4" />
          </>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
