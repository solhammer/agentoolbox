import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  adjustCredit,
  fetchHallucinations,
  fetchHealth,
  fetchLedger,
  fetchOverview,
  fetchRequests,
  type HallucinationsResponse,
  type HealthStatus,
  type LedgerResponse,
  type OverviewStats,
  type RequestsResponse,
} from '../lib/api';

export interface RequestsParams {
  limit?: number;
  offset?: number;
  path?: string;
  verdict?: string;
}

export function useOverview(): UseQueryResult<OverviewStats, Error> {
  return useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    refetchInterval: 30_000,
  });
}

export function useRequests(
  params: RequestsParams,
): UseQueryResult<RequestsResponse, Error> {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: () => fetchRequests(params),
    refetchInterval: 15_000,
  });
}

export function useLedger(): UseQueryResult<LedgerResponse, Error> {
  return useQuery({
    queryKey: ['ledger'],
    queryFn: fetchLedger,
    refetchInterval: 60_000,
  });
}

export function useHallucinations(): UseQueryResult<
  HallucinationsResponse,
  Error
> {
  return useQuery({
    queryKey: ['hallucinations'],
    queryFn: fetchHallucinations,
    refetchInterval: 60_000,
  });
}

export function useHealth(): UseQueryResult<HealthStatus[], Error> {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });
}

export interface AdjustCreditVars {
  key: string;
  delta: number;
  reason?: string;
}

export function useAdjustCredit(): UseMutationResult<
  void,
  Error,
  AdjustCreditVars
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, delta, reason }: AdjustCreditVars) =>
      adjustCredit(key, delta, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ledger'] });
    },
  });
}
