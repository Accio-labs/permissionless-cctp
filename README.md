# Permissionless CCTP

Off-chain component of sending CCTP tokens (e.g. USDC) using Hyperlane

## Implementation
- When a relayer relays a CCTP message, it queries this server for the corresponding CCTP attestations
- This server extracts the nonce of the CCTP message from the Hyperlane message
- The nonce is used to query a subgraph which returns the CCTP message
- The keccak256 hash of the CCTP message is used to query the CCTP server for attestations
- The server returns the attestations data to the relayer