import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { Credential, CredentialProvider } from "@/types/database";

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
    mutationFn: async (input: AddCredentialInput): Promise<Credential> => {
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 300));

      const now = new Date().toISOString();
      const masked =
        input.apiKey.length > 8
          ? `${input.apiKey.slice(0, 6)}...${input.apiKey.slice(-4)}`
          : "••••••••";

      return {
        id: generateId(),
        organization_id: "org-athanor",
        provider: input.provider,
        label: input.label,
        encrypted_key: masked,
        base_url: input.baseUrl?.trim() || null,
        is_active: true,
        last_verified_at: now,
        created_at: now,
        updated_at: now,
      };
    },
    onSuccess: (newCredential) => {
      queryClient.setQueryData<Credential[]>(
        queryKeys.credentials.all,
        (prev) => [...(prev ?? []), newCredential],
      );
    },
  });

  const updateCredential = useMutation({
    mutationFn: async (
      input: UpdateCredentialInput,
    ): Promise<
      UpdateCredentialInput & { masked: string; updatedAt: string }
    > => {
      await new Promise((r) => setTimeout(r, 300));

      const masked =
        input.apiKey.length > 8
          ? `${input.apiKey.slice(0, 6)}...${input.apiKey.slice(-4)}`
          : "••••••••";

      return { ...input, masked, updatedAt: new Date().toISOString() };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Credential[]>(
        queryKeys.credentials.all,
        (prev) =>
          (prev ?? []).map((c) =>
            c.id === result.id
              ? {
                  ...c,
                  label: result.label,
                  encrypted_key: result.masked,
                  base_url: result.baseUrl?.trim() || null,
                  last_verified_at: result.updatedAt,
                  updated_at: result.updatedAt,
                }
              : c,
          ),
      );
    },
  });

  const revokeCredential = useMutation({
    mutationFn: async (input: RevokeCredentialInput): Promise<string> => {
      await new Promise((r) => setTimeout(r, 300));
      return input.id;
    },
    onSuccess: (removedId) => {
      queryClient.setQueryData<Credential[]>(
        queryKeys.credentials.all,
        (prev) => (prev ?? []).filter((c) => c.id !== removedId),
      );
    },
  });

  return { addCredential, updateCredential, revokeCredential };
}
