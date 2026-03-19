import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { productsAPI } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productsAPI.getCategories();
        setCategories(response.data.categories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = {};
        if (currentCategory) params.category = currentCategory;
        if (searchQuery) params.search = searchQuery;
        
        const response = await productsAPI.getAll(params);
        setProducts(response.data.products);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentCategory, searchQuery]);

  const handleCategoryChange = (categorySlug) => {
    if (categorySlug) {
      setSearchParams({ category: categorySlug });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Our Products</h1>
        <p className="page-subtitle">
          Natural, effective skincare for glowing, healthy skin
        </p>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        <button 
          className={`category-btn ${!currentCategory ? 'active' : ''}`}
          onClick={() => handleCategoryChange('')}
        >
          All Products
        </button>
        {categories.map(category => (
          <button 
            key={category.id}
            className={`category-btn ${currentCategory === category.slug ? 'active' : ''}`}
            onClick={() => handleCategoryChange(category.slug)}
          >
            {category.name} ({category.product_count})
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🔍</div>
          <h2 className="empty-cart-title">No products found</h2>
          <p className="empty-cart-subtitle">
            Try adjusting your filters or search terms
          </p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
