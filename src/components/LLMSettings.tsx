import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Key, Eye, EyeOff, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { llmConfigManager, type LLMSettings } from '@/lib/llmConfig';
import { llmOCRService } from '@/lib/llmOCR';

export function LLMSettings() {
  const [settings, setSettings] = useState<LLMSettings>(llmConfigManager.getSettings());
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(llmConfigManager.getSettings());
  }, []);

  const handleProviderChange = (provider: 'gemini' | 'azure-openai') => {
    const newSettings = { ...settings, currentProvider: provider };
    setSettings(newSettings);
    llmConfigManager.setCurrentProvider(provider);
  };

  const handleGeminiConfigChange = (field: keyof LLMSettings['gemini'], value: string) => {
    const newSettings = {
      ...settings,
      gemini: { ...settings.gemini, [field]: value }
    };
    setSettings(newSettings);
  };

  const handleAzureConfigChange = (field: keyof LLMSettings['azureOpenAI'], value: string) => {
    const newSettings = {
      ...settings,
      azureOpenAI: { ...settings.azureOpenAI, [field]: value }
    };
    setSettings(newSettings);
  };

  const handleCloudinaryConfigChange = (field: keyof LLMSettings['cloudinary'], value: string) => {
    const newSettings = {
      ...settings,
      cloudinary: { ...settings.cloudinary, [field]: value }
    };
    setSettings(newSettings);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      llmConfigManager.updateSettings(settings);
      setTestResult({ success: true, message: 'Settings saved successfully!' });
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await llmOCRService.testConnection();
      
      if (result.success) {
        setTestResult({ 
          success: true, 
          message: 'Connection test successful! LLM is working correctly. You can now use AI-powered image recognition.' 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: `Test failed: ${result.error}` 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isConfigured = llmConfigManager.isConfigured();
  const isCloudinaryConfigured = llmConfigManager.isCloudinaryConfigured();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
          <Settings className="h-6 w-6" />
          LLM Settings
        </h2>
        <p className="text-gray-600">Configure AI models for image-based question extraction</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isConfigured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-700 font-medium">LLM is properly configured</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700 font-medium">LLM configuration is incomplete</span>
                </>
              )}
            </div>
            
        <div className="flex items-center gap-2">
          {isCloudinaryConfigured ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700 font-medium">File storage is configured</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 font-medium">File storage configuration is incomplete</span>
            </>
          )}
        </div>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            {isConfigured && isCloudinaryConfigured
              ? 'You can now use AI-powered image recognition and cloud file storage.'
              : 'Please configure both LLM provider and file storage to enable all features.'
            }
          </p>
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>Choose which AI service to use for image recognition</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.currentProvider}
            onValueChange={handleProviderChange}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="gemini" id="gemini" />
              <Label htmlFor="gemini" className="flex-1">
                <div className="font-medium">Google Gemini</div>
                <div className="text-sm text-gray-500">Fast and efficient for text extraction</div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="azure-openai" id="azure-openai" />
              <Label htmlFor="azure-openai" className="flex-1">
                <div className="font-medium">Azure OpenAI (GPT-4o)</div>
                <div className="text-sm text-gray-500">Advanced reasoning and accuracy</div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Gemini Configuration */}
      {settings.currentProvider === 'gemini' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Gemini Configuration
            </CardTitle>
            <CardDescription>
              Configure your Google Gemini API settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="gemini-api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="gemini-api-key"
                  type={showApiKeys.gemini ? 'text' : 'password'}
                  value={settings.gemini.apiKey}
                  onChange={(e) => handleGeminiConfigChange('apiKey', e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleApiKeyVisibility('gemini')}
                >
                  {showApiKeys.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Get your API key from{' '}
                <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Google AI Studio
                </a>
              </p>
            </div>
            
            <div>
              <Label htmlFor="gemini-model">Model</Label>
              <Select
                value={settings.gemini.model}
                onValueChange={(value) => handleGeminiConfigChange('model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</SelectItem>
                  <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Accurate)</SelectItem>
                  <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro (Stable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Azure OpenAI Configuration */}
      {settings.currentProvider === 'azure-openai' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Azure OpenAI Configuration
            </CardTitle>
            <CardDescription>
              Configure your Azure OpenAI service settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="azure-api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="azure-api-key"
                  type={showApiKeys.azure ? 'text' : 'password'}
                  value={settings.azureOpenAI.apiKey}
                  onChange={(e) => handleAzureConfigChange('apiKey', e.target.value)}
                  placeholder="Enter your Azure OpenAI API key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleApiKeyVisibility('azure')}
                >
                  {showApiKeys.azure ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="azure-endpoint">Endpoint URL</Label>
              <Input
                id="azure-endpoint"
                value={settings.azureOpenAI.endpoint}
                onChange={(e) => handleAzureConfigChange('endpoint', e.target.value)}
                placeholder="https://your-resource.openai.azure.com/"
              />
            </div>
            
            <div>
              <Label htmlFor="azure-deployment">Deployment Name</Label>
              <Input
                id="azure-deployment"
                value={settings.azureOpenAI.deploymentName}
                onChange={(e) => handleAzureConfigChange('deploymentName', e.target.value)}
                placeholder="gpt-4o-deployment"
              />
            </div>
            
            <div>
              <Label htmlFor="azure-model">Model</Label>
              <Select
                value={settings.azureOpenAI.model}
                onValueChange={(value) => handleAzureConfigChange('model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Faster)</SelectItem>
                  <SelectItem value="gpt-4-vision-preview">GPT-4 Vision Preview</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cloudinary Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            File Storage Configuration
          </CardTitle>
          <CardDescription>
            Configure Cloudinary for cloud file storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cloudinary-cloud-name">Cloud Name</Label>
            <div className="relative">
              <Input
                id="cloudinary-cloud-name"
                type={showApiKeys.cloudinary ? 'text' : 'password'}
                value={settings.cloudinary.cloudName}
                onChange={(e) => handleCloudinaryConfigChange('cloudName', e.target.value)}
                placeholder="Enter your Cloudinary cloud name"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleApiKeyVisibility('cloudinary')}
              >
                {showApiKeys.cloudinary ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="cloudinary-upload-preset">Upload Preset</Label>
            <div className="relative">
              <Input
                id="cloudinary-upload-preset"
                type={showApiKeys.cloudinaryPreset ? 'text' : 'password'}
                value={settings.cloudinary.uploadPreset}
                onChange={(e) => handleCloudinaryConfigChange('uploadPreset', e.target.value)}
                placeholder="Enter your Cloudinary upload preset"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleApiKeyVisibility('cloudinaryPreset')}
              >
                {showApiKeys.cloudinaryPreset ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Get your settings from{' '}
              <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Cloudinary Console
              </a>
            </p>
          </div>
          
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">ℹ️ Setup Instructions</p>
            <p>1. Create a Cloudinary account and get your Cloud Name</p>
            <p>2. Create an unsigned upload preset in your Cloudinary console</p>
            <p>3. Set the preset to "Unsigned" for client-side uploads</p>
          </div>
        </CardContent>
      </Card>

      {/* Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Connection
          </CardTitle>
          <CardDescription>
            Test your LLM configuration and API connectivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || !isConfigured}
              className="w-full"
            >
              {isTesting ? 'Testing...' : 'Test LLM Connection'}
            </Button>
            
            {!isCloudinaryConfigured && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="font-medium mb-1">⚠️ File Storage Not Configured</p>
                <p>Please configure Cloudinary settings above to enable file uploads and cloud storage.</p>
              </div>
            )}
            
            {testResult && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testResult.success 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
            
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p className="font-medium mb-1">💡 How to use AI image recognition:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Go to the "Simulations" tab to upload question images</li>
                <li>Use the "Upload Form" to process multiple question images</li>
                <li>Use "Answer Sheet Upload" to extract answer keys</li>
                <li>In the Question Builder, upload an image and click "Extract & Overwrite from Image"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex gap-4">
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            llmConfigManager.resetSettings();
            setSettings(llmConfigManager.getSettings());
          }}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
