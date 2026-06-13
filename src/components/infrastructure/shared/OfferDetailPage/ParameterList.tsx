import { useState } from 'react';
import { Box, Collapse, Divider, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import type { OfferParameter } from '../../../../types';

const TYPE_LABELS: Record<string, string> = {
  string: 'texto',
  number: 'número',
  boolean: 'booleano',
  select: 'seleção',
  multiselect: 'múltipla escolha',
};

interface Props {
  parameters: OfferParameter[];
}

export function ParameterList({ parameters }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box
        px={2.5} py={1.5}
        bgcolor="#F7FAFC"
        borderBottom={open ? '1px solid #E2E8F0' : 'none'}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ cursor: 'pointer', userSelect: 'none', '&:hover': { bgcolor: '#EDF2F7' }, transition: 'background 0.15s' }}
        onClick={() => setOpen(v => !v)}
      >
        <Typography variant="body2" fontWeight={700} color="text.secondary">
          Parâmetros ({parameters.length})
        </Typography>
        <IconButton size="small" sx={{ color: 'text.secondary', p: 0.25 }} tabIndex={-1}>
          {open ? <RemoveIcon fontSize="small" /> : <AddIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        {parameters.map((param, i) => (
          <Box key={param.key}>
            {i > 0 && <Divider />}
            <Box px={2.5} py={1.5} display="flex" alignItems="flex-start" gap={2}>
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={0.5} mb={0.25}>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {param.label}
                    {param.required && <Typography component="span" color="error.main" ml={0.25}>*</Typography>}
                  </Typography>
                  {param.description && (
                    <Tooltip title={param.description} arrow>
                      <InfoOutlinedIcon sx={{ fontSize: 14, color: '#A0AEC0', cursor: 'help' }} />
                    </Tooltip>
                  )}
                </Box>
                <Typography variant="caption" color="text.disabled">
                  chave: <code style={{ fontFamily: 'monospace', background: '#EDF2F7', padding: '1px 4px', borderRadius: 3 }}>{param.key}</code>
                  {' · '}tipo: {TYPE_LABELS[param.type] ?? param.type}
                </Typography>
                {param.options && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                    Opções: {param.options.join(', ')}
                  </Typography>
                )}
              </Box>
              <Box>
                {param.required ? (
                  <Typography variant="caption" fontWeight={700} color="error.main">Obrigatório</Typography>
                ) : (
                  <Typography variant="caption" color="text.disabled">Opcional</Typography>
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Collapse>
    </Paper>
  );
}
