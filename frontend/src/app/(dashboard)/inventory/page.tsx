'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, RefreshCw, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';
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
import { inventoryService } from '@/services/inventory.service';
import { settingsService } from '@/services/settings.service';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/lib/api';
import type { Product, StockLevel, StockMovement } from '@/types/models';

// ── Valuation methods ────────────────────────────────────────────────────────
const VALUATION_OPTIONS = [
  { value: 'WEIGHTED_AVG', label: 'CMUP — Coût Moyen Unitaire Pondéré' },
  { value: 'FIFO',         label: 'FIFO — Premier Entré, Premier Sorti' },
  { value: 'LIFO',         label: 'LIFO — Dernier Entré, Premier Sorti' },
];

const PRICE_CATEGORIES = [
  { value: 'STANDARD',     label: 'Standard (détail)' },
  { value: 'WHOLESALE',    label: 'Grossiste (demi-gros)' },
  { value: 'RETAIL',       label: 'Détaillant' },
  { value: 'SPECIAL',      label: 'Spécial / Négocié' },
  { value: 'EXPORT',       label: 'Export' },
];

// ── Zod schema ────────────────────────────────────────────────────────────────
const productSchema = z.object({
  // Identification
  sku:           z.string().min(1, 'Code requis'),
  name:          z.string().min(1, 'Désignation requise'),
  familyId:      z.string().optional(),
  categoryId:    z.string().optional(),
  barcode:       z.string().optional(),
  description:   z.string().optional(),
  isService:     z.boolean().optional(),
  // Tarification
  salePrice:     z.coerce.number().min(0),
  costPrice:     z.coerce.number().min(0),
  taxId:         z.string().optional(),
  priceCategory: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  packaging:     z.string().optional(),
  // Stock
  valuationMethod: z.string().optional(),
  minStock:      z.coerce.number().min(0).optional(),
  safetyStock:   z.coerce.number().min(0).optional(),
  alertQty:      z.coerce.number().min(0).optional(),
  maxStock:      z.coerce.number().min(0).optional(),
  trackBatches:  z.boolean().optional(),
  trackSerials:  z.boolean().optional(),
  hasExpiry:     z.boolean().optional(),
});
type ProductForm = z.infer<typeof productSchema>;

// ── Section accordion ─────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-stone-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 text-sm font-semibold text-slate-700 hover:bg-stone-100 transition-colors"
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="px-4 py-4 space-y-4">{children}</div>}
    </div>
  );
}

// ── Field row helper ──────────────────────────────────────────────────────────
function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function SelectField({ label, error, children, ...props }: {
  label: string; error?: string; children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <select
        style={{ colorScheme: 'light' }}
        className={cn(
          'block w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm shadow-sm',
          'focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300',
          error && 'border-red-400',
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Family quick-create modal ─────────────────────────────────────────────────
const familySchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  code: z.string().min(1, 'Code requis'),
  description: z.string().optional(),
});
type FamilyForm = z.infer<typeof familySchema>;

function FamilyModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FamilyForm>({ resolver: zodResolver(familySchema) as any });

  const createMutation = useMutation({
    mutationFn: (d: FamilyForm) => inventoryService.createFamily(d),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      onCreated(created.id, created.name);
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle famille d'articles" className="max-w-sm" zIndex={60}>
      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
        <Input label="Nom de la famille *" placeholder="Ex: Boissons, Alimentation…" error={errors.name?.message} {...register('name')} />
        <Input label="Code *" placeholder="Ex: BOI, ALI…" error={errors.code?.message} {...register('code')} />
        <div>
          <label className="text-sm font-medium text-slate-600">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            style={{ colorScheme: 'light' }}
            className="mt-1 block w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="Description optionnelle…"
          />
        </div>
        {createMutation.isError && (
          <p className="text-xs text-red-500">Code déjà utilisé — choisissez un autre.</p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={createMutation.isPending || isSubmitting}>Créer</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── PriceCategory quick-create modal ─────────────────────────────────────────
function PriceCategoryModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FamilyForm>({ resolver: zodResolver(familySchema) as any });

  const createMutation = useMutation({
    mutationFn: (d: FamilyForm) => inventoryService.createPriceCategory(d),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ['priceCategories'] });
      onCreated(created.code);
      reset();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle catégorie tarifaire" className="max-w-sm" zIndex={60}>
      <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-3">
        <Input label="Nom *" placeholder="Ex: Grossiste, Export…" error={errors.name?.message} {...register('name')} />
        <Input label="Code *" placeholder="Ex: GROS, EXPO…" error={errors.code?.message} {...register('code')} />
        <div>
          <label className="text-sm font-medium text-slate-600">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            style={{ colorScheme: 'light' }}
            className="mt-1 block w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="Description optionnelle…"
          />
        </div>
        {createMutation.isError && (
          <p className="text-xs text-red-500">Code déjà utilisé — choisissez un autre.</p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={createMutation.isPending || isSubmitting}>Créer</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const qc = useQueryClient();
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Product | null>(null);
  const [exporting, setExporting]   = useState(false);
  const [showFamilyModal, setShowFamilyModal]         = useState(false);
  const [showPriceCatModal, setShowPriceCatModal]     = useState(false);

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => inventoryService.listProducts(page, 20, search || undefined),
  });

  const { data: taxes = [] } = useQuery({
    queryKey: ['taxes'],
    queryFn: settingsService.listTaxes,
  });

  const { data: families = [] } = useQuery({
    queryKey: ['families'],
    queryFn: inventoryService.listFamilies,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: inventoryService.listCategories,
  });

  const { data: priceCategories = [] } = useQuery({
    queryKey: ['priceCategories'],
    queryFn: inventoryService.listPriceCategories,
  });

  // ── Form ────────────────────────────────────────────────────────────────────
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<ProductForm>({
      resolver: zodResolver(productSchema) as any,
      defaultValues: {
        salePrice: 0, costPrice: 0,
        minStock: 0, safetyStock: 0, alertQty: 0, maxStock: 0,
        isService: false, trackBatches: false, trackSerials: false, hasExpiry: false,
        valuationMethod: 'WEIGHTED_AVG',
        unitOfMeasure: 'pcs',
      },
    });

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      reset({
        sku:            editing.sku ?? '',
        name:           editing.name,
        familyId:       (editing as any).familyId ?? '',
        categoryId:     editing.categoryId ?? '',
        barcode:        (editing as any).barcode ?? '',
        description:    (editing as any).description ?? '',
        isService:      editing.isService,
        salePrice:      Number(editing.salePrice),
        costPrice:      Number(editing.costPrice),
        taxId:          editing.taxId ?? '',
        priceCategory:  (editing as any).priceCategory ?? '',
        unitOfMeasure:  (editing as any).unitOfMeasure ?? 'pcs',
        packaging:      (editing as any).packaging ?? '',
        valuationMethod:(editing as any).valuationMethod ?? 'WEIGHTED_AVG',
        minStock:       Number((editing as any).minStock ?? 0),
        safetyStock:    Number((editing as any).safetyStock ?? 0),
        alertQty:       Number((editing as any).alertQty ?? 0),
        maxStock:       Number((editing as any).maxStock ?? 0),
        trackBatches:   (editing as any).trackBatches ?? false,
        trackSerials:   (editing as any).trackSerials ?? false,
        hasExpiry:      (editing as any).hasExpiry ?? false,
      });
    } else {
      reset({
        salePrice: 0, costPrice: 0,
        minStock: 0, safetyStock: 0, alertQty: 0, maxStock: 0,
        isService: false, trackBatches: false, trackSerials: false, hasExpiry: false,
        valuationMethod: 'WEIGHTED_AVG', unitOfMeasure: 'pcs',
      });
    }
  }, [editing, reset]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (d: ProductForm) =>
      editing
        ? inventoryService.updateProduct(editing.id, d as any)
        : inventoryService.createProduct(d as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const handleOpen = (product?: Product) => {
    setEditing(product ?? null);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportInventoryToExcel } = await import('@/lib/excel-export');
      const [prodRes, stockRes, movRes] = await Promise.all([
        inventoryService.listProducts(1, 500),
        inventoryService.getStockLevels(1, 500),
        inventoryService.listMovements({ page: 1, limit: 500 }),
      ]);
      await exportInventoryToExcel({
        products:    prodRes.data as Product[],
        stockLevels: (stockRes as { data: StockLevel[] }).data,
        movements:   movRes.data as StockMovement[],
      });
    } finally {
      setExporting(false);
    }
  };

  const activeTaxes = taxes.filter((t) => t.isActive);
  const isService   = watch('isService');

  return (
    <>
      <Header title="Produits / Inventaire" />
      <div className="p-6 space-y-4">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher un produit…"
              className="w-full rounded-lg border border-stone-200 bg-white text-slate-800 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
              {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
              Export
            </Button>
            <Button onClick={() => handleOpen()}>
              <Plus size={16} /> Nouveau Produit
            </Button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? <PageLoader /> : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Désignation</Th>
                  <Th>Famille</Th>
                  <Th>Catégorie</Th>
                  <Th>Prix Vente</Th>
                  <Th>Taxe</Th>
                  <Th>Type</Th>
                  <Th>Statut</Th>
                  <Th></Th>
                </tr>
              </Thead>
              <Tbody>
                {(!data?.data || data.data.length === 0) && (
                  <tr><Td className="text-slate-400" colSpan={9}>Aucun produit</Td></tr>
                )}
                {data?.data?.map((p: any) => (
                  <Tr key={p.id}>
                    <Td className="font-mono text-xs text-slate-600">{p.sku ?? '—'}</Td>
                    <Td className="font-medium text-slate-800">{p.name}</Td>
                    <Td className="text-slate-500 text-xs">{p.family?.name ?? '—'}</Td>
                    <Td className="text-slate-500 text-xs">{p.category?.name ?? '—'}</Td>
                    <Td className="font-semibold">{formatCurrency(Number(p.salePrice))}</Td>
                    <Td>
                      {p.tax
                        ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">{p.tax.code} {Number(p.tax.rate).toFixed(0)}%</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </Td>
                    <Td><Badge variant="info">{p.isService ? 'Service' : 'Physique'}</Badge></Td>
                    <Td><Badge variant={statusVariant(p.isActive ? 'ACTIVE' : 'INACTIVE')}>{p.isActive ? 'Actif' : 'Inactif'}</Badge></Td>
                    <Td>
                      <button
                        onClick={() => handleOpen(p)}
                        className="rounded p-1.5 text-slate-400 hover:bg-stone-100 hover:text-blue-600 transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {data?.meta && (
              <Pagination meta={data.meta as PaginationMeta} onPageChange={setPage} />
            )}
          </>
        )}
      </div>

      {/* ── Family Quick-Create Modal ── */}
      <FamilyModal
        open={showFamilyModal}
        onClose={() => setShowFamilyModal(false)}
        onCreated={(id) => setValue('familyId', id)}
      />

      {/* ── Price Category Quick-Create Modal ── */}
      <PriceCategoryModal
        open={showPriceCatModal}
        onClose={() => setShowPriceCatModal(false)}
        onCreated={(code) => setValue('priceCategory', code)}
      />

      {/* ── Product Form Modal ── */}
      <Modal
        open={showForm}
        onClose={handleClose}
        title={editing ? `Modifier — ${editing.name}` : 'Nouveau Produit'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">

          {/* ── Section 1: Identification ── */}
          <Section title="📋 Identification">
            <FieldRow>
              <Input label="Code produit *" placeholder="REF-001" error={errors.sku?.message} {...register('sku')} />
              <Input label="Désignation *" placeholder="Nom du produit" error={errors.name?.message} {...register('name')} />
            </FieldRow>
            <FieldRow>
              {/* Famille with inline quick-create */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600">Famille du produit</label>
                  <button
                    type="button"
                    onClick={() => setShowFamilyModal(true)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    title="Créer une nouvelle famille"
                  >
                    <Plus size={12} /> Nouvelle
                  </button>
                </div>
                <select
                  style={{ colorScheme: 'light' }}
                  className="block w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  {...register('familyId')}
                >
                  <option value="">— Aucune famille —</option>
                  {families.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <SelectField label="Catégorie" {...register('categoryId')}>
                <option value="">— Aucune catégorie —</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectField>
            </FieldRow>
            <FieldRow>
              <Input label="Code-barre / EAN" placeholder="6xxxxxxxxxx" {...register('barcode')} />
              <SelectField label="Type de produit" {...register('isService', { setValueAs: (v) => v === 'true' || v === true })}>
                <option value="false">Produit physique</option>
                <option value="true">Service (sans stock)</option>
              </SelectField>
            </FieldRow>
            <div>
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                {...register('description')}
                rows={2}
                style={{ colorScheme: 'light' }}
                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                placeholder="Description courte du produit…"
              />
            </div>
          </Section>

          {/* ── Section 2: Tarification ── */}
          <Section title="💰 Tarification & Conditionnement">
            <FieldRow>
              <Input label="Prix de vente HT *" type="number" step="1" min="0" error={errors.salePrice?.message} {...register('salePrice')} />
              <Input label="Prix d'achat (coût) *" type="number" step="1" min="0" error={errors.costPrice?.message} {...register('costPrice')} />
            </FieldRow>
            <FieldRow>
              <SelectField label="Code taxe (TVA)" {...register('taxId')}>
                <option value="">Exonéré / Sans taxe</option>
                {activeTaxes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {Number(t.rate).toFixed(0)}%</option>
                ))}
              </SelectField>
              {/* Catégorie tarifaire with quick-create */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600">Catégorie tarifaire</label>
                  <button
                    type="button"
                    onClick={() => setShowPriceCatModal(true)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    title="Créer une nouvelle catégorie tarifaire"
                  >
                    <Plus size={12} /> Nouvelle
                  </button>
                </div>
                <select
                  style={{ colorScheme: 'light' }}
                  className="block w-full rounded-lg border border-stone-200 bg-white text-slate-800 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  {...register('priceCategory')}
                >
                  <option value="">— Aucune —</option>
                  {priceCategories.map((pc: any) => (
                    <option key={pc.id} value={pc.code}>{pc.name}</option>
                  ))}
                </select>
              </div>
            </FieldRow>
            <FieldRow>
              <Input label="Unité de mesure" placeholder="pcs, kg, L, m…" {...register('unitOfMeasure')} />
              <Input label="Conditionnement" placeholder="Ex: Carton de 12, Sac 50kg…" {...register('packaging')} />
            </FieldRow>
          </Section>

          {/* ── Section 3: Gestion du stock ── */}
          {!isService && (
            <Section title="📦 Gestion du Stock">
              <SelectField label="Méthode de suivi de stock" {...register('valuationMethod')}>
                {VALUATION_OPTIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </SelectField>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Input label="Stock min" type="number" step="1" min="0" placeholder="0" {...register('minStock')} />
                <Input label="Stock sécurité" type="number" step="1" min="0" placeholder="0" {...register('safetyStock')} />
                <Input label="Stock alerte" type="number" step="1" min="0" placeholder="0" {...register('alertQty')} />
                <Input label="Stock max" type="number" step="1" min="0" placeholder="0" {...register('maxStock')} />
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" {...register('trackBatches')} className="rounded accent-blue-600" />
                  Suivi par lots / batches
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" {...register('trackSerials')} className="rounded accent-blue-600" />
                  Suivi par numéro de série
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" {...register('hasExpiry')} className="rounded accent-blue-600" />
                  Produit périssable (date d'expiration)
                </label>
              </div>
            </Section>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-stone-100">
            <Button variant="outline" type="button" onClick={handleClose}>Annuler</Button>
            <Button type="submit" loading={saveMutation.isPending || isSubmitting}>
              {editing ? 'Enregistrer' : 'Créer le produit'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
