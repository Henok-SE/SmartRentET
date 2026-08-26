const axios = require('axios');

const STARPAY_API_URL = process.env.STARPAY_API_URL;
const STARPAY_API_SECRET = process.env.STARPAY_API_SECRET;

const starpayClient = axios.create({
    baseURL: STARPAY_API_URL,
    headers: {
        'Content-type': 'application/json',
        "x--api-secret": STARPAY_API_SECRET,
    },
});

const createTransaction = async ({
    amount,
    description,
    customerName,
    customerPhoneNumber,
    callbackURL,
    redirectUrl,
    metadata,
}) => {
    const response = await starpayClient.post("/trdp/order", {
        amount,
        description,
        currency: "ETB",
        customerName,
        customerPhoneNumber,
        callbackURL,
        redirectUrl,
        metadata,
        items: [
           { 
              item_name: description,
              quantity: 1,
              unit_price: amount,
           },
        ],
    });

    return response.data
};

 module.exports = {
    createTransaction,
 };