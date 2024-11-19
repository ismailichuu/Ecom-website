var express = require('express');
var router = express.Router();
var ProductHelper = require('../helpers/product-helpers');
const productHelpers = require('../helpers/product-helpers');
const { response } = require('../app');

/* GET home page. */
router.get('/',productHelpers.verifyLog, function (req, res, next) {
    productHelpers.getAllProducts().then((products) => {
        res.render('admin/view-products', { products, admin: true });
    })
})

router.get('/add-product', (req, res) => {
    res.render('admin/add-products', { admin: true });
})

router.post('/add-product', (req, res) => {
    productHelpers.addProducts(req.body, (id) => {
        let image = req.files.Image;
        image.mv('./public/product-images/' + id + '.jpg', (err) => {
            if (!err) res.render('admin/add-products', { admin: true });
            else console.log('Image upload error!' + err);
        })
    })
})

router.get('/delete-product', (req, res) => {
    let proId = req.query.id;
    productHelpers.deleteProduct(proId).then((response) => {
        res.redirect('/admin')
    })
})

router.get('/edit-product/:id', async (req, res) => {
    let product = await productHelpers.getProductDetails(req.params.id)
    res.render('admin/edit-product', { product, admin: true });
})

router.post('/edit-product/:id', (req, res) => {
    productHelpers.updateProduct(req.params.id, req.body).then(() => {
        let id = req.params.id;
        res.redirect('/admin')
        if (req?.files?.Image) {
            let image = req.files.Image;
            image.mv('./public/product-images/' + id + '.jpg');
        }
    })
})

router.get('/all-orders', (req, res) => {
    productHelpers.getAllOrders().then((orders) => {
        console.log();
        res.render('admin/all-orders', { admin: true, orders })
    })
})

router.post('/to-ship', (req, res) => {
    productHelpers.toShip(req.body.orderId).then(() => {
        res.json(true)
    })
})

router.get('/admin-login', (req, res) => {
    if (req.session.admin) res.redirect('/admin')
    else {
        res.render('admin/admin-login', { loginErr: req.session.adminLoginErr, admin })
        req.session.adminLoginErr = false
    }

})

router.post('/admin-login', (req, res) => {
    productHelpers.doAdminLogIn(req.body).then((response) => {
        if (response.status) {
            req.session.adminLogIn = true
            req.session.admin = response.admin
            res.redirect('/admin')
        } else {
            req.session.adminLoginErr = 'Invalid Credentials!!'
            res.redirect('/admin/admin-login')
        }
    })
})


module.exports = router;
