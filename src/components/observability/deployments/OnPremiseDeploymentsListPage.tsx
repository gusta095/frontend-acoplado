import { useOnPremiseDeploymentHistory } from '../../../context/OnPremiseDeploymentHistoryContext';
import { DeploymentHistoryContext } from '../../../context/DeploymentHistoryContext';
import { DeploymentsListPage } from './DeploymentsListPage';

export function OnPremiseDeploymentsListPage() {
  const history = useOnPremiseDeploymentHistory();
  return (
    <DeploymentHistoryContext.Provider value={history}>
      <DeploymentsListPage basePath="/on-premise/deployments" />
    </DeploymentHistoryContext.Provider>
  );
}
