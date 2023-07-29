import hre from 'hardhat';

type Config = {
  [networkId: number]: {
    cctpMessageTransmitter: string,
    mailbox: string,
    offchainUrls: string[]
  }
};

const config: Config = {
  5: { // goerli
    cctpMessageTransmitter: '0x26413e8157cd32011e726065a5462e97dd4d03d9',
    mailbox: '0xCC737a94FecaeC165AbCf12dED095BB13F037685',
    offchainUrls: ['https://permissionless-cctp.vercel.app/api/attestations']
  },
  43113: { // fuji
    cctpMessageTransmitter: '0xa9fb1b3009dcb79e2fe346c16a604b8fa8ae0a79',
    mailbox: '0xCC737a94FecaeC165AbCf12dED095BB13F037685',
    offchainUrls: ['https://permissionless-cctp.vercel.app/api/attestations']
  },
  421613: { // arbitrum goerli
    cctpMessageTransmitter: '0x109bc137cb64eab7c0b1dddd1edf341467dc2d35',
    mailbox: '0xCC737a94FecaeC165AbCf12dED095BB13F037685',
    offchainUrls: ['https://permissionless-cctp.vercel.app/api/attestations']
  },
};

async function main() {
  const networkId = hre.network.config.chainId || 1;

  if (!Object.keys(config).includes(String(networkId))) {
    throw Error('Unsupported network');
  }

  const initializationParams = config[networkId];
  const cctpIsm = await hre.ethers.deployContract("CctpIsm");

  await cctpIsm.waitForDeployment();

  console.log(`CctpIsm deployed to ${cctpIsm.target}`);

  console.log(`Initializing CctpIsm with args:` +
    `\n- cctpMessageTransmitter: ${initializationParams.cctpMessageTransmitter}` +
    `\n- mailbox: ${initializationParams.mailbox}` +
    `\n- offchainUrls: ${JSON.stringify(initializationParams.offchainUrls)}`);

  await cctpIsm.initialize(
    initializationParams.cctpMessageTransmitter,
    initializationParams.mailbox,
    initializationParams.offchainUrls
  );

  console.log(`CctpIsm initialized`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
