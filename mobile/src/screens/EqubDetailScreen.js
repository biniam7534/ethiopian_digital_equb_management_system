import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { getEqub, startEqub } from '../api/equb';
import {
  confirmContribution,
  contribute,
  listCycleContributions,
  processPayout,
} from '../api/payment';
import { colors } from '../theme/colors';

export default function EqubDetailScreen({ route, navigation }) {
  const { equbId } = route.params;
  const { t } = useTranslation();
  const { user } = useAuth();
  const [equb, setEqub] = useState(null);
  const [cycleContributions, setCycleContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await getEqub(equbId);
      setEqub(data);
      const activeCycle = data.cycles?.find((c) => c.status === 'collecting');
      if (activeCycle) {
        const contribs = await listCycleContributions(activeCycle.id);
        setCycleContributions(contribs);
      } else {
        setCycleContributions([]);
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [equbId])
  );

  const isOrganizer = equb?.organizerId === user?.id;
  const activeCycle = equb?.cycles?.find((c) => c.status === 'collecting');

  const onStart = async () => {
    setBusy(true);
    try {
      await startEqub(equbId);
      await load();
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setBusy(false);
    }
  };

  const onContribute = async () => {
    if (!activeCycle) return;
    setBusy(true);
    try {
      await contribute({
        cycleId: activeCycle.id,
        paymentMethod: 'mobile_money',
        referenceCode: `MM-${Date.now()}`,
      });
      Alert.alert(t('common.success'), t('payment.contribute'));
      await load();
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setBusy(false);
    }
  };

  const onPayout = async () => {
    if (!activeCycle) return;
    setBusy(true);
    try {
      await processPayout({
        cycleId: activeCycle.id,
        paymentMethod: 'mobile_money',
      });
      Alert.alert(t('common.success'), t('payment.payout'));
      await load();
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !equb) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.bgDeep} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <Text style={styles.name}>{equb.name}</Text>
      <Text style={styles.meta}>
        {t('common.etb', { amount: Number(equb.contributionAmount).toFixed(0) })} ·{' '}
        {t(`equb.${equb.frequency}`)} · {equb.status}
      </Text>
      {equb.description ? <Text style={styles.desc}>{equb.description}</Text> : null}
      <Text style={styles.code}>
        {t('equb.inviteCode')}: {equb.inviteCode}
      </Text>

      {equb.myMembership ? (
        <Text style={styles.position}>
          {t('equb.position', { n: equb.myMembership.payoutPosition })}
        </Text>
      ) : null}

      {isOrganizer && equb.status === 'open' ? (
        <Button title={t('equb.start')} onPress={onStart} loading={busy} style={{ marginTop: 16 }} />
      ) : null}

      {activeCycle ? (
        <View style={styles.block}>
          <Text style={styles.section}>
            Cycle {activeCycle.cycleNumber} · {activeCycle.status}
          </Text>
          <Button
            title={t('payment.contribute')}
            onPress={onContribute}
            loading={busy}
            style={{ marginBottom: 10 }}
          />
          {isOrganizer ? (
            <Button
              title={t('payment.payout')}
              variant="secondary"
              onPress={onPayout}
              loading={busy}
            />
          ) : null}

          <Text style={[styles.section, { marginTop: 16 }]}>{t('payment.history')}</Text>
          {cycleContributions.map((c) => (
            <View key={c.id} style={styles.row}>
              <Text style={styles.rowTitle}>{c.memberName || c.memberId.slice(0, 8)}</Text>
              <Text style={styles.rowMeta}>
                {t('common.etb', { amount: c.amount.toFixed(0) })} · {c.status}
              </Text>
              {isOrganizer && c.status === 'pending' ? (
                <View style={styles.confirmRow}>
                  <Button
                    title={t('payment.confirm')}
                    onPress={async () => {
                      try {
                        await confirmContribution(c.id, 'confirmed');
                        await load();
                      } catch (err) {
                        Alert.alert(t('common.error'), err.message);
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={t('payment.reject')}
                    variant="ghost"
                    onPress={async () => {
                      try {
                        await confirmContribution(c.id, 'rejected');
                        await load();
                      } catch (err) {
                        Alert.alert(t('common.error'), err.message);
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.section}>{t('equb.members')}</Text>
      {equb.members?.map((m) => (
        <View key={m.id} style={styles.row}>
          <Text style={styles.rowTitle}>
            #{m.payoutPosition} {m.fullName}
          </Text>
          <Text style={styles.rowMeta}>
            {m.hasReceived ? '✓ paid out' : m.status}
          </Text>
        </View>
      ))}

      <Button
        title={t('tabs.payments')}
        variant="ghost"
        onPress={() => navigation.navigate('Payments')}
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 26, fontWeight: '800', color: colors.bgDeep },
  meta: { marginTop: 6, color: colors.textMuted, fontSize: 14 },
  desc: { marginTop: 12, color: colors.text, lineHeight: 20 },
  code: {
    marginTop: 12,
    fontWeight: '700',
    color: colors.accentDark,
    letterSpacing: 1,
  },
  position: { marginTop: 8, color: colors.bgMid, fontWeight: '600' },
  block: {
    marginTop: 20,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    marginTop: 16,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { fontWeight: '600', color: colors.text },
  rowMeta: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  confirmRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
