import { ethers } from "ethers";

import {
  ChainName,
  MultiProvider,
  chainMetadata,
} from "@hyperlane-xyz/sdk";
import {
  ensure0x,
  addressToBytes32,
} from "@hyperlane-xyz/utils";

let multiProvider: MultiProvider;

export function getMultiProvider() {
  if (!multiProvider) {
    const chainConfigs = { ...chainMetadata };
    multiProvider = new MultiProvider(chainConfigs);
  }
  return multiProvider;
}
export function assertBytesN(value: string, length: number): string {
  const valueWithPrefix = ensure0x(value);
  if (
    ethers.utils.isHexString(valueWithPrefix) &&
    ethers.utils.hexDataLength(valueWithPrefix) == length
  ) {
    return valueWithPrefix;
  }
  throw new Error(
    `Invalid value ${value}, must be a ${length} byte hex string`
  );
}

export function assertBytes32(value: string): string {
  return assertBytesN(value, 32);
}

export function assertBytes20(value: string): string {
  return assertBytesN(value, 20);
}

export function assertUnique(
  values: (argv: any) => string[]
): (argv: any) => void {
  return (argv: any) => {
    const _values = values(argv);
    const hasDuplicates = new Set(_values).size !== _values.length;
    if (hasDuplicates) {
      throw new Error(`Must provide unique values, got ${_values}`);
    }
  };
}

export function assertBalances(
  multiProvider: MultiProvider,
  chainsFunc: (argv: any) => ChainName[]
): (argv: any) => Promise<void> {
  return async (argv: any) => {
    const chains = chainsFunc(argv);
    const signer = new ethers.Wallet(argv.key);
    const address = await signer.getAddress();
    await Promise.all(
      chains.map(async (chain: ChainName) => {
        const balance = await multiProvider
          .getProvider(chain)
          .getBalance(address);
        if (balance.isZero())
          throw new Error(`${address} has no balance on ${chain}`);
      })
    );
  };
}

export function coerceAddressToBytes32(value: string): string {
  if (ethers.utils.isHexString(value)) {
    const length = ethers.utils.hexDataLength(value);
    if (length == 32) {
      return value;
    } else if (length == 20) {
      return addressToBytes32(value);
    }
  }
  throw new Error(`Invalid value ${value}, must be a 20 or 32 byte hex string`);
}
