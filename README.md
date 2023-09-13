# Permissionless CCTP

Sending tokens (e.g. USDC) using CCTP & Hyperlane
Uses CCTP for the minting/burning USDC and Hyperlane for relaying the validation messages of burning USDC

## Overview
`/contracts`: On-chain contract that wraps the CCTP protocol to make use of the Hyperlane cross-chain infrastructure

`/frontend`: Off-chain server that Hyperlane relayers can query to get the attestations of the CCTP messages

## Off-chain Detailed Flow
- When a relayer relays a CCTP message, it queries this server for the corresponding CCTP attestations
- This server extracts the nonce of the CCTP message from the Hyperlane message
- The nonce is used to query a subgraph which returns the CCTP message
- The keccak256 hash of the CCTP message is used to query the CCTP server for attestations
- The server returns the attestations data to the relayer