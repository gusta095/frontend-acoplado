import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { theme } from './theme';
import { CartProvider } from './context/CartContext';
import { DeploymentHistoryProvider } from './context/DeploymentHistoryContext';
import { OnPremiseCartProvider } from './context/OnPremiseCartContext';
import { OnPremiseDeploymentHistoryProvider } from './context/OnPremiseDeploymentHistoryContext';
import { MarketplaceClientProvider } from './context/MarketplaceClientContext';
import { TemplateSourceProvider, useTemplateSource } from './context/TemplateSourceContext';
import { OnPremiseSourceProvider, useOnPremiseSource } from './context/OnPremiseSourceContext';
import { AppLayout } from './components/AppLayout/AppLayout';
import { HomePage } from './components/HomePage/HomePage';
import { DeploymentsListPage } from './components/observability/deployments/DeploymentsListPage';
import { DeploymentPage } from './components/observability/deployments/DeploymentPage';
import { OnPremiseDeploymentsListPage } from './components/observability/deployments/OnPremiseDeploymentsListPage';
import { OnPremiseDeploymentPage } from './components/observability/deployments/OnPremiseDeploymentPage';
import { MarketplacePage } from './components/infrastructure/cloud/MarketplacePage/MarketplacePage';
import { OnPremiseMarketplacePage } from './components/infrastructure/onpremise/MarketplacePage/OnPremiseMarketplacePage';
import { OffersPage } from './components/infrastructure/shared/OffersPage/OffersPage';
import { OfferDetailPage } from './components/infrastructure/shared/OfferDetailPage/OfferDetailPage';
import { ProvisioningPage } from './components/infrastructure/shared/ProvisioningPage/ProvisioningPage';
import { CheckoutReviewPage } from './components/infrastructure/shared/Cart/CheckoutReviewPage';
import { ProvisioningProgressPage } from './components/infrastructure/shared/Cart/ProvisioningProgressPage';
import { TemplatesConfigPage } from './components/configuracoes/templates/TemplatesConfigPage';
import { CloudTemplatesConfigPage } from './components/configuracoes/templates/CloudTemplatesConfigPage';
import { OnPremiseTemplatesConfigPage } from './components/configuracoes/templates/OnPremiseTemplatesConfigPage';

function CloudRoutes() {
  const { cloudClient } = useTemplateSource();
  return (
    <MarketplaceClientProvider client={cloudClient} basePath="/cloud-marketplace" marketplaceName="Cloud Marketplace">
      <Routes>
        <Route index element={<MarketplacePage />} />
        <Route path=":providerId" element={<OffersPage />} />
        <Route path=":providerId/:offerId" element={<OfferDetailPage />} />
        <Route path=":providerId/:offerId/provision" element={<ProvisioningPage />} />
      </Routes>
    </MarketplaceClientProvider>
  );
}

function OnPremiseRoutes() {
  const { onPremiseClient } = useOnPremiseSource();
  return (
    <MarketplaceClientProvider client={onPremiseClient} basePath="/on-premise" marketplaceName="On-Premise">
      <Routes>
        <Route index element={<OnPremiseMarketplacePage />} />
        <Route path=":providerId" element={<OffersPage />} />
        <Route path=":providerId/:offerId" element={<OfferDetailPage />} />
        <Route path=":providerId/:offerId/provision" element={<ProvisioningPage />} />
      </Routes>
    </MarketplaceClientProvider>
  );
}

export default function App() {
  return (
    <TemplateSourceProvider>
      <OnPremiseSourceProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <DeploymentHistoryProvider>
            <OnPremiseDeploymentHistoryProvider>
              <CartProvider>
                <OnPremiseCartProvider>
                  <BrowserRouter>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<HomePage />} />

                        <Route path="/cloud-marketplace/*" element={<CloudRoutes />} />

                        <Route path="/on-premise/*" element={<OnPremiseRoutes />} />
                        <Route path="/on-premise/deployments" element={<OnPremiseDeploymentsListPage />} />
                        <Route path="/on-premise/deployments/:batchId" element={<OnPremiseDeploymentPage />} />

                        <Route path="/checkout/review" element={<CheckoutReviewPage />} />
                        <Route path="/provisioning" element={<ProvisioningProgressPage />} />

                        <Route path="/deployments" element={<DeploymentsListPage />} />
                        <Route path="/deployments/:batchId" element={<DeploymentPage />} />

                        <Route path="/configuracoes/templates" element={<TemplatesConfigPage />} />
                        <Route path="/configuracoes/templates/cloud" element={<CloudTemplatesConfigPage />} />
                        <Route path="/configuracoes/templates/on-premise" element={<OnPremiseTemplatesConfigPage />} />
                      </Routes>
                    </AppLayout>
                  </BrowserRouter>
                </OnPremiseCartProvider>
              </CartProvider>
            </OnPremiseDeploymentHistoryProvider>
          </DeploymentHistoryProvider>
        </ThemeProvider>
      </OnPremiseSourceProvider>
    </TemplateSourceProvider>
  );
}
