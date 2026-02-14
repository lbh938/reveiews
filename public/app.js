/* ═══════════════════════════════════════════════════════
   REVIEW ENGINE — DASHBOARD APP
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const API_BASE = window.location.origin;
  let allReviews = [];
  let statsData = null;
  let previewSwiper = null;
  let hasUnsavedChanges = false;

  /* ═══════════════ NAVIGATION ═══════════════ */
  const links = document.querySelectorAll('.sidebar__link');
  const pages = document.querySelectorAll('.page');

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const target = this.dataset.page;

      links.forEach(function (l) { l.classList.remove('active'); });
      this.classList.add('active');

      pages.forEach(function (p) { p.classList.remove('active'); });
      document.getElementById('page-' + target).classList.add('active');

      // Fermer sidebar mobile
      document.getElementById('sidebar').classList.remove('open');

      // Init preview swiper si nécessaire
      if (target === 'preview' && allReviews.length && !previewSwiper) {
        setTimeout(renderPreview, 100);
      }
    });
  });

  // Mobile menu toggle
  var menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  /* ═══════════════ API CALLS ═══════════════ */
  function setStatus(online, text) {
    var el = document.getElementById('apiStatus');
    var dot = el.querySelector('.status-dot');
    dot.className = 'status-dot ' + (online ? 'online' : 'error');
    el.childNodes[el.childNodes.length - 1].textContent = ' ' + text;
  }

  async function fetchReviews() {
    try {
      var res = await fetch(API_BASE + '/api');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      allReviews = data.reviews || [];
      setStatus(true, 'API connectée — ' + allReviews.length + ' avis');
      return data;
    } catch (err) {
      console.error('[Dashboard]', err);
      setStatus(false, 'Erreur API');
      return null;
    }
  }

  async function fetchStats() {
    try {
      var res = await fetch(API_BASE + '/api/stats');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      statsData = await res.json();
      return statsData;
    } catch (err) {
      console.error('[Dashboard Stats]', err);
      return null;
    }
  }

  /* ═══════════════ HELPERS ═══════════════ */
  function starSVG(filled) {
    var c = filled ? '#f5a623' : 'rgba(255,255,255,0.15)';
    return '<svg viewBox="0 0 24 24" fill="' + c + '" width="14" height="14"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }

  function renderStars(rating) {
    return Array.from({ length: 5 }, function (_, i) { return starSVG(i < rating); }).join('');
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
  }

  function escapeHtml(str) {
    if (!str) return '';
    var el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch (e) { return dateStr || ''; }
  }

  /* ═══════════════ DASHBOARD ═══════════════ */
  function renderDashboard(stats) {
    if (!stats) return;

    // KPIs
    animateValue('kpiTotal', 0, stats.total, 600);
    document.getElementById('kpiAvg').textContent = stats.average_rating + ' / 5';
    animateValue('kpiVerified', 0, stats.verified, 600);
    animateValue('kpiMedia', 0, stats.with_images + stats.with_videos, 600);

    // Rating distribution
    var dist = stats.rating_distribution;
    var maxCount = Math.max.apply(null, Object.values(dist)) || 1;
    var barsHtml = '';
    for (var i = 5; i >= 1; i--) {
      var count = dist[i] || 0;
      var pct = Math.round((count / maxCount) * 100);
      barsHtml +=
        '<div class="rating-bar">' +
        '<div class="rating-bar__label">' + '★'.repeat(i) + '</div>' +
        '<div class="rating-bar__track"><div class="rating-bar__fill" style="width:' + pct + '%"></div></div>' +
        '<div class="rating-bar__count">' + count + '</div>' +
        '</div>';
    }
    document.getElementById('ratingBars').innerHTML = barsHtml;

    // By Product
    var products = stats.by_product;
    var prodHtml = '';
    Object.keys(products).forEach(function (key) {
      var p = products[key];
      prodHtml +=
        '<div class="product-item">' +
        '<div class="product-item__name">' + escapeHtml(key) + '</div>' +
        '<div class="product-item__stats">' +
        '<span class="product-item__count">' + p.count + ' avis</span>' +
        '<span class="product-item__avg">★ ' + p.avg_rating + '</span>' +
        '</div>' +
        '</div>';
    });
    document.getElementById('productList').innerHTML = prodHtml;

    // By Country
    var countries = stats.by_country;
    var countryHtml = '';
    Object.keys(countries)
      .sort(function (a, b) { return countries[b] - countries[a]; })
      .forEach(function (key) {
        countryHtml +=
          '<div class="country-tag">' +
          getFlagEmoji(key) + ' ' + key +
          ' <span class="country-tag__count">' + countries[key] + '</span>' +
          '</div>';
      });
    document.getElementById('countryList').innerHTML = countryHtml;

    // Timeline
    var timeline = stats.timeline;
    var months = Object.keys(timeline).sort();
    var maxMonth = Math.max.apply(null, months.map(function (m) { return timeline[m]; })) || 1;
    var tlHtml = '';
    months.forEach(function (m) {
      var val = timeline[m];
      var h = Math.round((val / maxMonth) * 90) + 10;
      tlHtml +=
        '<div class="timeline-bar">' +
        '<div class="timeline-bar__value">' + val + '</div>' +
        '<div class="timeline-bar__fill" style="height:' + h + 'px"></div>' +
        '<div class="timeline-bar__label">' + m + '</div>' +
        '</div>';
    });
    document.getElementById('timelineChart').innerHTML = tlHtml;
  }

  function animateValue(elementId, start, end, duration) {
    var el = document.getElementById(elementId);
    if (!el) return;
    if (end === 0) { el.textContent = '0'; return; }
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var value = Math.floor(progress * (end - start) + start);
      el.textContent = value;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    var code = countryCode.toUpperCase();
    return String.fromCodePoint(
      0x1F1E6 - 65 + code.charCodeAt(0),
      0x1F1E6 - 65 + code.charCodeAt(1)
    );
  }

  /* ═══════════════ REVIEWS TABLE ═══════════════ */
  function renderReviewsTable(reviews) {
    var tbody = document.getElementById('reviewsTableBody');
    document.getElementById('reviewsCount').textContent = reviews.length + ' avis';

    if (!reviews.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-secondary)">Aucun avis trouvé</td></tr>';
      return;
    }

    var html = '';
    reviews.forEach(function (r) {
      var idx = allReviews.indexOf(r);
      var mediaCell = '';
      if (r.image_url && r.image_url.trim()) {
        mediaCell = '<img class="td-media" src="' + r.image_url.trim() + '" alt="media">';
      } else if (r.video_url && r.video_url.trim()) {
        mediaCell = '🎬';
      } else {
        mediaCell = '<span style="color:var(--text-secondary)">—</span>';
      }

      var verified = (r.verified && r.verified.trim() === 'true')
        ? '<div class="td-verified">✓ Vérifié</div>'
        : '';

      var rowClass = r._added ? 'row-added' : (r._modified ? 'row-modified' : '');

      html +=
        '<tr class="' + rowClass + '">' +
        '<td>' +
        '<div class="td-author">' +
        '<div class="td-avatar">' + getInitials(r.author) + '</div>' +
        '<div><div class="td-name">' + escapeHtml(r.author) + '</div>' +
        verified +
        '</div></div>' +
        '</td>' +
        '<td><span class="td-product">' + escapeHtml(r.product_handle) + '</span></td>' +
        '<td><div class="td-stars">' + renderStars(parseInt(r.rating, 10)) + '</div></td>' +
        '<td><div class="td-body">' + escapeHtml(r.body) + '</div></td>' +
        '<td>' + mediaCell + '</td>' +
        '<td>' + getFlagEmoji((r.country || '').trim()) + ' ' + escapeHtml((r.country || '').trim()) + '</td>' +
        '<td>' + formatDate(r.date) + '</td>' +
        '<td><div class="td-actions">' +
        '<button class="action-btn action-btn--icon edit-btn" data-idx="' + idx + '" title="Modifier">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        '</button>' +
        '<button class="action-btn action-btn--icon delete-btn" data-idx="' + idx + '" title="Supprimer">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
        '</button>' +
        '</div></td>' +
        '</tr>';
    });

    tbody.innerHTML = html;

    // Bind edit / delete buttons
    tbody.querySelectorAll('.edit-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { openEditModal(parseInt(this.dataset.idx, 10)); });
    });
    tbody.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { openDeleteModal(parseInt(this.dataset.idx, 10)); });
    });
  }

  function populateProductFilter(reviews) {
    var select = document.getElementById('filterProduct');
    var handles = [];
    reviews.forEach(function (r) {
      if (r.product_handle && handles.indexOf(r.product_handle) === -1) {
        handles.push(r.product_handle);
      }
    });
    handles.sort().forEach(function (h) {
      var opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      select.appendChild(opt);
    });
  }

  function filterReviews() {
    var search = (document.getElementById('searchInput').value || '').toLowerCase();
    var product = document.getElementById('filterProduct').value;
    var rating = document.getElementById('filterRating').value;

    var filtered = allReviews.filter(function (r) {
      if (product && r.product_handle !== product) return false;
      if (rating && parseInt(r.rating, 10) < parseInt(rating, 10)) return false;
      if (search) {
        var hay = [r.author, r.title, r.body, r.product_handle].join(' ').toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    });

    renderReviewsTable(filtered);
  }

  // Events
  document.getElementById('searchInput').addEventListener('input', filterReviews);
  document.getElementById('filterProduct').addEventListener('change', filterReviews);
  document.getElementById('filterRating').addEventListener('change', filterReviews);

  /* ═══════════════ PREVIEW ═══════════════ */
  function renderPreview() {
    var container = document.getElementById('previewSlides');
    if (!allReviews.length) return;

    var html = '';
    allReviews.forEach(function (r) {
      var media = '';
      if (r.image_url && r.image_url.trim()) {
        media = '<div class="pv-card__media"><img src="' + r.image_url.trim() + '" alt="photo" loading="lazy"></div>';
      }

      var verified = (r.verified && r.verified.trim() === 'true')
        ? '<span class="pv-card__verified">✓ Vérifié</span>'
        : '';

      html +=
        '<div class="swiper-slide">' +
        '<div class="pv-card">' +
        '<div class="pv-card__header">' +
        '<div class="pv-card__avatar">' + getInitials(r.author) + '</div>' +
        '<div>' +
        '<div class="pv-card__author">' + escapeHtml(r.author) + '</div>' +
        '<div class="pv-card__date">' + formatDate(r.date) + (r.country ? ' · ' + r.country.trim() : '') + '</div>' +
        verified +
        '</div>' +
        '</div>' +
        '<div class="pv-card__stars">' + renderStars(parseInt(r.rating, 10)) + '</div>' +
        '<div class="pv-card__title">' + escapeHtml(r.title) + '</div>' +
        '<p class="pv-card__body">' + escapeHtml(r.body) + '</p>' +
        media +
        '</div>' +
        '</div>';
    });

    container.innerHTML = html;

    if (previewSwiper) previewSwiper.destroy(true, true);
    previewSwiper = new Swiper('.preview-swiper', {
      slidesPerView: 1,
      spaceBetween: 20,
      grabCursor: true,
      loop: true,
      pagination: { el: '.preview-swiper .swiper-pagination', clickable: true },
      navigation: { nextEl: '.preview-swiper .swiper-button-next', prevEl: '.preview-swiper .swiper-button-prev' },
      breakpoints: {
        640: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }

  // Preview mode buttons
  document.querySelectorAll('.preview-mode').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.preview-mode').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      document.getElementById('previewFrame').setAttribute('data-mode', this.dataset.mode);

      // Recréer le swiper pour le nouveau mode
      if (allReviews.length) {
        setTimeout(renderPreview, 50);
      }
    });
  });

  // Set default preview mode
  document.getElementById('previewFrame').setAttribute('data-mode', 'light');

  /* ═══════════════ API DOCS ═══════════════ */
  function updateApiDocs() {
    var base = API_BASE + '/api';
    var urlEl = document.getElementById('yourApiUrl');
    if (urlEl) urlEl.textContent = base;

    var exampleEl = document.getElementById('apiExampleUrl');
    if (exampleEl) exampleEl.textContent = base + '?product=serum-vitamine-c&rating=4&limit=10';
  }

  /* ═══════════════ COPY BUTTON ═══════════════ */
  window.copyApiUrl = function (btn) {
    var code = btn.previousElementSibling;
    var text = code.textContent;
    navigator.clipboard.writeText(text).then(function () {
      var orig = btn.textContent;
      btn.textContent = '✓ Copié !';
      btn.style.background = '#27ae60';
      setTimeout(function () {
        btn.textContent = orig;
        btn.style.background = '';
      }, 2000);
    });
  };

  /* ═══════════════ CSV IMPORT ═══════════════ */
  var importRawRows = [];
  var importConvertedRows = [];
  var importDetectedFormat = '';

  // ── Robust CSV parser (handles quoted fields with newlines) ──
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          field += ch;
          i++;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
        } else if (ch === ',') {
          row.push(field);
          field = '';
          i++;
        } else if (ch === '\n' || ch === '\r') {
          row.push(field);
          field = '';
          if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
          i++;
          if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
            rows.push(row);
          }
          row = [];
        } else {
          field += ch;
          i++;
        }
      }
    }
    // Last field
    if (field || row.length > 0) {
      row.push(field);
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        rows.push(row);
      }
    }
    return rows;
  }

  // ── Detect CSV format from headers ──
  function detectFormat(headers) {
    var h = headers.map(function (c) { return c.trim().toLowerCase(); });
    if (h.indexOf('comment id') !== -1 && h.indexOf('buyer name') !== -1) return 'aliexpress';
    if (h.indexOf('review_id') !== -1 && h.indexOf('product_handle') !== -1) return 'review-engine';
    if (h.indexOf('title') !== -1 && h.indexOf('body') !== -1 && h.indexOf('rating') !== -1) return 'judgeme';
    if (h.indexOf('name') !== -1 && h.indexOf('review') !== -1) return 'generic';
    return 'unknown';
  }

  // ── Parse French date "10 sept. 2025" → "2025-09-10" ──
  var frenchMonths = {
    'janv': '01', 'jan': '01', 'janvier': '01',
    'févr': '02', 'fev': '02', 'février': '02', 'fevrier': '02',
    'mars': '03', 'mar': '03',
    'avr': '04', 'avril': '04',
    'mai': '05',
    'juin': '06', 'jun': '06',
    'juill': '07', 'jul': '07', 'juillet': '07',
    'août': '08', 'aout': '08', 'aoû': '08',
    'sept': '09', 'sep': '09', 'septembre': '09',
    'oct': '10', 'octobre': '10',
    'nov': '11', 'novembre': '11',
    'déc': '12', 'dec': '12', 'décembre': '12', 'decembre': '12'
  };

  function parseFrenchDate(dateStr) {
    if (!dateStr) return '';
    // Already ISO?
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
    // "10 sept. 2025" or "10 septembre 2025"
    var cleaned = dateStr.replace(/\./g, '').trim().toLowerCase();
    var parts = cleaned.split(/\s+/);
    if (parts.length >= 3) {
      var day = parts[0].padStart(2, '0');
      var monthKey = parts[1];
      var year = parts[2];
      var month = frenchMonths[monthKey];
      if (month && year.length === 4) {
        return year + '-' + month + '-' + day;
      }
    }
    // Try Date.parse as fallback
    var d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return dateStr;
  }

  // ── Convert AliExpress row to Review Engine format ──
  function convertAliExpressRow(headerMap, row, index, options) {
    var get = function (key) {
      var idx = headerMap[key];
      return idx !== undefined && idx < row.length ? (row[idx] || '').trim() : '';
    };

    var useFR = options.lang === 'translation';
    var body = '';
    if (useFR) {
      body = get('buyer translation feedback') || get('buyer feedback');
    } else {
      body = get('buyer feedback');
    }

    // Get first image URL only (they can have multiple separated by newlines)
    var imagesRaw = get('images');
    var imageUrls = imagesRaw ? imagesRaw.split(/\n/).map(function (u) { return u.trim(); }).filter(Boolean) : [];
    var firstImage = imageUrls.length > 0 ? imageUrls[0] : '';

    var dateRaw = get('review date');
    var dateISO = parseFrenchDate(dateRaw);

    return {
      review_id: get('comment id') || String(index + 1),
      product_handle: options.productHandle || 'product',
      product_id: options.productId || '',
      author: get('buyer name'),
      email: '',
      rating: get('rating'),
      title: body.length > 60 ? body.substring(0, 57) + '...' : body,
      body: body,
      image_url: firstImage,
      video_url: '',
      verified: 'true',
      date: dateISO,
      country: get('buyer country')
    };
  }

  // ── Convert Judge.me / generic row ──
  function convertGenericRow(headerMap, row, index, options) {
    var get = function (key) {
      var idx = headerMap[key];
      return idx !== undefined && idx < row.length ? (row[idx] || '').trim() : '';
    };

    return {
      review_id: get('id') || get('review_id') || String(index + 1),
      product_handle: get('product_handle') || get('product') || options.productHandle || 'product',
      product_id: get('product_id') || options.productId || '',
      author: get('author') || get('name') || get('reviewer') || get('buyer name') || 'Anonyme',
      email: get('email') || '',
      rating: get('rating') || get('score') || '5',
      title: get('title') || '',
      body: get('body') || get('review') || get('comment') || get('text') || '',
      image_url: get('image_url') || get('image') || get('photo') || '',
      video_url: get('video_url') || get('video') || '',
      verified: get('verified') || 'true',
      date: parseFrenchDate(get('date') || get('created_at') || get('review date') || ''),
      country: get('country') || get('buyer country') || ''
    };
  }

  // ── Build header map ──
  function buildHeaderMap(headers) {
    var map = {};
    headers.forEach(function (h, i) {
      map[h.trim().toLowerCase()] = i;
    });
    return map;
  }

  // ── CSV escape ──
  function csvEscape(val) {
    if (!val) return '';
    var s = String(val);
    if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  // ── Generate CSV string from converted rows ──
  function generateCSV(rows) {
    var header = 'review_id,product_handle,product_id,author,email,rating,title,body,image_url,video_url,verified,date,country';
    var lines = [header];
    rows.forEach(function (r) {
      lines.push([
        csvEscape(r.review_id),
        csvEscape(r.product_handle),
        csvEscape(r.product_id),
        csvEscape(r.author),
        csvEscape(r.email),
        csvEscape(r.rating),
        csvEscape(r.title),
        csvEscape(r.body),
        csvEscape(r.image_url),
        csvEscape(r.video_url),
        csvEscape(r.verified),
        csvEscape(r.date),
        csvEscape(r.country)
      ].join(','));
    });
    return lines.join('\n');
  }

  // ── UI step management ──
  function activateStep(num) {
    [1, 2, 3].forEach(function (n) {
      var el = document.getElementById('importStep' + n);
      el.classList.remove('active', 'done');
      if (n < num) el.classList.add('done');
      if (n === num) el.classList.add('active');
    });
  }

  // ── Dropzone ──
  var dropzone = document.getElementById('importDropzone');
  var fileInput = document.getElementById('importFile');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', function () { fileInput.click(); });

    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', function () {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length) handleFileSelect(fileInput.files[0]);
    });
  }

  function handleFileSelect(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      var rows = parseCSV(text);
      if (rows.length < 2) {
        alert('Le fichier CSV semble vide ou invalide.');
        return;
      }

      importRawRows = rows;
      var headers = rows[0];
      var format = detectFormat(headers);
      importDetectedFormat = format;

      // Update dropzone visual
      dropzone.classList.add('has-file');
      dropzone.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
        '<p><strong>' + escapeHtml(file.name) + '</strong></p>' +
        '<p style="font-size:13px;color:var(--green);">' + (rows.length - 1) + ' avis détectés — Format : ' + formatLabel(format) + '</p>';

      // Show mapping
      var formatEl = document.getElementById('importFormatDetected');
      formatEl.innerHTML = 'Format détecté : <strong>' + formatLabel(format) + '</strong> — ' + (rows.length - 1) + ' lignes trouvées';

      // Show mapping table
      showColumnMapping(headers, rows[1] || [], format);

      // Enable convert button
      document.getElementById('importConvertBtn').disabled = false;

      // Activate step 2
      activateStep(2);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function formatLabel(format) {
    var labels = {
      'aliexpress': '🛒 AliExpress',
      'review-engine': '⭐ Review Engine (natif)',
      'judgeme': '📝 Judge.me',
      'generic': '📄 CSV générique',
      'unknown': '❓ Format inconnu'
    };
    return labels[format] || format;
  }

  function showColumnMapping(headers, sampleRow, format) {
    var mappings = [];
    if (format === 'aliexpress') {
      mappings = [
        ['Comment Id', 'review_id'],
        ['Buyer Name', 'author'],
        ['Buyer Translation Feedback', 'body (texte)'],
        ['Buyer Feedback', 'body (fallback)'],
        ['Rating', 'rating'],
        ['Images', 'image_url (1ère image)'],
        ['Buyer Country', 'country'],
        ['Review Date', 'date (→ YYYY-MM-DD)'],
        ['(votre saisie)', 'product_handle']
      ];
    } else {
      headers.forEach(function (h) {
        mappings.push([h, h]);
      });
    }

    var html = '<table class="import-mapping"><thead><tr><th>Source</th><th></th><th>Destination</th><th>Aperçu</th></tr></thead><tbody>';
    var hmap = buildHeaderMap(headers);

    mappings.forEach(function (m) {
      var idx = hmap[m[0].toLowerCase()];
      var sample = idx !== undefined && sampleRow[idx] ? sampleRow[idx].substring(0, 50) : '—';
      html +=
        '<tr>' +
        '<td class="col-source">' + escapeHtml(m[0]) + '</td>' +
        '<td class="col-arrow">→</td>' +
        '<td class="col-target">' + escapeHtml(m[1]) + '</td>' +
        '<td class="col-sample">' + escapeHtml(sample) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';

    // Insert mapping table before config
    var desc = document.getElementById('importFormatDetected');
    desc.innerHTML += html;
  }

  // ── Convert button ──
  var convertBtn = document.getElementById('importConvertBtn');
  if (convertBtn) {
    convertBtn.addEventListener('click', function () {
      if (importRawRows.length < 2) return;

      var headers = importRawRows[0];
      var headerMap = buildHeaderMap(headers);
      var dataRows = importRawRows.slice(1);

      var options = {
        productHandle: document.getElementById('importProductHandle').value.trim() || 'product',
        productId: document.getElementById('importProductId').value.trim() || '',
        lang: document.getElementById('importLang').value,
        merge: document.getElementById('importMerge').value
      };

      importConvertedRows = [];

      if (importDetectedFormat === 'aliexpress') {
        dataRows.forEach(function (row, idx) {
          importConvertedRows.push(convertAliExpressRow(headerMap, row, idx, options));
        });
      } else {
        dataRows.forEach(function (row, idx) {
          importConvertedRows.push(convertGenericRow(headerMap, row, idx, options));
        });
      }

      // If merge, prepend existing reviews
      if (options.merge === 'merge' && allReviews.length) {
        // Assign new IDs to avoid collision
        var maxId = 0;
        allReviews.forEach(function (r) {
          var n = parseInt(r.review_id, 10);
          if (n > maxId) maxId = n;
        });
        importConvertedRows.forEach(function (r, idx) {
          r.review_id = String(maxId + idx + 1);
        });
        importConvertedRows = allReviews.concat(importConvertedRows);
      }

      // Show step 3
      activateStep(3);
      renderImportPreview();
    });
  }

  function renderImportPreview() {
    // Stats
    var total = importConvertedRows.length;
    var withImages = importConvertedRows.filter(function (r) { return r.image_url; }).length;
    var avgRating = (importConvertedRows.reduce(function (s, r) { return s + parseInt(r.rating, 10); }, 0) / total).toFixed(1);
    var countries = {};
    importConvertedRows.forEach(function (r) { if (r.country) countries[r.country] = (countries[r.country] || 0) + 1; });
    var countryCount = Object.keys(countries).length;

    var statsHtml =
      '<div class="import-stat"><span class="import-stat__value">' + total + '</span><span class="import-stat__label">avis</span></div>' +
      '<div class="import-stat"><span class="import-stat__value">★ ' + avgRating + '</span><span class="import-stat__label">moyenne</span></div>' +
      '<div class="import-stat"><span class="import-stat__value">' + withImages + '</span><span class="import-stat__label">avec image</span></div>' +
      '<div class="import-stat"><span class="import-stat__value">' + countryCount + '</span><span class="import-stat__label">pays</span></div>';
    document.getElementById('importStats').innerHTML = statsHtml;

    // Table preview (max 20 rows)
    var tbody = document.getElementById('importPreviewBody');
    var preview = importConvertedRows.slice(0, 20);
    var html = '';
    preview.forEach(function (r) {
      var img = r.image_url
        ? '<img class="td-media" src="' + escapeHtml(r.image_url) + '" alt="" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">'
        : '<span style="color:var(--text-secondary)">—</span>';
      html +=
        '<tr>' +
        '<td style="font-family:monospace;font-size:11px;">' + escapeHtml(r.review_id) + '</td>' +
        '<td><strong>' + escapeHtml(r.author) + '</strong></td>' +
        '<td>' + renderStars(parseInt(r.rating, 10)) + '</td>' +
        '<td><div class="td-body" style="max-width:300px;">' + escapeHtml(r.body) + '</div></td>' +
        '<td>' + img + '</td>' +
        '<td>' + getFlagEmoji(r.country) + ' ' + escapeHtml(r.country) + '</td>' +
        '<td>' + escapeHtml(r.date) + '</td>' +
        '</tr>';
    });
    if (importConvertedRows.length > 20) {
      html += '<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-secondary);">… et ' + (importConvertedRows.length - 20) + ' autres avis</td></tr>';
    }
    tbody.innerHTML = html;
  }

  // ── Download button ──
  var downloadBtn = document.getElementById('importDownloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      if (!importConvertedRows.length) return;
      var csv = generateCSV(importConvertedRows);
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'reviews.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── Reset button ──
  var resetBtn = document.getElementById('importResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      importRawRows = [];
      importConvertedRows = [];
      importDetectedFormat = '';

      // Reset dropzone
      dropzone.classList.remove('has-file');
      dropzone.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
        '<p><strong>Glissez votre fichier CSV ici</strong></p>' +
        '<p style="font-size:13px;color:var(--text-secondary);">ou cliquez pour parcourir</p>';
      fileInput.value = '';

      // Reset fields
      document.getElementById('importProductHandle').value = '';
      document.getElementById('importProductId').value = '';
      document.getElementById('importFormatDetected').innerHTML = '';
      document.getElementById('importConvertBtn').disabled = true;
      document.getElementById('importStats').innerHTML = '';
      document.getElementById('importPreviewBody').innerHTML = '';

      activateStep(1);
    });
  }

  /* ═══════════════ CRUD — EDIT / DELETE / ADD ═══════════════ */

  var editModal = document.getElementById('editModal');
  var deleteModalEl = document.getElementById('deleteModal');
  var deleteTargetIdx = -1;

  // ── Track unsaved changes ──
  function markUnsaved() {
    hasUnsavedChanges = true;
    var banner = document.getElementById('unsavedBanner');
    var saveBtn = document.getElementById('saveAllBtn');
    if (banner) banner.style.display = 'flex';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
  }

  // ── Open Edit Modal ──
  function openEditModal(idx) {
    var r = allReviews[idx];
    if (!r) return;

    document.getElementById('modalTitle').textContent = 'Modifier l\'avis';
    document.getElementById('editIndex').value = idx;
    document.getElementById('editAuthor').value = r.author || '';
    document.getElementById('editEmail').value = r.email || '';
    document.getElementById('editRating').value = r.rating || '5';
    document.getElementById('editProduct').value = r.product_handle || '';
    document.getElementById('editCountry').value = (r.country || '').trim();
    document.getElementById('editDate').value = (r.date || '').slice(0, 10);
    document.getElementById('editTitle').value = r.title || '';
    document.getElementById('editBody').value = r.body || '';
    document.getElementById('editImage').value = r.image_url || '';
    document.getElementById('editVideo').value = r.video_url || '';
    document.getElementById('editVerified').value = (r.verified && r.verified.trim() === 'true') ? 'true' : 'false';

    updateImagePreview();
    editModal.style.display = 'flex';
  }

  // ── Open Add Modal ──
  function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Ajouter un avis';
    document.getElementById('editIndex').value = '-1';
    document.getElementById('editAuthor').value = '';
    document.getElementById('editEmail').value = '';
    document.getElementById('editRating').value = '5';
    document.getElementById('editProduct').value = 'product';
    document.getElementById('editCountry').value = '';
    document.getElementById('editDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('editTitle').value = '';
    document.getElementById('editBody').value = '';
    document.getElementById('editImage').value = '';
    document.getElementById('editVideo').value = '';
    document.getElementById('editVerified').value = 'true';

    updateImagePreview();
    editModal.style.display = 'flex';
  }

  // ── Close modals ──
  function closeEditModal() { editModal.style.display = 'none'; }
  function closeDeleteModal() { deleteModalEl.style.display = 'none'; deleteTargetIdx = -1; }

  // ── Image preview ──
  function updateImagePreview() {
    var url = document.getElementById('editImage').value.trim();
    var preview = document.getElementById('editImagePreview');
    if (url) {
      preview.innerHTML = '<img src="' + escapeHtml(url) + '" alt="preview" onerror="this.style.display=\'none\'">';
    } else {
      preview.innerHTML = '';
    }
  }

  // ── Save (edit or add) ──
  function saveReview() {
    var idx = parseInt(document.getElementById('editIndex').value, 10);
    var author = document.getElementById('editAuthor').value.trim();
    var body = document.getElementById('editBody').value.trim();

    if (!author) { alert('Le nom de l\'auteur est requis.'); return; }

    var data = {
      review_id: '',
      product_handle: document.getElementById('editProduct').value.trim() || 'product',
      product_id: '',
      author: author,
      email: document.getElementById('editEmail').value.trim(),
      rating: document.getElementById('editRating').value,
      title: document.getElementById('editTitle').value.trim(),
      body: body,
      image_url: document.getElementById('editImage').value.trim(),
      video_url: document.getElementById('editVideo').value.trim(),
      verified: document.getElementById('editVerified').value,
      date: document.getElementById('editDate').value || new Date().toISOString().slice(0, 10),
      country: document.getElementById('editCountry').value.trim()
    };

    if (idx >= 0 && idx < allReviews.length) {
      // ── Edit existing ──
      data.review_id = allReviews[idx].review_id;
      data.product_id = allReviews[idx].product_id || '';
      data._modified = true;
      allReviews[idx] = data;
    } else {
      // ── Add new ──
      var maxId = 0;
      allReviews.forEach(function(r) {
        var n = parseInt(r.review_id, 10);
        if (!isNaN(n) && n > maxId) maxId = n;
      });
      data.review_id = String(maxId + 1);
      data._added = true;
      allReviews.unshift(data); // Add at the beginning
    }

    markUnsaved();
    closeEditModal();
    filterReviews();
  }

  // ── Delete ──
  function openDeleteModal(idx) {
    var r = allReviews[idx];
    if (!r) return;
    deleteTargetIdx = idx;
    document.getElementById('deleteAuthorName').textContent = r.author || 'inconnu';
    deleteModalEl.style.display = 'flex';
  }

  function confirmDelete() {
    if (deleteTargetIdx >= 0 && deleteTargetIdx < allReviews.length) {
      allReviews.splice(deleteTargetIdx, 1);
      markUnsaved();
      closeDeleteModal();
      filterReviews();
    }
  }

  // ── Download modified CSV ──
  function downloadModifiedCSV() {
    if (!allReviews.length) return;

    var header = 'review_id,product_handle,product_id,author,email,rating,title,body,image_url,video_url,verified,date,country';
    var lines = [header];

    allReviews.forEach(function(r) {
      lines.push([
        csvEscape(r.review_id),
        csvEscape(r.product_handle),
        csvEscape(r.product_id),
        csvEscape(r.author),
        csvEscape(r.email),
        csvEscape(r.rating),
        csvEscape(r.title),
        csvEscape(r.body),
        csvEscape(r.image_url),
        csvEscape(r.video_url),
        csvEscape(r.verified),
        csvEscape(r.date),
        csvEscape(r.country)
      ].join(','));
    });

    var csv = lines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'reviews.csv';
    a.click();
    URL.revokeObjectURL(url);

    // Reset flags
    allReviews.forEach(function(r) { delete r._modified; delete r._added; });
    hasUnsavedChanges = false;
    document.getElementById('unsavedBanner').style.display = 'none';
    document.getElementById('saveAllBtn').style.display = 'none';
    filterReviews();
  }

  // ── Bind modal events ──
  document.getElementById('modalClose').addEventListener('click', closeEditModal);
  document.getElementById('modalCancel').addEventListener('click', closeEditModal);
  document.getElementById('modalSave').addEventListener('click', saveReview);
  document.getElementById('addReviewBtn').addEventListener('click', openAddModal);
  document.getElementById('editImage').addEventListener('input', updateImagePreview);

  document.getElementById('deleteModalClose').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);

  document.getElementById('saveAllBtn').addEventListener('click', downloadModifiedCSV);
  var saveBtn2 = document.getElementById('saveAllBtn2');
  if (saveBtn2) saveBtn2.addEventListener('click', downloadModifiedCSV);

  // Close modals on overlay click
  editModal.addEventListener('click', function(e) {
    if (e.target === editModal) closeEditModal();
  });
  deleteModalEl.addEventListener('click', function(e) {
    if (e.target === deleteModalEl) closeDeleteModal();
  });

  // Close modals with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeEditModal();
      closeDeleteModal();
    }
  });

  /* ═══════════════ BOOT ═══════════════ */
  async function init() {
    updateApiDocs();

    var [reviewData, stats] = await Promise.all([fetchReviews(), fetchStats()]);

    if (stats) renderDashboard(stats);
    if (allReviews.length) {
      renderReviewsTable(allReviews);
      populateProductFilter(allReviews);
    }
  }

  init();
})();
