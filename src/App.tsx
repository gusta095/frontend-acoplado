import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { CartProvider } from './context/CartContext';
import { DeploymentHistoryProvider } from './context/DeploymentHistoryContext';
import { AppLayout } from './components/AppLayout/AppLayout';
import { HomePage } from './components/HomePage/HomePage';
import { DeploymentsListPage } from './components/observability/deployments/DeploymentsListPage';
import { DeploymentPage } from './components/observability/deployments/DeploymentPage';
import { MarketplacePage } from './components/infrastructure/cloud/MarketplacePage/MarketplacePage';
import { OffersPage } from './components/infrastructure/shared/OffersPage/OffersPage';
import { OfferDetailPage } from './components/infrastructure/shared/OfferDetailPage/OfferDetailPage';
import { ProvisioningPage } from './components/infrastructure/shared/ProvisioningPage/ProvisioningPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DeploymentHistoryProvider>
        <CartProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/cloud-marketplace" element={<MarketplacePage />} />
                <Route path="/cloud-marketplace/:providerId" element={<OffersPage />} />
                <Route path="/cloud-marketplace/:providerId/:offerId" element={<OfferDetailPage />} />
                <Route path="/cloud-marketplace/:providerId/:offerId/provision" element={<ProvisioningPage />} />
                <Route path="/deployments" element={<DeploymentsListPage />} />
                <Route path="/deployments/:batchId" element={<DeploymentPage />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </CartProvider>
      </DeploymentHistoryProvider>
    </ThemeProvider>
  );
}
