import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, spacing } from '../theme';
import { TicketSummary } from '../types';
import PriorityBadge from './PriorityBadge';
import StatusChip from './StatusChip';

// memo: when the list refreshes, a card whose ticket object is unchanged skips re-rendering.
function TicketCard({ ticket }: { ticket: TicketSummary }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.ticketNo}>{ticket.ticketNo}</Text>
        <PriorityBadge priority={ticket.priority} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {ticket.title}
      </Text>
      <Text style={styles.site} numberOfLines={1}>
        {ticket.siteName}, {ticket.city}
      </Text>
      <View style={styles.footer}>
        <StatusChip status={ticket.status} />
      </View>
    </View>
  );
}

export default memo(TicketCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketNo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  site: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
});
