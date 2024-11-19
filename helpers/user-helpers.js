let db = require('../config/connection');
let collections = require('../config/collections');
const bcrypt = require('bcrypt');
const { response } = require('express');
const { log } = require('handlebars');
const Razorpay = require('razorpay')
const { ObjectId, ReturnDocument } = require('mongodb');
const { resolve } = require('path');
const { rejects } = require('assert');
var instance = new Razorpay({ key_id: 'rzp_test_Sezj7A8zTbhSwb', key_secret: 'awmpg5OkNVsMKDDbYAsOyTp2' })


module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email });
            if (user) {
                resolve()
            } else {
                userData.password = await bcrypt.hash(userData.password, 10)
                const data = await db.get().collection(collections.USER_COLLECTION).insertOne(userData)
                resolve(userData)

            }
        })
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {};

            let user = await db.get().collection(collections.USER_COLLECTION).findOne({ email: userData.email });
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log("login Success");
                        response.user = user;
                        response.status = true;
                        resolve(response)
                    }
                    else {
                        console.log('login failed');
                        resolve({ status: false });
                    }
                })
            } else {
                console.log('login failed');
                resolve({ status: false })
            }

        })
    },

    verifyLog: (req, res, next) => {
        if (req.session.userLoggedIn) next()
        else res.redirect('/log-in')
    },

    addToCart: (proId, userId) => {
        let prodObj = {
            item: new ObjectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (userCart) {
                let prodExist = userCart.products.findIndex(product => product.item == proId)
                if (prodExist != -1) {
                    db.get().collection(collections.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }).then(() => resolve())
                } else {
                    db.get().collection(collections.CART_COLLECTION)
                        .updateOne({ user: new ObjectId(userId) },
                            {
                                $push: { products: prodObj }
                            }).then((response) => resolve())
                }
            } else {
                let cartObj = {
                    user: new ObjectId(userId),
                    products: [prodObj]
                }
                db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then((response) => resolve())
            }
        })
    },

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(cartItems)

        })
    },

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let user = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
            if (user) count = user.products.length;
            resolve(count)
        })
    },

    changeProductQuantity: (details) => {
        let count = parseInt(details.count)
        return new Promise((resolve, reject) => {
            if (count == -1 && details.quantity == 1) {
                db.get().collection(collections.CART_COLLECTION)
                    .updateOne(
                        {
                            _id: new ObjectId(details.cart)
                        },
                        {
                            $pull: { products: { item: new ObjectId(details.product) } }
                        }).then(() => resolve({ removeProduct: true }))
            } else {
                db.get().collection(collections.CART_COLLECTION)
                    .updateOne(
                        {
                            _id: new ObjectId(details.cart),
                            'products.item': new ObjectId(details.product)
                        },
                        {
                            $inc: { 'products.$.quantity': count }
                        }
                    ).then(() => resolve({ status: true }))
            }
        })

    },

    removeItem: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.CART_COLLECTION)
                .updateOne(
                    {
                        _id: new ObjectId(details.cart),
                    },
                    {
                        $pull: { products: { item: new ObjectId(details.product) } }
                    }).then(() => resolve(true))
        })
    },

    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }
            ]).toArray()
            if (cartItems[0]) resolve(cartItems[0].total)
            else resolve(0)
        })
    },

    placeOrder: (order, cart, totalAmount) => {
        return new Promise((resolve, reject) => {
            let status = order.paymentMethod === 'cod' ? 'Placed' : 'Pending'
            let orderObj = {
                deliveryDetails: {
                    phone: order.phone,
                    address: order.address,
                    landmark: order.landmark,
                    pincode: order.pincode
                },
                user: new ObjectId(order.user),
                paymentMethod: order.paymentMethod,
                products: cart,
                totalAmount: totalAmount,
                date: new Date(),
                status: status
            }
            db.get().collection(collections.ORDER_COLLETIONS).insertOne(orderObj).then((response) => {
                response.status = status
                db.get().collection(collections.CART_COLLECTION).deleteOne({ user: new ObjectId(order.user) })
                resolve(response);
            })
        })
    },

    getCartProductsList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            resolve(cart.products)
        })
    },

    getOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collections.ORDER_COLLETIONS).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                        totalAmount: '$totalAmount',
                        status: '$status',
                        paymentMethod: '$paymentMethod'
                    }
                },
                {
                    $lookup: {
                        from: collections.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, totalAmount: 1, status: 1, paymentMethod: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            resolve(orders)
        })
    },

    generateRazorpay: (orderId, totalAmount) => {
        return new Promise(async (resolve, reject) => {
            var options = {
                amount: totalAmount * 100,
                currency: "INR",
                receipt: "" + orderId,
            }
            try {
                const response = await instance.orders.create(options)
                resolve(response)
            } catch (err) {
                console.log(err + 'error in orders')
            }
        })
    },

    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto')
            let hmac = crypto.createHmac('sha256', 'awmpg5OkNVsMKDDbYAsOyTp2')

            hmac.update(details['response[razorpay_order_id]'] + '|' + details['response[razorpay_payment_id]'])
            hmac = hmac.digest('hex')

            if (hmac == details['response[razorpay_signature]']) resolve()
            else reject()
        })
    },

    changePaymentStatus: (orderId) => {
        return new Promise((resolve,reject)=>{
            db.get().collection(collections.ORDER_COLLETIONS)
            .updateOne({ _id: new ObjectId(orderId) }, {
                $set: {
                    status: 'Placed'
                }
            }).then(() => resolve())
        })
        
    }
}
