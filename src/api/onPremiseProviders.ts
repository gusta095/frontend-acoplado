import type { Provider } from '../types';

export const ON_PREMISE_PROVIDERS: Provider[] = [
  {
    id: 'vmware',
    name: 'VMware vSphere',
    shortName: 'VMware',
    logoUrl: '',
    accentColor: '#1B9C2E',
    description: 'Virtualização enterprise com vSphere para workloads críticos e ambientes híbridos.',
  },
  {
    id: 'proxmox',
    name: 'Proxmox VE',
    shortName: 'Proxmox',
    logoUrl: '',
    accentColor: '#E57000',
    description: 'Plataforma open source de virtualização e containers com alta disponibilidade.',
  },
  {
    id: 'baremetal',
    name: 'Bare Metal',
    shortName: 'Bare Metal',
    logoUrl: '',
    accentColor: '#5A67D8',
    description: 'Servidores físicos dedicados com provisionamento automatizado via PXE e IPMI.',
  },
];
