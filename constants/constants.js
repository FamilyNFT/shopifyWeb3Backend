const stripeDev =
  "sk_test_51M9pWNA9mNbyjY0WqUGvSuyMJi00IfvDX72Vqz2ZBwVRsvr0RIJ0bxlXDnFT23TOeclOrBu7gmFzT3a37NPvjWZs00l77iSupH";
const stripeProd = process.env.STRIPE_PROD;

export const LUKSO_CONTRACT_ADDRESS =
  "0x353af3a24a39031da7c99155f5e9f7bf09a3c55e";
export const LUKSO = false;
export const GOERLI_CONTRACT_ADDRESS =
  "0xD8C3728d95925a53c5319C5F4D697e8e36a3B6fa"; //todo: add goerli contract address
export const LUKSO_NETWORK_URL = "https://rpc.l16.lukso.network";
export const GOERLI_NETWORK_URL = "https://rpc.sepolia.org";

export const stripeKey = LUKSO ? stripeDev : stripeProd; // if LUKSO is true, use stripeDev, else use stripeProd (which is set in .env)
