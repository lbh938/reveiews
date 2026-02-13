import csv from 'csvtojson';
import path from 'path';

export default async function handler(req, res) {
  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });

  // ── Cache CDN 1h, stale 5min ──
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

  const csvPath = path.join(process.cwd(), 'data', 'reviews.csv');

  try {
    const rawReviews = await csv().fromFile(csvPath);

    // ── Filtrer les lignes invalides (doublons d'en-tête, lignes vides) ──
    const reviews = rawReviews.filter((r) => {
      const n = parseInt(r.rating, 10);
      return !isNaN(n) && n >= 1 && n <= 5;
    });

    const { product, rating, limit, offset, sort, order, search } = req.query;

    let filtered = reviews;

    // ── Filtre par produit ──
    if (product) {
      filtered = filtered.filter(
        (r) => r.product_handle === product || r.product_id === product
      );
    }

    // ── Filtre par note minimum ──
    if (rating) {
      const min = parseInt(rating, 10);
      filtered = filtered.filter((r) => parseInt(r.rating, 10) >= min);
    }

    // ── Recherche texte ──
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.author && r.author.toLowerCase().includes(q)) ||
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.body && r.body.toLowerCase().includes(q)) ||
          (r.product_handle && r.product_handle.toLowerCase().includes(q))
      );
    }

    // ── Tri ──
    const sortField = sort || 'date';
    const sortOrder = order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortField === 'rating') {
        return (parseInt(a.rating, 10) - parseInt(b.rating, 10)) * sortOrder;
      }
      if (sortField === 'date') {
        return (new Date(a.date) - new Date(b.date)) * sortOrder;
      }
      const va = (a[sortField] || '').toLowerCase();
      const vb = (b[sortField] || '').toLowerCase();
      return va.localeCompare(vb) * sortOrder;
    });

    // ── Pagination ──
    const start = parseInt(offset, 10) || 0;
    const count = parseInt(limit, 10) || filtered.length;
    const paginated = filtered.slice(start, start + count);

    // ── Stats rapides ──
    const totalAll = reviews.length;
    const avgRating =
      reviews.reduce((sum, r) => sum + parseInt(r.rating, 10), 0) / (totalAll || 1);

    return res.status(200).json({
      total: filtered.length,
      total_all: totalAll,
      average_rating: Math.round(avgRating * 10) / 10,
      offset: start,
      limit: count,
      reviews: paginated,
    });
  } catch (err) {
    console.error('[reviews-api]', err.message);
    return res.status(500).json({ error: 'Erreur lecture CSV', details: err.message });
  }
}
