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
    if (localStorage.getItem('alrasheed-demo-data-v3')) return;
    Object.keys(localStorage).filter(key => key.startsWith('alrasheed-') && key !== 'alrasheed-sidebar').forEach(key => localStorage.removeItem(key));
    const companies = ['النيل للصناعات الغذائية','دلتا للتطوير العقاري','المصرية للتقنيات الطبية','أفق للتوريدات الصناعية','رواد الحلول الرقمية','الصفوة للنقل والخدمات','جسور للاستثمار العقاري','مصر للتأمين والاستشارات','واحة للمنتجات الزراعية','منارة للتعليم والتدريب','بداية للصناعات الهندسية','ثمار للتجارة الإلكترونية','مينا للخدمات البحرية','خطوة للتشغيل والصيانة','أصالة للمنتجات الطبية','بيوتنا للتصميم الداخلي','حلول آمنة للأمن السيبراني','مركزية للموارد البشرية','سوقنا للتوزيع','عمران للتنمية العمرانية','أعمال النيل للمقاولات','إبداع للإنتاج الإعلامي','زهراء للاستيراد والتصدير','مستقبل أخضر للطاقة','خبرة للمحاسبة والضرائب','المرسى للسياحة','قانونك للاستشارات','نقطة وصل للاتصالات','أساس للمقاولات','عين للتجارة والخدمات','موجة للمنتجات البحرية','واحة للزراعة الحديثة','أصل للتطوير العقاري','سند للخدمات المالية','كفاءة للتدريب المهني','روافد للتوريدات الصناعية','خطوط للنقل','بيت الخبرة للاستشارات','نمو للتقنية المالية','مدى للتجهيزات الطبية','أمان للتأمين','لمسة للإبداع','ركيزة للتنمية','مفاتيح للحلول','رؤية مصر اللوجستية','اتجاهات للاستشارات','سواعد للتشغيل','قمة للمقاولات','بوابة الشرق للتوريدات','نواة للبرمجيات'];
    const people = ['أحمد محمود','منى حسن','محمود السيد','سارة علي','محمد خالد','ندى إبراهيم'];
    const services = ['صياغة عقد','مراجعة عقد','رفع دعوى تجارية','استشارة قانونية','تسجيل علامة تجارية','تأسيس شركة','تحصيل مديونية','تنفيذ حكم'];
    const date = i => `2026-${String((i % 9) + 1).padStart(2,'0')}-${String((i % 27) + 1).padStart(2,'0')}`;
    const id = (prefix, i) => `${prefix}-2026-${String(i).padStart(4,'0')}`;
    const write = (key, list) => localStorage.setItem(key, JSON.stringify(list));
    const clients = Array.from({length:50}, (_, n) => { const i=n+1; return [id('CLI',i), companies[n], i%4 ? 'شركات' : 'أفراد', i%13===0]; });
    write('alrasheed-clients', clients);
    write('alrasheed-matters', Array.from({length:50}, (_,n) => { const i=n+1; return {ref:id('MAT',i),subject:`${services[n%services.length]} — ${companies[n]}`,client:clients[n][0],service:`SRV-${String((n%8)+1).padStart(3,'0')}`,department:n%2?'العقود والاستشارات':'التقاضي',lawyer:people[n%people.length],state:['قيد التنفيذ','مفتوح','مغلق'][n%3],priority:n%5===0?'عالية':'عادية',deadline:date(i+3),team:[],parties:[],notes:[],activity:[],req:[],docs:[],deliverables:[]}; }));
    write('alrasheed-tasks', Array.from({length:50}, (_,n) => { const i=n+1; return {id:id('TSK',i),title:['مراجعة المستندات','إعداد مذكرة','متابعة الجلسة','الاتصال بالعميل','تقديم الطلب'][n%5],matter:id('MAT',i),client:companies[n],assignee:people[n%people.length],dept:n%2?'التقاضي':'العقود والاستشارات',status:['للعمل','قيد التنفيذ','مكتملة'][n%3],priority:n%7===0?'عالية':'عادية',due:date(i+2),type:'إجراء قانوني',description:'مهمة مرتبطة بملف قائم',checklist:[],comments:[],activity:[]}; }));
    write('alrasheed-documents', Array.from({length:50}, (_,n) => { const i=n+1; return {id:id('DOC',i),name:['السجل التجاري','عقد التأسيس','التوكيل','صحيفة الدعوى','كشف الحساب'][n%5],type:['سجل تجاري','عقد','توكيل','مذكرة','مستند مالي'][n%5],category:'مستندات الملف',client:clients[n][0],matter:id('MAT',i),expiry:date(i+90),uploader:people[n%people.length],updated:date(i),versions:[{n:1,file:`document-${i}.pdf`,by:people[n%people.length],at:date(i),current:true}],activity:[]}; }));
    write('alrasheed-cases', Array.from({length:50}, (_,n) => { const i=n+1; return {id:id('CASE',i),number:String(1245+i),year:'2026',type:['تجاري','مدني','عمالي','أسرة'][n%4],level:['أول درجة','استئناف','نقض'][n%3],status:['متداولة','محجوزة للحكم','منتهية'][n%3],matter:id('MAT',i),client:companies[n],court:['محكمة القاهرة الاقتصادية','محكمة الجيزة الابتدائية','محكمة شمال القاهرة'][n%3],circuit:`الدائرة ${['الثالثة','الخامسة','السابعة'][n%3]}`,lawyer:people[n%people.length],parties:[],activity:[]}; }));
    write('alrasheed-hearings', Array.from({length:50}, (_,n) => { const i=n+1; return {id:id('HRG',i),caseId:id('CASE',i),date:date(i+1),time:`${String(9+(n%7)).padStart(2,'0')}:00`,status:n%4?'قادمة':'منعقدة',prep:['قيد التجهيز','جاهزة','تحتاج مستندات'][n%3],lawyer:people[n%people.length],court:['محكمة القاهرة الاقتصادية','محكمة الجيزة الابتدائية'][n%2],circuit:`الدائرة ${n%5+1}`,checklist:[]}; }));
    write('alrasheed-courts', Array.from({length:50}, (_,n) => [`${['القاهرة','الجيزة','الإسكندرية','المنصورة','طنطا'][n%5]} ${n%2?'الابتدائية':'الاقتصادية'}`, n%2?'ابتدائية':'اقتصادية', ['القاهرة','الجيزة','الإسكندرية','الدقهلية','الغربية'][n%5], 'نشط']));
    write('alrasheed-calendar-events', Array.from({length:50}, (_,n) => { const i=n+1; return {id:id('CAL',i),type:['جلسة','موعد داخلي','مكالمة عميل','موعد جهة'][n%4],title:`${services[n%services.length]} — ${companies[n]}`,date:date(i),start:`${String(9+n%8).padStart(2,'0')}:00`,end:`${String(10+n%8).padStart(2,'0')}:00`,allDay:false,client:clients[n][0],matter:id('MAT',i),assignee:people[n%people.length],location:['مكتب الرشيد','محكمة القاهرة الاقتصادية','اجتماع عن بُعد'][n%3],status:'مجدول'}; }));
    write('alrasheed-services', Array.from({length:50}, (_,n) => ({name:`${services[n%services.length]} — ${companies[n]}`,code:`SRV-${String(n+1).padStart(3,'0')}`,category:['الشركات والاستثمار','القضايا والتقاضي','العقود','الاستشارات القانونية'][n%4],client:n%3?'شركات':'كلاهما',duration:['1–3 يوم عمل','5–10 يوم عمل','14–30 يوم عمل'][n%3],department:n%2?'التقاضي':'العقود والاستشارات',active:n%11!==0,description:'خدمة قانونية بمتطلبات واضحة ومدة تنفيذ محددة.',requirements:[],documents:[],deliverables:[],activity:[]})));
    write('alrasheed-workflows', Array.from({length:50}, (_,n) => ({id:id('WF',n+1),name:`سير عمل ${services[n%services.length]} — ${companies[n]}`,service:`SRV-${String((n%8)+1).padStart(3,'0')}`,description:'سير عمل تشغيلي قابل للمتابعة.',department:n%2?'التقاضي':'العقود والاستشارات',active:true,updated:date(n+1),stages:[]})));
    write('alrasheed-contracts', Array.from({length:50}, (_,n) => { const i=n+1; return {id:id('CTR',i),reference:id('CTR',i),matter:id('MAT',i),service:services[n%services.length],title:`عقد ${companies[n]} مع موردها`,type:['خدمات','توريد','مقاولات','شراكة'][n%4],client:companies[n],counterparty:`مؤسسة ${companies[(n+7)%50]}`,responsible:people[n%people.length],lifecycle:['مسودة','قيد المراجعة','ساري','منتهي'][n%4],versions:[],parties:[],clauses:[],obligations:[],reviews:[],approvals:[],requirements:[],activity:[]}; }));
    write('alrasheed-formations', Array.from({length:50}, (_,n) => { const i=n+1; return {id:id('FRM',i),reference:id('FRM',i),client:companies[n],type:['شركة ذات مسؤولية محدودة','شركة مساهمة','شركة شخص واحد','منشأة فردية'][n%4],name:companies[n],lawyer:people[n%people.length],started:date(i),notes:[],activity:[]}; }));
    const crm = {leads:[],opportunities:[],followups:[]};
    for (let n=0;n<50;n++) { const i=n+1; crm.leads.push({id:id('LEAD',i),reference:id('LEAD',i),name:companies[n],type:'شركة / جهة',companyName:companies[n],phone:`010${String(10000000+i).slice(-8)}`,email:`legal${i}@example.com`,sourceId:`SRC-${n%5+1}`,serviceId:`SRV-${String(n%8+1).padStart(3,'0')}`,needDescription:`احتياج متعلق بـ${services[n%services.length]}`,estimatedValue:25000+i*1750,currency:'ج.م',ownerId:`EMP-${n%6+1}`,status:['جديد','تم التواصل','مؤهل'][n%3],priority:n%6===0?'عالية':'عادية'}); crm.opportunities.push({id:id('OPP',i),reference:id('OPP',i),title:`فرصة ${services[n%services.length]} — ${companies[n]}`,leadId:id('LEAD',i),serviceId:`SRV-${String(n%8+1).padStart(3,'0')}`,stage:['اكتشاف الاحتياج','عرض السعر','تفاوض','فوز'][n%4],estimatedValue:40000+i*2200,currency:'ج.م',ownerId:`EMP-${n%6+1}`,probability:25+(n%4)*20,nextAction:['إرسال عرض','اتصال متابعة','مراجعة المتطلبات','توقيع الاتفاق'][n%4]}); crm.followups.push({id:id('FU',i),leadId:id('LEAD',i),type:['مكالمة','بريد إلكتروني','اجتماع','رسالة'][n%4],occurredAt:`${date(i)}T${String(9+n%8).padStart(2,'0')}:00`,notes:`متابعة ${services[n%services.length]} مع ${companies[n]}`,result:['تم التواصل','بانتظار الرد','موعد محدد'][n%3],responsibleId:`EMP-${n%6+1}`}); }
    write('alrasheed-crm', crm);
    const finance = {agreements:[],invoices:[],payments:[],expenses:[],categories:['رسوم جهة','انتقالات','مستندات','تشغيل المكتب','أخرى'],activities:[]};
    for (let n=0;n<50;n++) { const i=n+1, client=clients[n][0], matter=id('MAT',i); finance.agreements.push({id:id('FEE',i),client,matter,type:['مبلغ ثابت','بالساعة','اشتراك شهري'][n%3],total:15000+i*900,status:n%5?'ساري':'منتهي'}); finance.invoices.push({id:id('INV',i),client,matter,issue:date(i),due:date(i+30),items:[{description:services[n%services.length],qty:1,price:5000+i*250}],status:['صادرة','مدفوعة جزئيًا','مسددة'][n%3]}); finance.payments.push({id:id('PAY',i),client,matter,date:date(i+2),amount:2500+i*150,method:['تحويل بنكي','نقدي','بطاقة'][n%3],allocations:[],status:'مسجلة'}); finance.expenses.push({id:id('EXP',i),description:`${['رسوم حكومية','تنقل إلى المحكمة','شراء مستلزمات','اشتراك مهني'][n%4]} — ${companies[n]}`,category:finance.categories[n%4],amount:300+i*45,date:date(i),client,matter,reimbursable:n%2===0,billed:false}); }
    write('alrasheed-finance', finance);
    localStorage.setItem('alrasheed-demo-data-v3', '1');
    if (window.P3?.clients) {
      window.P3.clients.length = 0;
      companies.forEach((company, n) => window.P3.clients.push([id('CLI', n + 1), company, n % 4 ? 'شركة' : 'فرد', `010${String(20000000+n+1).slice(-8)}`, `client${n+1}@example.com`, people[n % people.length], `${n % 8 + 1} ملفات`, n % 9 ? 'نشط' : 'غير نشط']));
    }
    if (window.P2) {
      window.P2.people.length = 0;
      companies.forEach((company, n) => window.P2.people.push([`${people[n % people.length]} — ${company}`, n % 2 ? 'محامي' : 'مساعد قانوني', n % 2 ? 'التقاضي' : 'العقود والاستشارات', n % 2 ? 'محامي' : 'موظف إداري', n % 10 ? 'نشط' : 'في إجازة', `${n % 9 + 1} ملفات · ${n % 5 + 1} مهام`, `010${String(30000000+n+1).slice(-8)}`]));
      window.P2.roles.length = 0;
      ['مدير النظام','مدير مكتب','مدير قسم التقاضي','مدير قسم الشركات','محامي أول','محامي استئناف','محامي نقض','مساعد قانوني','باحث قانوني','مسؤول ملفات','مسؤول علاقات عملاء','محاسب مالي','مراجع مالي','مسؤول موارد بشرية','مسؤول تقنية المعلومات','منسق جلسات','منسق مستندات','مسؤول تحصيل','مدير عمليات','مراجع عقود','أمين سر','مدير جودة','مسؤول امتثال','مسؤول مشتريات','مسؤول أرشيف','مسؤول استقبال','كاتب إداري','مسؤول بيانات','محلل أعمال','مستشار ضرائب','مستشار شركات','مستشار ملكية فكرية','منسق تدريب','مسؤول تسويق','مسؤول مبيعات','مسؤول دعم','مسؤول أمن معلومات','مسؤول مراسلات','مراقب حضور','مراقب أداء','منسق خدمات','مسؤول علاقات حكومية','مراجع داخلي','مسؤول مخاطر','مسؤول تأمين','مسؤول عقود','مسؤول دعاوى','مسؤول تنفيذ','مسؤول تسجيل','مسؤول جودة مستندات'].forEach(x => window.P2.roles.push(x));
      window.P2.departments.length = 0;
      ['التقاضي','الشركات والاستثمار','العقود والاستشارات','الشؤون الإدارية','المالية والحسابات','الموارد البشرية','خدمة العملاء','التسجيل والتراخيص','التنفيذ والتحصيل','الملكية الفكرية','البحوث القانونية','إدارة المستندات','الجودة والامتثال','التقنية والتحول الرقمي','التسويق وتطوير الأعمال','المشتريات والخدمات','الأرشيف','الدعم التشغيلي','العلاقات الحكومية','إدارة المخاطر','المراجعة الداخلية','التدريب والتطوير','إدارة المعرفة','الاستقبال','المراسلات','الخدمات المساندة','إدارة الفروع','التخطيط','التحليل والتقارير','الشؤون المالية للمشروعات','إدارة العقود','إدارة المنازعات','التسويات الودية','التحقيقات','الاستشارات الضريبية','الاستشارات العقارية','التوثيق','الترجمة القانونية','إدارة الموردين','المتابعة والتحصيل','الاستشارات الإدارية','إدارة الحسابات','مركز الاتصال','إدارة الشكاوى','التدقيق','الحوكمة','أمن المعلومات','إدارة الصلاحيات','التشغيل اليومي','المكتب التنفيذي'].forEach(x => window.P2.departments.push(x));
    }
  };
  demoSeed();
  setTimeout(() => {
    const page = document.body.dataset.page, table = document.querySelector('tbody');
    if (page === 'clients' && window.P3?.clients?.some(x => /تجريبية|النور|الأفق/.test(x[1]))) {
      const clients = JSON.parse(localStorage.getItem('alrasheed-clients') || '[]');
      window.P3.clients.splice(0, window.P3.clients.length, ...clients.map((x, i) => [x[0], x[1], x[2] === 'شركات' ? 'شركة' : 'فرد', `010${String(20000000 + i + 1).slice(-8)}`, `client${i + 1}@example.com`, ['أحمد محمود','منى حسن','محمود السيد','سارة علي'][i % 4], `${i % 8 + 1} ملفات`, i % 9 ? 'نشط' : 'غير نشط']));
      window.P3.list();
      return;
    }
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
