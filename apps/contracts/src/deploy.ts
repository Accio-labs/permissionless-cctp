import { ethers } from "ethers";
import yargs from "yargs";
import { assertBytes32, getMultiProvider } from "./config";

import { Address } from "@hyperlane-xyz/utils";

import {
  ChainMap, // ChainName,
  chainMetadata,
} from "@hyperlane-xyz/sdk";

import { CctpAdapterConfig, CctpAdapterDeployer } from "./CctpAdapterDeployer";

import cctpConfig from "../configs/cctp-adapter-deploy-config.json";
import { Contract } from "typechain";
import { writeJSON } from "./json";

const buildCircleDomainMapping = (cctpConfig: any) => {
  const circleDomainMapping = [];
  for (const chainId in cctpConfig) {
    const chainConfig = cctpConfig[chainId];
    const circleDomain = chainConfig.circleDomain;
    circleDomainMapping.push({
      hyperlaneDomain: chainMetadata[chainId].chainId,
      circleDomain: circleDomain,
    });
  }
  return circleDomainMapping;
};

function buildCctpAdapterConfigMap(owner: Address, cctpConfig: any) {
  const config: ChainMap<CctpAdapterConfig> = {};
  const circleDomainMapping = buildCircleDomainMapping(cctpConfig);
  for (const chainId in cctpConfig) {
    config[chainId] = {
      ...cctpConfig[chainId],
      owner: owner,
      circleDomainMapping: circleDomainMapping,
    };
  }

  console.log("config: ", config);
  return config;
}

export async function getArgs() {
  const args = await yargs(process.argv.slice(2))
    .describe("key", "A hexadecimal private key for transaction signing")
    .string("key")
    .coerce("key", assertBytes32)
    .demandOption("key");
  return args.argv;
}

async function main() {
  const multiProvider = getMultiProvider();
  const { key } = await getArgs();
  const signer = new ethers.Wallet(key);
  multiProvider.setSharedSigner(signer);

  const config = buildCctpAdapterConfigMap(signer.address, cctpConfig);
  const deployer = new CctpAdapterDeployer(multiProvider);
  const cctpAdapters = await deployer.deploy(config);

  // write addresses to configs
  const deployedAddresses: ChainMap<Address> = {};
  for (const chainId in cctpAdapters) {
    const cctpAdapter = cctpAdapters[chainId];
    deployedAddresses[chainId] = cctpAdapter.router.address;
  }
  writeJSON('./configs', 'cctp-adapter-transfer-test-config.json', deployedAddresses);
}

main()
  .then()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
