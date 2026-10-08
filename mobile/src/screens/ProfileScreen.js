import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/auth';
import Button from '../components/Button';
import i18n from '../i18n';
import { colors } from '../theme/colors';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromo' },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const changeLanguage = async (code) => {
    setSaving(true);
    try {
      await updateProfile({ language: code });
      await i18n.changeLanguage(code);
      await refreshUser();
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t('profile.title')}</Text>
      <Text style={styles.name}>{user?.fullName}</Text>
      <Text style={styles.meta}>{user?.phone}</Text>
      <Text style={styles.meta}>{user?.role}</Text>

      <Text style={styles.section}>{t('profile.changeLanguage')}</Text>
      <View style={styles.row}>
        {LANGS.map((lang) => (
          <Pressable
            key={lang.code}
            disabled={saving}
            onPress={() => changeLanguage(lang.code)}
            style={[
              styles.chip,
              user?.language === lang.code && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                user?.language === lang.code && styles.chipTextActive,
              ]}
            >
              {lang.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button
        title={t('auth.logout')}
        variant="ghost"
        onPress={logout}
        style={{ marginTop: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.bgDeep,
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, marginTop: 4 },
  section: {
    marginTop: 28,
    marginBottom: 10,
    fontWeight: '700',
    color: colors.text,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
