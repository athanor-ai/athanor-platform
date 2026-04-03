import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { CredentialSummary, CredentialProvider } from "@/types/database";

interface AddCredentialInput {
  provider: CredentialProvider;
  label: string;
  apiKey: string;
  baseUrl?: string;
}

interface UpdateCredentialInput {
  id: string;
  label: string;
  apiKey: string;
  baseUrl?: string;
}

interface RevokeCredentialInput {
  id: string;
}

function generateId(): string {
  return `cred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Mutations for managing credentials in local (mock) state.
 *
 * Each mutation optimistically updates the TanStack Query cache so the UI
 * reflects changes immediately. When a real API exists, swap the mutationFn
 * implementations — the rest of the hook stays the same.
 */
export function useCredentialMutations() {
  const queryClient = useQueryClient();

  const addCredential = useMutation({
    mutationFn: async (input: AddCredentialInput): Promise<CredentialSummary> => {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to add credential");
      }
      return res.json();
    },
    onSuccess: (newCredential) => {
      queryClient.setQueryData<CredentialSummary[]>(
        queryKeys.credentials.all,
        (prev) => [...(prev ?? []), newCredential],
      );
    },
  });

  const updateCredential = useMutation({
    mutationFn: async (input: UpdateCredentialInput): Promise<CredentialSummary> => {
      const res = await fetch(`/api/credentials/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to update credential");
      }
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<CredentialSummary[]>(
        queryKeys.credentials.all,
        (prev) =>
          (prev ?? []).map((c) => (c.id === updated.id ? updated : c)),
      );
    },
  });

  const revokeCredential = useMutation({
    mutationFn: async (input: RevokeCredentialInput): Promise<string> => {
      const res = await fetch(`/api/credentials/${input.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || "Failed to revoke credential");
      }
      return input.id;
    },
    onSuccess: (removedId) => {
      queryClient.setQueryData<CredentialSummary[]>(
        queryKeys.credentials.all,
        (prev) => (prev ?? []).filter((c) => c.id !== removedId),
      );
    },
  });

  return { addCredential, updateCredential, revokeCredential };
}
