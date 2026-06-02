import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { CartProvider } from './context/CartContext';
import { DeploymentHistoryProvider } from './context/DeploymentHistoryContext';
import { MarketplaceClientProvider } from './context/MarketplaceClientContext';
import { MockMarketplaceClient } from './api/MockMarketplaceClient';
import { MockOnPremiseClient } from './api/MockOnPremiseClient';
import { AppLayout } from './components/AppLayout/AppLayout';
import { HomePage } from './components/HomePage/HomePage';
import { DeploymentsListPage } from './components/observability/deployments/DeploymentsListPage';
import { DeploymentPage } from './components/observability/deployments/DeploymentPage';
import { MarketplacePage } from './components/infrastructure/cloud/MarketplacePage/MarketplacePage';
import { OnPremiseMarketplacePage } from './components/infrastructure/onpremise/MarketplacePage/OnPremiseMarketplacePage';
import { OffersPage } from './components/infrastructure/shared/OffersPage/OffersPage';
import { OfferDetailPage } from './components/infrastructure/shared/OfferDetailPage/OfferDetailPage';
import { ProvisioningPage } from './components/infrastructure/shared/ProvisioningPage/ProvisioningPage';

const cloudClient = new MockMarketplaceClient();
const onPremiseClient = new MockOnPremiseClient();

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

                <Route path="/cloud-marketplace" element={
                  <MarketplaceClientProvider client={cloudClient} basePath="/cloud-marketplace" marketplaceName="Cloud Marketplace">
                    <MarketplacePage />
                  </MarketplaceClientProvider>
                } />
                <Route path="/cloud-marketplace/:providerId" element={
                  <MarketplaceClientProvider client={cloudClient} basePath="/cloud-marketplace" marketplaceName="Cloud Marketplace">
                    <OffersPage />
                  </MarketplaceClientProvider>
                } />
                <Route path="/cloud-marketplace/:providerId/:offerId" element={
                  <MarketplaceClientProvider client={cloudClient} basePath="/cloud-marketplace" marketplaceName="Cloud Marketplace">
                    <OfferDetailPage />
                  </MarketplaceClientProvider>
                } />
                <Route path="/cloud-marketplace/:providerId/:offerId/provision" element={
                  <MarketplaceClientProvider client={cloudClient} basePath="/cloud-marketplace" marketplaceName="Cloud Marketplace">
                    <ProvisioningPage />
                  </MarketplaceClientProvider>
                } />

                <Route path="/on-premise" element={
                  <MarketplaceClientProvider client={onPremiseClient} basePath="/on-premise" marketplaceName="On-Premise">
                    <OnPremiseMarketplacePage />
                  </MarketplaceClientProvider>
                } />
                <Route path="/on-premise/:providerId" element={
                  <MarketplaceClientProvider client={onPremiseClient} basePath="/on-premise" marketplaceName="On-Premise">
                    <OffersPage />
                  </MarketplaceClientProvider>
                } />
                <Route path="/on-premise/:providerId/:offerId" element={
                  <MarketplaceClientProvider client={onPremiseClient} basePath="/on-premise" marketplaceName="On-Premise">
                    <OfferDetailPage />
                  </MarketplaceClientProvider>
                } />
                <Route path="/on-premise/:providerId/:offerId/provision" element={
                  <MarketplaceClientProvider client={onPremiseClient} basePath="/on-premise" marketplaceName="On-Premise">
                    <ProvisioningPage />
                  </MarketplaceClientProvider>
                } />

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
