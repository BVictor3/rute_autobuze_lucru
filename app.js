const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const state = {
  route: store.get("route", ROUTES[0].id),
  dir: new Date().getHours() < 12 ? "morning" : "evening",
  mine: store.get("mine", {}),
  sim: null
};
if (!ROUTES.some(r => r.id === state.route)) state.route = ROUTES[0].id;

const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const nowMin = () => state.sim ? toMin(state.sim) : (d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60)(new Date());
const fmtDiff = m => m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h ${Math.round(m % 60)} min`;
const currentRoute = () => ROUTES.find(r => r.id === state.route);

// Stațiile în ordinea direcției curente, cu ora corespunzătoare.
function currentStops() {
  const list = currentRoute().stops.map(s => ({ ...s, time: state.dir === "morning" ? s.am : s.pm }));
  return state.dir === "morning" ? list : list.reverse();
}

// ---------- Hartă ----------
const map = L.map("map");
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: "&copy; OpenStreetMap"
}).addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const stopLayer = L.layerGroup().addTo(map);
let busMarker = null;
let geometry = null;           // [[lat,lng],...] pe străzi, în ordinea de dimineață
let stopIdx = [];              // indexul din geometry cel mai apropiat de fiecare stație
const markers = {};

// Traseul pe străzi: cerut de la OSRM (serviciu public), păstrat apoi local.
// Dacă nu merge nici așa, se desenează linii drepte între stații.
async function loadGeometry(route) {
  const coords = route.stops.map(s => `${s.ll[1]},${s.ll[0]}`).join(";");
  const key = "geom:" + coords;
  geometry = store.get(key, null);
  if (!geometry) {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
      const data = await res.json();
      geometry = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      store.set(key, geometry);
    } catch {
      geometry = route.stops.map(s => s.ll);
    }
  }
  let from = 0;
  stopIdx = route.stops.map(s => {
    let best = from, bestD = Infinity;
    for (let i = from; i < geometry.length; i++) {
      const d = (geometry[i][0] - s.ll[0]) ** 2 + (geometry[i][1] - s.ll[1]) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
    from = best;
    return best;
  });
}

function drawRoute() {
  routeLayer.clearLayers();
  L.polyline(geometry, { color: "#ffffff", weight: 9, opacity: .9 }).addTo(routeLayer);
  L.polyline(geometry, { color: "#0b6bcb", weight: 5 }).addTo(routeLayer);
}

// Poziția estimată a autobuzului după program (nu e GPS real).
function busPosition(stops) {
  const now = nowMin();
  const t = stops.map(s => toMin(s.time));
  if (now < t[0] || now > t[t.length - 1]) return null;
  const n = stops.length, morning = state.dir === "morning";
  for (let i = 0; i < n - 1; i++) {
    if (now >= t[i] && now <= t[i + 1]) {
      const f = (now - t[i]) / Math.max(1, t[i + 1] - t[i]);
      const a = stopIdx[morning ? i : n - 1 - i], b = stopIdx[morning ? i + 1 : n - 2 - i];
      const idx = a + (b - a) * f;
      const lo = Math.floor(idx), hi = Math.min(geometry.length - 1, Math.ceil(idx)), ff = idx - lo;
      return [geometry[lo][0] + (geometry[hi][0] - geometry[lo][0]) * ff,
              geometry[lo][1] + (geometry[hi][1] - geometry[lo][1]) * ff];
    }
  }
  return null;
}

// ---------- Randare ----------
const routeSel = document.getElementById("route");
ROUTES.forEach(r => routeSel.add(new Option(r.name, r.id)));

function render() {
  routeSel.value = state.route;
  document.querySelectorAll(".toggle button").forEach(b => b.classList.toggle("on", b.dataset.dir === state.dir));
  const stops = currentStops();
  let mine = state.mine[state.route];
  if (!stops.some(s => s.name === mine)) mine = stops.find(s => s.name === "CEC BANK")?.name ?? stops[0].name;
  const now = nowMin();

  document.getElementById("stops").innerHTML = stops.map(s => {
    const cls = ["stop", toMin(s.time) < now ? "past" : "", s.name === mine ? "mine" : ""].join(" ");
    return `<li class="${cls}" data-name="${s.name}">
      <span class="time">${s.time}</span>
      <span class="rail"><span class="dot"></span></span>
      <span class="name">${s.name}<small>${s.note ?? ""}</small></span></li>`;
  }).join("");

  stopLayer.clearLayers();
  stops.forEach((s, i) => {
    const cls = ["pin", toMin(s.time) < now ? "past" : "", s.name === mine ? "mine" : "",
                 i === 0 || i === stops.length - 1 ? "end" : ""].join(" ");
    const size = s.name === mine ? 30 : 24;
    markers[s.name] = L.marker(s.ll, { icon: L.divIcon({ className: "", html: `<div class="${cls}"></div>`, iconSize: [size, size], iconAnchor: [size / 2 - 2, size / 2 - 2] }) })
      .bindTooltip(`${s.time} · ${s.name}`, { permanent: true, direction: "right", offset: [10, 0], className: "lbl" })
      .bindPopup(`<b>${s.name}</b><br>${s.note ?? ""}<br>Ora: <b>${s.time}</b>`)
      .on("dblclick", () => setMine(s.name))
      .addTo(stopLayer);
  });

  const pos = geometry && busPosition(stops);
  if (busMarker) { map.removeLayer(busMarker); busMarker = null; }
  if (pos) {
    busMarker = L.marker(pos, { zIndexOffset: 1000, icon: L.divIcon({ className: "", html: `<div class="bus">🚌</div>`, iconSize: [34, 34], iconAnchor: [17, 17] }) })
      .bindTooltip("Poziție estimată după program", { direction: "top" }).addTo(map);
  }

  const my = stops.find(s => s.name === mine);
  const diff = toMin(my.time) - now;
  const label = state.dir === "morning" ? "Autobuzul spre Flex trece prin" : "Autobuzul de la Flex ajunge în";
  document.getElementById("next").innerHTML = `
    <div class="muted">${label} <b>${mine}</b> la</div>
    <div class="big">${my.time}</div>
    <div class="muted">${diff > 0 ? "peste " + fmtDiff(diff) : diff > -1 ? "acum!" : "a trecut deja azi"}
      ${pos ? " · 🚌 autobuzul e pe traseu" : ""}</div>`;
}

function setMine(name) { state.mine[state.route] = name; store.set("mine", state.mine); render(); }

routeSel.onchange = async e => { state.route = e.target.value; store.set("route", state.route); await init(); };
document.querySelectorAll(".toggle button").forEach(b => b.onclick = () => { state.dir = b.dataset.dir; render(); });
const stopsEl = document.getElementById("stops");
stopsEl.onclick = e => {
  const li = e.target.closest(".stop"); if (!li) return;
  const m = markers[li.dataset.name];
  map.flyTo(m.getLatLng(), 16, { duration: .6 }); m.openPopup();
};
stopsEl.ondblclick = e => { const li = e.target.closest(".stop"); if (li) setMine(li.dataset.name); };
document.getElementById("simTime").oninput = e => { state.sim = e.target.value || null; render(); };
document.getElementById("nowBtn").onclick = () => { state.sim = null; document.getElementById("simTime").value = ""; render(); };

async function init() {
  const route = currentRoute();
  // loc în dreapta pentru etichetele stațiilor
  map.fitBounds(route.stops.map(s => s.ll), { paddingTopLeft: [30, 30], paddingBottomRight: [170, 30] });
  await loadGeometry(route);
  drawRoute();
  render();
}
init();
setInterval(render, 20000);
// La revenirea în aplicație (de ex. telefonul deblocat), actualizează imediat.
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

// ---------- PWA: offline + instalare ----------
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
const offlineEl = document.getElementById("offline");
const updateOnline = () => { offlineEl.style.display = navigator.onLine ? "none" : "block"; };
addEventListener("online", updateOnline); addEventListener("offline", updateOnline); updateOnline();

let installPrompt = null;
const installBtn = document.getElementById("installBtn");
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; installBtn.style.display = "block"; });
installBtn.onclick = async () => {
  if (!installPrompt) return;
  installPrompt.prompt(); await installPrompt.userChoice;
  installPrompt = null; installBtn.style.display = "none";
};
