import type { Provider } from '../types';

export const CLOUD_PROVIDERS: Provider[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    logoUrl: '',
    accentColor: '#FF9900',
    description: 'Compute, storage, databases e mais na maior cloud do mundo.',
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    logoUrl: '',
    accentColor: '#0078D4',
    description: 'Serviços cloud da Microsoft com integração nativa ao ecossistema enterprise.',
  },
  {
    id: 'oci',
    name: 'Oracle Cloud Infrastructure',
    shortName: 'OCI',
    logoUrl: '',
    accentColor: '#C74634',
    description: 'Infraestrutura de alto desempenho com foco em workloads críticos.',
  },
];
