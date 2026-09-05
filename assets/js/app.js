const NAV_GROUPS = [
  ['الرئيسية', [['index.html', 'لوحة التحكم', 'bi-grid-1x2']]],
  ['إدارة المكتب', [
    ['clients.html', 'العملاء', 'bi-people'],
    ['calendar.html', 'التقويم', 'bi-calendar3'],
    ['matters.html', 'الملفات القانونية', 'bi-folder2'],
    ['cases.html', 'القضايا', 'bi-briefcase'],
    ['hearings.html', 'الجلسات', 'bi-calendar-event'],
    ['documents.html', 'المستندات', 'bi-file-earmark-text'],
    ['tasks.html', 'المهام', 'bi-check2-square'],
    ['company-formations.html', 'تأسيس الشركات', 'bi-building'],
    ['team.html', 'فريق العمل', 'bi-people'],
    ['departments.html', 'الأقسام', 'bi-diagram-3'],
    ['workflows.html', 'سير العمل', 'bi-diagram-3']
  ]],
  ['الخدمات القانونية', [['services.html', 'الخدمات', 'bi-layers']]],
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

function initSidebars() {
  document.querySelectorAll('.sidebar-nav, .mobile-drawer .sidebar-nav').forEach(renderSidebarNav);
}

window.Sidebar = window.Sidebar || {
  toggle() {
    document.querySelectorAll('.sidebar').forEach(sidebar => sidebar.classList.toggle('is-collapsed'));
    const collapsed = document.querySelector('.sidebar')?.classList.contains('is-collapsed');
    localStorage.setItem('alrasheed-sidebar', collapsed ? 'collapsed' : 'open');
  },
  init() {
    if (localStorage.getItem('alrasheed-sidebar') === 'collapsed') {
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
  initSidebars();
  window.Sidebar.init();

  const observer = new MutationObserver(initSidebars);
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
