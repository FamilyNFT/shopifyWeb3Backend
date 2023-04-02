import { client, storeClient } from "./shopifyClient.js";
import { stripeKey } from "../constants/constants.js";
import Stripe from "stripe";
const stripe = Stripe(stripeKey);

const updateShippingAddress = async (id, address) => {
  // there is an error here when the second page attempts to update the shipping address
  // the last name is not being sent to the backend, so the backend is throwing an error or something

  if (!id) {
    console.error("Checkout ID is invalid");
    return {
      success: false,
      message: "Checkout ID is invalid",
    };
  }

  try {
    // console.log("Updating shipping address with:", address);
    const updateAddress = await client.checkout.updateShippingAddress(id, {
      ...address,
      lastName: "",
    });

    let checkout = await client.checkout.fetch(id);
    // console.error(updateAddress.userErrors);
    if (updateAddress.userErrors.length > 0) {
      // Ignore all errors related to the last name field
      const nonLastNameErrors = updateAddress.userErrors.filter(
        (error) => error.field[0].value !== "lastName"
      );

      if (nonLastNameErrors.length > 0) {
        return {
          success: false,
          message: "Failed to update shipping address",
          errors: nonLastNameErrors,
        };
      } else {
        console.log("Shipping address updated successfully:", checkout);
        return {
          success: true,
          message: "Shipping address updated successfully",
          checkout: checkout,
        };
      }
    } else {
      console.log("Shipping address updated successfully:", checkout);
      return {
        success: true,
        message: "Shipping address updated successfully",
        checkout: checkout,
      };
    }
  } catch (error) {
    console.error(
      "An error occurred while updating the shipping address:",
      error
    );
    return {
      success: false,
      message: "An error occurred while updating the shipping address",
      error: error.message,
    };
  }
};

function validateCardDetails(cardDetail) {
  return cardDetail && cardDetail.number && cardDetail.date && cardDetail.cvv;
}

async function fetchCheckout(id) {
  return await client.checkout.fetch(id);
}

async function createStripeToken(cardDetail) {
  let cardDate = cardDetail.date?.split("/");

  try {
    const token = await stripe.tokens.create({
      card: {
        number: cardDetail.number?.split(" ").join(""),
        exp_month: parseInt(cardDate[0]),
        exp_year: parseInt(`20${cardDate[1]}`),
        cvc: cardDetail.cvv,
      },
    });
    return token;
  } catch (error) {
    console.error(error);
    console.log("error");
  }
}

const fetchShippingRates = async (id) => {
  try {
    let shippingRates = null;
    while (!shippingRates) {
      const shippingRatesResponse = await storeClient.query({
        data: {
          query:
            " query queryCheckout($checkoutId:ID!) { node(id: $checkoutId) { ... on Checkout { id webUrl availableShippingRates { ready shippingRates { handle priceV2 { amount } title } } } } }",
          variables: {
            checkoutId: id,
          },
        },
      });

      const { node } = shippingRatesResponse.body.data;
      if (node) {
        const { availableShippingRates } = node;
        if (availableShippingRates) {
          if (availableShippingRates.ready) {
            shippingRates = availableShippingRates.shippingRates;
          } else {
            console.log("Shipping rates not ready yet, retrying...");
            await sleep(500);
          }
        } else {
          throw new Error("No available shipping rates for the checkout");
        }
      } else {
        throw new Error("Could not retrieve shipping rates for the checkout");
      }
    }

    return shippingRates;
  } catch (error) {
    console.error("Error in fetchShippingRates: ", error);
    throw error;
  }
};

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const updateShippingLine = async (id, handle) => {
  const shippingLine = await storeClient.query({
    data: {
      query: `mutation checkoutShippingLineUpdate($checkoutId: ID!, $shippingRateHandle: String!) { checkoutShippingLineUpdate(checkoutId: $checkoutId, shippingRateHandle: $shippingRateHandle) { checkout { id } checkoutUserErrors { code field message } } }`,
      variables: {
        checkoutId: id,
        shippingRateHandle: handle,
      },
    },
  });
  return shippingLine;
};

const completeOrderWithTokenizedPayment = async (
  id,
  paymentData,
  checkout,
  billingAddress
) => {
  const IDEMPOTENCY_KEY = "123";
  const STRIPE_VAULT_TOKEN = "STRIPE_VAULT_TOKEN";
  const variables = {
    checkoutId: id,
    payment: {
      paymentAmount: {
        amount: checkout.paymentDue,
        currencyCode: checkout.currencyCode,
      },
      idempotencyKey: IDEMPOTENCY_KEY,
      billingAddress: billingAddress,
      type: STRIPE_VAULT_TOKEN,
      paymentData: paymentData,
    },
  };

  const completeOrder = await storeClient.query({
    data: {
      query: `mutation checkoutCompleteWithTokenizedPaymentV3($checkoutId: ID!, $payment: TokenizedPaymentInputV3!) { checkoutCompleteWithTokenizedPaymentV3(checkoutId: $checkoutId, payment: $payment) { checkout { id } checkoutUserErrors { code field message } payment { id } } }`,
      variables: variables,
    },
  });

  return completeOrder;
};

const handleError = (error, res) => {
  console.error(error);
  return res.status(500).json({
    message: "An error occurred while processing the order",
    error: error.message,
  });
};

export {
  validateCardDetails,
  fetchCheckout,
  createStripeToken,
  fetchShippingRates,
  updateShippingLine,
  completeOrderWithTokenizedPayment,
  handleError,
  updateShippingAddress,
};
