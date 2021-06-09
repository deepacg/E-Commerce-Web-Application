var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')                             // for encrypting password
var objectId=require('mongodb').ObjectID
const Razorpay=require('razorpay')              // require razor pay
const { resolve } = require('path')

var instance = new Razorpay({               // creating an instance for razor pay as a global variable
    key_id: 'rzp_test_ZEcQDaw3Rw8Nju',
    key_secret: 'Jv8bDXEHcfrW2F6AVUc9o37G',
  });

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve, reject)=>{
            userData.password=await bcrypt.hash(userData.password, 10)          // encrypting password
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                resolve(data.ops[0])
            })       
        }) 
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve, reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({email:userData.email})
            if(user){
                bcrypt.compare(userData.password, user.password).then((status)=>{       // compares the encrypted version of the passwords
                    if(status) {
                        console.log('login success')
                        response.user=user
                        response.status=true
                        resolve(response)
                    }
                    else
                        console.log('login failed')
                        resolve({status: false})
                })
            }
            else {
                console.log('user does not exist')
                resolve({status: false})
            }
        })
    },
    doLoginAdmin:(adminData)=>{
        return new Promise(async(resolve, reject)=>{
            let loginStatus=false
            let response={}
            //console.log(adminData.admin)
            let admin=await db.get().collection(collection.ADMIN_COLLECTION).findOne({username:adminData.admin})
            if(admin) {
                if(admin.password==adminData.password) {
                    console.log('login success')
                    response.admin=admin
                    response.status=true
                    resolve(response)
                }
                else {
                    resolve({status: false})
                    console.log('login failed')
                }
            }
            /*if(admin){
                bcrypt.compare(userData.password, user.password).then((status)=>{
                    if(status) {
                        console.log('login success')
                        response.user=user
                        response.status=true
                        resolve(response)
                    }
                    else {
                        console.log('login failed')
                        resolve({status: false})
                    }
                })
            }*/
            else {
                console.log('admin does not exist')
                resolve({status: false})
            }
        })
    },
    addToCart:(prodId, userId)=>{
        let prodObj={                   // instead of pushing just the product id, create a product object with prod id and quantity
            item:objectId(prodId),
            quantity:1
        }
        return new Promise(async(resolve, reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user: objectId(userId)})    // check if items are already present in the cart for this user
            if(userCart) {          // if user exists in cart
                let prodExist=userCart.products.findIndex(prod=> prod.item==prodId)   // check if product also already exists in cart. findIndex() is like 'for loop' checking each product. Here 'prod' is a variable created
                //console.log(prodExist)
                if(prodExist!=-1) {     // if prodExist==-1 product doesn't exist
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user: objectId(userId), 'products.item': objectId(prodId)},
                    {
                        $inc: {'products.$.quantity':1}     // increment quantity by 1
                    }).then(()=>{
                        resolve()
                    })
                }
                else {      // if user exists, but this product doesn't exist in cart
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user: objectId(userId)},{
                        
                        $push: {products: prodObj}      // because 'products' is an array, we have to 'push' new product into it instead of 'set'.
                        
                    }).then((response)=>{
                        resolve()
                    })
                }
            }
            else {              // if cart doesn't exist
                let cartObj={                    // create new cart object
                    user: objectId(userId),
                    products: [prodObj]         // insert array of product objects
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{   // insert into cart collection
                    resolve()
                })
            }

        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([     // get items from cart
            {
                $match: {user: objectId(userId)}    // match userid in cart and product collections
            },
            // {
            //     $lookup: {                                        this lookup was used when quantity was not taken into consideration
            //         from: collection.PRODUCT_COLLECTION,
            //         let: {prodList: '$products'},
            //         pipeline: [
            //             {
            //                 $match: {
            //                     $expr: {
            //                         $in: ['$_id', '$$prodList']
            //                     }
            //                 }
            //             }
            //         ],
            //         as: 'cartItems'
            //     }
            // },
            {
                $unwind: '$products'        // convert array to separate rows
            },
            {
                $project: {                     // what items to project
                    item: '$products.item',
                    quantity: '$products.quantity'
                }
            },
            {
                $lookup: {                                  // find the product in 'product' collection
                    from: collection.PRODUCT_COLLECTION,
                    localField: 'item',                     // from cart collection
                    foreignField: '_id',                    // from product collection
                    as: 'product'
                }
            },
            {
                $project: {                 // what items to project
                    item: 1, quantity:1, product: {$arrayElemAt:['$product', 0]}    // convert product array to object, taking 0th element from the array and put it into the object
                }
            }
        ]).toArray()
        //console.log(cartItems)
        resolve(cartItems)
        })
    },
    addToWishlist:(prodId, userId)=>{

        return new Promise(async(resolve, reject)=>{
            let userWishlist=await db.get().collection(collection.WISHLIST_COLLECTION).findOne({user: objectId(userId)})    
            if(userWishlist) {         
                    
                    db.get().collection(collection.WISHLIST_COLLECTION)
                    .updateOne({user: objectId(userId)},{
                        
                        $push: {products: objectId(prodId)}      
                        
                    }).then((response)=>{
                        resolve()
                    })
                }
            
            else {              
                let wishObj={                    
                    user: objectId(userId),
                    products: [objectId(prodId)]
                }
                db.get().collection(collection.WISHLIST_COLLECTION).insertOne(wishObj).then((response)=>{   
                    resolve()
                })
            }

        })
    },
    addToCartFrWish:(prodId, userId)=>{
        let prodObj={                   
            item:objectId(prodId),
            quantity:1
        }
        return new Promise(async(resolve, reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user: objectId(userId)})    // check if items are already present in the cart for this user
            console.log(userCart)
            if(userCart) {          // if user exists in cart

                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user: objectId(userId)},{
                        
                    $push: {products: prodObj}      // add products to cart
                        
                }).then((response)=>{
                    db.get().collection(collection.WISHLIST_COLLECTION)
                    .updateOne({user: objectId(userId)},{

                        $pull: {products: objectId(prodId)}     // remove products from wishlist

                    }).then(()=>{
                        resolve()
                })
            })
            }
            else {              // if cart doesn't exist
                let cartObj={                    // create new cart object
                    user: objectId(userId),
                    products: [prodObj]         
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{   // insert into cart collection
                    db.get().collection(collection.WISHLIST_COLLECTION).removeOne({user: objectId(userId)})     // remove from wishlist collection
                        resolve()       
                })
            }
        })
    },
    getWishlistProducts:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let wishlistItems=await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([     // get items from cart
            {
                $match: {user: objectId(userId)}    // match userid in cart and product collections
            },
             {
                $lookup: {                                       
                    from: collection.PRODUCT_COLLECTION,
                    let: {prodList: '$products'},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ['$_id', '$$prodList']
                                }
                            }
                        }
                    ],
                    as: 'wishlist'
                }
            },
            {
                $project: {
                    item: {$arrayElemAt: ['$products', 0]}, product: {$arrayElemAt: ['$wishlist', 0]}  // accessing 0th element of wishlist array of objects and projecting it
                }
            }

        ]).toArray()
        //console.log(wishlistItems)
        resolve(wishlistItems)
        })
    },
    viewProdDetails: (prodId)=>{
        return new Promise(async(resolve, reject)=>{
            let product=await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id: objectId(prodId)})
            resolve(product)
        })
    },

    getCartCount:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let count=0
            //let quantity[100]=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user: objectId(userId)})
            if(cart) {
                // count=cart.products.length      // getting the number of products for this user in the cart collection
                for(var i in cart.products) {
                    //console.log(cart.products[i])
                    count+=cart.products[i].quantity      // getting the total number of each products in cart
                }
            }
            //console.log(count)
            resolve(count)
        })
    },
    changeQuantity: (details)=>{                    // can also write ({cartId, prodId, count}). should be passed in same order
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
        //console.log(details.cartId, details.prodId)
        return new Promise(async(resolve, reject)=>{
            //console.log(details.count, details.quantity)
            if(details.quantity==1 && details.count==-1){       // if quantity is 1 and count is -1, that is '-' button is pressed.
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id: objectId(details.cartId)},
                    {
                        $pull:{products:{item:objectId(details.prodId)}     // if quantity less than 1 remove product from list
                    }                                              // cannot use removeOne here because entire record need not be deleted, only one product from the array is to be removed.
                    }).then((response)=>{ 
                        resolve({removeProduct:true})       // 'removeProduct' is a flag set and passed to ajax code
                    })
            }
            else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cartId), 'products.item':objectId(details.prodId)},
                    {
                        $inc: {'products.$.quantity': details.count}        // same code written for addToCart()
                    }).then((response)=>{
                        resolve({status: true})     // given as an object because later we have to append total also to it.
                    })
            }
        })
    
    },
    changeQuantityBN: (details)=>{                    // can also write ({cartId, prodId, count}). should be passed in same order
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
        //console.log(details.cartId, details.prodId)
        return new Promise(async(resolve, reject)=>{
            //console.log(details.count, details.quantity)
            if(details.quantity==1 && details.count==-1){       // if quantity is 1 and count is -1, that is '-' button is pressed.
                // db.get().collection(collection.CART_COLLECTION)
                //     .updateOne({_id: objectId(details.cartId)},
                //     {
                //         $pull:{products:{item:objectId(details.prodId)}     // if quantity less than 1 remove product from list
                //     }                                              // cannot use removeOne here because entire record need not be deleted, only one product from the array is to be removed.
                //     }).then((response)=>{ 
                //         resolve({removeProduct:true})       // 'removeProduct' is a flag set and passed to ajax code
                //     })
            }
            else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cartId), 'products.item':objectId(details.prodId)},
                    {
                        $inc: {'products.$.quantity': details.count}        // same code written for addToCart()
                    }).then((response)=>{
                        resolve({status: true})     // given as an object because later we have to append total also to it.
                    })
            }
        })
    
    },
    removeItem:(details)=>{
        return new Promise((resolve, reject)=>{
            //console.log(details)
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id: objectId(details.cartId)},
            {
                $pull:{products:{item:objectId(details.prodId)}
            }
            }).then((response)=>{ 
                resolve({removeProduct:true})
            })
        })
    },
    removeItemWish:(details)=>{
        return new Promise((resolve, reject)=>{
            console.log(details)
            db.get().collection(collection.WISHLIST_COLLECTION)
            .updateOne({_id: objectId(details.wishlistId)},
            {
                $pull:{products:objectId(details.prodId)
            }   
            }).then((response)=>{ 
                resolve({removeProduct:true})
            })
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let totalAmt=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {user: objectId(userId)}
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
                },    
                {
                    $group: {
                        _id: null,
                        total: {$sum: {$multiply: ['$quantity', '$product.price']}}     // to get total sum we need $group
                    }
                }
                ]).toArray()

                if(totalAmt[0]){
                    resolve(totalAmt[0].total)     // got the total amount
                    //console.log(totalAmt[0].total)
                }
                else
                    resolve()
        })
    }, 
    placeOrder:(order, products, total)=>{
        return new Promise((resolve, reject)=>{
            //console.log(order, products, total)
            let date=new Date()
            let status=order['payment-method']==='COD'?'Placed':'Pending'   // if payment method is COD, status is set to 'placed', otherwise 'pending'
            let addrObj={
                mobile: order.mobile,
                address: order.address,
                pincode: order.pincode,
                state: order.state,
                city: order.city
            }
            let orderObj={
                address: addrObj,
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],     // for variables with '-'hyphen, use square brackets with quotes
                products: products,
                totalAmount: total,
                status: status,
                shipStatus: 'Not Shipped',
                date: date.getDate()+'/'+date.getMonth()+'/'+date.getFullYear()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{     // insert into order collection
                db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(order.userId)})    // remove from cart collection
                //console.log('response.ops: ', response.ops[0])
                resolve(response.ops[0]._id)      // will have the order id
            })
            db.get().collection(collection.USER_COLLECTION).updateOne({_id: objectId(order.userId)},
            {
                $set: {
                    address: addrObj        // updating address of the user
                }
            }).then(()=>{
                resolve()
            })
        })
    },
    placeOrderSeparate:(order)=>{
        return new Promise((resolve, reject)=>{
            //console.log(order)
            let date=new Date()
            let status=order['payment-method']==='COD'?'Placed':'Pending'   
            let addrObj={
                mobile: order.mobile,
                address: order.address,
                pincode: order.pincode,
                state: order.state,
                city: order.city
            }
            let orderObj={
                address: addrObj,
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],     
                products: [objectId(order.prodId)],
                totalAmount: order.price,
                status: status,
                shipStatus: 'Not Shipped',
                date: date.getDate()+'/'+date.getMonth()+'/'+date.getFullYear()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                console.log(response)
                resolve(response.ops[0]._id)
            })

            db.get().collection(collection.USER_COLLECTION).updateOne({_id: objectId(order.userId)},
            {
                $set: {
                    address: addrObj        
                }
            }).then(()=>{
                resolve()
            })
        })
    },
    getCartProdList:(userId)=>{
        return new Promise(async(resolve, reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user: objectId(userId)})
            //console.log(cart)
            resolve(cart.products)
        })
    },
    getOrderDetails: (userId)=>{
        return new Promise(async(resolve, reject)=>{
            let order=await db.get().collection(collection.ORDER_COLLECTION).find({userId: objectId(userId)}).toArray()
            //console.log(order)
            resolve(order)
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
            console.log(orderProducts)
            resolve(orderProducts)
            
        })
    },
    cancelOrder: (orderId, userId)=>{
        return new Promise((resolve, reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).removeOne({_id: objectId(orderId), userId:objectId(userId)})
                resolve()
        })
    },
    
    cancelItem: (orderDetails)=>{
        return new Promise((resolve, reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({_id: objectId(orderDetails._id), 'products[item]':objectId(orderDetails.products[item])},
                {
                    $pull:{products:{item:objectId(orderDetails.products[item])}
                }
                }).then((response)=>{ 
                    resolve({removeItem:true})
                })
        })
    },
    generateRazorpay: (orderId, total)=>{
        return new Promise((resolve, reject)=>{
            total=parseFloat(total)     // convert total to float
            var options = {
                amount: total*100,  // amount in the smallest currency unit (convert to paise)
                currency: "INR",
                receipt: ""+orderId     // receipt must be a string, converted to string
              };
              instance.orders.create(options, function(err, order) {
                //console.log(err)
                //console.log("New order: ",order);
                resolve(order)
              });
        })
    },
    verifyPayment: (details)=>{
        return new Promise((resolve, reject)=>{
            const crypto=require('crypto')
            let hmac = crypto.createHmac('sha256', 'Jv8bDXEHcfrW2F6AVUc9o37G');
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex') 
            //console.log("key: ",hmac)
            if(hmac==details['payment[razorpay_signature]']) {
                console.log('payment successful')
                resolve()
            }
            else {
                console.log('payment failed')
                reject()
            }
        })
    },
    changePaymentStatus: (orderId)=>{
        return new Promise((resolve, reject)=>{
            //console.log('order id: ', orderId)
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({_id: objectId(orderId)},
                {
                    $set: {
                        status: 'Placed'
                    }
                }).then(()=>{
                    resolve()
                })
        })   
    },
    getUserDetails: (userId)=>{
        return new Promise((resolve, reject)=>{
            let userDetails = db.get().collection(collection.USER_COLLECTION).findOne({_id: objectId(userId)})
            resolve(userDetails)
        })
    },
    getUsers: ()=>{
        return new Promise((resolve, reject)=>{
            let users=db.get().collection(collection.USER_COLLECTION).find().toArray()
                resolve(users)  
        })
    },
}