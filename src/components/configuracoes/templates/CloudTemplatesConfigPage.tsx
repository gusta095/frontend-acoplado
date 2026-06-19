import { Box, Typography } from '@mui/material';
import { Cloud as CloudIcon } from '@mui/icons-material';
import { useTemplateSource } from '../../../context/TemplateSourceContext';
import { TemplateSourceSection } from './TemplateSourceSection';

export function CloudTemplatesConfigPage() {
  const { sources, autoReload, setSources, setAutoReload } = useTemplateSource();

  return (
    <Box p={4} maxWidth={860} mx="auto">
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <CloudIcon sx={{ fontSize: 22, color: '#003087' }} />
          <Typography variant="h5" fontWeight={800} color="text.primary">
            Templates Cloud
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Configure de onde o portal lê os templates de infraestrutura cloud.
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
