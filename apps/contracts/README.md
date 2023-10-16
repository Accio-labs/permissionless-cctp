# Deploying

```
NOTE: You can use the currently deployed addresses on testnet:
  "goerli": "0x001C83d5364C3360a27D0a72833C70203a864893",
  "fuji": "0xe7C82ea77091239eC52DD3f7640A36D132e0D981",
  "optimismgoerli": "0x8F2Ec21F10dDD8d581f8957aB1F1D484F4875977",
  "arbitrumgoerli": "0x528f3d2c128471990eb2DA54488b421790db6A4c"
```

Steps to deploy:
1. Modify the `cctp-adapter-deploy-config.json` to specify the networks you want to deploy to
2. Make sure that you have native tokens on all the networks you want to deploy to (we'll be using a single account for all operations)
3. Run `yarn ts-node ./src/deploy.ts --key <priv-key>`
4. Deployed contract addresses will be written to `./configs/cctp-adapter-transfer-test-config.json`

# Testing

- Make sure you have a priv key with some native ETH in it (the network with ETH should be specified first in `cctp-adapter-deploy-config.json`) as well as USDC (Get some on https://usdcfaucet.com/ and the following script will distribute it to other chains)
- If you have not deployed the contracts, follow the steps above to deploy them. If you want to use already deployed contracts, you need to update the following file `./configs/cctp-adapter-transfer-test-config.json` with addresses of the already deployed contracts. For example:

  ```
  {
    "goerli": "0x001C83d5364C3360a27D0a72833C70203a864893",
    "fuji": "0xe7C82ea77091239eC52DD3f7640A36D132e0D981",
    "optimismgoerli": "0x8F2Ec21F10dDD8d581f8957aB1F1D484F4875977",
    "arbitrumgoerli": "0x528f3d2c128471990eb2DA54488b421790db6A4c"
  }
  ```
- Run `yarn ts-node ./scripts/test-cctp-adapter-transfer-remote.ts --key <priv-key>`