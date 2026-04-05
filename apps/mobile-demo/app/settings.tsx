import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import type { SwarmingTheme, PerformanceTier, RendererBackend } from '@swarming/react-native';

interface SettingRowProps {
  label: string;
  children: React.ReactNode;
}

function SettingRow({ label, children }: SettingRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

interface OptionGroupProps<T extends string> {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
}

function OptionGroup<T extends string>({ options, selected, onSelect }: OptionGroupProps<T>) {
  return (
    <View style={styles.optionGroup}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.option, selected === opt && styles.optionSelected]}
          onPress={() => onSelect(opt)}
        >
          <Text style={[styles.optionText, selected === opt && styles.optionTextSelected]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const [theme, setTheme] = useState<SwarmingTheme>('dark');
  const [performance, setPerformance] = useState<PerformanceTier>('medium');
  const [renderer, setRenderer] = useState<RendererBackend>('webview');
  const [haptics, setHaptics] = useState(true);
  const [batteryAware, setBatteryAware] = useState(true);
  const [offlineCache, setOfflineCache] = useState(true);
  const [customSource, setCustomSource] = useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Appearance</Text>
      <SettingRow label="Theme">
        <OptionGroup options={['dark', 'light', 'midnight']} selected={theme} onSelect={setTheme} />
      </SettingRow>

      <Text style={styles.sectionTitle}>Performance</Text>
      <SettingRow label="Quality">
        <OptionGroup options={['low', 'medium', 'high']} selected={performance} onSelect={setPerformance} />
      </SettingRow>
      <SettingRow label="Renderer">
        <OptionGroup options={['webview', 'gl']} selected={renderer} onSelect={setRenderer} />
      </SettingRow>

      <Text style={styles.sectionTitle}>Features</Text>
      <SettingRow label="Haptic Feedback">
        <Switch value={haptics} onValueChange={setHaptics} trackColor={{ true: '#6366f1' }} />
      </SettingRow>
      <SettingRow label="Battery Aware">
        <Switch value={batteryAware} onValueChange={setBatteryAware} trackColor={{ true: '#6366f1' }} />
      </SettingRow>
      <SettingRow label="Offline Cache">
        <Switch value={offlineCache} onValueChange={setOfflineCache} trackColor={{ true: '#6366f1' }} />
      </SettingRow>

      <Text style={styles.sectionTitle}>Data Source</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="wss://your-endpoint.com/stream"
          placeholderTextColor="#4a4a6a"
          value={customSource}
          onChangeText={setCustomSource}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Current Config</Text>
        <Text style={styles.infoText}>
          Theme: {theme} | Quality: {performance} | Renderer: {renderer}
        </Text>
        <Text style={styles.infoText}>
          Haptics: {haptics ? 'on' : 'off'} | Battery: {batteryAware ? 'on' : 'off'} | Cache: {offlineCache ? 'on' : 'off'}
        </Text>
        {customSource ? (
          <Text style={styles.infoText}>Source: {customSource}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  content: { padding: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e2e',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
  },
  rowLabel: { color: '#e2e8f0', fontSize: 16 },
  optionGroup: { flexDirection: 'row', gap: 6 },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2e2e3e',
  },
  optionSelected: { backgroundColor: '#6366f1' },
  optionText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  optionTextSelected: { color: '#ffffff' },
  inputContainer: {
    backgroundColor: '#1e1e2e',
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
  },
  input: {
    color: '#e2e8f0',
    fontSize: 14,
    padding: 12,
  },
  infoBox: {
    backgroundColor: '#1a1a2a',
    borderRadius: 10,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#2e2e3e',
  },
  infoTitle: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
  },
});
