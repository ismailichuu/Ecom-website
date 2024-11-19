var express = require('express');
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
let userHelpers = require("../helpers/user-helpers");

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;
  if (user) cartCount = await userHelpers.getCartCount(user._id);
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', { title: 'ShoeGo', products, user, cartCount });
  })

});

router.get('/log-in', (req, res) => {
  if (req.session.userLoggedIn) res.redirect('/');
  else {
    res.render('user/log-in', { loginErr: req.session.userLoginErr });
    req.session.userLoginErr = null;
  }

})

router.get('/sign-up', (req, res) => {
  if (!req.session.signupErr) {
    res.render('user/sign-up');
  } else {
    res.render('user/sign-up', { signupErr: req.session.signupErr });
    req.session.signupErr = null;
  }
})


router.post('/sign-up', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    if (response) {
      req.session.userLoggedIn = true;
      req.session.user = response;
      res.redirect('/')
    } else {
      req.session.signupErr = "Email already registered with another account!";
      res.redirect('/sign-up')
    }
  })
});

router.post('/log-in', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {

    if (response.status) {
      req.session.userLoggedIn = true;
      req.session.user = response.user;
      res.redirect('/');
    }
    else {
      req.session.userLoginErr = "Invalid Username or Password";
      res.redirect('/log-in');
    }
  })

})

router.get('/log-out', (req, res) => {
  req.session.user = null;
  res.redirect('/');
})

router.get('/cart', userHelpers.verifyLog, async (req, res) => {rs
  let user = req.session.user
  let products = await userHelpers.getCartProducts(req.session.user._id);
  let totalAmount = await userHelpers.getTotalAmount(req.session.user._id);
  res.render('user/cart', { products, totalAmount, user });
})

router.get('/add-to-cart:id', (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  })
})

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.totalAmount = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.post('/remove-item', (req, res) => {
  userHelpers.removeItem(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/place-order', userHelpers.verifyLog, async (req, res) => {
  let totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order', { totalAmount, user: req.session.user })
})

router.post('/place-order', async (req, res) => {
  let cart = await userHelpers.getCartProductsList(req.body.user)
  let totalAmount = await userHelpers.getTotalAmount(req.body.user)
  let response = await userHelpers.placeOrder(req.body, cart, totalAmount)
  if (response.status == 'Placed') {
    res.json({statusPayment:true})
  }else{
    userHelpers.generateRazorpay(response.insertedId,totalAmount).then((response)=>{
      res.json(response)
    })
  } 
})

router.get('/order-placed',(req,res)=>{
  res.render('user/order-placed')
})

router.post('/verify-payment',(req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errorMessage:err})
  })
})

router.get('/view-orders', (req, res) => {
  userHelpers.getOrders(req.session.user._id).then((orders) => {
    res.render('user/orders', { orders })
  })
})

module.exports = router;
