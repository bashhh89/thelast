'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { InviteMemberForm } from './invite-member-form';
import { UserPlus } from 'lucide-react';

interface MemberManagerProps {
  workspaceId: string;
}

export const MemberManager: React.FC<MemberManagerProps> = ({ workspaceId }) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // TODO: Fetch and display members list

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Workspace Members</h3>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
              <DialogDescription>
                Enter the email address of the person you want to invite to this workspace.
              </DialogDescription>
            </DialogHeader>
            <InviteMemberForm 
              workspaceId={workspaceId} 
              onInviteSent={() => setIsInviteDialogOpen(false)} // Close dialog on success
            />
            {/* Optional: Add a DialogFooter with a manual close button if needed */}
            {/* <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
            </DialogFooter> */}
          </DialogContent>
        </Dialog>
      </div>

      {/* Placeholder for Members List */}
      <div className="border rounded-md p-4 min-h-[100px]">
        <p className="text-sm text-muted-foreground">
          Members list will appear here...
          {/* TODO: Implement member list display (Avatar, Name, Email, Role, Actions like Remove/Change Role) */}
        </p>
      </div>
    </div>
  );
}; 