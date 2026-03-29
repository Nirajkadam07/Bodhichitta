import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, productsAPI } from '../../services/api';

const UPLOAD_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload`;

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Add Product Form State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    compare_price: '',
    category_id: '',
    stock: '100'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes, productsRes, categoriesRes] = await Promise.all([
          adminAPI.getDashboard(),
          adminAPI.getOrders({ limit: 10 }),
          adminAPI.getProducts(),
          productsAPI.getCategories()
        ]);
        setStats(statsRes.data.stats);
        setOrders(ordersRes.data.orders);
        setProducts(productsRes.data.products);
        setCategories(categoriesRes.data.categories);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      await adminAPI.updateOrder(orderId, { status });
      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status } : o
      ));
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'name' ? { slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') } : {})
    }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        compare_price: productForm.compare_price ? parseFloat(productForm.compare_price) : null,
        category_id: productForm.category_id ? parseInt(productForm.category_id) : null,
        stock: parseInt(productForm.stock),
        images: uploadedImages.map(img => ({ url: img.url }))
      };

      const response = await adminAPI.createProduct(productData);
      
      // Add to products list
      setProducts([response.data.product, ...products]);
      
      // Reset form
      setProductForm({
        name: '',
        slug: '',
        description: '',
        price: '',
        compare_price: '',
        category_id: '',
        stock: '100'
      });
      setFormSuccess('Product created successfully!');
      setUploadedImages([]);
      setTimeout(() => {
        setShowAddProduct(false);
        setFormSuccess('');
      }, 1500);
    } catch (error) {
      setFormError(error.response?.data?.error?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">🔐</div>
          <h2 className="empty-state-title">Access Denied</h2>
          <p className="empty-state-text">
            You need admin privileges to access this page.
          </p>
          <Link to="/" className="btn btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      shipped: '#6366f1',
      delivered: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="container">
      <div className="admin-header-flex">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddProduct(true)}
        >
          + Add Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        {[
          { label: 'Total Products', value: stats?.totalProducts || 0, color: '#6366f1', icon: '📦' },
          { label: 'Total Orders', value: stats?.totalOrders || 0, color: '#3b82f6', icon: '📋' },
          { label: 'Pending Orders', value: stats?.pendingOrders || 0, color: '#f59e0b', icon: '⏳' },
          { label: 'Total Revenue', value: `₹${stats?.totalRevenue || 0}`, color: '#10b981', icon: '💰' }
        ].map((stat, idx) => (
          <div key={idx} className="admin-stat-card" style={{ borderLeft: `4px solid ${stat.color}` }}>
            <div className="admin-stat-card-inner">
              <div>
                <div className="admin-stat-label">{stat.label}</div>
                <div className="admin-stat-value">{stat.value}</div>
              </div>
              <div className="admin-stat-icon">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="admin-tab-nav">
        {['dashboard', 'products', 'orders'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`admin-tab-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Dashboard / Orders Tab */}
      {(activeTab === 'dashboard' || activeTab === 'orders') && (
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h3>{activeTab === 'dashboard' ? 'Recent Orders' : 'All Orders'}</h3>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.user_name || order.guest_name || 'Guest'}</td>
                    <td className="fw-600">₹{order.total}</td>
                    <td>
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="admin-status-select"
                        style={{ background: getStatusColor(order.status) }}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="text-muted">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/orders/${order.id}`} className="admin-view-link">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h3>All Products</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddProduct(true)}>
              + Add Product
            </button>
          </div>
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-table-product-cell">
                        <div className="admin-table-product-thumb">
                          {product.primary_image && (
                            <img 
                              src={product.primary_image} 
                              alt={product.name}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                        </div>
                        <span className="fw-600">{product.name}</span>
                      </div>
                    </td>
                    <td className="text-muted">{product.category_name || '-'}</td>
                    <td className="fw-600">₹{product.price}</td>
                    <td>{product.stock}</td>
                    <td>
                      <span
                        className="admin-product-status"
                        style={{
                          background: product.is_active ? '#d1fae5' : '#fee2e2',
                          color: product.is_active ? '#065f46' : '#991b1b'
                        }}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Add New Product</h2>
              <button 
                onClick={() => setShowAddProduct(false)}
                className="admin-modal-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="admin-modal-body">
              {formError && (
                <div className="alert-error">{formError}</div>
              )}
              
              {formSuccess && (
                <div className="alert-success">
                  <span className="alert-success-icon">✓</span>
                  <span className="alert-success-text">{formSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="Natural Hair Serum"
                  value={productForm.name}
                  onChange={handleProductFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Slug</label>
                <input
                  type="text"
                  name="slug"
                  className="form-input"
                  placeholder="natural-hair-serum"
                  value={productForm.slug}
                  onChange={handleProductFormChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-input form-textarea-sm"
                  placeholder="Product description..."
                  value={productForm.description}
                  onChange={handleProductFormChange}
                />
              </div>

              <div className="admin-form-grid">
                <div className="form-group">
                  <label className="form-label">Price *</label>
                  <input
                    type="number"
                    name="price"
                    className="form-input"
                    placeholder="599"
                    value={productForm.price}
                    onChange={handleProductFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Compare Price</label>
                  <input
                    type="number"
                    name="compare_price"
                    className="form-input"
                    placeholder="799"
                    value={productForm.compare_price}
                    onChange={handleProductFormChange}
                  />
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="category_id"
                    className="form-input"
                    value={productForm.category_id}
                    onChange={handleProductFormChange}
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    className="form-input"
                    placeholder="100"
                    value={productForm.stock}
                    onChange={handleProductFormChange}
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="form-group">
                <label className="form-label">Product Images</label>
                <div className="admin-image-upload-area">
                  <input
                    type="file"
                    id="product-image-upload"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      if (files.length === 0) return;
                      setUploading(true);
                      try {
                        const token = localStorage.getItem('token');
                        for (const file of files) {
                          const fd = new FormData();
                          fd.append('image', file);
                          const res = await fetch(UPLOAD_URL, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: fd
                          });
                          if (!res.ok) throw new Error('Upload failed');
                          const data = await res.json();
                          setUploadedImages(prev => [...prev, { url: data.url, public_id: data.public_id }]);
                        }
                      } catch (err) {
                        setFormError('Image upload failed: ' + err.message);
                      } finally {
                        setUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => document.getElementById('product-image-upload').click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : '📷 Upload Images'}
                  </button>
                  {uploadedImages.length > 0 && (
                    <div className="admin-uploaded-thumbs">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="admin-uploaded-thumb">
                          <img src={img.url} alt={`Upload ${idx + 1}`} />
                          <button
                            type="button"
                            className="admin-thumb-remove"
                            onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                          >
                            ×
                          </button>
                          {idx === 0 && <span className="admin-thumb-primary">Primary</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAddProduct(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
