import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import { useWhyRender } from '../useWhyRender';

/**
 * Drop-in replacement for `useQuery` that reports when the observable
 * fields (data, status, isFetching, error) change in a way that causes
 * downstream re-renders — including new-reference-same-value cases.
 */
export function trackedQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  name?: string,
): UseQueryResult<TData, TError> {
  const result = useQuery(options);
  const tag =
    name ??
    (Array.isArray(options.queryKey)
      ? options.queryKey.join(':')
      : String(options.queryKey));
  useWhyRender(
    `query:${tag}`,
    {
      data: result.data as unknown,
      status: result.status,
      isFetching: result.isFetching,
      error: result.error as unknown,
    },
    { diff: 'structural' },
  );
  return result;
}
