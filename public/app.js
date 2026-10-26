window.addEventListener('error', function(event) {
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '<div class="login"><h1>Gagal memuat aplikasi</h1><p class="muted">Salin pesan berikut dan kirimkan kepada pengembang.</p><pre id="bootError" style="white-space:pre-wrap;color:#a33138"></pre><p class="muted">Antarmuka v2026.09.27.5</p></div>';
  var output = document.getElementById('bootError');
  if (output) output.textContent = (event.message || 'Kesalahan JavaScript') + ' (baris ' + (event.lineno || '-') + ')';
});

'use strict';
const state={token:sessionStorage.getItem('billingToken')||'',data:null,view:'dashboard',dashboardPeriod:'',pettyMenuOpen:false,pettyPeriod:null,pettyCategory:'',pettyBookFilter:{mode:'month',date:'',month:'',year:''},filter:{period:'',status:'',q:''}};
const $=id=>document.getElementById(id);
const esc = value => String(value ?? '').replace(
  /[&<>"']/g,
  char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])
);
const rup = value => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(value) || 0);
const rupInputValue = value => {
  const digits=String(value??'').replace(/\D/g,'');
  return digits ? Number(digits).toLocaleString('id-ID') : '';
};
const currencyField = (name,label,value='',extra='') => `
  <div>
    <label>${esc(label)}</label>
    <div class="currency-input-wrap">
      <span class="currency-prefix">Rp</span>
      <input name="${name}" type="text" inputmode="numeric" autocomplete="off"
        data-rupiah value="${esc(rupInputValue(value))}" ${extra}>
    </div>
  </div>`;
function bindRupiahInputs(root=document){
  root.querySelectorAll('input[data-rupiah]').forEach(input=>{
    const apply=()=>{input.value=rupInputValue(input.value);};
    input.addEventListener('input',apply);
    input.addEventListener('blur',apply);
    apply();
  });
}
const day = value => value
  ? new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeZone: 'Asia/Jakarta'
    }).format(new Date(value + 'T12:00:00+07:00'))
  : '—';
const month = value => value
  ? new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    }).format(new Date(value + '-01T12:00:00+07:00'))
  : '—';
const byId = (items, key, id) => items.find(item => item[key] === id);

function icon(name) {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7"></rect>' +
      '<rect x="14" y="3" width="7" height="7"></rect>' +
      '<rect x="3" y="14" width="7" height="7"></rect>' +
      '<rect x="14" y="14" width="7" height="7"></rect>',
    customers: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>' +
      '<circle cx="9" cy="7" r="4"></circle>' +
      '<path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>' +
      '<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    packages: '<path d="M5 12.55a11 11 0 0 1 14.08 0"></path>' +
      '<path d="M1.42 9a16 16 0 0 1 21.16 0"></path>' +
      '<path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>' +
      '<circle cx="12" cy="20" r="1"></circle>',
    invoices: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' +
      '<polyline points="14 2 14 8 20 8"></polyline>' +
      '<line x1="8" y1="13" x2="16" y2="13"></line>' +
      '<line x1="8" y1="17" x2="16" y2="17"></line>',
    payments: '<rect x="2" y="5" width="20" height="14" rx="2"></rect>' +
      '<line x1="2" y1="10" x2="22" y2="10"></line>' +
      '<path d="M16 15h2"></path>',
    reports: '<line x1="18" y1="20" x2="18" y2="10"></line>' +
      '<line x1="12" y1="20" x2="12" y2="4"></line>' +
      '<line x1="6" y1="20" x2="6" y2="14"></line>',
    users: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>' +
      '<path d="M9 12l2 2 4-4"></path>',
    logs: '<line x1="8" y1="6" x2="21" y2="6"></line>' +
      '<line x1="8" y1="12" x2="21" y2="12"></line>' +
      '<line x1="8" y1="18" x2="21" y2="18"></line>' +
      '<line x1="3" y1="6" x2="3.01" y2="6"></line>' +
      '<line x1="3" y1="12" x2="3.01" y2="12"></line>' +
      '<line x1="3" y1="18" x2="3.01" y2="18"></line>',
    pettyCash: '<path d="M3 7V5a2 2 0 0 1 2-2h14v4"></path><rect x="3" y="7" width="18" height="14" rx="2"></rect><path d="M17 12h4v5h-4a2.5 2.5 0 0 1 0-5z"></path>',
    pettyIncome: '<path d="M12 3v15"></path><path d="m6 12 6 6 6-6"></path><path d="M4 21h16"></path>',
    pettyExpenses: '<path d="M12 21V6"></path><path d="m6 12 6-6 6 6"></path><path d="M4 3h16"></path>',
    pettyBook: '<path d="M4 3h16v18H4z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path><path d="M8 15h3"></path><path d="M14 15h2"></path>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"></rect>' +
      '<line x1="16" y1="2" x2="16" y2="6"></line>' +
      '<line x1="8" y1="2" x2="8" y2="6"></line>' +
      '<line x1="3" y1="10" x2="21" y2="10"></line>',
    income: '<path d="M12 19V5"></path><polyline points="6 11 12 5 18 11"></polyline>',
    outstanding: '<circle cx="12" cy="12" r="9"></circle>' +
      '<polyline points="12 7 12 12 15 14"></polyline>',
    active: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>' +
      '<circle cx="8.5" cy="7" r="4"></circle>' +
      '<polyline points="17 11 19 13 23 9"></polyline>',
    overdue: '<path d="M10.3 2.9L1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z"></path>' +
      '<line x1="12" y1="9" x2="12" y2="13"></line>' +
      '<line x1="12" y1="17" x2="12.01" y2="17"></line>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>' +
      '<path d="M10 21h4"></path>',
    more: '<circle cx="5" cy="12" r="1"></circle>' +
      '<circle cx="12" cy="12" r="1"></circle>' +
      '<circle cx="19" cy="12" r="1"></circle>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"></line>' +
      '<line x1="5" y1="12" x2="19" y2="12"></line>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>' +
      '<polyline points="16 17 21 12 16 7"></polyline>' +
      '<line x1="21" y1="12" x2="9" y2="12"></line>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.dashboard}</svg>`;
}

function initials(name) {
  return String(name || 'U').trim().split(/\s+/).slice(0, 2)
    .map(part => part.charAt(0)).join('').toUpperCase();
}

function notice(message, error = false) {
  $('feedback').innerHTML =
    '<div class="toast ' + (error ? 'error' : '') + '">' + esc(message) + '</div>';
  setTimeout(() => {
    if ($('feedback')) $('feedback').innerHTML = '';
  }, 6500);
}

function busy(active) {
  let element = $('busy');
  if (active && !element) {
    element = document.createElement('div');
    element.id = 'busy';
    element.className = 'loading';
    element.textContent = 'Memproses…';
    document.body.append(element);
  } else if (!active && element) {
    element.remove();
  }
}

async function call(action, payload = {}) {
  busy(true);
  try {
    const response = await fetch('/api/gas', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      cache: 'no-store',
      body: JSON.stringify({action, payload, token: state.token})
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || result.ok !== true) {
      const message = result?.error || `Server API gagal (${response.status}).`;
      throw new Error(message);
    }
    return result.data;
  } catch (error) {
    const message = error?.message || String(error);
    notice(message, true);
    if (/Sesi berakhir|Sesi tidak valid|Akses pengguna tidak aktif/.test(message)) {
      state.token = '';
      sessionStorage.removeItem('billingToken');
      showLogin();
    }
    throw error;
  } finally {
    busy(false);
  }
}
function showLogin() {
  state.dashboardPeriod = '';
  $('app').innerHTML = `
    <div class="login">
      <h1>Ziel Net Billing</h1>
      <p class="muted">Masuk dengan akun yang diberikan Admin.</p>
      <form id="loginForm">
        <label>Username</label>
        <input name="username" autocomplete="username" required>
        <label>Password</label>
        <input name="password" type="password" autocomplete="current-password" required>
        <button>Masuk</button>
      </form>
      <p class="muted">Antarmuka v2026.09.27.5</p>
    </div>`;
  $('loginForm').onsubmit = async event => {
    event.preventDefault();
    try {
      const result = await call('login', Object.fromEntries(new FormData(event.target)));
      state.token = result.token;
      sessionStorage.setItem('billingToken', result.token);
      await reload();
    } catch (_) {}
  };
}

async function reload() {
  try {
    state.data = await call('overview');
    render();
  } catch (error) {
    if (state.token) notice('Tidak dapat mengambil data.', true);
  }
}

async function logoutApp() {
  try { await call('logout'); } catch (_) {}
  state.token = '';
  state.data = null;
  sessionStorage.removeItem('billingToken');
  showLogin();
}

async function mutate(action, payload) {
  try {
    const result = await call(action, payload);
    closeModal();
    await reload();
    let message = 'Data berhasil disimpan.';
    if (action === 'deleteCustomer') message = 'Pelanggan berhasil dihapus.';
    if (action === 'generateInvoices') {
      const reasons = result.failed.length
        ? ': ' + result.failed.map(item => item.customer + ' ' + item.reason).join('; ')
        : '';
      message = `Dibuat ${result.created}, dilewati ${result.skipped}, ` +
        `gagal ${result.failed.length}${reasons}`;
    }
    notice(message);
    return result;
  } catch (_) {
    return null;
  }
}

function render() {
  const data = state.data;
  if (!data) return showLogin();
  const admin = data.user.Peran === 'Admin';
  const views = [
    ['dashboard', 'Dashboard'],
    ['customers', 'Pelanggan'],
    ['packages', 'Paket'],
    ['invoices', 'Tagihan'],
    ['payments', 'Riwayat Bayar'],
    ['reports', 'Laporan']
  ];
   if (admin) views.push(['users', 'Pengguna'], ['logs', 'Log']);
   const pettyViews = [['pettyIncome', 'Pemasukan / Top Up'], ['pettyExpenses', 'Pengeluaran'], ['pettyBook', 'Buku Kas']];
   const menuViews = views.concat(pettyViews);
   if (!menuViews.some(view => view[0] === state.view)) state.view = 'dashboard';
  const firstName = String(data.user.Nama || 'Pengguna').trim().split(/\s+/)[0];
  const mobilePrimary = [
    ['dashboard', 'Beranda'],
    ['customers', 'Pelanggan'],
    ['invoices', 'Tagihan'],
    ['payments', 'Bayar']
  ];
  const alertCount = Number(data.metrics.overdue || 0) + Number(data.metrics.dueSoon || 0);
  $('app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">ZN</div>
          <div class="brand-copy">
            <strong>Ziel Net</strong>
            <small>Track. Bill. Grow.</small>
          </div>
        </div>
        <nav>${views.map(([id, label]) => `
          <button data-view="${id}" class="${state.view === id ? 'active' : ''}">
            <span class="nav-icon">${icon(id)}</span>
            <span>${label}</span>
           </button>`).join('')}
           <div class="nav-group">
             <button type="button" class="nav-group-toggle ${['pettyIncome','pettyExpenses','pettyBook'].includes(state.view) ? 'active' : ''}"
               id="pettyToggle" aria-expanded="${state.pettyMenuOpen}">
               <span class="nav-icon">${icon('pettyCash')}</span>
               <span>Petty Cash</span><span class="nav-chevron">▶</span>
             </button>
             <div class="nav-submenu ${state.pettyMenuOpen ? 'open' : ''}" id="pettySubmenu">
               ${pettyViews.map(([id,label]) => `<button type="button" data-petty-view="${id}"
                 class="${state.view === id ? 'active' : ''}">
                 <span class="nav-icon">${icon(id)}</span><span>${label}</span></button>`).join('')}
             </div>
           </div></nav>
         <div class="sidebar-promo">
          <div class="promo-icon">↗</div>
          <strong>Billing lebih terkendali</strong>
          <p>Pantau tagihan dan tindak lanjut pelanggan dari satu panel.</p>
        </div>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div class="topbar-title">
            <div class="desktop-header-copy">
              <strong>Ziel Net Billing System</strong>
              <small>Data tersinkron dari Google Sheets</small>
            </div>
            <div class="mobile-header-copy">
              <strong>Ziel Net Billing</strong>
              <small>${greetingText()}, ${esc(firstName)}</small>
            </div>
          </div>
          <div class="topbar-actions">
            <div class="date-chip">
              <span class="top-icon">${icon('calendar')}</span>
              <span>${day(data.today)}</span>
            </div>
            <div class="user-chip">
              <span class="user-avatar">${esc(initials(data.user.Nama))}</span>
              <span>${esc(data.user.Nama)}<small>${esc(data.user.Peran)}</small></span>
            </div>
            <button class="logout-button" id="logout" title="Keluar"
              aria-label="Keluar"><span class="top-icon">${icon('logout')}</span></button>
            <div class="mobile-top-actions">
              <button class="mobile-top-button" id="mobileAlerts"
                title="Tagihan perlu ditindaklanjuti" aria-label="Tagihan perlu ditindaklanjuti">
                <span class="top-icon">${icon('bell')}</span>
                ${alertCount ? `<span class="mobile-alert-count">${Math.min(alertCount, 99)}</span>` : ''}
              </button>
              <button class="mobile-top-button" id="mobileMore"
                title="Menu lainnya" aria-label="Menu lainnya">
                <span class="top-icon">${icon('more')}</span>
              </button>
            </div>
          </div>
        </header>
        <main id="content" class="${state.view === 'dashboard' ? 'mobile-dashboard-main' : ''}"></main>
      </section>
      <nav class="mobile-bottom-nav" aria-label="Navigasi utama">
        ${mobilePrimary.slice(0, 2).map(([id, label]) => `
          <button data-mobile-view="${id}" class="${state.view === id ? 'active' : ''}">
            <span class="nav-icon">${icon(id)}</span><span>${label}</span>
          </button>`).join('')}
        <span class="mobile-nav-spacer" aria-hidden="true"></span>
        ${mobilePrimary.slice(2).map(([id, label]) => `
          <button data-mobile-view="${id}" class="${state.view === id ? 'active' : ''}">
            <span class="nav-icon">${icon(id)}</span><span>${label}</span>
          </button>`).join('')}
      </nav>
      <button class="mobile-fab" id="mobileQuickAction"
        aria-label="${admin ? 'Tambah pelanggan' : 'Buka daftar tagihan'}"
        title="${admin ? 'Tambah pelanggan' : 'Buka daftar tagihan'}">
        <span class="button-icon">${icon('plus')}</span>
      </button>
    </div>`;
  document.querySelectorAll('[data-view]').forEach(button => {
    button.onclick = () => {
      state.view = button.dataset.view;
      render();
    };
  });
   $('pettyToggle').onclick = () => {
     state.pettyMenuOpen = !state.pettyMenuOpen;
     $('pettyToggle').setAttribute('aria-expanded',String(state.pettyMenuOpen));
     $('pettySubmenu').classList.toggle('open',state.pettyMenuOpen);
   };
   document.querySelectorAll('[data-petty-view]').forEach(button => {
     button.onclick = () => {state.view=button.dataset.pettyView;state.pettyMenuOpen=true;render();};
   });
   document.querySelectorAll('[data-mobile-view]').forEach(button => {
    button.onclick = () => {
      state.view = button.dataset.mobileView;
      render();
    };
  });
  $('logout').onclick = logoutApp;
  $('mobileAlerts').onclick = () => {
    state.view = 'invoices';
    state.filter.status = 'Belum Lunas';
    render();
  };
   $('mobileMore').onclick = () => showMobileMenu(menuViews);
  $('mobileQuickAction').onclick = () => {
    if (admin) {
      state.view = 'customers';
      render();
      customerForm();
      return;
    }
    state.view = 'invoices';
    render();
  };
   ({dashboard, customers, packages, invoices, payments, reports, users, logs, pettyIncome, pettyExpenses, pettyBook})[state.view]();
}

function showMobileMenu(views) {
  closeModal();
  const primary = new Set(['dashboard', 'customers', 'invoices', 'payments']);
   const petty = new Set(['pettyIncome','pettyExpenses','pettyBook']);
   const secondary = views.filter(([id]) => !primary.has(id) && !petty.has(id));
   const pettySecondary = views.filter(([id]) => petty.has(id));
  const element = document.createElement('div');
  element.className = 'modal mobile-menu-modal';
  element.id = 'dialog';
  element.innerHTML = `
    <div class="panel mobile-menu-sheet">
      <div class="mobile-sheet-handle" aria-hidden="true"></div>
      <div class="panel-heading">
        <h2>Menu lainnya</h2>
        <button type="button" class="secondary" id="closeDialog">Tutup</button>
      </div>
      <div class="mobile-menu-grid">
        ${secondary.map(([id, label]) => `
          <button type="button" data-menu-view="${id}"
            class="${state.view === id ? 'active' : ''}">
            <span class="nav-icon">${icon(id)}</span><span>${esc(label)}</span>
          </button>`).join('')}
       </div>
       <div class="mobile-menu-heading">Petty Cash</div>
       <div class="mobile-menu-grid">
         ${pettySecondary.map(([id,label]) => `<button type="button" data-menu-view="${id}"
           class="${state.view === id ? 'active' : ''}">
           <span class="nav-icon">${icon(id)}</span><span>${esc(label)}</span></button>`).join('')}
       </div>
       <button type="button" class="mobile-menu-logout" id="mobileMenuLogout">
        <span class="nav-icon">${icon('logout')}</span><span>Keluar dari aplikasi</span>
      </button>
    </div>`;
  document.body.append(element);
  $('closeDialog').onclick = closeModal;
  element.onclick = event => {
    if (event.target === element) closeModal();
  };
  document.querySelectorAll('[data-menu-view]').forEach(button => {
    button.onclick = () => {
       state.view = button.dataset.menuView;
       if (state.view==='pettyIncome'||state.view==='pettyExpenses'||state.view==='pettyBook')state.pettyMenuOpen=true;
      closeModal();
      render();
    };
  });
  $('mobileMenuLogout').onclick = () => {
    closeModal();
    logoutApp();
  };
}

function table(headers, body) {
  const emptyRow = `
    <tr><td colspan="${headers.length}" class="muted">Belum ada data.</td></tr>`;
  requestAnimationFrame(prepareMobileTables);
  return `
    <div class="panel table-wrap">
      <table class="table">
        <thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead>
        <tbody>${body || emptyRow}</tbody>
      </table>
    </div>`;
}

function prepareMobileTables() {
  document.querySelectorAll('.table').forEach(element => {
    const labels = [...element.querySelectorAll('thead th')]
      .map(cell => cell.textContent.trim());
    element.classList.add('mobile-card-table');
    element.querySelectorAll('tbody tr').forEach(row => {
      [...row.children].forEach((cell, index) => {
        if (!cell.hasAttribute('colspan')) cell.dataset.label = labels[index] || '';
      });
    });
  });
}

function customer(id) {
  return byId(state.data.customers, 'ID_Pelanggan', id);
}

function pkg(id) {
  return byId(state.data.packages, 'ID_Paket', id);
}

function badge(status) {
  const style = status === 'Lunas' || status === 'Aktif'
    ? 'green'
    : status === 'Isolir' || status === 'Belum Lunas' ? 'red' : '';
  return `<span class="pill ${style}">${esc(status)}</span>`;
}

function greetingText() {
  const hour = Number(new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(new Date()));
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function validPeriod(period) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(period || ''));
}

function shiftPeriod(period, offset) {
  if (!validPeriod(period)) return '';
  const [year, monthNumber] = period.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + Number(offset || 0), 1));
  return shifted.getUTCFullYear() + '-' +
    String(shifted.getUTCMonth() + 1).padStart(2, '0');
}

function dashboardPeriodNavigator(selectedPeriod, todayPeriod, extraClass = '') {
  const choices = [
    {label: 'Bulan lalu', period: shiftPeriod(todayPeriod, -1)},
    {label: 'Bulan ini', period: todayPeriod},
    {label: 'Berikutnya', period: shiftPeriod(todayPeriod, 1)}
  ];
  return `<div class="dashboard-period-nav ${extraClass}"
    role="group" aria-label="Pilih periode dashboard">
    ${choices.map(choice => `
      <button type="button"
        class="dashboard-period-button ${choice.period === selectedPeriod ? 'active' : ''}"
        data-dashboard-period="${choice.period}"
        aria-pressed="${choice.period === selectedPeriod}">
        <span>${choice.label}</span>
        <small>${esc(shortPeriod(choice.period))}</small>
      </button>`).join('')}
  </div>`;
}

function periodOptions(periods, selected, allLabel = '') {
  const valid = periods.filter(validPeriod);
  if (validPeriod(selected)) valid.push(selected);
  const unique = [...new Set(valid)].sort().reverse();
  const all = allLabel
    ? `<option value="" ${validPeriod(selected) ? '' : 'selected'}>${esc(allLabel)}</option>`
    : '';
  return all + unique.map(period => `
    <option value="${period}" ${period === selected ? 'selected' : ''}>
      ${esc(month(period))}
    </option>`).join('');
}

function billingMonthOptions(selected) {
  return Array.from({length: 12}, (_, index) => {
    const value = String(index + 1).padStart(2, '0');
    const label = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      timeZone: 'Asia/Jakarta'
    }).format(new Date(`2020-${value}-01T12:00:00+07:00`));
    return `<option value="${value}" ${value === selected ? 'selected' : ''}>` +
      `${esc(label)}</option>`;
  }).join('');
}

function shortPeriod(period) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).format(new Date(period + '-01T12:00:00+07:00'));
}

function rupCompact(value) {
  const amount = Number(value) || 0;
  const format = number => number.toLocaleString('id-ID', {maximumFractionDigits: 1});
  if (amount >= 1000000000) return 'Rp' + format(amount / 1000000000) + ' M';
  if (amount >= 1000000) return 'Rp' + format(amount / 1000000) + ' jt';
  if (amount >= 1000) return 'Rp' + format(amount / 1000) + ' rb';
  return 'Rp' + format(amount);
}

function stat3dChrome(tone = 'zinc') {
  return `
    <div class="stat-3d-shine" aria-hidden="true"></div>
    <div class="stat-3d-glare" aria-hidden="true"></div>
    <div class="puma-banner puma-banner-${tone}" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>`;
}

function miniSparkline(shape = 0) {
  const paths = [
    'M2 24 C10 20 13 12 22 16 S34 22 42 13 S55 8 62 12 S72 5 82 7',
    'M2 23 C10 21 14 8 23 13 S33 24 43 14 S53 7 62 11 S72 3 82 6',
    'M2 25 C11 23 12 13 21 14 S32 22 42 13 S53 17 62 9 S73 12 82 5',
    'M2 24 C10 16 15 20 22 12 S35 8 43 15 S56 10 63 7 S74 9 82 3'
  ];
  return `<svg class="mini-spark" viewBox="0 0 84 30" aria-hidden="true">
    <path d="${paths[shape] || paths[0]}" fill="none" stroke="currentColor"
      stroke-width="2.3" stroke-linecap="round"></path>
  </svg>`;
}

function trendRows(invoices, currentPeriod) {
  const grouped = new Map();
  invoices.forEach(invoice => {
    const period = invoice.Periode_Bulan;
    if (!/^\d{4}-\d{2}$/.test(period)) return;
    const row = grouped.get(period) || {period, billed: 0, paid: 0};
    const amount = Number(invoice.Jumlah_Tagihan) || 0;
    row.billed += amount;
    if (invoice.Status_Bayar === 'Lunas') row.paid += amount;
    grouped.set(period, row);
  });
  return Array.from({length: 6}, (_, index) => {
    const period = shiftPeriod(currentPeriod, index - 5);
    return grouped.get(period) || {period, billed: 0, paid: 0};
  });
}

function trendChart(rows) {
  const width = 700;
  const height = 250;
  const left = 58;
  const right = 18;
  const top = 14;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(1, ...rows.flatMap(row => [row.billed, row.paid]));
  const x = index => rows.length === 1
    ? left + chartWidth / 2
    : left + chartWidth * index / (rows.length - 1);
  const y = value => top + chartHeight - chartHeight * value / maximum;
  const path = key => rows.map((row, index) =>
    (index ? 'L' : 'M') + x(index).toFixed(1) + ' ' + y(row[key]).toFixed(1)
  ).join(' ');
  const billedPath = path('billed');
  const paidPath = path('paid');
  const firstX = x(0).toFixed(1);
  const lastX = x(rows.length - 1).toFixed(1);
  const baseY = (top + chartHeight).toFixed(1);
  const area = `${billedPath} L${lastX} ${baseY} L${firstX} ${baseY} Z`;
  const grid = [0, .25, .5, .75, 1].map(rate => {
    const gridY = top + chartHeight * rate;
    const value = maximum * (1 - rate);
    return `<line class="chart-grid" x1="${left}" y1="${gridY}"
      x2="${width - right}" y2="${gridY}"></line>
      <text class="chart-label" x="${left - 8}" y="${gridY + 4}"
        text-anchor="end">${esc(rupCompact(value))}</text>`;
  }).join('');
  const labels = rows.map((row, index) => `
    <text class="chart-label" x="${x(index)}" y="${height - 12}"
      text-anchor="middle">${esc(shortPeriod(row.period))}</text>`).join('');
  const billedPoints = rows.map((row, index) => `
    <circle class="chart-point" cx="${x(index)}" cy="${y(row.billed)}" r="4"></circle>
  `).join('');
  const paidPoints = rows.map((row, index) => `
    <circle class="chart-paid-point" cx="${x(index)}" cy="${y(row.paid)}" r="3.5"></circle>
  `).join('');
  return `<svg class="trend-chart" viewBox="0 0 ${width} ${height}"
    role="img" aria-label="Grafik tren tagihan dan pembayaran">
    <defs>
      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7047eb" stop-opacity=".24"></stop>
        <stop offset="100%" stop-color="#7047eb" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    ${grid}
    <path class="chart-area" d="${area}"></path>
    <path class="chart-billed" d="${billedPath}"></path>
    <path class="chart-paid" d="${paidPath}"></path>
    ${billedPoints}${paidPoints}${labels}
  </svg>`;
}

function dashboard() {
  const data = state.data;
  const todayPeriod = data.today.slice(0, 7);
  if (!validPeriod(state.dashboardPeriod)) state.dashboardPeriod = todayPeriod;
  const currentPeriod = state.dashboardPeriod;
  const currentInvoices = data.invoices.filter(invoice =>
    invoice.Periode_Bulan === currentPeriod
  );
  const paidThisMonth = data.invoices.filter(invoice =>
    invoice.Status_Bayar === 'Lunas' && invoice.Tanggal_Bayar.slice(0, 7) === currentPeriod
  );
  const unpaid = currentInvoices.filter(invoice => invoice.Status_Bayar === 'Belum Lunas');
  const currentPaid = currentInvoices.filter(invoice => invoice.Status_Bayar === 'Lunas');
  const selectedIncome = paidThisMonth.reduce(
    (total, invoice) => total + Number(invoice.Jumlah_Tagihan || 0),
    0
  );
  const selectedOutstanding = unpaid.reduce(
    (total, invoice) => total + Number(invoice.Jumlah_Tagihan || 0),
    0
  );
  const threeDaysLater = new Date(data.today + 'T12:00:00+07:00');
  threeDaysLater.setUTCDate(threeDaysLater.getUTCDate() + 3);
  const dueThrough = threeDaysLater.toISOString().slice(0, 10);
  const metrics = {
    ...data.metrics,
    income: selectedIncome,
    outstanding: selectedOutstanding,
    dueSoon: unpaid.filter(invoice =>
      invoice.Tanggal_Jatuh_Tempo >= data.today &&
      invoice.Tanggal_Jatuh_Tempo <= dueThrough
    ).length,
    overdue: unpaid.filter(invoice => invoice.Tanggal_Jatuh_Tempo < data.today).length
  };
  const billedValue = currentInvoices.reduce(
    (total, invoice) => total + Number(invoice.Jumlah_Tagihan || 0),
    0
  );
  const paidValue = currentPaid.reduce(
    (total, invoice) => total + Number(invoice.Jumlah_Tagihan || 0),
    0
  );
  const collectionRate = billedValue ? Math.round(paidValue / billedValue * 100) : 0;
  const totalCustomers = data.customers.length;
  const activeRate = totalCustomers
    ? Math.round(metrics.active / totalCustomers * 100)
    : 0;
  const firstName = String(data.user.Nama || 'Admin').trim().split(/\s+/)[0];
  const cards = [
    {
      tone: 'purple', icon: 'income',
      label: currentPeriod === todayPeriod ? 'Pemasukan bulan ini' : 'Pemasukan periode',
      value: rup(metrics.income), foot: `${paidThisMonth.length} pembayaran diterima`
    },
    {
      tone: 'orange', icon: 'outstanding', label: 'Tagihan belum dibayar',
      value: rup(metrics.outstanding), foot: `${unpaid.length} tagihan belum lunas`
    },
    {
      tone: 'green', icon: 'active', label: 'Pelanggan aktif',
      value: metrics.active, foot: `${activeRate}% dari ${totalCustomers} pelanggan`
    },
    {
      tone: 'blue', icon: 'overdue', label: 'Lewat jatuh tempo',
      value: metrics.overdue, foot: `${metrics.dueSoon} akan jatuh tempo ≤ 3 hari`
    }
  ];
  const totalStatus = Math.max(
    0,
    Number(metrics.active) + Number(metrics.inactive) + Number(metrics.isolated)
  );
  const activeEnd = totalStatus ? metrics.active / totalStatus * 100 : 0;
  const inactiveEnd = totalStatus
    ? (Number(metrics.active) + Number(metrics.inactive)) / totalStatus * 100
    : 0;
  const donut = totalStatus
    ? `conic-gradient(#10b981 0 ${activeEnd}%, #f59e0b ${activeEnd}% ` +
      `${inactiveEnd}%, #ef476f ${inactiveEnd}% 100%)`
    : 'conic-gradient(#e9edf5 0 100%)';
  const trend = trendRows(data.invoices, currentPeriod);
  const latestPaid = paidThisMonth
    .slice().sort((a, b) => {
      const dateOrder = String(b.Tanggal_Bayar).localeCompare(String(a.Tanggal_Bayar));
      return dateOrder || String(b.ID_Tagihan).localeCompare(String(a.ID_Tagihan));
    }).slice(0, 5);
  const paymentRows = latestPaid.map(invoice => {
    const client = customer(invoice.ID_Pelanggan);
    const name = client?.Nama_Lengkap || invoice.ID_Pelanggan;
    return `<tr>
      <td><div class="customer-cell">
        <span class="customer-initial">${esc(initials(name))}</span>
        <span><strong>${esc(name)}</strong><small>${esc(invoice.ID_Tagihan)}</small></span>
      </div></td>
      <td>${esc(month(invoice.Periode_Bulan))}</td>
      <td>${day(invoice.Tanggal_Bayar)}</td>
      <td><span class="pill green">${esc(invoice.Metode_Bayar)}</span></td>
      <td><strong>${rup(invoice.Jumlah_Tagihan)}</strong></td>
    </tr>`;
  }).join('');
  const mobilePaymentRows = latestPaid.map(invoice => {
    const client = customer(invoice.ID_Pelanggan);
    const name = client?.Nama_Lengkap || invoice.ID_Pelanggan;
    return `<div class="mobile-transaction-row">
      <span class="mobile-transaction-avatar">${esc(initials(name))}</span>
      <span class="mobile-transaction-copy">
        <strong>${esc(name)}</strong>
        <small>${day(invoice.Tanggal_Bayar)} · ${esc(invoice.Metode_Bayar)}</small>
      </span>
      <span class="mobile-transaction-amount">
        + ${rup(invoice.Jumlah_Tagihan)}
        <small>${esc(invoice.ID_Tagihan)}</small>
      </span>
    </div>`;
  }).join('');
  const emptyPayments = `<tr><td colspan="5" class="empty-dashboard">
    Belum ada pembayaran yang tercatat.</td></tr>`;
  $('content').innerHTML = `
    <section class="mobile-dashboard">
      <article class="mobile-balance-card">
        <span class="mobile-balance-orb orb-one" aria-hidden="true"></span>
        <span class="mobile-balance-orb orb-two" aria-hidden="true"></span>
        <span class="mobile-balance-label">Total pemasukan</span>
        <strong>${rup(metrics.income)}</strong>
        <small>${paidThisMonth.length} pembayaran · ${esc(month(currentPeriod))}</small>
      </article>
      ${dashboardPeriodNavigator(currentPeriod, todayPeriod, 'mobile-period-nav')}
      <div class="mobile-finance-grid">
        <button type="button" class="mobile-finance-card unpaid" data-mobile-invoices>
          <span class="mobile-finance-icon">↓</span>
          <span>Belum dibayar</span>
          <strong>${rup(metrics.outstanding)}</strong>
          <small>${unpaid.length} tagihan</small>
        </button>
        <button type="button" class="mobile-finance-card overdue" data-mobile-invoices>
          <span class="mobile-finance-icon">!</span>
          <span>Lewat tempo</span>
          <strong>${metrics.overdue}</strong>
          <small>${metrics.dueSoon} segera jatuh tempo</small>
        </button>
      </div>
      <article class="mobile-customer-card">
        <div><span class="customer-dot active"></span><strong>${metrics.active}</strong><small>Aktif</small></div>
        <div><span class="customer-dot inactive"></span><strong>${metrics.inactive}</strong><small>Nonaktif</small></div>
        <div><span class="customer-dot isolated"></span><strong>${metrics.isolated}</strong><small>Isolir</small></div>
      </article>
      <article class="mobile-transactions">
        <div class="mobile-transactions-heading">
          <h2>Pembayaran terbaru</h2>
          <button type="button" id="mobileViewPayments">Lihat semua</button>
        </div>
        <div class="mobile-transaction-list">
          ${mobilePaymentRows || '<p class="mobile-empty">Belum ada pembayaran yang tercatat.</p>'}
        </div>
      </article>
    </section>
    <section class="dashboard-hero">
      <div>
        <h1>${greetingText()}, ${esc(firstName)}! 👋</h1>
        <p>Berikut ringkasan operasional billing Ziel Net hari ini.</p>
      </div>
      ${dashboardPeriodNavigator(currentPeriod, todayPeriod, 'desktop-period-nav')}
    </section>
    <section class="dashboard-kpis">
      ${cards.map((card, index) => `
        <article class="metric-card ${card.tone} stat-3d-card stat-puma-card stat-card-${card.tone}">
          ${stat3dChrome(card.tone)}
          <div class="stat-card-content">
            <div class="metric-top">
              <span class="metric-icon">${icon(card.icon)}</span>
              ${miniSparkline(index)}
            </div>
            <span class="metric-label">${esc(card.label)}</span>
            <strong class="metric-value">${esc(card.value)}</strong>
            <span class="metric-foot"><b>↗</b>${esc(card.foot)}</span>
          </div>
        </article>`).join('')}
    </section>
    <section class="dashboard-grid">
      <article class="dashboard-panel">
        <div class="panel-heading">
          <h2>Status pelanggan</h2><span>Data aktual</span>
        </div>
        <div class="donut-layout">
          <div class="donut" style="--donut:${donut}">
            <div class="donut-center">
              <strong>${totalStatus}</strong><span>Total pelanggan</span>
            </div>
          </div>
          <div class="status-legend">
            <div class="legend-row">
              <span class="legend-dot" style="background:#10b981"></span>
              <span>Aktif<small>${activeRate}% pelanggan</small></span>
              <strong>${metrics.active}</strong>
            </div>
            <div class="legend-row">
              <span class="legend-dot" style="background:#f59e0b"></span>
              <span>Nonaktif<small>Status administrasi</small></span>
              <strong>${metrics.inactive}</strong>
            </div>
            <div class="legend-row">
              <span class="legend-dot" style="background:#ef476f"></span>
              <span>Isolir<small>Tindak lanjut manual</small></span>
              <strong>${metrics.isolated}</strong>
            </div>
          </div>
        </div>
      </article>
      <article class="dashboard-panel">
        <div class="panel-heading">
          <h2>Tren tagihan</h2><span>6 periode terakhir</span>
        </div>
        <div class="trend-wrap">${trendChart(trend)}</div>
        <div class="chart-legend">
          <span><i class="legend-line" style="background:#7047eb"></i>Tagihan dibuat</span>
          <span><i class="legend-line" style="background:#12b981"></i>Sudah lunas</span>
        </div>
      </article>
    </section>
    <section class="dashboard-panel billing-overview">
      <div class="panel-heading">
        <h2>Ringkasan penagihan ${esc(month(currentPeriod))}</h2>
        <span>${currentInvoices.length} tagihan</span>
      </div>
      <div class="billing-cards">
        <div class="billing-mini">
          <div class="billing-mini-top">
            <span class="billing-mini-icon" style="color:#7047eb;background:#eee9ff">%</span>
            <span>Tingkat tertagih</span>
          </div>
          <strong>${collectionRate}%</strong><small>${rup(paidValue)} diterima</small>
          <div class="progress"><span style="width:${collectionRate}%;background:#7047eb"></span></div>
        </div>
        <div class="billing-mini">
          <div class="billing-mini-top">
            <span class="billing-mini-icon" style="color:#0ba875;background:#e5faf2">✓</span>
            <span>Tagihan lunas</span>
          </div>
          <strong>${currentPaid.length}</strong><small>Dari ${currentInvoices.length} tagihan</small>
          <div class="progress"><span style="width:${collectionRate}%;background:#10b981"></span></div>
        </div>
        <div class="billing-mini">
          <div class="billing-mini-top">
            <span class="billing-mini-icon" style="color:#ef7805;background:#fff0dd">!</span>
            <span>Segera jatuh tempo</span>
          </div>
          <strong>${metrics.dueSoon}</strong><small>Dalam tiga hari</small>
          <div class="progress"><span style="width:${Math.min(100, metrics.dueSoon * 10)}%;
            background:#ff8a19"></span></div>
        </div>
        <div class="billing-mini">
          <div class="billing-mini-top">
            <span class="billing-mini-icon" style="color:#e54868;background:#ffebf0">×</span>
            <span>Pelanggan isolir</span>
          </div>
          <strong>${metrics.isolated}</strong><small>Administrasi manual</small>
          <div class="progress"><span style="width:${Math.min(100, metrics.isolated * 10)}%;
            background:#ef476f"></span></div>
        </div>
      </div>
    </section>
    <section class="dashboard-panel recent-payments">
      <div class="panel-heading">
        <h2>Pembayaran terbaru</h2>
        <button class="panel-link" id="viewPayments">Lihat semua</button>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Pelanggan</th><th>Periode</th><th>Tanggal</th>
          <th>Metode</th><th>Nominal</th></tr></thead>
        <tbody>${paymentRows || emptyPayments}</tbody>
      </table></div>
    </section>
    <section class="dashboard-callout">
      <div><h2>Penagihan rapi, arus kas lebih pasti 🚀</h2>
        <p>Tinjau tagihan yang perlu ditindaklanjuti dan kirim pengingat WhatsApp.</p></div>
      <button id="dashboardAction">${data.user.Peran === 'Admin'
        ? 'Kelola tagihan' : 'Buka daftar tagihan'}</button>
    </section>`;
  $('viewPayments').onclick = () => {
    state.view = 'payments';
    render();
  };
  $('mobileViewPayments').onclick = () => {
    state.view = 'payments';
    render();
  };
  document.querySelectorAll('[data-dashboard-period]').forEach(button => {
    button.onclick = () => {
      state.dashboardPeriod = button.dataset.dashboardPeriod;
      dashboard();
    };
  });
  document.querySelectorAll('[data-mobile-invoices]').forEach(button => {
    button.onclick = () => {
      state.view = 'invoices';
      state.filter.period = currentPeriod;
      state.filter.status = 'Belum Lunas';
      render();
    };
  });
  $('dashboardAction').onclick = () => {
    state.view = 'invoices';
    state.filter.period = currentPeriod;
    render();
  };
}

function customers() {
  const data = state.data;
  const admin = data.user.Peran === 'Admin';
  $('content').innerHTML = `
    <div class="row">
      <h1>Pelanggan</h1>
      ${admin ? '<button class="right" id="newCustomer">+ Tambah pelanggan</button>' : ''}
    </div>
    <div class="row">
      <div class="field">
        <input id="searchCustomer" placeholder="Cari nama, ID, WhatsApp, atau User PPPoE">
      </div>
    </div>
    <div id="listing"></div>`;
  const draw = () => {
    const query = $('searchCustomer').value.toLowerCase();
    const rows = data.customers
      .filter(item => [
        item.ID_Pelanggan,
        item.Nama_Lengkap,
        item.Nomor_WA,
        item.User_PPPOE
      ].some(value => String(value || '').toLowerCase().includes(query)))
      .map(item => {
        const actions = admin ? `
          <button class="ghost" data-edit="${esc(item.ID_Pelanggan)}">Edit</button>
          <button class="ghost" data-status="${esc(item.ID_Pelanggan)}">Status</button>
          <button class="ghost danger-text" data-delete="${esc(item.ID_Pelanggan)}">Hapus</button>` : '';
        return `
          <tr>
            <td>${esc(item.ID_Pelanggan)}</td>
            <td>${esc(item.Nama_Lengkap)}
              <div class="muted">${esc(item.Alamat_Lokasi)}</div></td>
            <td>${esc(item.User_PPPOE || '—')}</td>
            <td>${esc(item.Nomor_WA)}</td>
            <td>${esc(pkg(item.ID_Paket)?.Nama_Paket || item.ID_Paket)}</td>
            <td>Tanggal ${esc(item.Tanggal_Jatuh_Tempo)}</td>
            <td>${badge(item.Status_Langganan)}</td>
            <td>${actions}</td>
          </tr>`;
      }).join('');
    $('listing').innerHTML = table(
      ['ID', 'Nama', 'User PPPoE', 'WhatsApp', 'Paket', 'Jatuh tempo', 'Status', 'Aksi'],
      rows
    );
    document.querySelectorAll('[data-edit]').forEach(button => {
      button.onclick = () => customerForm(customer(button.dataset.edit));
    });
    document.querySelectorAll('[data-status]').forEach(button => {
      button.onclick = () => statusForm(customer(button.dataset.status));
    });
    document.querySelectorAll('[data-delete]').forEach(button => {
      button.onclick = () => deleteCustomerForm(customer(button.dataset.delete));
    });
  };
  $('searchCustomer').oninput = draw;
  draw();
  if (admin) $('newCustomer').onclick = () => customerForm();
}

function modal(title, body, onSubmit, submitLabel = 'Simpan', submitClass = '') {
  const element = document.createElement('div');
  element.className = 'modal';
  element.id = 'dialog';
  element.innerHTML = `
    <div class="panel">
      <div class="row">
        <h2>${esc(title)}</h2>
        <button type="button" class="secondary right" id="closeDialog">Tutup</button>
      </div>
      <form id="dialogForm">
        ${body}
        <div class="actions">
          <button type="submit" class="${esc(submitClass)}">${esc(submitLabel)}</button>
        </div>
      </form>
    </div>`;
  document.body.append(element);
  $('closeDialog').onclick = closeModal;
  element.onclick = event => {
    if (event.target === element) closeModal();
  };
  $('dialogForm').onsubmit = event => {
    event.preventDefault();
    onSubmit(Object.fromEntries(new FormData(event.target)));
  };
}

function closeModal() {
  $('dialog')?.remove();
}

const field = (name, label, value = '', type = 'text', extra = '') => `
  <div>
    <label>${esc(label)}</label>
    <input name="${name}" type="${type}" value="${esc(value)}" ${extra}>
  </div>`;

function customerForm(item) {
  const options = state.data.packages
    .filter(plan => plan.Status_Paket === 'Aktif' || plan.ID_Paket === item?.ID_Paket)
    .map(plan => `
      <option value="${esc(plan.ID_Paket)}"
        ${item?.ID_Paket === plan.ID_Paket ? 'selected' : ''}>
        ${esc(plan.Nama_Paket)} (${rup(plan.Harga_Bulanan)})
      </option>`).join('');
  const body = `
    <div class="form-grid">
      ${field('Nama_Lengkap', 'Nama lengkap', item?.Nama_Lengkap,
        'text', 'required maxlength="120"')}
      ${field('User_PPPOE', 'User PPPoE', item?.User_PPPOE,
        'text', 'required minlength="3" maxlength="64" autocomplete="off" ' +
        'autocapitalize="none" spellcheck="false" ' +
        'pattern="[A-Za-z0-9][A-Za-z0-9._@-]{2,63}" ' +
        'title="3–64 karakter: huruf, angka, titik, garis bawah, @, atau tanda minus"')}
      ${field('Nomor_WA', 'Nomor WhatsApp', item?.Nomor_WA,
        'tel', 'required pattern="(\\+?62|0)8[0-9 .()-]{8,17}"')}
      ${field('Alamat_Lokasi', 'Alamat/lokasi', item?.Alamat_Lokasi,
        'text', 'required maxlength="250"')}
      <div>
        <label>Paket</label>
        <select name="ID_Paket" required>${options}</select>
      </div>
      ${field('Tanggal_Jatuh_Tempo', 'Hari jatuh tempo bulanan (1–31)',
        item?.Tanggal_Jatuh_Tempo || 1, 'number', 'required min="1" max="31"')}
    </div>`;
  modal(
    item ? 'Edit pelanggan' : 'Tambah pelanggan',
    body,
    form => mutate('saveCustomer', {
      ...form,
      ID_Pelanggan: item?.ID_Pelanggan || ''
    })
  );
}

function statusForm(item) {
  const options = ['Aktif', 'Nonaktif', 'Isolir'].map(status => `
    <option ${item.Status_Langganan === status ? 'selected' : ''}>${status}</option>
  `).join('');
  modal(
    'Status ' + item.Nama_Lengkap,
    `<label>Status administrasi</label>
     <select name="status">${options}</select>
     <p class="muted">Status Isolir tidak memutus koneksi internet secara otomatis.</p>`,
    form => mutate('setCustomerStatus', {id: item.ID_Pelanggan, ...form})
  );
}

function deleteCustomerForm(item) {
  modal(
    'Hapus pelanggan',
    `<p>Anda akan menghapus <b>${esc(item.Nama_Lengkap)}</b>
       (${esc(item.ID_Pelanggan)}).</p>
     <p class="muted">Tindakan ini tidak dapat dibatalkan. Pelanggan yang sudah
       memiliki riwayat tagihan tidak dapat dihapus dan harus diubah menjadi Nonaktif.</p>
     <label>Ketik ID pelanggan untuk konfirmasi</label>
     <input name="confirmation" required autocomplete="off"
       placeholder="${esc(item.ID_Pelanggan)}">`,
    form => mutate('deleteCustomer', {id: item.ID_Pelanggan, ...form}),
    'Hapus pelanggan',
    'danger'
  );
}

function packages() {
  const data = state.data;
  const admin = data.user.Peran === 'Admin';
  const rows = data.packages.map(plan => {
    const action = admin ? `
      <button class="ghost" data-pkg="${esc(plan.ID_Paket)}">Edit/nonaktifkan</button>` : '';
    return `
      <tr>
        <td>${esc(plan.ID_Paket)}</td>
        <td>${esc(plan.Nama_Paket)}</td>
        <td>${esc(plan.Kecepatan)}</td>
        <td>${rup(plan.Harga_Bulanan)}</td>
        <td>${esc(plan.Deskripsi)}</td>
        <td>${badge(plan.Status_Paket)}</td>
        <td>${action}</td>
      </tr>`;
  }).join('');
  $('content').innerHTML = `
    <div class="row">
      <h1>Paket internet</h1>
      ${admin ? '<button id="newPackage" class="right">+ Tambah paket</button>' : ''}
    </div>` + table(
      ['ID', 'Paket', 'Kecepatan', 'Harga bulanan', 'Deskripsi', 'Status', 'Aksi'],
      rows
    );
  if (admin) {
    $('newPackage').onclick = () => packageForm();
    document.querySelectorAll('[data-pkg]').forEach(button => {
      button.onclick = () => packageForm(pkg(button.dataset.pkg));
    });
  }
}

function packageForm(plan) {
  const codeField = plan
    ? field('kode', 'Kode paket', plan.ID_Paket, 'text', 'readonly')
    : field('kode', 'Kode paket (contoh PKT-10M)', '', 'text',
        'required pattern="PKT-[A-Za-z0-9]{2,20}"');
  const body = `
    <div class="form-grid">
      ${codeField}
      ${field('Nama_Paket', 'Nama paket', plan?.Nama_Paket, 'text', 'required')}
      ${field('Kecepatan', 'Kecepatan', plan?.Kecepatan, 'text', 'required')}
      ${currencyField('Harga_Bulanan', 'Harga bulanan', plan?.Harga_Bulanan || 0,
        'required')}
      <div class="full">${field('Deskripsi', 'Deskripsi', plan?.Deskripsi)}</div>
      <div>
        <label>Status</label>
        <select name="Status_Paket">
          <option ${plan?.Status_Paket !== 'Nonaktif' ? 'selected' : ''}>Aktif</option>
          <option ${plan?.Status_Paket === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
        </select>
      </div>
    </div>`;
  modal(
    plan ? 'Edit paket' : 'Tambah paket',
    body,
    form => mutate('savePackage', {...form, ID_Paket: plan?.ID_Paket || ''})
  );
  bindRupiahInputs($('dialog'));
}

function invoiceRows(items) {
  const rows = items.map(invoice => `
    <tr>
      <td>${esc(invoice.ID_Tagihan)}</td>
      <td>${esc(customer(invoice.ID_Pelanggan)?.Nama_Lengkap || invoice.ID_Pelanggan)}</td>
      <td>${esc(month(invoice.Periode_Bulan))}</td>
      <td>${rup(invoice.Jumlah_Tagihan)}</td>
      <td>${day(invoice.Tanggal_Jatuh_Tempo)}</td>
      <td>${badge(invoice.Status_Bayar)}</td>
      <td><button class="ghost" data-inv="${esc(invoice.ID_Tagihan)}">Detail</button></td>
    </tr>`).join('');
  return table(
    ['ID', 'Pelanggan', 'Periode', 'Nominal', 'Jatuh tempo', 'Status', 'Aksi'],
    rows
  );
}

function invoices() {
  const data = state.data;
  const admin = data.user.Peran === 'Admin';
  const defaultPeriod = data.today.slice(0, 7);
  const defaultYear = defaultPeriod.slice(0, 4);
  const defaultMonth = defaultPeriod.slice(5, 7);
  const invoicePeriods = data.invoices.map(invoice => invoice.Periode_Bulan);
  const generator = admin ? `
    <div class="panel row no-print">
      <div class="field">
        <label>Bulan tagihan</label>
        <select id="generateMonth">
          ${billingMonthOptions(defaultMonth)}
        </select>
      </div>
      <div class="field">
        <label>Tahun tagihan</label>
        <input id="generateYear" type="number" min="2000" max="2100"
          step="1" inputmode="numeric" value="${defaultYear}">
        <small class="muted">Otomatis mengikuti tahun berjalan dan dapat diubah.</small>
      </div>
      <button id="generate" style="align-self:end">Generate Tagihan</button>
    </div>` : '';
  $('content').innerHTML = `
    <h1>Tagihan bulanan</h1>
    ${generator}
    <div class="row no-print">
      <div class="field">
        <label>Filter periode</label>
        <select id="periodFilter">
          ${periodOptions(invoicePeriods, state.filter.period, 'Semua bulan dan tahun')}
        </select>
      </div>
      <div class="field">
        <label>Status</label>
        <select id="statusFilter">
          <option value="">Semua</option><option>Belum Lunas</option><option>Lunas</option>
        </select>
      </div>
      <div class="field">
        <label>Cari pelanggan</label>
        <input id="queryFilter" placeholder="Nama, ID, WA, atau User PPPoE"
          value="${esc(state.filter.q)}">
      </div>
    </div>
    <div id="listing"></div>`;
  $('statusFilter').value = state.filter.status;
  const draw = () => {
    state.filter = {
      period: $('periodFilter').value,
      status: $('statusFilter').value,
      q: $('queryFilter').value
    };
    const query = state.filter.q.toLowerCase();
    const filtered = data.invoices.filter(invoice => {
      const client = customer(invoice.ID_Pelanggan);
      const matchesPeriod = !state.filter.period ||
        invoice.Periode_Bulan === state.filter.period;
      const matchesStatus = !state.filter.status ||
        invoice.Status_Bayar === state.filter.status;
      const matchesQuery = !query || [
        invoice.ID_Tagihan,
        invoice.ID_Pelanggan,
        client?.Nama_Lengkap,
        client?.Nomor_WA,
        client?.User_PPPOE
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesPeriod && matchesStatus && matchesQuery;
    }).slice().reverse();
    $('listing').innerHTML = invoiceRows(filtered);
    wireInvoices();
  };
  ['periodFilter', 'statusFilter', 'queryFilter'].forEach(id => {
    $(id).oninput = draw;
  });
  draw();
  if (admin) {
    $('generate').onclick = () => {
      const year = String($('generateYear').value || '').trim();
      const selectedMonth = $('generateMonth').value;
      const period = year + '-' + selectedMonth;
      if (!validPeriod(period) || Number(year) < 2000 || Number(year) > 2100) {
        notice('Tahun tagihan harus antara 2000 sampai 2100.', true);
        return;
      }
      state.filter.period = period;
      mutate('generateInvoices', {period});
    };
  }
}

function wireInvoices() {
  document.querySelectorAll('[data-inv]').forEach(button => {
    button.onclick = () => invoiceDetail(
      byId(state.data.invoices, 'ID_Tagihan', button.dataset.inv)
    );
  });
}

function messageLink(invoice, kind) {
  const client = customer(invoice.ID_Pelanggan);
  if (!client) return '';
  let number = String(client.Nomor_WA).replace(/\D/g, '');
  if (number.startsWith('0')) number = '62' + number.slice(1);
  if (!/^628\d{8,12}$/.test(number)) return '';
  const text = kind === 'reminder'
    ? [
      'Yth. Pelanggan Internet',
      '',
      `Berikut kami sampaikan pengingat tagihan internet periode ${month(invoice.Periode_Bulan)} dengan rincian sebagai berikut:`,
      '',
      `ID Pelanggan : ${client.ID_Pelanggan}`,
      `Nama : ${client.Nama_Lengkap}`,
      `Tagihan : ${rup(invoice.Jumlah_Tagihan)}`,
      `Jatuh Tempo : ${day(invoice.Tanggal_Jatuh_Tempo)}`,
      `Status : ${invoice.Status_Bayar}`,
      '',
      'Pembayaran dapat dilakukan secara tunai (cash) atau transfer.',
      '',
      'Mohon lakukan pembayaran sebelum tanggal jatuh tempo agar layanan tidak masuk daftar tindak lanjut isolir.',
      '',
      'Apabila pembayaran telah dilakukan, mohon abaikan pesan ini.',
      '',
      'Terima kasih.'
    ].join('\n')
    : `Halo ${client.Nama_Lengkap}, pembayaran tagihan ${invoice.ID_Tagihan} ` +
      `periode ${month(invoice.Periode_Bulan)} sejumlah ${rup(invoice.Jumlah_Tagihan)} ` +
      `telah diterima pada ${day(invoice.Tanggal_Bayar)} ` +
      `melalui ${invoice.Metode_Bayar}. Terima kasih.`;
  return 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
}
function invoiceDetail(i) {
  const c=customer(i.ID_Pelanggan);
  const admin=state.data.user.Peran==='Admin';
  const paidInfo=i.Status_Bayar==='Lunas'
    ? `<p>Dibayar ${day(i.Tanggal_Bayar)} · ${esc(i.Metode_Bayar)} · dicatat ${esc(i.Dicatat_Oleh)}<br>${esc(i.Catatan)}</p>`
    : '';
  let actionButtons='';
  if(i.Status_Bayar==='Belum Lunas') {
    actionButtons=`<button id="pay">Tandai Lunas</button><a href="${esc(messageLink(i,'reminder'))}" target="_blank" rel="noopener noreferrer">Pengingat WhatsApp ↗</a>`;
  } else {
    actionButtons=`<button id="print">Cetak struk</button><a href="${esc(messageLink(i,'proof'))}" target="_blank" rel="noopener noreferrer">Bukti bayar WhatsApp ↗</a>`;
    if(admin) actionButtons+='<button class="danger" id="reverse">Koreksi pembayaran</button>';
  }
  const el=document.createElement('div');
  el.id='dialog';
  el.className='modal';
  el.innerHTML=`
    <div class="panel">
      <div class="row">
        <h2>Tagihan ${esc(i.ID_Tagihan)}</h2>
        <button id="closeDialog" class="secondary right">Tutup</button>
      </div>
      <p><b>${esc(c?.Nama_Lengkap||i.ID_Pelanggan)}</b> · ${esc(month(i.Periode_Bulan))}<br>
        User PPPoE: <b>${esc(c?.User_PPPOE || '—')}</b></p>
      <p>Nominal: <b>${rup(i.Jumlah_Tagihan)}</b><br>Jatuh tempo: ${day(i.Tanggal_Jatuh_Tempo)}<br>Status: ${badge(i.Status_Bayar)}</p>
      ${paidInfo}
      <div class="row">${actionButtons}</div>
      <p class="muted">WhatsApp dibuka untuk dikirim manual oleh petugas.</p>
    </div>`;
  document.body.append(el);
  $('closeDialog').onclick=closeModal;
  el.onclick=e=>{if(e.target===el)closeModal()};
  if($('pay'))$('pay').onclick=()=>{closeModal();paymentForm(i)};
  if($('print'))$('print').onclick=()=>receipt(i);
  if($('reverse'))$('reverse').onclick=()=>{
    closeModal();
    modal(
      'Koreksi pembayaran',
      `<p>Tagihan ${esc(i.ID_Tagihan)} akan kembali menjadi Belum Lunas.</p><label>Alasan koreksi</label><textarea name="reason" required maxlength="400"></textarea>`,
      x=>mutate('reversePayment',{id:i.ID_Tagihan,...x})
    );
  };
}
function paymentForm(invoice) {
  const client = customer(invoice.ID_Pelanggan);
  const body = `
    <p>${esc(client?.Nama_Lengkap || invoice.ID_Pelanggan)} ·
      ${rup(invoice.Jumlah_Tagihan)}</p>
    <div class="form-grid">
      ${field('date', 'Tanggal bayar', state.data.today, 'date', 'required')}
      <div>
        <label>Metode</label>
        <select name="method"><option>Cash</option><option>Transfer</option></select>
      </div>
      <div class="full">
        <label>Catatan (opsional)</label>
        <textarea name="note" maxlength="500"></textarea>
      </div>
    </div>`;
  modal(
    'Pembayaran ' + invoice.ID_Tagihan,
    body,
    form => mutate('payInvoice', {id: invoice.ID_Tagihan, ...form})
  );
}

function receipt(invoice) {
  const client = customer(invoice.ID_Pelanggan);
  const html = `<!doctype html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Struk ${esc(invoice.ID_Tagihan)}</title>
      <style>
        body{font:15px Arial,sans-serif;max-width:600px;margin:35px auto;
          color:#182b47;padding:15px}
        h1{text-align:center;font-size:22px;border-bottom:2px solid #182b47;
          padding-bottom:15px}
        dl{display:grid;grid-template-columns:160px 1fr;gap:12px}
        dd{margin:0}
        footer{border-top:1px solid #aaa;margin-top:28px;padding-top:15px}
        @media print{button{display:none}}
      </style>
    </head>
    <body>
      <h1>BUKTI PEMBAYARAN<br><small>Ziel Net Billing System</small></h1>
      <dl>
        <dt>ID tagihan</dt><dd>${esc(invoice.ID_Tagihan)}</dd>
        <dt>Pelanggan</dt>
        <dd>${esc(client?.Nama_Lengkap || invoice.ID_Pelanggan)}</dd>
        <dt>Periode</dt><dd>${esc(month(invoice.Periode_Bulan))}</dd>
        <dt>Nominal</dt><dd><b>${rup(invoice.Jumlah_Tagihan)}</b></dd>
        <dt>Tanggal bayar</dt><dd>${day(invoice.Tanggal_Bayar)}</dd>
        <dt>Metode</dt><dd>${esc(invoice.Metode_Bayar)}</dd>
        <dt>Dicatat oleh</dt><dd>${esc(invoice.Dicatat_Oleh)}</dd>
        <dt>Catatan</dt><dd>${esc(invoice.Catatan || '—')}</dd>
      </dl>
      <footer>Terima kasih atas pembayaran Anda.</footer>
      <button onclick="window.print()">Cetak</button>
    </body>
    </html>`;
  const popup = window.open('', '_blank');
  if (!popup) {
    notice('Izinkan pop-up untuk mencetak struk.', true);
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}


// Petty Cash: pemasukan diturunkan langsung dari invoice Lunas.
// Pencatatan Petty Cash dimulai 1 Oktober 2026; transaksi sebelumnya tidak dihitung.
function pettyStartDate(){return state.data?.pettyCashStartDate||'2026-10-01';}
function pettyDateAllowed(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))&&String(value)>=pettyStartDate();}
function pettyFinance() {
  const data=state.data;
  const incomes=data.invoices.filter(inv=>inv.Status_Bayar==='Lunas' && pettyDateAllowed(inv.Tanggal_Bayar));
  const expenses=(data.expenses||[]).filter(exp=>exp.Status==='Aktif' && pettyDateAllowed(exp.Tanggal));
  const sum=(items,key)=>items.reduce((total,item)=>total+(Number(item[key])||0),0);
  const incomeTotal=sum(incomes,'Jumlah_Tagihan');
  const expenseTotal=sum(expenses,'Nominal');
  const period=state.pettyPeriod===null ? data.today.slice(0,7) : state.pettyPeriod;
  const match=(date)=>!period||String(date||'').slice(0,7)===period;
  const incomesPeriod=incomes.filter(i=>match(i.Tanggal_Bayar));
  const expensesPeriod=expenses.filter(e=>match(e.Tanggal));
  return {incomes,expenses,incomesPeriod,expensesPeriod,period,
    incomePeriodTotal:sum(incomesPeriod,'Jumlah_Tagihan'),
    expensePeriodTotal:sum(expensesPeriod,'Nominal'),
    incomeTotal,expenseTotal,balance:incomeTotal-expenseTotal};
}

function pettyPeriodPicker(finance) {
  const periods=[...state.data.invoices.filter(i=>i.Status_Bayar==='Lunas'&&pettyDateAllowed(i.Tanggal_Bayar)).map(i=>String(i.Tanggal_Bayar||'').slice(0,7)),
    ...(state.data.expenses||[]).filter(e=>pettyDateAllowed(e.Tanggal)).map(e=>String(e.Tanggal||'').slice(0,7))];
  return `<div class="row"><div class="field"><label>Periode transaksi</label>
    <select id="pettyPeriodFilter">${periodOptions(periods,finance.period,'Semua periode')}</select>
    </div></div>`;
}
function pettyMetricCards(finance) {
  const items = [
    {tone:'green', label:'Pemasukan / Top Up', value:rup(finance.incomePeriodTotal),
      note:`${finance.incomesPeriod.length} pembayaran pelanggan pada periode pilihan`},
    {tone:'orange', label:'Pengeluaran', value:rup(finance.expensePeriodTotal),
      note:`${finance.expensesPeriod.length} transaksi aktif pada periode pilihan`},
    {tone:'purple', label:'Selisih periode', value:rup(finance.incomePeriodTotal-finance.expensePeriodTotal),
      note:'Pemasukan periode dikurangi pengeluaran periode'},
    {tone:'blue', label:'Saldo bersih tercatat', value:rup(finance.balance),
      note:'Akumulasi semua periode yang tersedia'}
  ];
  return `<div class="petty-summary">${items.map(item => `
    <article class="card stat-3d-card stat-puma-card stat-card-${item.tone}">
      ${stat3dChrome(item.tone)}
      <div class="stat-card-content">
        <span class="stat-label">${esc(item.label)}</span>
        <strong class="stat-value">${esc(item.value)}</strong>
        <small>${esc(item.note)}</small>
      </div>
    </article>`).join('')}</div>`;
}
function stat3dPointerMove(event) {
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const card = event.target.closest?.('.stat-3d-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  // Tilt dibuat lebih tegas agar arah cursor benar-benar terasa.
  // Nilai maksimum kira-kira ±11° Y dan ±9° X.
  const rotateY = (px - .5) * 22;
  const rotateX = (.5 - py) * 18;

  // Sedikit translasi mengikuti cursor menambah kesan card "mengejar" pointer.
  const moveX = (px - .5) * 8;
  const moveY = (py - .5) * 6;

  const cx = px - .5;
  const cy = py - .5;
  const angle = Math.atan2(cy, cx) * 180 / Math.PI + 90;

  card.style.setProperty('--stat-rx', rotateX.toFixed(2) + 'deg');
  card.style.setProperty('--stat-ry', rotateY.toFixed(2) + 'deg');
  card.style.setProperty('--stat-tx', moveX.toFixed(2) + 'px');
  card.style.setProperty('--stat-ty', moveY.toFixed(2) + 'px');
  card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
  card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
  card.style.setProperty('--shine-angle', angle.toFixed(2) + 'deg');
}

function stat3dPointerOut(event) {
  const card = event.target.closest?.('.stat-3d-card');
  if (!card) return;
  if (event.relatedTarget && card.contains(event.relatedTarget)) return;
  card.style.setProperty('--stat-rx', '0deg');
  card.style.setProperty('--stat-ry', '0deg');
  card.style.setProperty('--stat-tx', '0px');
  card.style.setProperty('--stat-ty', '0px');
  card.style.setProperty('--gx', '50%');
  card.style.setProperty('--gy', '50%');
  card.style.setProperty('--shine-angle', '135deg');
}

document.addEventListener('pointermove', stat3dPointerMove);
document.addEventListener('pointerout', stat3dPointerOut);

function pettyCaution() {
  return `<div class="petty-note"><b>Pencatatan Petty Cash dimulai 1 Oktober 2026.</b>
    Transaksi sebelum tanggal tersebut tidak masuk pemasukan, pengeluaran, saldo, atau Buku Kas.
    Pemasukan bersumber otomatis dari <b>Tagihan berstatus Lunas</b> berdasarkan tanggal bayar,
    mencakup <b>Cash dan Transfer</b>. Koreksi pembayaran otomatis mengubah rekap ini.</div>`;
}
function pettyReadyNotice() {
  return state.data.pettyCashReady ? '' : `<div class="petty-note petty-alert">
    Tab <b>PettyCash_Pengeluaran</b> belum dibuat. Jalankan <b>setupPettyCash</b>
    satu kali dari editor Google Apps Script agar formulir pengeluaran bisa digunakan.</div>`;
}
function pettySetPeriod(onRender) {
  $('pettyPeriodFilter').value=state.pettyPeriod===null?state.data.today.slice(0,7):state.pettyPeriod;
  $('pettyPeriodFilter').onchange=()=>{state.pettyPeriod=$('pettyPeriodFilter').value;onRender();};
}
function pettyIncome() {
  const f=pettyFinance();
  const rows=f.incomesPeriod.slice().sort((a,b)=>
    String(b.Tanggal_Bayar).localeCompare(String(a.Tanggal_Bayar))||
    String(b.ID_Tagihan).localeCompare(String(a.ID_Tagihan)))
    .map(inv=>{
      const c=customer(inv.ID_Pelanggan);
      return `<tr><td>${day(inv.Tanggal_Bayar)}</td>
        <td>${esc(inv.ID_Tagihan)}</td>
        <td>${esc(c?.Nama_Lengkap||inv.ID_Pelanggan)}</td>
        <td>${esc(month(inv.Periode_Bulan))}</td>
        <td>${esc(inv.Metode_Bayar||'—')}</td>
        <td class="petty-amount">${rup(inv.Jumlah_Tagihan)}</td>
        <td>${esc(inv.Dicatat_Oleh||'—')}</td></tr>`;
    }).join('');
  $('content').innerHTML=`<h1>Petty Cash · Pemasukan / Top Up</h1>
    ${pettyReadyNotice()}${pettyCaution()}${pettyMetricCards(f)}
    ${pettyPeriodPicker(f)}
    <h2>Pemasukan otomatis dari pembayaran internet/WiFi</h2>
    ${table(['Tanggal','ID Tagihan','Pelanggan','Periode Tagihan','Metode','Pemasukan','Dicatat oleh'],rows)}`;
  pettySetPeriod(pettyIncome);
}
function pettyExpenseCategories() {
  const defaults=['Pembelian Barang','Operasional'];
  const existing=(state.data.expenses||[])
    .map(exp=>String(exp.Kategori||'').trim())
    .filter(Boolean);
  const custom=[...new Set(existing.filter(name=>!defaults.includes(name)))]
    .sort((a,b)=>a.localeCompare(b,'id'));
  return defaults.concat(custom);
}

function pettyExpenses() {
  const f=pettyFinance(), isAdmin=state.data.user.Peran==='Admin';
  const all=(state.data.expenses||[]).filter(exp=>pettyDateAllowed(exp.Tanggal)&&(!f.period||String(exp.Tanggal||'').slice(0,7)===f.period));
  const items=all.filter(exp=>!state.pettyCategory||exp.Kategori===state.pettyCategory)
    .slice().sort((a,b)=>String(b.Tanggal).localeCompare(String(a.Tanggal))||
      String(b.ID_Pengeluaran).localeCompare(String(a.ID_Pengeluaran)));
  const rows=items.map(exp=>{
    const active=exp.Status==='Aktif';
    const actions=active && isAdmin
      ? `<button class="ghost" data-edit-exp="${esc(exp.ID_Pengeluaran)}">Edit</button>
         <button class="ghost danger-text" data-cancel-exp="${esc(exp.ID_Pengeluaran)}">Batalkan</button>`:'—';
    return `<tr class="${active?'':'petty-muted-row'}"><td>${day(exp.Tanggal)}</td>
      <td>${esc(exp.ID_Pengeluaran)}</td><td>${esc(exp.Kategori)}</td>
      <td>${esc(exp.Uraian)}<div class="muted">${esc(exp.Catatan||'')}</div></td>
      <td>${esc(exp.Metode_Bayar)}</td><td class="petty-amount">${rup(exp.Nominal)}</td>
      <td>${badge(exp.Status)}</td><td>${esc(exp.Dicatat_Oleh)}</td><td>${actions}</td></tr>`;
  }).join('');
  $('content').innerHTML=`<div class="row"><h1>Petty Cash · Pengeluaran</h1>
    ${state.data.pettyCashReady?'<button class="right" id="newExpense">+ Catat pengeluaran</button>':''}</div>
    ${pettyReadyNotice()}${pettyCaution()}${pettyMetricCards(f)}
    ${pettyPeriodPicker(f)}
    <div class="row"><div class="field"><label>Filter kategori</label>
      <select id="pettyCategoryFilter"><option value="">Semua kategori</option>
        ${pettyExpenseCategories().map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}
      </select></div></div>
    ${table(['Tanggal','ID','Kategori','Uraian','Metode','Nominal','Status','Petugas','Aksi'],rows)}`;
  pettySetPeriod(pettyExpenses);
  $('pettyCategoryFilter').value=state.pettyCategory;
  $('pettyCategoryFilter').onchange=()=>{state.pettyCategory=$('pettyCategoryFilter').value;pettyExpenses();};
  if(state.data.pettyCashReady){
    $('newExpense').onclick=()=>pettyExpenseForm();
    document.querySelectorAll('[data-edit-exp]').forEach(b=>{
      b.onclick=()=>pettyExpenseForm((state.data.expenses||[]).find(e=>e.ID_Pengeluaran===b.dataset.editExp));
    });
    document.querySelectorAll('[data-cancel-exp]').forEach(b=>{
      b.onclick=()=>pettyCancelExpense((state.data.expenses||[]).find(e=>e.ID_Pengeluaran===b.dataset.cancelExp));
    });
  }
}
function pettyExpenseForm(exp) {
  const categories=pettyExpenseCategories();
  const selectedCategory=exp?.Kategori||categories[0]||'Pembelian Barang';
  const categoryOptions=categories.map(name=>
    `<option value="${esc(name)}" ${name===selectedCategory?'selected':''}>${esc(name)}</option>`
  ).join('');
  const body=`<div class="form-grid">
    ${field('Tanggal','Tanggal pengeluaran',exp?.Tanggal||state.data.today,'date',`required min="${pettyStartDate()}"`)}
    <div>
      <label>Kategori</label>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="expenseCategory" name="Kategori" required style="flex:1">${categoryOptions}</select>
        <button type="button" class="secondary" id="addExpenseCategory"
          style="white-space:nowrap;padding:10px 12px">+ Tambah kategori</button>
      </div>
      <div id="newExpenseCategoryWrap" style="display:none;margin-top:9px;padding:10px;border:1px solid #dbe3ef;border-radius:10px;background:#f8faff">
        <label style="margin-top:0">Nama kategori baru</label>
        <input id="newExpenseCategory" type="text" maxlength="80"
          placeholder="Contoh: Perbaikan Jaringan" autocomplete="off">
        <div style="display:flex;gap:7px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="secondary" id="cancelExpenseCategory">Batal</button>
          <button type="button" id="saveExpenseCategory">Tambahkan</button>
        </div>
      </div>
    </div>
    <div class="full">${field('Uraian','Nama barang / keperluan',exp?.Uraian||'','text','required maxlength="200"')}</div>
    ${currencyField('Nominal','Jumlah pengeluaran',exp?.Nominal||'','required')}
    <div><label>Metode pembayaran</label><select name="Metode_Bayar" required>
      <option ${exp?.Metode_Bayar==='Cash'?'selected':''}>Cash</option>
      <option ${exp?.Metode_Bayar==='Transfer'?'selected':''}>Transfer</option>
    </select></div>
    <div class="full"><label>Catatan (opsional)</label><textarea name="Catatan" maxlength="500">${esc(exp?.Catatan||'')}</textarea></div>
  </div>`;
  modal(exp?'Koreksi pengeluaran':'Catat pengeluaran',body,form=>mutate('saveExpense',{
    ...form,ID_Pengeluaran:exp?.ID_Pengeluaran||''
  }));
  bindRupiahInputs($('dialog'));

  const wrap=$('newExpenseCategoryWrap');
  const input=$('newExpenseCategory');
  const select=$('expenseCategory');
  $('addExpenseCategory').onclick=()=>{
    wrap.style.display=wrap.style.display==='none'?'block':'none';
    if(wrap.style.display==='block') setTimeout(()=>input.focus(),0);
  };
  $('cancelExpenseCategory').onclick=()=>{
    input.value='';
    wrap.style.display='none';
  };
  const addCategory=()=>{
    const name=String(input.value||'').trim().replace(/\s+/g,' ');
    if(name.length<2){notice('Nama kategori minimal 2 karakter.',true);return;}
    if(name.length>80){notice('Nama kategori maksimal 80 karakter.',true);return;}
    if(/^[=+@-]/.test(name)){notice('Nama kategori tidak boleh diawali =, +, -, atau @.',true);return;}
    const duplicate=[...select.options].find(option=>
      option.value.trim().toLowerCase()===name.toLowerCase());
    if(duplicate){
      select.value=duplicate.value;
      notice('Kategori tersebut sudah tersedia.');
    }else{
      const option=document.createElement('option');
      option.value=name;
      option.textContent=name;
      option.selected=true;
      select.append(option);
      notice('Kategori ditambahkan. Simpan pengeluaran agar kategori tersimpan.');
    }
    input.value='';
    wrap.style.display='none';
  };
  $('saveExpenseCategory').onclick=addCategory;
  input.onkeydown=event=>{
    if(event.key==='Enter'){
      event.preventDefault();
      addCategory();
    }
  };
}

function pettyCancelExpense(exp) {
  modal('Batalkan pengeluaran',`<p>Transaksi <b>${esc(exp.ID_Pengeluaran)}</b>
    (${esc(exp.Uraian)} · ${rup(exp.Nominal)}) akan berstatus Dibatalkan.
    Riwayat tetap tersimpan dan tidak dihitung dalam saldo.</p>
    <label>Alasan pembatalan</label><textarea name="reason" required maxlength="400"></textarea>`,
    data=>mutate('cancelExpense',{id:exp.ID_Pengeluaran,...data}),
    'Batalkan transaksi','danger');
}


function pettyTransactions() {
  const data=state.data;
  const incomes=data.invoices
    .filter(inv=>inv.Status_Bayar==='Lunas' && pettyDateAllowed(inv.Tanggal_Bayar))
    .map(inv=>{
      const client=customer(inv.ID_Pelanggan);
      return {
        date:inv.Tanggal_Bayar,
        kind:'Pemasukan',
        reference:inv.ID_Tagihan,
        description:`Pembayaran ${client?.Nama_Lengkap||inv.ID_Pelanggan} · ${month(inv.Periode_Bulan)}`,
        method:inv.Metode_Bayar||'—',
        income:Number(inv.Jumlah_Tagihan)||0,
        expense:0,
        recordedBy:inv.Dicatat_Oleh||'—'
      };
    });
  const expenses=(data.expenses||[])
    .filter(exp=>exp.Status==='Aktif' && pettyDateAllowed(exp.Tanggal))
    .map(exp=>({
      date:exp.Tanggal,
      kind:'Pengeluaran',
      reference:exp.ID_Pengeluaran,
      description:`${exp.Kategori} · ${exp.Uraian}`,
      method:exp.Metode_Bayar||'—',
      income:0,
      expense:Number(exp.Nominal)||0,
      recordedBy:exp.Dicatat_Oleh||'—'
    }));
  return incomes.concat(expenses).sort((a,b)=>
    String(a.date).localeCompare(String(b.date)) ||
    (a.kind===b.kind?0:(a.kind==='Pemasukan'?-1:1)) ||
    String(a.reference).localeCompare(String(b.reference))
  );
}

function pettyBookRange(transactions) {
  const filter=state.pettyBookFilter;
  const today=state.data.today;
  if(!filter.date)filter.date=today;
  if(!filter.month)filter.month=today.slice(0,7);
  if(!filter.year)filter.year=today.slice(0,4);
  const mode=['date','month','year','all'].includes(filter.mode)?filter.mode:'month';
  filter.mode=mode;
  if(mode==='date')return {mode,start:filter.date,end:filter.date,label:day(filter.date)};
  if(mode==='month'){
    const [year,monthNumber]=filter.month.split('-').map(Number);
    const end=new Date(Date.UTC(year,monthNumber,0)).toISOString().slice(0,10);
    return {mode,start:filter.month+'-01',end,label:month(filter.month)};
  }
  if(mode==='year')return {mode,start:filter.year+'-01-01',end:filter.year+'-12-31',label:'Tahun '+filter.year};
  return {mode,start:pettyStartDate(),end:'',label:'Semua transaksi sejak 1 Oktober 2026'};
}

function pettyBook() {
  const transactions=pettyTransactions();
  const range=pettyBookRange(transactions);
  const visible=transactions.filter(item=>(!range.start||item.date>=range.start)&&(!range.end||item.date<=range.end));
  const net=item=>(Number(item.income)||0)-(Number(item.expense)||0);
  const sum=(items,key)=>items.reduce((total,item)=>total+(Number(item[key])||0),0);

  // Seluruh ringkasan Buku Kas mengikuti filter yang sedang aktif.
  // Saldo Kas Berjalan berasal dari pemasukan pada periode filter.
  const income=sum(visible,'income');
  const expense=sum(visible,'expense');
  const cashRunning=income;
  const closing=cashRunning-expense;

  // Saldo pada tabel juga dimulai dari Rp 0 untuk setiap periode filter.
  // Dengan demikian filter tanggal/bulan/tahun menampilkan mutasi periode itu saja.
  let running=0;
  const rows=visible.map(item=>{
    running+=net(item);
    const description=`${esc(item.description)}<div class="cashbook-ref">${esc(item.kind)} · ${esc(item.recordedBy)}</div>`;
    return `<tr><td>${day(item.date)}</td><td>${description}</td><td>${esc(item.reference)}</td>
      <td>${esc(item.method)}</td>
      <td class="cashbook-in">${item.income?rup(item.income):'—'}</td>
      <td class="cashbook-out">${item.expense?rup(item.expense):'—'}</td>
      <td class="cashbook-balance">${rup(running)}</td></tr>`;
  }).join('');

  const incomeCount=visible.filter(x=>x.income).length;
  const expenseCount=visible.filter(x=>x.expense).length;
  const filter=state.pettyBookFilter;
  $('content').innerHTML=`<div class="row"><div><h1 style="margin-bottom:4px">Petty Cash · Buku Kas</h1>
      <div class="muted">${esc(range.label)} · ${visible.length} transaksi</div></div></div>
    ${pettyReadyNotice()}${pettyCaution()}
    <section class="petty-book-summary">
      <article class="card stat-3d-card stat-puma-card stat-card-purple">
        ${stat3dChrome('purple')}
        <div class="stat-card-content"><span class="stat-label">Saldo Kas Berjalan</span>
          <strong class="stat-value">${rup(cashRunning)}</strong>
          <small>Berasal dari ${incomeCount} transaksi pemasukan pada periode filter</small></div></article>
      <article class="card stat-3d-card stat-puma-card stat-card-green">
        ${stat3dChrome('green')}
        <div class="stat-card-content"><span class="stat-label">Pemasukan</span>
          <strong class="stat-value">${rup(income)}</strong>
          <small>${incomeCount} transaksi pemasukan pada periode filter</small></div></article>
      <article class="card stat-3d-card stat-puma-card stat-card-orange">
        ${stat3dChrome('orange')}
        <div class="stat-card-content"><span class="stat-label">Pengeluaran</span>
          <strong class="stat-value">${rup(expense)}</strong>
          <small>${expenseCount} transaksi pengeluaran pada periode filter</small></div></article>
      <article class="card stat-3d-card stat-puma-card stat-card-blue">
        ${stat3dChrome('blue')}
        <div class="stat-card-content"><span class="stat-label">Saldo Akhir</span>
          <strong class="stat-value">${rup(closing)}</strong>
          <small>Saldo Kas Berjalan − Pengeluaran</small></div></article>
    </section>
    <section class="panel petty-book-filter no-print">
      <div class="field"><label>Filter Buku Kas</label><select id="pettyBookMode">
        <option value="date" ${filter.mode==='date'?'selected':''}>Tanggal</option>
        <option value="month" ${filter.mode==='month'?'selected':''}>Bulan</option>
        <option value="year" ${filter.mode==='year'?'selected':''}>Tahun</option>
        <option value="all" ${filter.mode==='all'?'selected':''}>Semua transaksi</option>
      </select></div>
      <div class="field" id="pettyBookValue">${filter.mode==='date'
        ? `<label>Pilih tanggal</label><input id="pettyBookDate" type="date" value="${esc(filter.date)}">`
        : filter.mode==='month'
          ? `<label>Pilih bulan</label><input id="pettyBookMonth" type="month" value="${esc(filter.month)}">`
          : filter.mode==='year'
            ? `<label>Pilih tahun</label><input id="pettyBookYear" type="number" min="2000" max="2100" step="1" value="${esc(filter.year)}">`
            : '<label>Periode</label><div class="muted" style="padding:11px 0">Menampilkan seluruh transaksi sejak 1 Oktober 2026.</div>'}
      </div>
      <div class="petty-filter-caption muted">Saldo Kas Berjalan, pemasukan, pengeluaran, saldo akhir, dan mutasi tabel mengikuti Filter Buku Kas yang dipilih.</div>
    </section>
    <h2>Mutasi Buku Kas</h2>
    ${table(['Tanggal','Keterangan','Referensi','Metode','Pemasukan','Pengeluaran','Saldo'],rows)}`;
  $('pettyBookMode').onchange=()=>{
    state.pettyBookFilter.mode=$('pettyBookMode').value;
    pettyBook();
  };
  if($('pettyBookDate'))$('pettyBookDate').onchange=()=>{state.pettyBookFilter.date=$('pettyBookDate').value;pettyBook();};
  if($('pettyBookMonth'))$('pettyBookMonth').onchange=()=>{state.pettyBookFilter.month=$('pettyBookMonth').value;pettyBook();};
  if($('pettyBookYear'))$('pettyBookYear').onchange=()=>{
    const year=String($('pettyBookYear').value||'').trim();
    if(!/^\d{4}$/.test(year)||Number(year)<2000||Number(year)>2100){notice('Tahun harus antara 2000 sampai 2100.',true);return;}
    state.pettyBookFilter.year=year;pettyBook();
  };
}

function payments() {
  const paid = state.data.invoices
    .filter(invoice => invoice.Status_Bayar === 'Lunas')
    .slice().reverse();
  const rows = paid.map(invoice => `
    <tr>
      <td>${esc(invoice.ID_Tagihan)}</td>
      <td>${esc(customer(invoice.ID_Pelanggan)?.Nama_Lengkap || invoice.ID_Pelanggan)}</td>
      <td>${esc(month(invoice.Periode_Bulan))}</td>
      <td>${rup(invoice.Jumlah_Tagihan)}</td>
      <td>${day(invoice.Tanggal_Bayar)}</td>
      <td>${esc(invoice.Metode_Bayar)}</td>
      <td>${esc(invoice.Dicatat_Oleh)}</td>
      <td><button class="ghost" data-inv="${esc(invoice.ID_Tagihan)}">Detail</button></td>
    </tr>`).join('');
  $('content').innerHTML = '<h1>Riwayat pembayaran</h1>' + table(
    ['Tagihan', 'Pelanggan', 'Periode', 'Nominal', 'Tanggal', 'Metode', 'Petugas', 'Aksi'],
    rows
  );
  wireInvoices();
}

function reports() {
  const data = state.data;
  const periods = [...new Set(data.invoices.map(invoice => invoice.Periode_Bulan))]
    .sort().reverse();
  $('content').innerHTML = `
    <h1>Laporan</h1>
    <div class="row">
      <div class="field">
        <label>Periode tagihan</label>
        <select id="reportPeriod">
          <option value="">Semua periode</option>
          ${periods.map(period => `
            <option value="${period}">${esc(month(period))}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="reportBody"></div>`;
  const draw = () => {
    const period = $('reportPeriod').value;
    const items = data.invoices.filter(invoice =>
      !period || invoice.Periode_Bulan === period
    );
    const paid = items.filter(invoice => invoice.Status_Bayar === 'Lunas');
    const unpaid = items.filter(invoice => invoice.Status_Bayar === 'Belum Lunas');
    const overdue = unpaid.filter(invoice => invoice.Tanggal_Jatuh_Tempo < data.today);
    const sum = list => list.reduce(
      (total, invoice) => total + Number(invoice.Jumlah_Tagihan),
      0
    );
    const overdueRows = overdue.map(invoice => {
      const client = customer(invoice.ID_Pelanggan);
      return `
        <tr>
          <td>${esc(client?.Nama_Lengkap || invoice.ID_Pelanggan)}</td>
          <td>${esc(client?.User_PPPOE || '—')}</td>
          <td>${esc(client?.Nomor_WA || '—')}</td>
          <td>${esc(invoice.ID_Tagihan)}</td>
          <td>${day(invoice.Tanggal_Jatuh_Tempo)}</td>
          <td>${badge(client?.Status_Langganan || '—')}</td>
        </tr>`;
    }).join('');
    $('reportBody').innerHTML = `
      <div class="report-grid">
        <div class="card">Pemasukan tagihan periode ini
          <strong>${rup(sum(paid))}</strong></div>
        <div class="card">Cash
          <strong>${rup(sum(paid.filter(item => item.Metode_Bayar === 'Cash')))}</strong></div>
        <div class="card">Transfer
          <strong>${rup(sum(paid.filter(item => item.Metode_Bayar === 'Transfer')))}</strong></div>
        <div class="card">Belum lunas<strong>${rup(sum(unpaid))}</strong></div>
      </div>
      <h2>Tagihan belum lunas (${unpaid.length})</h2>
      <div id="unpaidRows">${invoiceRows(unpaid)}</div>
      <h2>Tindak lanjut isolir manual (${overdue.length} tagihan lewat tempo)</h2>` +
      table(
        ['Pelanggan', 'User PPPoE', 'WA', 'Tagihan', 'Jatuh tempo', 'Status administrasi'],
        overdueRows
      ) +
      `<p class="muted">Mengubah status Isolir hanya mengubah catatan administrasi;
        koneksi harus ditindaklanjuti terpisah.</p>`;
    wireInvoices();
  };
  $('reportPeriod').onchange = draw;
  draw();
}

function users() {
  const data = state.data;
  const rows = data.users.map(user => `
    <tr>
      <td>${esc(user.ID_Pengguna)}</td>
      <td>${esc(user.Nama)}</td>
      <td>${esc(user.Username)}</td>
      <td>${esc(user.Peran)}</td>
      <td>${badge(user.Status_Akses)}</td>
      <td><button class="ghost" data-user="${esc(user.ID_Pengguna)}">Edit</button></td>
    </tr>`).join('');
  $('content').innerHTML = `
    <div class="row">
      <h1>Pengguna</h1>
      <button id="newUser" class="right">+ Tambah akun</button>
    </div>` + table(['ID', 'Nama', 'Username', 'Peran', 'Akses', 'Aksi'], rows);
  $('newUser').onclick = () => userForm();
  document.querySelectorAll('[data-user]').forEach(button => {
    button.onclick = () => userForm(
      byId(data.users, 'ID_Pengguna', button.dataset.user)
    );
  });
}

function userForm(user) {
  const passwordLabel = user
    ? 'Password baru (kosongkan jika tetap)'
    : 'Password awal';
  const passwordRule = user
    ? 'autocomplete="new-password"'
    : 'required autocomplete="new-password"';
  const body = `
    <div class="form-grid">
      ${field('Nama', 'Nama', user?.Nama, 'text', 'required')}
      ${field('Username', 'Username', user?.Username, 'text',
        'required pattern="[a-zA-Z0-9._@-]{3,100}"')}
      <div>
        <label>Peran</label>
        <select name="Peran">
          <option ${user?.Peran === 'Admin' ? 'selected' : ''}>Admin</option>
          <option ${user?.Peran === 'Kasir' ? 'selected' : ''}>Kasir</option>
        </select>
      </div>
      <div>
        <label>Akses</label>
        <select name="Status_Akses">
          <option ${user?.Status_Akses !== 'Nonaktif' ? 'selected' : ''}>Aktif</option>
          <option ${user?.Status_Akses === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
        </select>
      </div>
      ${field('password', passwordLabel, '', 'password', passwordRule)}
      <p class="muted full">Minimal 14 karakter, huruf besar, huruf kecil, dan angka.
        Berikan password awal melalui jalur yang aman.</p>
    </div>`;
  modal(
    user ? 'Edit pengguna' : 'Tambah pengguna',
    body,
    form => mutate('saveUser', {...form, ID_Pengguna: user?.ID_Pengguna || ''})
  );
}

async function logs() {
  try {
    const list = await call('getLogs');
    const rows = list.map(entry => `
      <tr>
        <td>${esc(entry.Waktu)}</td>
        <td>${esc(entry.Pengguna)}</td>
        <td>${esc(entry.Aksi)}</td>
        <td>${esc(entry.ID_Data)}</td>
        <td>${esc(entry.Keterangan)}</td>
      </tr>`).join('');
    $('content').innerHTML = '<h1>Log aktivitas (200 terakhir)</h1>' + table(
      ['Waktu', 'Pengguna', 'Aksi', 'ID data', 'Keterangan'],
      rows
    );
  } catch (_) {}
}

if (state.token) reload();
else showLogin();
