import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Box, CssBaseline, ThemeProvider,
  createTheme, Container
} from '@mui/material';
import {
  Dashboard as DashboardIcon, Description, Psychology,
  CloudUpload, Assessment
} from '@mui/icons-material';

import Dashboard from './components/Dashboard';
import PermitForm from './components/PermitForm';
import PermitList from './components/PermitList';
import AIAnalysis from './components/AIAnalysis';
import DocumentUpload from './components/DocumentUpload';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

const drawerWidth = 240;

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'permits', label: 'Permit Management', icon: <Description /> },
  { id: 'ai-analysis', label: 'AI Analysis', icon: <Psychology /> },
  { id: 'documents', label: 'Document Upload', icon: <CloudUpload /> },
  { id: 'reports', label: 'Reports', icon: <Assessment /> },
];

function App() {
  const [selectedView, setSelectedView] = useState('dashboard');
  const [permits, setPermits] = useState([]);

  const handlePermitSubmit = (permitData: any) => {
    const newPermit = {
      id: `PERMIT_${Date.now()}`,
      ...permitData,
      status: 'SUBMITTED',
      submissionDate: new Date().toISOString(),
    };
    setPermits(prev => [...prev, newPermit]);
    setSelectedView('permits');
  };

  const handleViewDetails = (permit: any) => {
    console.log('Viewing permit details:', permit);
  };

  const renderContent = () => {
    switch (selectedView) {
      case 'dashboard': return <Dashboard permits={permits} />;
      case 'permits': return <PermitList permits={permits} onViewDetails={handleViewDetails} />;
      case 'ai-analysis': return <AIAnalysis />;
      case 'documents': return <DocumentUpload />;
      case 'reports': return <div>Reports coming soon...</div>;
      default: return <Dashboard permits={permits} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed" sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              🏛️ AI-Powered NFPA Permit Review System
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
          variant="permanent"
          anchor="left"
        >
          <Toolbar />
          <List>
            {menuItems.map((item) => (
              <ListItem
                key={item.id}
                selected={selectedView === item.id}
                onClick={() => setSelectedView(item.id)}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </List>
        </Drawer>
        
        <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
          <Toolbar />
          <Container maxWidth="xl">
            {renderContent()}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
