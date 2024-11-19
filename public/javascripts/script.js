
function viewImage(event) {

    document.getElementById('imageView').src = URL.createObjectURL(event.target.files[0])

}

function addToCart(prodId) {

    $.ajax({
        url: '/add-to-cart' + prodId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $('#cart-count').html(count)
            }
        }
    })
}

function changeQuantity(cartId, prodId, userId, count) {

    let quantity = parseInt(document.getElementById(prodId).innerHTML)
    console.log(userId);
    $.ajax({
        url: '/change-product-quantity',
        data: {
            cart: cartId,
            product: prodId,
            count: count,
            quantity: quantity,
            user: userId
        },
        method: 'post',
        success: (response) => {
            if (response.removeProduct) {
                location.reload()
            } else {
                document.getElementById('total').innerHTML = response.totalAmount
                document.getElementById(prodId).innerHTML = quantity + count
            }
        }
    })
}

function removeItem(cartId, prodId) {
    $.ajax({
        url: '/remove-item',
        data: {
            cart: cartId,
            product: prodId
        },
        method: 'post',
        success: (response) => {
            location.reload()
        }
    })
}

$(document).ready(() => {
    $('#checkout').submit((e) => {
        e.preventDefault()
        $.ajax({
            url: '/place-order',
            method: 'post',
            data: $('#checkout').serialize(),
            dataType: 'json',
            success: (response) => {
                if (response.statusPayment) location.href = '/order-placed'
                else razorPayment(response)
            }
        })
    })
})

function razorPayment(order) {
    let amount = Math.round(order.amount * 100)
    var options = {
        "key": "rzp_test_Sezj7A8zTbhSwb", // Enter the Key ID generated from the Dashboard
        "amount": amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        "currency": "INR",
        "name": "Shoego", //your business name
        "description": "Test Transaction",
        "image": "https://example.com/your_logo",
        "order_id": order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
        "handler": function (response) {

            verifyPayment(response, order)
        },
        "prefill": { //We recommend using the prefill parameter to auto-fill customer's contact information, especially their phone number
            "name": "Gaurav Kumar", //your customer's name
            "email": "gaurav.kumar@example.com",
            "contact": "9000090000"  //Provide the customer's phone number for better conversion rates 
        },
        "notes": {
            "address": "Razorpay Corporate Office"
        },
        "theme": {
            "color": "#3399cc"
        }
    };
    var rzp1 = new Razorpay(options);
    rzp1.open();
}

function verifyPayment(response, order) {
    $.ajax({
        url: '/verify-payment',
        data: {
            response,
            order
        },
        method: 'post',
        success: (response) => {
            if (response.status) location.href = '/order-placed'
            else alert('payment failed')
        }
    })
}

function toShip(orderId) {
    if (confirm("Are you sure want to ship '"+orderId+"'")){
        $.ajax({
            url: '/admin/to-ship',
            data: { orderId },
            method: 'post',
            success: (response) => {
              location.reload()
            }
        })
    }
}

$(document).ready( function () {
    $('#productTable').DataTable();
} );