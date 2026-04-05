'use client';

import DemoPageShell from '@/features/Demos/DemoPageShell';
import { DemoGraph } from '@/features/Demos/DemoGraph';
import { IOT_DATASET, generateIoTReading } from '@/features/Demos/iot-data';

const LEGEND: Record<string, string> = {
  'Temperature': '#ef4444',
  'Humidity': '#3b82f6',
  'Motion': '#22c55e',
  'Pressure': '#a855f7',
  'Light': '#eab308',
};

export default function IoTDemoPage() {
  return (
    <DemoPageShell
      title="IoT Sensor Network"
      description="Distributed sensor readings and gateway traffic"
      audience="IoT Developers"
      color="#3b82f6"
    >
      {() => (
        <DemoGraph
          dataset={IOT_DATASET}
          generateParticle={generateIoTReading}
          particleInterval={350}
          legend={LEGEND}
        />
      )}
    </DemoPageShell>
  );
}
