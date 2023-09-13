import {
  DispatchedMessage,
  HyperlaneCore,
  MultiProvider,
  chainMetadata,
} from "@hyperlane-xyz/sdk";
import { InterchainGasPaymaster__factory } from "@hyperlane-xyz/core";
import { IERC20__factory } from "@hyperlane-xyz/core";
import { sleep, addressToBytes32 } from "@hyperlane-xyz/utils";

import { BigNumber, ethers } from "ethers";
import yargs from "yargs";

import { CctpAdapter__factory } from "../typechain-types";
import cctpAdapters from "../configs/cctp-adapters.json";
import cctpConfig from "../configs/cctp-config.json";
import { getMultiProvider, assertBytes32 } from "../src/config";

const mergeConfigs = (cctpConfig: any, cctpAdapters: any) => {
  for (const chainId in cctpAdapters) {
    cctpAdapters[chainId] = {
      adapter: cctpAdapters[chainId],
      usdc: cctpConfig[chainId].token,
      igp: cctpConfig[chainId].interchainGasPaymaster,
    };
  }
  return cctpAdapters;
};

const transferAmount = 1000; // 0.001 USDC

async function transferRemote(
  signer: ethers.Wallet,
  core: HyperlaneCore,
  multiProvider: MultiProvider,
  addresses: any
) {
  for (let i = 0; i < length; i++) {
    const chainId = Object.keys(addresses)[i];
    const usdc = IERC20__factory.connect(
      addresses[chainId].usdc,
      multiProvider.getProvider(chainId)
    );
    const length = Object.keys(addresses).length;
    if (
      (await usdc.balanceOf(signer.address)).lt(
        BigNumber.from(transferAmount).mul(length - 1)
      )
    ) {
      throw new Error(`Insufficient funds on ${chainId}`);
    }
  }

  for (let i = 0; i < length; i++) {
    const chainId = Object.keys(addresses)[i];
    const chainConfig = addresses[chainId];
    const usdc = IERC20__factory.connect(
      chainConfig.usdc,
      multiProvider.getProvider(chainId)
    );
    const adapter = CctpAdapter__factory.connect(
      chainConfig.adapter,
      multiProvider.getProvider(chainId)
    );
    const igp = InterchainGasPaymaster__factory.connect(
      chainConfig.igp,
      multiProvider.getProvider(chainId)
    );

    let timedOut = false;
    const timeout = 60 * 20; // in seconds
    const timeoutId = setTimeout(() => {
      timedOut = true;
    }, timeout * 1000);

    // approve USDC
    await multiProvider.handleTx(
      chainId,
      usdc
        .connect(multiProvider.getSigner(chainId))
        .approve(adapter.address, transferAmount * (length - 1))
    );
    const messages: Set<DispatchedMessage> = new Set();
    for (let j = 0; j < length; j++) {
      if (i !== j) {
        const destChainId = Object.keys(addresses)[j];
        const gasLimit = await adapter.gasAmount();
        const value = await igp.quoteGasPayment(
          chainMetadata[destChainId].chainId,
          gasLimit
        );
        const transferRemoteReceipt = await multiProvider.handleTx(
          chainId,
          adapter
            .connect(multiProvider.getSigner(chainId))
            .transferRemote(
              chainMetadata[destChainId].chainId,
              addressToBytes32(signer.address),
              transferAmount,
              { value: value }
            )
        );

        const dispatchedMessages = core.getDispatchedMessages(
          transferRemoteReceipt
        );
        const dispatchedMessage = dispatchedMessages[0];
        console.log(
          `Sent message from ${chainId} to ${signer.address} on ${destChainId} with message ID ${dispatchedMessage.id}`
        );
        messages.add(dispatchedMessage);
      }
    }
    while (messages.size > 0 && !timedOut) {
      for (const message of messages.values()) {
        const origin = multiProvider.getChainName(message.parsed.origin);
        const destination = multiProvider.getChainName(
          message.parsed.destination
        );
        const mailbox = core.getContracts(destination).mailbox;
        const delivered = await mailbox.delivered(message.id);
        if (delivered) {
          messages.delete(message);
          console.log(
            `Message from ${origin} to ${destination} with ID ${
              message!.id
            } was delivered`
          );
        } else {
          console.log(
            `Message from ${origin} to ${destination} with ID ${
              message!.id
            } has not yet been delivered`
          );
        }
        await sleep(5000);
      }
    }
    clearTimeout(timeoutId);
    if (timedOut) {
      console.log("Timed out waiting for messages to be delivered");
      process.exit(1);
    }
  }
  console.log(
    `Succeeded in transferring USDC to ${signer.address} on all chains`
  );
}

async function main() {
  const multiProvider = getMultiProvider();
  const { key } = await getArgs();
  const signer = new ethers.Wallet(key);
  multiProvider.setSharedSigner(signer);
  const core = HyperlaneCore.fromEnvironment("testnet", multiProvider);
  const addresses = mergeConfigs(cctpConfig, cctpAdapters);
  await transferRemote(signer, core, multiProvider, addresses);
}

export async function getArgs() {
  const args = await yargs(process.argv.slice(2))
    .describe("key", "A hexadecimal private key for transaction signing")
    .string("key")
    .coerce("key", assertBytes32)
    .demandOption("key");
  return args.argv;
}

main()
  .then()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
