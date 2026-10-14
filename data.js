// Rutele autobuzelor. Aici se modifică stațiile și orele.
// Ordinea stațiilor = cursa de dimineață (spre Flex). Seara se parcurge invers.
//   ll: [latitudine, longitudine]   am: ora dimineața   pm: ora seara
// ATENȚIE: date de EXEMPLU. Doar Freidorf, Calea Torontalului și Flex sunt poziții reale;
// stațiile intermediare și toate orele sunt inventate, CEC BANK e aproximativ.
const ROUTES = [{
  id: "freidorf", name: "Ruta Freidorf",
  stops: [
    { name: "Freidorf",                 note: "Cartier în sud-vest (capăt)",              ll: [45.7271, 21.1806], am: "05:50", pm: "16:05" },
    { name: "Stație exemplu – Șagului",  note: "zona Calea Șagului",                      ll: [45.7277, 21.2042], am: "05:57", pm: "15:57" },
    { name: "Stație exemplu – Iosefin",  note: "zona Bd. Regele Carol I",                 ll: [45.7456, 21.2124], am: "06:05", pm: "15:48" },
    { name: "Stație exemplu – Mehala",   note: "zona Bd. Cetății",                        ll: [45.7583, 21.2086], am: "06:12", pm: "15:40" },
    { name: "CEC BANK",                  note: "Calea Torontalului, lângă Iulius (aprox.)", ll: [45.7660, 21.2228], am: "06:18", pm: "15:33" },
    { name: "Flex",                      note: "Calea Torontalului (Flex România)",       ll: [45.8010, 21.1707], am: "06:32", pm: "15:15" }
  ]
}];
