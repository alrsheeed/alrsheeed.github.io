/*
 * Shared runtime core. Domain scripts intentionally keep their local data
 * adapters and render functions; this namespace is the stable seam for new
 * work and avoids changing classic-script load order during Phase 14.5.
 */
window.AlRasheed = window.AlRasheed || {};
AlRasheed.core = AlRasheed.core || {};
AlRasheed.core.storage = AlRasheed.core.storage || {
  get(key, fallback = null) {
    try { const value = localStorage.getItem(key); return value == null ? fallback : JSON.parse(value); }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; },
  remove(key) { localStorage.removeItem(key); }
};
AlRasheed.core.query = AlRasheed.core.query || {
  params() { return new URLSearchParams(location.search); },
  get(name, fallback = null) { return this.params().get(name) ?? fallback; }
};
AlRasheed.core.dates = AlRasheed.core.dates || {
  today() { return new Date().toISOString().slice(0, 10); },
  parse(value) { return value ? new Date(`${value}T00:00:00`) : null; },
  format(value, locale = 'ar-EG') { const date = this.parse(value); return date ? date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'; },
  compare(a, b) { return String(a || '').localeCompare(String(b || '')); }
};
AlRasheed.core.money = AlRasheed.core.money || {
  number(value) { const result = Number(value); return Number.isFinite(result) ? result : 0; },
  format(value, currency = 'ج.م') { return `${this.number(value).toLocaleString('en-US')} ${currency}`; }
};
AlRasheed.core.filters = AlRasheed.core.filters || {
  text(value) { return String(value ?? '').trim().toLocaleLowerCase(); },
  includes(value, query) { return !query || this.text(value).includes(this.text(query)); },
  count(values) { return values.filter(Boolean).length; }
};
AlRasheed.core.sorting = AlRasheed.core.sorting || {
  by(field, direction = 'asc') { const sign = direction === 'desc' ? -1 : 1; return (a, b) => String(a?.[field] ?? '').localeCompare(String(b?.[field] ?? ''), undefined, { numeric: true }) * sign; }
};
AlRasheed.core.ids = AlRasheed.core.ids || {
  next(prefix, length = 4, size = 0) { return `${prefix}-${new Date().getFullYear()}-${String(size + 1).padStart(length, '0')}`; }
};

const NAV_GROUPS = [
  ['الرئيسية', [['index.html', 'لوحة التحكم', 'bi-grid-1x2']]],
  ['العملاء و CRM', [
    ['clients.html', 'العملاء', 'bi-people'],
    ['crm.html', 'إدارة العملاء CRM', 'bi-person-lines-fill']
  ]],
  ['العمل القانوني', [
    ['matters.html', 'الملفات القانونية', 'bi-folder2'],
    ['cases.html', 'القضايا', 'bi-briefcase'],
    ['hearings.html', 'الجلسات', 'bi-calendar-event'],
    ['documents.html', 'المستندات', 'bi-file-earmark-text'],
    ['company-formations.html', 'تأسيس الشركات', 'bi-building'],
    ['contracts.html', 'العقود', 'bi-file-earmark-richtext'],
    ['services.html', 'الخدمات القانونية', 'bi-layers']
  ]],
  ['المتابعة والتشغيل', [
    ['calendar.html', 'التقويم', 'bi-calendar3'],
    ['tasks.html', 'المهام', 'bi-check2-square'],
    ['workflows.html', 'سير العمل', 'bi-diagram-3']
  ]],
  ['المالية', [
    ['finance.html', 'المالية', 'bi-wallet2'],
  ]],
  ['إدارة الفريق', [
    ['team.html', 'فريق العمل', 'bi-people'],
    ['departments.html', 'الأقسام', 'bi-diagram-3']
  ]],
  ['الوصول والحساب', [
    ['users.html', 'المستخدمون والصلاحيات', 'bi-person-lock'],
    ['roles.html', 'الأدوار', 'bi-shield-check'],
    ['permissions.html', 'الصلاحيات', 'bi-key'],
    ['my-profile.html', 'حسابي', 'bi-person-circle']
  ]]
];

const pageName = () => location.pathname.split('/').pop() || 'index.html';
const parentPage = page => {
  if (page.startsWith('client')) return 'clients.html';
  if (page.startsWith('crm') || page.startsWith('lead') || page.startsWith('opportunity')) return 'crm.html';
  if (page.startsWith('matter')) return 'matters.html';
  if (page.startsWith('case') || page.includes('judgment') || page.includes('decision') || page === 'courts.html') return 'cases.html';
  if (page.startsWith('hearing')) return 'hearings.html';
  if (page.startsWith('employee')) return 'team.html';
  if (page.startsWith('service')) return 'services.html';
  if (page.startsWith('workflow')) return 'workflows.html';
  if (page.startsWith('document')) return 'documents.html';
  if (page.startsWith('task') || page === 'my-tasks.html' || page === 'team-workload.html') return 'tasks.html';
  if (page.startsWith('calendar')) return 'calendar.html';
  if (page.startsWith('company-formation') || page.startsWith('formation-')) return 'company-formations.html';
  if (page.startsWith('contract')) return 'contracts.html';
  if (['finance.html','fee-agreements.html','fee-agreement-details.html','fee-agreement-form.html','invoices.html','invoice-details.html','invoice-form.html','payments.html','payment-details.html','payment-form.html','expenses.html','expense-details.html','expense-form.html','finance-categories.html'].includes(page)) return 'finance.html';
  if (['user-details.html', 'roles.html', 'role-details.html', 'role-form.html', 'permissions.html'].includes(page)) return 'users.html';
  return page;
};

const navMarkup = active => NAV_GROUPS.map(([title, items]) => `
  <div class="nav-group-title">${title}</div>
  ${items.map(([href, label, icon]) => `<a class="nav-link ${href === active ? 'active' : ''}" href="${href}" aria-current="${href === active ? 'page' : 'false'}"><i class="bi ${icon}"></i><span class="nav-label">${label}</span></a>`).join('')}
`).join('');

function renderSidebarNav(nav) {
  if (nav.dataset.sidebarReady === 'true') return;
  nav.innerHTML = navMarkup(parentPage(pageName()));
  nav.dataset.sidebarReady = 'true';
}

function normalizeTopbar() {
  const topbar = document.querySelector('.topbar');
  if (!topbar || topbar.dataset.chromeReady === 'true') return;
  const breadcrumb = topbar.querySelector('.breadcrumb') || Object.assign(document.createElement('a'), { className: 'breadcrumb', href: 'index.html', textContent: 'الرئيسية' });
  const start = document.createElement('div');
  start.className = 'topbar-start';
  start.append(breadcrumb);
  const actions = document.createElement('div');
  actions.className = 'topbar-actions';
  actions.innerHTML = '<a class="icon-btn" href="index.html" aria-label="الرئيسية"><i class="bi bi-house"></i></a><button class="icon-btn" data-action="toast" data-message="لا توجد إشعارات جديدة." aria-label="الإشعارات"><i class="bi bi-bell"></i></button><button class="btn btn-primary" data-action="direction">EN</button><span class="brand-mark topbar-avatar" aria-hidden="true">أ</span>';
  topbar.replaceChildren(start, actions);
  topbar.dataset.chromeReady = 'true';
}

function normalizeMobileHeader() {
  const main = document.querySelector('.main-area');
  if (!main || main.querySelector('.mobile-header')) return;
  const header = document.createElement('header');
  header.className = 'mobile-header';
  header.innerHTML = '<button class="icon-btn" data-action="toggle-drawer" aria-label="فتح القائمة"><i class="bi bi-list"></i></button><span class="mobile-brand">الرشيد</span><button class="icon-btn" data-action="direction">EN</button>';
  main.prepend(header);
}

function normalizeChrome() {
  if (!document.querySelector('.app-shell')) return;
  normalizeTopbar();
  normalizeMobileHeader();
  initSidebars();
}

function initSidebars() {
  document.querySelectorAll('.sidebar-nav, .mobile-drawer .sidebar-nav').forEach(renderSidebarNav);
}

window.Sidebar = window.Sidebar || {
  toggle() {
    document.querySelectorAll('.sidebar').forEach(sidebar => sidebar.classList.toggle('is-collapsed'));
    const collapsed = document.querySelector('.sidebar')?.classList.contains('is-collapsed');
    AlRasheed.core.storage.set('alrasheed-sidebar', collapsed ? 'collapsed' : 'open');
  },
  init() {
    if (AlRasheed.core.storage.get('alrasheed-sidebar') === 'collapsed') {
      document.querySelectorAll('.sidebar').forEach(sidebar => sidebar.classList.add('is-collapsed'));
    }
  }
};

window.App = {
  handle(el) {
    const action = el.dataset.action;
    const target = el.dataset.target;
    if (action === 'toggle-sidebar') return window.Sidebar.toggle();
    if (action === 'toggle-drawer') return window.Drawer?.toggle(target || 'mobile-drawer');
    if (action === 'toggle-sheet') return window.Drawer?.toggle(target || 'more-sheet');
    if (action === 'toggle-search') return window.Search?.toggle();
    if (action === 'quick-create') return window.Dropdown?.toggle('quick-create-menu');
    if (action === 'toggle-dropdown') return window.Dropdown?.toggle(target);
    if (action === 'toggle-modal') return window.Modal?.toggle(target);
    if (action === 'toast') return window.Toast?.show(el.dataset.message || 'تم حفظ التغييرات بنجاح.');
    if (action === 'direction') return window.Direction?.toggle();
    if (action === 'tab') {
      el.parentElement.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      el.classList.add('active');
    }
  },
  close(id) {
    window.Drawer?.close(id);
    window.Dropdown?.closeAll();
    window.Modal?.close(id);
    window.Search?.close();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  normalizeChrome();
  window.Sidebar.init();

  // Demo data: keep every list useful for demos and manual QA.
  // ponytail: deterministic localStorage seed; replace with an API fixture when a backend exists.
  const demoSeed = () => {
    if (localStorage.getItem('alrasheed-demo-data-v1')) return;
    const names = ['النور','الأفق','الشروق','دلتا','النخبة','المستقبل','الصفوة','رواد','المدينة','المصرية'];
    const people = ['أحمد محمود','منى حسن','محمود السيد','سارة علي','محمد خالد','ندى إبراهيم'];
    const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
    const clone = value => JSON.parse(JSON.stringify(value));
    const fill = (key, fallback, make) => {
      const list = read(key, fallback);
      if (!Array.isArray(list)) return;
      const base = list[0] ?? make(1);
      while (list.length < 50) list.push(make(list.length + 1, clone(base)));
      localStorage.setItem(key, JSON.stringify(list));
    };
    const mutate = (x, i, prefix) => {
      const n = names[(i - 1) % names.length];
      Object.keys(x).forEach(k => {
        if (typeof x[k] === 'string' && x[k]) x[k] = x[k].replace(/(النور|الأفق|الشروق|دلتا|النخبة|المستقبل|الصفوة|رواد|المدينة|المصرية)/g, n).replace(/(000\d+|00\d{2}|\d{4})/g, String(i).padStart(4, '0'));
      });
      if (x.id) x.id = `${prefix || x.id.split('-')[0]}-2026-${String(i).padStart(4, '0')}`;
      if (x.ref) x.ref = `MAT-2026-${String(40 + i).padStart(4, '0')}`;
      return x;
    };

    fill('alrasheed-clients', [['CLI-2026-0001','محمد أحمد السيد','أفراد',false]], (i, x) => {
      x = x || {id:'CLI-2026-0001',name:'محمد أحمد السيد',type:'أفراد',archived:false};
      if (Array.isArray(x)) return [`CLI-2026-${String(i).padStart(4,'0')}`, `${names[(i-1)%names.length]} للتجارة`, i%3?'شركات':'أفراد', i%11===0];
      return mutate(x, i, 'CLI');
    });
    fill('alrasheed-matters', [], (i, x) => mutate(x || {ref:'MAT-2026-0041',subject:'ملف قانوني',client:'CLI-2026-0001',service:'SRV-CON-002',department:'العقود والاستشارات',lawyer:people[0],state:'قيد التنفيذ',priority:'عادية',deadline:'2026-10-15',team:[],parties:[],notes:[],activity:[],req:[],docs:[],deliverables:[]}, i, 'MAT'));
    fill('alrasheed-tasks', [], (i, x) => mutate(x || {id:'TSK-2026-0101',title:'متابعة مستندات الملف',matter:'MAT-2026-0041',client:'شركة النور للتجارة والتوريدات',assignee:people[0],dept:'التقاضي',status:'للعمل',priority:'عادية',due:'2026-10-15',type:'متابعة',description:'مهمة تجريبية',checklist:[],comments:[],activity:[]}, i, 'TSK'));
    fill('alrasheed-documents', [], (i, x) => mutate(x || {id:'DOC-001',name:'مستند قانوني',type:'مستند آخر',category:'أخرى',client:'CL-001',matter:'MAT-2026-0041',expiry:'',uploader:people[0],updated:'اليوم',versions:[{n:1,file:'document.pdf',by:people[0],at:'اليوم',current:true}],activity:[]}, i, 'DOC'));
    fill('alrasheed-cases', [], (i, x) => mutate(x || {id:'CASE-2026-0015',number:'1245',year:'2026',type:'تجاري',level:'أول درجة',status:'متداولة',matter:'MAT-2026-0041',client:'شركة النور للتجارة والتوريدات',court:'محكمة القاهرة الاقتصادية',circuit:'الدائرة الثالثة',lawyer:people[0],parties:[],activity:[]}, i, 'CASE'));
    fill('alrasheed-hearings', [], (i, x) => mutate(x || {id:'HRG-2026-0022',caseId:'CASE-2026-0015',date:'2026-10-15',time:'10:00',status:'قادمة',prep:'قيد التجهيز',lawyer:people[0],court:'محكمة القاهرة الاقتصادية',circuit:'الدائرة الثالثة',checklist:[]}, i, 'HRG'));
    fill('alrasheed-courts', [], (i, x) => Array.isArray(x) ? [`محكمة ${names[(i-1)%names.length]} الابتدائية`, i%2?'ابتدائية':'اقتصادية', i%2?'الجيزة':'القاهرة', 'نشط'] : mutate(x || {}, i, 'CRT'));
    fill('alrasheed-calendar-events', [], (i, x) => mutate(x || {id:'CAL-2026-0001',type:'موعد داخلي',title:'اجتماع متابعة الملف',date:'2026-10-15',start:'10:00',end:'11:00',allDay:false,client:'',matter:'MAT-2026-0041',assignee:people[0],location:'مكتب الرشيد',status:'مجدول'}, i, 'CAL'));
    fill('alrasheed-services', [], (i, x) => mutate(x || {name:'خدمة قانونية',code:'SRV-DEMO-001',category:'خدمات قانونية أخرى',client:'كلاهما',duration:'3–7 يوم عمل',department:'العقود والاستشارات',active:true,description:'خدمة قانونية تجريبية',requirements:[],documents:[],deliverables:[],activity:[]}, i, 'SRV'));
    fill('alrasheed-workflows', [], (i, x) => mutate(x || {id:'WF-DEMO-001',name:'سير عمل قانوني',service:'SRV-CON-002',description:'سير عمل تجريبي',department:'العقود والاستشارات',active:true,updated:'اليوم',stages:[]}, i, 'WF'));
    fill('alrasheed-contracts', [], (i, x) => mutate(x || {id:'CTR-2026-0042',reference:'CTR-2026-0042',matter:'MAT-2026-0041',service:'مراجعة عقد',title:'عقد خدمات',type:'خدمات',client:'شركة النور للتجارة والتوريدات',counterparty:'مؤسسة المستقبل',responsible:people[0],lifecycle:'مسودة',versions:[],parties:[],clauses:[],obligations:[],reviews:[],approvals:[],requirements:[],activity:[]}, i, 'CTR'));
    fill('alrasheed-formations', [], (i, x) => mutate(x || {id:'FRM-2026-00041',reference:'FRM-2026-00041',client:'شركة النور للتجارة والتوريدات',type:'شركة ذات مسؤولية محدودة',name:'شركة النور',lawyer:people[1],started:'2026-09-01',notes:[],activity:[]}, i, 'FRM'));

    const crm = read('alrasheed-crm', {});
    ['leads','opportunities','followups'].forEach(k => {
      crm[k] = Array.isArray(crm[k]) ? crm[k] : [];
      while (crm[k].length < 50) {
        const i = crm[k].length + 1, n = names[(i - 1) % names.length];
        crm[k].push(k === 'leads' ? {id:`LEAD-2026-${String(i).padStart(4,'0')}`,reference:`LEAD-2026-${String(i).padStart(4,'0')}`,name:`شركة ${n} ${i}`,type:'شركة / جهة',companyName:`شركة ${n}`,phone:`010${String(10000000+i).slice(-8)}`,email:`contact${i}@demo.local`,sourceId:'SRC-001',serviceId:'SRV-CORP-001',needDescription:'احتياج قانوني تجريبي',estimatedValue:i*5000,currency:'ج.م',ownerId:`EMP-00${(i%3)+1}`,status:['جديد','تم التواصل','مؤهل'][i%3],priority:'عادية'} : k === 'opportunities' ? {id:`OPP-2026-${String(i).padStart(4,'0')}`,reference:`OPP-2026-${String(i).padStart(4,'0')}`,title:`فرصة قانونية ${n} ${i}`,leadId:`LEAD-2026-${String(i).padStart(4,'0')}`,serviceId:'SRV-CORP-001',stage:'اكتشاف الاحتياج',estimatedValue:i*7000,currency:'ج.م',ownerId:`EMP-00${(i%3)+1}`,probability:25,nextAction:'التواصل مع العميل'} : {id:`FU-2026-${String(i).padStart(4,'0')}`,leadId:`LEAD-2026-${String(i).padStart(4,'0')}`,type:'مكالمة',occurredAt:'2026-09-06T10:00',notes:'متابعة تجريبية',result:'تم التواصل',responsibleId:`EMP-00${(i%3)+1}`});
      }
    });
    localStorage.setItem('alrasheed-crm', JSON.stringify(crm));
    const finance = read('alrasheed-finance', {agreements:[],invoices:[],payments:[],expenses:[],categories:['رسوم جهة','انتقالات','مستندات','تشغيل المكتب','أخرى'],activities:[]});
    ['agreements','invoices','payments','expenses'].forEach(k => { finance[k] = Array.isArray(finance[k]) ? finance[k] : []; while (finance[k].length < 50) { const i=finance[k].length+1; finance[k].push(k==='agreements'?{id:`FEE-2026-${String(i).padStart(4,'0')}`,client:'CLI-2026-0001',matter:'MAT-2026-0041',type:'مبلغ ثابت',total:i*1000,status:'ساري'}:k==='invoices'?{id:`INV-2026-${String(i).padStart(4,'0')}`,client:'CLI-2026-0001',matter:'MAT-2026-0041',issue:'2026-09-01',due:'2026-10-01',items:[{description:'خدمة قانونية',qty:1,price:i*1000}],status:'صادرة'}:k==='payments'?{id:`PAY-2026-${String(i).padStart(4,'0')}`,client:'CLI-2026-0001',matter:'MAT-2026-0041',date:'2026-09-01',amount:i*500,method:'تحويل بنكي',allocations:[],status:'مسجلة'}:{id:`EXP-2026-${String(i).padStart(4,'0')}`,description:`مصروف تشغيلي ${i}`,category:'تشغيل المكتب',amount:i*100,date:'2026-09-01',client:'CLI-2026-0001',matter:'MAT-2026-0041',reimbursable:false,billed:false}); } });
    localStorage.setItem('alrasheed-finance', JSON.stringify(finance));
    if (window.P3?.clients) while (window.P3.clients.length < 50) {
      const i = window.P3.clients.length + 1, n = names[(i - 1) % names.length];
      window.P3.clients.push([`CLI-2026-${String(i).padStart(4,'0')}`, `شركة ${n} للخدمات ${i}`, i % 4 ? 'شركة' : 'فرد', `010${String(20000000+i).slice(-8)}`, `client${i}@demo.local`, people[i % people.length], `${i % 8 + 1} ملفات`, i % 9 ? 'نشط' : 'غير نشط']);
    }
    if (window.P2) {
      while (window.P2.people.length < 50) { const i=window.P2.people.length+1; window.P2.people.push([`موظف الرشيد ${i}`, i%2?'محامي':'مساعد قانوني', i%2?'التقاضي':'العقود والاستشارات', i%2?'محامي':'موظف إداري', i%10?'نشط':'في إجازة', `${i%9+1} ملفات · ${i%5+1} مهام`, `010${String(30000000+i).slice(-8)}`]); }
      while (window.P2.roles.length < 50) window.P2.roles.push(`دور تجريبي ${window.P2.roles.length + 1}`);
      while (window.P2.departments.length < 50) window.P2.departments.push(`قسم تجريبي ${window.P2.departments.length + 1}`);
    }
    localStorage.setItem('alrasheed-demo-data-v1', '1');
  };
  demoSeed();
  setTimeout(() => {
    const page = document.body.dataset.page, table = document.querySelector('tbody');
    if (!table || !['team','departments','users','roles'].includes(page)) return;
    const first = table.firstElementChild;
    while (table.children.length < 50 && first) {
      const row = first.cloneNode(true), i = table.children.length + 1;
      row.querySelectorAll('td').forEach(cell => { if (cell.textContent.trim()) cell.innerHTML = cell.innerHTML.replace(/(\d+)/g, String(i)); });
      table.appendChild(row);
    }
  }, 0);

  const observer = new MutationObserver(normalizeChrome);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]');
    if (action) window.App.handle(action);
    const close = event.target.closest('[data-close]');
    if (close) window.App.close(close.dataset.close);
    if (event.target.closest('.mobile-drawer .nav-link')) window.Drawer?.close('mobile-drawer');
    if (event.target.closest('#quick-create-menu .menu-item') && event.target.textContent.trim() === 'مهمة') location.href = 'task-form.html';
  });
});
