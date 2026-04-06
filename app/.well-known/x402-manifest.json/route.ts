import { X402_RESOURCES } from '@/lib/x402/config';
import type { X402Resource } from '@web3viz/core';

export async function GET() {
  const manifest = {
    $schema: 'https://x402.org/schema/manifest.json',
    version: '1',
    info: {
      name: 'Visualize Web3 Realtime',
      description: 'Real-time visualization of Web3 network activity',
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://visualize-web3.app',
    },
    accepts: X402_RESOURCES.map((r: X402Resource) => ({
      scheme: r.scheme,
      network: r.network,
      asset: r.asset,
      maxAmountRequired: r.amount,
      resource: r.resource,
      description: r.description,
      payTo: r.payTo,
    })),
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
