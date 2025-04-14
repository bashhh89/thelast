'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/core/supabase/client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Plus, Loader2, RefreshCw } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from '@/features/auth/store/auth-store';

const PROVIDER_BASE_URLS = {
  openai: {
    name: 'OpenAI',
    base_url: 'https://api.openai.com/v1'
  },
  anthropic: {
    name: 'Anthropic',
    base_url: 'https://api.anthropic.com/v1'
  },
  google: {
    name: 'Google AI',
    base_url: 'https://generativelanguage.googleapis.com/v1beta'
  },
  mistral: {
    name: 'Mistral AI',
    base_url: 'https://api.mistral.ai/v1'
  },
  groq: {
    name: 'Groq',
    base_url: 'https://api.groq.com/openai/v1'
  },
  pollinations: {
    name: 'Pollinations AI',
    base_url: 'https://text.pollinations.ai/openai'
  },
  openrouter: {
    name: 'OpenRouter',
    base_url: 'https://openrouter.ai/api/v1'
  },
  hypobolic: {
    name: 'Hypobolic AI',
    base_url: 'https://api.hyperbolic.xyz/v1'
  },
  deepseek: {
    name: 'DeepSeek AI',
    base_url: 'https://api.deepseek.com/v1'
  },
  custom: {
    name: 'Custom',
    base_url: ''
  }
};

type ProviderType = keyof typeof PROVIDER_BASE_URLS;
type BaseProviderType = Exclude<ProviderType, 'custom'>;

interface Endpoint {
  id: string;
  name: string;
  provider: ProviderType;
  base_url: string;
  api_key: string;
  enabled: boolean;
  models: {
  id: string;
  name: string;
  enabled: boolean;
  }[];
}

interface AddEndpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEndpointAdded: () => void;
}

function AddEndpointDialog({ open, onOpenChange, onEndpointAdded }: AddEndpointDialogProps) {
  const [providerType, setProviderType] = useState<ProviderType>('openai');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState<string>(PROVIDER_BASE_URLS.openai.base_url);
  const [apiKey, setApiKey] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const supabase = createClient();
  const { user } = useAuthStore();

  useEffect(() => {
    if (providerType === 'custom') {
      setBaseUrl('');
    } else {
      setBaseUrl(PROVIDER_BASE_URLS[providerType as BaseProviderType].base_url);
    }
    setAvailableModels([]);
    setSelectedModels([]);
    setModelError(null);
    setModelSearchQuery('');
  }, [providerType]);

  useEffect(() => {
    if (open) {
      const initialProvider: ProviderType = 'openai';
      setProviderType(initialProvider);
      setName('');
      setApiKey('');
      setSelectedModels([]);
      setError(null);
      setModelError(null);
      setModelSearchQuery('');
      setAvailableModels([]);
      setBaseUrl(PROVIDER_BASE_URLS[initialProvider].base_url);
    }
  }, [open]);

  const filteredModels = useMemo(() => {
    if (!modelSearchQuery) return availableModels;
    return availableModels.filter((model: string) =>
      model.toLowerCase().includes(modelSearchQuery.toLowerCase())
    );
  }, [availableModels, modelSearchQuery]);

  const fetchAvailableModels = async () => {
    if (providerType !== 'custom' && !apiKey) { 
      setModelError('API Key is required to fetch models.');
      return;
    }
    if (providerType === 'custom' && !baseUrl) {
        setModelError('Base URL is required to fetch custom models.');
        return;
    }

    setIsLoadingModels(true);
    setModelError(null);
    setAvailableModels([]);
    setSelectedModels([]);

    const currentBaseUrl = providerType === 'custom' ? baseUrl : PROVIDER_BASE_URLS[providerType as BaseProviderType]?.base_url || '';

    try {
      const response = await fetch('/api/admin/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerType,
          api_key: apiKey, 
          base_url: currentBaseUrl
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || result.message || `Failed with status ${response.status}`);
      }

      if (!Array.isArray(result.models)) {
         throw new Error('Invalid response format: "models" array missing or invalid.');
      }
      
      const fetchedModelIds = result.models.filter((m: any): m is string => typeof m === 'string' && m.length > 0);
      setAvailableModels(fetchedModelIds);

      if (fetchedModelIds.length === 0) {
         setModelError("Provider connection successful, but no models were found/extracted.");
      } else {
         setModelError(null);
      }

    } catch (error) {
      console.error('Error fetching available models:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch models';
      setModelError(message);
      toast.error(`Failed to fetch models: ${message}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSubmit = async function(this: void, e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!name) {
        setError("Name is required.");
        setIsLoading(false);
        return;
    }
    if (providerType === 'custom' && !baseUrl) {
        setError("Base URL is required for custom provider.");
        setIsLoading(false);
        return;
    }
     if (providerType !== 'custom' && !apiKey) {
        setError("API Key is required for this provider.");
        setIsLoading(false);
      return;
    }
    if (providerType !== 'custom' && availableModels.length > 0 && selectedModels.length === 0) {
      setError("Please select at least one model to enable.");
      setIsLoading(false);
      return;
    }

    const finalBaseUrl = providerType === 'custom' ? baseUrl : PROVIDER_BASE_URLS[providerType as BaseProviderType].base_url;

    try {
       const { data: { user }, error: userError } = await supabase.auth.getUser();
       if (userError || !user) {
         throw new Error('Authentication error. Please log in again.');
       }

      const endpointData = {
        name,
        type: providerType,
        base_url: finalBaseUrl,
        api_key: apiKey,
        api_key_env_var: '',
        enabled: true,
        owner_id: user.id,
      };

       const { data: newEndpoint, error: insertError } = await supabase
         .from('ai_endpoints')
         .insert(endpointData)
         .select('id')
         .single();

       if (insertError) {
         console.error("Error inserting endpoint:", insertError);
         throw new Error(insertError.message || "Failed to create endpoint or get ID.");
       }

       if (!newEndpoint) {
         throw new Error("Failed to create endpoint record.");
       }

       const newEndpointId = newEndpoint.id;
       console.log('Endpoint created with ID:', newEndpointId);

       if (providerType !== 'custom' && selectedModels.length > 0) {
          const modelsToInsert = selectedModels.map((modelId) => ({
            endpoint_id: newEndpointId,
            model_id: modelId,
            model_name: modelId,
            enabled: true
          }));

          console.log(`Inserting ${modelsToInsert.length} selected models for endpoint ${newEndpointId}...`);

          const { error: insertModelsError } = await supabase
            .from('ai_endpoint_models')
            .insert(modelsToInsert);

          if (insertModelsError) {
            console.error(`Error inserting selected models for endpoint ${newEndpointId}:`, insertModelsError);
            toast.error(`Endpoint created, but failed to save selected models: ${insertModelsError.message}`);
          } else {
             toast.success(`Provider '${name}' added successfully with ${selectedModels.length} model(s) enabled.`);
          }
       } else if (providerType === 'custom') {
           toast.success(`Custom provider '${name}' added successfully. Add models manually.`);
       } else {
           toast.success(`Provider '${name}' added successfully. Refresh models via table if needed.`);
       }

      onEndpointAdded();
      onOpenChange(false);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New AI Provider</DialogTitle>
          <DialogDescription>
            Configure a new AI provider endpoint. Enter API key (if required) and fetch models.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="My OpenAI Endpoint" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">Provider</Label>
              <Select value={providerType} onValueChange={(value: ProviderType) => setProviderType(value)}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a provider" /></SelectTrigger>
                  <SelectContent>
                  {Object.entries(PROVIDER_BASE_URLS).map(([key, provider]) => (
                    <SelectItem key={key} value={key}>{provider.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            {providerType === 'custom' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="baseUrl" className="text-right">Base URL</Label>
                <Input id="baseUrl" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="col-span-3" placeholder="https://api.example.com/v1" required={providerType === 'custom'} />
                </div>
              )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">API Key</Label>
              <Input 
                id="apiKey"
                type="password"
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                className="col-span-3" 
                required={providerType !== 'custom'} 
                placeholder={providerType === 'custom' ? "Optional" : "Required (Paste actual key)"}
              />
            </div>
            {providerType !== 'custom' && (
               <div className="grid grid-cols-4 items-center gap-4">
                 <div></div>
                 <div className="col-span-3 flex items-center gap-2 flex-wrap">
                   <Button type="button" onClick={fetchAvailableModels} disabled={isLoadingModels || !apiKey} size="sm">
                     {isLoadingModels && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Fetch Available Models
                  </Button>
                   {modelError && !isLoadingModels && <span className="text-xs text-red-500">Error: {modelError}</span>}
              </div>
            </div>
          )}

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                {providerType === 'custom' ? 'Models (Manual)' : 'Available Models'}
              </Label>
              <div className="col-span-3">
                {providerType !== 'custom' && (
                    <>
                      {isLoadingModels && (
                          <div className="flex items-center justify-center p-4 text-muted-foreground">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading models...
                        </div>
                      )}
                      {!isLoadingModels && availableModels.length === 0 && !modelError && (
                          <p className="text-sm text-muted-foreground p-2">
                              {apiKey ? 'Click "Fetch Available Models".' : 'Enter API Key and click "Fetch Available Models".'}
                          </p>
                      )}
                       {!isLoadingModels && availableModels.length === 0 && modelError && modelError !== "Model fetching during creation is not supported by this button yet. Add provider first, then manage models." && (
                           <p className="text-sm text-red-500 p-2">Could not fetch models. Check API key/URL and try again.</p>
                       )}
                    </>
                )}

                {!isLoadingModels && availableModels.length > 0 && providerType !== 'custom' && (
                  <>
                    <Input
                      type="text"
                      placeholder="Search fetched models..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="mb-2"
                      disabled={availableModels.length === 0}
                    />
                    <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                      {filteredModels.length > 0 ? (
                         filteredModels.map((model) => (
                           <div key={model} className="flex items-center space-x-2 py-1">
                             <Checkbox
                               id={model}
                               checked={selectedModels.includes(model)}
                          onCheckedChange={(checked) => {
                                 setSelectedModels(
                                   checked
                                     ? [...selectedModels, model]
                                     : selectedModels.filter((m) => m !== model)
                            );
                          }}
                        />
                             <label htmlFor={model} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                               {model}
                             </label>
                      </div>
                         ))
                      ) : (
                         <p className="text-sm text-muted-foreground p-2">
                           No models found matching your search.
                         </p>
                      )}
                  </div>
                  </>
                )}

                {providerType === 'custom' && (
                   <p className="text-sm text-muted-foreground p-2">Models for custom providers must be added manually after the endpoint is created using the main table's model management features.</p>
                )}
                </div>
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
             <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Adding...' : 'Add Provider'}
              </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState<string | null>(null);
  const supabase = createClient();
  const { user } = useAuthStore();

  const fetchEndpoints = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: endpointsData, error: fetchEndpointsError } = await supabase
        .from('ai_endpoints')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchEndpointsError) throw fetchEndpointsError;
      if (!endpointsData) throw new Error("No endpoint data returned");

      const endpointIds = endpointsData.map(ep => ep.id);
      let modelsData: any[] = [];
      if (endpointIds.length > 0) {
          const { data: fetchedModelsData, error: fetchModelsError } = await supabase
            .from('ai_endpoint_models')
            .select('*')
            .in('endpoint_id', endpointIds);

          if (fetchModelsError) throw fetchModelsError;
          modelsData = fetchedModelsData || [];
      }

      const formattedEndpoints: Endpoint[] = endpointsData.map(endpoint => {
         const endpointModels = modelsData
           .filter(model => model.endpoint_id === endpoint.id)
           .map(model => ({
             id: model.model_id,
             name: model.model_name || model.model_id,
             enabled: model.enabled
           }));

         const providerType = endpoint.type as ProviderType;
         if (!(providerType in PROVIDER_BASE_URLS)) {
             console.warn(`Endpoint ${endpoint.id} has invalid provider type: ${endpoint.type}. Treating as custom.`);
         }
          
          return {
           id: endpoint.id,
           name: endpoint.name,
           provider: (providerType in PROVIDER_BASE_URLS) ? providerType : 'custom',
           base_url: endpoint.base_url || '',
           api_key: endpoint.api_key || '******',
           enabled: endpoint.enabled,
           models: endpointModels
         };
      });

      setEndpoints(formattedEndpoints);
    } catch (error) {
      console.error('Error fetching endpoints:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch endpoints');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleDelete = async (endpointId: string) => {
    if (!confirm('Are you sure you want to delete this endpoint and all its models?')) {
      return;
    }
    setIsLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('ai_endpoints')
        .delete()
        .eq('id', endpointId);

      if (deleteError) throw deleteError;

      toast.success('Endpoint deleted successfully');
      fetchEndpoints();
    } catch (err: any) {
      console.error('Error deleting endpoint:', err);
      toast.error(err.message || "Failed to delete endpoint.");
      setIsLoading(false);
    }
  };

  const handleToggleModel = async (endpointId: string, modelId: string, currentEnabledStatus: boolean) => {
    const newEnabledStatus = !currentEnabledStatus;
    try {
      const { error: updateError } = await supabase
        .from('ai_endpoint_models')
        .update({ enabled: newEnabledStatus })
        .eq('endpoint_id', endpointId)
        .eq('model_id', modelId);

      if (updateError) throw updateError;

      toast.success(`Model ${newEnabledStatus ? 'enabled' : 'disabled'} successfully`);
      setEndpoints(prevEndpoints =>
           prevEndpoints.map(ep =>
               ep.id === endpointId
                   ? {
                       ...ep,
                       models: ep.models.map(m =>
                           m.id === modelId ? { ...m, enabled: newEnabledStatus } : m
                       ),
                   }
                   : ep
           )
       );
    } catch (err: any) {
      console.error('Error updating model status:', err);
      toast.error(err.message || "Failed to update model status.");
    }
  };

  const handleToggleEndpoint = async (endpointId: string, currentEnabledStatus: boolean) => {
    const newEnabledStatus = !currentEnabledStatus;
    try {
      const { error: updateError } = await supabase
        .from('ai_endpoints')
        .update({ enabled: newEnabledStatus })
        .eq('id', endpointId);

      if (updateError) throw updateError;

      toast.success(`Provider ${newEnabledStatus ? 'enabled' : 'disabled'} successfully`);
      setEndpoints(prevEndpoints =>
          prevEndpoints.map(ep =>
              ep.id === endpointId ? { ...ep, enabled: newEnabledStatus } : ep
          )
      );
    } catch (err: any) {
      console.error('Error updating endpoint status:', err);
      toast.error(err.message || "Failed to update endpoint status.");
    }
  };

  const handleRefreshModels = async (endpointId: string) => {
    if (!endpointId) return;
    setIsRefreshingModels(endpointId);
    toast.info(`Attempting to refresh models for endpoint ${endpointId}...`);

    try {
      const response = await fetch(`/api/admin/endpoints/${endpointId}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed with status ${response.status}`);
      }

      toast.success(result.message || `Models refreshed successfully! Found: ${result.models_found ?? 'N/A'}`);
    } catch (error) {
      console.error(`Error refreshing models for endpoint ${endpointId}:`, error);
      toast.error(`Failed to refresh models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRefreshingModels(null);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> <span className="ml-3">Loading endpoints...</span></div>;
  if (error && endpoints.length === 0) return <Alert variant="destructive"><AlertDescription>Error loading endpoints: {error}</AlertDescription></Alert>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">AI Providers</h1>
          <p className="text-muted-foreground">
            Configure AI providers, manage API keys, and select available models.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Provider
        </Button>
      </div>

      {error && endpoints.length > 0 && (
          <Alert variant="destructive" className="mb-4">
              <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}

        <Table>
      <TableCaption>A list of your configured AI providers.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Models</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
        {endpoints.length === 0 && !isLoading ? (
              <TableRow>
            <TableCell colSpan={5} className="text-center h-24">
              No providers configured yet.
                <Button variant="link" onClick={() => setIsAddDialogOpen(true)} className="ml-1 p-0 h-auto">Add your first provider</Button>
                </TableCell>
              </TableRow>
        ) : (
          endpoints.map((endpoint) => (
            <TableRow key={endpoint.id}>
              <TableCell className="font-medium">{endpoint.name}</TableCell>
              <TableCell>
                 {PROVIDER_BASE_URLS[endpoint.provider]?.name || endpoint.provider}
              </TableCell>
              <TableCell>
                {endpoint.models.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {endpoint.models.map((model) => (
                        <Badge
                          key={model.id}
                          variant={model.enabled ? "secondary" : "outline"}
                          className="cursor-pointer whitespace-nowrap hover:bg-muted/50"
                          title={`Click to ${model.enabled ? 'disable' : 'enable'} ${model.name}`}
                          onClick={() => handleToggleModel(endpoint.id, model.id, model.enabled)}
                        >
                          {model.name}
                        </Badge>
                      ))}
                    </div>
                ) : (
                   <span className="text-xs text-muted-foreground">No models added</span>
                )}
              </TableCell>
                  <TableCell>
                <Switch
                  checked={endpoint.enabled}
                  onCheckedChange={() => handleToggleEndpoint(endpoint.id, endpoint.enabled)}
                  aria-label={`Toggle endpoint ${endpoint.name}`}
                />
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleRefreshModels(endpoint.id)}
                  disabled={isRefreshingModels === endpoint.id}
                  title="Refresh Available Models"
                >
                  {isRefreshingModels === endpoint.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(endpoint.id)}
                  title={`Delete provider ${endpoint.name}`}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
          </TableBody>
        </Table>

      <AddEndpointDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onEndpointAdded={() => {
            fetchEndpoints();
            setIsAddDialogOpen(false);
        }}
      />
    </div>
  );
} 