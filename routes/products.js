const express = require("express");
const cloudinary =require("../utils/cloudinary");
const { Product } = require("../models/product");
const { auth, isUser, isAdmin } = require("../middleware/auth");
const { Notification } = require("../models/notification"); // Assuming you have a Notification model


const router = require("express").Router();

//CREATE

router.post("/", isAdmin, async (req, res) => {
  const { name, brand, desc, price, image ,isOnSale, salePrice,popularity,quantity} = req.body;

  try {
    if (image) {
      const uploadedResponse = await cloudinary.uploader.upload(image, {
        upload_preset: "onlineShop",
      });

      if (uploadedResponse) {
        const product = new Product({
          name,
          brand,
          desc,
          price,
          image: uploadedResponse,
          isOnSale,
          salePrice,
          popularity,
          quantity,
        });

        const savedProduct = await product.save();
        res.status(200).send(savedProduct);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

//DELETE

router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if(!product) return res.status(404).send("Product not found...");
    if(product.image.public_id){
      const destroyResponse = await cloudinary.uploader.destroy(
          product.image.public_id
      );
  
      if(destroyResponse){
          const deletedProduct = await Product.findByIdAndDelete(req.params.id);
          res.status(200).send(deletedProduct);
      } else {
          console.log("Action terminated. Failed to deleted product image...");
          res.status(500).send("Failed to delete product image.");
      }
  } else {
      await Product.findByIdAndDelete(req.params.id);
      res.status(200).send("Product has been deleted...");
  }
  } catch (error) {
    res.status(500).send(error);
  }
});

//GET ALL PRODUCTS

router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).send(products);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

//GET PRODUCT

router.get("/find/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.status(200).send(product);
  } catch (error) {
    res.status(500).send(error);
  }
});


//SERECH 
router.get("/search", async (req, res) => {
  const searchTerm = req.query.term;

  try {
    const products = await Product.find({
      name: { $regex: searchTerm, $options: "i" } // 'i' for case-insensitive
    });

    if (products.length > 0) {
      res.status(200).json(products);
    } else {
      res.status(404).json({ message: "No products found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Error searching for products", error });
  }
});




//UPDATE
router.put("/:id", isAdmin, async (req, res) => {
  if(req.body.productImg) {
    try {
        
      const destroyResponse = await cloudinary.uploader.destroy(
        req.body.product.image.public_id
      );
      if(destroyResponse) {
        const uploadedResponse = await cloudinary.uploader.upload(
          req.body.productImg,
          {
            upload_preset: "OnlineShop",
          }
        );
        if(uploadedResponse) {
          const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
              $set: {
                ...req.body.product,
                image: uploadedResponse,
              },
            },
            {new: true}
          );
          res.status(200).send(updatedProduct);
        }

      }
    } catch (error) {
      res.status(500).send(error);
    }
  }else {
    try {
      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
          $set: req.body.product,
        },
        {new:true}
      );
      res.status(200).send(updatedProduct);
    } catch (error) {
      res.status(500).send(error);
    }
  }
});


router.patch('/:id/decreaseQuantity', async (req, res) => {
  try {
      const product = await Product.findById(req.params.id);
      const purchasedQuantity = req.body.quantity || 1; // Default to 1 if not provided

      if (!product) {
          return res.status(404).send('Product not found');
      }
      if (product.quantity >= purchasedQuantity) {
          product.quantity -= purchasedQuantity;
          await product.save();
          res.status(200).send(product);
      } else {
          res.status(400).send('Insufficient product stock');
      }
  } catch (error) {
      res.status(500).send(error);
  }
});


module.exports = router;