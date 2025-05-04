import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  Divider, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Collapse,
  IconButton,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { 
  CheckCircleOutline, 
  WarningAmber, 
  Error, 
  Help,
  ExpandMore,
  ExpandLess,
  Speed,
  Lightbulb,
  BugReport,
  ReportProblem,
  Assessment as AssessmentIcon,
  Info as InfoIcon,
  CircleOutlined,
  ArrowRightAlt
} from '@mui/icons-material';

const QueryPerformanceAnalysis = ({ performanceData, executionTime, isExplainOnly = false }) => {
  const [expanded, setExpanded] = useState(true);
  
  if (!performanceData) {
    return null;
  }
  
  const { status, message, issues, warnings, recommendations, additional_info } = performanceData;
  
  const getStatusIcon = () => {
    switch (status) {
      case 'good':
        return <CheckCircleOutline style={{ color: '#4caf50' }} />;
      case 'warning':
        return <WarningAmber style={{ color: '#ff9800' }} />;
      case 'poor':
        return <Error style={{ color: '#f44336' }} />;
      default:
        return <Help style={{ color: '#9e9e9e' }} />;
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return '#e8f5e9';
      case 'warning':
        return '#fff3e0';
      case 'poor':
        return '#ffebee';
      default:
        return '#f5f5f5';
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'good':
        return 'Good';
      case 'warning':
        return 'Warning';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };
  
  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };
  
  return (
    <Paper 
      elevation={3} 
      sx={{ 
        mt: 2, 
        mb: 2, 
        overflow: 'hidden',
        borderRadius: '8px',
        border: `1px solid ${status === 'good' ? '#4caf50' : status === 'warning' ? '#ff9800' : '#f44336'}`
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2, 
          bgcolor: getStatusColor(),
          borderBottom: expanded ? `1px solid ${status === 'good' ? '#c8e6c9' : status === 'warning' ? '#ffe0b2' : '#ffcdd2'}` : 'none'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {getStatusIcon()}
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold' }}>
            Query Performance Analysis
          </Typography>
          <Chip 
            label={getStatusText()} 
            size="small" 
            sx={{ 
              ml: 2, 
              bgcolor: status === 'good' ? '#4caf50' : status === 'warning' ? '#ff9800' : '#f44336',
              color: 'white',
              fontWeight: 'bold'
            }} 
          />
          {!isExplainOnly ? (
            executionTime === 'cached' ? (
              <Tooltip title="Query result from cache">
                <Chip
                  icon={<Speed fontSize="small" />}
                  label="Cached"
                  size="small"
                  color="secondary"
                  sx={{ ml: 1 }}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Query execution time">
                <Chip
                  icon={<Speed fontSize="small" />}
                  label={`${executionTime ? executionTime.toFixed(2) : '0.00'}s`}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Tooltip>
            )
          ) : (
            <Tooltip title="Explain plan analysis only">
              <Chip
                icon={<AssessmentIcon fontSize="small" />}
                label="Explain Only"
                size="small"
                sx={{ ml: 1 }}
              />
            </Tooltip>
          )}
        </Box>
        <IconButton onClick={handleToggleExpand} size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          <Typography 
            variant="body1" 
            component="div"
            sx={{ mb: 2, fontWeight: 'medium' }}
          >
            {message}
          </Typography>
          
          {issues && issues.length > 0 && (
            <>
              <Typography 
                variant="subtitle1" 
                component="div"
                sx={{ mt: 2, mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
              >
                <BugReport sx={{ mr: 1, color: '#f44336' }} />
                Issues
              </Typography>
              <List dense disablePadding>
                {issues.map((issue, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: '30px' }}>
                      <Error fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={<Box component="div">{issue}</Box>} 
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          
          {warnings && warnings.length > 0 && (
            <>
              <Typography 
                variant="subtitle1" 
                component="div"
                sx={{ mt: 2, mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
              >
                <ReportProblem sx={{ mr: 1, color: '#ff9800' }} />
                Warnings
              </Typography>
              <List dense disablePadding>
                {warnings.map((warning, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: '30px' }}>
                      <WarningAmber fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={<Box component="div">{warning}</Box>} 
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          
          {/* Additional Information Section */}
          {additional_info && (
            <>
              <Typography 
                variant="subtitle1" 
                component="div"
                sx={{ mt: 2, mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
              >
                <InfoIcon sx={{ mr: 1, color: '#2196f3' }} />
                Analysis Details
              </Typography>
              <Card variant="outlined" sx={{ mb: 2, bgcolor: '#f5f9ff' }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ '& p': { my: 0.5 }, '& strong': { fontWeight: 'bold' } }}>
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <Box component="div" sx={{ my: 0.5 }} {...props} />,
                        ul: ({node, ...props}) => <Box component="div" sx={{ pl: 2, m: 0 }} {...props} />,
                        li: ({node, ...props}) => <Box component="div" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }} {...props} />,
                        a: ({node, ...props}) => <Box component="a" sx={{ color: 'primary.main' }} {...props} />,
                        h1: ({node, ...props}) => <Typography variant="h6" {...props} />,
                        h2: ({node, ...props}) => <Typography variant="subtitle1" {...props} />,
                        h3: ({node, ...props}) => <Typography variant="subtitle2" {...props} />,
                        h4: ({node, ...props}) => <Typography variant="body1" sx={{ fontWeight: 'bold' }} {...props} />,
                        h5: ({node, ...props}) => <Typography variant="body2" sx={{ fontWeight: 'bold' }} {...props} />,
                        h6: ({node, ...props}) => <Typography variant="body2" sx={{ fontWeight: 'bold', fontStyle: 'italic' }} {...props} />
                      }}
                    >
                      {additional_info}
                    </ReactMarkdown>
                  </Box>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* Recommendations Section */}
          {recommendations && recommendations.length > 0 && (
            <>
              <Typography 
                variant="subtitle1" 
                component="div"
                sx={{ mt: 2, mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}
              >
                <Lightbulb sx={{ mr: 1, color: '#2196f3' }} />
                Recommendations
              </Typography>
              <List dense disablePadding>
                {recommendations.map((recommendation, index) => {
                  // Check if recommendation already starts with a bullet point
                  const hasBullet = recommendation.trim().startsWith('•');
                  const cleanRecommendation = hasBullet ? recommendation.trim().substring(1).trim() : recommendation.trim();
                  
                  return (
                    <ListItem key={index} sx={{ py: 0.5, pl: 0 }}>
                      <ListItemText 
                        disableTypography
                        primary={
                          <Box sx={{
                            '& p': { my: 0 },
                            '& strong': { fontWeight: 'bold' },
                            '& ol': { pl: 0, listStyle: 'none', m: 0 },
                            '& ol li': { display: 'flex', alignItems: 'flex-start', mb: 1 },
                            '& ol li:before': {
                              content: '""',
                              display: 'none'
                            }
                          }}>
                            <ReactMarkdown
                              components={{
                                p: ({node, ...props}) => <Box component="div" {...props} />,
                                ol: ({node, ...props}) => <Box component="div" {...props} />,
                                ul: ({node, ...props}) => <Box component="div" sx={{ pl: 0, listStyle: 'none', m: 0 }} {...props} />,
                                li: ({node, children, ...props}) => {
                                  // Check if this is a nested list item by looking at the parent node
                                  const isNested = node.parent && 
                                    node.parent.parent && 
                                    (node.parent.parent.tagName === 'li' || 
                                     node.parent.parent.tagName === 'ul');
                                  
                                  return (
                                    <Box component="div" sx={{display: 'flex', alignItems: 'flex-start', mb: 1}}>
                                      {isNested ? 
                                        <CircleOutlined fontSize="small" color="info" sx={{mr: 1, mt: 0.5, fontSize: '0.8rem'}} /> : 
                                        <Lightbulb fontSize="small" color="primary" sx={{mr: 1, mt: 0.5}} />
                                      }
                                      <Box component="div" {...props}>{children}</Box>
                                    </Box>
                                  );
                                },
                                a: ({node, ...props}) => <Box component="a" sx={{ color: 'primary.main' }} {...props} />,
                                h1: ({node, ...props}) => <Typography variant="h6" {...props} />,
                                h2: ({node, ...props}) => <Typography variant="subtitle1" {...props} />,
                                h3: ({node, ...props}) => <Typography variant="subtitle2" {...props} />,
                                h4: ({node, ...props}) => <Typography variant="body1" sx={{ fontWeight: 'bold' }} {...props} />,
                                h5: ({node, ...props}) => <Typography variant="body2" sx={{ fontWeight: 'bold' }} {...props} />,
                                h6: ({node, ...props}) => <Typography variant="body2" sx={{ fontWeight: 'bold', fontStyle: 'italic' }} {...props} />
                              }}
                            >
                              {cleanRecommendation}
                            </ReactMarkdown>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default QueryPerformanceAnalysis;
