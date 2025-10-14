import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';

const ComponentTestPage = () => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [testResults, setTestResults] = useState({});

  // Sample data for testing
  const countries = [
    { value: 'US', label: 'United States' },
    { value: 'CA', label: 'Canada' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'AU', label: 'Australia' },
  ];

  const states = [
    { value: 'CA', label: 'California' },
    { value: 'NY', label: 'New York' },
    { value: 'TX', label: 'Texas' },
    { value: 'FL', label: 'Florida' },
  ];

  const cities = [
    { value: 'LA', label: 'Los Angeles' },
    { value: 'SF', label: 'San Francisco' },
    { value: 'SD', label: 'San Diego' },
    { value: 'SJ', label: 'San Jose' },
  ];

  const testComponent = (componentName, testFn) => {
    try {
      const result = testFn();
      setTestResults(prev => ({
        ...prev,
        [componentName]: { status: 'success', message: result }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [componentName]: { status: 'error', message: error.message }
      }));
    }
  };

  const runAllTests = () => {
    setTestResults({});
    
    // Test Combobox functionality
    testComponent('Combobox Click', () => {
      if (selectedCountry) {
        return 'Country selection working';
      }
      throw new Error('No country selected');
    });

    testComponent('Combobox State Chain', () => {
      if (selectedCountry && selectedState) {
        return 'State selection working after country';
      }
      throw new Error('State not selected after country');
    });

    testComponent('Combobox City Chain', () => {
      if (selectedCountry && selectedState && selectedCity) {
        return 'City selection working after state';
      }
      throw new Error('City not selected after state');
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-teal" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-teal/20 text-teal">PASS</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-500">FAIL</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-500">PENDING</Badge>;
    }
  };

  return (
    <PageWrapper title="Component Test Page" description="Test all clickable components for proper visual feedback">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-lightest-slate mb-4">Component Test Page</h1>
          <p className="text-slate">Test all clickable components to ensure proper visual feedback and functionality</p>
        </div>

        {/* Test Controls */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lightest-slate flex items-center gap-2">
              <Info className="h-5 w-5 text-teal" />
              Test Controls
            </CardTitle>
            <CardDescription>
              Use the components below to test clickable functionality, then run tests to verify everything works.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runAllTests}
              className="bg-teal text-deep-navy hover:bg-teal/90"
            >
              Run All Tests
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-lightest-slate mb-2">
                  Country Selection
                </label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Country..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {countries.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-lightest-slate mb-2">
                  State Selection
                </label>
                <Select value={selectedState} onValueChange={setSelectedState} disabled={!selectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select State..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {states.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-lightest-slate mb-2">
                  City Selection
                </label>
                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select City..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {cities.map((city) => (
                      <SelectItem key={city.value} value={city.value}>
                        {city.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lightest-slate">Test Results</CardTitle>
            <CardDescription>
              Results of component functionality tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(testResults).length === 0 ? (
              <p className="text-slate text-center py-8">No tests run yet. Click "Run All Tests" to start testing.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(testResults).map(([testName, result]) => (
                  <div key={testName} className="flex items-center justify-between p-3 bg-deep-navy/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <span className="text-lightest-slate font-medium">{testName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate text-sm">{result.message}</span>
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual Feedback Guide */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lightest-slate">Visual Feedback Guide</CardTitle>
            <CardDescription>
              What to look for when testing clickable components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-lightest-slate font-semibold">Combobox Components:</h4>
                <ul className="text-slate text-sm space-y-1">
                  <li>• Hover: Green background tint and border</li>
                  <li>• Click: Slight scale down effect</li>
                  <li>• Focus: Green ring around component</li>
                  <li>• Selected: Green background and checkmark</li>
                  <li>• Disabled: Reduced opacity and no cursor</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-lightest-slate font-semibold">Button Components:</h4>
                <ul className="text-slate text-sm space-y-1">
                  <li>• Hover: Background color change</li>
                  <li>• Click: Scale down effect</li>
                  <li>• Focus: Ring around button</li>
                  <li>• Disabled: Reduced opacity</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Selections */}
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lightest-slate">Current Selections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-deep-navy/30 rounded-lg">
                <p className="text-slate text-sm">Country</p>
                <p className="text-lightest-slate font-semibold">
                  {selectedCountry || 'None selected'}
                </p>
              </div>
              <div className="text-center p-4 bg-deep-navy/30 rounded-lg">
                <p className="text-slate text-sm">State</p>
                <p className="text-lightest-slate font-semibold">
                  {selectedState || 'None selected'}
                </p>
              </div>
              <div className="text-center p-4 bg-deep-navy/30 rounded-lg">
                <p className="text-slate text-sm">City</p>
                <p className="text-lightest-slate font-semibold">
                  {selectedCity || 'None selected'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default ComponentTestPage;
