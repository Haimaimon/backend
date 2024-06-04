const express = require('express');
const axios = require('axios');
const router = express.Router();
const math = require("mathjs");

const YAHOO_FINANCE_API_KEY = 'KAa9SlllHA4jK6SOk76JV5ippsaTPNIL9RffpmD1';
const YAHOO_FINANCE_BASE_URL = 'https://yfapi.net/v8/finance/spark';

const setYahooFinanceHeaders = (req, res, next) => {
  axios.defaults.headers.common['X-API-KEY'] = YAHOO_FINANCE_API_KEY;
  next();
};

router.get('/stock/:symbol', setYahooFinanceHeaders, async (req, res) => {
    const symbol = req.params.symbol;
    const interval = req.query.interval || '1d';
    const range = req.query.range || '1y';
    try {
        const response = await axios.get(`${YAHOO_FINANCE_BASE_URL}?symbols=${symbol}&interval=${interval}&range=${range}`);
        const data = response.data[symbol];
        
        // Calculate moving averages
        const prices = data.close;
        const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const sma200 = prices.slice(-200).reduce((a, b) => a + b, 0) / 200;

        const stockData = {
            prices,
            sma20,
            sma200,
            ...data,
        };
        res.json(stockData);
    } catch (error) {
        console.error('Failed to fetch stock data:', error);
        res.status(500).send('Failed to fetch stock data');
    }
});

module.exports = router;
