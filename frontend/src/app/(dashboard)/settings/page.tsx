'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, GitBranch, ShieldCheck, User, Plus, Trash2, Check,
  Lock, Pencil, Users, ChevronRight, Shield, Copy, ToggleLeft, ToggleRight,
  Percent, Landmark, UserSquare2, FileText, Hash, Share2, Globe,
  Gavel, CreditCard, Settings, ShoppingCart, Package, BookOpen,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import {
  settingsService,
  type Branch, type Role, type Permission, type TaxCode,
  type CompanyInfo, type CompanyBankAccount, type CompanyRepresentative,
  type CompanyDocument, type CompanyDocumentSequence, type CompanySocialMedia,
} from '@/services/settings.service';
import { useAuthStore, type AuthUser } from '@/store/auth.store';
import { formatDate } from '@/lib/utils';

type Tab =
  | 'profile' | 'general' | 'legal' | 'tax' | 'address' | 'contact'
  | 'banking' | 'representatives' | 'documents' | 'sequences'
  | 'accounting' | 'erp' | 'pos' | 'inventory' | 'social'
  | 'branches' | 'roles' | 'taxes';

const TABS = [
  { key: 'profile',          label: 'Mon Profil',         icon: User,         group: 'Compte' },
  { key: 'general',          label: 'Général',            icon: Building2,    group: 'Société' },
  { key: 'legal',            label: 'Légal / Statut',     icon: Gavel,        group: 'Société' },
  { key: 'tax',              label: 'Fiscalité',          icon: Percent,      group: 'Société' },
  { key: 'address',          label: 'Adresse',            icon: Globe,        group: 'Société' },
  { key: 'contact',          label: 'Contact',            icon: User,         group: 'Société' },
  { key: 'banking',          label: 'Comptes Bancaires',  icon: Landmark,     group: 'Société' },
  { key: 'representatives',  label: 'Représentants',      icon: UserSquare2,  group: 'Société' },
  { key: 'documents',        label: 'Documents',          icon: FileText,     group: 'Société' },
  { key: 'sequences',        label: 'Numérotation',       icon: Hash,         group: 'Société' },
  { key: 'social',           label: 'Réseaux Sociaux',    icon: Share2,       group: 'Société' },
  { key: 'accounting',       label: 'Comptabilité',       icon: BookOpen,     group: 'Paramètres ERP' },
  { key: 'erp',              label: 'Général ERP',        icon: Settings,     group: 'Paramètres ERP' },
  { key: 'pos',              label: 'Point de Vente',     icon: ShoppingCart, group: 'Paramètres ERP' },
  { key: 'inventory',        label: 'Inventaire',         icon: Package,      group: 'Paramètres ERP' },
  { key: 'branches',         label: 'Agences',            icon: GitBranch,    group: 'Organisation' },
  { key: 'roles',            label: 'Rôles & Permissions',icon: ShieldCheck,  group: 'Organisation' },
  { key: 'taxes',            label: 'Codes TVA',          icon: CreditCard,   group: 'Organisation' },
] as const;

const GROUPS = ['Compte', 'Société', 'Paramètres ERP', 'Organisation'];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 mt-6 first:mt-0">{children}</h3>;
}

function SaveRow({ loading, success, dirty = true }: { loading: boolean; success: boolean; dirty?: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button type="submit" loading={loading} disabled={!dirty}>Enregistrer</Button>
      {success && <span className="text-sm text-emerald-600 flex items-center gap-1"><Check size={14} /> Sauvegardé</span>}
    </div>
  );
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </label>
  );
}

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const { user } = useAuthStore();
  const isAdmin = (user?.roles?.includes('Admin') || user?.roles?.includes('Super Admin')) ?? false;

  return (
    <>
      <Header title="Paramètres / Settings" />
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* ── Sidebar nav ── */}
        <nav className="w-56 shrink-0 border-r border-stone-200 bg-white p-3 space-y-0.5 overflow-y-auto">
          {GROUPS.map((group) => {
            const groupTabs = TABS.filter((t) => t.group === group);
            return (
              <div key={group}>
                <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group}</p>
                {groupTabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key as Tab)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      tab === key
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-stone-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto p-6">
          {tab === 'profile'         && <ProfileTab user={user} />}
          {tab === 'general'         && <GeneralTab />}
          {tab === 'legal'           && <LegalTab />}
          {tab === 'tax'             && <TaxConfigTab />}
          {tab === 'address'         && <AddressTab />}
          {tab === 'contact'         && <ContactTab />}
          {tab === 'banking'         && <BankingTab />}
          {tab === 'representatives' && <RepresentativesTab />}
          {tab === 'documents'       && <DocumentsTab />}
          {tab === 'sequences'       && <SequencesTab />}
          {tab === 'social'          && <SocialMediaTab />}
          {tab === 'accounting'      && <AccountingTab />}
          {tab === 'erp'             && <ErpSettingsTab />}
          {tab === 'pos'             && <PosSettingsTab />}
          {tab === 'inventory'       && <InventorySettingsTab />}
          {tab === 'branches'        && <BranchesTab />}
          {tab === 'roles'           && <RolesTab isAdmin={isAdmin} />}
          {tab === 'taxes'           && <TaxesTab />}
        </div>
      </div>
    </>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: AuthUser | null }) {
  return (
    <div className="max-w-lg space-y-6">
      <Card>
        <CardHeader><CardTitle>Mon Profil</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {user?.roles.map((r: string) => <Badge key={r} variant="info">{r}</Badge>)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Tenant</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 mb-1">Tenant ID</p>
          <p className="font-mono text-sm text-slate-800 select-all">{user?.tenantId}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared company form hook ─────────────────────────────────────────────────

function useCompanyMutation(fields: (keyof CompanyInfo)[]) {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: settingsService.getCompany,
  });
  const mutation = useMutation({
    mutationFn: (payload: Partial<CompanyInfo>) => settingsService.updateCompany(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });
  return { company, isLoading, mutation };
}

// ─── General Tab ──────────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1, 'Requis'),
  tradingName: z.string().optional(),
  slogan: z.string().optional(),
  industry: z.string().optional(),
  dateEstablished: z.string().optional(),
  businessDescription: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
});

function GeneralTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(generalSchema) as any,
    values: company ? {
      name: company.name ?? '',
      tradingName: company.tradingName ?? '',
      slogan: company.slogan ?? '',
      industry: company.industry ?? '',
      dateEstablished: company.dateEstablished ? company.dateEstablished.split('T')[0] : '',
      businessDescription: company.businessDescription ?? '',
      website: company.website ?? '',
      logoUrl: company.logoUrl ?? '',
    } : {},
  });
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });
  if (isLoading) return <PageLoader />;
  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader><CardTitle>Informations Générales</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Raison sociale *" {...register('name')} error={errors.name?.message as string} className="col-span-2" />
              <Input label="Nom commercial" {...register('tradingName')} className="col-span-2" />
              <Input label="Slogan" {...register('slogan')} className="col-span-2" />
              <Input label="Secteur d'activité" {...register('industry')} />
              <Input label="Date de création" type="date" {...register('dateEstablished')} />
              <Input label="Site web" {...register('website')} />
              <Input label="URL Logo" {...register('logoUrl')} />
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea
                  {...register('businessDescription')}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>
            </div>
            <SaveRow loading={mutation.isPending} success={mutation.isSuccess} dirty={isDirty} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Legal Tab ────────────────────────────────────────────────────────────────

const legalSchema = z.object({
  rccm: z.string().optional(),
  niu: z.string().optional(),
  taxId: z.string().optional(),
  cnps: z.string().optional(),
  patent: z.string().optional(),
  statisticalNumber: z.string().optional(),
  shareCapital: z.coerce.number().optional(),
  legalForm: z.string().optional(),
});

const LEGAL_FORMS = [
  { value: '', label: '— Choisir —' },
  { value: 'SA', label: 'SA — Société Anonyme' },
  { value: 'SARL', label: 'SARL — Société à Responsabilité Limitée' },
  { value: 'SAS', label: 'SAS — Société par Actions Simplifiée' },
  { value: 'SNC', label: 'SNC — Société en Nom Collectif' },
  { value: 'GIE', label: 'GIE — Groupement d\'Intérêt Économique' },
  { value: 'EI', label: 'EI — Entreprise Individuelle' },
  { value: 'EURL', label: 'EURL — Entreprise Unipersonnelle à Responsabilité Limitée' },
  { value: 'COOP', label: 'Coopérative' },
  { value: 'ASS', label: 'Association' },
  { value: 'ONG', label: 'ONG — Organisation Non Gouvernementale' },
];

function LegalTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    resolver: zodResolver(legalSchema) as any,
    values: company ? {
      rccm: company.rccm ?? '',
      niu: company.niu ?? '',
      taxId: company.taxId ?? '',
      cnps: company.cnps ?? '',
      patent: company.patent ?? '',
      statisticalNumber: company.statisticalNumber ?? '',
      shareCapital: company.shareCapital ?? '',
      legalForm: company.legalForm ?? '',
    } : {},
  });
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });
  if (isLoading) return <PageLoader />;
  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader><CardTitle>Informations Légales & Statutaires</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Forme Juridique</label>
                <select {...register('legalForm')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                  {LEGAL_FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <Input label="RCCM" placeholder="RC/BAM/2020/B/00001" {...register('rccm')} className="col-span-2" />
              <Input label="NIU (Numéro Identifiant Unique)" placeholder="P000000000001A" {...register('niu')} />
              <Input label="Numéro Fiscal / Tax ID" {...register('taxId')} />
              <Input label="CNPS" {...register('cnps')} />
              <Input label="Patente" {...register('patent')} />
              <Input label="Numéro Statistique" {...register('statisticalNumber')} />
              <Input label="Capital Social (FCFA)" type="number" {...register('shareCapital')} className="col-span-2" />
            </div>
            <SaveRow loading={mutation.isPending} success={mutation.isSuccess} dirty={isDirty} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tax Config Tab ───────────────────────────────────────────────────────────

const taxConfigSchema = z.object({
  vatNumber: z.string().optional(),
  taxRegime: z.string().optional(),
  taxOffice: z.string().optional(),
});

function TaxConfigTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const [vatEnabled, setVatEnabled] = useState<boolean | null>(null);
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    resolver: zodResolver(taxConfigSchema) as any,
    values: company ? {
      vatNumber: company.vatNumber ?? '',
      taxRegime: company.taxRegime ?? '',
      taxOffice: company.taxOffice ?? '',
    } : {},
  });
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });
  const effectiveVat = vatEnabled !== null ? vatEnabled : (company?.vatEnabled ?? true);
  if (isLoading) return <PageLoader />;
  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader><CardTitle>Configuration Fiscale</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, vatEnabled: effectiveVat }))} className="space-y-4">
            <Toggle
              label="Assujetti à la TVA"
              checked={effectiveVat}
              onChange={(v) => { setVatEnabled(v); }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Numéro de TVA" {...register('vatNumber')} className="col-span-2" />
              <Input label="Régime Fiscal" placeholder="Réel / Simplifié / Forfait" {...register('taxRegime')} />
              <Input label="Centre des Impôts" {...register('taxOffice')} />
            </div>
            <SaveRow loading={mutation.isPending} success={mutation.isSuccess} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Address Tab ──────────────────────────────────────────────────────────────

const addressSchema = z.object({
  address: z.string().optional(),
  physicalAddress: z.string().optional(),
  postalAddress: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  subdivision: z.string().optional(),
  division: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  gpsCoordinates: z.string().optional(),
});

const CAMEROON_REGIONS = [
  'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
  'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest',
];

function AddressTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    resolver: zodResolver(addressSchema) as any,
    values: company ? {
      address: company.address ?? '',
      physicalAddress: company.physicalAddress ?? '',
      postalAddress: company.postalAddress ?? '',
      city: company.city ?? '',
      district: company.district ?? '',
      subdivision: company.subdivision ?? '',
      division: company.division ?? '',
      region: company.region ?? '',
      country: company.country ?? 'Cameroun',
      gpsCoordinates: company.gpsCoordinates ?? '',
    } : {},
  });
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });
  if (isLoading) return <PageLoader />;
  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader><CardTitle>Adresse</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Adresse physique" {...register('physicalAddress')} className="col-span-2" />
              <Input label="Adresse postale / BP" {...register('postalAddress')} className="col-span-2" />
              <Input label="Adresse (courte)" {...register('address')} className="col-span-2" />
              <Input label="Ville" {...register('city')} />
              <Input label="Arrondissement" {...register('subdivision')} />
              <Input label="Département" {...register('district')} />
              <Input label="Division" {...register('division')} />
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Région</label>
                <select {...register('region')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                  <option value="">— Choisir —</option>
                  {CAMEROON_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <Input label="Pays" {...register('country')} />
              <Input label="Coordonnées GPS" placeholder="3.8667, 11.5167" {...register('gpsCoordinates')} />
            </div>
            <SaveRow loading={mutation.isPending} success={mutation.isSuccess} dirty={isDirty} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Contact Tab ──────────────────────────────────────────────────────────────

const contactSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  email2: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  whatsapp: z.string().optional(),
});

function ContactTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(contactSchema) as any,
    values: company ? {
      email: company.email ?? '',
      email2: company.email2 ?? '',
      phone: company.phone ?? '',
      phone2: company.phone2 ?? '',
      whatsapp: company.whatsapp ?? '',
    } : {},
  });
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company'] }),
  });
  if (isLoading) return <PageLoader />;
  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader><CardTitle>Coordonnées de Contact</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email principal" type="email" {...register('email')} error={errors.email?.message as string} />
              <Input label="Email secondaire" type="email" {...register('email2')} error={errors.email2?.message as string} />
              <Input label="Téléphone principal" {...register('phone')} />
              <Input label="Téléphone secondaire" {...register('phone2')} />
              <Input label="WhatsApp" placeholder="+237 6XX XXX XXX" {...register('whatsapp')} className="col-span-2" />
            </div>
            <SaveRow loading={mutation.isPending} success={mutation.isSuccess} dirty={isDirty} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Banking Tab ──────────────────────────────────────────────────────────────

const bankSchema = z.object({
  bankName: z.string().min(1, 'Requis'),
  accountName: z.string().min(1, 'Requis'),
  accountNumber: z.string().min(1, 'Requis'),
  iban: z.string().optional(),
  swift: z.string().optional(),
  branch: z.string().optional(),
  currency: z.string().optional(),
  isDefault: z.boolean().optional(),
});

function BankingTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CompanyBankAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: settingsService.listBankAccounts,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(bankSchema) as any,
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing
      ? settingsService.updateBankAccount(editing.id, d)
      : settingsService.createBankAccount(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteBankAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-accounts'] }),
  });

  const open = (b?: CompanyBankAccount) => {
    reset(b ?? {});
    setEditing(b ?? null);
    setShowModal(true);
  };

  if (isLoading) return <PageLoader />;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Comptes Bancaires</h2>
        <Button size="sm" onClick={() => open()}><Plus size={14} /> Ajouter</Button>
      </div>
      <Card>
        <Table>
          <Thead><Tr><Th>Banque</Th><Th>Titulaire</Th><Th>Numéro</Th><Th>IBAN</Th><Th>Défaut</Th><Th /></Tr></Thead>
          <Tbody>
            {accounts.map((a) => (
              <Tr key={a.id}>
                <Td className="font-medium">{a.bankName}</Td>
                <Td>{a.accountName}</Td>
                <Td className="font-mono text-xs">{a.accountNumber}</Td>
                <Td className="text-slate-500 text-xs">{a.iban ?? '—'}</Td>
                <Td>{a.isDefault && <Badge variant="success">Défaut</Badge>}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => open(a)}>Modifier</Button>
                    <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate(a.id)} loading={deleteMutation.isPending}><Trash2 size={12} /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
            {accounts.length === 0 && <Tr><Td colSpan={6} className="text-center text-slate-400 py-8">Aucun compte bancaire</Td></Tr>}
          </Tbody>
        </Table>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier Compte' : 'Nouveau Compte'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <Input label="Banque *" {...register('bankName')} error={errors.bankName?.message as string} className="col-span-2" />
          <Input label="Titulaire *" {...register('accountName')} error={errors.accountName?.message as string} className="col-span-2" />
          <Input label="Numéro de compte *" {...register('accountNumber')} error={errors.accountNumber?.message as string} className="col-span-2" />
          <Input label="IBAN" {...register('iban')} />
          <Input label="SWIFT / BIC" {...register('swift')} />
          <Input label="Agence" {...register('branch')} />
          <Input label="Devise" {...register('currency')} placeholder="XAF" />
          <div className="col-span-2 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={saveMutation.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Representatives Tab ──────────────────────────────────────────────────────

const repSchema = z.object({
  name: z.string().min(1, 'Requis'),
  title: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

function RepresentativesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CompanyRepresentative | null>(null);

  const { data: reps = [], isLoading } = useQuery({
    queryKey: ['representatives'],
    queryFn: settingsService.listRepresentatives,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(repSchema) as any,
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing
      ? settingsService.updateRepresentative(editing.id, d)
      : settingsService.createRepresentative(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['representatives'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteRepresentative,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['representatives'] }),
  });

  const open = (r?: CompanyRepresentative) => { reset(r ?? {}); setEditing(r ?? null); setShowModal(true); };

  if (isLoading) return <PageLoader />;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Représentants Légaux</h2>
        <Button size="sm" onClick={() => open()}><Plus size={14} /> Ajouter</Button>
      </div>
      <Card>
        <Table>
          <Thead><Tr><Th>Nom</Th><Th>Titre</Th><Th>Fonction</Th><Th>Téléphone</Th><Th>Email</Th><Th /></Tr></Thead>
          <Tbody>
            {reps.map((r) => (
              <Tr key={r.id}>
                <Td className="font-medium">{r.name}</Td>
                <Td className="text-slate-500">{r.title ?? '—'}</Td>
                <Td><Badge variant="info">{r.role ?? '—'}</Badge></Td>
                <Td className="text-slate-500">{r.phone ?? '—'}</Td>
                <Td className="text-slate-500">{r.email ?? '—'}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => open(r)}>Modifier</Button>
                    <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate(r.id)} loading={deleteMutation.isPending}><Trash2 size={12} /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
            {reps.length === 0 && <Tr><Td colSpan={6} className="text-center text-slate-400 py-8">Aucun représentant</Td></Tr>}
          </Tbody>
        </Table>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier Représentant' : 'Nouveau Représentant'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Nom complet *" {...register('name')} error={errors.name?.message as string} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Titre" placeholder="M., Mme, Dr, Me…" {...register('title')} />
            <Input label="Fonction" placeholder="Gérant, DG, PDG…" {...register('role')} />
            <Input label="Téléphone" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message as string} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={saveMutation.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

const docSchema = z.object({
  name: z.string().min(1, 'Requis'),
  type: z.string().min(1, 'Requis'),
  fileUrl: z.string().optional(),
  expiresAt: z.string().optional(),
});

const DOC_TYPES = [
  'RCCM', 'NIU_CERT', 'CNPS_CERT', 'PATENTE', 'STATUTS',
  'ATTESTATION_FISCALE', 'RIB', 'AUTRE',
];

function DocumentsTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CompanyDocument | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['company-documents'],
    queryFn: settingsService.listDocuments,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(docSchema) as any,
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) => editing
      ? settingsService.updateDocument(editing.id, d)
      : settingsService.createDocument(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company-documents'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-documents'] }),
  });

  const open = (d?: CompanyDocument) => {
    reset(d ? { ...d, expiresAt: d.expiresAt ? d.expiresAt.split('T')[0] : '' } : {});
    setEditing(d ?? null);
    setShowModal(true);
  };

  if (isLoading) return <PageLoader />;

  const now = new Date();
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Documents Officiels</h2>
        <Button size="sm" onClick={() => open()}><Plus size={14} /> Ajouter</Button>
      </div>
      <Card>
        <Table>
          <Thead><Tr><Th>Nom</Th><Th>Type</Th><Th>Expiration</Th><Th>Statut</Th><Th /></Tr></Thead>
          <Tbody>
            {docs.map((d) => {
              const expired = d.expiresAt && new Date(d.expiresAt) < now;
              return (
                <Tr key={d.id}>
                  <Td className="font-medium">{d.name}</Td>
                  <Td><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono">{d.type}</span></Td>
                  <Td className={expired ? 'text-red-600 font-medium' : 'text-slate-500'}>
                    {d.expiresAt ? formatDate(d.expiresAt) : '—'}
                    {expired && ' ⚠️'}
                  </Td>
                  <Td><Badge variant={d.isActive ? 'success' : 'default'}>{d.isActive ? 'Actif' : 'Archivé'}</Badge></Td>
                  <Td>
                    <div className="flex gap-2">
                      {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Voir</a>}
                      <Button variant="outline" size="sm" onClick={() => open(d)}>Modifier</Button>
                      <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate(d.id)} loading={deleteMutation.isPending}><Trash2 size={12} /></Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
            {docs.length === 0 && <Tr><Td colSpan={5} className="text-center text-slate-400 py-8">Aucun document</Td></Tr>}
          </Tbody>
        </Table>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier Document' : 'Nouveau Document'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Intitulé *" {...register('name')} error={errors.name?.message as string} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select {...register('type')} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300">
                <option value="">— Choisir —</option>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type.message as string}</p>}
            </div>
            <Input label="Date d'expiration" type="date" {...register('expiresAt')} />
          </div>
          <Input label="URL du fichier" placeholder="https://…" {...register('fileUrl')} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={saveMutation.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Document Sequences Tab ───────────────────────────────────────────────────

const SEQ_TYPES = [
  { value: 'INVOICE', label: 'Facture de vente' },
  { value: 'PURCHASE_ORDER', label: 'Bon de commande' },
  { value: 'DELIVERY', label: 'Bon de livraison' },
  { value: 'RECEIPT', label: 'Reçu / Ticket' },
  { value: 'QUOTE', label: 'Devis' },
  { value: 'CREDIT_NOTE', label: 'Avoir / Note de crédit' },
  { value: 'EXPENSE', label: 'Note de frais' },
  { value: 'PROFORMA', label: 'Facture proforma' },
];

function SequencesTab() {
  const qc = useQueryClient();
  const { data: seqs = [], isLoading } = useQuery({
    queryKey: ['doc-sequences'],
    queryFn: settingsService.listDocumentSequences,
  });
  const mutation = useMutation({
    mutationFn: (payload: any) => settingsService.upsertDocumentSequence(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-sequences'] }),
  });

  if (isLoading) return <PageLoader />;

  const seqMap = Object.fromEntries(seqs.map((s) => [s.docType, s]));

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-slate-800">Numérotation des Documents</h2>
        <p className="text-sm text-slate-500">Définir le préfixe et le prochain numéro pour chaque type de document.</p>
      </div>
      {SEQ_TYPES.map(({ value, label }) => (
        <SequenceRow
          key={value}
          docType={value}
          label={label}
          seq={seqMap[value]}
          onSave={(d) => mutation.mutate({ docType: value, ...d })}
          saving={mutation.isPending}
        />
      ))}
    </div>
  );
}

function SequenceRow({
  docType, label, seq, onSave, saving,
}: {
  docType: string; label: string; seq?: CompanyDocumentSequence;
  onSave: (d: any) => void; saving: boolean;
}) {
  const [prefix, setPrefix] = useState(seq?.prefix ?? docType.slice(0, 3).toUpperCase() + '-');
  const [next, setNext] = useState(seq?.nextNumber ?? 1);
  const [pad, setPad] = useState(seq?.padding ?? 5);
  const preview = `${prefix}${'0'.repeat(pad - String(next).length)}${next}`;

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-4">
          <div className="w-40 shrink-0">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{docType}</p>
          </div>
          <div className="flex items-center gap-3 flex-1">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Préfixe</label>
              <input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Prochain n°</label>
              <input
                type="number" min={1} value={next}
                onChange={(e) => setNext(Number(e.target.value))}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Zéros</label>
              <input
                type="number" min={1} max={10} value={pad}
                onChange={(e) => setPad(Number(e.target.value))}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 mb-1">Aperçu</p>
              <p className="text-sm font-bold font-mono text-indigo-700">{preview}</p>
            </div>
            <Button size="sm" loading={saving} onClick={() => onSave({ prefix, nextNumber: next, padding: pad })}>
              <Check size={13} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Social Media Tab ─────────────────────────────────────────────────────────

const PLATFORMS = [
  { value: 'FACEBOOK', label: 'Facebook', placeholder: 'https://facebook.com/…' },
  { value: 'INSTAGRAM', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { value: 'TWITTER', label: 'X (Twitter)', placeholder: 'https://twitter.com/…' },
  { value: 'LINKEDIN', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…' },
  { value: 'YOUTUBE', label: 'YouTube', placeholder: 'https://youtube.com/@…' },
  { value: 'WHATSAPP', label: 'WhatsApp Business', placeholder: 'https://wa.me/…' },
  { value: 'TIKTOK', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
];

function SocialMediaTab() {
  const qc = useQueryClient();
  const { data: socialMedia = [], isLoading } = useQuery({
    queryKey: ['social-media'],
    queryFn: settingsService.listSocialMedia,
  });
  const upsertMutation = useMutation({
    mutationFn: (payload: any) => settingsService.upsertSocialMedia(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-media'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteSocialMedia,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-media'] }),
  });

  if (isLoading) return <PageLoader />;

  const smMap = Object.fromEntries(socialMedia.map((s) => [s.platform, s]));

  return (
    <div className="space-y-3 max-w-xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Réseaux Sociaux</h2>
        <p className="text-sm text-slate-500">Liens vers vos pages officielles.</p>
      </div>
      {PLATFORMS.map(({ value, label, placeholder }) => {
        const existing = smMap[value];
        return (
          <SocialRow
            key={value}
            platform={value}
            label={label}
            placeholder={placeholder}
            existing={existing}
            onSave={(url) => upsertMutation.mutate({ platform: value, url, isActive: true })}
            onDelete={existing ? () => deleteMutation.mutate(existing.id) : undefined}
            saving={upsertMutation.isPending}
          />
        );
      })}
    </div>
  );
}

function SocialRow({
  platform, label, placeholder, existing, onSave, onDelete, saving,
}: {
  platform: string; label: string; placeholder: string;
  existing?: CompanySocialMedia; onSave: (url: string) => void;
  onDelete?: () => void; saving: boolean;
}) {
  const [url, setUrl] = useState(existing?.url ?? '');
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0 text-sm font-medium text-slate-700">{label}</div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
      />
      <Button size="sm" loading={saving} onClick={() => onSave(url)} disabled={!url}>
        <Check size={13} />
      </Button>
      {onDelete && (
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 size={13} />
        </Button>
      )}
    </div>
  );
}

// ─── Accounting Tab ───────────────────────────────────────────────────────────

function AccountingTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const [form, setForm] = useState<Partial<CompanyInfo>>({});
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: (updated) => { qc.invalidateQueries({ queryKey: ['company'] }); setForm({}); },
  });

  if (isLoading) return <PageLoader />;
  const c = { ...company, ...form } as CompanyInfo;

  const set = (k: keyof CompanyInfo, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Paramètres Comptables</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Toggle label="Comptabilité OHADA activée" checked={c.ohadaEnabled ?? false} onChange={(v) => set('ohadaEnabled', v)} />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Début année fiscale (mois)"
              value={String(c.fiscalYearStart ?? 1)}
              onChange={(v) => set('fiscalYearStart', Number(v))}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: new Date(2024, i, 1).toLocaleString('fr-FR', { month: 'long' }),
              }))}
            />
            <SelectField
              label="Fin année fiscale (mois)"
              value={String(c.fiscalYearEnd ?? 12)}
              onChange={(v) => set('fiscalYearEnd', Number(v))}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: new Date(2024, i, 1).toLocaleString('fr-FR', { month: 'long' }),
              }))}
            />
          </div>
          <SelectField
            label="Méthode comptable"
            value={c.accountingMethod ?? 'ACCRUAL'}
            onChange={(v) => set('accountingMethod', v)}
            options={[
              { value: 'ACCRUAL', label: 'Droits constatés (Accruals)' },
              { value: 'CASH', label: 'Trésorerie (Cash basis)' },
            ]}
          />
          <div className="flex justify-end">
            <Button loading={mutation.isPending} onClick={() => mutation.mutate({ ...form })}>
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ERP Settings Tab ─────────────────────────────────────────────────────────

const TIMEZONES = [
  'Africa/Douala', 'Africa/Lagos', 'Africa/Abidjan', 'Africa/Accra',
  'Africa/Dakar', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Europe/Paris', 'Europe/London', 'America/New_York', 'UTC',
];

function ErpSettingsTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const [form, setForm] = useState<Partial<CompanyInfo>>({});
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company'] }); setForm({}); },
  });

  if (isLoading) return <PageLoader />;
  const c = { ...company, ...form } as CompanyInfo;
  const set = (k: keyof CompanyInfo, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Paramètres Généraux ERP</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Langue par défaut" value={c.language ?? 'fr'} onChange={(v) => set('language', v)}
              options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]} />
            <SelectField label="Devise" value={c.currency ?? 'XAF'} onChange={(v) => set('currency', v)}
              options={[{ value: 'XAF', label: 'XAF — Franc CFA' }, { value: 'EUR', label: 'EUR — Euro' }, { value: 'USD', label: 'USD — Dollar' }, { value: 'GBP', label: 'GBP — Livre sterling' }]} />
            <div className="col-span-2">
              <SelectField label="Fuseau horaire" value={c.timezone ?? 'Africa/Douala'} onChange={(v) => set('timezone', v)}
                options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
            </div>
            <SelectField label="Format de date" value={c.dateFormat ?? 'DD/MM/YYYY'} onChange={(v) => set('dateFormat', v)}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
              ]} />
            <SelectField label="Format heure" value={c.timeFormat ?? '24h'} onChange={(v) => set('timeFormat', v)}
              options={[{ value: '24h', label: '24h (15:30)' }, { value: '12h', label: '12h (3:30 PM)' }]} />
            <SelectField label="Décimales" value={String(c.decimalPrecision ?? 2)} onChange={(v) => set('decimalPrecision', Number(v))}
              options={[{ value: '0', label: '0' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }]} />
          </div>
          <SectionTitle>Options multi-entités</SectionTitle>
          <div className="space-y-2">
            <Toggle label="Multi-agences" checked={c.multiBranch ?? false} onChange={(v) => set('multiBranch', v)} />
            <Toggle label="Multi-entrepôts" checked={c.multiWarehouse ?? false} onChange={(v) => set('multiWarehouse', v)} />
            <Toggle label="Multi-devises" checked={c.multiCurrency ?? false} onChange={(v) => set('multiCurrency', v)} />
          </div>
          <div className="flex justify-end">
            <Button loading={mutation.isPending} onClick={() => mutation.mutate({ ...form })}>Enregistrer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── POS Settings Tab ─────────────────────────────────────────────────────────

function PosSettingsTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const [form, setForm] = useState<Partial<CompanyInfo>>({});
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company'] }); setForm({}); },
  });

  if (isLoading) return <PageLoader />;
  const c = { ...company, ...form } as CompanyInfo;
  const set = (k: keyof CompanyInfo, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Paramètres Point de Vente</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Format reçu" value={c.receiptSize ?? 'A4'} onChange={(v) => set('receiptSize', v)}
              options={[
                { value: 'A4', label: 'A4' },
                { value: 'A5', label: 'A5' },
                { value: '80mm', label: '80mm (ticket)' },
                { value: '58mm', label: '58mm (mini ticket)' },
              ]} />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Remise max (%)</label>
              <input
                type="number" min={0} max={100}
                value={c.maxDiscountPct ?? 100}
                onChange={(e) => set('maxDiscountPct', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Jours retour produit</label>
              <input
                type="number" min={0}
                value={c.returnPolicyDays ?? 7}
                onChange={(e) => set('returnPolicyDays', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>
          <SectionTitle>Caisse</SectionTitle>
          <div className="space-y-2">
            <Toggle label="Impression auto du reçu" checked={c.autoPrint ?? false} onChange={(v) => set('autoPrint', v)} />
            <Toggle label="Ouverture de caisse obligatoire" checked={c.mandatoryCashOpen ?? false} onChange={(v) => set('mandatoryCashOpen', v)} />
            <Toggle label="Fermeture de caisse obligatoire" checked={c.mandatoryCashClose ?? false} onChange={(v) => set('mandatoryCashClose', v)} />
          </div>
          <div className="flex justify-end">
            <Button loading={mutation.isPending} onClick={() => mutation.mutate({ ...form })}>Enregistrer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Inventory Settings Tab ───────────────────────────────────────────────────

function InventorySettingsTab() {
  const qc = useQueryClient();
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: settingsService.getCompany });
  const [form, setForm] = useState<Partial<CompanyInfo>>({});
  const mutation = useMutation({
    mutationFn: (d: any) => settingsService.updateCompany(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['company'] }); setForm({}); },
  });

  if (isLoading) return <PageLoader />;
  const c = { ...company, ...form } as CompanyInfo;
  const set = (k: keyof CompanyInfo, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Paramètres Inventaire</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Seuil stock bas</label>
              <input
                type="number" min={0}
                value={c.lowStockThreshold ?? 10}
                onChange={(e) => set('lowStockThreshold', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Seuil stock critique</label>
              <input
                type="number" min={0}
                value={c.criticalStockThreshold ?? 5}
                onChange={(e) => set('criticalStockThreshold', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <SelectField label="Méthode d'évaluation par défaut"
                value={c.defaultValuationMethod ?? 'FIFO'}
                onChange={(v) => set('defaultValuationMethod', v)}
                options={[
                  { value: 'FIFO', label: 'FIFO — Premier entré, premier sorti' },
                  { value: 'LIFO', label: 'LIFO — Dernier entré, premier sorti' },
                  { value: 'AVERAGE', label: 'CUMP — Coût Unitaire Moyen Pondéré' },
                  { value: 'SPECIFIC', label: 'Coût spécifique' },
                ]}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button loading={mutation.isPending} onClick={() => mutation.mutate({ ...form })}>Enregistrer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Branches Tab ─────────────────────────────────────────────────────────────

const branchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});
type BranchForm = z.infer<typeof branchSchema>;

function BranchesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: settingsService.listBranches,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema) as any,
  });

  const openCreate = () => { reset({}); setEditing(null); setShowModal(true); };
  const openEdit   = (b: Branch) => { reset(b); setEditing(b); setShowModal(true); };

  const saveMutation = useMutation({
    mutationFn: (d: BranchForm) =>
      editing ? settingsService.updateBranch(editing.id, d) : settingsService.createBranch(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); setShowModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteBranch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Agences</h2>
        <Button onClick={openCreate} size="sm"><Plus size={14} /> Nouvelle agence</Button>
      </div>
      <Card>
        <Table>
          <Thead>
            <tr><Th>Nom</Th><Th>Code</Th><Th>Ville</Th><Th>Téléphone</Th><Th>Statut</Th><Th /></tr>
          </Thead>
          <Tbody>
            {branches.map((b) => (
              <Tr key={b.id}>
                <Td className="font-medium">
                  {b.name}
                  {b.isMain && <Badge variant="info" className="ml-2 text-[10px]">Principale</Badge>}
                </Td>
                <Td className="font-mono text-xs">{b.code}</Td>
                <Td>{b.city ?? '—'}</Td>
                <Td>{b.phone ?? '—'}</Td>
                <Td><Badge variant={b.isActive ? 'success' : 'default'}>{b.isActive ? 'Active' : 'Inactive'}</Badge></Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Modifier</Button>
                    {!b.isMain && (
                      <Button variant="danger" size="sm" loading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(b.id)}>
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {branches.length === 0 && <tr><Td className="text-slate-400">Aucune agence</Td></tr>}
          </Tbody>
        </Table>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier Agence' : 'Nouvelle Agence'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="grid grid-cols-2 gap-4">
          <Input label="Nom *" {...register('name')} error={errors.name?.message} className="col-span-2" />
          <Input label="Code *" {...register('code')} error={errors.code?.message} />
          <Input label="Téléphone" {...register('phone')} />
          <Input label="Adresse" {...register('address')} className="col-span-2" />
          <Input label="Ville" {...register('city')} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <div className="col-span-2 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={saveMutation.isPending}>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

const ALL_ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'] as const;

const MODULE_LABELS: Record<string, string> = {
  users: 'Utilisateurs',
  inventory: 'Inventaire',
  sales: 'Ventes',
  purchases: 'Achats',
  finance: 'Finance',
  crm: 'CRM',
  analytics: 'Analytique',
  budgeting: 'Budget',
  expenses: 'Dépenses',
};

const ACTION_COLORS: Record<string, string> = {
  READ:    'bg-sky-50 border-sky-300 text-sky-700',
  CREATE:  'bg-emerald-50 border-emerald-300 text-emerald-700',
  UPDATE:  'bg-amber-50 border-amber-300 text-amber-700',
  DELETE:  'bg-red-50 border-red-300 text-red-700',
  APPROVE: 'bg-purple-50 border-purple-300 text-purple-700',
};
const ACTION_CHECKED: Record<string, string> = {
  READ:    'bg-sky-500 border-sky-500 text-white',
  CREATE:  'bg-emerald-500 border-emerald-500 text-white',
  UPDATE:  'bg-amber-500 border-amber-500 text-white',
  DELETE:  'bg-red-500 border-red-500 text-white',
  APPROVE: 'bg-purple-500 border-purple-500 text-white',
};

const roleSchema = z.object({ name: z.string().min(1), description: z.string().optional() });
type RoleForm = z.infer<typeof roleSchema>;

function RolesTab({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({ queryKey: ['roles'], queryFn: settingsService.listRoles });
  const { data: allPermissions = [], isLoading: permsLoading } = useQuery({ queryKey: ['permissions'], queryFn: settingsService.listPermissions });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RoleForm>({ resolver: zodResolver(roleSchema) as any });

  const saveMutation = useMutation({
    mutationFn: (d: RoleForm) => editingRole ? settingsService.updateRole(editingRole.id, d) : settingsService.createRole(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setShowRoleModal(false); reset(); setEditingRole(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteRole(id),
    onSuccess: (_data, deletedId) => { qc.invalidateQueries({ queryKey: ['roles'] }); if (selectedRole?.id === deletedId) setSelectedRole(null); },
  });

  const cloneMutation = useMutation({
    mutationFn: settingsService.cloneRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: settingsService.toggleRole,
    onSuccess: (updated) => { qc.invalidateQueries({ queryKey: ['roles'] }); if (selectedRole?.id === updated.id) setSelectedRole(updated); },
  });

  const assignMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      settingsService.assignPermissions(roleId, permissionIds),
    onSuccess: (updated) => { qc.invalidateQueries({ queryKey: ['roles'] }); setSelectedRole(updated); setDirty(false); },
  });

  const openRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedPerms(new Set(role.permissions.map((rp) => rp.permission.id)));
    setDirty(false);
  };

  const openCreate = () => { reset({}); setEditingRole(null); setShowRoleModal(true); };
  const openEdit = (role: Role) => { reset({ name: role.name, description: role.description }); setEditingRole(role); setShowRoleModal(true); };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    setDirty(true);
  };

  const toggleModule = (modulePerms: Permission[]) => {
    const ids = modulePerms.map((p) => p.id);
    const allChecked = ids.every((id) => selectedPerms.has(id));
    setSelectedPerms((prev) => { const next = new Set(prev); if (allChecked) ids.forEach((id) => next.delete(id)); else ids.forEach((id) => next.add(id)); return next; });
    setDirty(true);
  };

  const canEditPerms = (role: Role) => !role.isSystem || isAdmin;

  const moduleMap = allPermissions.reduce<Record<string, Record<string, Permission>>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = {};
    acc[p.module][p.action] = p;
    return acc;
  }, {});

  const sortedModules = Object.keys(moduleMap).sort();

  const systemOrder = [
    'Super Admin', 'Admin', 'HR Manager', 'Finance Manager', 'Procurement Officer',
    'Sales Manager', 'Inventory Manager', 'Department Manager', 'Employee', 'Auditor',
  ];
  const sortedRoles = [...roles].sort((a, b) => {
    const ai = systemOrder.indexOf(a.name), bi = systemOrder.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1; if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  if (rolesLoading || permsLoading) return <PageLoader />;

  const editable = selectedRole ? canEditPerms(selectedRole) : false;

  return (
    <div className="flex gap-6 min-h-0">
      <div className="w-64 shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Rôles</h2>
          {isAdmin && <Button size="sm" variant="outline" onClick={openCreate}><Plus size={13} /> Nouveau</Button>}
        </div>
        <div className="space-y-1.5">
          {sortedRoles.map((role) => {
            const isActive = selectedRole?.id === role.id;
            const isSuperAdmin = role.name === 'Super Admin';
            return (
              <button key={role.id} onClick={() => openRole(role)}
                className={`group w-full rounded-xl border px-3 py-2.5 text-left transition-all ${isActive ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-stone-200 bg-white hover:bg-stone-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isSuperAdmin ? <Shield size={14} className="shrink-0 text-indigo-600" /> : role.isSystem ? <Lock size={13} className="shrink-0 text-amber-500" /> : <Users size={13} className="shrink-0 text-slate-400" />}
                    <span className="truncate text-sm font-medium text-slate-800">{role.name}</span>
                  </div>
                  <ChevronRight size={13} className={`shrink-0 transition-transform ${isActive ? 'text-indigo-500 rotate-90' : 'text-slate-300'}`} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {isSuperAdmin && <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">Super Admin</span>}
                  {!isSuperAdmin && role.isSystem && <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">System</span>}
                  {!role.isActive && <span className="inline-flex items-center rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Désactivé</span>}
                  <span className="text-[10px] text-slate-400">{role._count.users} user(s) · {role.permissions.length} perms</span>
                </div>
                {isAdmin && (
                  <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {!isSuperAdmin && <button className="flex items-center gap-1 rounded-md border border-stone-200 px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700" onClick={() => openEdit(role)}><Pencil size={10} /> Edit</button>}
                    <button className="flex items-center gap-1 rounded-md border border-sky-200 px-2 py-0.5 text-[11px] text-sky-600 hover:bg-sky-50" onClick={() => cloneMutation.mutate(role.id)}><Copy size={10} /> Clone</button>
                    {!isSuperAdmin && <button className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors ${role.isActive ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`} onClick={() => toggleMutation.mutate(role.id)}>{role.isActive ? <ToggleRight size={10} /> : <ToggleLeft size={10} />}{role.isActive ? 'Disable' : 'Enable'}</button>}
                    {!role.isSystem && <button className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-500 hover:bg-red-50" onClick={() => deleteMutation.mutate(role.id)}><Trash2 size={10} /> Delete</button>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {!selectedRole ? (
          <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-stone-200 text-sm text-slate-400">
            Sélectionner un rôle pour modifier ses permissions
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {selectedRole.name === 'Super Admin' ? <Shield size={18} className="text-indigo-600" /> : selectedRole.isSystem ? <Lock size={16} className="text-amber-500" /> : <Users size={16} className="text-slate-500" />}
                  <h2 className="text-lg font-semibold text-slate-800">{selectedRole.name}</h2>
                </div>
              </div>
              {editable ? (
                <Button size="sm" loading={assignMutation.isPending} disabled={!dirty} onClick={() => assignMutation.mutate({ roleId: selectedRole.id, permissionIds: Array.from(selectedPerms) })}>
                  <Check size={14} /> Sauvegarder
                </Button>
              ) : (
                <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
                  <Lock size={12} /> Admin requis pour modifier
                </span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {ALL_ACTIONS.map((action) => (
                <span key={action} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${ACTION_CHECKED[action]}`}>{action}</span>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 w-36">Module</th>
                    {ALL_ACTIONS.map((a) => <th key={a} className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 w-24">{a}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sortedModules.map((mod, idx) => {
                    const modulePerms = Object.values(moduleMap[mod]);
                    const allChecked = modulePerms.every((p) => selectedPerms.has(p.id));
                    const someChecked = modulePerms.some((p) => selectedPerms.has(p.id));
                    return (
                      <tr key={mod} className={`border-b border-stone-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                        <td className="px-4 py-2.5">
                          <button disabled={!editable} onClick={() => toggleModule(modulePerms)}
                            className={`flex items-center gap-1.5 text-left font-medium ${editable ? 'cursor-pointer hover:text-indigo-600' : 'cursor-default'} ${allChecked ? 'text-indigo-700' : someChecked ? 'text-slate-700' : 'text-slate-400'}`}>
                            <span className={`inline-block h-2 w-2 rounded-full ${allChecked ? 'bg-indigo-500' : someChecked ? 'bg-amber-400' : 'bg-stone-200'}`} />
                            {MODULE_LABELS[mod] ?? mod}
                          </button>
                        </td>
                        {ALL_ACTIONS.map((action) => {
                          const perm = moduleMap[mod][action];
                          const checked = perm ? selectedPerms.has(perm.id) : false;
                          return (
                            <td key={action} className="px-3 py-2.5 text-center">
                              {perm ? (
                                <button disabled={!editable} onClick={() => togglePerm(perm.id)}
                                  className={`inline-flex h-7 w-16 items-center justify-center rounded-lg border text-[11px] font-semibold transition-all ${checked ? ACTION_CHECKED[action] : `${ACTION_COLORS[action]} opacity-40`} ${editable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}>
                                  {checked ? '✓' : action.slice(0, 3)}
                                </button>
                              ) : <span className="text-gray-200 text-xs">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={showRoleModal} onClose={() => { setShowRoleModal(false); setEditingRole(null); }} title={editingRole ? `Modifier: ${editingRole.name}` : 'Créer Rôle'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <Input label="Nom *" {...register('name')} error={errors.name?.message} />
          <Input label="Description" {...register('description')} />
          <p className="text-xs text-slate-500">Après création, sélectionnez le rôle pour lui assigner des permissions.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => { setShowRoleModal(false); setEditingRole(null); }}>Annuler</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editingRole ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Taxes Tab ────────────────────────────────────────────────────────────────

const taxSchema = z.object({
  name:        z.string().min(1, 'Requis'),
  code:        z.string().min(1, 'Requis'),
  rate:        z.coerce.number().min(0).max(100),
  description: z.string().optional(),
});
type TaxForm = z.infer<typeof taxSchema>;

const TAX_PRESETS = [
  { name: 'Exonéré',      code: 'EXEMPT',  rate: 0,     description: 'Exonéré de taxe' },
  { name: 'TVA 0%',       code: 'TVA_0',   rate: 0,     description: 'TVA taux zéro' },
  { name: 'TVA 5%',       code: 'TVA_5',   rate: 5,     description: 'TVA réduite 5%' },
  { name: 'TVA 19.25%',   code: 'TVA_1925',rate: 19.25, description: 'TVA Cameroun 19.25%' },
  { name: 'TVA 20%',      code: 'TVA_20',  rate: 20,    description: 'TVA standard 20%' },
];

function TaxesTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TaxCode | null>(null);

  const { data: taxes = [], isLoading } = useQuery({ queryKey: ['taxes'], queryFn: settingsService.listTaxes });
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TaxForm>({ resolver: zodResolver(taxSchema) as any });

  const openCreate = () => { reset({}); setEditing(null); setShowModal(true); };
  const openEdit   = (t: TaxCode) => { reset({ name: t.name, code: t.code, rate: t.rate, description: t.description }); setEditing(t); setShowModal(true); };
  const applyPreset = (p: typeof TAX_PRESETS[number]) => { setValue('name', p.name); setValue('code', p.code); setValue('rate', p.rate); setValue('description', p.description); };

  const saveMutation = useMutation({
    mutationFn: (d: TaxForm) => editing ? settingsService.updateTax(editing.id, d) : settingsService.createTax(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['taxes'] }); setShowModal(false); },
  });

  const toggleMutation = useMutation({
    mutationFn: (t: TaxCode) => settingsService.updateTax(t.id, { isActive: !t.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: settingsService.deleteTax,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taxes'] }),
  });

  if (isLoading) return <PageLoader />;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Codes TVA</h2>
          <p className="text-sm text-slate-500">Définir les taux de TVA et les assigner aux produits.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} /> Ajouter</Button>
      </div>
      {taxes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-200 py-12 text-center">
          <Percent size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Aucun code TVA</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}><Plus size={13} /> Créer</Button>
        </div>
      ) : (
        <Card>
          <Table>
            <Thead>
              <tr><Th>Nom</Th><Th>Code</Th><Th className="text-right">Taux</Th><Th>Description</Th><Th>Statut</Th><Th /></tr>
            </Thead>
            <Tbody>
              {taxes.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-semibold">{t.name}</Td>
                  <Td><span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs">{t.code}</span></Td>
                  <Td className="text-right font-bold text-indigo-700">{Number(t.rate).toFixed(2)}%</Td>
                  <Td className="text-slate-500 text-sm">{t.description ?? '—'}</Td>
                  <Td><Badge variant={t.isActive ? 'success' : 'default'}>{t.isActive ? 'Actif' : 'Inactif'}</Badge></Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Modifier</Button>
                      <Button variant="outline" size="sm" loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate(t)} className={t.isActive ? 'text-orange-600 border-orange-200' : 'text-emerald-600 border-emerald-200'}>{t.isActive ? 'Désact.' : 'Activer'}</Button>
                      <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(t.id)}><Trash2 size={12} /></Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier Code TVA' : 'Nouveau Code TVA'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          {!editing && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Préréglages :</p>
              <div className="flex flex-wrap gap-1.5">
                {TAX_PRESETS.map((p) => (
                  <button key={p.code} type="button" onClick={() => applyPreset(p)}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom *" error={errors.name?.message} {...register('name')} />
            <Input label="Code *" error={errors.code?.message} {...register('code')} />
          </div>
          <Input label="Taux (%) *" type="number" step="0.01" min="0" max="100" error={errors.rate?.message} {...register('rate')} />
          <Input label="Description" {...register('description')} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
