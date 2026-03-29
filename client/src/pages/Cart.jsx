import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';



const Cart = () => {
  const { items, cartTotal, updateQuantity, removeFromCart, loading } = useCart();

  const shippingCost = cartTotal >= 500 ? 0 : 50;
  const totalWithShipping = cartTotal + shippingCost;

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h2 className="empty-state-title">Your cart is empty</h2>
          <p className="empty-state-text">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Link to="/products" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header-centered">
        <h1 className="page-title">Shopping Cart</h1>
        <p className="page-subtitle">{items.length} item{items.length > 1 ? 's' : ''} in your cart</p>
      </div>

      <div className="cart-grid">
        {/* Cart Items */}
        <div className="cart-card">
          {items.map((item) => {
            const price = item.variant_price || item.product_price;
            const imageUrl = item.image || 'https://via.placeholder.com/100x100?text=Product';

            return (
              <div key={item.id} className="cart-item-row">
                <div className="cart-item-thumb">
                  <img 
                    src={imageUrl} 
                    alt={item.product_name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/100x100?text=Product';
                    }}
                  />
                </div>

                <div className="cart-item-body">
                  <Link to={`/products/${item.product_slug}`} className="cart-item-link">
                    {item.product_name}
                  </Link>
                  {item.variant_name && (
                    <span className="cart-item-meta">Size: {item.variant_name}</span>
                  )}
                  <div className="cart-item-qty">
                    <button 
                      className="cart-qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="cart-qty-value">{item.quantity}</span>
                    <button 
                      className="cart-qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="cart-item-actions">
                  <div className="cart-item-total">₹{price * item.quantity}</div>
                  <button 
                    className="cart-remove-btn"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Summary */}
        <div className="cart-summary-panel">
          <h3 className="summary-title">Order Summary</h3>
          
          <div className="summary-row">
            <span className="text-muted">Subtotal</span>
            <span>₹{cartTotal}</span>
          </div>
          
          <div className="summary-row">
            <span className="text-muted">Shipping</span>
            <span className={shippingCost === 0 ? 'text-success' : ''}>
              {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
            </span>
          </div>
          
          {shippingCost > 0 && (
            <p className="summary-hint">
              Add ₹{500 - cartTotal} more for free shipping!
            </p>
          )}
          
          <div className="summary-row-total">
            <span>Total</span>
            <span>₹{totalWithShipping}</span>
          </div>

          <Link to="/checkout" className="btn btn-primary btn-block btn-lg mt-sm">
            Proceed to Checkout
          </Link>
          
          <Link to="/products" className="btn btn-secondary btn-block mt-md">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
