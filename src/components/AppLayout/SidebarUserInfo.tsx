import { Avatar, Box, Divider, Typography } from '@mui/material';

export function SidebarUserInfo() {
  return (
    <Box>
      <Divider sx={{ borderColor: '#E2E8F0' }} />
      <Box display="flex" alignItems="center" gap={1.5} px={2} py={2}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: '#003087', fontSize: '0.8rem', fontWeight: 700 }}>GS</Avatar>
        <Box>
          <Typography variant="body2" fontWeight={700} color="text.primary" lineHeight={1.2}>Gustavo</Typography>
          <Typography variant="caption" color="text.secondary">Admin</Typography>
        </Box>
      </Box>
    </Box>
  );
}
