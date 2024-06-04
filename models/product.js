const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name:{type: String,required: true},
    brand:{type: String,required: true},
    desc:{type: String,required: true},
    price:{type: Number,required: true},
    image:{type: Object,required: true},
    quantity: { type: Number, default: 1 },
    isOnSale: { type: Boolean, default: false },
    salePrice: {
        type: Number,
        required: function() { return this.isOnSale; }  // Conditional logic here
    },
    popularity: { type: Boolean, default: false },
    quantity: { type: Number, required: true, default: 0 },
},{
    timestamps:true
})

const Product = mongoose.model("Product", productSchema);

exports.Product = Product;