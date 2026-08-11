import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius, spacing } from '@/theme/colors';

/**
 * A lightweight, dependency-free signature pad.
 *
 * Captures finger strokes as SVG path `d` strings and serializes them to a JSON
 * array string (stored in SQLite as `signature_svg`). No webview — just
 * react-native-svg + PanResponder — so it stays native and offline.
 *
 * Serialized format: JSON.stringify(string[]) where each entry is one stroke's
 * SVG path data, e.g. ["M10 10 L12 14 L20 22", "M40 5 L44 9"].
 */

interface Props {
  /** Called with the serialized signature (or '' when cleared/empty). */
  onChange: (serialized: string) => void;
}

export function SignaturePad({ onChange }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentRef = useRef<string>('');
  const [current, setCurrent] = useState<string>('');

  const emit = useCallback(
    (allPaths: string[]) => {
      onChange(allPaths.length ? JSON.stringify(allPaths) : '');
    },
    [onChange],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          currentRef.current = `M${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setCurrent(currentRef.current);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          currentRef.current += ` L${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setCurrent(currentRef.current);
        },
        onPanResponderRelease: () => {
          const stroke = currentRef.current;
          currentRef.current = '';
          setCurrent('');
          if (!stroke) return;
          setPaths((prev) => {
            const next = [...prev, stroke];
            emit(next);
            return next;
          });
        },
      }),
    [emit],
  );

  const clear = useCallback(() => {
    setPaths([]);
    setCurrent('');
    currentRef.current = '';
    emit([]);
  }, [emit]);

  const isEmpty = paths.length === 0 && current === '';

  return (
    <View>
      <View style={styles.pad} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={colors.textPrimary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {current ? (
            <Path
              d={current}
              stroke={colors.textPrimary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
        {isEmpty && (
          <View pointerEvents="none" style={styles.placeholder}>
            <Text style={styles.placeholderText}>Sign here</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.clearBtn} onPress={clear} hitSlop={8}>
        <Ionicons name="refresh" size={14} color={colors.textSecondary} />
        <Text style={styles.clearText}>Clear signature</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Read-only render of a serialized signature (used in delivery history). */
export function SignaturePreview({
  serialized,
  height = 80,
}: {
  serialized: string;
  height?: number;
}) {
  const paths = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(serialized);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [serialized]);

  if (paths.length === 0) return null;

  return (
    <Svg style={{ width: '100%', height }}>
      {paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={colors.textPrimary}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  pad: {
    height: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  clearText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
