import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';



const ProductDetail = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productsAPI.getBySlug(slug);
        setProduct(response.data.product);
        
        if (response.data.product.variants?.length > 0) {
          setSelectedVariant(response.data.product.variants[0]);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(product.id, selectedVariant?.id, quantity);
      alert('Added to cart!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAuthSuccess = async () => {
    setAddingToCart(true);
    try {
      await addToCart(product.id, selectedVariant?.id, quantity);
      alert('Added to cart!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart(false);
    }
  };

  const currentPrice = selectedVariant?.price || product?.price;
  const comparePrice = selectedVariant?.compare_price || product?.compare_price;

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container">
        <div className="empty-cart">
          <div className="empty-cart-icon">😕</div>
          <h2 className="empty-cart-title">Product not found</h2>
          <Link to="/products" className="btn btn-primary mt-sm">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
        {' / '}
        <Link to="/products">Products</Link>
        {' / '}
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      <div className="product-detail">
        {/* Gallery */}
        <div className="product-gallery">
          <div className="gallery-main">
            <img 
              src={product.images?.[selectedImage]?.image_url || product.primary_image}
              alt={product.name}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/600x600?text=Product';
              }}
            />
          </div>
          {product.images?.length > 1 && (
            <div className="gallery-thumbs">
              {product.images.map((image, index) => (
                <button 
                  key={image.id}
                  className={`gallery-thumb ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img 
                    src={image.image_url} 
                    alt={`${product.name} ${index + 1}`}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/80x80?text=Img';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="product-details">
          {product.category_name && (
            <span className="product-detail-category">{product.category_name}</span>
          )}
          
          <h1 className="product-detail-title">{product.name}</h1>
          
          <div className="product-detail-price">
            <span className="detail-price">₹{currentPrice}</span>
            {comparePrice && (
              <span className="detail-compare-price">₹{comparePrice}</span>
            )}
          </div>

          <p className="product-detail-description">{product.description}</p>

          {/* Variant Selector */}
          {product.variants?.length > 0 && (
            <div className="variant-selector">
              <span className="variant-label">Size:</span>
              <div className="variant-options">
                {product.variants.map(variant => (
                  <button 
                    key={variant.id}
                    className={`variant-option ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                    onClick={() => setSelectedVariant(variant)}
                  >
                    {variant.name} - ₹{variant.price}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="quantity-selector">
            <span className="quantity-label">Quantity:</span>
            <div className="quantity-controls">
              <button 
                className="quantity-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                −
              </button>
              <input 
                type="number" 
                className="quantity-value"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
              />
              <button 
                className="quantity-btn"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="add-to-cart-section">
            <button 
              className="btn btn-primary btn-lg add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={addingToCart}
            >
              {addingToCart ? 'Adding...' : `Add to Cart - ₹${currentPrice * quantity}`}
            </button>
          </div>

          {/* Additional Info */}
          <div className="product-benefits">
            <h4>Why You'll Love It</h4>
            <ul>
              <li>100% Natural Ingredients</li>
              <li>Cruelty-Free & Vegan</li>
              <li>Free Shipping over ₹500</li>
              <li>30-Day Money Back Guarantee</li>
            </ul>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default ProductDetail;
