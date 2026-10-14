# Autobuze Flex

Aplicație web (PWA) care arată pe hartă traseul autobuzelor, stațiile și orele, dimineața (spre Flex) și seara (de la Flex).

- Se instalează pe telefon din browser și merge și fără internet (harta doar pentru zonele deja văzute).
- Stațiile și orele se modifică în `data.js`.
- După ce modifici fișierele, crește `VERSION` în `sw.js` ca telefoanele să ia varianta nouă.

Rulare locală:

```
python -m http.server 8080
```

apoi deschide http://localhost:8080.

Hartă: © OpenStreetMap. Traseul pe străzi: OSRM.
