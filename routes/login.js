// Importing required modules
const bcrypt = require("bcrypt");
const Joi = require("joi");
const express = require("express");
const { User } = require("../models/user");
const genAuthToken = require("../utils/genAuthToken");

// Creating a router for handling HTTP requests
const router = express.Router();

// POST request for login
router.post("/", async (req, res) => {
    // Validating user input using Joi
    const schema = Joi.object({
        email: Joi.string().min(3).max(200).required().email(),
        password: Joi.string().min(6).max(200).required(),
    });
    const { error } = schema.validate(req.body);

    // If validation fails, send a 400 error with details
    if (error) return res.status(400).send(error.details[0].message);

    // Checking if user exists in the database
    let user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send("Invalid email or password...");

    // Comparing the input password with the hashed password in the database
    const isValid = await bcrypt.compare(req.body.password, user.password);
    if (!isValid) return res.status(400).send("Invalid email or password...");

    // Generating an authentication token for the user
    const token = genAuthToken(user);
    res.send(token);
});

// Exporting the router for use in other files
module.exports = router;
