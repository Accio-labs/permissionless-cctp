import hre from "hardhat";
import * as dotenv from "dotenv";

import { ethers } from "ethers";

import {
  MultiProvider,
  HyperlaneRouterDeployer,
  RouterConfig,
  ChainMap,
  HyperlaneContracts,
  HyperlaneContractsMap,
  HyperlaneFactories,
  Router,
  chainMetadata,
} from "@hyperlane-xyz/sdk";
import { CctpAdapterFactories, cctpAdapterFactories } from "./contracts";
import { CctpAdapter__factory, CctpAdapter } from "../typechain-types";
dotenv.config();

export enum AdapterType {
  CCTP = "CCTP",
}

export type CctpAdapterConfig = RouterConfig & {
  type: AdapterType.CCTP;
  tokenMessengerAddress: string;
  token: string;
  tokenSymbol: string;
  gasAmount: number;
  circleDomainMapping: {
    hyperlaneDomain: number;
    circleDomain: number;
  }[];
  cctpMessageTransmitter: string;
  offchainUrls: string[];
};

export class CctpAdapterDeployer extends HyperlaneRouterDeployer<
  CctpAdapterConfig,
  CctpAdapterFactories
> {
  readonly routerContractName = "CctpAdapter";

  constructor(multiProvider: MultiProvider) {
    super(multiProvider, cctpAdapterFactories);
  }

  async constructorArgs(_: string, __: CctpAdapterConfig): Promise<[]> {
    return [];
  }

  async initializeArgs(
    chain: string,
    config: CctpAdapterConfig
  ): Promise<
    [
      _owner: string,
      _tokenMessengerAddress: string,
      _token: string,
      _tokenSymbol: string,
      _gasAmount: number,
      _mailbox: string,
      _interchainGasPaymaster: string,
      _cctpMessageTransmitter: string,
      _offchainUrls: string[]
    ]
  > {
    const owner = await this.multiProvider.getSignerAddress(chain);
    if (
      config.interchainSecurityModule &&
      typeof config.interchainSecurityModule !== "string"
    ) {
      throw new Error("Invalid interchain security module address");
    }
    return [
      owner,
      config.tokenMessengerAddress,
      config.token,
      config.tokenSymbol,
      config.gasAmount,
      config.mailbox,
      config.interchainGasPaymaster,
      config.cctpMessageTransmitter,
      config.offchainUrls,
    ];
  }

  router(contracts: HyperlaneContracts<CctpAdapterFactories>): CctpAdapter {
    return contracts.router;
  }

  async deployContracts(
    chain: string,
    config: CctpAdapterConfig
  ): Promise<HyperlaneContracts<{ router: CctpAdapter__factory }>> {
    const cctpAdapter = await this.deployContract(
      chain,
      "router",
      [],
      await this.initializeArgs(chain, config)
    );
    console.log(`Deployed CCTP adapter to ${cctpAdapter.address} on ${chain}`);

    // Set domain mappings
    for (const {
      circleDomain,
      hyperlaneDomain,
    } of config.circleDomainMapping) {
      const expectedCircleDomain =
        await cctpAdapter.hyperlaneDomainToCircleDomain(hyperlaneDomain);
      if (expectedCircleDomain === circleDomain) continue;

      console.log(
        `Set circle domain ${circleDomain} for hyperlane domain ${hyperlaneDomain}`
      );
      await this.runIfOwner(chain, cctpAdapter, () =>
        this.multiProvider.handleTx(
          chain,
          cctpAdapter.addDomain(hyperlaneDomain, circleDomain)
        )
      );
    }
    return { router: cctpAdapter };
  }
}
