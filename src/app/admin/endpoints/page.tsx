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
import { Trash2, Plus, Loader2 } from 'lucide-react';
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
  }
};

interface Provider {
  name: string;
  base_url: string;
}

type BaseProviderType = keyof typeof PROVIDER_BASE_URLS;
type ProviderType = BaseProviderType | 'custom';

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

const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo']
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-2.1']
  },
  google: {
    name: 'Google AI',
    models: ['gemini-pro', 'gemini-pro-vision']
  },
  mistral: {
    name: 'Mistral AI',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest']
  },
  groq: {
    name: 'Groq',
    models: ['mixtral-8x7b-32768', 'llama2-70b-4096']
  },
  pollinations: {
    name: 'Pollinations AI',
    models: [
      'openai', 'qwen-coder', 'llama', 'llamascout', 'mistral', 'unity',
      'midijourney', 'rtist', 'searchgpt', 'evil', 'deepseek-reasoning',
      'deepseek-reasoning-large', 'llamalight', 'phi', 'llama-vision',
      'pixtral', 'hormoz', 'hypnosis-tracy', 'mistral-roblox', 'roblox-rp',
      'sur', 'llama-scaleway', 'openai-audio'
    ]
  },
  custom: {
    name: 'Custom',
    models: []
  }
} as const;

function AddEndpointDialog({ open, onOpenChange, onEndpointAdded }: AddEndpointDialogProps) {
  const [providerType, setProviderType] = useState<ProviderType>('openai');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState<string>(PROVIDER_BASE_URLS.openai.base_url);
  const [apiKey, setApiKey] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const supabase = createClient();

  // Reset form state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setProviderType('openai');
      setName('');
      setApiKey('');
      setSelectedModels([]);
      setError(null);
      setModelSearchQuery('');
      setAvailableModels([]);
    }
  }, [open]);

  // Update base URL when provider changes
  useEffect(() => {
    if (providerType === 'custom') {
      setBaseUrl('');
    } else {
      setBaseUrl(PROVIDER_BASE_URLS[providerType as BaseProviderType].base_url);
    }
  }, [providerType]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    const models = providerType === 'custom' 
      ? availableModels 
      : PROVIDERS[providerType as keyof typeof PROVIDERS]?.models || [];
    
    if (!modelSearchQuery) return models;
    return models.filter((model: string) => 
      model.toLowerCase().includes(modelSearchQuery.toLowerCase())
    );
  }, [providerType, availableModels, modelSearchQuery]);

  const handleSubmit = async function(this: void, e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!name || !providerType) {
        throw new Error('Please fill in Name and select a Provider');
      }
      if (providerType !== 'pollinations' && !apiKey) {
           if(providerType === 'custom' && !baseUrl) {
           } else if (providerType !== 'custom') {
                throw new Error('API Key is required for this provider');
           }
      }
      if (providerType === 'custom' && !baseUrl) {
        throw new Error('Base URL is required for custom providers');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication error. Please log in again.');
      }

      let baseUrl = '';
      if (providerType === 'custom') {
        baseUrl = this.baseUrl;
      } else if (PROVIDER_BASE_URLS[providerType as keyof typeof PROVIDER_BASE_URLS]) {
        baseUrl = PROVIDER_BASE_URLS[providerType as keyof typeof PROVIDER_BASE_URLS].base_url;
      } else {
          throw new Error(`Invalid provider selected: ${providerType}`);
      }
      
      const { data: existingEndpoint, error: checkError } = await supabase
        .from('ai_endpoints')
        .select('id')
        .eq('name', name)
        .eq('owner_id', user.id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking for existing endpoint:', checkError);
      }
        
      if (existingEndpoint) {
        throw new Error(`An endpoint named "${name}" already exists. Please use a different name.`);
      }
        
      const endpointData = {
        name,
        type: providerType,
        base_url: baseUrl || '', 
        api_key: providerType === 'pollinations' ? '' : apiKey,
        api_key_env_var: providerType === 'pollinations' ? '' : apiKey,
        enabled: true,
        owner_id: user.id
      };
      
      console.log('Inserting endpoint with data:', { ...endpointData, api_key: '(redacted)' });
      
      const { data: endpoint, error: endpointError } = await supabase
        .from('ai_endpoints')
        .insert(endpointData)
        .select()
        .single();

      if (endpointError) {
        console.error('Error creating endpoint:', endpointError);
        const errorDetails = endpointError.code 
          ? `[${endpointError.code}] ${endpointError.message}` 
          : endpointError.message || 'Unknown database error';
        throw new Error(`Database error: ${errorDetails}`);
      }
      if (!endpoint) {
        throw new Error('No endpoint created. Please try again.');
      }
      console.log('Endpoint created successfully with ID:', endpoint.id);

      const modelsToInsert = selectedModels.map((model) => ({
        endpoint_id: endpoint.id,
        model_id: model,
        model_name: model,
        enabled: true
      }));

      if (modelsToInsert.length === 0) {
        console.log('No models selected, cleaning up endpoint');
        await supabase.from('ai_endpoints').delete().eq('id', endpoint.id);
        throw new Error('Please select at least one model');
      }

      console.log(`Adding ${modelsToInsert.length} models to endpoint ${endpoint.id}`);

      let successCount = 0;
      let failedModels = [];
      for (const modelData of modelsToInsert) {
        try {
          const { error: modelError } = await supabase
            .from('ai_endpoint_models')
            .insert(modelData);
          if (modelError) {
            console.error(`Error adding model ${modelData.model_id}:`, modelError);
            failedModels.push(modelData.model_id);
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Exception adding model ${modelData.model_id}:`, err);
          failedModels.push(modelData.model_id);
        }
      }
      if (successCount === 0) {
        console.log('No models were added successfully, cleaning up endpoint');
        await supabase.from('ai_endpoints').delete().eq('id', endpoint.id);
        throw new Error('Failed to add any models. Please try again.');
      }
      if (failedModels.length > 0) {
        toast.success(`Provider added with ${successCount} models. ${failedModels.length} model(s) failed.`);
      } else {
        toast.success(`Provider added with ${successCount} models`);
      }

      onEndpointAdded();
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New AI Provider</DialogTitle>
          <DialogDescription>
            Configure a new AI provider endpoint with your API key and select available models.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="My OpenAI Endpoint"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">
                Provider
              </Label>
              <Select
                value={providerType}
                onValueChange={(value: ProviderType) => setProviderType(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDERS).map(([key, provider]) => (
                    <SelectItem key={key} value={key}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {providerType === 'custom' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="baseUrl" className="text-right">
                  Base URL
                </Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="col-span-3"
                  placeholder="https://api.example.com/v1"
                  required={providerType === 'custom'}
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">
                API Key
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Models</Label>
              <div className="col-span-3">
                <Input
                  type="text"
                  placeholder="Search models..."
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  className="mb-2"
                />
                <div className="border rounded-md p-2 max-h-48 overflow-y-auto">
                  {filteredModels.map((model) => (
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
                      <label
                        htmlFor={model}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {model}
                      </label>
                    </div>
                  ))}
                  {filteredModels.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">
                      No models found matching your search.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Provider
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
  const supabase = createClient();

  const fetchEndpoints = async () => {
    try {
      const { data: endpointsData, error: fetchError } = await supabase
        .from('ai_endpoints')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const { data: modelsData, error: modelsError } = await supabase
        .from('ai_endpoint_models')
        .select('*');

      if (modelsError) throw modelsError;

      const formattedEndpoints: Endpoint[] = endpointsData.map(endpoint => ({
        id: endpoint.id,
        name: endpoint.name,
        provider: endpoint.type as ProviderType,
        base_url: endpoint.base_url || '',
        api_key: endpoint.api_key,
        enabled: endpoint.enabled,
        models: modelsData
          .filter(model => model.endpoint_id === endpoint.id)
          .map(model => ({
            id: model.model_id,
            name: model.model_name || model.model_id,
            enabled: model.enabled
          }))
      }));

      setEndpoints(formattedEndpoints);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching endpoints:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch endpoints');
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
      toast.error(err.message);
    }
  };

  const handleToggleModel = async (endpointId: string, modelId: string, enabled: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('ai_endpoint_models')
        .update({ enabled })
        .eq('endpoint_id', endpointId)
        .eq('model_id', modelId);

      if (updateError) throw updateError;

      toast.success(`Model ${enabled ? 'enabled' : 'disabled'} successfully`);
      fetchEndpoints();
    } catch (err: any) {
      console.error('Error updating model:', err);
      toast.error(err.message);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">AI Providers</h1>
          <p className="text-muted-foreground">
            Configure AI providers and select which models to make available.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Provider
        </Button>
      </div>

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
          {endpoints.length === 0 ? (
              <TableRow>
              <TableCell colSpan={5} className="text-center">
                No providers configured. Click "Add Provider" to get started.
              </TableCell>
            </TableRow>
          ) : (
            endpoints.map((endpoint) => (
              <TableRow key={endpoint.id}>
                <TableCell className="font-medium">{endpoint.name}</TableCell>
                <TableCell>
                  {endpoint.provider === 'custom' 
                    ? 'Custom' 
                    : PROVIDER_BASE_URLS[endpoint.provider as BaseProviderType].name}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {endpoint.models.map((model) => (
                      <Badge
                        key={model.id}
                        variant={model.enabled ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleToggleModel(endpoint.id, model.id, !model.enabled)}
                      >
                        {model.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                  <TableCell>
                  <Switch
                    checked={endpoint.enabled}
                    onCheckedChange={async (checked) => {
                      try {
                        const { error: updateError } = await supabase
                          .from('ai_endpoints')
                          .update({ enabled: checked })
                          .eq('id', endpoint.id);

                        if (updateError) throw updateError;

                        toast.success(`Provider ${checked ? 'enabled' : 'disabled'} successfully`);
                        fetchEndpoints();
                      } catch (err: any) {
                        console.error('Error updating endpoint:', err);
                        toast.error(err.message);
                      }
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                    onClick={() => handleDelete(endpoint.id)}
                  >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
        onEndpointAdded={fetchEndpoints}
      />
    </div>
  );
} 