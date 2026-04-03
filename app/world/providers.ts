'use client';

import { PumpFunProvider, MockProvider } from '@web3viz/providers';

// ---------------------------------------------------------------------------
// Provider instances
//
// To add a new data provider:
// 1. Create a class implementing DataProvider from @web3viz/core
//    (see PumpFunProvider or MockProvider for reference)
// 2. Add it to this array
// 3. The provider's categories automatically appear in the filter sidebar
// ---------------------------------------------------------------------------

export const providers = [
  new PumpFunProvider(),
  new MockProvider(),
];
