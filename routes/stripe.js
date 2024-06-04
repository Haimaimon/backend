const express = require("express");
const Stripe = require("stripe");
const {Order} = require('../models/order');
const {Product} = require('../models/product');
const crypto = require('crypto');

require("dotenv").config();

const stripe = Stripe(process.env.STRIPE_KEY);

const router = express.Router();

const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'; // Example 32-byte key
const IV_LENGTH = 16; // For AES, this is always 16

function encryptCardNumber(cardNumber) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(cardNumber);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptCardNumber(encryptedCardNumber) {
  const textParts = encryptedCardNumber.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}


router.post('/create-checkout-session', async (req, res) => {
  const customer = await stripe.customers.create({
    metadata: {
      userId: req.body.userId,
    },
  })

    const line_items = req.body.cartItems.map((item) => {
        // Define the base structure for the line item
        let lineItem = {
            productId: item.id,
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    images: [item.image.url || item.image.secure_url], // Ensure this points to a valid image URL
                    description: item.desc,
                },
                unit_amount: item.price * 100, // Stripe expects amounts in cents
            },
            quantity: 1, // Default quantity set to 1
        };

        // If the cartQuantity is greater than 1, adjust the quantity field
        if (item.cartQuantity > 1) {
            lineItem.quantity = item.cartQuantity;
        }

        return lineItem;
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "KE"],
        },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: {
                amount: 0,
                currency: "usd",
              },
              display_name: "Free shipping",
              // Delivers between 5-7 business days
              delivery_estimate: {
                minimum: {
                  unit: "business_day",
                  value: 5,
                },
                maximum: {
                  unit: "business_day",
                  value: 7,
                },
              },
            },
          },
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: {
                amount: 1500,
                currency: "usd",
              },
              display_name: "Next day air",
              // Delivers in exactly 1 business day
              delivery_estimate: {
                minimum: {
                  unit: "business_day",
                  value: 1,
                },
                maximum: {
                  unit: "business_day",
                  value: 1,
                },
              },
            },
          },
        ],
        phone_number_collection: {
          enabled: true,
        },

      line_items,
      mode: 'payment',
      customer: customer.id,
      success_url: `${process.env.CLIENT_URL}/checkout-success`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
    });
  
    res.send({url:session.url });
  });
  const createOrder = async (customer, data,lineItems) => {
    const paymentIntent = await stripe.paymentIntents.retrieve(data.payment_intent);
    const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
    const card = charge.payment_method_details.card;

    const newOrder = new Order({
      userId: customer.metadata.userId,
      customerId: data.customer,
      paymentIntentId: data.payment_intent,
      products:lineItems.data,
      subtotal: data.amount_subtotal,
      total: data.amount_total,
      shipping: data.customer_details,
      payment_status: data.payment_status,
      encryptedCardNumber: encryptCardNumber(card.last4), // Encrypt and store the last 4 digits of the card number

    });
  
    try {
      const savedOrder = await newOrder.save();
      // Update the quantity of each product in the order
      for (const item of lineItems.data) {
        const product = await Product.findById(savedOrder._id);
        if (product) {
          product.quantity -= item.quantity; // Subtract the purchased quantity from the stock
          if (product.quantity < 0) product.quantity = 0; // Ensure the quantity doesn't go negative
          await product.save();
        }
      }
    } catch (err) {
      console.log(err);
    }
  };
// Webhook endpoint for Stripe
let endpointSecret;
router.post(
  "/webhook",
  express.json({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let data;
    let eventType;

    if (endpointSecret) {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          endpointSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed:  ${err}`);
        return res.sendStatus(400);
      }
      // Extract the object from the event.
      data = event.data.object;
      eventType = event.type;
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      data = req.body.data.object;
      eventType = req.body.type;
    }

    // Handle the checkout.session.completed event
    if (eventType === "checkout.session.completed") {
      stripe.customers
        .retrieve(data.customer)
        .then((customer) => {
          stripe.checkout.sessions.listLineItems(
            data.id,
            {},
            function (err,lineItems) {
              //console.log("line" , lineItems);
              createOrder(customer,data,lineItems);
            }
          );
        }) 
        
        .catch((err) => console.log(err.message));
    }

    res.status(200).end();
  }
);

module.exports = router;