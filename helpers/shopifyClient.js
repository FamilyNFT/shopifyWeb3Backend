import dotenv from "dotenv";
dotenv.config();
import ShopifyBuy from "shopify-buy";
import Shopify from "@shopify/shopify-api";

const STOREFRONT_TOKEN = process.env.STOREFRONT_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  throw new Error("Access token not found in environment variables");
}

if (!STOREFRONT_TOKEN) {
  throw new Error("Storefront token not found in environment variables");
}

const graphqlClient = new Shopify.Shopify.Clients.Graphql(
  "familylukso.myshopify.com",
  ACCESS_TOKEN
);
const storeClient = new Shopify.Shopify.Clients.Storefront(
  "familylukso.myshopify.com",
  STOREFRONT_TOKEN
);
const client = ShopifyBuy.buildClient({
  storefrontAccessToken: STOREFRONT_TOKEN,
  domain: "familylukso.myshopify.com",
});

export { client, storeClient, graphqlClient };
