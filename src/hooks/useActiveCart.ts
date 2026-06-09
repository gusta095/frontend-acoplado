import { useMarketplaceClient } from '../context/MarketplaceClientContext';
import { useCart } from '../context/CartContext';
import { useOnPremiseCart } from '../context/OnPremiseCartContext';

export function useActiveCart() {
  const { basePath } = useMarketplaceClient();
  const cloudCart = useCart();
  const onPremiseCart = useOnPremiseCart();
  return basePath.startsWith('/on-premise') ? onPremiseCart : cloudCart;
}
