import type { DemoHub, DemoParticle, DemoDataset } from './useDemoSimulation';

// ---------------------------------------------------------------------------
// IoT Sensor Network — mock data
// Hub nodes = sensor gateways/zones, Particle nodes = sensor readings
// ---------------------------------------------------------------------------

const READING_TYPES = ['temperature', 'humidity', 'motion', 'pressure', 'light'] as const;

export const IOT_HUBS: DemoHub[] = [
  { id: 'gw_lobby', label: 'Lobby', name: 'Building Lobby Gateway', group: 'indoor', weight: 32, metric: 160, unit: 'readings', source: 'iot' },
  { id: 'gw_datacenter', label: 'Data Center', name: 'Data Center Gateway', group: 'critical', weight: 86, metric: 420, unit: 'readings', source: 'iot' },
  { id: 'gw_parking', label: 'Parking', name: 'Parking Lot Gateway', group: 'outdoor', weight: 18, metric: 90, unit: 'readings', source: 'iot' },
  { id: 'gw_roof', label: 'Rooftop', name: 'Rooftop Weather Station', group: 'outdoor', weight: 24, metric: 120, unit: 'readings', source: 'iot' },
  { id: 'gw_warehouse', label: 'Warehouse', name: 'Warehouse Gateway', group: 'indoor', weight: 44, metric: 220, unit: 'readings', source: 'iot' },
  { id: 'gw_office', label: 'Office Floor', name: 'Office Floor Gateway', group: 'indoor', weight: 56, metric: 280, unit: 'readings', source: 'iot' },
  { id: 'gw_hvac', label: 'HVAC', name: 'HVAC Control Gateway', group: 'critical', weight: 38, metric: 190, unit: 'readings', source: 'iot' },
  { id: 'gw_security', label: 'Security', name: 'Security System Gateway', group: 'critical', weight: 64, metric: 320, unit: 'readings', source: 'iot' },
];

function generateBaseReadings(): DemoParticle[] {
  const particles: DemoParticle[] = [];
  const sensors = [
    { name: 'temp_01', gateways: [0, 5], type: 0 },
    { name: 'temp_02', gateways: [1, 6], type: 0 },
    { name: 'humid_01', gateways: [0, 4], type: 1 },
    { name: 'humid_02', gateways: [5, 6], type: 1 },
    { name: 'motion_01', gateways: [2, 7], type: 2 },
    { name: 'motion_02', gateways: [0, 7], type: 2 },
    { name: 'pressure_01', gateways: [1, 3], type: 3 },
    { name: 'light_01', gateways: [5, 3], type: 4 },
    { name: 'light_02', gateways: [4, 2], type: 4 },
    { name: 'temp_03', gateways: [4, 6], type: 0 },
    { name: 'motion_03', gateways: [7, 2], type: 2 },
    { name: 'humid_03', gateways: [1, 3], type: 1 },
  ];

  for (const sensor of sensors) {
    const readingType = READING_TYPES[sensor.type];
    for (let i = 0; i < 4; i++) {
      for (const gwIdx of sensor.gateways) {
        particles.push({
          id: `${sensor.name}_${gwIdx}_${i}`,
          hubIds: [IOT_HUBS[gwIdx].id],
          group: readingType,
          weight: 1,
          metric: readingType === 'temperature' ? 18 + Math.random() * 15
            : readingType === 'humidity' ? 30 + Math.random() * 50
            : readingType === 'motion' ? Math.random() > 0.5 ? 1 : 0
            : readingType === 'pressure' ? 990 + Math.random() * 40
            : 50 + Math.random() * 800, // light (lux)
          source: 'iot',
        });
      }
    }
  }
  return particles;
}

export const IOT_DATASET: DemoDataset = {
  hubs: IOT_HUBS,
  particles: generateBaseReadings(),
};

let readingCounter = 0;
export function generateIoTReading(hubs: DemoHub[]): DemoParticle {
  readingCounter++;
  const hub = hubs[Math.floor(Math.random() * hubs.length)];
  const readingType = READING_TYPES[Math.floor(Math.random() * READING_TYPES.length)];
  return {
    id: `iot_live_${readingCounter}`,
    hubIds: [hub.id],
    group: readingType,
    weight: 1,
    metric: readingType === 'temperature' ? 18 + Math.random() * 15
      : readingType === 'humidity' ? 30 + Math.random() * 50
      : readingType === 'motion' ? Math.random() > 0.5 ? 1 : 0
      : readingType === 'pressure' ? 990 + Math.random() * 40
      : 50 + Math.random() * 800,
    source: 'iot',
  };
}
