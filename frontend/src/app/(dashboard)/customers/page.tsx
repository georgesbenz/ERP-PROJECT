'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { salesService } from '@/services/sales.service';
import { formatDate } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => salesService.listCustomers(page, 20, search || undefined),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  const createMutation = useMutation({
    mutationFn: salesService.createCustomer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      reset();
      setShowCreate(false);
    },
  });

  return (
    <>
      <Header title="Customers / Clients" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search customers…"
              className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} /> New Customer</Button>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Code</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Status</Th>
                  <Th>Since</Th>
                </tr>
              </Thead>
              <Tbody>
                {data?.data?.map((c) => (
                  <Tr key={c.id}>
                    <Td className="font-medium text-slate-800">{c.name}</Td>
                    <Td className="font-mono text-xs">{c.code}</Td>
                    <Td className="text-slate-500">{c.email ?? '—'}</Td>
                    <Td className="text-slate-500">{c.phone ?? '—'}</Td>
                    <Td><Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></Td>
                    <Td className="text-slate-500">{formatDate(c.createdAt)}</Td>
                  </Tr>
                ))}
                {data?.data?.length === 0 && (
                  <tr><Td className="text-slate-400">No customers found</Td></tr>
                )}
              </Tbody>
            </Table>
            {data?.meta && <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />}
          </>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Customer / Nouveau client">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name *" {...register('name')} error={errors.name?.message} className="col-span-2" />
            <Input label="Code *" {...register('code')} error={errors.code?.message} />
            <Input label="Phone" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="Address" {...register('address')} className="col-span-2" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
