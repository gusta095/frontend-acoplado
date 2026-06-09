import React, { createContext, useCallback, useContext, useState } from 'react';
import type { CartItem, Offer } from '../types';

interface OnPremiseCartContextValue {
  items: CartItem[];
  activeProvider: string | null;
  addItem: (offer: Offer, parameters: Record<string, string | number | boolean>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const OnPremiseCartContext = createContext<OnPremiseCartContextValue | null>(null);

export function OnPremiseCartProvider({ children }: { children: React.ReactNode }) {
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

  const activeProvider = items.length > 0 ? items[0].offer.providerId : null;

  return (
    <OnPremiseCartContext.Provider value={{ items, activeProvider, addItem, removeItem, clearCart }}>
      {children}
    </OnPremiseCartContext.Provider>
  );
}

export function useOnPremiseCart(): OnPremiseCartContextValue {
  const ctx = useContext(OnPremiseCartContext);
  if (!ctx) throw new Error('useOnPremiseCart must be used within OnPremiseCartProvider');
  return ctx;
}
