import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '../../api/client';
import { getTickets } from '../../api/tickets';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import TicketCard from '../../components/TicketCard';
import { colors, fontSize, minTapSize, spacing } from '../../theme';
import { Status, TicketSummary } from '../../types';

const FILTERS: { label: string; status?: Status }[] = [
  { label: 'All' },
  { label: 'Assigned', status: 'ASSIGNED' },
  { label: 'In Progress', status: 'IN_PROGRESS' },
  { label: 'Resolved', status: 'RESOLVED' },
];

// Defined outside the component so FlatList gets the same functions on every render,
// which avoids re-rendering rows that haven't changed.
const keyExtractor = (ticket: TicketSummary) => String(ticket.id);
const renderTicket = ({ item }: ListRenderItemInfo<TicketSummary>) => <TicketCard ticket={item} />;

export default function MyTicketsScreen() {
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  // The key includes the filter, so each filter has its own cached result. Switching back
  // to one already loaded shows it instantly, then refreshes it in the background.
  // The server only ever returns this technician's own tickets, so the app doesn't filter by user.
  const { data, isPending, isError, isRefetchError, error, refetch } = useQuery({
    queryKey: ['tickets', { status }],
    queryFn: () => getTickets({ status }),
  });

  // A separate flag, so only a pull shows the spinner and background refreshes stay silent.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderBody = () => {
    if (isPending) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    // Only when there's nothing to show. If an earlier result exists, keep it on screen.
    if (isError && !data) {
      return <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />;
    }
    return (
      <>
        {isRefetchError ? (
          <Text style={styles.staleNotice}>Couldn't refresh. Showing the last loaded tickets.</Text>
        ) : null}
        <FlatList
          data={data?.content}
          keyExtractor={keyExtractor}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No tickets here"
              message={status ? 'Nothing matches this filter.' : 'New assignments will show up here.'}
            />
          }
        />
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((filter) => {
          const selected = filter.status === status;
          return (
            <Pressable
              key={filter.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setStatus(filter.status)}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
            >
              <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // flexGrow 0: a horizontal ScrollView would otherwise stretch to fill the screen's height.
  filterBar: {
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: minTapSize,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: minTapSize / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  filterLabelSelected: {
    color: colors.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staleNotice: {
    fontSize: fontSize.xs,
    color: colors.danger,
    textAlign: 'center',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  // flexGrow 1 lets the empty state centre itself and keeps pull-to-refresh working on an empty list.
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
});
