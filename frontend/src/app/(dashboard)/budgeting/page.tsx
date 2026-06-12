'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, Clock } from 'lucide-react';
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
import { budgetingService } from '@/services/budgeting.service';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';

const planSchema = z.object({
  name: z.string().min(1),
  fiscalYear: z.coerce.number().min(2020).max(2099),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  totalAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
});
type PlanForm = z.infer<typeof planSchema>;

export default function BudgetingPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['budget-plans', page],
    queryFn: () => budgetingService.listPlans(page, 20),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PlanForm>({
    resolver: zodResolver(planSchema) as any,
    defaultValues: { fiscalYear: new Date().getFullYear() },
  });

  const createMutation = useMutation({
    mutationFn: budgetingService.createPlan,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budget-plans'] }); reset(); setShowCreate(false); },
  });

  const submitMutation = useMutation({
    mutationFn: budgetingService.submitForApproval,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-plans'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => budgetingService.approvePlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget-plans'] }),
  });

  return (
    <>
      <Header title="Budgeting / Budgétisation" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)}><Plus size={16} /> New Budget Plan</Button>
        </div>

        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Plan Name</Th>
                  <Th>Fiscal Year</Th>
                  <Th>Period</Th>
                  <Th>Total Budget</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {data?.data?.length === 0 && <tr><Td className="text-gray-400">No budget plans yet</Td></tr>}
                {data?.data?.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-medium text-gray-900">{p.name}</Td>
                    <Td>{p.fiscalYear}</Td>
                    <Td>{formatDate(p.startDate)} – {formatDate(p.endDate)}</Td>
                    <Td className="font-semibold">{formatCurrency(Number(p.totalAmount))}</Td>
                    <Td><Badge variant={statusVariant(p.status)}>{p.status}</Badge></Td>
                    <Td className="flex gap-2">
                      {p.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" loading={submitMutation.isPending} onClick={() => submitMutation.mutate(p.id)}>
                          <Clock size={12} /> Submit
                        </Button>
                      )}
                      {p.status === 'PENDING_APPROVAL' && (
                        <Button size="sm" loading={approveMutation.isPending} onClick={() => approveMutation.mutate(p.id)}>
                          <CheckCircle size={12} /> Approve
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Budget Plan">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d as PlanForm & { fiscalYear: number; totalAmount: number }))} className="space-y-4">
          <Input label="Plan Name *" error={errors.name?.message} {...register('name')} />
          <Input label="Fiscal Year *" type="number" error={errors.fiscalYear?.message} {...register('fiscalYear')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date *" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="End Date *" type="date" error={errors.endDate?.message} {...register('endDate')} />
          </div>
          <Input label="Total Budget Amount *" type="number" step="0.01" error={errors.totalAmount?.message} {...register('totalAmount')} />
          <Input label="Notes" {...register('notes')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || isSubmitting}>Create Plan</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
