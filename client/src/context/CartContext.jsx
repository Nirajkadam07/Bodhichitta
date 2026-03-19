import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Ensure session ID exists for guest users
  useEffect(() => {
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', uuidv4());
    }
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await cartAPI.get();
      setItems(response.data.items || []);
      
      // Save session ID from response if provided
      if (response.data.sessionId && !isAuthenticated) {
        localStorage.setItem('sessionId', response.data.sessionId);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart, isAuthenticated]);

  const addToCart = async (productId, variantId = null, quantity = 1) => {
    try {
      await cartAPI.add({ product_id: productId, variant_id: variantId, quantity });
      await fetchCart();
      return true;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return false;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      await cartAPI.update(itemId, quantity);
      await fetchCart();
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await cartAPI.remove(itemId);
      await fetchCart();
    } catch (error) {
      console.error('Failed to remove from cart:', error);
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      setItems([]);
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  };

  const cartTotal = items.reduce((total, item) => {
    const price = item.variant_price || item.product_price;
    return total + (price * item.quantity);
  }, 0);

  const cartCount = items.reduce((count, item) => count + item.quantity, 0);

  const value = {
    items,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart: fetchCart,
    cartTotal,
    cartCount,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
