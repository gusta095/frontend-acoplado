import { Box, Typography } from '@mui/material';

export function DevToolsPage() {
  return (
    <Box sx={{ p: 4, maxWidth: 600 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>DevTools</Typography>
      <Typography variant="body2" color="text.secondary">
        Nenhuma ferramenta de desenvolvimento disponível no momento.
      </Typography>
    </Box>
  );
}
