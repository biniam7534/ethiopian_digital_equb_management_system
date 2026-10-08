import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Input from '../components/Input';
import Button from '../components/Button';
import { joinEqub } from '../api/equb';
import { colors } from '../theme/colors';

export default function JoinEqubScreen({ navigation }) {
  const { t } = useTranslation();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const result = await joinEqub(inviteCode.trim().toUpperCase());
      Alert.alert(t('common.success'), result.equb.name);
      navigation.replace('EqubDetail', { equbId: result.equb.id });
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('home.joinEqub')}</Text>
      <Input
        label={t('equb.inviteCode')}
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
      />
      <Button title={t('home.joinEqub')} onPress={onSubmit} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.bgDeep,
    marginBottom: 16,
    marginTop: 8,
  },
});
