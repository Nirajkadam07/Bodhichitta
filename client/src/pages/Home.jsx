import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { productsAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productsAPI.getAll({ limit: 4 });
        setProducts(response.data.products);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <span className="hero-eyebrow">Natural Skincare</span>
          <h1 className="hero-title">
            Clean formulas that make your skin glow — ethically sourced, clinically tried.
          </h1>
          <p className="hero-description">
            Discover lightweight serums and moisturizers that hydrate without heaviness. 
            Formulated for sensitive skin and powered by botanicals.
          </p>
          <div className="flex gap-2">
            <Link to="/products" className="btn btn-primary btn-lg">
              Shop Bestsellers
            </Link>
            <Link to="/about" className="btn btn-secondary btn-lg">
              Learn More
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <img 
            src={`${API_URL}/images/Blue Modern Travel Banner.png`} 
            alt="Bodhichitta skincare products"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x400?text=Bodhichitta';
            }}
          />
        </div>
      </section>

      {/* Featured Products */}
      <section className="products-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Our Favorites</h2>
            <p className="section-subtitle">Handpicked for glowing, healthy skin</p>
          </div>
          <Link to="/products" className="btn btn-secondary">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* About Section */}
      <section className="products-section home-about-section">
        <div className="home-about-grid">
          <div>
            <h3 className="section-title">About Bodhichitta</h3>
            <p className="home-about-text">
              We craft minimal, effective skincare made from responsibly-sourced botanicals. 
              Every formula is cruelty-free and designed to respect sensitive skin. 
              Our products are made in small batches to ensure freshness and quality.
            </p>
          </div>
          <div className="home-benefits">
            <h4>Why Choose Us?</h4>
            <ul>
              <li>100% Natural Ingredients</li>
              <li>Cruelty-Free & Vegan</li>
              <li>Made in India</li>
              <li>Free Shipping over ₹500</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
