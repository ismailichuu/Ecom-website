const collections = require('../config/collections');
var db = require('../config/connection')
let { ObjectId } = require('mongodb')
let fs = require('fs');
const { resolve } = require('path');
const { rejects } = require('assert');
const bcrypt = require('bcrypt');

module.exports = {

    verifyLog:(req, res, next)=>{
        if(req.session.admin) next()
        else res.redirect('/admin/admin-login')
    },

    addProducts: (product, callback) => {
        product.price = parseInt(product.price)
        db.get().collection(collections.PRODUCT_COLLECTION).insertOne(product).then((data) => {
            callback(data.insertedId);
        })
    },

    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collections.PRODUCT_COLLECTION).find().toArray();
            resolve(products);
        })
    },

    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            fs.unlink('./public/product-images/' + proId + '.jpg', (err) => {
                if (err) console.log('image not find' + err)
            })
            db.get().collection(collections.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(proId) }).then((response) => {
                resolve(response)
            })
        })
    },

    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },

    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.PRODUCT_COLLECTION)
                .updateOne({ _id: new ObjectId(proId) }, {
                    $set: {
                        name: proDetails.name,
                        price: proDetails.price
                    }
                }).then(() => resolve())
        })
    },

    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collections.ORDER_COLLETIONS).aggregate([
                {
                    $match: {status:'Placed'}
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
            ]).toArray()
            resolve(orders)
        })
    },

    toShip:(orderId)=>{
        return new Promise((resolve, reject)=>{
            db.get().collection(collections.ORDER_COLLETIONS)
            .updateOne({_id:new ObjectId(orderId)},
            {
                $set:{status:'Shipped'}
            }
            ).then(()=> resolve())
        })
    },

    doAdminLogIn:(adminData)=>{
        return new Promise(async(resolve,reject)=>{
            let response = {}
            let admin = await db.get().collection(collections.ADMIN_COLLECTION).findOne({email:adminData.email})
            if(admin){
                bcrypt.compare(adminData.password, admin.password).then((status)=>{
                    if(status) {
                        console.log('log-in success')
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    }else{
                        console.log('log in failed');
                        resolve({status:false})
                    }
                })
            }else{
                console.log('log in failed');
                resolve({status:false})
            }
        })
    }

}