import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { CartProvider } from './context/CartContext';
import { DeploymentHistoryProvider } from './context/DeploymentHistoryContext';
import { MarketplaceClientProvider } from './context/MarketplaceClientContext';
import { TemplateSourceProvider, useTemplateSource } from './context/TemplateSourceContext';
import { onPremiseClient } from './api/clients';
import { AppLayout } from './components/AppLayout/AppLayout';
import { HomePage } from './components/HomePage/HomePage';
import { DeploymentsListPage } from './components/observability/deployments/DeploymentsListPage';
import { DeploymentPage } from './components/observability/deployments/DeploymentPage';
import { MarketplacePage } from './components/infrastructure/cloud/MarketplacePage/MarketplacePage';
import { OnPremiseMarketplacePage } from './components/infrastructure/onpremise/MarketplacePage/OnPremiseMarketplacePage';
import { OffersPage } from './components/infrastructure/shared/OffersPage/OffersPage';
import { OfferDetailPage } from './components/infrastructure/shared/OfferDetailPage/OfferDetailPage';
import { ProvisioningPage } from './components/infrastructure/shared/ProvisioningPage/ProvisioningPage';
import { TemplatesConfigPage } from './components/configuracoes/templates/TemplatesConfigPage';

function CloudProvider({ children }: { children: React.ReactNode }) {
  const { cloudClient } = useTemplateSource();
  return (
    <MarketplaceClientProvider client={cloudClient} basePath="/cloud-marketplace" marketplaceName="Cloud Marketplace">
      {children}
    </MarketplaceClientProvider>
  );
}

export default function App() {
  return (
    <TemplateSourceProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <DeploymentHistoryProvider>
          <CartProvider>
            <BrowserRouter>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />

                  <Route path="/cloud-marketplace" element={<CloudProvider><MarketplacePage /></CloudProvider>} />
                  <Route path="/cloud-marketplace/:providerId" element={<CloudProvider><OffersPage /></CloudProvider>} />
                  <Route path="/cloud-marketplace/:providerId/:offerId" element={<CloudProvider><OfferDetailPage /></CloudProvider>} />
                  <Route path="/cloud-marketplace/:providerId/:offerId/provision" element={<CloudProvider><ProvisioningPage /></CloudProvider>} />

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

                  <Route path="/configuracoes/templates" element={<TemplatesConfigPage />} />
                </Routes>
              </AppLayout>
            </BrowserRouter>
          </CartProvider>
        </DeploymentHistoryProvider>
      </ThemeProvider>
    </TemplateSourceProvider>
  );
}
