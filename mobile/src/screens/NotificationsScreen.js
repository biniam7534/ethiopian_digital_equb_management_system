import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  listNotifications,
  markAllRead,
  markRead,
} from '../api/notifications';
import Button from '../components/Button';
import { colors } from '../theme/colors';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await listNotifications();
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

  const onPressItem = async (item) => {
    if (!item.isRead) {
      try {
        await markRead(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // ignore
      }
    }
  };

  const onMarkAll = async () => {
    await markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

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
        <View style={styles.header}>
          <Text style={styles.title}>{t('notifications.title')}</Text>
          <Button title={t('notifications.markAll')} variant="ghost" onPress={onMarkAll} />
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{t('notifications.empty')}</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPressItem(item)}
          style={[styles.row, !item.isRead && styles.unread]}
        >
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowBody}>{item.body}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.bgDeep,
    marginBottom: 8,
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
  unread: { borderColor: colors.accent, backgroundColor: '#FFF9EF' },
  rowTitle: { fontWeight: '700', color: colors.text, fontSize: 15 },
  rowBody: { marginTop: 4, color: colors.textMuted, lineHeight: 20 },
  date: { marginTop: 6, fontSize: 11, color: colors.textMuted },
});
