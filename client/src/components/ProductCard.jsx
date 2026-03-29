import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';



const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const imageUrl = product.primary_image || '/placeholder.jpg';

  const discount = product.compare_price 
    ? Math.round((1 - product.price / product.compare_price) * 100) 
    : 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    await addToCart(product.id);
  };

  const handleAuthSuccess = async () => {
    // After successful login/register, add the item to cart
    await addToCart(product.id);
  };

  return (
    <>
      <article className="product-card">
        <Link to={`/products/${product.slug}`} className="product-image-container">
          <img 
            src={imageUrl} 
            alt={product.name}
            className="product-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x400?text=Product';
            }}
          />
          {discount > 0 && (
            <span className="product-badge">{discount}% OFF</span>
          )}
        </Link>

        <div className="product-info">
          {product.category_name && (
            <span className="product-category">{product.category_name}</span>
          )}
          <Link to={`/products/${product.slug}`} className="product-name">
            {product.name}
          </Link>
          {product.description && (
            <p className="product-description">{product.description}</p>
          )}
          <div className="product-price-row">
            <span className="product-price">₹{product.price}</span>
            {product.compare_price && (
              <span className="product-compare-price">₹{product.compare_price}</span>
            )}
          </div>
        </div>

        <div className="product-actions">
          <button className="btn btn-primary btn-block" onClick={handleAddToCart}>
            Add to Cart
          </button>
        </div>
      </article>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
};

export default ProductCard;
