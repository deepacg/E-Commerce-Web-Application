var db=require('../config/connection')              // need this for accessing db in this file
var collection=require('../config/collections')
var objectId=require('mongodb').ObjectID            // id is stored as object id in mongodb

module.exports={                                         // to be able to access all the functions in other js files
    
    addProduct:(product, callback)=>{
        //console.log(product)
        db.get().collection('product').insertOne(product).then((data)=>{       // by default creating collection 'product'
            //console.log(data.ops[0])
            callback(data.ops[0]._id)           // using callback without promise
        })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve, reject)=>{            // using promise
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()      // array of data is coming so we have to convert toArray()
            //console.log(products)         // we have to wait till the data is fetched from the table. so we have to use async-await
            resolve(products)
        })
    },
    getSearchProducts:(searchTerm)=>{
        return new Promise(async(resolve, reject)=>{            
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find({name: searchTerm}).toArray()      
            //console.log(products)         
            resolve(products)
        })
    },
    deleteProduct:(prodId)=>{
        return new Promise((resolve, reject)=>{
            //console.log(prodId)
            //console.log(objectId(prodId))
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objectId(prodId)}).then((response)=>{     // need to compare with object id
                //console.log(response)
                resolve(response)
            })
        })
    },
    getProductDetails:(prodId)=>{
        return new Promise((resolve, reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    updateProduct:(prodId, prodDetails)=>{
        return new Promise((resolve, reject)=> {
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:objectId(prodId)},{
                $set:{
                    name: prodDetails.name,
                    category: prodDetails.category,
                    description: prodDetails.description,
                    price: prodDetails.price
                }
            }).then((response)=>{
                resolve()
            })
        })
    },
    showOrders: ()=>{
        return new Promise((resolve, reject)=>{
            let orders=db.get().collection(collection.ORDER_COLLECTION).find().toArray()
                resolve(orders)  
        })
    },
    getOrderProducts: (orderId)=>{
        return new Promise(async(resolve, reject)=>{
            let orderProducts=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {_id: objectId(orderId)}
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
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity:1, product: {$arrayElemAt:['$product', 0]}
                    }
                }
            ]).toArray()
            //console.log(orderProducts)
            resolve(orderProducts)  
        })
    },

    updateShipStatus: (orderId)=>{
        return new Promise((resolve, reject)=>{
            console.log("product helpers order id: ", orderId)
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({_id: objectId(orderId)},
                {
                    $set: {
                        shipStatus: 'Shipped'
                    }
                }).then((response)=>{
                    //console.log(response)
                    resolve(response)
                })
        })
    }
}