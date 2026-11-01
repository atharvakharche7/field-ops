import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { colors, fontSize, minTapSize, spacing } from '../theme';
import { Role } from '../types';

const ROLE_LABELS: Record<Role, string> = {
  TECHNICIAN: 'Technician',
  SUPERVISOR: 'Supervisor',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.detail}>{user?.email}</Text>
        {user ? <Text style={styles.role}>{ROLE_LABELS[user.role]}</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void logout()}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
      >
        <Text style={styles.logoutLabel}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  name: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  role: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  logout: {
    minHeight: minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: spacing.xl,
  },
  pressed: {
    opacity: 0.6,
  },
  logoutLabel: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
