import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import EqubCard from '../components/EqubCard';
import Button from '../components/Button';
import { listMyEqubs } from '../api/equb';
import { colors } from '../theme/colors';

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [equbs, setEqubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await listMyEqubs();
      setEqubs(data);
    } catch {
      setEqubs([]);
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

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.bgDeep}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>{t('appName')}</Text>
        <Text style={styles.welcome}>
          {t('home.welcome', { name: user?.fullName?.split(' ')[0] || '' })}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={t('home.createEqub')}
          onPress={() => navigation.navigate('CreateEqub')}
          style={{ flex: 1 }}
        />
        <Button
          title={t('home.joinEqub')}
          variant="secondary"
          onPress={() => navigation.navigate('JoinEqub')}
          style={{ flex: 1 }}
        />
      </View>

      <Text style={styles.section}>{t('home.myGroups')}</Text>

      {loading ? (
        <ActivityIndicator color={colors.bgDeep} style={{ marginTop: 24 }} />
      ) : equbs.length === 0 ? (
        <Text style={styles.empty}>{t('home.empty')}</Text>
      ) : (
        equbs.map((equb) => (
          <EqubCard
            key={equb.id}
            equb={equb}
            onPress={() => navigation.navigate('EqubDetail', { equbId: equb.id })}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32 },
  hero: {
    backgroundColor: colors.bgDeep,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textOnDark,
  },
  welcome: {
    marginTop: 6,
    fontSize: 16,
    color: colors.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  empty: {
    paddingHorizontal: 16,
    color: colors.textMuted,
    fontSize: 15,
  },
});
