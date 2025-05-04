import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  CreditCard as CreditCardIcon,
  Logout as LogoutIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';

import { logout } from '../services/authService';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      onLogout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navItems = user ? [
    { name: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { name: 'Generate SQL', path: '/generate', icon: <CodeIcon /> },
    { name: 'Connections', path: '/connections', icon: <StorageIcon /> },
    { name: 'History', path: '/history', icon: <HistoryIcon /> }
  ] : [];

  const userMenuItems = user ? [
    { name: 'Profile', path: '/profile', icon: <PersonIcon /> },
    { name: 'Subscription', path: '/subscription', icon: <CreditCardIcon /> },
    { name: 'Logout', action: handleLogout, icon: <LogoutIcon /> }
  ] : [];

  const drawer = (
    <Box sx={{ textAlign: 'center', height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TerminalIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
        <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '.1rem', color: theme.palette.primary.main }}>
          SQLGenAI
        </Typography>
      </Box>
      <Divider />
      <List sx={{ p: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem 
              key={item.name} 
              component={RouterLink} 
              to={item.path}
              button
              onClick={handleDrawerToggle}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05)
                }
              }}
            >
              <ListItemIcon sx={{ color: isActive ? theme.palette.primary.main : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.name} 
                primaryTypographyProps={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? theme.palette.primary.main : 'inherit'
                }}
              />
            </ListItem>
          );
        })}
        {user && (
          <>
            <Divider sx={{ my: 1.5 }} />
            {userMenuItems.map((item) => (
              <ListItem 
                key={item.name} 
                button
                component={item.path ? RouterLink : 'div'}
                to={item.path}
                onClick={(e) => {
                  handleDrawerToggle();
                  if (item.action) item.action();
                }}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05)
                  }
                }}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.name} />
              </ListItem>
            ))}
          </>
        )}
      </List>
    </Box>
  );

  return (
    <AppBar 
      position="sticky" 
      elevation={1}
      color="primary"
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ height: 64 }}>
          {/* Mobile menu icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}>
            <IconButton
              size="large"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleDrawerToggle}
              color="inherit"
              edge="start"
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="left"
              open={drawerOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile
              }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
              }}
            >
              {drawer}
            </Drawer>
          </Box>

          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TerminalIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1.5, fontSize: 28 }} />
            <Typography
              variant="h5"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                mr: 3,
                display: 'flex',
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.2rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              SQLGenAI
            </Typography>
          </Box>

          {/* Desktop navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.name}
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    mx: 0.5,
                    px: 2,
                    py: 1,
                    borderRadius: '4px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    '&:after': isActive ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '70%',
                      height: '3px',
                      backgroundColor: theme.palette.secondary.main,
                      borderRadius: '2px 2px 0 0'
                    } : {},
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.white, 0.1),
                    }
                  }}
                  startIcon={item.icon}
                >
                  {item.name}
                </Button>
              );
            })}
          </Box>

          {/* User menu or login/register buttons */}
          <Box sx={{ flexGrow: 0 }}>
            {user ? (
              <>
                <Tooltip title="Account settings">
                  <IconButton 
                    onClick={handleOpenUserMenu} 
                    sx={{ 
                      p: 0,
                      ml: 2,
                      border: '2px solid',
                      borderColor: 'rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <Avatar 
                      alt={user.username} 
                      src="/static/images/avatar/2.jpg"
                      sx={{ width: 36, height: 36 }}
                    >
                      {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ 
                    mt: '45px',
                    '& .MuiPaper-root': {
                      borderRadius: 2,
                      boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  {userMenuItems.map((item) => (
                    <MenuItem 
                      key={item.name} 
                      onClick={() => {
                        handleCloseUserMenu();
                        if (item.action) item.action();
                        else if (item.path) navigate(item.path);
                      }}
                      sx={{ py: 1.5, px: 2.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {item.icon}
                      </ListItemIcon>
                      <Typography variant="body2">{item.name}</Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex' }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="text"
                  sx={{ 
                    color: 'white', 
                    mr: 2,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.common.white, 0.1),
                    }
                  }}
                >
                  Login
                </Button>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  sx={{ 
                    bgcolor: theme.palette.secondary.main,
                    '&:hover': {
                      bgcolor: theme.palette.secondary.dark,
                    },
                    px: 3
                  }}
                >
                  Register
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
