import { Box, Typography } from '@mui/material';
import { Hub as HubIcon } from '@mui/icons-material';
import { GitHubIntegrationCard } from './GitHubIntegrationCard';

export function IntegracoesPage() {
  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100%', px: { xs: 2, md: 5 }, py: 4 }}>

      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1.5} mb={0.75}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 2, flexShrink: 0,
              background: 'linear-gradient(135deg, #003087 0%, #0050B3 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <HubIcon sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">
            Integrações
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Conecte o portal a serviços externos. Cada integração é configurada independentemente
          e pode ser testada antes de ser usada.
        </Typography>
      </Box>

      <Box maxWidth={860} mx="auto">
        <GitHubIntegrationCard />
      </Box>

    </Box>
  );
}
