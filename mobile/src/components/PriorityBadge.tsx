import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, priorityColors, priorityLabels, spacing } from '../theme';
import { Priority } from '../types';

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <View style={[styles.badge, { backgroundColor: priorityColors[priority] }]}>
      <Text style={styles.label}>{priorityLabels[priority]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  label: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
