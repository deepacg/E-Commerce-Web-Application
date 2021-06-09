var express = require('express');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers');       // to access the functions in product-helpers.js file
const userHelpers = require('../helpers/user-helpers');
var fs=require('fs');               // to delete the image from folder
// here we dont need to require db because here there is no db access

const verifyAdminLogin=(req, res, next)=>{
  if(req.session.admin) {
    isAdmin=true                // just for the navigation panel change
    next()
  } else {
    res.redirect('/admin/login')
    isAdmin=false
  }
}

router.get('/login', (req, res)=>{
  if(req.session.admin)
    res.redirect('/')
  else {
    res.render('admin/login', {loginErr: req.session.adminLoginErr, isAdmin:true})  // login error message got from 'post' method passed to login page
    req.session.adminLoginErr=false
  }
})

router.post('/login', (req, res)=>{
  //console.log(req.body)
  userHelpers.doLoginAdmin(req.body).then((response)=>{
    //console.log(response)
    if(response.status) {
      req.session.admin=response.admin
      req.session.adminLoggedIn=true
      res.redirect('/admin')
    }
    else {
      req.session.adminLoginErr="Invalid username or password"    // passing login error message from 'post' to 'get' method
      res.redirect('/admin/login')
    }
  })
})

router.get('/logout', (req, res)=>{
  req.session.admin=null
  req.session.adminLoggedIn=false
  res.redirect('/admin')
})

/* GET products listing for admin. */
router.get('/', verifyAdminLogin, function(req, res, next) {
  let admin=req.session.admin
  productHelpers.getAllProducts().then((products)=>{
    //console.log(products)
    res.render('admin/view-products', {products, admin, isAdmin});    // 'admin' is passed to homepage to display name on navbar
  })
});

router.get('/add-products', verifyAdminLogin, function(req, res){
  res.render('admin/add-products', {admin: req.session.admin, isAdmin})   // 'admin' is passed to display name on navbar on every page wherever required
})

router.post('/add-products', verifyAdminLogin, (req, res)=>{
  //console.log(req.body)
  //console.log(req.files.image)                // to see the image details
  req.body.price=parseFloat(req.body.price)
  productHelpers.addProduct(req.body, (id)=>{     // 'id' is the product id
    let image=req.files.image
    //console.log(id)
    image.mv('./public/product-images/'+id+'.jpg',(err)=>{      // image is added to a local folder with the name as product id+.jpg, mv() is a fileUpload function
      if(!err)
        res.render('admin/add-products', {admin: req.session.admin, isAdmin})
      else
        console.log(err)
    })
  })
})

router.get('/delete-product/', verifyAdminLogin,  (req, res)=>{
  let prodId=req.query.id           // passed in req.query (two ways of passing parameter in get method)
  let prodName=req.query.name       // can pass multiple values like this
  console.log(req.query.place)
  console.log(prodName)
  productHelpers.deleteProduct(prodId).then((response)=>{
    fs.unlink('./public/product-images/'+prodId+'.jpg',()=>{        // to remove the image from the images folder
      res.redirect('/admin/')
    })
  })
})

router.get('/edit-product/:id', verifyAdminLogin, async(req, res)=>{
  let prodId=req.params.id              // passed in req.params (in the url)
  let product=await productHelpers.getProductDetails(prodId)
  //console.log(product)
  res.render('admin/edit-product', {product, admin: req.session.admin, isAdmin})    // this 'product' is passed to the edit page
})

router.post('/edit-product/:id', verifyAdminLogin, (req, res)=>{
  //console.log(req.params.id)
  let id=req.params.id                // id is taken separately because it is not present in req.body
  productHelpers.updateProduct(req.params.id, req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image) {
      let image=req.files.image
    //console.log(id)
    image.mv('./public/product-images/'+id+'.jpg')  // updating image, existing image will be rewritten. only one image with one name will be present
    }
  })
})

router.get('/view-orders', verifyAdminLogin, async(req, res)=>{
  let orders=await productHelpers.showOrders()
    res.render('admin/view-orders', {orders, admin: req.session.admin, isAdmin})
})

router.get('/view-order-products/:id', verifyAdminLogin, async(req, res)=>{
  let orderProducts=await productHelpers.getOrderProducts(req.params.id)
  console.log(orderProducts[0]._id)
  let orderId=req.params.id
  res.render('admin/view-order-products', {orderId, orderProducts, admin: req.session.admin, isAdmin})
})

router.get('/view-users', verifyAdminLogin, async(req, res)=>{
  let users=await userHelpers.getUsers()
  res.render('admin/view-users', {users, admin: req.session.admin, isAdmin})
})

router.post('/shipped-status/', (req, res)=>{
  console.log("admin.js order id: ", req.body.orderId)
  productHelpers.updateShipStatus(req.body.orderId).then((response)=>{
    //console.log(response)
    res.json(response)
  })
})

module.exports = router;
