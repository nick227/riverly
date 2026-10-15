# SDK (`@project/sdk`)

Generated from `packages/api-spec/openapi.yaml`; the only bridge between any frontend and the API.

```ts
import { createApiClient, useOpportunity, useLogActivity } from '@project/sdk'

createApiClient({ baseUrl: import.meta.env.VITE_API_URL }) // web: httpOnly cookie auth
// native apps: createApiClient({ baseUrl, getToken: () => secureStore.get('token') })
```

- `pnpm sdk:generate` regenerates `src/generated/types.ts`; `pnpm sdk:check` fails on drift (CI).
- Hooks live in `src/hooks/*` (one file per module) and use React Query. Lists with cursors use
  `useInfiniteQuery`; `meta.nextCursor` drives paging.
- Query keys: `['me']`, `['workflow']`, `['opportunity', id]`, `['opportunities', 'list', params]`,
  `['contact', id]`, `['activity', 'list', params]`, … Job mutations call `invalidateJob()` so the
  job, lists, contact card and river refresh together.
- Mutations that must not double-apply (`useTransitionOpportunity`, `useLogActivity`, `useCreatePost`,
  `useSendEmail`) send an `idempotencyKey`; the server returns the original result for repeats.
- Errors are `ApiError { status, message, code, details }` with the server's user-facing message.
- Named schema types are exported from `src/types.ts` (`OpportunityDetail`, `ActivityItem`, …).
