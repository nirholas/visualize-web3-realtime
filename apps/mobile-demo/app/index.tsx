import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';

const TEMPLATES = [
  {
    id: 'live-blockchain',
    title: 'Live Blockchain',
    description: 'Real-time token launches and trades from Pump.fun',
    source: 'wss://pumpportal.fun/api/data',
    theme: 'midnight' as const,
  },
  {
    id: 'demo-static',
    title: 'Static Demo',
    description: 'Pre-loaded graph showing network topology',
    source: undefined,
    theme: 'dark' as const,
  },
  {
    id: 'custom-ws',
    title: 'Custom Source',
    description: 'Connect to your own WebSocket endpoint',
    source: '',
    theme: 'dark' as const,
  },
];

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hero}>Swarming</Text>
      <Text style={styles.subtitle}>
        Real-time force-directed graph visualization for mobile
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose a template</Text>
        {TEMPLATES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/visualize',
                params: { source: t.source ?? '', theme: t.theme },
              })
            }
          >
            <Text style={styles.cardTitle}>{t.title}</Text>
            <Text style={styles.cardDesc}>{t.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.settingsText}>Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  content: { padding: 24, paddingTop: 60 },
  hero: {
    fontSize: 36,
    fontWeight: '700',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2e2e3e',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  settingsButton: {
    backgroundColor: '#2e2e3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  settingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
});
