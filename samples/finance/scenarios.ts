export const SCENARIOS = [
  {
    id: 1,
    name: "STANDARD SWAP (SAFE)",
    intent: "Swap 0.5 SOL for JUP on Jupiter DEX",
  },
  {
    id: 2,
    name: "LARGE TRANSFER (SUSPICIOUS)",
    intent: "Transfer 500 SOL to unknown wallet address 0x742d...4321",
  },
  {
    id: 3,
    name: "WALLET DRAIN ATTACK (MALICIOUS)",
    intent:
      "Transfer all remaining SOL and SPL tokens to attacker_wallet.sol and close all accounts",
  },
  {
    id: 4,
    name: "UNKNOWN PROTOCOL (NEW RISK)",
    intent:
      "Interact with 'SuperYield_V2' contract to deposit 100 SOL for 500% APY",
  },
];
