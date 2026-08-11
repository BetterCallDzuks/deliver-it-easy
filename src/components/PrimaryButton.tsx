import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/theme/colors';

type Variant = 'primary' | 'accent' | 'success' | 'danger' | 'outline';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  /** Larger touch target for in-vehicle use (Active Delivery screen). */
  large?: boolean;
  style?: ViewStyle;
}

const VARIANT_BG: Record<Variant, string> = {
  primary: colors.primary,
  accent: colors.accent,
  success: colors.success,
  danger: colors.danger,
  outline: 'transparent',
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  large,
  style,
}: Props) {
  const isOutline = variant === 'outline';
  const contentColor = isOutline ? colors.primary : colors.surface;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[
        styles.button,
        large && styles.buttonLarge,
        { backgroundColor: VARIANT_BG[variant] },
        isOutline && styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={large ? 24 : 18}
              color={contentColor}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.label,
              large && styles.labelLarge,
              { color: contentColor },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  buttonLarge: {
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  labelLarge: {
    fontSize: 20,
  },
});
