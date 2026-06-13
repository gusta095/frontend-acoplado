import { useOnPremiseDeploymentHistory } from '../../../context/OnPremiseDeploymentHistoryContext';
import { DeploymentHistoryContext } from '../../../context/DeploymentHistoryContext';
import { DeploymentPage } from './DeploymentPage';

export function OnPremiseDeploymentPage() {
  const history = useOnPremiseDeploymentHistory();
  return (
    <DeploymentHistoryContext.Provider value={history}>
      <DeploymentPage basePath="/on-premise/deployments" />
    </DeploymentHistoryContext.Provider>
  );
}
