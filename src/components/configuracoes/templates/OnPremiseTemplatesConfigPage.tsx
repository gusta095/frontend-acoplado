import { Box, Typography } from '@mui/material';
import { Storage as StorageIcon } from '@mui/icons-material';
import { useOnPremiseSource } from '../../../context/OnPremiseSourceContext';
import { TemplateSourceSection } from './TemplateSourceSection';

export function OnPremiseTemplatesConfigPage() {
  const { sources, autoReload, setSources, setAutoReload } = useOnPremiseSource();

  return (
    <Box p={4} maxWidth={860} mx="auto">
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <StorageIcon sx={{ fontSize: 22, color: '#003087' }} />
          <Typography variant="h5" fontWeight={800} color="text.primary">
            Templates On-Premise
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Configure de onde o portal lê os templates de infraestrutura on-premise.
          Adicione URLs de repositórios GitHub ou caminhos de pastas locais.
        </Typography>
      </Box>

      <TemplateSourceSection
        sources={sources}
        autoReload={autoReload}
        setSources={setSources}
        setAutoReload={setAutoReload}
        accentColor="#003087"
      />
    </Box>
  );
}
