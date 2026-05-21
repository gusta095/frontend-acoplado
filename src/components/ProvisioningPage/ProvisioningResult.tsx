import { Box, Button, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Error as ErrorIcon } from '@mui/icons-material';
import type { ProvisioningResponse } from '../../types';

interface Props {
  result: ProvisioningResponse;
  onBack: () => void;
}

export function ProvisioningResult({ result, onBack }: Props) {
  const isSuccess = result.status === 'accepted';
  return (
    <Box display="flex" flexDirection="column" alignItems="center" py={8} gap={3}>
      {isSuccess
        ? <CheckCircleIcon sx={{ fontSize: 64, color: '#48BB78' }} />
        : <ErrorIcon sx={{ fontSize: 64, color: '#FC8181' }} />
      }
      <Typography variant="h6" fontWeight={700} color="text.primary">
        {isSuccess ? 'Provisionamento iniciado!' : 'Falha no provisionamento'}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
        {result.message}
      </Typography>
      {result.requestId && (
        <Typography variant="caption" color="text.disabled">ID: {result.requestId}</Typography>
      )}
      <Button variant="outlined" onClick={onBack}>Voltar</Button>
    </Box>
  );
}
