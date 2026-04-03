# Supabase Setup (5 minutes)

## Step 1: Create project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `athanor-platform`
4. Region: West US (closest to your Azure VM)
5. Generate a database password (save it)
6. Click "Create new project" and wait ~2 min

## Step 2: Get your keys

From the Supabase dashboard > Settings > API:

- **Project URL**: `https://xxxx.supabase.co` (this is `NEXT_PUBLIC_SUPABASE_URL`)
- **anon public key**: starts with `eyJ...` (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **service_role key**: starts with `eyJ...` (this is `SUPABASE_SERVICE_ROLE_KEY`)

## Step 3: Run migrations

In the Supabase dashboard > SQL Editor, paste and run each file in order:

1. `supabase/migrations/20250101000000_initial_schema.sql` (tables)
2. `supabase/migrations/20250102000000_add_rls_policies.sql` (security)
3. `supabase/migrations/20250103000000_credentials_add_columns.sql` (extra columns)
4. `supabase/seed.sql` (initial data: org, envs, versions)

Or if you have the Supabase CLI:
```bash
supabase db push --linked
supabase db push --include-seed
```

## Step 4: Set Vercel environment variables

Go to Vercel > athanor-platform > Settings > Environment Variables:

| Variable | Value | Type |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Plain text |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) | Plain text |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role) | Sensitive |
| `CREDENTIAL_ENCRYPTION_KEY` | (generate below) | Sensitive |
| `ATHANOR_USE_PLATFORM_KEYS` | `true` | Plain text |
| `GOOGLE_API_KEY` | your Google AI key | Sensitive |
| `AZURE_AI_API_KEY` | your Azure AI key | Sensitive |
| `AZURE_AI_API_BASE` | `https://isidor-testing-1...` | Sensitive |
| `OPENAI_API_KEY` | your OpenAI-compat key | Sensitive |
| `OPENAI_API_BASE` | `https://athanor.services...` | Sensitive |
| `HF_TOKEN` | your HuggingFace token | Sensitive |
| `AZURE_VM_SSH_TARGET` | `azureuser@20.245.2.136` | Sensitive |
| `AZURE_VM_RESOURCE_GROUP` | `ENV-RUNNER` | Plain text |
| `AZURE_VM_NAME` | `standard-env-runner` | Plain text |

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Redeploy

After setting env vars, click "Redeploy" in Vercel or push a commit.

## Step 6: Create your admin account

1. Visit your platform URL
2. Sign up with your email
3. In Supabase SQL Editor, run:
```sql
-- Link your user to the Athanor org as owner
INSERT INTO profiles (id, organization_id, email, role)
SELECT id, '00000000-0000-0000-0000-000000000001', email, 'owner'
FROM auth.users
WHERE email = 'your@email.com';
```

## Done!

Your platform is now:
- Connected to Supabase (real data, auth, RLS)
- Credentials encrypted at rest
- API routes live
- VM execution pipeline ready
