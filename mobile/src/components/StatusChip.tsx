import { StyleSheet, Text, View } from 'react-native';

import { fontSize, spacing, statusColors, statusLabels } from '../theme';
import { Status } from '../types';

export default function StatusChip({ status }: { status: Status }) {
  const { background, text } = statusColors[status];
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Text style={[styles.label, { color: text }]}>{statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
