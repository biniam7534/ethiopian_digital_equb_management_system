import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Input from '../components/Input';
import Button from '../components/Button';
import { createEqub } from '../api/equb';
import { colors } from '../theme/colors';

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'daily'];

export default function CreateEqubScreen({ navigation }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('1000');
  const [maxMembers, setMaxMembers] = useState('10');
  const [frequency, setFrequency] = useState('weekly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const equb = await createEqub({
        name: name.trim(),
        description: description.trim(),
        contributionAmount: Number(contributionAmount),
        maxMembers: Number(maxMembers),
        frequency,
        startDate,
      });
      Alert.alert(t('common.success'), `${t('equb.inviteCode')}: ${equb.inviteCode}`);
      navigation.replace('EqubDetail', { equbId: equb.id });
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('home.createEqub')}</Text>

      <Input label={t('equb.name')} value={name} onChangeText={setName} />
      <Input
        label={t('equb.description')}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <Input
        label={t('equb.amount')}
        value={contributionAmount}
        onChangeText={setContributionAmount}
        keyboardType="numeric"
      />
      <Input
        label={t('equb.maxMembers')}
        value={maxMembers}
        onChangeText={setMaxMembers}
        keyboardType="numeric"
      />
      <Input
        label={t('equb.startDate')}
        value={startDate}
        onChangeText={setStartDate}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>{t('equb.frequency')}</Text>
      <View style={styles.row}>
        {FREQUENCIES.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFrequency(f)}
            style={[styles.chip, frequency === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>
              {t(`equb.${f}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button title={t('home.createEqub')} onPress={onSubmit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.bgDeep,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.bgDeep, borderColor: colors.bgDeep },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: colors.textOnDark },
});
