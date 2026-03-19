import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Orders = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const success = searchParams.get('success');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAuthenticated && !id) {
        setLoading(false);
        return;
      }

      try {
        if (id) {
          const response = await ordersAPI.getById(id);
          setSelectedOrder(response.data.order);
        } else {
          const response = await ordersAPI.getAll();
          setOrders(response.data.orders);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [id, isAuthenticated]);

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Order detail view
  if (selectedOrder) {
    return (
      <div className="container">
        {success && (
          <div className="alert-success">
            <span className="alert-success-icon">✓</span>
            <div>
              <strong>Order placed successfully!</strong>
              <p className="alert-success-text">
                Thank you for your purchase. You will receive an email confirmation shortly.
              </p>
            </div>
          </div>
        )}

        <div className="page-header">
          <h1 className="page-title">Order #{selectedOrder.id}</h1>
          <p className="page-subtitle">
            Placed on {new Date(selectedOrder.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="order-detail-grid">
          <div>
            <div className="order-card">
              <h3>Order Items</h3>
              {selectedOrder.items?.map(item => (
                <div key={item.id} className="order-item">
                  <div>
                    <div className="order-item-name">{item.product_name}</div>
                    {item.variant_name && (
                      <div className="order-item-meta">Size: {item.variant_name}</div>
                    )}
                    <div className="order-item-meta">Qty: {item.quantity}</div>
                  </div>
                  <div className="order-item-price">₹{item.price * item.quantity}</div>
                </div>
              ))}
            </div>

            <div className="order-card">
              <h3>Shipping Address</h3>
              <p className="order-address">{selectedOrder.shipping_address}</p>
            </div>
          </div>

          <div className="cart-summary">
            <h3 className="summary-title">Order Summary</h3>
            
            <div className="order-status-wrap">
              <span className={`status-badge ${getStatusClass(selectedOrder.status)}`}>
                {selectedOrder.status?.toUpperCase()}
              </span>
            </div>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>₹{selectedOrder.subtotal}</span>
            </div>
            <div className="cart-summary-row">
              <span>Shipping</span>
              <span>{selectedOrder.shipping_cost === 0 ? 'FREE' : `₹${selectedOrder.shipping_cost}`}</span>
            </div>
            <div className="cart-summary-row total">
              <span>Total</span>
              <span>₹{selectedOrder.total}</span>
            </div>

            <Link to="/products" className="btn btn-secondary btn-block mt-lg">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Orders list view
  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="empty-cart">
          <div className="empty-cart-icon">🔐</div>
          <h2 className="empty-cart-title">Login to view orders</h2>
          <p className="empty-cart-subtitle">Please sign in to see your order history.</p>
          <Link to="/login" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container">
        <div className="empty-cart">
          <div className="empty-cart-icon">📦</div>
          <h2 className="empty-cart-title">No orders yet</h2>
          <p className="empty-cart-subtitle">Start shopping to see your orders here.</p>
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">{orders.length} orders</p>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td>₹{order.total}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  <Link to={`/orders/${order.id}`} className="btn btn-sm btn-secondary">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
