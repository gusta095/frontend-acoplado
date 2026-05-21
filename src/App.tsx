import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { CartProvider } from './context/CartContext';
import { AppLayout } from './components/AppLayout/AppLayout';
import { MarketplacePage } from './components/MarketplacePage/MarketplacePage';
import { OffersPage } from './components/OffersPage/OffersPage';
import { OfferDetailPage } from './components/OfferDetailPage/OfferDetailPage';
import { ProvisioningPage } from './components/ProvisioningPage/ProvisioningPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CartProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/cloud-marketplace" replace />} />
              <Route path="/cloud-marketplace" element={<MarketplacePage />} />
              <Route path="/cloud-marketplace/:providerId" element={<OffersPage />} />
              <Route path="/cloud-marketplace/:providerId/:offerId" element={<OfferDetailPage />} />
              <Route path="/cloud-marketplace/:providerId/:offerId/provision" element={<ProvisioningPage />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  );
}
