# 4Math

PWA pentru calcul mental rapid: automatisme, descompunere, tipare, estimare, memorie numerică.
Problemele se generează din parametri, așa că nu se repetă. Datele stau local (IndexedDB), iar aplicația merge offline.

```bash
npm install
npm run dev      # dezvoltare
npm test         # teste de proprietate pentru generatoare, SRS, dificultate, sesiuni
npm run build    # build de producție + service worker
npm run preview  # servește build-ul local
```

Pe telefon, instalarea cere HTTPS. Variantele sunt un tunel local sau un deploy static (Vercel, Netlify, Cloudflare Pages) pentru folderul `dist/`.

## Structură

- `src/engine/`: logica, fără UI
  - generatoare parametrice: `generators/`
  - șabloane de prezentare: `problem.ts`
  - repetiție spațiată: `srs.ts`
  - dificultate adaptivă: `rating.ts`
  - motorul de sesiuni: `session.ts`
- `src/data/curriculum.ts`: abilitățile, lecțiile, prerechizitele și timpii-țintă. O abilitate nouă se adaugă aici.
- `src/db/`: schema Dexie, backup JSON.
- `src/ui/`: ecrane și componente (React + Tailwind).

## Faze

1. ✅ Automatisme + descompunere
2. Tipare speciale, recunoașterea strategiei
3. Estimare business, memorie numerică
4. Provocarea zilei, Capacitor, sincronizare
