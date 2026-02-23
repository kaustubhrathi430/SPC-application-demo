import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SESSION_KEY = 'spc_production_order';

const ProductionOrderContext = createContext(null);

/**
 * Production Order shape:
 * {
 *   lineId: number,
 *   lineName: string,
 *   skuId: number,
 *   skuName: string,
 *   productCode: string,
 *   bestBuyCode: string,
 *   shift: 'A' | 'B' | 'C' | 'D',
 *   shiftDate: string (YYYY-MM-DD),
 *   productionOrderId: number (from server),
 *   createdAt: string (ISO timestamp),
 * }
 */

export function ProductionOrderProvider({ children }) {
  const [productionOrder, setProductionOrder] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Sync to sessionStorage whenever productionOrder changes
  useEffect(() => {
    if (productionOrder) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(productionOrder));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [productionOrder]);

  const setOrder = useCallback((order) => {
    setProductionOrder(order);
  }, []);

  const clearOrder = useCallback(() => {
    setProductionOrder(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const isOrderActive = productionOrder !== null;

  return (
    <ProductionOrderContext.Provider value={{
      productionOrder,
      setOrder,
      clearOrder,
      isOrderActive,
    }}>
      {children}
    </ProductionOrderContext.Provider>
  );
}

export function useProductionOrder() {
  const context = useContext(ProductionOrderContext);
  if (!context) {
    throw new Error('useProductionOrder must be used within ProductionOrderProvider');
  }
  return context;
}
