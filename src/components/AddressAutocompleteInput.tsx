import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { CONFIG } from '@/config/env';
import type { AddressSuggestion } from '@/models/types';
import { searchAddressSuggestions } from '@/services/locationService';
import { colors, radius, spacing } from '@/theme/colors';

/**
 * Smart address input.
 *
 * Debounces keystrokes, then asks locationService for suggestions (which itself
 * checks the local SQLite address book first and only falls back to the
 * external API on a miss). Each suggestion shows whether it was an instant
 * local hit (⚡) or a network result (☁︎). Selecting one hands the raw
 * suggestion back to the parent, which persists it + adds it to the route.
 */

interface Props {
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
}

const DEBOUNCE_MS = 250;

export function AddressAutocompleteInput({ onSelect, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow earlier search overwriting a newer one's results.
  const requestSeq = useRef(0);

  const runSearch = useCallback(async (text: string) => {
    const seq = ++requestSeq.current;
    if (text.trim().length < CONFIG.MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const results = await searchAddressSuggestions(text);
      if (seq === requestSeq.current) setSuggestions(results);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => void runSearch(text), DEBOUNCE_MS);
    },
    [runSearch],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const handleSelect = useCallback(
    (suggestion: AddressSuggestion) => {
      onSelect(suggestion);
      // Reset for the next stop.
      setQuery('');
      setSuggestions([]);
    },
    [onSelect],
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onChangeText}
          placeholder={placeholder ?? 'Add a stop — type an address or name'}
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => `${item.source}_${item.id}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestion}
                onPress={() => handleSelect(item)}
              >
                <Ionicons
                  name={item.source === 'local' ? 'flash' : 'cloud-outline'}
                  size={16}
                  color={item.source === 'local' ? colors.accent : colors.textSecondary}
                  style={styles.suggestionIcon}
                />
                <View style={styles.suggestionText}>
                  {item.label ? (
                    <Text style={styles.suggestionLabel}>{item.label}</Text>
                  ) : null}
                  <Text style={styles.suggestionAddress} numberOfLines={1}>
                    {item.formattedAddress}
                  </Text>
                </View>
                {item.source === 'local' && (
                  <Text style={styles.savedTag}>Saved</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    maxHeight: 240,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionIcon: {
    marginRight: spacing.sm,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  suggestionAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  savedTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    marginLeft: spacing.sm,
  },
});
