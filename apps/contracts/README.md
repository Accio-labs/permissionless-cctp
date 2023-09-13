# Testing

- Make sure you have a priv key with some native ETH in it (on networks goerli, fuji, optimism goerli, arbitrum goerli) as well as USDC (Get some on https://usdcfaucet.com/ and distribute it to other chains using https://goerli.hop.exchange/#/send?token=USDC&sourceNetwork=ethereum&destNetwork=optimism)
- Run `yarn ts-node ./scripts/test-cctp-adapter-transfer-remote.ts --key <priv-key>`