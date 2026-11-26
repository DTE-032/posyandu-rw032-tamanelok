(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  // State Aplikasi Terpusat
  const state = {
    activeRoute: 'dashboard',
    theme: 'light',
    sidebarCollapsed: false,
    participants: [
      { id: 'PS-001', name: 'Nadia Aulia', category: 'Balita', birth: '2023-04-12', guardian: 'Siti Rahma', status: 'Aktif' },
      { id: 'PS-002', name: 'Rafa Fadillah', category: 'Balita', birth: '2022-09-03', guardian: 'Dewi Fitri', status: 'Aktif' },
      { id: 'PS-003', name: 'Aisyah Putri', category: 'Balita', birth: '2024-01-20', guardian: 'Rina Amelia', status: 'Pemantauan' },
      { id: 'PS-004', name: 'Budi Santoso', category: 'Lansia', birth: '1958-07-15', guardian: 'Andi Santoso', status: 'Aktif' },
      { id: 'PS-005', name: 'Maya Lestari', category: 'Ibu Hamil', birth: '1997-11-02', guardian: '-', status: 'Pemantauan' },
      { id: 'PS-006', name: 'Dimas Pratama', category: 'Balita', birth: '2021-12-18', guardian: 'Lina Pratiwi', status: 'Aktif' }
    ],
    services: [],
    schedules: [
      { name: 'Posyandu Balita', date: '2026-11-30', time: '08.00–11.00 WIB', category: 'Balita', place: 'Balai RW 02' },
      { name: 'Penyuluhan Gizi Keluarga', date: '2026-12-05', time: '09.00–10.30 WIB', category: 'Edukasi', place: 'Balai RW 02' },
      { name: 'Pemeriksaan Lansia', date: '2026-12-12', time: '08.30–10.30 WIB', category: 'Lansia', place: 'Balai RW 02' }
    ]
  };

  let toastTimer = null;

  // Utilitas UI
  function showToast(message) {
    const toastEl = $('#appToast');
    const msgEl = $('#toastMessage');
    if (!toastEl || !msgEl) return;

    msgEl.textContent = message;
    toastEl.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-shown');
    }, 3000);
  }

  function getInitials(fullName) {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0] || '')
      .join('')
      .toUpperCase();
  }

  function formatIndonesianDate(isoDate) {
    if (!isoDate) return '-';
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return parsed.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Manajemen Tema (Light / Dark Mode + Preferensi Sistem)
  function applyTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    const iconEl = $('#themeIcon');
    if (iconEl) {
      iconEl.setAttribute('data-lucide', themeName === 'dark' ? 'sun' : 'moon');
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('posyandu_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      applyTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  }

  // Manajemen Navigasi Halaman & Drawer Mobile
  function closeMobileDrawer() {
    $('#appSidebar')?.classList.remove('is-open');
    $('#drawerBackdrop')?.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  function openMobileDrawer() {
    $('#appSidebar')?.classList.add('is-open');
    $('#drawerBackdrop')?.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function navigateTo(route) {
    const targetView = $(`#view-${route}`);
    if (!targetView) return;

    state.activeRoute = route;

    $$('.page-view').forEach(view => {
      view.classList.toggle('active', view.id === `view-${route}`);
    });

    $$('[data-route]').forEach(btn => {
      const isActive = btn.dataset.route === route;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    closeMobileDrawer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Manajemen Modal Aksesibel
  function openModal(modalId) {
    const modal = $(`#${modalId}`);
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const firstInput = modal.querySelector('input, select, button');
    firstInput?.focus();
  }

  function closeModal(modalId) {
    const modal = $(`#${modalId}`);
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  // Render Komponen Data Peserta
  function renderParticipants() {
    const query = ($('#participantSearch')?.value || '').toLowerCase().trim();
    const category = $('#categoryFilter')?.value || 'semua';
    const status = $('#statusFilter')?.value || 'semua';

    const filtered = state.participants.filter(p => {
      const matchText = p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
      const matchCategory = category === 'semua' || p.category === category;
      const matchStatus = status === 'semua' || p.status === status;
      return matchText && matchCategory && matchStatus;
    });

    const tbody = $('#participantRows');
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="empty-box">
                <i data-lucide="search"></i>
                <strong>Peserta tidak ditemukan</strong>
                <span>Coba ubah kata kunci pencarian atau filter kategori.</span>
              </div>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = filtered.map(p => {
          const catClass = p.category === 'Balita' ? 'pill-success' : p.category === 'Ibu Hamil' ? 'pill-warning' : 'pill-info';
          const statusClass = p.status === 'Aktif' ? 'pill-success' : 'pill-warning';
          return `
            <tr>
              <td>
                <div class="entity-cell">
                  <div class="avatar-badge sm">${getInitials(p.name)}</div>
                  <div class="entity-meta">
                    <strong>${p.name}</strong>
                    <span>Pendamping: ${p.guardian || '-'}</span>
                  </div>
                </div>
              </td>
              <td><strong>${p.id}</strong></td>
              <td><span class="status-pill ${catClass}">${p.category}</span></td>
              <td>${formatIndonesianDate(p.birth)}</td>
              <td><span class="status-pill ${statusClass}">${p.status}</span></td>
              <td>
                <button type="button" class="icon-btn" data-view-participant="${p.id}" aria-label="Detail peserta ${p.name}">
                  <i data-lucide="eye"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    const countEl = $('#participantCount');
    if (countEl) {
      countEl.textContent = `Menampilkan ${filtered.length} dari ${state.participants.length} peserta`;
    }

    const selectEl = $('#serviceParticipant');
    if (selectEl) {
      selectEl.innerHTML = state.participants
        .map(p => `<option value="${p.id}">${p.name} · ${p.category}</option>`)
        .join('');
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // Render Komponen Jadwal Kegiatan
  function renderSchedules() {
    const filter = $('#scheduleFilter')?.value || 'semua';
    const filtered = state.schedules.filter(s => filter === 'semua' || s.category === filter);

    const badgeEl = $('#scheduleBadge');
    if (badgeEl) {
      badgeEl.textContent = `${state.schedules.length} agenda terjadwal`;
    }

    const listEl = $('#scheduleList');
    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-box">
          <i data-lucide="calendar-off"></i>
          <strong>Belum ada agenda dalam kategori ini</strong>
        </div>
      `;
    } else {
      listEl.innerHTML = filtered.map((item, idx) => `
        <div class="schedule-card-item">
          <div class="stat-icon tone-emerald">
            <i data-lucide="calendar-days"></i>
          </div>
          <div class="schedule-details">
            <strong>${item.name}</strong>
            <span>${formatIndonesianDate(item.date)} · ${item.time || 'Waktu belum ditentukan'}</span>
            <span>${item.place || 'Balai RW 02'} · Kategori ${item.category}</span>
          </div>
          <span class="status-pill pill-success">Terjadwal</span>
          <button type="button" class="icon-btn" data-delete-schedule="${idx}" aria-label="Hapus agenda ${item.name}">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `).join('');
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // Render Grafik Kehadiran 6 Bulan
  function renderAttendanceChart() {
    const chartEl = $('#attendanceChart');
    if (!chartEl) return;
    const values = [58, 68, 63, 77, 72, 86];
    chartEl.innerHTML = values
      .map((val, index) => `
        <div class="chart-col">
          <div class="chart-bar ${index === values.length - 1 ? 'is-current' : ''}" style="height: ${val}%" title="Tingkat kehadiran ${val}%"></div>
        </div>
      `)
      .join('');
  }

  // Inisialisasi Event Listeners
  function bindEvents() {
    // Tanggal Hari Ini
    const todayEl = $('#todayLabel');
    if (todayEl) {
      todayEl.textContent = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    // Navigasi Utama & Tautan Pintas
    $$('[data-route]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.route));
    });

    $$('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.goto));
    });

    // Mobile Drawer & Bottom More Button
    $('#mobileMenuBtn')?.addEventListener('click', openMobileDrawer);
    $('#bottomMoreBtn')?.addEventListener('click', openMobileDrawer);
    $('#drawerCloseBtn')?.addEventListener('click', closeMobileDrawer);
    $('#drawerBackdrop')?.addEventListener('click', closeMobileDrawer);

    // Collapse Sidebar Desktop
    $('#sidebarCollapseBtn')?.addEventListener('click', () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      $('#appShell')?.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
      const icon = $('#sidebarCollapseBtn i');
      if (icon) {
        icon.setAttribute('data-lucide', state.sidebarCollapsed ? 'panel-left-open' : 'panel-left-close');
        if (window.lucide) window.lucide.createIcons();
      }
    });

    // Toggle Tema Gelap / Terang
    $('#themeToggleBtn')?.addEventListener('click', () => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('posyandu_theme', nextTheme);
      applyTheme(nextTheme);
      showToast(nextTheme === 'dark' ? 'Mode gelap diaktifkan.' : 'Mode terang diaktifkan.');
    });

    // Notifikasi & Sesi
    $('#noticeBtn')?.addEventListener('click', () => {
      showToast('Semua jadwal pelayanan bulan ini telah terverifikasi.');
    });

    $('#sessionBtn')?.addEventListener('click', () => {
      showToast('Mode simulasi: sesi Admin Posyandu tetap aktif.');
    });

    // Filter & Aksi Peserta
    ['participantSearch', 'categoryFilter', 'statusFilter'].forEach(id => {
      $(`#${id}`)?.addEventListener('input', renderParticipants);
    });

    $('#participantRows')?.addEventListener('click', event => {
      const btn = event.target.closest('[data-view-participant]');
      if (!btn) return;
      const person = state.participants.find(p => p.id === btn.dataset.viewParticipant);
      if (person) {
        showToast(`${person.name} (${person.id}) · ${person.category} · Status ${person.status}`);
      }
    });

    $('#openParticipantModalBtn')?.addEventListener('click', () => openModal('participantModal'));

    $('#participantForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const name = $('#newName').value.trim();
      if (!name) return;

      const newParticipant = {
        id: `PS-${String(state.participants.length + 1).padStart(3, '0')}`,
        name,
        category: $('#newCategory').value,
        birth: $('#newBirth').value,
        guardian: $('#newGuardian').value.trim() || '-',
        status: $('#newStatus').value
      };

      state.participants.push(newParticipant);
      renderParticipants();
      event.target.reset();
      closeModal('participantModal');

      const extraBalita = state.participants.filter(p => p.category === 'Balita').length - 4;
      $('#statBalita').textContent = String(128 + Math.max(0, extraBalita));
      showToast(`Peserta ${newParticipant.name} berhasil ditambahkan.`);
    });

    // Formulir Pelayanan Bulanan
    $('#serviceForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const participant = state.participants.find(p => p.id === $('#serviceParticipant').value);
      const record = {
        name: participant ? participant.name : 'Peserta',
        date: $('#serviceDate').value,
        weight: $('#weight').value,
        height: $('#height').value,
        immunization: $('#immunization').value
      };

      state.services.unshift(record);
      $('#serviceTotal').textContent = String(state.services.length);

      const updatedD = 96 + state.services.length;
      $('#reportD').textContent = String(updatedD);
      $('#reportD2').textContent = String(updatedD);
      $('#statHadir').textContent = String(updatedD);

      $('#serviceHistory').innerHTML = state.services.slice(0, 5).map(item => `
        <div class="history-entry">
          <span class="history-dot"></span>
          <div>
            <strong>${item.name}</strong>
            <p class="muted-text">
              ${formatIndonesianDate(item.date)}
              ${item.weight ? ` · ${item.weight} kg` : ''}
              ${item.immunization ? ` · ${item.immunization}` : ''}
            </p>
          </div>
        </div>
      `).join('');

      event.target.reset();
      $('#serviceDate').value = '2026-11-26';
      showToast('Data pemeriksaan berhasil dicatat pada sesi ini.');
    });

    // Jadwal Kegiatan
    $('#scheduleFilter')?.addEventListener('change', renderSchedules);

    $('#scheduleList')?.addEventListener('click', event => {
      const btn = event.target.closest('[data-delete-schedule]');
      if (!btn) return;
      state.schedules.splice(Number(btn.dataset.deleteSchedule), 1);
      renderSchedules();
      showToast('Agenda kegiatan dihapus dari daftar.');
    });

    $('#openScheduleModalBtn')?.addEventListener('click', () => openModal('scheduleModal'));

    $('#scheduleForm')?.addEventListener('submit', event => {
      event.preventDefault();
      state.schedules.push({
        name: $('#newScheduleName').value.trim(),
        date: $('#newScheduleDate').value,
        time: $('#newScheduleTime').value.trim() || '08.00–11.00 WIB',
        category: $('#newScheduleCategory').value,
        place: 'Balai RW 02'
      });
      renderSchedules();
      event.target.reset();
      closeModal('scheduleModal');
      showToast('Agenda baru berhasil ditambahkan.');
    });

    // Sub-tab Portal Warga
    $$('[data-public]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.public;
        const validPanels = ['home', 'layanan', 'edukasi', 'kalkulator', 'kontak'];
        if (!validPanels.includes(target)) return;

        $$('.subtab').forEach(tab => {
          const isMatch = tab.dataset.public === target;
          tab.classList.toggle('active', isMatch);
          tab.setAttribute('aria-selected', String(isMatch));
        });

        $$('.public-panel').forEach(panel => {
          panel.classList.toggle('hidden', panel.id !== `public-${target}`);
        });
      });
    });

    // Kalkulator Pertumbuhan (IMT)
    $('#bmiForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const age = Number($('#bmiAge').value);
      const weight = Number($('#bmiWeight').value);
      const heightMeters = Number($('#bmiHeight').value) / 100;

      if (weight <= 0 || heightMeters <= 0) {
        showToast('Masukkan nilai berat dan tinggi badan yang valid.');
        return;
      }

      const bmi = weight / (heightMeters * heightMeters);
      const resultBox = $('#bmiResult');
      resultBox.classList.remove('hidden');
      resultBox.innerHTML = `
        <strong>Hasil Perhitungan IMT: ${bmi.toFixed(1)} kg/m²</strong>
        <p class="muted-text" style="margin-top: 0.35rem;">
          Usia anak: ${age} bulan. Nilai ini merupakan perhitungan awal IMT dan bukan diagnosis status gizi. Konsultasikan hasil pengukuran dengan bidan atau kader Posyandu.
        </p>
      `;
    });

    // Tutup Modal via Tombol, Backdrop, atau Tombol Escape
    $$('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });

    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', event => {
        if (event.target === overlay) closeModal(overlay.id);
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeMobileDrawer();
        $$('.modal-overlay:not([hidden])').forEach(modal => closeModal(modal.id));
      }
    });

    // Bersihkan state drawer saat orientasi/ukuran layar berubah ke desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        closeMobileDrawer();
      }
    });
  }

  // Bootstrap Aplikasi
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderAttendanceChart();
    renderParticipants();
    renderSchedules();
    bindEvents();
    if (window.lucide) window.lucide.createIcons();
  });
})();