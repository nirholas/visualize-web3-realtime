import { registerProvider } from '@web3viz/core';
import { EthereumProvider } from './EthereumProvider';

export { EthereumProvider } from './EthereumProvider';
export type { EthereumProviderOptions } from './EthereumProvider';

// Self-register the Ethereum provider on import
const ethereumProvider = new EthereumProvider();
registerProvider(ethereumProvider);

export { ethereumProvider };
