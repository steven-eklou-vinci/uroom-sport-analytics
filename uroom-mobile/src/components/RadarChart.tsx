import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { colors } from '../theme';

type RadarMetric = {
  label: string;
  value: number;
};

type RadarChartProps = {
  metrics: RadarMetric[];
  size?: number;
};

const GRID_LEVELS = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function RadarChart({ metrics, size = 180 }: RadarChartProps) {
  const count = Math.max(metrics.length, 3);
  const center = size / 2;
  const maxRadius = size * 0.32;
  const labelRadius = maxRadius + size * 0.12;
  const angleStep = (Math.PI * 2) / count;

  const toPoint = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const radius = clamp(ratio, 0, 1) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  const gridPolygons = Array.from({ length: GRID_LEVELS }, (_, level) => {
    const ratio = (level + 1) / GRID_LEVELS;
    const points = metrics
      .map((_, index) => {
        const point = toPoint(index, ratio);
        return `${point.x},${point.y}`;
      })
      .join(' ');
    return { points, key: `grid-${level}` };
  });

  const dataPoints = metrics.map((metric, index) => {
    const ratio = clamp(metric.value / 100, 0, 1);
    return toPoint(index, ratio);
  });

  const dataPolygon = dataPoints.map((point) => `${point.x},${point.y}`).join(' ');

  const labelItems = metrics.map((metric, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);
    const cos = Math.cos(angle);
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
    return {
      key: `label-${metric.label}`,
      x,
      y,
      anchor,
      text: `${metric.label} ${Math.round(metric.value)}`
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {gridPolygons.map((grid) => (
          <Polygon
            key={grid.key}
            points={grid.points}
            fill="none"
            stroke={colors.gray[600]}
            strokeWidth={1}
          />
        ))}
        {metrics.map((_, index) => {
          const point = toPoint(index, 1);
          return (
            <Line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke={colors.gray[700]}
              strokeWidth={1}
            />
          );
        })}
        <Polygon
          points={dataPolygon}
          fill="rgba(20, 184, 166, 0.25)"
          stroke={colors.secondary}
          strokeWidth={2}
        />
        {dataPoints.map((point, index) => (
          <Circle
            key={`dot-${index}`}
            cx={point.x}
            cy={point.y}
            r={3}
            fill={colors.secondary}
          />
        ))}
        {labelItems.map((label) => (
          <SvgText
            key={label.key}
            x={label.x}
            y={label.y}
            fill={colors.gray[200]}
            fontSize={10}
            textAnchor={label.anchor}
            alignmentBaseline="middle"
          >
            {label.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
