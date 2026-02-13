import csv from 'csvtojson';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });

  const csvPath = path.join(process.cwd(), 'data', 'reviews.csv');

  try {
    const rawReviews = await csv().fromFile(csvPath);

    // ── Filtrer les lignes invalides (doublons d'en-tête, lignes vides, rating non numérique) ──
    const reviews = rawReviews.filter((r) => {
      const n = parseInt(r.rating, 10);
      return !isNaN(n) && n >= 1 && n <= 5;
    });
    const total = reviews.length;

    // ── Note moyenne ──
    const sumRating = reviews.reduce((s, r) => s + parseInt(r.rating, 10), 0);
    const avgRating = total ? Math.round((sumRating / total) * 10) / 10 : 0;

    // ── Distribution des notes ──
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const n = parseInt(r.rating, 10);
      if (n >= 1 && n <= 5) ratingDist[n]++;
    });

    // ── Par produit ──
    const byProduct = {};
    reviews.forEach((r) => {
      const h = r.product_handle || 'inconnu';
      if (!byProduct[h]) byProduct[h] = { count: 0, sum_rating: 0, product_id: r.product_id };
      byProduct[h].count++;
      byProduct[h].sum_rating += parseInt(r.rating, 10);
    });
    Object.keys(byProduct).forEach((k) => {
      byProduct[k].avg_rating =
        Math.round((byProduct[k].sum_rating / byProduct[k].count) * 10) / 10;
    });

    // ── Par pays ──
    const byCountry = {};
    reviews.forEach((r) => {
      const c = (r.country || '').trim() || 'N/A';
      byCountry[c] = (byCountry[c] || 0) + 1;
    });

    // ── Avec médias ──
    const withImages = reviews.filter((r) => r.image_url && r.image_url.trim()).length;
    const withVideos = reviews.filter((r) => r.video_url && r.video_url.trim()).length;
    const verified = reviews.filter((r) => r.verified && r.verified.trim() === 'true').length;

    // ── Timeline (par mois) ──
    const timeline = {};
    reviews.forEach((r) => {
      if (r.date) {
        const month = r.date.substring(0, 7); // "2026-01"
        timeline[month] = (timeline[month] || 0) + 1;
      }
    });

    return res.status(200).json({
      total,
      average_rating: avgRating,
      rating_distribution: ratingDist,
      by_product: byProduct,
      by_country: byCountry,
      with_images: withImages,
      with_videos: withVideos,
      verified,
      timeline,
    });
  } catch (err) {
    console.error('[reviews-api/stats]', err.message);
    return res.status(500).json({ error: 'Erreur stats', details: err.message });
  }
}
