'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { crmService } from '@/services/crm.service';
import { formatDate } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
});
type LeadForm = z.infer<typeof leadSchema>;

export default function CrmPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search],
    queryFn: () => crmService.listLeads(page, 20, search || undefined),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
  });

  const createMutation = useMutation({
    mutationFn: crmService.createLead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); reset(); setShowCreate(false); },
  });

  const convertMutation = useMutation({
    mutationFn: crmService.convertLead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  return (
    <>
      <Header title="CRM" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search leads…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} /> New Lead</Button>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Company</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th></Th>
                </tr>
              </Thead>
              <Tbody>
                {data?.data?.length === 0 && (
                  <tr><Td className="text-gray-400">No leads yet</Td></tr>
                )}
                {data?.data?.map((l) => (
                  <Tr key={l.id}>
                    <Td className="font-medium text-gray-900">{l.firstName} {l.lastName}</Td>
                    <Td>{l.email ?? '—'}</Td>
                    <Td>{l.company ?? '—'}</Td>
                    <Td><Badge variant={statusVariant(l.status)}>{l.status}</Badge></Td>
                    <Td>{formatDate(l.createdAt)}</Td>
                    <Td>
                      {l.status !== 'CONVERTED' && l.status !== 'LOST' && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={convertMutation.isPending}
                          onClick={() => convertMutation.mutate(l.id)}
                        >
                          <ArrowRight size={12} /> Convert
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {data?.meta && <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Lead">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name *" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last Name *" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Phone" {...register('phone')} />
          <Input label="Company" {...register('company')} />
          <Input label="Source" placeholder="Website, Referral…" {...register('source')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || isSubmitting}>Create Lead</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
