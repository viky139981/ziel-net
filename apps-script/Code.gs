/** Ziel Net Billing System — server (Asia/Jakarta). */
const TZ = 'Asia/Jakarta';
const PETTY_CASH_START_DATE = '2026-10-01';
const HEADERS = {
  Pelanggan: ['ID_Pelanggan','Nama_Lengkap','Nomor_WA','Alamat_Lokasi','ID_Paket','Tanggal_Jatuh_Tempo','Status_Langganan','Tanggal_Dibuat','Tanggal_Diperbarui','User_PPPOE'],
  Paket_Internet: ['ID_Paket','Nama_Paket','Kecepatan','Harga_Bulanan','Deskripsi','Status_Paket'],
  Tagihan: ['ID_Tagihan','ID_Pelanggan','Periode_Bulan','Jumlah_Tagihan','Tanggal_Jatuh_Tempo','Status_Bayar','Tanggal_Bayar','Metode_Bayar','Catatan','Dicatat_Oleh'],
  Pengguna: ['ID_Pengguna','Nama','Username','Salt','Password_Hash','Peran','Status_Akses','Tanggal_Dibuat'],
  Log_Aktivitas: ['Waktu','Pengguna','Aksi','ID_Data','Keterangan'],
  PettyCash_Pengeluaran: ['ID_Pengeluaran','Tanggal','Kategori','Uraian','Nominal','Metode_Bayar','Catatan','Dicatat_Oleh','Dibuat_Pada','Diperbarui_Pada','Status']
};
const ROLES = {overview:['Admin','Kasir'], getLogs:['Admin'], saveCustomer:['Admin'], setCustomerStatus:['Admin'], deleteCustomer:['Admin'], savePackage:['Admin'], generateInvoices:['Admin'], payInvoice:['Admin','Kasir'], reversePayment:['Admin'], saveUser:['Admin'], saveExpense:['Admin','Kasir'], cancelExpense:['Admin']};

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonOutput_({
    ok: true,
    service: 'Ziel Net Billing API',
    database: 'Google Sheets',
    timezone: TZ
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Request kosong.');
    const body = JSON.parse(e.postData.contents);
    const expected = PropertiesService.getScriptProperties().getProperty('API_PROXY_SECRET');
    if (!expected) throw new Error('API_PROXY_SECRET belum diatur pada Script Properties.');
    if (typeof body.proxySecret !== 'string' || body.proxySecret !== expected)
      throw new Error('Akses API ditolak.');

    const action = String(body.action || '');
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const token = typeof body.token === 'string' ? body.token : '';
    const data = api(action, payload, token);
    return jsonOutput_({ok: true, data: data});
  } catch (error) {
    return jsonOutput_({
      ok: false,
      error: error && error.message ? error.message : 'Terjadi kesalahan server.'
    });
  }
}

// Jalankan satu kali. Salin hasilnya ke Vercel Environment Variable GAS_PROXY_SECRET.
function setupApiProxySecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('API_PROXY_SECRET');
  if (!secret) {
    secret = random_();
    props.setProperty('API_PROXY_SECRET', secret);
  }
  return secret;
}

// Fungsi publik agar dapat dipilih dari dropdown Run pada editor Apps Script.
function setupProject() { return setupProject_(); }
function bootstrapAdmin() { return bootstrapAdmin_(); }
// Migrasi aman: hanya membuat/mengecek tab pengeluaran; tab billing lain tidak diubah.
function setupPettyCash() { return setupPettyCash_(); }
// Pembersihan satu kali: hapus transaksi keuangan September 2026 agar pembukuan dimulai Oktober 2026.
function hapusTransaksiSeptember2026() { return hapusTransaksiSeptember2026_(); }

// Jalankan dari editor Apps Script. Nama fungsi berakhiran _ tidak dapat dipanggil google.script.run.
function setupProject_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Isi Script Property SPREADSHEET_ID terlebih dahulu.');
  const ss = SpreadsheetApp.openById(id);
  Object.keys(HEADERS).forEach(name => {
    let s = ss.getSheetByName(name);
    if (!s) s = ss.insertSheet(name);
    const h = HEADERS[name];
    if (s.getLastRow() && s.getLastColumn()) {
      const existing = s.getRange(1,1,1,Math.min(s.getLastColumn(),h.length)).getDisplayValues()[0];
      const exact=h.every((value,index)=>existing[index]===value);
      const legacyCustomer=name==='Pelanggan'&&
        h.slice(0,-1).every((value,index)=>existing[index]===value)&&
        (existing.length===h.length-1||existing[h.length-1]==='');
      if(existing.some(x=>x!=='')&&!exact&&!legacyCustomer)
        throw new Error('Header tab '+name+' berbeda; data tidak diubah.');
    }
    s.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#e7f0ff');
    s.setFrozenRows(1);
    s.getRange(2,1,Math.max(s.getMaxRows()-1,1),h.length).setNumberFormat('@');
  });
  const list = (tab,col,values) => {
    const s=ss.getSheetByName(tab);
    s.getRange(2,col,Math.max(s.getMaxRows()-1,1),1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(values,true).setAllowInvalid(false).build());
  };
  list('Pelanggan',7,['Aktif','Nonaktif','Isolir']);
  list('Paket_Internet',6,['Aktif','Nonaktif']);
  list('Tagihan',6,['Belum Lunas','Lunas']);
  list('Tagihan',8,['Cash','Transfer']);
  list('Pengguna',6,['Admin','Kasir']);
  list('Pengguna',7,['Aktif','Nonaktif']);
  // Kategori pengeluaran dapat ditambah dari aplikasi; dua nilai berikut hanya saran awal.
  {
    const s=ss.getSheetByName('PettyCash_Pengeluaran');
    s.getRange(2,3,Math.max(s.getMaxRows()-1,1),1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Pembelian Barang','Operasional'],true)
        .setAllowInvalid(true).build());
  }
  list('PettyCash_Pengeluaran',6,['Cash','Transfer']);
  list('PettyCash_Pengeluaran',11,['Aktif','Dibatalkan']);
  if (!PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER'))
    PropertiesService.getScriptProperties().setProperty('PASSWORD_PEPPER',random_());
  return 'Enam tab, header, validasi, dan migrasi User PPPoE siap.';
}

function setupPettyCash_() {
  const ss=ss_(), name='PettyCash_Pengeluaran', headers=HEADERS[name];
  let sheet=ss.getSheetByName(name);
  if (!sheet) sheet=ss.insertSheet(name);
  if (sheet.getLastRow()>0) {
    const existing=sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
    if (!headers.every((h,i)=>existing[i]===h))
      throw new Error('Header tab PettyCash_Pengeluaran berbeda. Data tidak diubah.');
  }
  sheet.getRange(1,1,1,headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#e7f0ff');
  sheet.setFrozenRows(1);
  const rows=Math.max(sheet.getMaxRows()-1,1);
  sheet.getRange(2,1,rows,headers.length).setNumberFormat('@');
  const validation=(col,choices)=>sheet.getRange(2,col,rows,1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(choices,true)
      .setAllowInvalid(false).build());
  // Kategori pengeluaran bersifat dinamis. Nilai default tetap ditampilkan sebagai saran,
  // tetapi kategori baru dari aplikasi tetap diperbolehkan.
  sheet.getRange(2,3,rows,1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Pembelian Barang','Operasional'],true)
      .setAllowInvalid(true).build());
  validation(6,['Cash','Transfer']);
  validation(11,['Aktif','Dibatalkan']);
  return 'Tab PettyCash_Pengeluaran siap, data billing lama tidak diubah.';
}

// Hapus permanen transaksi September 2026. Jalankan satu kali dari Apps Script Editor.
// Yang dihapus: Tagihan periode September 2026 / pembayaran bertanggal September 2026,
// serta pengeluaran Petty Cash bertanggal September 2026. Log aktivitas tetap dipertahankan.
function hapusTransaksiSeptember2026_() {
  const ss=ss_();
  const deleted={tagihan:0,pengeluaran:0};

  const deleteMatchingRows=(sheetName,matcher)=>{
    const sheet=ss.getSheetByName(sheetName);
    if(!sheet||sheet.getLastRow()<2)return 0;
    const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
    const values=sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getDisplayValues();
    const rows=[];
    values.forEach((row,index)=>{
      const record={};
      headers.forEach((header,col)=>record[header]=row[col]);
      if(matcher(record))rows.push(index+2);
    });
    rows.sort((a,b)=>b-a).forEach(row=>sheet.deleteRow(row));
    return rows.length;
  };

  deleted.tagihan=deleteMatchingRows('Tagihan',row=>
    String(row.Periode_Bulan||'')==='2026-09' ||
    String(row.Tanggal_Bayar||'').slice(0,7)==='2026-09'
  );
  deleted.pengeluaran=deleteMatchingRows('PettyCash_Pengeluaran',row=>
    String(row.Tanggal||'').slice(0,7)==='2026-09'
  );

  SpreadsheetApp.flush();
  return 'Pembersihan selesai. Tagihan/pembayaran September dihapus: '+deleted.tagihan+
    '; pengeluaran September dihapus: '+deleted.pengeluaran+
    '. Pencatatan aktif mulai 1 Oktober 2026.';
}

// Isi BOOTSTRAP_PASSWORD di Script Properties; jalankan satu kali dari editor sebagai pemilik.
function bootstrapAdmin_() {
  const props=PropertiesService.getScriptProperties();
  const pass=props.getProperty('BOOTSTRAP_PASSWORD');
  const owner=Session.getEffectiveUser().getEmail().trim().toLowerCase();
  if (!owner || !pass) throw new Error('Akun Google pemilik atau BOOTSTRAP_PASSWORD belum tersedia.');
  passwordCheck_(pass);
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sheet=table_('Pengguna');
    if (sheet.getLastRow()>1) throw new Error('Pengguna sudah ada. Bootstrap dibatalkan.');
    if (!props.getProperty('PASSWORD_PEPPER')) throw new Error('Jalankan setupProject dahulu.');
    const salt=random_();
    sheet.appendRow(['USR-001','Pemilik',owner,salt,hashPassword_(pass,salt),'Admin','Aktif',today_()]);
    props.deleteProperty('BOOTSTRAP_PASSWORD');
    SpreadsheetApp.flush();
    return 'Admin awal dibuat untuk '+owner+'. Password bootstrap telah dihapus.';
  } finally {lock.releaseLock();}
}

function api(action,payload,token) {
  payload=payload || {};
  try {
    if (action==='login') return login_(payload);
    if (action==='logout') return logout_(token);
    const user=authenticate_(token);
    if (!Object.prototype.hasOwnProperty.call(ROLES,action) || !ROLES[action].includes(user.Peran)) throw new Error('Akses ditolak.');
    switch(action) {
      case 'overview': return overview_(user);
      case 'getLogs': return rows_('Log_Aktivitas').slice(-200).reverse();
      case 'saveCustomer': return saveCustomer_(payload,user);
      case 'setCustomerStatus': return setCustomerStatus_(payload,user);
      case 'deleteCustomer': return deleteCustomer_(payload,user);
      case 'savePackage': return savePackage_(payload,user);
      case 'generateInvoices': return generateInvoices_(payload,user);
      case 'payInvoice': return payInvoice_(payload,user);
      case 'reversePayment': return reversePayment_(payload,user);
      case 'saveUser': return saveUser_(payload,user);
      case 'saveExpense': return saveExpense_(payload,user);
      case 'cancelExpense': return cancelExpense_(payload,user);
    }
  } catch(e) {throw new Error(e.message || 'Terjadi kesalahan server.');}
}

function ss_() {
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID belum diatur.');
  return SpreadsheetApp.openById(id);
}
function table_(name) {const s=ss_().getSheetByName(name); if (!s) throw new Error('Tab '+name+' belum dibuat.'); return s;}
function read_(s) {
  const last=s.getLastRow(); if (last<2) return [];
  const headers=HEADERS[s.getName()];
  return s.getRange(2,1,last-1,headers.length).getDisplayValues().map((cells,i) =>
    Object.assign({_row:i+2},Object.fromEntries(headers.map((h,j)=>[h,cells[j]]))));
}
function rows_(name) {return read_(table_(name));}
function write_(s,row,obj) {s.getRange(row,1,1,HEADERS[s.getName()].length).setValues([HEADERS[s.getName()].map(h=>obj[h]===undefined?'':obj[h])]);}
function clean_(x,max=200) {
  const v=String(x===undefined||x===null?'':x).trim();
  if (v.length>max) throw new Error('Teks melebihi '+max+' karakter.');
  return /^[=+\-@]/.test(v) ? "'"+v : v;
}
function req_(x,name,max=200) {const v=clean_(x,max); if (!v) throw new Error(name+' wajib diisi.'); return v;}
function one_(value,choices,name) {if (!choices.includes(value)) throw new Error(name+' tidak valid.'); return value;}
function amount_(value) {const raw=String(value??'').trim();if(!raw||raw.startsWith('-'))throw new Error('Nominal tidak valid.');const cleaned=raw.replace(/^Rp\s*/i,'').replace(/[.\s]/g,'');if(!/^\d+$/.test(cleaned))throw new Error('Nominal tidak valid.');const n=Number(cleaned);if(!Number.isSafeInteger(n)||n<0||n>1e12)throw new Error('Nominal tidak valid.');return n;}
function date_(v) {const s=String(v||'');if (!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00:00+07:00'))||new Date(s+'T12:00:00+07:00').toISOString().slice(0,10)!==s) throw new Error('Tanggal tidak valid.');return s;}
function period_(v) {const s=String(v||'');if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) throw new Error('Periode harus YYYY-MM.');return s;}
function day_(v) {const n=Number(v);if (!Number.isInteger(n)||n<1||n>31)throw new Error('Tanggal jatuh tempo harus 1–31.');return n;}
function due_(period,day) {const [y,m]=period_(period).split('-').map(Number);return period+'-'+String(Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate())).padStart(2,'0');}
function today_() {return Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd');}
function now_() {return Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd HH:mm:ss');}
function random_() {return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function hex_(bytes) {return bytes.map(x=>('0'+(x&255).toString(16)).slice(-2)).join('');}
function sha_(s) {return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8));}
function hashPassword_(password,salt) {
  const pepper=PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER');
  if (!pepper) throw new Error('PASSWORD_PEPPER belum dibuat.');
  let result=String(password)+':'+salt+':'+pepper;
  for (let i=0;i<8000;i++) result=sha_(result+':'+salt);
  return result;
}
function passwordCheck_(p) {if (typeof p!=='string'||p.length<14||p.length>128||!/[A-Z]/.test(p)||!/[a-z]/.test(p)||!/[0-9]/.test(p)) throw new Error('Password minimal 14 karakter, memuat huruf besar, huruf kecil, dan angka.');}
function username_(v) {const s=String(v||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._@-]{2,99}$/.test(s))throw new Error('Username tidak valid.');return s;}
function pppoe_(v) {const s=String(v||'').trim();if(!/^[A-Za-z0-9][A-Za-z0-9._@-]{2,63}$/.test(s))throw new Error('User PPPoE wajib 3–64 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, @, atau tanda minus.');return s;}
function phone_(v) {let n=String(v||'').replace(/[\s+().-]/g,'');if(n.startsWith('0'))n='62'+n.slice(1);if(!/^628\d{8,12}$/.test(n))throw new Error('Nomor WA harus nomor seluler Indonesia.');return n;}
function id_(prefix,rows,key,width=3,usedIds=[]) {
  const values=rows.map(r=>r[key]).concat(usedIds);
  const nums=values.map(v=>String(v).startsWith(prefix)?Number(String(v).slice(prefix.length)):0).filter(Number.isInteger);
  return prefix+String(Math.max(0,...nums)+1).padStart(width,'0');
}
function log_(user,action,id,details) {table_('Log_Aktivitas').appendRow([now_(),user.Username,action,id,clean_(details,500)]);}
function locked_(fn) {const lock=LockService.getScriptLock();lock.waitLock(30000);try {const result=fn();SpreadsheetApp.flush();return result;}finally {lock.releaseLock();}}
function find_(rows,key,value) {return rows.find(r=>r[key]===value);}

function login_(p) {
  const name=username_(p.username), password=String(p.password||'');
  const cache=CacheService.getScriptCache(), throttle='fail:'+sha_(name);
  if (Number(cache.get(throttle)||0)>=5) throw new Error('Terlalu banyak percobaan. Tunggu 15 menit.');
  const user=find_(rows_('Pengguna'),'Username',name);
  const dummySalt='a82e1c9057f64d3d9e1b2f0117a42cff';
  const test=hashPassword_(password,user?user.Salt:dummySalt);
  if (!user||user.Status_Akses!=='Aktif'||test!==user.Password_Hash) {
    cache.put(throttle,String(Number(cache.get(throttle)||0)+1),900);
    throw new Error('Login gagal. Periksa akun dan password.');
  }
  cache.remove(throttle);
  const token=random_(), key='sess:'+sha_(token);
  cache.put(key,user.ID_Pengguna,21600);
  return {token, user:{ID_Pengguna:user.ID_Pengguna,Nama:user.Nama,Peran:user.Peran}};
}
function authenticate_(token) {
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new Error('Sesi tidak valid. Silakan login.');
  const id=CacheService.getScriptCache().get('sess:'+sha_(token));
  if(!id)throw new Error('Sesi berakhir. Silakan login kembali.');
  const user=find_(rows_('Pengguna'),'ID_Pengguna',id);
  if(!user||user.Status_Akses!=='Aktif')throw new Error('Akses pengguna tidak aktif.');
  return user;
}
function logout_(token) {if(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token))CacheService.getScriptCache().remove('sess:'+sha_(token));return true;}

function overview_(user) {
  const ss=ss_();const readName=n=>read_(ss.getSheetByName(n));
  const customers=readName('Pelanggan'), packages=readName('Paket_Internet'), invoices=readName('Tagihan');
  const t=today_(), month=t.slice(0,7), after=new Date(t+'T12:00:00+07:00');after.setUTCDate(after.getUTCDate()+3);
  const through=Utilities.formatDate(after,TZ,'yyyy-MM-dd');
  const unpaid=invoices.filter(i=>i.Status_Bayar==='Belum Lunas');
  const metrics={income:invoices.filter(i=>i.Status_Bayar==='Lunas'&&i.Tanggal_Bayar.slice(0,7)===month).reduce((a,i)=>a+Number(i.Jumlah_Tagihan),0),
    outstanding:unpaid.reduce((a,i)=>a+Number(i.Jumlah_Tagihan),0),
    active:customers.filter(c=>c.Status_Langganan==='Aktif').length,inactive:customers.filter(c=>c.Status_Langganan==='Nonaktif').length,isolated:customers.filter(c=>c.Status_Langganan==='Isolir').length,
    dueSoon:unpaid.filter(i=>i.Tanggal_Jatuh_Tempo>=t&&i.Tanggal_Jatuh_Tempo<=through).length,overdue:unpaid.filter(i=>i.Tanggal_Jatuh_Tempo<t).length};
  const pettySheet=ss.getSheetByName('PettyCash_Pengeluaran');
  const expenses=pettySheet ? read_(pettySheet) : [];
  return {user:{Nama:user.Nama,Peran:user.Peran},today:t,customers,packages,invoices,expenses,pettyCashReady:!!pettySheet,pettyCashStartDate:PETTY_CASH_START_DATE,metrics,
    users:user.Peran==='Admin'?readName('Pengguna').map(u=>({ID_Pengguna:u.ID_Pengguna,Nama:u.Nama,Username:u.Username,Peran:u.Peran,Status_Akses:u.Status_Akses})):[]};
}
function saveCustomer_(p,user) {return locked_(()=>{
  const customers=rows_('Pelanggan'), packages=rows_('Paket_Internet');
  const existing=p.ID_Pelanggan?find_(customers,'ID_Pelanggan',String(p.ID_Pelanggan)):null;
  if(p.ID_Pelanggan&&!existing)throw new Error('Pelanggan tidak ditemukan.');
  const pkg=find_(packages,'ID_Paket',String(p.ID_Paket||''));if(!pkg||(!existing&&pkg.Status_Paket!=='Aktif')||(existing&&existing.ID_Paket!==pkg.ID_Paket&&pkg.Status_Paket!=='Aktif'))throw new Error('Paket tidak tersedia.');
  const pppoe=pppoe_(p.User_PPPOE);
  const duplicate=customers.find(c=>c.ID_Pelanggan!==existing?.ID_Pelanggan&&
    String(c.User_PPPOE||'').trim().toLowerCase()===pppoe.toLowerCase());
  if(duplicate)throw new Error('User PPPoE sudah digunakan oleh '+duplicate.ID_Pelanggan+'.');
  const usedCustomerIds=rows_('Log_Aktivitas').map(l=>l.ID_Data);
  const value={ID_Pelanggan:existing?existing.ID_Pelanggan:id_('NET-',customers,'ID_Pelanggan',3,usedCustomerIds),Nama_Lengkap:req_(p.Nama_Lengkap,'Nama',120),Nomor_WA:phone_(p.Nomor_WA),Alamat_Lokasi:req_(p.Alamat_Lokasi,'Alamat',250),ID_Paket:pkg.ID_Paket,Tanggal_Jatuh_Tempo:String(day_(p.Tanggal_Jatuh_Tempo)),Status_Langganan:existing?existing.Status_Langganan:'Aktif',Tanggal_Dibuat:existing?existing.Tanggal_Dibuat:today_(),Tanggal_Diperbarui:now_(),User_PPPOE:pppoe};
  const s=table_('Pelanggan');existing?write_(s,existing._row,value):s.appendRow(HEADERS.Pelanggan.map(h=>value[h]));
  log_(user,existing?'EDIT_PELANGGAN':'TAMBAH_PELANGGAN',value.ID_Pelanggan,
    value.Nama_Lengkap+'; PPPoE '+value.User_PPPOE);return value.ID_Pelanggan;
});}
function setCustomerStatus_(p,user) {return locked_(()=>{
  const c=find_(rows_('Pelanggan'),'ID_Pelanggan',String(p.id));if(!c)throw new Error('Pelanggan tidak ditemukan.');
  const old=c.Status_Langganan;c.Status_Langganan=one_(p.status,['Aktif','Nonaktif','Isolir'],'Status');c.Tanggal_Diperbarui=now_();write_(table_('Pelanggan'),c._row,c);
  log_(user,'STATUS_PELANGGAN',c.ID_Pelanggan,old+' → '+c.Status_Langganan+'; administrasi saja, tanpa putus jaringan');return true;
});}
function deleteCustomer_(p,user) {return locked_(()=>{
  const id=String(p.id||'').trim();
  if(!/^NET-\d+$/.test(id))throw new Error('ID pelanggan tidak valid.');
  if(String(p.confirmation||'').trim()!==id)throw new Error('Konfirmasi ID pelanggan tidak cocok.');
  const c=find_(rows_('Pelanggan'),'ID_Pelanggan',id);if(!c)throw new Error('Pelanggan tidak ditemukan.');
  if(rows_('Tagihan').some(i=>i.ID_Pelanggan===id))throw new Error('Pelanggan sudah memiliki riwayat tagihan dan tidak dapat dihapus. Gunakan status Nonaktif agar riwayat tetap utuh.');
  table_('Pelanggan').deleteRow(c._row);
  log_(user,'HAPUS_PELANGGAN',id,'Nama: '+c.Nama_Lengkap+'; belum memiliki riwayat tagihan');return {id:id};
});}
function savePackage_(p,user) {return locked_(()=>{
  const packages=rows_('Paket_Internet'), existing=p.ID_Paket?find_(packages,'ID_Paket',String(p.ID_Paket)):null;
  if(p.ID_Paket&&!existing)throw new Error('Paket tidak ditemukan.');
  const code=existing?existing.ID_Paket:String(p.kode||'').trim().toUpperCase();
  if(!existing&&!/^PKT-[A-Z0-9]{2,20}$/.test(code))throw new Error('Kode paket: PKT- diikuti 2–20 huruf/angka.');
  if(!existing&&find_(packages,'ID_Paket',code))throw new Error('Kode paket sudah dipakai.');
  const value={ID_Paket:code,Nama_Paket:req_(p.Nama_Paket,'Nama paket',100),Kecepatan:req_(p.Kecepatan,'Kecepatan',50),Harga_Bulanan:amount_(p.Harga_Bulanan),Deskripsi:clean_(p.Deskripsi,300),Status_Paket:one_(p.Status_Paket||'Aktif',['Aktif','Nonaktif'],'Status paket')};
  const s=table_('Paket_Internet');existing?write_(s,existing._row,value):s.appendRow(HEADERS.Paket_Internet.map(h=>value[h]));
  log_(user,existing?'EDIT_PAKET':'TAMBAH_PAKET',code,(existing?'Harga lama '+existing.Harga_Bulanan+'; ':'')+'harga baru '+value.Harga_Bulanan);return code;
});}
function generateInvoices_(p,user) {return locked_(()=>{
  const period=period_(p.period),customers=rows_('Pelanggan').filter(c=>c.Status_Langganan==='Aktif');
  const packages=new Map(rows_('Paket_Internet').map(x=>[x.ID_Paket,x]));
  const invoices=rows_('Tagihan'),seen=new Set(invoices.filter(i=>i.Periode_Bulan===period).map(i=>i.ID_Pelanggan));
  const prefix='INV-'+period.replace('-','')+'-';
  let seq=Math.max(0,...invoices.map(i=>i.ID_Tagihan.startsWith(prefix)?Number(i.ID_Tagihan.slice(prefix.length)):0).filter(Number.isInteger));
  const output={created:0,skipped:0,failed:[]},batch=[];
  customers.forEach(c=>{
    if(seen.has(c.ID_Pelanggan)){output.skipped++;return;}
    try {
      const pkg=packages.get(c.ID_Paket);if(!pkg)throw new Error('Paket tidak ditemukan');
      const price=amount_(pkg.Harga_Bulanan),due=due_(period,day_(c.Tanggal_Jatuh_Tempo));
      const id=prefix+String(++seq).padStart(3,'0');
      batch.push([id,c.ID_Pelanggan,period,price,due,'Belum Lunas','','','','']);
      seen.add(c.ID_Pelanggan);output.created++;
    } catch(e) {output.failed.push({customer:c.ID_Pelanggan,reason:e.message});}
  });
  if(batch.length){const s=table_('Tagihan');s.getRange(s.getLastRow()+1,1,batch.length,HEADERS.Tagihan.length).setValues(batch);}
  log_(user,'GENERATE_TAGIHAN',period,'Dibuat '+output.created+', dilewati '+output.skipped+', gagal '+output.failed.length);
  return output;
});}
function payInvoice_(p,user) {return locked_(()=>{
  const inv=find_(rows_('Tagihan'),'ID_Tagihan',String(p.id));if(!inv)throw new Error('Tagihan tidak ditemukan.');
  if(inv.Status_Bayar==='Lunas')throw new Error('Tagihan sudah lunas; pembayaran ganda ditolak.');
  const paid=date_(p.date),method=one_(p.method,['Cash','Transfer'],'Metode');
  inv.Status_Bayar='Lunas';inv.Tanggal_Bayar=paid;inv.Metode_Bayar=method;inv.Catatan=clean_(p.note,500);inv.Dicatat_Oleh=user.Username;
  write_(table_('Tagihan'),inv._row,inv);log_(user,'BAYAR',inv.ID_Tagihan,'Rp '+inv.Jumlah_Tagihan+'; '+paid+'; '+method+'; '+inv.Catatan);return true;
});}
function reversePayment_(p,user) {return locked_(()=>{
  const inv=find_(rows_('Tagihan'),'ID_Tagihan',String(p.id));if(!inv||inv.Status_Bayar!=='Lunas')throw new Error('Tagihan lunas tidak ditemukan.');
  const reason=req_(p.reason,'Alasan koreksi',400), prior='Tanggal '+inv.Tanggal_Bayar+', '+inv.Metode_Bayar+', oleh '+inv.Dicatat_Oleh+', catatan '+inv.Catatan;
  inv.Status_Bayar='Belum Lunas';inv.Tanggal_Bayar='';inv.Metode_Bayar='';inv.Catatan='';inv.Dicatat_Oleh='';
  write_(table_('Tagihan'),inv._row,inv);log_(user,'KOREKSI_PEMBAYARAN',inv.ID_Tagihan,prior+'; alasan: '+reason);return true;
});}
function saveUser_(p,user) {return locked_(()=>{
  const users=rows_('Pengguna'),existing=p.ID_Pengguna?find_(users,'ID_Pengguna',String(p.ID_Pengguna)):null;
  if(p.ID_Pengguna&&!existing)throw new Error('Pengguna tidak ditemukan.');
  const name=req_(p.Nama,'Nama',100),username=username_(p.Username),role=one_(p.Peran,['Admin','Kasir'],'Peran'),status=one_(p.Status_Akses,['Aktif','Nonaktif'],'Status');
  if(users.some(u=>u.Username===username&&(!existing||u.ID_Pengguna!==existing.ID_Pengguna)))throw new Error('Username sudah dipakai.');
  if(existing&&existing.ID_Pengguna===user.ID_Pengguna&&(role!=='Admin'||status!=='Aktif'))throw new Error('Tidak dapat menonaktifkan atau menurunkan peran akun sendiri.');
  if(existing&&existing.Peran==='Admin'&&existing.Status_Akses==='Aktif'&&(role!=='Admin'||status!=='Aktif')&&users.filter(u=>u.Peran==='Admin'&&u.Status_Akses==='Aktif').length<=1)throw new Error('Admin aktif terakhir harus dipertahankan.');
  const password=String(p.password||'');if(!existing||password)passwordCheck_(password);
  const salt=password?random_():(existing?existing.Salt:random_());
  const value={ID_Pengguna:existing?existing.ID_Pengguna:id_('USR-',users,'ID_Pengguna'),Nama:name,Username:username,Salt:salt,Password_Hash:password?hashPassword_(password,salt):existing.Password_Hash,Peran:role,Status_Akses:status,Tanggal_Dibuat:existing?existing.Tanggal_Dibuat:today_()};
  const s=table_('Pengguna');existing?write_(s,existing._row,value):s.appendRow(HEADERS.Pengguna.map(h=>value[h]));
  log_(user,existing?'EDIT_PENGGUNA':'TAMBAH_PENGGUNA',value.ID_Pengguna,'Akun '+username+', peran '+role+', status '+status+(password?', password diubah':''));return true;
});}


// Petty Cash: pemasukan otomatis dihitung dari Tagihan berstatus Lunas.
// Tidak membuat duplikat pemasukan saat pembayaran/koreksi tagihan.
function saveExpense_(p,user) {return locked_(()=>{
  const expenses=rows_('PettyCash_Pengeluaran');
  const old=p.ID_Pengeluaran
    ?find_(expenses,'ID_Pengeluaran',String(p.ID_Pengeluaran)):null;
  if(p.ID_Pengeluaran&&!old)throw new Error('Pengeluaran tidak ditemukan.');
  if(old&&user.Peran!=='Admin')throw new Error('Hanya Admin yang boleh mengoreksi pengeluaran.');
  if(old&&old.Status==='Dibatalkan')throw new Error('Pengeluaran dibatalkan tidak bisa diedit.');
  const value={
    ID_Pengeluaran:old?old.ID_Pengeluaran:id_(
      'PC-',expenses,'ID_Pengeluaran',6,rows_('Log_Aktivitas').map(x=>x.ID_Data)),
    Tanggal:date_(p.Tanggal),
    Kategori:req_(p.Kategori,'Kategori',80),
    Uraian:req_(p.Uraian,'Uraian pengeluaran',200),
    Nominal:amount_(p.Nominal),
    Metode_Bayar:one_(p.Metode_Bayar,['Cash','Transfer'],'Metode pembayaran'),
    Catatan:clean_(p.Catatan,500),
    Dicatat_Oleh:old?old.Dicatat_Oleh:user.Username,
    Dibuat_Pada:old?old.Dibuat_Pada:now_(),
    Diperbarui_Pada:now_(),
    Status:'Aktif'
  };
  if(value.Tanggal<PETTY_CASH_START_DATE)throw new Error('Pencatatan Petty Cash dimulai 1 Oktober 2026.');
  if(value.Nominal<=0)throw new Error('Nominal pengeluaran harus lebih dari Rp 0.');
  const sheet=table_('PettyCash_Pengeluaran');
  old?write_(sheet,old._row,value):sheet.appendRow(
    HEADERS.PettyCash_Pengeluaran.map(h=>value[h]));
  const detail=value.Kategori+'; Rp '+value.Nominal+'; '+value.Uraian;
  log_(user,old?'KOREKSI_PENGELUARAN':'TAMBAH_PENGELUARAN',value.ID_Pengeluaran,
    old?'Sebelumnya: '+old.Tanggal+'; '+old.Kategori+'; Rp '+old.Nominal+'; '+old.Uraian+'; sekarang: '+detail:detail);
  return value.ID_Pengeluaran;
});}

// Pembatalan non-destruktif: riwayat tetap dapat diaudit dan tidak masuk saldo.
function cancelExpense_(p,user) {return locked_(()=>{
  const expense=find_(rows_('PettyCash_Pengeluaran'),
    'ID_Pengeluaran',String(p.id||''));
  if(!expense)throw new Error('Pengeluaran tidak ditemukan.');
  if(expense.Status==='Dibatalkan')throw new Error('Pengeluaran sudah dibatalkan.');
  const reason=req_(p.reason,'Alasan pembatalan',400);
  expense.Status='Dibatalkan';expense.Diperbarui_Pada=now_();
  write_(table_('PettyCash_Pengeluaran'),expense._row,expense);
  log_(user,'BATAL_PENGELUARAN',expense.ID_Pengeluaran,
    'Rp '+expense.Nominal+'; '+expense.Uraian+'; alasan: '+reason);
  return true;
});}
