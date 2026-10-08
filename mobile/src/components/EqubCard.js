import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

export default function EqubCard({ equb, onPress }) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.stripe} />
      <View style={styles.body}>
        <Text style={styles.name}>{equb.name}</Text>
        <Text style={styles.meta}>
          {t('common.etb', { amount: Number(equb.contributionAmount).toFixed(0) })} · {t(`equb.${equb.frequency}`)}
        </Text>
        <Text style={styles.status}>
          {t('equb.status')}: {equb.status}
          {equb.memberCount != null ? ` · ${equb.memberCount}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.9 },
  stripe: { width: 6, backgroundColor: colors.accent },
  body: { flex: 1, padding: 14 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, color: colors.textMuted, fontSize: 14 },
  status: { marginTop: 8, color: colors.bgMid, fontSize: 13, fontWeight: '600' },
});
