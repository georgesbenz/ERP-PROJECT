/**
 * Comprehensive demo seed — Groupe SAFIRA Distribution S.A.
 * Douala, Cameroun | founded 2015 | 10 years of history
 *
 * Run:  npx ts-node --transpile-only prisma/seed.ts
 * Wipes ALL existing data before inserting.
 */

import {
  PrismaClient,
  SaleStatus, PurchaseStatus,
  PaymentMethod, PaymentStatus,
  InvoiceType, InvoiceStatus,
  AccountType, JournalType, EntryStatus,
  MovementType,
  LeadStatus, OpportunityStatus, ActivityType,
  CampaignType, CampaignStatus,
  BudgetStatus, ApprovalStatus,
  ForecastType, KpiPeriod,
  TaskStatus, TaskPriority,
  GoalStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── helpers ─────────────────────────────────────────────────────────────────
const rnd  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const d    = (y: number, m: number, day: number) => new Date(y, m - 1, day, 10, 0, 0);
const rndDate = (y: number) => d(y, rnd(1, 12), rnd(1, 28));
const dec  = (n: number) => n.toFixed(2);
const dec4 = (n: number) => n.toFixed(4);

let sc = 1, pc = 1, ic = 1, pyc = 1, jec = 1;
const sRef  = (y: number) => `SAL-${y}-${String(sc++).padStart(4,'0')}`;
const pRef  = (y: number) => `PO-${y}-${String(pc++).padStart(4,'0')}`;
const iRef  = (y: number) => `INV-${y}-${String(ic++).padStart(4,'0')}`;
const pyRef = (y: number) => `PAY-${y}-${String(pyc++).padStart(5,'0')}`;
const jeRef = (y: number) => `JE-${y}-${String(jec++).padStart(5,'0')}`;

// ─── clear ────────────────────────────────────────────────────────────────────
async function clearAll() {
  console.log('🗑️  Clearing all data…');
  // Delete in safe order (most derived first)
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "audit_logs","activity_logs","notifications","event_logs","settings" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "approval_steps","approval_workflows" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "budget_revisions","budget_approvals","budget_allocations","budget_plans","budget_categories" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "goal_trackers","kpi_trackers","financial_analytics","revenue_analytics","expense_analytics","cash_flow_forecasts","forecasts" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "campaign_contacts","campaigns" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "crm_activities","notes","tasks","meetings","calls" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "leads","opportunities","pipeline_stages","pipelines" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "journal_entry_lines","journal_entries","journals","accounts" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "payments","invoices" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "sale_lines","sales" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "purchase_lines","purchases" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "inventory_movements","inventory" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "products","categories" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "suppliers","customers" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "warehouses" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "cost_centers","departments" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "user_permissions","role_permissions","user_roles" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "users","roles" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "branches","taxes" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "tenants" CASCADE');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "permissions" CASCADE');
  console.log('✅  All data cleared.');
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  await clearAll();

  // ── 1. Permissions ──────────────────────────────────────────────────────────
  console.log('  → Seeding permissions…');
  const MODULES  = ['users','inventory','sales','purchases','finance','crm','analytics','budgeting','pos','settings','reports'];
  const ACTIONS  = ['READ','CREATE','UPDATE','DELETE','APPROVE'] as const;
  const permMap  = new Map<string,string>();
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const p = await prisma.permission.create({ data: { module, action, description: `${action} ${module}` } });
      permMap.set(`${module}:${action}`, p.id);
    }
  }

  // ── 2. Tenant ───────────────────────────────────────────────────────────────
  console.log('  → Creating tenant…');
  const tenant = await prisma.tenant.create({ data: {
    name: 'Groupe SAFIRA Distribution S.A.', slug: 'safira',
    email: 'contact@safira-distribution.cm', phone: '+237 233 42 18 00',
    address: 'Immeuble SAFIRA, Rue de la Joie, Akwa', city: 'Douala', country: 'Cameroun',
    currency: 'XAF', locale: 'fr', timezone: 'Africa/Douala', plan: 'enterprise',
  }});
  const tid = tenant.id;

  // ── 3. Branches ─────────────────────────────────────────────────────────────
  const bHQ = await prisma.branch.create({ data: { tenantId: tid, name: 'Siège Social – Akwa', code: 'HQ', address: 'Rue de la Joie, Akwa', city: 'Douala', isMain: true } });
  const bBona = await prisma.branch.create({ data: { tenantId: tid, name: 'Dépôt Bonaberi', code: 'BON', address: 'Zone Industrielle', city: 'Douala-Bonaberi' } });
  const bYde = await prisma.branch.create({ data: { tenantId: tid, name: 'Bureau de Yaoundé', code: 'YDE', address: 'Rue de la Réunification, Bastos', city: 'Yaoundé' } });

  // ── 4. Warehouses ───────────────────────────────────────────────────────────
  const wMain = await prisma.warehouse.create({ data: { tenantId: tid, branchId: bHQ.id,   name: 'Entrepôt Principal – Akwa',  code: 'WH-AKW', isDefault: true } });
  const wBona = await prisma.warehouse.create({ data: { tenantId: tid, branchId: bBona.id, name: 'Entrepôt Bonaberi',           code: 'WH-BON' } });
  const wYde  = await prisma.warehouse.create({ data: { tenantId: tid, branchId: bYde.id,  name: 'Magasin Yaoundé',             code: 'WH-YDE' } });

  // ── 5. Taxes ─────────────────────────────────────────────────────────────────
  const taxExempt = await prisma.tax.create({ data: { tenantId: tid, name: 'Exonéré',  code: 'EXEMPT', rate: '0',     description: 'Exonération TVA' } });
  const taxTVA    = await prisma.tax.create({ data: { tenantId: tid, name: 'TVA 19.25%', code: 'TVA_19', rate: '19.25', description: 'TVA standard Cameroun' } });
  const taxTVA0   = await prisma.tax.create({ data: { tenantId: tid, name: 'TVA 0%',   code: 'TVA_0',  rate: '0',     description: 'TVA taux zéro' } });
  const taxes = [taxExempt, taxTVA, taxTVA0];

  // ── 6. Departments + Cost Centers ──────────────────────────────────────────
  const deptDir   = await prisma.department.create({ data: { tenantId: tid, name: 'Direction Générale',    code: 'DG'  } });
  const deptComm  = await prisma.department.create({ data: { tenantId: tid, name: 'Commerce & Ventes',     code: 'COM', parentId: deptDir.id } });
  const deptAchat = await prisma.department.create({ data: { tenantId: tid, name: 'Achats & Logistique',   code: 'ACH', parentId: deptDir.id } });
  const deptFin   = await prisma.department.create({ data: { tenantId: tid, name: 'Finance & Comptabilité',code: 'FIN', parentId: deptDir.id } });
  const deptStock = await prisma.department.create({ data: { tenantId: tid, name: 'Gestion des Stocks',    code: 'STK', parentId: deptAchat.id } });
  const deptRH    = await prisma.department.create({ data: { tenantId: tid, name: 'Ressources Humaines',   code: 'RH',  parentId: deptDir.id } });

  await prisma.costCenter.createMany({ data: [
    { tenantId: tid, departmentId: deptComm.id,  name: 'Ventes Douala',  code: 'CC-VDL' },
    { tenantId: tid, departmentId: deptComm.id,  name: 'Ventes Yaoundé', code: 'CC-VYD' },
    { tenantId: tid, departmentId: deptAchat.id, name: 'Achats Import',  code: 'CC-IMP' },
    { tenantId: tid, departmentId: deptFin.id,   name: 'Comptabilité',   code: 'CC-CPT' },
    { tenantId: tid, departmentId: deptStock.id, name: 'Logistique',     code: 'CC-LOG' },
  ]});

  // ── 7. Roles ─────────────────────────────────────────────────────────────────
  console.log('  → Creating roles…');
  const ROLE_PERMS: Record<string, string[][]> = {
    'Super Admin':          [[ ...MODULES, ], ['READ','CREATE','UPDATE','DELETE','APPROVE']],
    'Directeur Général':    [[ ...MODULES  ], ['READ','CREATE','UPDATE','DELETE','APPROVE']],
    'Finance Manager':      [['finance','budgeting','reports','analytics','purchases','sales','settings'], ['READ','CREATE','UPDATE','DELETE','APPROVE']],
    'Responsable Commercial':[['sales','crm','customers','pos','inventory','reports','analytics'], ['READ','CREATE','UPDATE','DELETE']],
    'Responsable Achats':   [['purchases','inventory','suppliers','reports'], ['READ','CREATE','UPDATE']],
    'Responsable Stock':    [['inventory','reports','analytics'], ['READ','CREATE','UPDATE','DELETE']],
    'RH Manager':           [['users','settings','reports'], ['READ','CREATE','UPDATE','DELETE']],
    'Chef de Département':  [['budgeting','reports','users','analytics'], ['READ','CREATE','UPDATE']],
    'Commercial':           [['sales','crm','pos','inventory'], ['READ','CREATE']],
    'Caissier':             [['pos','sales'], ['READ','CREATE']],
    'Comptable':            [['finance','reports','analytics'], ['READ','CREATE','UPDATE']],
    'Acheteur':             [['purchases','inventory'], ['READ','CREATE','UPDATE']],
    'Magasinier':           [['inventory'], ['READ','CREATE','UPDATE']],
    'Auditeur':             [[...MODULES], ['READ']],
    'Employé':              [['pos','sales','inventory'], ['READ']],
  };
  const roleMap = new Map<string,string>();
  for (const [roleName, [mods, acts]] of Object.entries(ROLE_PERMS)) {
    const role = await prisma.role.create({ data: { tenantId: tid, name: roleName, description: `${roleName} — rôle système`, isSystem: true } });
    roleMap.set(roleName, role.id);
    const ids = (mods as string[]).flatMap(m => (acts as string[]).map(a => permMap.get(`${m}:${a}`) || '')).filter(Boolean);
    await prisma.rolePermission.createMany({ data: [...new Set(ids)].map(permissionId => ({ roleId: role.id, permissionId })), skipDuplicates: true });
  }

  // ── 8. Users ─────────────────────────────────────────────────────────────────
  console.log('  → Creating users…');
  const DEMO_PWD = await bcrypt.hash('Safira@2024!', 10);

  const USERS_DEF = [
    { email: 'admin@safira.cm',         firstName: 'Jean-Baptiste', lastName: 'MBARGA',     role: 'Super Admin',           phone: '+237 699 00 01 00' },
    { email: 'dg@safira.cm',            firstName: 'Alphonse',      lastName: 'ESSOMBA',    role: 'Directeur Général',     phone: '+237 699 00 01 01' },
    { email: 'finance@safira.cm',       firstName: 'Marie-Claire',  lastName: 'FOUDA',      role: 'Finance Manager',       phone: '+237 677 00 02 00' },
    { email: 'commercial@safira.cm',    firstName: 'Emmanuel',      lastName: 'TCHINDA',    role: 'Responsable Commercial',phone: '+237 677 00 03 00' },
    { email: 'achats@safira.cm',        firstName: 'Bertrand',      lastName: 'NGUELE',     role: 'Responsable Achats',    phone: '+237 677 00 04 00' },
    { email: 'stock@safira.cm',         firstName: 'Solange',       lastName: 'EKWALLA',    role: 'Responsable Stock',     phone: '+237 677 00 05 00' },
    { email: 'rh@safira.cm',            firstName: 'Christelle',    lastName: 'BIYA',       role: 'RH Manager',            phone: '+237 677 00 06 00' },
    { email: 'chef.comm@safira.cm',     firstName: 'Patrick',       lastName: 'NKOLO',      role: 'Chef de Département',   phone: '+237 677 00 07 00' },
    { email: 'aurore.kamga@safira.cm',  firstName: 'Aurore',        lastName: 'KAMGA',      role: 'Commercial',            phone: '+237 677 00 08 00' },
    { email: 'fabrice.ondoa@safira.cm', firstName: 'Fabrice',       lastName: 'ONDOA',      role: 'Commercial',            phone: '+237 677 00 09 00' },
    { email: 'caisse@safira.cm',        firstName: 'Nadège',        lastName: 'ATANGANA',   role: 'Caissier',              phone: '+237 677 00 10 00' },
    { email: 'comptable@safira.cm',     firstName: 'Hervé',         lastName: 'MINKO',      role: 'Comptable',             phone: '+237 677 00 11 00' },
    { email: 'acheteur@safira.cm',      firstName: 'Rosalie',       lastName: 'MEDOU',      role: 'Acheteur',              phone: '+237 677 00 12 00' },
    { email: 'auditeur@safira.cm',      firstName: 'Paul',          lastName: 'ONDO',       role: 'Auditeur',              phone: '+237 677 00 13 00' },
    { email: 'magasin@safira.cm',       firstName: 'Boris',         lastName: 'ESSOME',     role: 'Magasinier',            phone: '+237 677 00 14 00' },
    { email: 'carine.nkoa@safira.cm',   firstName: 'Carine',        lastName: 'NKOA',       role: 'Commercial',            phone: '+237 677 00 15 00' },
  ];
  const userMap = new Map<string,string>(); // email → id
  for (const u of USERS_DEF) {
    const user = await prisma.user.create({ data: {
      tenantId: tid, email: u.email, passwordHash: DEMO_PWD,
      firstName: u.firstName, lastName: u.lastName, phone: u.phone, status: 'ACTIVE', emailVerified: true,
    }});
    userMap.set(u.email, user.id);
    const roleId = roleMap.get(u.role);
    if (roleId) await prisma.userRole.create({ data: { userId: user.id, roleId } });
  }
  const adminId = userMap.get('admin@safira.cm')!;
  const salesMgrId = userMap.get('commercial@safira.cm')!;
  const procId  = userMap.get('achats@safira.cm')!;
  const salesIds = [
    userMap.get('aurore.kamga@safira.cm')!,
    userMap.get('fabrice.ondoa@safira.cm')!,
    userMap.get('carine.nkoa@safira.cm')!,
    userMap.get('commercial@safira.cm')!,
  ];

  // ── 9. Chart of Accounts ────────────────────────────────────────────────────
  console.log('  → Creating chart of accounts…');
  const acctData = [
    // Assets
    { code:'101',  name:'Capital social',              type: AccountType.EQUITY   },
    { code:'111',  name:'Réserves légales',             type: AccountType.EQUITY   },
    { code:'12',   name:'Report à nouveau',             type: AccountType.EQUITY   },
    { code:'20',   name:'Immobilisations incorporelles',type: AccountType.ASSET    },
    { code:'22',   name:'Terrains',                     type: AccountType.ASSET    },
    { code:'24',   name:'Matériel et mobilier',         type: AccountType.ASSET    },
    { code:'311',  name:'Stocks de marchandises',       type: AccountType.ASSET    },
    { code:'401',  name:'Fournisseurs',                 type: AccountType.LIABILITY},
    { code:'411',  name:'Clients',                      type: AccountType.ASSET    },
    { code:'421',  name:'Personnel – salaires',         type: AccountType.LIABILITY},
    { code:'4411', name:'TVA déductible',               type: AccountType.ASSET    },
    { code:'4431', name:'TVA collectée',                type: AccountType.LIABILITY},
    { code:'447',  name:'Impôts sur bénéfices',         type: AccountType.LIABILITY},
    { code:'521',  name:'Banque – BICEC',               type: AccountType.ASSET    },
    { code:'522',  name:'Banque – Afriland First Bank',  type: AccountType.ASSET   },
    { code:'5711', name:'Caisse principale',            type: AccountType.ASSET    },
    { code:'5712', name:'Caisse Mobile Money',          type: AccountType.ASSET    },
    { code:'601',  name:'Achats de marchandises',       type: AccountType.EXPENSE  },
    { code:'6011', name:'Achats consommables',          type: AccountType.EXPENSE  },
    { code:'6241', name:'Transport et fret',            type: AccountType.EXPENSE  },
    { code:'641',  name:'Impôts et taxes',              type: AccountType.EXPENSE  },
    { code:'661',  name:'Intérêts et charges financières',type: AccountType.EXPENSE},
    { code:'6221', name:'Charges de personnel',        type: AccountType.EXPENSE  },
    { code:'701',  name:'Ventes de marchandises',       type: AccountType.REVENUE  },
    { code:'706',  name:'Prestations de services',      type: AccountType.REVENUE  },
    { code:'761',  name:'Produits financiers',          type: AccountType.REVENUE  },
  ];
  const acctMap = new Map<string,string>(); // code → id
  for (const a of acctData) {
    const acct = await prisma.account.create({ data: { tenantId: tid, code: a.code, name: a.name, type: a.type, isActive: true } });
    acctMap.set(a.code, acct.id);
  }

  // ── 10. Journals ────────────────────────────────────────────────────────────
  const journals: Record<string,string> = {};
  for (const [code,name,type,isDefault] of [
    ['JV','Journal des Ventes',   JournalType.SALES,    true ],
    ['JA','Journal des Achats',   JournalType.PURCHASES,true ],
    ['JC','Journal de Caisse',    JournalType.CASH,     true ],
    ['JB','Journal de Banque',    JournalType.BANK,     false],
    ['JG','Journal Général',      JournalType.GENERAL,  false],
  ] as const) {
    const j = await prisma.journal.create({ data: { tenantId: tid, code, name, type, isDefault, isActive: true } });
    journals[code] = j.id;
  }

  // ── 11. Categories ──────────────────────────────────────────────────────────
  console.log('  → Creating product categories…');
  const catDefs = [
    { name:'Électronique Grand Public', slug:'electronique'    },
    { name:'Informatique & Réseaux',    slug:'informatique'    },
    { name:'Fournitures de Bureau',     slug:'fournitures'     },
    { name:'Électroménager',            slug:'electromenager'  },
    { name:'Consommables & Accessoires',slug:'consommables'    },
  ];
  const catMap = new Map<string,string>(); // slug → id
  for (const c of catDefs) {
    const cat = await prisma.category.create({ data: { tenantId: tid, ...c, isActive: true } });
    catMap.set(c.slug, cat.id);
  }

  // ── 12. Products ─────────────────────────────────────────────────────────────
  console.log('  → Creating products…');
  type ProdDef = { name:string; sku:string; cost:number; sale:number; cat:string; tax:string; uom?:string; min?:number; };
  const PROD_DEFS: ProdDef[] = [
    // Électronique
    { name:'Téléviseur Samsung 43" 4K UHD',sku:'TV-SAM-43',cost:195000,sale:249000,cat:'electronique',tax:'TVA_19',min:3 },
    { name:'Téléviseur LG 32" Full HD',     sku:'TV-LG-32', cost:125000,sale:165000,cat:'electronique',tax:'TVA_19',min:3 },
    { name:'Téléviseur Sony 55" Smart',     sku:'TV-SON-55',cost:325000,sale:415000,cat:'electronique',tax:'TVA_19',min:2 },
    { name:'Smartphone Samsung Galaxy A54', sku:'GSM-A54',  cost:155000,sale:199000,cat:'electronique',tax:'TVA_19',min:5 },
    { name:'Smartphone iPhone 14 128GB',    sku:'GSM-IP14', cost:410000,sale:520000,cat:'electronique',tax:'TVA_19',min:3 },
    { name:'Smartphone Tecno Camon 20',     sku:'GSM-TC20', cost:68000, sale:89000, cat:'electronique',tax:'TVA_19',min:8 },
    { name:'Climatiseur Daikin 1.5 HP Split',sku:'AC-DAI-15',cost:285000,sale:365000,cat:'electronique',tax:'TVA_19',min:2 },
    { name:'Climatiseur Midea 2 HP Inverter',sku:'AC-MID-20',cost:345000,sale:445000,cat:'electronique',tax:'TVA_19',min:2 },
    { name:'Réfrigérateur Samsung 200L No-Frost',sku:'RF-SAM-200',cost:185000,sale:245000,cat:'electronique',tax:'TVA_19',min:2 },
    { name:'Machine à laver LG 7 kg',       sku:'WM-LG-7',  cost:215000,sale:279000,cat:'electronique',tax:'TVA_19',min:2 },
    // Informatique
    { name:'Laptop Dell Inspiron 15 i5',    sku:'PC-DEL-I5',cost:345000,sale:449000,cat:'informatique',tax:'TVA_19',min:3 },
    { name:'Laptop HP Pavilion 14 i7',      sku:'PC-HP-I7', cost:395000,sale:519000,cat:'informatique',tax:'TVA_19',min:3 },
    { name:'Laptop Lenovo IdeaPad 3',       sku:'PC-LEN-3',cost:265000, sale:345000,cat:'informatique',tax:'TVA_19',min:3 },
    { name:'Tablette Samsung Galaxy Tab A8',sku:'TAB-SAM-A8',cost:125000,sale:165000,cat:'informatique',tax:'TVA_19',min:4 },
    { name:'Moniteur Dell 24" Full HD',     sku:'MON-DEL-24',cost:95000,sale:129000,cat:'informatique',tax:'TVA_19',min:4 },
    { name:'Imprimante HP LaserJet M110w',  sku:'PRT-HP-LJ',cost:95000, sale:135000,cat:'informatique',tax:'TVA_19',min:3 },
    { name:'Imprimante Canon PIXMA G3420',  sku:'PRT-CAN-G3',cost:78000,sale:105000,cat:'informatique',tax:'TVA_19',min:3 },
    { name:'Onduleur APC Back-UPS 650VA',   sku:'UPS-APC-650',cost:42000,sale:58000,cat:'informatique',tax:'TVA_19',min:5 },
    { name:'Switch réseau D-Link 8 ports',  sku:'SW-DLK-8',cost:18500,  sale:26000,cat:'informatique',tax:'TVA_19',min:5 },
    { name:'Disque dur externe WD 1TB',     sku:'HDD-WD-1T',cost:38000, sale:52000,cat:'informatique',tax:'TVA_19',min:5 },
    // Fournitures
    { name:'Ramette papier A4 80g 500 feuilles',sku:'PAP-A4-80',cost:2500,sale:3500,cat:'fournitures',tax:'TVA_19',min:50,uom:'ream' },
    { name:'Stylo bille Bic cristal (boîte 50)', sku:'STY-BIC-50',cost:1800,sale:2500,cat:'fournitures',tax:'TVA_19',min:20,uom:'box' },
    { name:'Classeur levier A4 (lot de 10)',     sku:'CLS-A4-10',cost:5500,sale:7500,cat:'fournitures',tax:'TVA_19',min:10,uom:'lot' },
    { name:'Agrafeuse standard Rapid',           sku:'AGR-RAP-01',cost:3500,sale:5000,cat:'fournitures',tax:'TVA_19',min:10 },
    { name:'Calculatrice Casio FX-82',           sku:'CAL-CAS-82',cost:8500,sale:12000,cat:'fournitures',tax:'TVA_19',min:8 },
    { name:'Marqueur permanent Edding (lot 10)', sku:'MRQ-EDD-10',cost:4500,sale:6500,cat:'fournitures',tax:'TVA_19',min:10,uom:'lot' },
    { name:'Tableau blanc 90×120 cm',            sku:'TBL-BLC-90',cost:28000,sale:38000,cat:'fournitures',tax:'TVA_19',min:3 },
    { name:'Cartouche HP 803 Noir',              sku:'CTG-HP-803N',cost:7500,sale:11000,cat:'fournitures',tax:'TVA_19',min:15 },
    { name:'Cartouche HP 803 Couleur',           sku:'CTG-HP-803C',cost:8500,sale:12500,cat:'fournitures',tax:'TVA_19',min:12 },
    { name:'Toner HP LaserJet 85A',              sku:'TNR-HP-85A',cost:18500,sale:25000,cat:'fournitures',tax:'TVA_19',min:8 },
    // Électroménager
    { name:'Micro-ondes Samsung 20L',            sku:'MW-SAM-20',cost:52000,sale:69000,cat:'electromenager',tax:'TVA_19',min:3 },
    { name:'Ventilateur de table Binatone',      sku:'VNT-BIN-01',cost:8500,sale:12500,cat:'electromenager',tax:'TVA_19',min:10 },
    { name:'Fer à repasser Philips GC1905',      sku:'FER-PHI-GC',cost:15000,sale:21500,cat:'electromenager',tax:'TVA_19',min:8 },
    { name:'Mixeur Moulinex LM241',              sku:'MIX-MOU-LM',cost:22000,sale:31000,cat:'electromenager',tax:'TVA_19',min:5 },
    { name:'Chauffe-eau électrique Ariston 50L', sku:'CHE-ARS-50',cost:68000,sale:89000,cat:'electromenager',tax:'TVA_19',min:3 },
    { name:'Gazinière Thermogatz 4 feux',        sku:'GAZ-THG-4F',cost:85000,sale:115000,cat:'electromenager',tax:'TVA_19',min:3 },
    { name:'Cafetière Moulinex FG1M28',          sku:'CAF-MOU-FG',cost:18000,sale:26000,cat:'electromenager',tax:'TVA_19',min:5 },
    // Consommables
    { name:'Batterie AA Duracell (lot 4)',        sku:'BAT-DUR-AA4',cost:1200,sale:1800,cat:'consommables',tax:'TVA_19',min:50,uom:'lot' },
    { name:'Pile 9V Energizer',                  sku:'BAT-ENE-9V',cost:950,sale:1500,cat:'consommables',tax:'TVA_19',min:30 },
    { name:'Câble HDMI 2m haute vitesse',        sku:'CBL-HDMI-2M',cost:2500,sale:4000,cat:'consommables',tax:'TVA_19',min:20 },
    { name:'Câble USB-C 1m charge rapide',       sku:'CBL-USBC-1M',cost:1800,sale:3000,cat:'consommables',tax:'TVA_19',min:25 },
    { name:'Ruban adhésif Scotch 19mm (lot 6)',  sku:'SCT-19-6',cost:2200,sale:3200,cat:'consommables',tax:'TVA_19',min:20,uom:'lot' },
    { name:'CD-R Verbatim 700MB (lot 25)',       sku:'CDR-VBT-25',cost:3500,sale:5500,cat:'consommables',tax:'EXEMPT',min:10,uom:'lot' },
    { name:'Clé USB SanDisk 32GB',               sku:'USB-SDK-32',cost:5500,sale:8000,cat:'consommables',tax:'TVA_19',min:15 },
    { name:'Clé USB Kingston 64GB',              sku:'USB-KNG-64',cost:9500,sale:13500,cat:'consommables',tax:'TVA_19',min:10 },
    { name:'Souris optique Logitech M100',       sku:'MOU-LOG-M1',cost:7500,sale:11000,cat:'consommables',tax:'TVA_19',min:10 },
    { name:'Clavier HP USB azerty',             sku:'CLV-HP-USB',cost:9500,sale:14000,cat:'consommables',tax:'TVA_19',min:8 },
    { name:'Recharge gaz Camping-Gaz 250g',     sku:'GAZ-CMP-250',cost:2800,sale:3900,cat:'consommables',tax:'EXEMPT',min:30 },
    { name:'Ampoule LED Philips 9W E27',        sku:'AMP-PHI-9W',cost:1500,sale:2200,cat:'consommables',tax:'TVA_19',min:40 },
    { name:'Multiprise 5 prises Legrand',       sku:'MPR-LEG-5P',cost:8500,sale:13000,cat:'consommables',tax:'TVA_19',min:10 },
  ];

  const prodMap = new Map<string,{id:string;cost:number;sale:number}>();
  const prodIds: string[] = [];
  for (const p of PROD_DEFS) {
    const taxRec = taxes.find(t => t.code === p.tax) || taxTVA;
    const prod = await prisma.product.create({ data: {
      tenantId: tid, categoryId: catMap.get(p.cat),
      name: p.name, sku: p.sku, unitOfMeasure: p.uom || 'pcs',
      costPrice: dec4(p.cost), salePrice: dec4(p.sale),
      minStock: dec4(p.min || 5), taxId: taxRec.id, isActive: true,
    }});
    prodMap.set(p.sku, { id: prod.id, cost: p.cost, sale: p.sale });
    prodIds.push(prod.id);
  }

  // ── 13. Suppliers (50) ───────────────────────────────────────────────────────
  console.log('  → Creating 50 suppliers…');
  const SUP_DEFS = [
    // Electronics / Appareils
    ['SUP-001','Samsung Electronics Cameroun',    'samsung.cm@b2b.com',     '+237 233 01 01 01','Douala','Cameroun','SAM-CM-2015001'],
    ['SUP-002','LG Africa Distribution',           'lgafrica@distribution.cm','+237 233 01 02 00','Douala','Cameroun','LGA-DLA-2015002'],
    ['SUP-003','Sony Africa Corporation',          'sony.africa@sales.com',   '+237 233 01 03 00','Douala','Cameroun','SNY-AFR-2015003'],
    ['SUP-004','Huawei Technologies Cameroun',     'huawei.cm@enterprise.com','+237 233 01 04 00','Yaoundé','Cameroun','HWI-CM-2015004'],
    ['SUP-005','Midea Climate Technologies',       'midea.africa@dist.com',   '+237 233 01 05 00','Douala','Cameroun','MDA-AFR-2015005'],
    ['SUP-006','Daikin Air Conditioning Africa',   'daikin.africa@sales.cm',  '+237 233 01 06 00','Douala','Cameroun','DAI-AFR-2015006'],
    ['SUP-007','Philips Consumer Lifestyle Africa',  'philips.cm@b2b.com',    '+237 233 01 07 00','Douala','Cameroun','PHL-AFR-2015007'],
    ['SUP-008','Whirlpool Africa Distribution',    'whirlpool@africa.dist',   '+33 1 42 00 07 01','Paris','France',   'WHP-FRA-2015008'],
    ['SUP-009','Nasco Electronics Ghana',          'nasco@electronics.gh',    '+233 30 221 0009','Accra','Ghana',    'NAS-GHA-2015009'],
    ['SUP-010','ORCA Technologies CI',             'orca@tech.ci',            '+225 27 20 10 00 10','Abidjan','Côte d\'Ivoire','ORC-CI-2015010'],
    // IT & Computers
    ['SUP-011','HP Inc Africa Partners',           'hp.africa@partners.com',  '+237 233 02 01 00','Douala','Cameroun','HP-AFR-2015011'],
    ['SUP-012','Dell Technologies West Africa',    'dell.westafrica@dell.com','+234 1 270 1200','Lagos','Nigeria',  'DEL-NGA-2015012'],
    ['SUP-013','Lenovo Business Africa',           'lenovo.africa@lenovo.com','+27 11 217 0013','Johannesburg','Afrique du Sud','LNV-ZAF-2015013'],
    ['SUP-014','Acer Africa Distribution',         'acer.africa@acer.com',    '+237 233 02 04 00','Douala','Cameroun','ACR-AFR-2015014'],
    ['SUP-015','Canon West Africa',                'canon.westafrica@canon.cm','+237 233 02 05 00','Douala','Cameroun','CAN-AFR-2015015'],
    ['SUP-016','Epson Africa & Middle East',       'epson.ame@epson.com',     '+971 4 270 0016','Dubaï','EAU',       'EPS-UAE-2015016'],
    ['SUP-017','D-Link Africa',                    'dlink.africa@dlink.com',  '+27 11 217 0017','Johannesburg','Afrique du Sud','DLK-ZAF-2015017'],
    ['SUP-018','APC – Schneider Electric Africa',  'apc.africa@se.com',       '+237 233 02 08 00','Douala','Cameroun','APC-AFR-2015018'],
    ['SUP-019','WD Technologies Africa',           'wd.africa@wdc.com',       '+27 11 217 0019','Johannesburg','Afrique du Sud','WD-ZAF-2015019'],
    ['SUP-020','Verbatim Products Africa',         'verbatim.africa@cmedia.com','+237 233 02 10 00','Douala','Cameroun','VBT-AFR-2015020'],
    // Office Supplies
    ['SUP-021','Bic Group Afrique Centrale',       'bic.afrcent@bic.cm',      '+237 233 03 01 00','Douala','Cameroun','BIC-CM-2015021'],
    ['SUP-022','3M Cameroun SARL',                 '3m.cameroun@3m.com',      '+237 233 03 02 00','Douala','Cameroun','3M-CM-2015022'],
    ['SUP-023','Esselte Leitz Africa',             'leitz.africa@esselte.com','+49 711 4501 0023','Stuttgart','Allemagne','ESS-GER-2015023'],
    ['SUP-024','Rapid Office Cameroun',            'rapid.office@cm.dist',    '+237 233 03 04 00','Douala','Cameroun','RPD-CM-2015024'],
    ['SUP-025','Casio Africa',                     'casio.africa@casio.com',  '+237 233 03 05 00','Douala','Cameroun','CAS-AFR-2015025'],
    ['SUP-026','EDDING International',             'edding@markers.cm',       '+49 4122 977 0026','Ahrensburg','Allemagne','EDD-GER-2015026'],
    ['SUP-027','Bi-Office Afrique',                'bioffice.africa@bi-office.cm','+237 233 03 07 00','Douala','Cameroun','BIO-CM-2015027'],
    ['SUP-028','Post-It / 3M Stationery',          'postit.africa@3m.com',    '+237 233 03 08 00','Douala','Cameroun','PIT-CM-2015028'],
    ['SUP-029','Schneider Writing Instruments',    'schneider@writing.cm',    '+49 7420 9300029','Schramberg','Allemagne','SCH-GER-2015029'],
    ['SUP-030','Exacompta Clairefontaine SA',      'exacompta@clairef.fr',    '+33 1 56 02 03 30','Paris','France',   'EXA-FRA-2015030'],
    // Appliances
    ['SUP-031','Moulinex – SEB Group Africa',      'moulinex.africa@seb.cm',  '+237 233 04 01 00','Douala','Cameroun','MOU-AFR-2015031'],
    ['SUP-032','Ariston Thermo Cameroun',          'ariston.cm@aristonthermo.cm','+237 233 04 02 00','Douala','Cameroun','ARS-CM-2015032'],
    ['SUP-033','Thermogatz West Africa',           'thermogatz@westafrica.cm','+234 1 270 3200','Lagos','Nigeria',  'TGZ-NGA-2015033'],
    ['SUP-034','Binatone Electronics Africa',      'binatone.africa@bel.cm',  '+237 233 04 04 00','Douala','Cameroun','BIN-CM-2015034'],
    ['SUP-035','Bosch Électroménager Cameroun',    'bosch.cm@bosch.com',      '+237 233 04 05 00','Douala','Cameroun','BSH-CM-2015035'],
    ['SUP-036','Indesit Distribution Afrique',     'indesit.africa@indesit.fr','+33 4 72 00 36 00','Lyon','France',  'IND-FRA-2015036'],
    ['SUP-037','Tefal / SEB Cameroun',             'tefal.cameroun@seb.com',  '+237 233 04 07 00','Douala','Cameroun','TFL-CM-2015037'],
    ['SUP-038','Kenwood Electronics Africa',       'kenwood.africa@kenwoodworld.cm','+237 233 04 08 00','Douala','Cameroun','KNW-CM-2015038'],
    // Consumables
    ['SUP-039','Duracell – P&G Africa',            'duracell.africa@pg.com',  '+237 233 05 01 00','Douala','Cameroun','DUR-AFR-2015039'],
    ['SUP-040','Energizer Holdings Africa',        'energizer.africa@energizer.cm','+237 233 05 02 00','Douala','Cameroun','ENE-AFR-2015040'],
    ['SUP-041','SanDisk – Western Digital',        'sandisk.africa@wdc.cm',   '+237 233 05 03 00','Douala','Cameroun','SDK-AFR-2015041'],
    ['SUP-042','Kingston Technology Africa',       'kingston.africa@kingston.cm','+237 233 05 04 00','Douala','Cameroun','KST-AFR-2015042'],
    ['SUP-043','Logitech Africa Distribution',     'logitech.africa@logitech.cm','+237 233 05 05 00','Douala','Cameroun','LGT-AFR-2015043'],
    ['SUP-044','Schneider Electric Africa',        'schneider.elec@se.cm',    '+237 233 05 06 00','Douala','Cameroun','SEL-AFR-2015044'],
    ['SUP-045','Legrand Cameroun',                 'legrand.cm@legrand.com',  '+237 233 05 07 00','Douala','Cameroun','LEG-CM-2015045'],
    ['SUP-046','Philips Lighting Africa',          'philips.light@philips.cm','+237 233 05 08 00','Douala','Cameroun','PLG-AFR-2015046'],
    ['SUP-047','Campingaz – Coleman Africa',       'campingaz.africa@coleman.cm','+237 233 05 09 00','Douala','Cameroun','CPG-AFR-2015047'],
    ['SUP-048','SOREPCO Distribution Cameroun',    'sorepco@distribution.cm', '+237 233 05 10 00','Douala','Cameroun','SRP-CM-2015048'],
    ['SUP-049','CONGELCAM Import-Export',          'congelcam@import-export.cm','+237 233 05 11 00','Douala','Cameroun','CGC-CM-2015049'],
    ['SUP-050','China Electronics Import Corp.',   'ceic@chinaelec.cn',       '+86 10 6870 0050','Pékin','Chine',    'CEI-CHN-2015050'],
  ];
  const supIds: string[] = [];
  for (const [code,name,email,phone,city,country,taxNumber] of SUP_DEFS) {
    const s = await prisma.supplier.create({ data: {
      tenantId: tid, code, name, email, phone, city, country, taxNumber,
      creditLimit: dec(rnd(5,50) * 1000000), paymentTerms: pick([30,45,60,90]), isActive: true,
    }});
    supIds.push(s.id);
  }

  // ── 14. Customers (60) ───────────────────────────────────────────────────────
  console.log('  → Creating 60 customers…');
  const CUST_DEFS = [
    // Entreprises privées
    ['CLI-001','Total Energies Cameroun',        'achats@totalenergies.cm',   '+237 233 50 01 00','Douala',  'Cameroun','TEC-2015-001',2000000,30],
    ['CLI-002','MTN Cameroun',                   'procurement@mtn.cm',        '+237 233 50 02 00','Douala',  'Cameroun','MTN-CM-2015002',5000000,60],
    ['CLI-003','Orange Cameroun S.A.',           'achats@orange.cm',          '+237 233 50 03 00','Douala',  'Cameroun','OCM-2015-003',3000000,45],
    ['CLI-004','Société Générale Cameroun',      'achats@sgcameroun.cm',      '+237 233 50 04 00','Douala',  'Cameroun','SGC-2015-004',2500000,30],
    ['CLI-005','Afriland First Bank',             'procurement@afrilandfb.cm', '+237 233 50 05 00','Yaoundé', 'Cameroun','AFB-2015-005',2000000,30],
    ['CLI-006','BRASSERIES DU CAMEROUN',          'approvisionnements@brasseries.cm','+237 233 50 06 00','Douala','Cameroun','BRA-CM-2015006',4000000,60],
    ['CLI-007','Chanas Assurances',               'logistique@chanas.cm',      '+237 233 50 07 00','Yaoundé', 'Cameroun','CHA-2015-007',1500000,30],
    ['CLI-008','SABC – Société Anonyme des Brasseries',  'achats@sabc.cm',  '+237 233 50 08 00','Douala',  'Cameroun','SABC-2015-008',3500000,45],
    ['CLI-009','Guinness Cameroun S.A.',          'procurement@guinness.cm',   '+237 233 50 09 00','Douala',  'Cameroun','GCS-2015-009',3000000,45],
    ['CLI-010','Groupe Fotso',                    'direction@groupefotso.cm',  '+237 233 50 10 00','Bafoussam','Cameroun','GF-2015-010',5000000,60],
    ['CLI-011','Société Commerciale de Banque',   'achats@scbcameroun.cm',     '+237 233 50 11 00','Douala',  'Cameroun','SCB-2015-011',2000000,30],
    ['CLI-012','Prometal Cameroun',               'approvisionnement@prometal.cm','+237 233 50 12 00','Douala','Cameroun','PRO-CM-2015012',1800000,30],
    ['CLI-013','DHL Express Cameroun',            'procurement@dhl.cm',        '+237 233 50 13 00','Douala',  'Cameroun','DHL-CM-2015013',1500000,30],
    ['CLI-014','Bolloré Transport Logistics',     'achats@bollore.cm',         '+237 233 50 14 00','Douala',  'Cameroun','BTL-2015-014',3000000,45],
    ['CLI-015','CAMTEL',                          'materiel@camtel.cm',        '+237 233 50 15 00','Yaoundé', 'Cameroun','CAM-TEL-2015015',4000000,60],
    // PME locales
    ['CLI-016','Cabinet Médical La Providence',   'admin@laprovidence.cm',     '+237 677 16 00 00','Douala',  'Cameroun','CML-2015-016',500000,30],
    ['CLI-017','École Bilingue du Littoral',      'direction@ebl.cm',          '+237 677 17 00 00','Douala',  'Cameroun','EBL-2015-017',400000,30],
    ['CLI-018','Hôtel des Cocotiers',              'reception@hotelcocotiers.cm','+237 677 18 00 00','Kribi',  'Cameroun','HDC-2015-018',800000,30],
    ['CLI-019','Clinique du Progrès',             'comptabilite@cliproges.cm', '+237 677 19 00 00','Douala',  'Cameroun','CLP-2015-019',600000,30],
    ['CLI-020','Librairie des Grandes Écoles',    'commandes@lge.cm',          '+237 677 20 00 00','Yaoundé', 'Cameroun','LGE-2015-020',300000,30],
    ['CLI-021','Pharmacie Centrale Akwa',         'gerant@pharmacie-akwa.cm',  '+237 677 21 00 00','Douala',  'Cameroun','PCA-2015-021',400000,30],
    ['CLI-022','Restaurant Le Belvédère',         'direction@belvedere.cm',    '+237 677 22 00 00','Yaoundé', 'Cameroun','RLB-2015-022',350000,30],
    ['CLI-023','Auto-École Star',                 'direction@autoecole-star.cm','+237 677 23 00 00','Douala', 'Cameroun','AES-2015-023',250000,30],
    ['CLI-024','Centre de Santé Saint-Luc',       'admin@sainluc.cm',          '+237 677 24 00 00','Ngaoundéré','Cameroun','CSL-2015-024',450000,30],
    ['CLI-025','Agence Immobilière Habitat+',     'contact@habitatplus.cm',    '+237 677 25 00 00','Douala',  'Cameroun','AIH-2015-025',600000,30],
    // ONG et institutions
    ['CLI-026','UNICEF Cameroun',                 'procurement.cm@unicef.org', '+237 222 50 26 00','Yaoundé', 'Cameroun','UNI-CM-2015026',2000000,45],
    ['CLI-027','OMS – Bureau Cameroun',           'cmr@who.int',               '+237 222 50 27 00','Yaoundé', 'Cameroun','OMS-CM-2015027',1500000,45],
    ['CLI-028','Plan International Cameroun',     'logistics@plan-cm.org',     '+237 222 50 28 00','Yaoundé', 'Cameroun','PIC-2015-028',1200000,30],
    ['CLI-029','GIZ Cameroun',                    'procurement@giz.cm',        '+237 222 50 29 00','Yaoundé', 'Cameroun','GIZ-CM-2015029',1800000,45],
    ['CLI-030','UNFPA Cameroun',                  'cmr@unfpa.org',             '+237 222 50 30 00','Yaoundé', 'Cameroun','UNF-CM-2015030',1200000,45],
    // Administrations publiques
    ['CLI-031','Ministère de l\'Éducation Nationale','matradam@minesec.gov.cm','+237 222 23 00 31','Yaoundé', 'Cameroun','MEN-CM-2015031',5000000,90],
    ['CLI-032','Ministère de la Santé Publique',  'daj@minsante.gov.cm',       '+237 222 23 00 32','Yaoundé', 'Cameroun','MSP-CM-2015032',4000000,90],
    ['CLI-033','Mairie de Douala 1er',            'secretariat@mairie-dla1.cm','+237 233 42 00 33','Douala',  'Cameroun','MDL-2015-033',3000000,60],
    ['CLI-034','Communauté Urbaine de Yaoundé',   'daf@cuy.cm',                '+237 222 23 00 34','Yaoundé', 'Cameroun','CUY-2015-034',3500000,60],
    ['CLI-035','Université de Douala',            'dag@univ-douala.cm',        '+237 233 40 00 35','Douala',  'Cameroun','UD-2015-035', 2500000,60],
    // Clients moyens
    ['CLI-036','Tech Solutions Cameroun',         'achats@techsolutions.cm',   '+237 677 36 00 00','Douala',  'Cameroun','TSC-2015-036',800000,30],
    ['CLI-037','Bureau Équipements Plus',         'commandes@be-plus.cm',      '+237 677 37 00 00','Douala',  'Cameroun','BEP-2015-037',600000,30],
    ['CLI-038','Cyber Café Le Connecté',          'gerant@leconnecte.cm',      '+237 677 38 00 00','Douala',  'Cameroun','CCL-2015-038',300000,30],
    ['CLI-039','Studio Photo Lumière',            'contact@studiolumiere.cm',  '+237 677 39 00 00','Yaoundé', 'Cameroun','SPL-2015-039',350000,30],
    ['CLI-040','Imprimerie Presse-Éclair',        'direction@presse-eclair.cm','+237 677 40 00 00','Douala',  'Cameroun','IPE-2015-040',500000,30],
    ['CLI-041','Centre de Formation Profess. ITD',  'admin@itd.cm',            '+237 677 41 00 00','Douala',  'Cameroun','CFP-2015-041',400000,30],
    ['CLI-042','Salon de Beauté Élégance',        'contact@elegance.cm',       '+237 677 42 00 00','Yaoundé', 'Cameroun','SBE-2015-042',200000,30],
    ['CLI-043','Transport Express Wouri',         'achats@tewouri.cm',         '+237 677 43 00 00','Douala',  'Cameroun','TEW-2015-043',600000,30],
    ['CLI-044','Groupe Scolaire Bilingue NGWA',   'direction@gsb-ngwa.cm',     '+237 677 44 00 00','Douala',  'Cameroun','GSN-2015-044',400000,30],
    ['CLI-045','Maison de Retraite Espérance',    'admin@esperance-retraite.cm','+237 677 45 00 00','Douala', 'Cameroun','MRE-2015-045',350000,30],
    // Particuliers importants
    ['CLI-046','M. Dieudonné NKENGNE',            'dnkengne@gmail.com',        '+237 699 46 00 00','Douala',  'Cameroun','PART-2015-046',500000,0],
    ['CLI-047','Mme Cécile OWONO',                'cecile.owono@gmail.com',    '+237 699 47 00 00','Yaoundé', 'Cameroun','PART-2015-047',400000,0],
    ['CLI-048','Dr. Francis NGAMENI',             'f.ngameni@medecin.cm',      '+237 699 48 00 00','Douala',  'Cameroun','PART-2015-048',600000,0],
    ['CLI-049','Arch. Paul BEBEY',                'paul.bebey@archi.cm',       '+237 699 49 00 00','Douala',  'Cameroun','PART-2015-049',500000,0],
    ['CLI-050','M. Albert ZANG',                  'albert.zang@gmail.com',     '+237 699 50 00 00','Bafoussam','Cameroun','PART-2015-050',300000,0],
    ['CLI-051','Mme Rose ENOW',                   'rose.enow@gmail.com',       '+237 699 51 00 00','Buea',    'Cameroun','PART-2015-051',250000,0],
    ['CLI-052','M. Simon NKEMDIRIM',              's.nkemdirim@gmail.com',     '+237 699 52 00 00','Limbe',   'Cameroun','PART-2015-052',200000,0],
    ['CLI-053','Mme Aïssatou OUMAROU',            'aissatou.oumarou@gmail.com','+237 699 53 00 00','Garoua',  'Cameroun','PART-2015-053',300000,0],
    ['CLI-054','M. Thierry MENGUE',               'thierry.mengue@gmail.com',  '+237 699 54 00 00','Yaoundé', 'Cameroun','PART-2015-054',400000,0],
    ['CLI-055','Mme Hortense DJEUGA',             'h.djeuga@gmail.com',        '+237 699 55 00 00','Douala',  'Cameroun','PART-2015-055',350000,0],
    ['CLI-056','M. Étienne MVONDO',               'etienne.mvondo@gmail.com',  '+237 699 56 00 00','Douala',  'Cameroun','PART-2015-056',300000,0],
    ['CLI-057','ProTech Import SARL',             'direction@protech.cm',       '+237 677 57 00 00','Douala', 'Cameroun','PTI-2015-057',700000,30],
    ['CLI-058','GreenOffice Distribution',         'commandes@greenoffice.cm',  '+237 677 58 00 00','Douala', 'Cameroun','GOD-2015-058',500000,30],
    ['CLI-059','Collège Notre-Dame de Nkongsamba', 'dgr@ndnkongsamba.cm',       '+237 677 59 00 00','Nkongsamba','Cameroun','CNN-2015-059',400000,30],
    ['CLI-060','Hôpital Général de Douala',        'aprovisionement@hgd.cm',   '+237 233 42 60 00','Douala',  'Cameroun','HGD-2015-060',2000000,60],
  ];
  const custIds: string[] = [];
  for (const [code,name,email,phone,city,country,taxNumber,creditLimit,paymentTerms] of CUST_DEFS) {
    const c = await prisma.customer.create({ data: {
      tenantId: tid, code, name, email, phone, city, country, taxNumber,
      creditLimit: dec(creditLimit as number), paymentTerms: paymentTerms as number, isActive: true,
    }});
    custIds.push(c.id);
  }

  // ── 15. Initial inventory ───────────────────────────────────────────────────
  console.log('  → Seeding initial inventory…');
  for (const sku of Array.from(prodMap.keys())) {
    const p = prodMap.get(sku)!;
    await prisma.inventory.create({ data: {
      tenantId: tid, productId: p.id, warehouseId: wMain.id,
      quantity: dec4(rnd(30, 200)), reservedQty: '0',
    }});
    if (Math.random() > 0.5) {
      await prisma.inventory.create({ data: {
        tenantId: tid, productId: p.id, warehouseId: wBona.id,
        quantity: dec4(rnd(10, 80)), reservedQty: '0',
      }});
    }
  }

  // ── 16. Ten years of Purchases ──────────────────────────────────────────────
  console.log('  → Generating 10 years of purchases…');
  // per-year purchase counts & amount multiplier
  const PY = [
    { y:2015,count:18,amtBase:250000 }, { y:2016,count:24,amtBase:320000 },
    { y:2017,count:32,amtBase:410000 }, { y:2018,count:42,amtBase:530000 },
    { y:2019,count:50,amtBase:640000 }, { y:2020,count:36,amtBase:560000 },
    { y:2021,count:52,amtBase:720000 }, { y:2022,count:64,amtBase:890000 },
    { y:2023,count:76,amtBase:1050000},{ y:2024,count:88,amtBase:1230000},
  ];
  const PROD_LIST = Array.from(prodMap.entries()).map(([sku,v]) => ({ sku, ...v }));

  for (const { y, count, amtBase } of PY) {
    for (let i = 0; i < count; i++) {
      const orderDate = rndDate(y);
      const suppId    = pick(supIds);
      const status    = y < 2024 ? pick(['RECEIVED','RECEIVED','RECEIVED','PARTIALLY_RECEIVED']) : pick(['ORDERED','RECEIVED','RECEIVED','PARTIALLY_RECEIVED']);
      const lineCount = rnd(2, 5);
      const lines: { productId:string; qty:number; cost:number; total:number }[] = [];
      for (let li = 0; li < lineCount; li++) {
        const prod  = pick(PROD_LIST);
        const qty   = rnd(5, 50);
        const cost  = prod.cost * (0.85 + Math.random() * 0.20);
        const total = qty * cost;
        lines.push({ productId: prod.id, qty, cost, total });
      }
      const subtotal = lines.reduce((s,l) => s + l.total, 0);
      const taxAmt   = subtotal * 0.1925;
      const total    = subtotal + taxAmt;
      const paid     = status === 'RECEIVED' ? total : (status === 'PARTIALLY_RECEIVED' ? total * 0.5 : 0);
      const poRef    = pRef(y);
      const po = await prisma.purchase.create({ data: {
        tenantId: tid, branchId: bHQ.id, supplierId: suppId, reference: poRef,
        status: status as PurchaseStatus, orderDate,
        expectedDate: new Date(orderDate.getTime() + 14 * 86400000),
        receivedDate: status !== 'ORDERED' ? new Date(orderDate.getTime() + rnd(7,30) * 86400000) : null,
        subtotal: dec(subtotal), taxAmount: dec(taxAmt), total: dec(total), paidAmount: dec(paid),
        notes: `Commande fournisseur ${poRef}`, createdBy: procId,
        lines: { create: lines.map((l,idx) => ({
          productId: l.productId, quantity: dec4(l.qty), unitCost: dec4(l.cost),
          receivedQty: status !== 'ORDERED' ? dec4(l.qty) : '0',
          taxRate: '19.25', total: dec(l.total), sortOrder: idx,
        }))},
      }});
      // Inventory movement
      if (status !== 'ORDERED') {
        for (const l of lines) {
          await prisma.inventoryMovement.create({ data: {
            tenantId: tid, productId: l.productId, warehouseId: wMain.id,
            type: MovementType.IN, quantity: dec4(l.qty), unitCost: dec4(l.cost),
            reference: poRef, notes: `Réception ${poRef}`, createdBy: procId,
            createdAt: orderDate,
          }});
        }
      }
      // Payment if paid
      if (paid > 0) {
        await prisma.payment.create({ data: {
          tenantId: tid, reference: pyRef(y),
          method: pick([PaymentMethod.BANK_TRANSFER, PaymentMethod.CHEQUE]),
          status: PaymentStatus.COMPLETED,
          amount: dec(paid), currency: 'XAF', purchaseId: po.id,
          paidAt: new Date(orderDate.getTime() + rnd(1,15) * 86400000),
        }});
      }
    }
  }

  // ── 17. Ten years of Sales ──────────────────────────────────────────────────
  console.log('  → Generating 10 years of sales…');
  const SY = [
    { y:2015,count:35,amtBase:180000 }, { y:2016,count:52,amtBase:230000 },
    { y:2017,count:72,amtBase:295000 }, { y:2018,count:88,amtBase:380000 },
    { y:2019,count:108,amtBase:460000},{ y:2020,count:78,amtBase:420000 },
    { y:2021,count:105,amtBase:510000},{ y:2022,count:130,amtBase:620000},
    { y:2023,count:158,amtBase:745000},{ y:2024,count:185,amtBase:870000},
  ];

  for (const { y, count } of SY) {
    for (let i = 0; i < count; i++) {
      const saleDate = rndDate(y);
      const custId   = pick(custIds);
      const userId   = pick(salesIds);
      const branchId = pick([bHQ.id, bYde.id]);
      const status   = y < 2024
        ? pick(['DELIVERED','DELIVERED','DELIVERED','CONFIRMED','RETURNED'])
        : pick(['DELIVERED','DELIVERED','CONFIRMED','PROCESSING','DRAFT']);
      const lineCount = rnd(1, 4);
      const lines: { productId:string; qty:number; price:number; tax:number; total:number }[] = [];
      for (let li = 0; li < lineCount; li++) {
        const prod  = pick(PROD_LIST);
        const qty   = rnd(1, 20);
        const price = prod.sale * (0.92 + Math.random() * 0.16);
        const tax   = 19.25;
        const total = qty * price;
        lines.push({ productId: prod.id, qty, price, tax, total });
      }
      const subtotal = lines.reduce((s,l) => s + l.total, 0);
      const taxAmt   = subtotal * 0.1925;
      const total    = subtotal + taxAmt;
      const paid     = (status === 'DELIVERED' || status === 'CONFIRMED')
        ? (Math.random() > 0.15 ? total : total * 0.6)
        : (status === 'PROCESSING' ? total * 0.5 : 0);
      const slRef = sRef(y);
      const sale = await prisma.sale.create({ data: {
        tenantId: tid, branchId, customerId: custId, reference: slRef,
        status: status as SaleStatus, saleDate,
        dueDate: new Date(saleDate.getTime() + 30 * 86400000),
        subtotal: dec(subtotal), taxAmount: dec(taxAmt), total: dec(total), paidAmount: dec(paid),
        notes: `Vente ${slRef}`, createdBy: userId,
        lines: { create: lines.map((l,idx) => ({
          productId: l.productId, quantity: dec4(l.qty), unitPrice: dec4(l.price),
          taxRate: dec(l.tax), total: dec(l.total), sortOrder: idx,
        }))},
      }});
      // Inventory OUT
      if (status === 'DELIVERED') {
        for (const l of lines) {
          await prisma.inventoryMovement.create({ data: {
            tenantId: tid, productId: l.productId,
            warehouseId: branchId === bYde.id ? wYde.id : wMain.id,
            type: MovementType.OUT, quantity: dec4(l.qty),
            reference: slRef, notes: `Sortie vente ${slRef}`, createdBy: userId,
            createdAt: saleDate,
          }});
        }
      }
      // Invoice
      const inv = await prisma.invoice.create({ data: {
        tenantId: tid, type: InvoiceType.SALE,
        status: paid >= total ? InvoiceStatus.PAID : (y < 2024 && paid === 0 ? InvoiceStatus.OVERDUE : InvoiceStatus.PENDING),
        reference: iRef(y), saleId: sale.id, customerId: custId,
        issueDate: saleDate,
        dueDate: new Date(saleDate.getTime() + 30 * 86400000),
        subtotal: dec(subtotal), taxAmount: dec(taxAmt), total: dec(total), paidAmount: dec(paid),
      }});
      // Payment
      if (paid > 0) {
        await prisma.payment.create({ data: {
          tenantId: tid, reference: pyRef(y),
          method: pick([PaymentMethod.CASH, PaymentMethod.MOBILE_MONEY, PaymentMethod.BANK_TRANSFER, PaymentMethod.CARD]),
          status: PaymentStatus.COMPLETED,
          amount: dec(paid), currency: 'XAF', saleId: sale.id, invoiceId: inv.id,
          paidAt: new Date(saleDate.getTime() + rnd(0,5) * 86400000),
        }});
      }
    }
  }

  // ── 18. CRM – Pipeline ──────────────────────────────────────────────────────
  console.log('  → Setting up CRM…');
  const pipeline = await prisma.pipeline.create({ data: {
    tenantId: tid, name: 'Pipeline Commercial Principal', description: 'Pipeline de vente standard', isDefault: true,
  }});
  const stageDefs = [
    { name:'Prospect identifié',  prob:10, order:1 },
    { name:'Contact établi',      prob:25, order:2 },
    { name:'Proposition envoyée', prob:50, order:3 },
    { name:'Négociation',         prob:70, order:4 },
    { name:'Bon de commande',     prob:90, order:5 },
    { name:'Gagné',               prob:100,order:6, isWon:true  },
    { name:'Perdu',               prob:0,  order:7, isLost:true },
  ];
  const stageIds: string[] = [];
  for (const s of stageDefs) {
    const st = await prisma.pipelineStage.create({ data: {
      pipelineId: pipeline.id, name: s.name, probability: s.prob, sortOrder: s.order,
      isWon: s.isWon || false, isLost: s.isLost || false,
    }});
    stageIds.push(st.id);
  }

  // Leads
  const LEAD_SOURCES = ['Web','Référence','Salon professionnel','Appel entrant','LinkedIn','Partenaire'];
  const LEAD_DEFS = [
    ['Directeur IT','SCDP',          LeadStatus.QUALIFIED, 85],
    ['Chef des achats','Chantiers A.','CONTACTED',55],
    ['DG','MRC Cameroun',            LeadStatus.NEW,       20],
    ['Responsable','Université HEC', LeadStatus.CONVERTED, 95],
    ['Directeur','Institut Supérieur',LeadStatus.QUALIFIED,70],
    ['Chef comptable','Minoteries CM',LeadStatus.CONTACTED,45],
    ['Responsable IT','Banque Atlantique',LeadStatus.QUALIFIED,75],
    ['DG','Groupe Forest',           LeadStatus.NEW,       15],
    ['Acheteuse','SONEL',            LeadStatus.CONVERTED, 90],
    ['Responsable','CONGELCAM',      LeadStatus.LOST,       5],
    ['DG','Radio Équinoxe',          LeadStatus.CONTACTED, 40],
    ['Chef matériel','Hôtel Hilton',  LeadStatus.QUALIFIED, 65],
  ];
  const leadIds: string[] = [];
  for (const [title, company, status, score] of LEAD_DEFS) {
    const l = await prisma.lead.create({ data: {
      tenantId: tid, firstName: pick(['Jean','Marie','Paul','Alain','Sophie','Bertrand','Cécile']),
      lastName: pick(['MBALLA','FOUDA','NKOA','ESSOME','KENG','BIYONG','ATEBA']),
      company: company as string, status: status as LeadStatus, score: score as number,
      source: pick(LEAD_SOURCES), assignedTo: pick(salesIds),
      createdAt: rndDate(2023),
    }});
    leadIds.push(l.id);
  }

  // Opportunities
  const OPP_DEFS = [
    ['Renouvellement parc informatique MTN',          pick(custIds), 8500000,  80, 'OPEN'],
    ['Fourniture mobilier bureau Total Energies',     pick(custIds), 3200000,  65, 'OPEN'],
    ['Équipement clinique La Providence',             pick(custIds), 1800000,  90, 'WON' ],
    ['Appel d\'offre matériel Ministère Éducation',  pick(custIds), 12000000, 45, 'OPEN'],
    ['Fournitures bureau Groupe Fotso 2025',          pick(custIds), 5600000,  70, 'OPEN'],
    ['Renouvellement licences Orange Cameroun',       pick(custIds), 2400000,  55, 'OPEN'],
    ['Équipement Hotel des Cocotiers',                pick(custIds), 4100000,  85, 'WON' ],
    ['Contrat cadre BRASSERIES DU CAMEROUN',         pick(custIds), 9800000,  60, 'OPEN'],
    ['Matériel scolaire Université de Douala',        pick(custIds), 6200000,  75, 'OPEN'],
    ['Fournitures UNICEF 2025',                       pick(custIds), 7500000,  50, 'OPEN'],
    ['Parc PC DHL Express',                           pick(custIds), 3800000,  80, 'WON' ],
    ['Matériel GIZ Cameroun',                         pick(custIds), 4400000,  65, 'LOST'],
  ];
  const oppIds: string[] = [];
  for (const [title, custId, value, prob, status] of OPP_DEFS) {
    const stageIdx = status === 'WON' ? 5 : (status === 'LOST' ? 6 : Math.floor((prob as number) / 20));
    const opp = await prisma.opportunity.create({ data: {
      tenantId: tid, customerId: custId as string,
      pipelineId: pipeline.id, stageId: stageIds[Math.min(stageIdx, 6)],
      title: title as string, value: dec(value as number), currency: 'XAF',
      probability: prob as number, status: status as OpportunityStatus,
      expectedCloseDate: d(2025, rnd(1,12), rnd(1,28)),
      assignedTo: pick(salesIds),
      closedAt: status !== 'OPEN' ? rndDate(2024) : null,
    }});
    oppIds.push(opp.id);
    // Activities
    for (let k = 0; k < rnd(2,5); k++) {
      await prisma.crmActivity.create({ data: {
        tenantId: tid, type: pick([ActivityType.CALL,ActivityType.EMAIL,ActivityType.MEETING,ActivityType.TASK]),
        subject: pick(['Appel de suivi','Envoi proposition','Réunion de présentation','Relance client','Clarification technique']),
        opportunityId: opp.id, userId: pick(salesIds),
        createdAt: rndDate(2024),
        completedAt: Math.random() > 0.4 ? rndDate(2024) : null,
      }});
    }
  }

  // Tasks
  const TASK_TITLES = [
    'Préparer la proposition commerciale','Relancer le client pour validation',
    'Envoyer le devis révisé','Planifier la démo produit','Vérifier stock disponible',
    'Coordonner la livraison','Établir la facture','Suivi paiement en retard',
    'Contacter nouveau prospect','Préparer le rapport mensuel',
  ];
  for (let i = 0; i < 20; i++) {
    await prisma.task.create({ data: {
      tenantId: tid, title: pick(TASK_TITLES),
      status: pick([TaskStatus.TODO,TaskStatus.IN_PROGRESS,TaskStatus.DONE]),
      priority: pick([TaskPriority.MEDIUM,TaskPriority.HIGH,TaskPriority.LOW,TaskPriority.URGENT]),
      assigneeId: pick([...salesIds, procId]),
      createdBy: salesMgrId,
      dueDate: d(2025, rnd(1,6), rnd(1,28)),
      opportunityId: Math.random() > 0.4 ? pick(oppIds) : null,
    }});
  }

  // Campaigns
  const campaigns = [
    { name:'Promo Back-to-School 2024', type:CampaignType.EMAIL, budget:500000, sent:1200, open:350 },
    { name:'Black Friday SAFIRA 2024',  type:CampaignType.SMS,   budget:300000, sent:2500, open:800 },
    { name:'Rentrée des classes 2023',  type:CampaignType.EMAIL, budget:400000, sent:900,  open:270 },
    { name:'Campagne Fin d\'Année 2023',type:CampaignType.EMAIL, budget:600000, sent:1800, open:540 },
  ];
  for (const c of campaigns) {
    const camp = await prisma.campaign.create({ data: {
      tenantId: tid, name: c.name, type: c.type,
      status: CampaignStatus.COMPLETED, budget: dec(c.budget),
      sentCount: c.sent, openCount: c.open, clickCount: Math.floor(c.open * 0.3),
      startDate: d(2024, 8, 1), endDate: d(2024, 9, 30),
    }});
    const sample = custIds.slice(0, 20);
    await prisma.campaignContact.createMany({ data: sample.map(customerId => ({
      campaignId: camp.id, customerId,
      sentAt: d(2024, 9, 1), openedAt: Math.random() > 0.5 ? d(2024, 9, 2) : null,
    }))});
  }

  // ── 19. Budget Plans ────────────────────────────────────────────────────────
  console.log('  → Creating budget plans…');
  const finMgrId = userMap.get('finance@safira.cm')!;
  // Budget categories
  const bcSales = await prisma.budgetCategory.create({ data: { tenantId: tid, name:'Chiffre d\'affaires', code:'REV-CA', sortOrder:1 } });
  const bcPurch = await prisma.budgetCategory.create({ data: { tenantId: tid, name:'Achats marchandises', code:'CHG-ACH', sortOrder:2 } });
  const bcSal   = await prisma.budgetCategory.create({ data: { tenantId: tid, name:'Charges de personnel', code:'CHG-SAL', sortOrder:3 } });
  const bcLog   = await prisma.budgetCategory.create({ data: { tenantId: tid, name:'Logistique & Transport', code:'CHG-LOG', sortOrder:4 } });
  const bcMkt   = await prisma.budgetCategory.create({ data: { tenantId: tid, name:'Marketing & Communication', code:'CHG-MKT', sortOrder:5 } });

  const BUDGET_YEARS = [2022,2023,2024,2025];
  const BUDGET_TARGETS: Record<number,number> = { 2022:350000000, 2023:420000000, 2024:510000000, 2025:600000000 };

  for (const fy of BUDGET_YEARS) {
    const target = BUDGET_TARGETS[fy];
    const bp = await prisma.budgetPlan.create({ data: {
      tenantId: tid, departmentId: deptComm.id,
      name: `Budget Annuel ${fy}`, fiscalYear: fy,
      startDate: d(fy,1,1), endDate: d(fy,12,31),
      status: fy < 2025 ? BudgetStatus.CLOSED : BudgetStatus.ACTIVE,
      totalAmount: dec(target), createdBy: finMgrId,
      approvedBy: fy < 2025 ? adminId : null,
      approvedAt: fy < 2025 ? d(fy,1,15) : null,
    }});
    // Add allocations per month for revenue
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const seasonFactors = [0.06,0.06,0.08,0.08,0.09,0.08,0.07,0.07,0.09,0.10,0.11,0.11];
    for (let m = 0; m < 12; m++) {
      const alloc = target * seasonFactors[m];
      const actual = fy < 2025 ? alloc * (0.85 + Math.random() * 0.30) : 0;
      await prisma.budgetAllocation.create({ data: {
        budgetPlanId: bp.id, categoryId: bcSales.id,
        period: `${fy}-${months[m]}`, allocated: dec(alloc), actual: dec(actual),
        variance: dec(actual - alloc),
      }});
      await prisma.budgetAllocation.create({ data: {
        budgetPlanId: bp.id, categoryId: bcPurch.id,
        period: `${fy}-${months[m]}`, allocated: dec(alloc * 0.65), actual: dec(fy < 2025 ? alloc * 0.65 * (0.85+Math.random()*0.30) : 0), variance: '0',
      }});
    }
    if (fy < 2025) {
      await prisma.budgetApproval.create({ data: {
        budgetPlanId: bp.id, approverId: adminId,
        status: ApprovalStatus.APPROVED, comments: 'Budget approuvé — conforme aux objectifs.',
        decidedAt: d(fy,1,15),
      }});
    }
  }

  // ── 20. Financial Analytics (monthly snapshots 2015–2024) ──────────────────
  console.log('  → Generating analytics snapshots…');
  const REV_BASE: Record<number,number> = {
    2015:65000000, 2016:102000000, 2017:148000000, 2018:210000000,
    2019:265000000, 2020:195000000, 2021:270000000, 2022:335000000,
    2023:402000000, 2024:488000000,
  };
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const seasonF = [0.06,0.06,0.08,0.08,0.09,0.08,0.07,0.07,0.09,0.10,0.11,0.11];
  for (let y = 2015; y <= 2024; y++) {
    const annualRev = REV_BASE[y];
    let openBal = annualRev * 0.08;
    for (let m = 0; m < 12; m++) {
      const rev  = annualRev * seasonF[m] * (0.90 + Math.random() * 0.20);
      const cogs = rev * (0.60 + Math.random() * 0.05);
      const opex = rev * (0.15 + Math.random() * 0.05);
      const exp  = cogs + opex;
      const gp   = rev - cogs;
      const np   = rev - exp;
      const pd   = d(y, m+1, 1);
      const per  = `${y}-${months[m]}`;
      await prisma.financialAnalytic.create({ data: {
        tenantId: tid, period: per, periodDate: pd,
        revenue: dec(rev), expenses: dec(exp), grossProfit: dec(gp), netProfit: dec(np),
        grossMargin: (gp/rev).toFixed(4), netMargin: (np/rev).toFixed(4),
      }});
      await prisma.revenueAnalytic.create({ data: {
        tenantId: tid, period: per, periodDate: pd,
        totalRevenue: dec(rev), newCustomers: rnd(1,8), repeatOrders: rnd(10,40),
        avgOrderValue: dec(rev / rnd(20,60)),
      }});
      await prisma.expenseAnalytic.create({ data: {
        tenantId: tid, period: per, periodDate: pd,
        totalExpenses: dec(exp), cogsAmount: dec(cogs), opexAmount: dec(opex),
      }});
      const inflows  = rev * 0.95;
      const outflows = exp * 0.90;
      const closing  = openBal + inflows - outflows;
      await prisma.cashFlowForecast.create({ data: {
        tenantId: tid, period: per, periodDate: pd,
        openingBalance: dec(openBal), inflows: dec(inflows), outflows: dec(outflows),
        closingBalance: dec(closing), isActual: true,
      }});
      openBal = closing;
    }
  }

  // ── 21. KPI Trackers ────────────────────────────────────────────────────────
  const KPI_DEFS = [
    { name:'Chiffre d\'affaires mensuel (XAF)', unit:'XAF', target:40000000, actual:42500000, period:KpiPeriod.MONTHLY },
    { name:'Nombre de nouvelles commandes',    unit:'cmd', target:120,       actual:138,       period:KpiPeriod.MONTHLY },
    { name:'Taux de satisfaction client (%)',   unit:'%',   target:90,        actual:87,        period:KpiPeriod.MONTHLY },
    { name:'Délai moyen de livraison (jours)',  unit:'j',   target:5,         actual:4.2,       period:KpiPeriod.MONTHLY },
    { name:'Rotation des stocks (×)',           unit:'×',   target:8,         actual:7.3,       period:KpiPeriod.QUARTERLY },
    { name:'Taux de recouvrement (%)',          unit:'%',   target:95,        actual:92,        period:KpiPeriod.MONTHLY },
    { name:'Nombre de leads qualifiés',         unit:'lead',target:20,        actual:18,        period:KpiPeriod.MONTHLY },
    { name:'Taux de conversion leads (%)',      unit:'%',   target:30,        actual:28,        period:KpiPeriod.QUARTERLY },
    { name:'Revenu par employé (XAF)',          unit:'XAF', target:3000000,   actual:3250000,   period:KpiPeriod.MONTHLY },
    { name:'Objectif annuel ventes (XAF)',      unit:'XAF', target:510000000, actual:488000000, period:KpiPeriod.ANNUALLY },
  ];
  for (const k of KPI_DEFS) {
    await prisma.kpiTracker.create({ data: {
      tenantId: tid, name: k.name, unit: k.unit,
      target: k.target.toFixed(4), actual: k.actual.toFixed(4),
      period: k.period, periodDate: d(2024,12,1),
      isAchieved: k.actual >= k.target,
    }});
  }

  // ── 22. Forecasts ───────────────────────────────────────────────────────────
  for (let m = 1; m <= 6; m++) {
    await prisma.forecast.create({ data: {
      tenantId: tid, type: ForecastType.REVENUE, name: `Prévision CA ${m}/2025`,
      period: `2025-${String(m).padStart(2,'0')}`,
      startDate: d(2025,m,1), endDate: d(2025,m,28),
      value: dec(45000000 + m * 1200000), confidence: 80,
      methodology: 'Tendance historique + saisonnalité',
    }});
    await prisma.forecast.create({ data: {
      tenantId: tid, type: ForecastType.EXPENSE, name: `Prévision Charges ${m}/2025`,
      period: `2025-${String(m).padStart(2,'0')}`,
      startDate: d(2025,m,1), endDate: d(2025,m,28),
      value: dec(29000000 + m * 800000), confidence: 75,
      methodology: 'Budget approuvé + écarts historiques',
    }});
  }

  // ── 23. Goal Trackers ───────────────────────────────────────────────────────
  await prisma.goalTracker.create({ data: { tenantId: tid, title:'Chiffre d\'affaires 2025 : 600M XAF', target:'600000000', current:'488000000', unit:'XAF', startDate:d(2025,1,1), endDate:d(2025,12,31), status:GoalStatus.ACTIVE }});
  await prisma.goalTracker.create({ data: { tenantId: tid, title:'Recruter 3 commerciaux en 2025', target:'3', current:'1', unit:'recrutement', startDate:d(2025,1,1), endDate:d(2025,12,31), status:GoalStatus.ACTIVE }});
  await prisma.goalTracker.create({ data: { tenantId: tid, title:'Ouvrir agence à Garoua Q3 2025', target:'1', current:'0', unit:'agence', startDate:d(2025,1,1), endDate:d(2025,9,30), status:GoalStatus.ACTIVE }});
  await prisma.goalTracker.create({ data: { tenantId: tid, title:'Taux de fidélisation clients 85%', target:'85', current:'81', unit:'%', startDate:d(2025,1,1), endDate:d(2025,12,31), status:GoalStatus.ACTIVE }});

  // ── 24. Approval Workflow ───────────────────────────────────────────────────
  const wf = await prisma.approvalWorkflow.create({ data: { tenantId: tid, name:'Approbation Bons de Commande ≥ 2M XAF', entity:'purchase', description:'Commandes au-dessus de 2 000 000 XAF nécessitent validation' }});
  await prisma.approvalStep.create({ data: { workflowId:wf.id, stepOrder:1, name:'Validation Chef Achats', approverId:procId, status:ApprovalStatus.APPROVED, entityId:wf.id } });
  await prisma.approvalStep.create({ data: { workflowId:wf.id, stepOrder:2, name:'Validation Finance',    approverId:finMgrId, status:ApprovalStatus.APPROVED } });
  await prisma.approvalStep.create({ data: { workflowId:wf.id, stepOrder:3, name:'Validation Direction', approverId:adminId,  status:ApprovalStatus.PENDING  } });

  // ── 25. Settings ─────────────────────────────────────────────────────────────
  await prisma.setting.createMany({ data: [
    { tenantId: tid, key:'company.name',        value:'Groupe SAFIRA Distribution S.A.', group:'company' },
    { tenantId: tid, key:'company.address',     value:'Immeuble SAFIRA, Rue de la Joie, Akwa, Douala', group:'company' },
    { tenantId: tid, key:'company.phone',       value:'+237 233 42 18 00', group:'company' },
    { tenantId: tid, key:'company.email',       value:'contact@safira-distribution.cm', group:'company' },
    { tenantId: tid, key:'company.taxNumber',   value:'M-2015-0042-DLA', group:'company' },
    { tenantId: tid, key:'invoice.prefix',      value:'SAFIRA', group:'invoice' },
    { tenantId: tid, key:'invoice.footer',      value:'Merci pour votre confiance. Tout retard de paiement entraîne des pénalités de 1,5% par mois.', group:'invoice' },
    { tenantId: tid, key:'pos.defaultWarehouse',value:wMain.id, group:'pos' },
    { tenantId: tid, key:'pos.receiptFooter',   value:'Merci de votre visite chez SAFIRA !', group:'pos' },
  ]});

  // ── DONE ────────────────────────────────────────────────────────────────────
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════════════╗');
  console.log('  ║           GROUPE SAFIRA — Seed terminé avec succès !        ║');
  console.log('  ╠══════════════════════════════════════════════════════════════╣');
  console.log('  ║  Connexions (mot de passe : Safira@2024!)                   ║');
  console.log('  ║  ─────────────────────────────────────────────────────────  ║');
  console.log('  ║  Super Admin         admin@safira.cm                        ║');
  console.log('  ║  Directeur Général   dg@safira.cm                           ║');
  console.log('  ║  Finance Manager     finance@safira.cm                      ║');
  console.log('  ║  Responsable Comm.   commercial@safira.cm                   ║');
  console.log('  ║  Responsable Achats  achats@safira.cm                       ║');
  console.log('  ║  Responsable Stock   stock@safira.cm                        ║');
  console.log('  ║  RH Manager          rh@safira.cm                           ║');
  console.log('  ║  Commercial          aurore.kamga@safira.cm                 ║');
  console.log('  ║  Caissier POS        caisse@safira.cm                       ║');
  console.log('  ║  Comptable           comptable@safira.cm                    ║');
  console.log('  ║  Auditeur (read-only) auditeur@safira.cm                    ║');
  console.log('  ╠══════════════════════════════════════════════════════════════╣');
  console.log('  ║  Données                                                    ║');
  console.log('  ║  50 fournisseurs · 60 clients · 50 produits                 ║');
  console.log('  ║  10 ans transactions (2015-2024)                             ║');
  console.log('  ║  CRM · Budgets · KPIs · Analytics                           ║');
  console.log('  ╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
