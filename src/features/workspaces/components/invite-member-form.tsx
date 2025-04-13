'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUserApi } from '@/features/workspaces/api/workspace-service';

interface InviteMemberFormProps {
  workspaceId: string; // ID of the workspace to invite to
  onInviteSent?: () => void; // Optional callback when invite is "sent"
}

export const InviteMemberForm: React.FC<InviteMemberFormProps> = ({ workspaceId, onInviteSent }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      console.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    
    try {
      const { message, error } = await inviteUserApi(workspaceId, email.trim());

      if (error) {
        throw new Error(error);
      }
      
      console.log(message || `Invitation sent successfully to ${email}.`);
      setEmail('');
      onInviteSent?.();

    } catch (error: any) {
      console.error("Error sending invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@example.com"
          className="col-span-3"
          disabled={isLoading}
          required
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Invitation"}
        </Button>
      </div>
    </form>
  );
}; 