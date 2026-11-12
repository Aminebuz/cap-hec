// Envoie la notification correspondant au créneau courant (heure de Paris).
// Lancé par .github/workflows/rappels.yml. Secrets : VAPID_PRIVATE, PUSH_SUBSCRIPTIONS (JSON : un abonnement ou une liste).
const webpush = require("web-push");
const fs = require("fs");
const path = require("path");

const VAPID_PUBLIC = "BCL9kLoKGl43fB798Ozk4FTjNwr1KaqARF_nr1_976bkXFPlTCd3eIvskwQOVTb7ElFHamDDHnLPzAVorEreZEg";
const privateKey = process.env.VAPID_PRIVATE;
const raw = process.env.PUSH_SUBSCRIPTIONS;
if (!privateKey || !raw) { console.log("Secrets manquants : rien à envoyer."); process.exit(0); }
webpush.setVapidDetails("mailto:cap-hec@example.com", VAPID_PUBLIC, privateKey);

let subs = JSON.parse(raw); if (!Array.isArray(subs)) subs = [subs];
const plan = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "content", "notifications.json"), "utf8"));

// Heure de Paris, arrondie au quart d'heure le plus proche (GitHub Actions peut retarder le lancement).
const now = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now).map(p => [p.type, p.value]));
const dayIdx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
const mins = (+parts.hour) * 60 + (+parts.minute);
const forced = process.env.SLOT; // pour un test manuel

const due = plan.slots.filter(s => {
  if (forced) return s.id === forced;
  if (s.days && !s.days.includes(dayIdx)) return false;
  const [h, m] = s.time.split(":").map(Number);
  const diff = mins - (h * 60 + m);
  return diff >= 0 && diff < 15; // une seule exécution par créneau (cron toutes les 15 min)
});
if (!due.length) { console.log("Aucun rappel prévu à", parts.hour + ":" + parts.minute, "jour", dayIdx); process.exit(0); }

(async () => {
  for (const s of due) {
    const body = (s.byDay && s.byDay[String(dayIdx)]) || s.body;
    const payload = JSON.stringify({ title: s.title, body, view: s.view || "jour", tag: s.id });
    for (const sub of subs) {
      try { await webpush.sendNotification(sub, payload, { TTL: 3600 }); console.log("Envoyé :", s.id); }
      catch (e) { console.log("Échec", s.id, e.statusCode || e.message); }
    }
  }
})();
