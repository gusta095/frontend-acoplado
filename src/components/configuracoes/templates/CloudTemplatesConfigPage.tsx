import { Box, Typography } from '@mui/material';
import { Cloud as CloudIcon } from '@mui/icons-material';
import { useTemplateSource } from '../../../context/TemplateSourceContext';
import { TemplateSourceSection } from './TemplateSourceSection';

export function CloudTemplatesConfigPage() {
  const { source, githubConfig, localPath, autoReload, setSource, setGitHubConfig, setLocalPath, setAutoReload } = useTemplateSource();

  return (
    <Box p={4} maxWidth={640}>
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <CloudIcon sx={{ fontSize: 22, color: '#003087' }} />
          <Typography variant="h5" fontWeight={800} color="text.primary">
            Templates Cloud
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Configure de onde o portal lê os templates de infraestrutura cloud.
          Use GitHub para produção e Pasta Local durante o desenvolvimento.
        </Typography>
      </Box>

      <TemplateSourceSection
        source={source}
        githubConfig={githubConfig}
        localPath={localPath}
        autoReload={autoReload}
        setSource={setSource}
        setGitHubConfig={setGitHubConfig}
        setLocalPath={setLocalPath}
        setAutoReload={setAutoReload}
        accentColor="#003087"
      />
    </Box>
  );
}
