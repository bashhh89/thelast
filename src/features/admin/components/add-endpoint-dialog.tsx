'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createClient } from '@/core/supabase/client';

interface Provider {
  name: string;
  base_url: string;
  models: {
    id: string;
    name: string;
  }[];
}

interface AddEndpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providers: Record<string, Provider>;
  onEndpointAdded: () => void;
}

export function AddEndpointDialog({ open, onOpenChange, providers, onEndpointAdded }: AddEndpointDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    base_url: '',
    api_key: '',
  });

  const [selectedModels, setSelectedModels] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const resetForm = () => {
    setFormData({
      name: '',
      provider: '',
      base_url: '',
      api_key: '',
    });
    setSelectedModels({});
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (!formData.name || !formData.provider || !formData.api_key) {
        throw new Error('Please fill in all required fields');
      }

      // Get selected models
      const models = Object.entries(selectedModels)
        .filter(([_, enabled]) => enabled)
        .map(([id]) => ({
          model_id: id,
          model_name: formData.provider === 'custom' 
            ? id 
            : providers[formData.provider].models.find(m => m.id === id)?.name || id,
          enabled: true
        }));

      if (models.length === 0) {
        throw new Error('Please select at least one model');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Create endpoint
      const { data: endpoint, error: endpointError } = await supabase
        .from('ai_endpoints')
        .insert({
          name: formData.name,
          type: formData.provider,
          base_url: formData.provider === 'custom' 
            ? formData.base_url 
            : providers[formData.provider].base_url,
          api_key: formData.api_key,
          enabled: true,
          owner_id: user.id
        })
        .select()
        .single();

      if (endpointError) throw endpointError;

      // Add models
      const { error: modelsError } = await supabase
        .from('ai_endpoint_models')
        .insert(
          models.map(model => ({
            ...model,
            endpoint_id: endpoint.id
          }))
        );

      if (modelsError) throw modelsError;

      toast.success('Provider added successfully');
      onEndpointAdded();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      console.error('Error adding endpoint:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableModels = formData.provider === 'custom' 
    ? [] 
    : formData.provider 
      ? providers[formData.provider].models 
      : [];

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add AI Provider</DialogTitle>
          <DialogDescription>
            Configure a new AI provider and select which models to enable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My OpenAI Account"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={formData.provider}
              onValueChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  provider: value,
                  base_url: value === 'custom' ? '' : providers[value]?.base_url || ''
                }));
                setSelectedModels({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(providers).map(([key, provider]) => (
                  <SelectItem key={key} value={key}>
                    {provider.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.provider === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="base_url">Base URL</Label>
              <Input
                id="base_url"
                value={formData.base_url}
                onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                placeholder="https://api.example.com"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <Input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder="Enter your API key"
              required
            />
          </div>

          {formData.provider && formData.provider !== 'custom' && (
            <div className="space-y-2">
              <Label>Available Models</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-4">
                {availableModels.map((model) => (
                  <div key={model.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={model.id}
                      checked={selectedModels[model.id] || false}
                      onCheckedChange={(checked) => {
                        setSelectedModels(prev => ({
                          ...prev,
                          [model.id]: checked === true
                        }));
                      }}
                    />
                    <Label htmlFor={model.id} className="cursor-pointer">
                      {model.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.provider === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="custom_models">Model IDs</Label>
              <Input
                id="custom_models"
                placeholder="Enter model IDs, separated by commas"
                onChange={(e) => {
                  const models = e.target.value
                    .split(',')
                    .map(m => m.trim())
                    .filter(Boolean)
                    .reduce((acc, id) => ({
                      ...acc,
                      [id]: true
                    }), {});
                  setSelectedModels(models);
                }}
              />
              <p className="text-sm text-muted-foreground">
                For custom providers, enter the model IDs as they appear in the API
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Provider'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 