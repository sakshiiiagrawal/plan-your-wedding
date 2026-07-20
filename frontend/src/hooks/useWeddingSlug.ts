import { useParams } from 'react-router-dom';
import { TENANT_SLUG } from '../utils/tenant';

/**
 * The wedding this view belongs to: host-derived on `{slug}.shaadi.diy`,
 * path-derived on hosts without wildcard DNS (preview deployments, plain
 * localhost). Use this anywhere the old code read `useParams().slug`.
 */
export function useWeddingSlug(): string | undefined {
  const { slug } = useParams<{ slug: string }>();
  return TENANT_SLUG ?? slug;
}
