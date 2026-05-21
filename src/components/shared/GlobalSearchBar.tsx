import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Autocomplete, Box, CircularProgress, InputAdornment, TextField, Typography } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import type { Offer } from '../../types';
import { MockMarketplaceClient } from '../../api/MockMarketplaceClient';
import { ProviderBadge } from './ProviderBadge';

const client = new MockMarketplaceClient();

export function GlobalSearchBar() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!inputValue.trim()) {
      setOptions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await client.getAllOffers({ search: inputValue });
        setOptions(results);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [inputValue]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name)}
      inputValue={inputValue}
      onInputChange={(_, val) => setInputValue(val)}
      onChange={(_, val) => {
        if (val && typeof val !== 'string') {
          navigate(`/cloud-marketplace/${val.providerId}/${val.id}`);
          setInputValue('');
        }
      }}
      loading={loading}
      groupBy={(opt) => (typeof opt === 'string' ? '' : opt.providerId.toUpperCase())}
      noOptionsText="Nenhuma oferta encontrada"
      sx={{ width: '100%', maxWidth: 480 }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Buscar ofertas em todos os providers..."
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              borderRadius: 2,
              '& fieldset': { borderColor: '#E2E8F0' },
            },
          }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#718096', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading && <CircularProgress size={16} sx={{ color: '#003087' }} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, opt) => (
        typeof opt === 'string' ? null : (
          <Box component="li" {...props} key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
            <Box flex={1}>
              <Typography variant="body2" fontWeight={600} color="text.primary">{opt.name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300, display: 'block' }}>
                {opt.shortDescription}
              </Typography>
            </Box>
            <ProviderBadge provider={opt.providerId} />
          </Box>
        )
      )}
    />
  );
}
