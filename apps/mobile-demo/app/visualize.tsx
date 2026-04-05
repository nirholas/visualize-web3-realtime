import { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Swarming } from '@swarming/react-native';
import type { NodeSelectEvent, SwarmingTheme } from '@swarming/react-native';

export default function VisualizeScreen() {
  const params = useLocalSearchParams<{ source?: string; theme?: string }>();
  const source = params.source || undefined;
  const theme = (params.theme as SwarmingTheme) || 'dark';

  const [connected, setConnected] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const viewRef = useRef<View>(null);

  const handleNodeSelect = useCallback((event: NodeSelectEvent) => {
    setSelectedNode(event.node.symbol);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this swarming visualization! ${source ? `Data source: ${source}` : 'Static demo'}`,
        title: 'Swarming Visualization',
      });
    } catch {
      Alert.alert('Error', 'Failed to share');
    }
  }, [source]);

  return (
    <View style={styles.container} ref={viewRef}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={[styles.connectionDot, connected && styles.connectedDot]} />
        <Text style={styles.statusText}>
          {connected ? 'Connected' : source ? 'Connecting...' : 'Static'}
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Visualization */}
      <Swarming
        source={source}
        theme={theme}
        style={{ flex: 1 }}
        renderer="webview"
        performance="medium"
        haptics
        batteryAware
        offlineCache
        onNodeSelect={handleNodeSelect}
        onConnectionChange={setConnected}
        data={
          !source
            ? {
                nodes: [
                  { id: 'sol', label: 'SOL', group: 'hub', radius: 12, color: '#8b5cf6' },
                  { id: 'eth', label: 'ETH', group: 'hub', radius: 10, color: '#6366f1' },
                  { id: 'btc', label: 'BTC', group: 'hub', radius: 14, color: '#f59e0b' },
                  { id: 'trader1', label: 'Trader 1' },
                  { id: 'trader2', label: 'Trader 2' },
                  { id: 'trader3', label: 'Trader 3' },
                  { id: 'trader4', label: 'Trader 4' },
                  { id: 'trader5', label: 'Trader 5' },
                ],
                edges: [
                  { source: 'trader1', target: 'sol' },
                  { source: 'trader1', target: 'eth' },
                  { source: 'trader2', target: 'sol' },
                  { source: 'trader2', target: 'btc' },
                  { source: 'trader3', target: 'eth' },
                  { source: 'trader3', target: 'btc' },
                  { source: 'trader4', target: 'sol' },
                  { source: 'trader5', target: 'btc' },
                  { source: 'trader5', target: 'eth' },
                ],
              }
            : undefined
        }
      />

      {/* Selected node overlay */}
      {selectedNode && (
        <View style={styles.nodeOverlay}>
          <Text style={styles.nodeOverlayText}>{selectedNode}</Text>
          <TouchableOpacity onPress={() => setSelectedNode(null)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a12' },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: 'rgba(10, 10, 18, 0.9)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: { marginRight: 12 },
  backText: { color: '#818cf8', fontSize: 16, fontWeight: '600' },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f87171',
    marginRight: 8,
  },
  connectedDot: { backgroundColor: '#4ade80' },
  statusText: { color: '#94a3b8', fontSize: 14 },
  shareButton: {
    backgroundColor: '#2e2e3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareText: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  nodeOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 46, 0.95)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3e3e5e',
  },
  nodeOverlayText: { color: '#e2e8f0', fontSize: 18, fontWeight: '600' },
  dismissText: { color: '#818cf8', fontSize: 14, fontWeight: '600' },
});
