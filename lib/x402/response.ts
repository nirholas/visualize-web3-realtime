import { NextResponse } from 'next/server';
import type { X402Challenge, X402Resource } from '@web3viz/core';

/**
 * Build a proper HTTP 402 Payment Required response per the x402 spec.
 *
 * Response includes:
 * - Status: 402
 * - Header: X-402-Version: 1
 * - Header: X-402-Manifest: /.well-known/x402-manifest.json
 * - Header: Link: </.well-known/x402-manifest.json>; rel="payment-manifest"
 * - Header: Content-Type: application/json
 * - Body: X402Challenge JSON
 */
export function createPaymentRequiredResponse(resource: X402Resource): NextResponse {
  const challenge: X402Challenge = {
    version: '1',
    resource,
    manifestUrl: '/.well-known/x402-manifest.json',
    message: `Payment required: ${resource.description}. Send ${resource.amount} ${resource.asset} on ${resource.network} to ${resource.payTo}`,
  };

  return new NextResponse(JSON.stringify(challenge), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'X-402-Version': '1',
      'X-402-Manifest': '/.well-known/x402-manifest.json',
      'Link': '</.well-known/x402-manifest.json>; rel="payment-manifest"',
    },
  });
}
