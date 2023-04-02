import express from "express";
import cors from "cors";
import Headers from "cross-fetch";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { mintWallet } from "./web3.js";
import {
  validateCardDetails,
  fetchCheckout,
  createStripeToken,
  fetchShippingRates,
  updateShippingLine,
  completeOrderWithTokenizedPayment,
  handleError,
} from "./helpers/checkout.js";

import { client, storeClient, graphqlClient } from "./helpers/shopifyClient.js";

const devbool = true; //TODO: Change to false for production!
const app = express();
dotenv.config();
const endpoint = "https://familylukso.myshopify.com/api/2022-04/graphql.json";

global.fetch = fetch;
global.Headers = global.Headers || Headers;
//middlewares//
const allowedOrigins = [
  "http://localhost:3000",
  "https://familylyx.com",
  "https://family-frontend-delta.vercel.app",
];
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Constants//
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const STOREFRONT_TOKEN = process.env.STOREFRONT_TOKEN;
const PORT = process.env.PORT || 8080;

if (ACCESS_TOKEN === undefined) {
  console.log("No access token found in .env file, please define one");
}

if (STOREFRONT_TOKEN === undefined) {
  console.log("No storefront token found in .env file, please define one");
}

//routes//
app.get("/products", async (req, res) => {
  try {
    let products = await client.product.fetchAll();

    const getProductAggregate = async () => {
      let aggregate = [];
      for (let product of products) {
        let productID = `"gid:\/\/shopify\/Product\/${
          product?.id.split("/")[4]
        }"`;
        const data = await graphqlClient.query({
          data: `query { product(id: ${productID}) { title media(first: 5) { edges { node { ...fieldsForMediaTypes } } } } } fragment fieldsForMediaTypes on Media { alt mediaContentType preview { image { id altText originalSrc } } status ... on Video { id sources { format height mimeType url width } originalSource { format height mimeType url width } } ... on ExternalVideo { id host embeddedUrl } ... on Model3d { sources { format mimeType url } originalSource { format mimeType url } } ... on MediaImage { id image { altText originalSrc } } }`,
        });
        aggregate.push({
          ...product,
          video: data.body.data.product.media.edges[0].node.sources[2].url,
        });
      }
      return aggregate;
    };
    let productAggregate = await getProductAggregate();
    res.json(productAggregate);
  } catch (error) {
    res.json(error);
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
    res.json(checkout);
  });
});

app.post("/checkout/complete", async (req, res) => {
  try {
    const { id, cardDetail, billingAddress, wallet, product, size } = req.body;
    if (!validateCardDetails(cardDetail)) {
      return res.status(400).json({
        message: "Invalid card details",
        error: "Card number, expiry date, and CVV are required",
      });
    }

    let checkout = await fetchCheckout(id);
    console.log("Checkout retrieved successfully");

    const token = await createStripeToken(cardDetail);
    console.log("Stripe token created successfully");
    // console.log(token);

    const shippingRates = await fetchShippingRates(id);
    console.log("Shipping rates retrieved successfully");

    const shippingLine = await updateShippingLine(id, shippingRates[0].handle);
    console.log("Shipping line updated successfully");

    const completeOrder = await completeOrderWithTokenizedPayment(
      id,
      token.id,
      checkout,
      billingAddress
    );
    console.log("complete order called, checking for errors");
    const errorCount = completeOrder.checkoutUserErrors?.length || 0;
    console.log("errors: ", completeOrder.checkoutUserErrors?.length || 0);
    if (errorCount === 0) {
      console.log("Order placed successfully");
      mintWallet(product, wallet, size);
      return res.json("success");
      // return res.json({ message: "success" });
    } else {
      console.log(completeOrder.checkoutUserErrors);
      if (completeOrder.checkoutUserErrors) {
        console.log(
          completeOrder.checkoutUserErrors.map((err) => err.message).join(", ")
        );
      }

      return res.status(500).json({
        message: "Order placement failed",
        errors: devbool
          ? completeOrder.checkoutUserErrors
              .map((err) => err.message)
              .join(", ")
          : "Order placement failed", // if devbool is true, return the error message from Shopify, otherwise return a generic error message
      });
    }
  } catch (error) {
    console.error(`Error in /checkout/complete: ${error}`);
    return handleError(error, res);
  }
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

app.listen(PORT, () => console.log("App is listening at port 8080"));
