import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { listMyContributions } from '../api/payment';
import { colors } from '../theme/colors';

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await listMyContributions();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.bgDeep} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListHeaderComponent={
        <Text style={styles.title}>{t('payment.history')}</Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{t('home.empty')}</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.amount}>
            {t('common.etb', { amount: item.amount.toFixed(0) })}
          </Text>
          <Text style={styles.meta}>
            {item.status} · {item.paymentMethod}
          </Text>
          <Text style={styles.date}>
            {item.paidAt ? new Date(item.paidAt).toLocaleString() : ''}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.bgDeep,
    marginBottom: 16,
  },
  empty: { color: colors.textMuted },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amount: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, color: colors.bgMid, fontWeight: '600' },
  date: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
});
