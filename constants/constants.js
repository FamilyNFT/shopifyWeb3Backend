const stripeDev =
  "sk_test_51M9pWNA9mNbyjY0WqUGvSuyMJi00IfvDX72Vqz2ZBwVRsvr0RIJ0bxlXDnFT23TOeclOrBu7gmFzT3a37NPvjWZs00l77iSupH";
const stripeProd = process.env.STRIPE_PROD;

export const LUKSO_CONTRACT_ADDRESS =
  "0x353af3a24a39031da7c99155f5e9f7bf09a3c55e";
export const LUKSO = true;
export const GOERLI_CONTRACT_ADDRESS = "0x0"; //todo: add goerli contract address
export const LUKSO_NETWORK_URL = "https://rpc.l16.lukso.network";
export const GOERLI_NETWORK_URL = "https://rpc.ankr.com/eth_goerli";

export const stripeKey = LUKSO ? stripeDev : stripeProd; // if LUKSO is true, use stripeDev, else use stripeProd (which is set in .env)
