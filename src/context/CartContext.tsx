import React, { createContext, useCallback, useContext, useState } from 'react';
import type { CartItem, Offer } from '../types';

interface CartContextValue {
  items: CartItem[];
  addItem: (offer: Offer, parameters: Record<string, string | number | boolean>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((offer: Offer, parameters: Record<string, string | number | boolean>) => {
    const item: CartItem = {
      id: crypto.randomUUID(),
      offer,
      parameters,
      addedAt: new Date().toISOString(),
    };
    setItems(prev => [...prev, item]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
