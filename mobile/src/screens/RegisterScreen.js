import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors } from '../theme/colors';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromo' },
];

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+251');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
        language,
        role: 'member',
      });
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('auth.register')}</Text>

        <Input label={t('auth.fullName')} value={fullName} onChangeText={setFullName} />
        <Input
          label={t('auth.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.langLabel}>{t('auth.language')}</Text>
        <View style={styles.langRow}>
          {LANGS.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => setLanguage(lang.code)}
              style={[styles.langChip, language === lang.code && styles.langChipActive]}
            >
              <Text
                style={[styles.langText, language === lang.code && styles.langTextActive]}
              >
                {lang.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button title={t('auth.register')} onPress={onSubmit} loading={loading} />
        <Button
          title={t('auth.hasAccount')}
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 56 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.bgDeep,
    marginBottom: 20,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  langChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
  },
  langChipActive: {
    backgroundColor: colors.bgDeep,
    borderColor: colors.bgDeep,
  },
  langText: { color: colors.text, fontWeight: '600' },
  langTextActive: { color: colors.textOnDark },
});
