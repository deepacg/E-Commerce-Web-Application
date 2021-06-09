
function addToCart(prodId) {
    $.ajax({
        url: '/add-to-cart/'+prodId,        // route to which the button click has to go
        method: 'get',
        success: (response)=>{
            if(response.status) {       // if status is true
                let count=$('#cart-count').html()       // '#cart-count' is the id given to the span which contains cart count in user header
                count=parseInt(count)+1     // increment it by 1
                $('#cart-count').html(count)    // and set it to '#cart-count'
                alert('Item added to cart')
            }
           //alert(response)
        }
    })
}



