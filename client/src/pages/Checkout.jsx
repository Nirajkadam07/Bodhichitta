import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/api';



const Checkout = () => {
  const { items, cartTotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shippingCost = cartTotal >= 500 ? 0 : 50;
  const total = cartTotal + shippingCost;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const shippingAddress = `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`;

      const checkoutData = {
        shipping_address: shippingAddress,
        notes: formData.notes,
        session_id: localStorage.getItem('sessionId'),
        payment_method: paymentMethod
      };

      if (!isAuthenticated) {
        checkoutData.guest_email = formData.email;
        checkoutData.guest_name = formData.name;
        checkoutData.guest_phone = formData.phone;
      }

      const response = await ordersAPI.checkout(checkoutData);
      const orderId = response.data.order.id;

      await clearCart();
      navigate(`/orders/${orderId}?success=true`);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.error?.message || err.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h2 className="empty-state-title">Your cart is empty</h2>
          <p className="empty-state-text">Add some products before checkout.</p>
          <Link to="/products" className="btn btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header-centered">
        <h1 className="page-title">Checkout</h1>
        <p className="page-subtitle">Complete your order</p>
      </div>

      <div className="checkout-grid">
        <form onSubmit={handleSubmit}>
          {error && <div className="alert-error">{error}</div>}

          {/* Contact Information */}
          <div className="checkout-card">
            <h3>Contact Information</h3>
            
            <div className="checkout-contact-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  minLength="3"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                  title="Please enter a valid email address."
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
                pattern="(\+91\s?)?[6-9]\d{9}"
                title="Please enter a valid 10-digit Indian mobile number."
                maxLength="15"
                required
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="checkout-card">
            <h3>Shipping Address</h3>
            
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                name="address"
                className="form-input form-textarea-md"
                placeholder="Street address, apartment, etc."
                value={formData.address}
                onChange={handleChange}
                minLength="10"
                required
              />
            </div>

            <div className="checkout-address-grid">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  name="city"
                  className="form-input"
                  value={formData.city}
                  onChange={handleChange}
                  minLength="2"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  name="state"
                  className="form-input"
                  value={formData.state}
                  onChange={handleChange}
                  minLength="2"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  className="form-input"
                  value={formData.pincode}
                  onChange={handleChange}
                  pattern="\d{6}"
                  title="Please enter a valid 6-digit Pincode."
                  maxLength="6"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="checkout-card">
            <h3>Payment Method</h3>

            <div className="payment-methods">
              {/* Cash on Delivery */}
              <label className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="hidden-radio"
                />
                <div className={`payment-radio ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                  {paymentMethod === 'cod' && <div className="payment-radio-dot" />}
                </div>
                <div className="payment-body">
                  <div className="payment-title">
                    <span className="payment-icon">💵</span>
                    <span className="payment-name">Cash on Delivery</span>
                  </div>
                  <p className="payment-desc">Pay when your order arrives at your doorstep</p>
                </div>
              </label>

              {/* Online Payment — coming soon */}
              <label className="payment-option disabled">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="hidden-radio"
                  disabled
                />
                <div className="payment-radio">
                </div>
                <div className="payment-body">
                  <div className="payment-title">
                    <span className="payment-icon">💳</span>
                    <span className="payment-name">Pay Online</span>
                    <span className="payment-badge">Coming Soon</span>
                  </div>
                  <p className="payment-desc">Credit/Debit Card, UPI, Net Banking</p>
                </div>
              </label>
            </div>
          </div>

          {/* Order Notes */}
          <div className="checkout-card">
            <h3>Order Notes (optional)</h3>
            <textarea
              name="notes"
              className="form-input form-textarea-sm"
              placeholder="Any special instructions for your order..."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg btn-block"
            disabled={loading}
          >
            {loading ? 'Processing...' : `Place Order — ₹${total}`}
          </button>
        </form>

        {/* Order Summary */}
        <div className="checkout-summary">
          <h3 className="summary-title">Order Summary</h3>
          
          <div className="summary-items-scroll">
            {items.map(item => (
              <div key={item.id} className="summary-item">
                <div className="summary-item-thumb">
                  <img 
                    src={item.image || 'https://via.placeholder.com/50'}
                    alt={item.product_name}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/50'; }}
                  />
                </div>
                <div className="summary-item-info">
                  <div className="summary-item-name">{item.product_name}</div>
                  <div className="summary-item-qty">Qty: {item.quantity}</div>
                </div>
                <div className="summary-item-price">
                  ₹{(item.variant_price || item.product_price) * item.quantity}
                </div>
              </div>
            ))}
          </div>
          
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
          <div className="summary-row">
            <span className="text-muted">Payment</span>
            <span>💵 Cash on Delivery</span>
          </div>
          <div className="summary-row-total">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
