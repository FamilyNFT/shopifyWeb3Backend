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
import { mintWallet } from "./web3.js";
const stripe = Stripe(
  "sk_test_51M9pWNA9mNbyjY0WqUGvSuyMJi00IfvDX72Vqz2ZBwVRsvr0RIJ0bxlXDnFT23TOeclOrBu7gmFzT3a37NPvjWZs00l77iSupH"
);

const app = express();
dotenv.config();
const endpoint = "https://familylukso.myshopify.com/api/2022-04/graphql.json";

global.fetch = fetch;
global.Headers = global.Headers || Headers;
//middlewares//
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://familylyx.com",
      "https://family-frontend-delta.vercel.app",
    ],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Constants//
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const STOREFRONT_TOKEN = process.env.STOREFRONT_TOKEN;
const PORT = process.env.PORT || 8080;

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
        let productID = `"gid:\/\/shopify\/Product\/${
          product?.id.split("/")[4]
        }"`;
        console.log(productID);
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
    // console.log(products[0].price);
    res.json(productAggregate);
  } catch (error) {
    res.json(error);
    console.log(error);
  }
});
app.post("/checkout", async (req, res) => {
  try {
    let jsonBody = req.body;
    const id = jsonBody.id;
    let checkout = await client.checkout.create();
    const lineItemsToAdd = [
      {
        variantId: id,
        quantity: 1,
      },
    ];

    let addLine = await client.checkout.addLineItems(
      checkout.id,
      lineItemsToAdd
    );
    let newCheckout = await client.checkout.fetch(checkout.id);
    res.json(newCheckout);
  } catch (error) {
    res.json(error);
    console.log(error);
  }
});

app.post("/checkout/complete", async (req, res) => {
  const { id, cardDetail, billingAddress, wallet, product, size } = req.body;
  console.log(cardDetail);
  let checkout = await client.checkout.fetch(id);
  // const vault = await fetch("https://elb.deposit.shopifycs.com/sessions", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     credit_card: {
  //       number: "4242424242424242",
  //       first_name: "John",
  //       last_name: "Smith",
  //       month: "5",
  //       year: "2025",
  //       verification_value: "123",
  //     },
  //   }),
  // });
  // let vaultid = await vault.json();
  let cardDate = cardDetail.date?.split("/");

  const token = await stripe.tokens.create({
    card: {
      number: cardDetail.number?.split(" ").join(""),
      exp_month: parseInt(cardDate[0]),
      exp_year: parseInt(`20${cardDate[1]}`),
      cvc: cardDetail.cvv,
    },
  });
  // let data = {
  //   firstName: "John",
  //   lastName: "Doe",
  //   address1: "123 Test Street",
  //   province: "Quebec",
  //   country: "Canada",
  //   city: "Montreal",
  //   zip: "H3K0X2",
  // };

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
  // console.log(vaultid);
  // const variables1 = {
  //   checkoutId: id,
  //   payment: {
  //     paymentAmount: {
  //       amount: checkout.paymentDue,
  //       currencyCode: checkout.currencyCode,
  //     },
  //     idempotencyKey: "123",
  //     billingAddress: billingAddress,
  //     vaultId: vaultid.id,
  //   },
  // };
  let shippingRates = await storeClient.query({
    data: {
      query: `query queryCheckout($checkoutId:ID!) { node(id: $checkoutId) { ... on Checkout { id webUrl availableShippingRates { ready shippingRates { handle priceV2 { amount } title } } } } }`,
      variables: {
        checkoutId: id,
      },
    },
  });
  // res.json(
  //   shippingRates.body.data.node.availableShippingRates.shippingRates[0]
  //   );
  console.log(
    shippingRates.body.data.node.availableShippingRates.shippingRates
  );

  const shippingLine = await storeClient.query({
    data: {
      query: `mutation checkoutShippingLineUpdate($checkoutId: ID!, $shippingRateHandle: String!) { checkoutShippingLineUpdate(checkoutId: $checkoutId, shippingRateHandle: $shippingRateHandle) { checkout { id } checkoutUserErrors { code field message } } }`,
      variables: {
        checkoutId: id,
        shippingRateHandle:
          shippingRates.body.data.node.availableShippingRates.shippingRates[0]
            .handle,
      },
    },
  });

  // storeClient
  //   .query({
  //     data: {
  //       query: `mutation checkoutCompleteWithCreditCardV2($checkoutId: ID!, $payment: CreditCardPaymentInputV2!) { checkoutCompleteWithCreditCardV2(checkoutId: $checkoutId, payment: $payment) { checkout { id } checkoutUserErrors { code field message } payment { id } } }`,
  //       variables: variables1,
  //     },
  //   })
  //   .then((data) => res.json([data]));
  const completeOrder = await storeClient.query({
    data: {
      query: `mutation checkoutCompleteWithTokenizedPaymentV3($checkoutId: ID!, $payment: TokenizedPaymentInputV3!) { checkoutCompleteWithTokenizedPaymentV3(checkoutId: $checkoutId, payment: $payment) { checkout { id } checkoutUserErrors { code field message } payment { id } } }`,
      variables: variables,
    },
  });
  console.log(
    completeOrder.body.data.checkoutCompleteWithTokenizedPaymentV3
      .checkoutUserErrors
  );
  if (
    completeOrder.body.data.checkoutCompleteWithTokenizedPaymentV3
      .checkoutUserErrors.length === 0
  ) {
    console.log("successful");
    mintWallet(product, wallet, size);
    res.json("successful");
  } else {
    console.log("oops");
    res.json(
      completeOrder.body.data.checkoutCompleteWithTokenizedPaymentV3
        .checkoutUserErrors
    );
  }
});

app.post("/checkout/update", async (req, res) => {
  const { address, id, email } = req.body;
  console.log(address);
  console.log(id);
  try {
    let updateAddress = await client.checkout.updateShippingAddress(
      id,
      address
    );
  } catch (error) {
    console.log(error);
  }
  try {
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
    console.log(error);
    res.status(400);
  }
});

app.listen(PORT, () => console.log("App is listening at port 8080"));
