/**
 * 数据获取 Hooks
 */
import useSWR, { mutate as globalMutate } from 'swr';
import { API_ENDPOINTS } from '@/lib/api/config';
import { Contract, Invoice, Reimbursement } from '@/types';
import { apiClient } from '@/lib/api/client';

// 合同数据
export function useContracts(skip: number = 0, limit: number = 10, status?: string) {
  let url = `${API_ENDPOINTS.CONTRACTS_LIST}?skip=${skip}&limit=${limit}`;
  if (status) url += `&status=${status}`;

  const { data, error, isLoading, mutate } = useSWR(
    url,
    async (url) => apiClient.get(url),
    { revalidateOnFocus: false }
  );

  return {
    contracts: data as Contract[],
    isLoading,
    error,
    mutate,
  };
}

export function useContract(contractId: number) {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.CONTRACTS_GET(contractId),
    async (url) => apiClient.get(url)
  );

  return {
    contract: data as Contract,
    isLoading,
    error,
    mutate,
  };
}

// 发票数据
export function useInvoices(skip: number = 0, limit: number = 10, status?: string) {
  let url = `${API_ENDPOINTS.INVOICES_LIST}?skip=${skip}&limit=${limit}`;
  if (status) url += `&status=${status}`;

  const { data, error, isLoading, mutate } = useSWR(
    url,
    async (url) => apiClient.get(url),
    { revalidateOnFocus: false }
  );

  return {
    invoices: data as Invoice[],
    isLoading,
    error,
    mutate,
  };
}

export function useInvoice(invoiceId: number) {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.INVOICES_GET(invoiceId),
    async (url) => apiClient.get(url)
  );

  return {
    invoice: data as Invoice,
    isLoading,
    error,
    mutate,
  };
}

// 报销数据
export function useReimbursements(skip: number = 0, limit: number = 10, status?: string) {
  let url = `${API_ENDPOINTS.REIMBURSEMENTS_LIST}?skip=${skip}&limit=${limit}`;
  if (status) url += `&status=${status}`;

  const { data, error, isLoading, mutate } = useSWR(
    url,
    async (url) => apiClient.get(url),
    { revalidateOnFocus: false }
  );

  return {
    reimbursements: data as Reimbursement[],
    isLoading,
    error,
    mutate,
  };
}

export function useReimbursement(reimbursementId: number) {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINTS.REIMBURSEMENTS_GET(reimbursementId),
    async (url) => apiClient.get(url)
  );

  return {
    reimbursement: data as Reimbursement,
    isLoading,
    error,
    mutate,
  };
}
