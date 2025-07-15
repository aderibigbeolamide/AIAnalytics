import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuxiliaryBodies } from "@/components/auxiliary-body-filter";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";

const memberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(1, "Username is required"),
  jamaat: z.string().optional(),
  circuit: z.string().optional(),
  chandaNumber: z.string().optional(),
  wasiyyahNumber: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  auxiliaryBody: z.string().min(1, "Auxiliary body is required"),
  postHolding: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  onClose: () => void;
  member?: any;
}

function DynamicAuxiliaryBodyField({ form }: { form: any }) {
  const { data: auxiliaryBodies = [] } = useAuxiliaryBodies();
  
  return (
    <FormField
      control={form.control}
      name="auxiliaryBody"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Auxiliary Body</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select auxiliary body" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {auxiliaryBodies.length === 0 ? (
                <SelectItem value="" disabled>No auxiliary bodies available (create an event first)</SelectItem>
              ) : (
                auxiliaryBodies.map((body: string) => (
                  <SelectItem key={body} value={body}>
                    {body}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function MemberForm({ onClose, member }: MemberFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      firstName: member?.firstName || "",
      middleName: member?.middleName || "",
      lastName: member?.lastName || "",
      username: member?.username || "",
      jamaat: member?.jamaat || "",
      circuit: member?.circuit || "",
      chandaNumber: member?.chandaNumber || "",
      wasiyyahNumber: member?.wasiyyahNumber || "",
      address: member?.address || "",
      phoneNumber: member?.phoneNumber || "",
      email: member?.email || "",
      auxiliaryBody: member?.auxiliaryBody || "",
      postHolding: member?.postHolding || "",
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Success",
        description: "Member created successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create member",
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const response = await fetch(`/api/members/${member.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Success",
        description: "Member updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MemberFormData) => {
    if (member) {
      updateMemberMutation.mutate(data);
    } else {
      createMemberMutation.mutate(data);
    }
  };

  const isLoading = createMemberMutation.isPending || updateMemberMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="middleName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Middle Name (Optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="jamaat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jamaat</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="circuit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Circuit (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DynamicAuxiliaryBodyField form={form} />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="chandaNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chanda Number (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="wasiyyahNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wasiyyah Number (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="postHolding"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Post Holding (Optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : member ? "Update Member" : "Create Member"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
