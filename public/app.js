/* ═══════════════════════════════════════════════════════
   REVIEW ENGINE — DASHBOARD APP
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const API_BASE = window.location.origin;
  let allReviews = [];
  let statsData = null;
  let previewSwiper = null;

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

      html +=
        '<tr>' +
        '<td>' +
        '<div class="td-author">' +
        '<div class="td-avatar">' + getInitials(r.author) + '</div>' +
        '<div><div class="td-name">' + escapeHtml(r.author) + '</div>' +
        verified +
        '</div></div>' +
        '</td>' +
        '<td><span class="td-product">' + escapeHtml(r.product_handle) + '</span></td>' +
        '<td><div class="td-stars">' + renderStars(parseInt(r.rating, 10)) + '</div></td>' +
        '<td><div class="td-title">' + escapeHtml(r.title) + '</div></td>' +
        '<td><div class="td-body">' + escapeHtml(r.body) + '</div></td>' +
        '<td>' + mediaCell + '</td>' +
        '<td>' + formatDate(r.date) + '</td>' +
        '<td>' + getFlagEmoji((r.country || '').trim()) + ' ' + escapeHtml((r.country || '').trim()) + '</td>' +
        '</tr>';
    });

    tbody.innerHTML = html;
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
