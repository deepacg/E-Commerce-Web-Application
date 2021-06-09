const { json } = require('express');
var express = require('express');
const session = require('express-session');
const { Db } = require('mongodb');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers')    // need productHelpers here too
const userHelpers=require('../helpers/user-helpers')

const verifyLogin=(req, res, next)=>{
  if(req.session.user) {                  // to check if user is logged in in each page
    next()                                // proceed to next step only if the user is logged in
  } else {
    res.redirect('/login')                // else login page
  }
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  let user=req.session.user           // checks if a user is logged in, if yes, it gets the details
  //console.log(user)
  let cartCount=null
  if(req.session.user)
    cartCount=await userHelpers.getCartCount(req.session.user._id)  // getting cart count
  productHelpers.getAllProducts().then((products)=>{
    //console.log(products)
    res.render('user/view-products', {products, user, cartCount});  // 'user' is passed to homepage to display name on navbar, cartCount is passed to display on badge in homepage
  })
})

router.get('/signup', (req, res)=>{
  res.render('user/signup')
})

router.post('/signup', (req, res)=>{
  userHelpers.doSignup(req.body).then((response)=>{
    //console.log(response)
    req.session.user=response           // saving current user data
    req.session.userLoggedIn=true       // setting logged in variable as true (starting session)
    res.redirect('/')
  })
})

router.get('/login', (req, res)=>{
  if(req.session.user)
    res.redirect('/')
  else {
    res.render('user/login', {loginErr: req.session.userLoginErr})    // login error message/ status (true/false) got from 'post' method passed to login page
    req.session.userLoginErr=false      // after passing login error set to false/null
  }
})

router.post('/login', (req, res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status) {
      req.session.user=response.user      // saving current user data from response to session.user
      req.session.userLoggedIn=true       // setting logged in variable as true (starting session)
      res.redirect('/')
    }
    else {
      req.session.userLoginErr="Invalid username or password"   // login error message passed from 'post' to 'get' method. we can keep a login error in the session itself. can also give value 'true'
      res.redirect('/login')        // here we cannot pass the error message in redirect()
    }
  })
})

router.get('/logout', (req, res)=>{
  //req.session.destroy()       // to destroy a session
  req.session.user=null         // to maintain a user and an admin we cannot use destroy(), so have to set it to null
  req.session.userLoggedIn=false
  res.redirect('/')
})

router.get('/cart', verifyLogin, async (req, res)=>{
  let products=await userHelpers.getCartProducts(req.session.user._id)    // get products from cart of this existing session user
  //console.log(products)
  let totalValue=0
  if(products.length > 0) {
    totalValue=await userHelpers.getTotalAmount(req.session.user._id)      // same total amount
  }
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  res.render('user/cart', {products, 'user':req.session.user, cartCount, totalValue})  // passed 'products' to cart page, passed 'user' to show in navbar, 'totalValue' to display in cart page
})

router.get('/add-to-cart/:id', verifyLogin, (req, res)=>{
  //console.log('api call')   // to check if button click through ajax is reaching here
  userHelpers.addToCart(req.params.id, req.session.user._id).then(()=>{   // passing product id and session user id
    //res.redirect('/')   // this is not required while using ajax
    res.json({status: true})    // json status is returned for ajax 
  })                            // verifyLogin won't work while using ajax
})

router.get('/add-to-cart-wish/:id', verifyLogin, (req, res)=>{
  userHelpers.addToCartFrWish(req.params.id, req.session.user._id).then(()=>{   // passing product id and session user id
    res.redirect('/wishlist')
  })
})

router.get('/wishlist', verifyLogin, async (req, res)=>{
  let products=await userHelpers.getWishlistProducts(req.session.user._id)    
  //console.log(products.wishlist)
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  res.render('user/wishlist', {products, 'user':req.session.user, cartCount})  // cart count is passed to every page so that it is displayed on the cart 'badge'
})

router.get('/add-to-wishlist/:id', verifyLogin, (req, res)=>{
  userHelpers.addToWishlist(req.params.id, req.session.user._id).then(()=>{   
    res.redirect('/')
  })
})

router.get('/product-details/:id', async(req, res)=>{
  let cartCount=null
  if(req.session.user)
    cartCount=await userHelpers.getCartCount(req.session.user._id)
  userHelpers.viewProdDetails(req.params.id).then((product)=>{
    res.render('user/product-details', {product, 'user':req.session.user, cartCount})
  })
})

router.post('/change-quantity/', verifyLogin, (req, res, next)=>{
  //console.log(req.body)         // 'data' part passed from ajax will be available in req.body
  userHelpers.changeQuantity(req.body).then(async(response)=>{
    response.total=await userHelpers.getTotalAmount(req.body.userId)  // same total amount, session won't work here because of using ajax, so user is passed in body
    //console.log( response.total)   // we have to append total also to the response object along with status
    res.json(response)      // in case of ajax only the data needs to be passed as 'json'. the entire page need not be rendered
  })
})

router.post('/change-quantity-bn/', verifyLogin, (req, res, next)=>{
  //console.log(req.body)         // 'data' part passed from ajax will be available in req.body
  userHelpers.changeQuantityBN(req.body).then(async(response)=>{
    response.total=await userHelpers.getTotalAmount(req.body.userId)  // same total amount, session won't work here because of using ajax, so user is passed in body
    //console.log( response.total)   // we have to append total also to the response object along with status
    res.json(response)      // in case of ajax only the data needs to be passed as 'json'. the entire page need not be rendered
  })
})

router.post('/remove-item/', verifyLogin, (req, res, next)=>{
    userHelpers.removeItem(req.body).then((response)=>{
    //console.log(response)
    //res.redirect('/cart')
    res.json(response)
  })
})

router.post('/remove-item-wish/', verifyLogin, (req, res, next)=>{
  //console.log(req.body)
  userHelpers.removeItemWish(req.body).then((response)=>{
  //console.log(response)
  res.redirect('/wishlist')
  res.json(response)
})
})

router.get('/place-order/', verifyLogin, async (req, res)=>{
  let total=await userHelpers.getTotalAmount(req.session.user._id)  // same total amount
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  res.render('user/place-order', {total, user: req.session.user, cartCount})    // pass total value here
})

router.post('/place-order/', verifyLogin, async(req, res)=>{
  //console.log(req.body)     // all data from form will be passed through ajax
  let products=await userHelpers.getCartProdList(req.body.userId)   // get products from cart
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)  // same total amount
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId)=>{
    if(req.body['payment-method']=='COD')
      res.json({cod_status: true})
    //res.render('user/check-out')
    else{ 
      userHelpers.generateRazorpay(orderId, totalPrice).then((response)=>{  // creating an instance of razor pay in server
        //console.log(response)
        res.json(response)
      })
    }
  })
})

router.get('/buy-now/:id', verifyLogin, async(req, res)=>{
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  let product=await productHelpers.getProductDetails(req.params.id)
  res.render('user/buy-now', {user: req.session.user, product, cartCount, quantity})
})

router.post('/buy-now/', verifyLogin, async(req, res)=>{
  console.log(req.body)     
  userHelpers.placeOrderSeparate(req.body).then((orderId)=>{
    if(req.body['payment-method']=='COD')
      res.json({cod_status: true})
    else{ 
      userHelpers.generateRazorpay(orderId, req.body.price).then((response)=>{
        res.json(response)
      })
    }
  })
})

router.get('/order-success', verifyLogin, async(req, res)=>{
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  res.render('user/order-success', {user: req.session.user, cartCount})
})

router.get('/view-orders', verifyLogin, async(req, res)=>{
  let order=await userHelpers.getOrderDetails(req.session.user._id)
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  res.render('user/view-orders', {user: req.session.user, order, cartCount})
})

router.get('/view-order-products/:id', verifyLogin, async(req, res)=>{
  let orderProducts=await userHelpers.getOrderProducts(req.params.id)
  let orderId=req.params.id
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  res.render('user/view-order-products', {orderId, user: req.session.user, orderProducts, cartCount})
})

router.get('/cancel-order/:id', verifyLogin, (req, res)=>{
  userHelpers.cancelOrder(req.params.id, req.session.user._id).then((response)=>{ 
    res.redirect('/view-orders')
  })
})

router.post('/cancel-item/', verifyLogin, (req, res)=>{
  userHelpers.cancelItem(req.body).then((response)=>{ 
    console.log(response)
    res.redirect('/view-order-products')
    res.json(response)
  })
})

router.post('/verify-payment', (req, res)=>{
  //console.log(req.body)
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      //console.log('Payment status updated to placed')
      res.json({status: true})
    })
  }).catch((err)=>{
    console.log(err)
    res.json({status: false})
  })
})

router.get('/profile', verifyLogin, async(req, res)=>{
  let cartCount=await userHelpers.getCartCount(req.session.user._id)
  userHelpers.getUserDetails(req.session.user._id).then((userDetails)=>{
    res.render('user/profile', {userDetails, cartCount, user: req.session.user})
  })
})

router.post('/search', async(req, res)=>{
  let user=req.session.user           
  let searchTerm=req.body.searchTerm
  console.log(req.body)
  let cartCount=null
  if(req.session.user)
    cartCount=await userHelpers.getCartCount(req.session.user._id)  
  productHelpers.getSearchProducts(searchTerm).then((products)=>{
    //console.log(products)
    //res.json(products)
    res.render('user/view-products', {products, user, cartCount});  
  })
})

module.exports = router;
