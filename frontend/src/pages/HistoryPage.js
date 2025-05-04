import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayArrowIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Services
import { getQueryHistory, toggleFavorite, deleteQuery } from '../services/queryService';
import { getConnections } from '../services/connectionService';

const HistoryPage = () => {
  // State for query history
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for connections
  const [connections, setConnections] = useState({});
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // State for filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // State for query details dialog
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  // State for delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // State for actions
  const [actionLoading, setActionLoading] = useState(null);
  
  // Load connections on component mount
  useEffect(() => {
    loadConnections();
  }, []);
  
  // Load query history on component mount and when filters change
  useEffect(() => {
    loadQueryHistory();
  }, [page, rowsPerPage, tabValue, connectionsLoaded]);
  
  // Load all database connections
  const loadConnections = async () => {
    try {
      const connectionsData = await getConnections();
      
      // Convert connections array to a map for easy lookup by ID
      const connectionsMap = {};
      connectionsData.forEach(connection => {
        connectionsMap[connection.id] = connection;
      });
      
      setConnections(connectionsMap);
      setConnectionsLoaded(true);
    } catch (err) {
      console.error('Error loading connections:', err);
      // Still mark as loaded to prevent infinite loading
      setConnectionsLoaded(true);
    }
  };
  
  const loadQueryHistory = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Create proper params object based on the selected tab
      const params = {
        page: page + 1,
        per_page: rowsPerPage
      };
      
      // Only add search parameter if it's not empty
      if (searchQuery && searchQuery.trim() !== '') {
        params.search = searchQuery.trim();
      }
      
      // Add specific filter parameters based on tab
      if (tabValue === 1) {
        // Favorites tab - set is_favorite to true
        params.is_favorite = true;
      } else if (tabValue === 2) {
        // Successful tab - filter by successful status
        params.is_successful = true;
      }
      
      try {
        const data = await getQueryHistory(params);
        
        // Enhance history items with connection details if connections are loaded
        let enhancedHistory = data.history || [];
        
        if (connectionsLoaded && Object.keys(connections).length > 0) {
          enhancedHistory = enhancedHistory.map(query => {
            // Find the connection for this query
            const connection = connections[query.connection_id];
            
            if (connection) {
              return {
                ...query,
                connection_name: connection.name,
                database_name: connection.database_name || connection.database
              };
            }
            return query;
          });
        }
        
        // Check if we have search results
        if (params.search && enhancedHistory.length === 0) {
          // No results for search query
          console.log('No results found for search:', params.search);
        }
        
        setQueries(enhancedHistory);
        setTotalCount(data.total_count || 0);
      } catch (apiError) {
        // Handle 404 errors (no data on this page)
        if (apiError.response?.status === 404) {
          console.log('No data found on page', page + 1);
          
          // If we're on a page beyond the first and get a 404, go back to the previous page
          if (page > 0) {
            setPage(page - 1);
          } else {
            // If we're on the first page and get a 404, just show empty results
            setQueries([]);
            setTotalCount(0);
          }
        } else {
          // Re-throw for other errors
          throw apiError;
        }
      }
    } catch (err) {
      setError('Failed to load query history');
      console.error('Error loading query history:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
  };
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  const handleSearch = () => {
    // Reset to first page when searching
    setPage(0);
    
    // Show loading indicator
    setLoading(true);
    
    // Clear any previous errors
    setError('');
    
    // Load query history with search parameter
    loadQueryHistory();
    
    // Log search for debugging
    console.log('Searching for:', searchQuery);
  };
  
  const handleSearchKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleViewDetails = (query) => {
    setSelectedQuery(query);
    setDetailsOpen(true);
  };
  
  const handleCloseDetails = () => {
    setDetailsOpen(false);
  };
  
  const handleDeleteClick = (query) => {
    setQueryToDelete(query);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteCancel = () => {
    setQueryToDelete(null);
    setDeleteDialogOpen(false);
  };
  
  const handleDeleteConfirm = async () => {
    if (!queryToDelete) return;
    
    setDeleting(true);
    
    try {
      await deleteQuery(queryToDelete.id);
      
      // Update the queries list by filtering out the deleted query
      const updatedQueries = queries.filter(q => q.id !== queryToDelete.id);
      setQueries(updatedQueries);
      
      // Update the total count
      setTotalCount(prevCount => Math.max(0, prevCount - 1));
      
      // If we deleted the last item on the current page, go back to the previous page
      // unless we're already on the first page
      if (updatedQueries.length === 0 && page > 0) {
        setPage(page - 1);
      } else if (updatedQueries.length === 0) {
        // If we're on the first page and it's now empty, reload to get fresh data
        loadQueryHistory();
      }
      
      setDeleteDialogOpen(false);
      
      // If we're viewing the details of the deleted query, close the dialog
      if (selectedQuery && selectedQuery.id === queryToDelete.id) {
        setDetailsOpen(false);
      }
    } catch (err) {
      setError(`Failed to delete query: ${err.message}`);
    } finally {
      setDeleting(false);
      setQueryToDelete(null);
    }
  };
  
  const handleToggleFavorite = async (queryId) => {
    setActionLoading(queryId);
    
    try {
      const result = await toggleFavorite(queryId);
      
      // Update the queries list
      setQueries(queries.map(q => {
        if (q.id === queryId) {
          return {
            ...q,
            is_favorite: result.is_favorite
          };
        }
        return q;
      }));
      
      // Also update the selected query if it's open in the details dialog
      if (selectedQuery && selectedQuery.id === queryId) {
        setSelectedQuery({
          ...selectedQuery,
          is_favorite: result.is_favorite
        });
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleCopyQuery = (sql) => {
    navigator.clipboard.writeText(sql);
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  if (loading && queries.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Query History
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          View and manage your SQL query history
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Filters */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="All Queries" />
            <Tab label="Favorites" />
            <Tab label="Successful" />
          </Tabs>
          
          <Divider />
          
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <TextField
              placeholder="Search queries..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleSearchKeyPress}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              size="small"
              sx={{ flexGrow: 1, mr: 2 }}
            />
            <Button
              variant="outlined"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
              sx={{ mr: 1 }}
            >
              Search
            </Button>
            <Button
              onClick={loadQueryHistory}
              startIcon={<RefreshIcon />}
            >
              Refresh
            </Button>
          </Box>
        </Paper>
        
        {/* Query Table */}
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell width="40px"></TableCell>
                <TableCell>Query</TableCell>
                <TableCell>Database</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Date</TableCell>
                <TableCell width="120px">Status</TableCell>
                <TableCell width="120px">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : queries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      {searchQuery 
                        ? 'No queries match your search criteria' 
                        : tabValue === 1 
                          ? 'No favorite queries yet' 
                          : tabValue === 2 
                            ? 'No successful queries yet'
                            : 'No queries in your history yet'}
                    </Typography>
                    <Button 
                      variant="contained" 
                      component={RouterLink} 
                      to="/generate"
                      sx={{ mt: 2 }}
                    >
                      Generate a Query
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                queries.map((query) => (
                  <TableRow key={query.id} hover>
                    <TableCell>
                      <IconButton 
                        size="small"
                        onClick={() => handleToggleFavorite(query.id)}
                        disabled={actionLoading === query.id}
                      >
                        {actionLoading === query.id ? (
                          <CircularProgress size={20} />
                        ) : query.is_favorite ? (
                          <StarIcon color="warning" />
                        ) : (
                          <StarBorderIcon />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Click to view details">
                        <Typography
                          variant="body2"
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                          onClick={() => handleViewDetails(query)}
                        >
                          {truncateText(query.natural_language_query, 60)}
                        </Typography>
                      </Tooltip>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="div"
                        sx={{
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {truncateText(query.generated_sql, 60)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {query.database_name ? (
                        <Tooltip title={`Connection: ${query.connection_name || `ID: ${query.connection_id}`}`}>
                          <Chip 
                            label={query.database_name} 
                            size="small" 
                            variant="outlined"
                            color="primary"
                          />
                        </Tooltip>
                      ) : query.connection_name ? (
                        <Tooltip title={`Connection ID: ${query.connection_id}`}>
                          <Chip 
                            label={query.connection_name} 
                            size="small" 
                            variant="outlined"
                            color="primary"
                          />
                        </Tooltip>
                      ) : query.connection_id ? (
                        <Chip 
                          label={`Connection ${query.connection_id}`} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={
                          query.model_type === 'openai' ? 'OpenAI' : 
                          query.model_type === 'deepseek' ? 'DeepSeek' : 
                          query.model_type === 'claude' ? 'Claude 3' : 
                          query.model_type || 'Direct SQL'
                        } 
                        size="small" 
                        color={
                          query.model_type === 'openai' ? 'primary' : 
                          query.model_type === 'deepseek' ? 'secondary' : 
                          query.model_type === 'claude' ? 'success' : 
                          'default'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatTimestamp(query.created_at)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip 
                          label={query.is_successful ? 'Success' : 'Failed'} 
                          color={query.is_successful ? 'success' : 'error'}
                          size="small"
                        />
                        {!query.is_successful && !query.credit_consumed && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            No credits consumed
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDetails(query)}
                          title="View Details"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyQuery(query.generated_sql)}
                          title="Copy SQL"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClick(query)}
                          title="Delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                {queries.length > 0 ? 
                  `${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, page * rowsPerPage + queries.length)} of ${totalCount || queries.length}` : 
                  'No results'
                }
              </Typography>
              
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <InputLabel id="rows-per-page-label">Rows</InputLabel>
                <Select
                  labelId="rows-per-page-label"
                  value={rowsPerPage}
                  label="Rows"
                  onChange={handleChangeRowsPerPage}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box>
              <IconButton 
                onClick={() => handleChangePage(null, Math.max(0, page - 1))}
                disabled={page === 0}
                size="small"
              >
                <NavigateBeforeIcon />
              </IconButton>
              <IconButton 
                onClick={() => {
                  // Only go to next page if we have a full page of results (indicating there might be more)
                  if (queries.length >= rowsPerPage) {
                    handleChangePage(null, page + 1);
                  }
                }}
                disabled={!queries.length || queries.length < rowsPerPage || (totalCount && (page + 1) * rowsPerPage >= totalCount)}
                size="small"
              >
                <NavigateNextIcon />
              </IconButton>
            </Box>
          </Box>
        </TableContainer>
      </Box>
      
      {/* Query Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedQuery && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Query Details</Typography>
                <Box>
                  <IconButton 
                    size="small"
                    onClick={() => handleToggleFavorite(selectedQuery.id)}
                    sx={{ mr: 1 }}
                    disabled={actionLoading === selectedQuery.id}
                  >
                    {actionLoading === selectedQuery.id ? (
                      <CircularProgress size={20} />
                    ) : selectedQuery.is_favorite ? (
                      <StarIcon color="warning" />
                    ) : (
                      <StarBorderIcon />
                    )}
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={() => handleDeleteClick(selectedQuery)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Natural Language Query
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedQuery.natural_language_query}
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip 
                    label={`Database: ${selectedQuery.connection_name}`} 
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    label={`Model: ${
                      selectedQuery.model_type === 'openai' ? 'OpenAI' : 
                      selectedQuery.model_type === 'deepseek' ? 'DeepSeek' : 
                      selectedQuery.model_type === 'claude' ? 'Claude 3' : 
                      selectedQuery.model_type || 'Direct SQL'
                    }`} 
                    size="small" 
                    color={
                      selectedQuery.model_type === 'openai' ? 'primary' : 
                      selectedQuery.model_type === 'deepseek' ? 'secondary' : 
                      selectedQuery.model_type === 'claude' ? 'success' : 
                      'default'
                    }
                    variant="outlined"
                  />
                  <Chip 
                    label={selectedQuery.is_successful ? 'Success' : 'Failed'} 
                    color={selectedQuery.is_successful ? 'success' : 'error'}
                    size="small"
                  />
                  {!selectedQuery.is_successful && !selectedQuery.credit_consumed && (
                    <Chip 
                      label="No credit consumed" 
                      color="default"
                      size="small"
                      variant="outlined"
                    />
                  )}
                  <Chip 
                    label={`Created: ${formatTimestamp(selectedQuery.created_at)}`} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
              </Box>
              
              {!selectedQuery.is_successful && selectedQuery.error_message && (
                <Alert 
                  severity="error" 
                  sx={{ mb: 3 }}
                  action={
                    !selectedQuery.credit_consumed && (
                      <Chip 
                        label="No credits consumed" 
                        size="small" 
                        color="default"
                        sx={{ fontWeight: 'bold' }}
                      />
                    )
                  }
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Failed to generate SQL query
                  </Typography>
                  <Typography variant="body2">
                    {selectedQuery.error_message}
                  </Typography>
                </Alert>
              )}
              
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Generated SQL
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ position: 'relative', mb: 3 }}
              >
                {selectedQuery.generated_sql ? (
                  <>
                    <SyntaxHighlighter
                      language="sql"
                      style={dracula}
                      customStyle={{
                        margin: 0,
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      {selectedQuery.generated_sql}
                    </SyntaxHighlighter>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleCopyQuery(selectedQuery.generated_sql)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        opacity: 0.8
                      }}
                    >
                      Copy
                    </Button>
                  </>
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No SQL query was generated
                    </Typography>
                  </Box>
                )}
              </Paper>
              
              {selectedQuery.execution_results && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Execution Results
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    {selectedQuery.is_successful ? (
                      <Box sx={{ overflowX: 'auto' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {selectedQuery.execution_results.row_count} rows returned
                        </Typography>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {selectedQuery.execution_results.columns.map((column, index) => (
                                <th 
                                  key={index}
                                  style={{ 
                                    padding: '8px 16px', 
                                    textAlign: 'left', 
                                    borderBottom: '2px solid #eee',
                                    fontWeight: 600
                                  }}
                                >
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedQuery.execution_results.rows.slice(0, 5).map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <td 
                                    key={cellIndex}
                                    style={{ 
                                      padding: '8px 16px', 
                                      borderBottom: '1px solid #eee'
                                    }}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {selectedQuery.execution_results.rows.length > 5 && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                            Showing 5 of {selectedQuery.execution_results.rows.length} rows
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Alert severity="error">
                        {selectedQuery.execution_results.error || 'Query execution failed'}
                      </Alert>
                    )}
                  </Paper>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button 
                component={RouterLink}
                to={`/generate?query=${selectedQuery.id}`}
                startIcon={<PlayArrowIcon />}
              >
                Run Again
              </Button>
              <Button onClick={handleCloseDetails}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>
          Delete Query
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this query? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HistoryPage;
