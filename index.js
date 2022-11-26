import express from "express";
import { GraphQLClient, gql } from "graphql-request";
import request from "request-promise";
import cors from "cors";
import ShopifyBuy from "shopify-buy";
import Shopify from "@shopify/shopify-api";
import Headers from "cross-fetch";
import dotenv from "dotenv";
import fetch from "node-fetch";
import Stripe from "stripe";
const stripe = Stripe(
  "pk_test_51HoMQ5HXVRKq6nBPDzhWi68QuxuGVSjWJuNG02l5YeraCBox0NYYoNara89XEDVTw4rq3yqT5ALciuVyKVP1Fh9Q0042HxRsQW"
);

const app = express();
dotenv.config();
const endpoint = "https://familylukso.myshopify.com/api/2022-04/graphql.json";

global.fetch = fetch;
global.Headers = global.Headers || Headers;
//middlewares//
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Constants//
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const STOREFRONT_TOKEN = process.env.STOREFRONT_TOKEN;

//shopify client
const gqlClient = new GraphQLClient(endpoint, {
  headers: {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": ACCESS_TOKEN,
  },
});
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

//routes//
app.get("/products", async (req, res) => {
  try {
    let products = await client.product.fetchAll();

    const getProductAggregate = async () => {
      let aggregate = [];
      for (let product of products) {
        // let product = products[index];
        // console.log(index);
        const data = await graphqlClient.query({
          data: `query { product(id: "gid:\/\/shopify\/Product\/7798325051543") { title media(first: 5) { edges { node { ...fieldsForMediaTypes } } } } } fragment fieldsForMediaTypes on Media { alt mediaContentType preview { image { id altText originalSrc } } status ... on Video { id sources { format height mimeType url width } originalSource { format height mimeType url width } } ... on ExternalVideo { id host embeddedUrl } ... on Model3d { sources { format mimeType url } originalSource { format mimeType url } } ... on MediaImage { id image { altText originalSrc } } }`,
        });
        aggregate.push({
          ...product,
          video: data.body.data.product.media.edges[0].node.sources[2].url,
        });
      }
      return aggregate;
    };
    let productAggregate = await getProductAggregate();
    // console.log(products[0].price);
    res.json(productAggregate);
  } catch (error) {
    console.log(error);
  }
});
app.post("/checkout", async (req, res) => {
  let jsonBody = req.body;
  const id = jsonBody.id;
  let checkout = await client.checkout.create();
  const lineItemsToAdd = [
    {
      variantId: id,
      quantity: 1,
    },
  ];

  client.checkout.addLineItems(checkout.id, lineItemsToAdd).then((checkout) => {
    // Do something with the updated checkout
    console.log(checkout.lineItems); // Array with one additional line item
  });
  res.json(checkout);
});

app.post("/checkout/complete", async (req, res) => {
  const { id, billingAddress } = req.body;
  let checkout = await client.checkout.fetch(id);

  const token = await stripe.tokens.create({
    card: {
      number: "4242424242424242",
      exp_month: 11,
      exp_year: 2023,
      cvc: "314",
    },
  });
  let data = {
    firstName: "John",
    lastName: "Doe",
    address1: "123 Test Street",
    province: "Quebec",
    country: "Canada",
    city: "Montreal",
    zip: "H3K0X2",
  };

  const variables = {
    checkoutId: id,
    payment: {
      paymentAmount: {
        amount: checkout.paymentDue,
        currencyCode: checkout.currencyCode,
      },
      idempotencyKey: "123",
      billingAddress: billingAddress,
      type: "STRIPE_VAULT_TOKEN",
      paymentData: token.id,
    },
  };
  let shippingRates = await graphqlClient.query({
    data: `query { node(id: "gid://shopify/Checkout/7e9b3511d30997c531a6413bc273885b?key=cc8d8812f127eaf51b3ac2468d467984") { ... on Checkout { id webUrl availableShippingRates { ready shippingRates { handle priceV2 { amount } title } } } } }`,
  });
  res.json(shippingRates);
  // storeClient
  //   .query({
  //     data: {
  //       query: `mutation checkoutShippingLineUpdate($checkoutId: ID!, $shippingRateHandle: String!) { checkoutShippingLineUpdate(checkoutId: $checkoutId, shippingRateHandle: $shippingRateHandle) { checkout { id } checkoutUserErrors { code field message } } }`,
  //       variables: {
  //         checkoutId: id,
  //         shippingRateHandle: "custom",
  //       },
  //     },
  //   })
  //   .then((data) => res.json([data]));

  // storeClient
  //   .query({
  //     data: {
  //       query: `mutation checkoutCompleteWithTokenizedPaymentV3( $checkoutId: ID! $payment: TokenizedPaymentInputV3! ) { checkoutCompleteWithTokenizedPaymentV3( checkoutId: $checkoutId payment: $payment ) { checkout { id } checkoutUserErrors { code field message } payment { id } } } `,
  //       variables: variables,
  //     },
  //   })
  //   .then((data) => res.json([data]));
});

app.post("/checkout/update", async (req, res) => {
  const { address, id, email } = req.body;
  console.log(email);
  const input = { customAttributes: [{ key: "email", value: email }] };
  try {
    let updateAddress = await client.checkout.updateShippingAddress(
      id,
      address
    );
    let updateEmail = await storeClient.query({
      data: {
        query: `mutation checkoutEmailUpdateV2($checkoutId: ID!, $email: String!) { checkoutEmailUpdateV2(checkoutId: $checkoutId, email: $email) { checkout { id } checkoutUserErrors { code field message } } }`,
        variables: {
          checkoutId: id,
          email: email,
        },
      },
    });
    let checkout = await client.checkout.fetch(id);
    res.json(checkout);
    res.status(200);
  } catch (error) {
    res.json(error);
    res.status(400);
  }
});

app.listen(8080, () => console.log("App is listening at port 8080"));
