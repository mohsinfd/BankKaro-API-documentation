import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { environments, getEnvironmentUrl } from '../config/environments';
import mockApiServer from '../utils/mockApiServer';

const ApiSandbox = ({ api }) => {
  const [selectedMethod, setSelectedMethod] = useState('POST');
  const [selectedEnvironment, setSelectedEnvironment] = useState('uat');
  const [requestData, setRequestData] = useState({});
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [partnerToken, setPartnerToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const theme = useTheme();

  // Function to fetch partner token
  const fetchPartnerToken = async () => {
    setTokenLoading(true);
    setTokenError(null);
    
    try {
      // For local development, use mock token to avoid CORS issues
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock successful response
        setPartnerToken('mock_partner_token_for_local_development');
        setTokenError(null);
        return;
      }
      
      const baseUrl = getEnvironmentUrl(selectedEnvironment, false);
      
      // Use CORS proxy for production environments to bypass CORS restrictions
      const isProduction = selectedEnvironment === 'production' || selectedEnvironment === 'uat';
      const proxyUrl = isProduction ? 'https://cors-anywhere.herokuapp.com/' : '';
      const targetUrl = `${baseUrl}/partner/token`;
      
      const response = await fetch(`${proxyUrl}${targetUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isProduction && { 'Origin': window.location.origin })
        },
        body: JSON.stringify({
          'x-api-key': 'test'
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data?.jwttoken) {
        setPartnerToken(data.data.jwttoken);
        setTokenError(null);
      } else {
        setTokenError('Failed to get partner token: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching partner token:', err);
      setTokenError('Error fetching partner token: ' + err.message);
    } finally {
      setTokenLoading(false);
    }
  };

  // Test data for dropdown options
  const testData = {
    cards: [
      { id: 1, name: 'SBI Cashback Credit Card', bank: 'SBI' },
      { id: 2, name: 'HDFC Regalia Credit Card', bank: 'HDFC' },
      { id: 3, name: 'ICICI Platinum Chip Credit Card', bank: 'ICICI' }
    ],
    banks: [
      { id: 1, name: 'SBI', type: 'Public' },
      { id: 2, name: 'HDFC Bank', type: 'Private' },
      { id: 3, name: 'ICICI Bank', type: 'Private' }
    ],
    users: [
      { name: 'John Doe', mobile: '9876543210' },
      { name: 'Jane Smith', mobile: '9876543211' },
      { name: 'Bob Johnson', mobile: '9876543212' }
    ],
    loans: [
      { id: 1, type: 'Personal Loan', amount: '500000' },
      { id: 2, type: 'Home Loan', amount: '5000000' },
      { id: 3, type: 'Business Loan', amount: '1000000' }
    ]
  };

  const getTestDataOptions = (field) => {
    try {
      if (field.toLowerCase().includes('card')) {
        return testData.cards.map(card => ({
          value: card.id,
          label: `${card.name} (${card.bank})`
        }));
      } else if (field.toLowerCase().includes('bank')) {
        return testData.banks.map(bank => ({
          value: bank.id,
          label: `${bank.name} (${bank.type})`
        }));
      } else if (field.toLowerCase().includes('user') || field.toLowerCase().includes('mobile')) {
        return testData.users.map(user => ({
          value: user.mobile,
          label: `${user.name} (${user.mobile})`
        }));
      } else if (field.toLowerCase().includes('loan')) {
        return testData.loans.map(loan => ({
          value: loan.id,
          label: `${loan.type} - ${loan.amount}`
        }));
      }
    } catch (error) {
      console.warn('Error generating test data options:', error);
    }
    return [];
  };

  useEffect(() => {
    if (api) {
      setSelectedMethod(api.methods[0] || 'POST');
      initializeRequestData();
    }
  }, [api]);

  const initializeRequestData = () => {
    if (!api) return;

    const initialData = {};
    
    // Initialize with sample data based on API endpoint
    if (api.sampleRequest) {
      Object.keys(api.sampleRequest).forEach(key => {
        const value = api.sampleRequest[key];
        
        // Replace placeholder values with real test data
        if (typeof value === 'string') {
          if (value.includes('card')) {
            initialData[key] = testData.cards[0].id;
          } else if (value.includes('bank')) {
            initialData[key] = testData.banks[0].id;
          } else if (value.includes('user') || value.includes('mobile')) {
            initialData[key] = testData.users[0].mobile;
          } else if (value.includes('loan')) {
            initialData[key] = testData.loans[0].id;
          } else {
            initialData[key] = value;
          }
        } else {
          initialData[key] = value;
        }
      });
    }

    setRequestData(initialData);
  };

  const handleInputChange = (field, value) => {
    setRequestData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const makeApiCall = async () => {
    if (!api) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const baseUrl = getEnvironmentUrl(selectedEnvironment, api.endpoint?.startsWith('v1-'));
      const url = `${baseUrl}${api.endpoint}`;
      
      // Use partner token for Card Genius APIs, fallback to sandbox token
      const isCardGeniusApi = api.endpoint?.startsWith('/cardgenius') || api.endpoint?.startsWith('v1-');
      const authToken = isCardGeniusApi && partnerToken ? partnerToken : 'sandbox_token_12345';
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      };

      const options = {
        method: selectedMethod,
        headers,
        ...(selectedMethod !== 'GET' && { body: JSON.stringify(requestData) })
      };

      // For local development, use mock server to avoid CORS issues
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔄 Local development detected - using mock server to avoid CORS issues');
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Use mock server for local development
        const mockResponse = await mockApiServer.makeRequest(url, options);
        const mockData = await mockResponse.json();

        setResponse({
          status: mockResponse.status,
          statusText: mockResponse.statusText,
          headers: Object.fromEntries(mockResponse.headers.entries()),
          data: mockData
        });
        return;
      }

      // For production deployment, try real API first, fallback to mock if it fails
      let response;
      try {
        // Check if we're in a production environment and need CORS proxy
        const isProduction = selectedEnvironment === 'production' || selectedEnvironment === 'uat';
        const proxyUrl = isProduction ? 'https://cors-anywhere.herokuapp.com/' : '';
        const targetUrl = isProduction ? `${proxyUrl}${url}` : url;
        
        response = await fetch(targetUrl, {
          ...options,
          headers: {
            ...options.headers,
            ...(isProduction && { 'Origin': window.location.origin })
          }
        });
        
        const data = await response.json();

        setResponse({
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data
        });
      } catch (apiError) {
        console.warn('Real API failed (likely CORS), falling back to mock server:', apiError.message);
        
        // Fallback to mock server
        const mockResponse = await mockApiServer.makeRequest(url, options);
        const mockData = await mockResponse.json();

        setResponse({
          status: mockResponse.status,
          statusText: mockResponse.statusText,
          headers: Object.fromEntries(mockResponse.headers.entries()),
          data: mockData
        });
        
        // Show warning about CORS
        setError('⚠️ CORS Error: Real API call blocked. Using mock data instead. For production use, consider using a backend proxy or server-side API calls.');
      }
    } catch (err) {
      setError('Error making API call: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCurlCommand = () => {
    if (!api) return '';

    const baseUrl = getEnvironmentUrl(selectedEnvironment, api.endpoint?.startsWith('v1-'));
    const url = `${baseUrl}${api.endpoint}`;
    
    // Use partner token for Card Genius APIs, fallback to sandbox token
    const isCardGeniusApi = api.endpoint?.startsWith('/cardgenius') || api.endpoint?.startsWith('v1-');
    const authToken = isCardGeniusApi && partnerToken ? partnerToken : 'sandbox_token_12345';
    
    let curl = `curl -X ${selectedMethod} "${url}" \\\n`;
    curl += `  -H "Content-Type: application/json" \\\n`;
    curl += `  -H "Authorization: Bearer ${authToken}"`;
    
    if (selectedMethod !== 'GET' && Object.keys(requestData).length > 0) {
      curl += ` \\\n  -d '${JSON.stringify(requestData, null, 2)}'`;
    }

    return curl;
  };

  const renderRequestForm = () => {
    if (!api) return null;

    const currentApiData = api.methods.length > 1 ? api[selectedMethod.toLowerCase()] : api;
    const requestSchema = currentApiData.requestSchema?.properties || {};

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Request Parameters
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(requestSchema).map(([field, schema]) => (
            <Grid item xs={12} sm={6} key={field}>
              <FormControl fullWidth>
                {getTestDataOptions(field).length > 0 ? (
                  <>
                    <InputLabel>{field}</InputLabel>
                    <Select
                      value={requestData[field] || ''}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      label={field}
                    >
                      {getTestDataOptions(field).map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </>
                ) : (
                  <TextField
                    label={field}
                    value={requestData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    fullWidth
                    helperText={schema.description}
                    required={schema.required}
                  />
                )}
              </FormControl>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderResponse = () => {
    if (!response) return null;

    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Response</Typography>
          <Chip 
            label={`${response.status} ${response.statusText}`}
            color={response.status >= 200 && response.status < 300 ? 'success' : 'error'}
            sx={{ ml: 2 }}
          />
        </Box>
        
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Response Headers</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                backgroundColor: '#f8fafc',
                p: 2,
                borderRadius: 1,
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            >
              {JSON.stringify(response.headers, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Response Body</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                backgroundColor: '#f8fafc',
                p: 2,
                borderRadius: 1,
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                maxHeight: 400,
                overflow: 'auto'
              }}
            >
              {JSON.stringify(response.data, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  if (!api) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Select an API endpoint to test it in the sandbox.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Development Mode Indicator */}
      {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>🔄 Local Development Mode:</strong> Using mock server to avoid CORS issues. 
            Real API calls will work when deployed to Vercel.
          </Typography>
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            API Sandbox
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={initializeRequestData}
          >
            Reset
          </Button>
        </Box>

        {/* Environment and Method Selection */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Environment</InputLabel>
              <Select
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                label="Environment"
              >
                <MenuItem value="uat">UAT</MenuItem>
                <MenuItem value="production">Production</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Method</InputLabel>
              <Select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                label="Method"
              >
                {api.methods.map(method => (
                  <MenuItem key={method} value={method}>{method}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Partner Token Management for Card Genius APIs */}
        {(api.endpoint?.startsWith('/cardgenius') || api.endpoint?.startsWith('v1-')) && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8fafc' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Partner Token Management
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Partner Token (JWT)"
                  value={partnerToken}
                  onChange={(e) => setPartnerToken(e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Click 'Get Token' to fetch from /partner/token API"
                  disabled={tokenLoading}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  onClick={fetchPartnerToken}
                  disabled={tokenLoading}
                  startIcon={tokenLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  fullWidth
                >
                  {tokenLoading ? 'Getting Token...' : 'Get Token'}
                </Button>
              </Grid>
            </Grid>
            {tokenError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {tokenError}
              </Alert>
            )}
            {partnerToken && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (
                  <>
                    <strong>🔄 Mock Token Generated:</strong> Using mock partner token for local development. 
                    Real token will be fetched when deployed to Vercel.
                  </>
                ) : (
                  'Partner token loaded successfully! This will be used for Card Genius API calls.'
                )}
              </Alert>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>CORS Note:</strong> If you encounter CORS errors, the sandbox will automatically fall back to mock data.
                <br />• For production use, consider using a backend proxy or server-side API calls
                <br />• The mock server provides realistic test data for development
              </Typography>
            </Alert>
          </Paper>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Request" icon={<SettingsIcon />} />
            <Tab label="cURL" icon={<CodeIcon />} />
            <Tab label="Response" icon={<DescriptionIcon />} />
          </Tabs>
        </Box>

        {/* Request Tab */}
        {activeTab === 0 && (
          <Box>
            {renderRequestForm()}
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                onClick={makeApiCall}
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test API'}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}

        {/* cURL Tab */}
        {activeTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">cURL Command</Typography>
              <Button
                startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={() => copyToClipboard(generateCurlCommand())}
                variant="outlined"
                size="small"
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Box>
            <Box
              component="pre"
              sx={{
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                p: 3,
                borderRadius: 2,
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                overflow: 'auto'
              }}
            >
              {generateCurlCommand()}
            </Box>
          </Box>
        )}

        {/* Response Tab */}
        {activeTab === 2 && (
          <Box>
            {response ? (
              renderResponse()
            ) : (
              <Alert severity="info">
                Make an API call to see the response here.
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Test Data Reference */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Available Test Data
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(testData).map(([category, items]) => (
            <Grid item xs={12} sm={6} md={3} key={category}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {category.charAt(0).toUpperCase() + category.slice(1)} ({items.length})
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {items.map((item, index) => (
                      <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                        • {item.name || item.type || item.id}
                      </Typography>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default ApiSandbox; 