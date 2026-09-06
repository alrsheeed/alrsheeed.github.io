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
