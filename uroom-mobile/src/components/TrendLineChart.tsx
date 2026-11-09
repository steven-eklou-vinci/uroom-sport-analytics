import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { colors } from '../theme';

type TrendPoint = {
  label: string;
  value: number;
};

type TrendLineChartProps = {
  data: TrendPoint[];
  width?: number;
  height?: number;
};

const DEFAULT_HEIGHT = 140;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function TrendLineChart({ data, width = 280, height = DEFAULT_HEIGHT }: TrendLineChartProps) {
  const safeData = data.length > 0 ? data : [{ label: '-', value: 0 }];
  const paddingX = 24;
  const paddingY = 22;
  const innerW = Math.max(1, width - paddingX * 2);
  const innerH = Math.max(1, height - paddingY * 2);
  const minValue = 0;
  const maxValue = 100;
  const step = safeData.length > 1 ? innerW / (safeData.length - 1) : 0;

  const points = safeData.map((point, index) => {
    const value = clamp(point.value, minValue, maxValue);
    const ratio = (value - minValue) / (maxValue - minValue);
    return {
      x: paddingX + index * step,
      y: paddingY + innerH * (1 - ratio),
      value,
      label: point.label
    };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');

  const gridLines = Array.from({ length: 3 }, (_, index) => {
    const ratio = index / 2;
    return {
      key: `grid-${index}`,
      y: paddingY + innerH * ratio
    };
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {gridLines.map((line) => (
          <Line
            key={line.key}
            x1={paddingX}
            y1={line.y}
            x2={width - paddingX}
            y2={line.y}
            stroke={colors.gray[700]}
            strokeWidth={1}
          />
        ))}
        <Polyline points={polyline} fill="none" stroke={colors.secondary} strokeWidth={2} />
        {points.map((point, index) => (
          <Circle
            key={`dot-${index}`}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={colors.secondary}
          />
        ))}
        {points.map((point, index) => (
          <SvgText
            key={`value-${index}`}
            x={point.x}
            y={point.y - 10}
            fill={colors.gray[200]}
            fontSize={10}
            textAnchor="middle"
          >
            {Math.round(point.value)}
          </SvgText>
        ))}
        {points.map((point, index) => (
          <SvgText
            key={`label-${index}`}
            x={point.x}
            y={height - 6}
            fill={colors.gray[400]}
            fontSize={10}
            textAnchor="middle"
          >
            {point.label}
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
