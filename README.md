# Permissionless CCTP

Sending tokens (e.g. USDC) using CCTP & Hyperlane
Uses CCTP for the minting/burning USDC and Hyperlane for relaying the validation messages of burning USDC

## Overview
`/contracts`: On-chain contract that wraps the CCTP protocol to make use of the Hyperlane cross-chain infrastructure
```
Currently deployed CctpAdapter addresses:
  "goerli": "0x001C83d5364C3360a27D0a72833C70203a864893",
  "fuji": "0xe7C82ea77091239eC52DD3f7640A36D132e0D981",
  "optimismgoerli": "0x8F2Ec21F10dDD8d581f8957aB1F1D484F4875977",
  "arbitrumgoerli": "0x528f3d2c128471990eb2DA54488b421790db6A4c"
```

`/frontend`: Off-chain server that Hyperlane relayers can query to get the attestations of the CCTP messages
```
Currently active server: https://permissionless-cctp.vercel.app/
```

## Off-chain Detailed Flow
- When a relayer relays a CCTP message, it queries this server for the corresponding CCTP attestations
- This server extracts the nonce of the CCTP message from the Hyperlane message
- The nonce is used to query a subgraph which returns the CCTP message
- The keccak256 hash of the CCTP message is used to query the CCTP server for attestations
- The server returns the attestations data to the relayer