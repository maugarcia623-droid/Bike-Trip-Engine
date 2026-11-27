# RideCadence Localization & Inline `isFr ?` Inventory

Generated deterministically by `scripts/exportLocalizationCatalog.ts` for Xcode `Localizable.xcstrings` migration.

## Dictionary Seed Summary (`contracts/localization/seed.json`)
- **Total keys:** 1172
- **Missing in FR:** 0
- **Missing in EN:** 0
- **Placeholder mismatches:** 6

| Key | EN placeholders | FR placeholders |
|---|---|---|
| `ctxSportAdvice` | — | `{carbs}` |
| `goReasonHeadwind` | `{watts}`, `{wind}` | `{wind}` |
| `goReasonPower` | — | `{watts}` |
| `goReasonPowerFtp` | — | `{watts}`, `{zone}` |
| `pacingHoldEffortHint` | `{watts}`, `{zone}` | `{speed}`, `{watts}`, `{zone}` |
| `pacingHoldSpeedHint` | — | `{speed}` |

## Inline Language Ternary Summary (`contracts/localization/inline-isfr-inventory.json`)
- **Scanned source files:** 170
- **Files with inline ternaries:** 93
- **Total AST matches:** 2682
- **Translatable strings:** 2681
- **Excluded non-text CSS/style ternaries:** 1
- **By kind:** literal=1993, template=536, expression=134, nested=14, jsx=5

## Grouped Summary

| Group | Files | Total Matches | Translatable |
|---|---:|---:|---:|
| `App.tsx` | 1 | 7 | 7 |
| `components` | 2 | 57 | 57 |
| `components/auth` | 2 | 8 | 8 |
| `components/common` | 3 | 43 | 43 |
| `components/configurator` | 5 | 170 | 170 |
| `components/dashboard` | 16 | 641 | 641 |
| `components/home` | 6 | 138 | 138 |
| `components/navigation` | 3 | 37 | 37 |
| `components/onboarding` | 8 | 227 | 226 |
| `components/print` | 2 | 59 | 59 |
| `components/settings` | 2 | 119 | 119 |
| `components/tools` | 10 | 311 | 311 |
| `components/tour` | 2 | 57 | 57 |
| `context` | 1 | 5 | 5 |
| `data` | 2 | 8 | 8 |
| `services` | 4 | 27 | 27 |
| `types` | 2 | 66 | 66 |
| `utils` | 22 | 702 | 702 |

## Per-File Breakdown

### App.tsx (7 translatable / 7 total across 1 files)

#### `src/App.tsx` (7 translatable / 7 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 928 | literal | code | Commute | Vélotaf |
| 936 | literal | code | Commute | Vélotaf |
| 1575 | literal | jsx-attribute:title | Keep at least one ride | Profil requis |
| 1579 | literal | jsx-attribute:title | Remove this ride? | Supprimer ce trajet ? |
| 1582 | literal | jsx-attribute:title | Reset to defaults? | Réinitialiser Cadence ? |
| 1597 | literal | jsx-attribute:confirmLabel | Remove | Supprimer |
| 1601 | literal | jsx-attribute:confirmLabel | Reset | Réinitialiser |

### components (57 translatable / 57 total across 2 files)

#### `src/components/OnboardingModal.tsx` (37 translatable / 37 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 57 | expression | code | daysEn[d.getDay()] | daysFr[d.getDay()] |
| 58 | expression | code | monthsEn[d.getMonth()] | monthsFr[d.getMonth()] |
| 266 | literal | code | Start | Départ |
| 267 | literal | code | Finish | Arrivée |
| 283 | literal | code | Custom | Perso |
| 286 | expression | code | selectedPaceDef.name | selectedPaceDef.nameFr |
| 303 | literal | code | Rider | Cycliste |
| 358 | template | code | ${distanceKm.toFixed(1)} km ${purposeDef.name.toLowerCase()} ride with ${chosenBike.name}. Pace: ${speedKmH} km/h (${pac | Sortie ${purposeDef.nameFr} de ${distanceKm.toFixed(1)} km avec ${chosenBike.nameFr}. Allure : ${speedKmH} km/h (${paceL |
| 415 | literal | code | en | fr |
| 446 | literal | code | Commute | Vélotaf |
| 451 | literal | code | Exemplary 6.0 km commute in Nantes with pre-fetched route telemetry and live weather. | Trajet vélotaf exemplaire de 6.0 km à Nantes avec données pré-chargées et météo en direct. |
| 502 | literal | code | en | fr |
| 539 | literal | jsx-attribute:aria-label | Cadence Onboarding Wizard | Assistant d’accueil Cadence |
| 761 | literal | jsx-text | No profile. No signup. Just a ride. | Sans profil. Sans inscription. Juste votre sortie. |
| 770 | literal | jsx-text | Try an example | Explorer l’exemple |
| 778 | literal | jsx-text | Start planning | Commencer |
| 794 | literal | jsx-text | Welcome | Accueil |
| 797 | literal | jsx-text | You can change this later. | Vous pourrez modifier cela plus tard. |
| 805 | literal | jsx-text | Continue to route | Continuer vers le parcours |
| 820 | literal | jsx-text | Back | Retour |
| 823 | template | jsx-text | Route · ${distanceKm.toFixed(1)} km | Parcours · ${distanceKm.toFixed(1)} km |
| 831 | literal | jsx-text | Use this route | Utiliser cet itinéraire |
| 846 | literal | jsx-text | Back | Retour |
| 850 | template | jsx-text | Calculated departure: ${leaveTimeFormatted} | Départ calculé : ${leaveTimeFormatted} |
| 853 | template | jsx-text | Calculated arrival: ${arriveTimeFormatted} | Arrivée calculée : ${arriveTimeFormatted} |
| 863 | literal | jsx-text | Continue to rider & bike | Continuer vers le vélo |
| 878 | literal | jsx-text | Back | Retour |
| 881 | literal | jsx-text | Optional · editable any time | Optionnel · modifiable à tout moment |
| 890 | literal | jsx-text | Skip | Passer |
| 898 | literal | jsx-text | View preview | Voir l’aperçu |
| 914 | literal | jsx-text | Edit setup | Modifier la config |
| 917 | literal | jsx-text | Your ride is ready · no signup required | Votre sortie est prête · aucune inscription requise |
| 926 | literal | jsx-text | View ride plan | Ouvrir le plan |
| 934 | literal | jsx-text | Save & sync | Enregistrer & synchroniser |
| 950 | literal | jsx-text | Back to ride preview | Retour à l’aperçu |
| 953 | literal | jsx-text | No account required to use your ride plan | Aucun compte requis pour utiliser votre plan de route |
| 961 | literal | jsx-text | Continue without account | Continuer sans compte |

#### `src/components/ShareTelemetryModal.tsx` (20 translatable / 20 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 206 | literal | code | Failed to render telemetry card. | Erreur lors du rendu du ticket. |
| 390 | literal | jsx-text | Could not render card | Impossible de générer la carte |
| 399 | literal | jsx-attribute:alt | Ride summary card preview | Aperçu de la carte à partager |
| 426 | literal | jsx-attribute:title | Open full-resolution card in a new tab | Ouvrir l’image en pleine résolution |
| 427 | literal | jsx-attribute:aria-label | Open full-resolution card in a new tab | Ouvrir l’image en pleine résolution |
| 437 | literal | jsx-text | Warm-stone ride summary card | Carte de sortie sur fond pierre chaude |
| 440 | literal | jsx-text | Transparent overlay for ride photos | Version transparente à superposer sur photo |
| 451 | literal | jsx-text | Card style | Style de la carte |
| 520 | literal | jsx-text | Included summary | Résumé inclus |
| 523 | literal | jsx-text | Ride | Sortie |
| 530 | literal | jsx-text | Distance | Distance |
| 539 | literal | jsx-text | Elevation | Dénivelé |
| 548 | literal | jsx-text | Avg power | Puissance moy. |
| 559 | literal | jsx-text | Wind impact | Effet du vent |
| 574 | literal | jsx-text | Air density | Densité de l’air |
| 583 | literal | jsx-text | Carbs | Glucides |
| 592 | literal | jsx-text | Total work | Travail total |
| 668 | literal | code | Copy Group Plan Link: | Copiez le lien du plan : |
| 685 | literal | jsx-text | Group plan link copied! | Lien du plan groupe copié ! |
| 692 | template | jsx-text | Copy Group Plan Link (${trip.pinnedAmenities?.length \|\| 0} stops · Leave ${leaveByHHMM \|\| trip.departureTime \|\| '0 | Copier le lien du plan (${trip.pinnedAmenities?.length \|\| 0} arrêts · Départ ${leaveByHHMM \|\| trip.departureTime \|\ |

### components/auth (8 translatable / 8 total across 2 files)

#### `src/components/auth/AuthModal.tsx` (4 translatable / 4 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 161 | literal | jsx-attribute:aria-label | Close | Fermer |
| 178 | literal | jsx-text | Encrypted ride sync | Sauvegarde & synchronisation |
| 326 | literal | jsx-attribute:aria-label | Hide password | Masquer |
| 326 | literal | jsx-attribute:aria-label | Show password | Afficher |

#### `src/components/auth/ResetPasswordModal.tsx` (4 translatable / 4 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 86 | literal | jsx-attribute:aria-label | Close | Fermer |
| 103 | literal | jsx-text | Account recovery | Récupération du compte |
| 150 | literal | jsx-attribute:aria-label | Hide password | Masquer |
| 150 | literal | jsx-attribute:aria-label | Show password | Afficher |

### components/common (43 translatable / 43 total across 3 files)

#### `src/components/common/ConfirmModal.tsx` (4 translatable / 4 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 40 | literal | code | Got it | Compris |
| 40 | literal | code | Confirm | Confirmer |
| 41 | literal | code | Cancel | Annuler |
| 67 | literal | jsx-attribute:aria-label | Close | Fermer |

#### `src/components/common/ElevationTerrainStrip.tsx` (13 translatable / 13 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 94 | literal | code | Alpine / Steep | Montagne / Exigeant |
| 96 | literal | code | Challenging | Sportif / Vallonné |
| 98 | literal | code | Moderate | Modéré & Accessible |
| 100 | literal | code | Easy & Smooth | Facile & Roulant |
| 106 | literal | code | Gravel & Trail | Chemins & Gravel |
| 107 | literal | code | Mixed Paved & Gravel | Mixte Bitume & Gravel |
| 108 | literal | code | Paved Road | Asphalte / Route |
| 218 | literal | jsx-text | Estimated D+ | D+ estimé |
| 238 | template | jsx-text | True elevation extracted from your GPX trace (+${elevGain} m D+ · max ${terrainSummary.maxGradePct}% grade) | Profil réel extrait de votre trace GPX (+${elevGain} m D+ · pente max ${terrainSummary.maxGradePct}%) |
| 242 | template | jsx-text | Real DEM elevation profile (+${elevGain} m D+ · max ${terrainSummary.maxGradePct}% grade) | Profil altimétrique réel DEM (+${elevGain} m D+ · pente max ${terrainSummary.maxGradePct}%) |
| 245 | template | jsx-text | Estimated curve from synthetic D+ (+${elevGain} m) — compute a Corridor route or upload a .GPX for exact elevation | Courbe estimée depuis un D+ synthétique (+${elevGain} m) — tracez un corridor ou importez un .GPX pour le relief réel |
| 291 | expression | jsx-text | hoveredSurfaceMeta.labelEn | hoveredSurfaceMeta.labelFr |
| 404 | literal | jsx-text | Peak slope | Pente max |

#### `src/components/common/SurfaceProfileBar.tsx` (26 translatable / 26 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 56 | expression | code | v.toFixed(d) | v.toFixed(d).replace('.', ',') |
| 57 | template | code | ${v}% | ${v} % |
| 59 | literal | code | Tubes | Chambre |
| 78 | literal | code | A perfect match for this route. | Parfait pour ce parcours. |
| 82 | literal | code | Will cope — take care on technical sectors. | Passe partout — prudence sur les secteurs techniques. |
| 85 | literal | code | Too technical in places — consider going wider. | Secteurs trop techniques — envisagez des pneus plus larges. |
| 101 | literal | jsx-text | Your tires | Vos pneus |
| 111 | literal | jsx-text | fit | adapté |
| 135 | expression | jsx-attribute:title | seg.nameEn | seg.nameFr |
| 136 | expression | jsx-attribute:aria-label | meta.shortLabelEn | meta.shortLabelFr |
| 147 | literal | jsx-text | Tap a sector | Touchez un secteur |
| 170 | expression | jsx-text | meta.shortLabelEn | meta.shortLabelFr |
| 188 | literal | jsx-text | Sector | Secteur |
| 191 | expression | jsx-text | highlighted.nameEn | highlighted.nameFr |
| 207 | literal | jsx-text | Ideal | Idéal |
| 211 | literal | jsx-text | Capable | Adapté |
| 214 | literal | jsx-text | Technical | Technique |
| 222 | expression | jsx-text | highlighted.surfaceDetailEn | highlighted.surfaceDetailFr |
| 224 | expression | jsx-text | highlighted.riderNoteEn | highlighted.riderNoteFr |
| 230 | literal | jsx-text | Pressure F/R | Pression AV/AR |
| 235 | literal | jsx-text | Max grade | Pente max |
| 254 | literal | jsx-text | Checking road surfaces… | Analyse des routes… |
| 260 | literal | jsx-text | Verified map | Carte vérifiée |
| 267 | literal | jsx-text | Estimated surface mix (heuristic fallback) | Mix de surface estimé (modèle heuristique) |
| 277 | literal | jsx-attribute:title | Refresh road surface details | Actualiser les surfaces de la carte |
| 280 | literal | jsx-text | Refresh | Actualiser |

### components/configurator (170 translatable / 170 total across 5 files)

#### `src/components/configurator/ConfiguratorScreen.tsx` (97 translatable / 97 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 519 | literal | code | Today | Aujourd’hui |
| 521 | literal | code | Tomorrow | Demain |
| 523 | template | code | In ${daysOffset} days | Dans ${daysOffset} jours |
| 524 | template | code | ${Math.abs(daysOffset)} days ago | Passé (${Math.abs(daysOffset)} j) |
| 539 | literal | code | Please enter a valid destination for corridor routing. | Veuillez saisir une destination valide pour le corridor. |
| 584 | template | code | ${effectiveOrigin.split(',')[0].trim()} → ${effectiveDest.split(',')[0].trim()}${viaSummary} Tour | ${effectiveOrigin.split(',')[0].trim()} → ${effectiveDest.split(',')[0].trim()}${viaSummary} |
| 608 | template | code | ${dayCount} Days | ${dayCount} Jours |
| 847 | template | code | ${loopKm} km loop radius | Rayon boucle ${loopKm} km |
| 854 | template | code | ${originShort} · ${clampedKm} km Loop | ${originShort} · Boucle de ${clampedKm} km |
| 857 | template | code | ${clampedKm.toFixed(1)} km loop ride starting from ${originShort}. | Sortie de ${clampedKm.toFixed(1)} km en boucle au départ de ${originShort}. |
| 945 | literal | code | Invalid route file (.gpx / .tcx / .fit). | Fichier de trace invalide (.gpx / .tcx / .fit). |
| 962 | expression | code | outcome.guidanceEn | outcome.guidanceFr |
| 963 | literal | code | Could not import this route link. | Impossible d’importer ce lien. |
| 967 | literal | code | Could not import this route link. | Impossible d’importer ce lien. |
| 1051 | literal | code | Main Office | Bureau · Accueil |
| 1052 | literal | code | Hotel Check-in / Stage Lodging | Réception Hôtel / Étape |
| 1053 | literal | code | Camp / Bivouac Site | Zone de Bivouac / Camp |
| 1054 | literal | code | Finish Line / Clubhouse | Ligne d’arrivée / Club |
| 1103 | literal | code | Touring stage paced for hotel check-in, balanced panniers, and evening recovery. | Étape cyclotourisme avec check-in hôtel, sacoches équilibrées et récupération. |
| 1106 | literal | code | Self-supported bikepacking expedition calibrated for saddlebag load and dusk camp. | Expédition autonome calibrée pour bivouac, sacoches et gestion hydrique. |
| 1109 | literal | code | Training ride tuned for power pacing, wind resistance, and fueling. | Sortie sportive rythmée avec cibles de puissance, vent et ravitaillement. |
| 1210 | template | code | ${originShort} · ${dist} km Loop | ${originShort} · Boucle de ${dist} km |
| 1215 | template | code | ${prev.stages.length} days | ${prev.stages.length} jours |
| 1219 | template | code | ${originShort} → ${destShort} Tour | ${originShort} → ${destShort} |
| 1479 | literal | code | Route & Map | Itinéraire & Carte |
| 1484 | literal | code | Date & Time | Date & Heure |
| 1489 | literal | code | Style & Stops | Style & Arrêts |
| 1494 | literal | code | Pace & Physics | Allure & Physique |
| 1501 | literal | code | Route & map | Itinéraire & carte |
| 1505 | literal | code | Date, time & weather | Date, heure & météo |
| 1509 | literal | code | Style & stops | Style & arrêts |
| 1512 | literal | code | Pace & physics | Allure & physique |
| 1548 | literal | jsx-attribute:title | Click to rename ride | Renommer la sortie |
| 1561 | literal | jsx-text | Revert | Rétablir |
| 1568 | literal | jsx-text | Auto-saved | Enregistré auto |
| 1580 | literal | jsx-attribute:aria-label | Configuration steps | Étapes de configuration |
| 1643 | literal | jsx-text | Route generator | Générateur d’itinéraire |
| 1759 | template | jsx-text | ${t('tripFormatHeading')}: | ${t('tripFormatHeading')} : |
| 1798 | literal | jsx-text | Edit stage cuts (Slicer) | Ajuster les coupures (Slicer) |
| 1801 | literal | jsx-text | Slice trace into days | Découper la trace en jours |
| 2038 | literal | jsx-attribute:placeholder | Start location (e.g. Saint-Raphaël, Nice...) | Point de départ (ex. Saint-Raphaël, Nice, Nantes...) |
| 2176 | literal | jsx-attribute:placeholder | Destination (e.g. Sainte-Maxime, Hyères...) | Point d’arrivée (ex. Sainte-Maxime, Hyères, Saint-Nazaire...) |
| 2254 | literal | jsx-attribute:placeholder | e.g. Nantes, Clisson, Pornic... | ex. Nantes, Clisson, Pornic... |
| 2367 | literal | jsx-text | Supports .GPX, .TCX & Garmin .FIT (or drag & drop) | Supporte .GPX, .TCX et Garmin .FIT (ou glissez-déposez) |
| 2386 | literal | jsx-attribute:placeholder | Paste Komoot, Bikemap, RideWithGPS or .GPX/.TCX/.FIT link... | Coller un lien Komoot, Bikemap, RideWithGPS ou .GPX/.TCX/.FIT... |
| 2403 | literal | jsx-text | Import | Importer |
| 2429 | literal | jsx-text | Active route: | Itinéraire actif : |
| 2440 | literal | jsx-text |  · Map radius circle |  · Rayon boucle sur carte |
| 2444 | literal | jsx-text |  · Optimized cycling trace |  · Tracé GPS optimisé |
| 2526 | literal | jsx-text | Schedule & timing buffers | Date, heure & marges |
| 2529 | literal | jsx-text | Choose departure or arrival planning, ride date, and preparation buffers | Définissez votre sens de calcul horaire, la date et vos marges de préparation |
| 2569 | literal | jsx-attribute:locale | en-US | fr-FR |
| 2608 | literal | jsx-text | Route & prep buffers | Marges de trajet & préparation |
| 2719 | literal | jsx-text | Temperature | Température |
| 2727 | literal | jsx-text | Wind speed | Vent prévu |
| 2735 | literal | jsx-text | Rain chance | Pluie |
| 2837 | literal | jsx-text | Syncs forecast wind and temperature at your route midpoint for the scheduled ride window. | Synchronise le vent et la température au point médian de l’itinéraire pour l’heure prévue. |
| 2914 | literal | jsx-text | Suggested ride options | Options suggérées |
| 2938 | expression | jsx-attribute:label | chip.labelEn | chip.labelFr |
| 2943 | expression | jsx-attribute:title | chip.descriptionEn | chip.descriptionFr |
| 2957 | literal | jsx-text | Fewer options | Moins d’options |
| 2958 | template | jsx-text | More ride options (+${hiddenCount}) | Plus d’options (+${hiddenCount}) |
| 2984 | template | jsx-text | ${activeChipDefs.length} active rule${activeChipDefs.length > 1 ? 's' : ''} | ${activeChipDefs.length} règle${activeChipDefs.length > 1 ? 's' : ''} active${activeChipDefs.length > 1 ? 's' : ''} |
| 2987 | literal | jsx-text | Standard | Standard |
| 2993 | template | jsx-text | Schedule timings and operational constraints calibrated for ${trip.tag \|\| activeArchetypeMode} mode | Paramètres horaires et contraintes opérationnelles calibrés pour le mode ${trip.tag \|\| activeArchetypeMode} |
| 3063 | literal | jsx-attribute:value | Workplace entrance | Entrée du site |
| 3118 | literal | jsx-attribute:label | Camp pitch curfew | Couvre-feu camp / bivouac |
| 3126 | literal | jsx-text | Camp setup & bag prep (min) | Préparation camp & sacoches (min) |
| 3137 | literal | jsx-text | Bivouac destination / zone | Point de bivouac cible |
| 3141 | literal | jsx-attribute:value | Camp / Bivouac Site | Zone de Bivouac / Camp |
| 3153 | literal | jsx-attribute:label | Stage finish cutoff target | Arrivée d’étape / Barrière horaire |
| 3161 | literal | jsx-text | Progressive warmup spin (min) | Échauffement progressif (min) |
| 3172 | literal | jsx-text | Finish Line / Clubhouse | Ligne d’arrivée / Club |
| 3188 | literal | jsx-attribute:label | Hotel Check-in cutoff | Heure limite Check-in Hôtel |
| 3196 | literal | jsx-text | Hotel Check-in, luggage & charging (min) | Check-in hôtel, bagages & recharge (min) |
| 3207 | literal | jsx-text | Destination hotel / B&B | Hôtel / Hébergement d’arrivée |
| 3211 | literal | jsx-attribute:value | Hotel Check-in / Stage Lodging | Réception Hôtel / Étape |
| 3275 | literal | jsx-text | Fuel & Packing Logistics | Logistique nutrition & sacoches |
| 3279 | literal | jsx-text | Fasted start | Départ à jeun |
| 3283 | literal | jsx-text | Light / liquid | Léger / liquide |
| 3286 | literal | jsx-text | Full breakfast | Petit-déjeuner complet |
| 3292 | literal | jsx-text | Pre-ride meal style and fueling logistics | Style de repas pré-sortie et préférences d’alimentation |
| 3341 | expression | jsx-text | opt.labelEn | opt.labelFr |
| 3344 | expression | jsx-text | opt.descEn | opt.descFr |
| 3357 | literal | jsx-text | Fridge at destination | Frigo à l’arrivée |
| 3360 | literal | jsx-text | Tailors recovery snacks (chilled vs packable) | Adapte la collation d’arrivée (frais vs sacoche) |
| 3382 | literal | jsx-text | Yes | Oui |
| 3385 | literal | jsx-text | No | Non |
| 3394 | literal | jsx-text | Fuel preference | Style de ravitaillement |
| 3420 | expression | jsx-text | pref.en | pref.fr |
| 3462 | literal | jsx-text | Live ride summary | Aperçu en direct |
| 3488 | literal | jsx-text | Scheduled departure | Départ programmé |
| 3563 | literal | jsx-text | Pace & Effort | Allure & Effort estimé |
| 3566 | literal | jsx-text | Steady endurance | Endurance fluide |
| 3567 | literal | jsx-text | Brisk effort | Rythme soutenu |
| 3579 | template | jsx-text | Headwind · +${physicsResult.windDelayMinutes} min | Vent de face · +${physicsResult.windDelayMinutes} min |
| 3580 | literal | jsx-text | Moderate wind | Vent modéré |

#### `src/components/configurator/InteractiveRouteMap.tsx` (25 translatable / 25 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 182 | literal | code | en | fr |
| 269 | expression | code | seg.nameEn | seg.nameFr |
| 270 | expression | code | meta.labelEn | meta.labelFr |
| 325 | literal | code | Start | Départ |
| 332 | literal | code | Origin (A) | Point de départ (A) |
| 341 | template | code | Stop ${idx + 1} | Arrêt ${idx + 1} |
| 386 | literal | code | Remove stop | Supprimer cet arrêt |
| 409 | literal | code | Finish | Arrivée |
| 416 | literal | code | Finish (B) | Destination (B) |
| 566 | literal | jsx-text | Resolving via-point… | Localisation du point de passage… |
| 574 | literal | jsx-text | Tap map to add stop | Touchez pour un arrêt |
| 588 | literal | jsx-attribute:title | Fit route bounds | Recentrer sur l’itinéraire |
| 591 | literal | jsx-text | Recenter | Recentrer |
| 600 | literal | jsx-attribute:title | Exit fullscreen (Esc) | Quitter le plein écran (Échap) |
| 603 | literal | jsx-attribute:title | Fullscreen | Plein écran |
| 609 | literal | jsx-attribute:aria-label | Exit fullscreen | Quitter le plein écran |
| 612 | literal | jsx-attribute:aria-label | Fullscreen | Plein écran |
| 620 | literal | jsx-text | Exit | Réduire |
| 625 | literal | jsx-text | Fullscreen | Plein écran |
| 637 | literal | jsx-text | Paved | Bitume |
| 649 | literal | jsx-text | Trail | Sentier |
| 664 | literal | jsx-text | Sync… | Analyse… |
| 666 | literal | jsx-text | Map | Carte |
| 667 | literal | jsx-text | Est. | Est. |
| 679 | literal | jsx-text | Recomputing cycling route… | Recalcul de l’itinéraire cyclable… |

#### `src/components/configurator/ParameterTabs.tsx` (22 translatable / 22 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 148 | literal | code | Bike & weight | Vélo & poids |
| 149 | literal | code | Pace & distance | Allure & distance |
| 179 | literal | jsx-text | Target speed or steady effort to estimate your riding time | Vitesse cible ou effort régulier pour estimer votre durée de trajet |
| 232 | literal | jsx-text | Total ride weight | Poids total en route |
| 235 | template | jsx-text | Rider ${trip.physics.riderWeightKg} kg + Bike ${trip.physics.bikeWeightKg} kg + Gear ${trip.physics.gearWeightKg} kg | Cycliste ${trip.physics.riderWeightKg} kg + Vélo ${trip.physics.bikeWeightKg} kg + Bagages ${trip.physics.gearWeightKg}  |
| 250 | literal | jsx-text | Your weight (kg) | Votre poids (kg) |
| 265 | literal | jsx-text | Bike weight (kg) | Poids du vélo (kg) |
| 280 | literal | jsx-text | Bags & gear (kg) | Bagages & équipement (kg) |
| 303 | expression | jsx-text | preset.en | preset.fr |
| 316 | literal | jsx-text | Custom | Perso |
| 343 | literal | jsx-text | Advanced aero & tire tuning | Réglages aéro & pneus avancés |
| 481 | literal | jsx-text | 0.95 clean chain | 0.95 chaîne propre |
| 497 | literal | jsx-text | 0.21 human gross eff | 0.21 rendement humain brut |
| 503 | literal | jsx-text | Air density ρ (kg/m³) | Densité de l’air ρ (kg/m³) |
| 523 | literal | jsx-text | 1.225 standard (15 °C) | 1.225 standard (15 °C) |
| 615 | literal | jsx-text | Target effort (Watts / % FTP) | Effort cible (Watts / % FTP) |
| 647 | literal | jsx-attribute:aria-label | Target pacing (% FTP) | Allure cible (% FTP) |
| 654 | literal | jsx-text | Target speed (km/h) | Vitesse cible (km/h) |
| 699 | literal | jsx-text | Wind speed (km/h) | Vitesse du vent (km/h) |
| 717 | literal | jsx-text | Temperature (°C) | Température (°C) |
| 733 | literal | jsx-text | Rain chance (%) | Risque de pluie (%) |
| 751 | literal | jsx-text | Visibility (km) | Visibilité (km) |

#### `src/components/configurator/PresetRuleCard.tsx` (18 translatable / 18 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 202 | expression | code | field.labelEn | field.labelFr |
| 282 | template | jsx-attribute:incLabel | Increase ${label} | Augmenter : ${label} |
| 283 | template | jsx-attribute:decLabel | Decrease ${label} | Diminuer : ${label} |
| 310 | expression | code | field.labelEn | field.labelFr |
| 331 | template | jsx-attribute:incLabel | +15 min (${label}) | +15 min (${label}) |
| 332 | template | jsx-attribute:decLabel | -15 min (${label}) | -15 min (${label}) |
| 354 | expression | code | field.labelEn | field.labelFr |
| 378 | expression | jsx-text | opt.labelEn | opt.labelFr |
| 399 | template | jsx-attribute:incLabel | Next ${label} | Option suivante : ${label} |
| 400 | template | jsx-attribute:decLabel | Previous ${label} | Option précédente : ${label} |
| 428 | expression | code | field.labelEn | field.labelFr |
| 430 | literal | code | Active | Appliqué |
| 433 | literal | code | Advisory | Facultatif |
| 499 | expression | code | field.labelEn | field.labelFr |
| 518 | template | jsx-attribute:aria-label | Edit ${label} | Modifier : ${label} |
| 574 | expression | jsx-text | def.labelEn | def.labelFr |
| 580 | expression | jsx-text | def.ruleTitleEn | def.ruleTitleFr |
| 583 | expression | jsx-text | def.ruleDescriptionEn | def.ruleDescriptionFr |

#### `src/components/configurator/TourOverviewCard.tsx` (8 translatable / 8 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 42 | literal | code | en-US | fr-FR |
| 112 | literal | jsx-text | Edit cuts | Ajuster les étapes |
| 200 | literal | jsx-attribute:title | Off-bike recovery window | Temps hors vélo entre deux étapes |
| 202 | template | jsx-attribute:content | Time between your estimated Day ${prevStage.dayNumber} arrival (${prevStage.estimatedArrivalTime}) and Day ${st.dayNumbe | Calculé entre votre arrivée estimée du Jour ${prevStage.dayNumber} (${prevStage.estimatedArrivalTime}) et le départ du J |
| 287 | literal | jsx-attribute:title | Estimated cumulative effort | Effort cumulé estimé |
| 289 | template | jsx-attribute:content | Estimated from cumulative riding hours (${st.movingTimeFormatted} today, ${st.cumulativeDistanceKm} km total), climbing  | Estimé à partir du temps de selle cumulé (${st.movingTimeFormatted} ce jour, ${st.cumulativeDistanceKm} km au total), du |
| 302 | template | jsx-attribute:title | Download Day ${st.dayNumber} (.gpx) | Télécharger Jour ${st.dayNumber} (.gpx) |
| 307 | template | jsx-attribute:aria-label | Download Day ${st.dayNumber} GPX | Télécharger Jour ${st.dayNumber} en GPX |

### components/dashboard (641 translatable / 641 total across 16 files)

#### `src/components/dashboard/AtmosphereCard.tsx` (41 translatable / 41 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 204 | literal | code | en | fr |
| 235 | template | code | This wind adds ~+${windInsight.ghostElevationM} m of invisible climbing (${windScale ?? `+${windInsight.equivalentGradeP | Ce vent ajoute ~+${windInsight.ghostElevationM} m de montée invisible (${windScale ?? `pente +${windInsight.equivalentGr |
| 239 | template | code | Tailwind today: feels like ${Math.abs(windInsight.ghostElevationM)} m of free downhill${windScale ? ` (${windScale})` :  | Vent de dos aujourd’hui : l’équivalent de ${Math.abs(windInsight.ghostElevationM)} m de descente gratuite${windScale ? ` |
| 281 | literal | code | en-US | fr-FR |
| 560 | literal | jsx-text | Simulated baseline — tap Sync | Base simulée — appuyer sur Actualiser |
| 576 | literal | jsx-text | Syncing forecast… | Synchronisation météo… |
| 579 | literal | jsx-text | Simulated baseline — tap Sync | Base simulée — appuyer sur Actualiser |
| 811 | template | jsx-attribute:headline | Between the hills and this breeze, your legs will feel ${totalFeltElevationM} m of climbing${feltScale ? ` (${feltScale} | Entre le relief et ce vent, tes jambes sentiront ${totalFeltElevationM} m de montée${feltScale ? ` (${feltScale})` : ''} |
| 814 | template | jsx-attribute:headline | This tailwind takes ${Math.abs(windInsight.ghostElevationM)} m of climbing off your legs${windScale ? ` (${windScale})`  | Le vent de dos t’enlève ${Math.abs(windInsight.ghostElevationM)} m de montée dans les jambes${windScale ? ` (${windScale |
| 820 | template | jsx-attribute:detail | Real road: +${realElevationM} m · wind adds +${windInsight.ghostElevationM} m${windScale ? ` (${windScale})` : ''} · +${ | Vrai relief : +${realElevationM} m · le vent ajoute +${windInsight.ghostElevationM} m${windScale ? ` (${windScale})` : ' |
| 823 | template | jsx-attribute:detail | About ${Math.abs(windInsight.timeDeltaMin)} min faster at the same effort across ${Math.round(trip.route?.distanceKm \|\ | Environ ${Math.abs(windInsight.timeDeltaMin)} min gagnées à effort égal sur tes ${Math.round(trip.route?.distanceKm \|\| |
| 836 | literal | jsx-text | The Invisible Hill on this ride | L’effet côte invisible sur ce parcours |
| 839 | literal | jsx-text | Free tailwind boost on this ride | Coup de pouce du vent de dos |
| 850 | literal | jsx-text | invisible grade | de pente fantôme |
| 853 | literal | jsx-text | free downhill feel | de descente gratuite |
| 871 | template | jsx-text | Total felt climbing: ${totalFeltElevationM} m (${feltScale ?? windScale}). | Effort total ressenti : ${totalFeltElevationM} m de dénivelé (${feltScale ?? windScale}). |
| 874 | template | jsx-text | This tailwind erases ${Math.abs(windInsight.ghostElevationM)} m of climbing (${windScale}). | Le vent t’efface ${Math.abs(windInsight.ghostElevationM)} m de montée (${windScale}). |
| 883 | template | jsx-text | Real road: ${realElevationM} m + wind: +${windInsight.ghostElevationM} m${windScale ? ` (${windScale})` : ''} | Vrai relief : ${realElevationM} m + vent : +${windInsight.ghostElevationM} m${windScale ? ` (${windScale})` : ''} |
| 886 | template | jsx-text | Feels like ${Math.abs(windInsight.ghostElevationM)} m of free downhill across ${Math.round(trip.route?.distanceKm \|\| 0 | L’équivalent de ${Math.abs(windInsight.ghostElevationM)} m de descente gratuite sur tes ${Math.round(trip.route?.distanc |
| 893 | template | jsx-text | ~+${windInsight.timeDeltaMin} min at the same effort | ~+${windInsight.timeDeltaMin} min à effort égal |
| 897 | template | jsx-text | ~${Math.abs(windInsight.timeDeltaMin)} min faster at the same effort | ~${Math.abs(windInsight.timeDeltaMin)} min gagnées à effort égal |
| 914 | literal | jsx-text | Temperature | Température |
| 953 | literal | jsx-text | Wind by route section | Vent par secteur sur le parcours |
| 969 | literal | code | clockwise | sens horaire |
| 973 | literal | code | anticlockwise | sens antihoraire |
| 976 | literal | code | as planned | sens actuel |
| 981 | literal | code | anticlockwise | sens antihoraire |
| 985 | literal | code | clockwise | sens horaire |
| 988 | literal | code | reversed | sens inversé |
| 992 | template | code | Ride ${revLabel} saves ${cmp.minutesSaved} min · ${cmp.wattsSaved} W | Inverser (${revLabel}) économise ${cmp.minutesSaved} min · ${cmp.wattsSaved} W |
| 997 | template | code | ${fwdLabel} optimal (saves ${cmp.minutesSaved} min · ${cmp.wattsSaved} W) | ${fwdLabel} optimal (+${cmp.minutesSaved} min · ${cmp.wattsSaved} W gagnés) |
| 1001 | literal | code | Balanced loop direction | Boucle équilibrée (vent neutre) |
| 1027 | template | jsx-text | Head +${Math.round(sec.effectiveHeadwindKmH)} km/h | Face +${Math.round(sec.effectiveHeadwindKmH)} km/h |
| 1031 | template | jsx-text | Tail ${Math.round(Math.abs(sec.effectiveHeadwindKmH))} km/h | Dos ${Math.round(Math.abs(sec.effectiveHeadwindKmH))} km/h |
| 1207 | expression | jsx-text | visibilityAnalysis.lightingGear.beamModeEn.split('(')[0].trim() | visibilityAnalysis.lightingGear.beamModeFr.split('(')[0].trim() |
| 1247 | expression | jsx-text | visibilityAnalysis.weatherDescEn | visibilityAnalysis.weatherDescFr |
| 1273 | expression | jsx-text | visibilityAnalysis.summaryRecommendationEn | visibilityAnalysis.summaryRecommendationFr |
| 1290 | literal | jsx-text | Black ice alert | Alerte verglas |
| 1297 | expression | jsx-text | visibilityAnalysis.surfaceCaution.messageEn | visibilityAnalysis.surfaceCaution.messageFr |
| 1320 | literal | jsx-text | Battery -30% | Batterie -30% |
| 1324 | expression | jsx-text | visibilityAnalysis.lightingGear.batteryNoticeEn | visibilityAnalysis.lightingGear.batteryNoticeFr |

#### `src/components/dashboard/BentoDashboard.tsx` (24 translatable / 24 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 359 | template | code | Could not parse GPX file: ${(err as Error).message} | Impossible de lire ce fichier GPX : ${(err as Error).message} |
| 654 | template | code | ${count} dry gap${count > 1 ? 's' : ''} | ${count} zone${count > 1 ? 's' : ''} sèche${count > 1 ? 's' : ''} |
| 663 | template | code | ${count} dry gap${count > 1 ? 's' : ''} | ${count} zone${count > 1 ? 's' : ''} sèche${count > 1 ? 's' : ''} |
| 696 | literal | code | Partner | Partenaire |
| 715 | literal | code | en | fr |
| 754 | literal | code | Copy tour link: | Copiez le lien du tour : |
| 777 | literal | jsx-attribute:lang | en | fr |
| 819 | template | jsx-text | ${Math.round(trip.route.distanceKm)} km single-day track detected | Trace longue de ${Math.round(trip.route.distanceKm)} km sur 1 seul jour |
| 824 | literal | jsx-text | Slice your Komoot / GPX trace into balanced daily stages with overnight stops & per-day GPX. | Découpez votre trace Komoot / GPX en étapes équilibrées avec bivouacs et GPX par jour. |
| 843 | literal | jsx-text | d | j |
| 854 | literal | jsx-text | Open Slicer | Découper |
| 858 | literal | jsx-attribute:aria-label | Dismiss | Masquer |
| 881 | template | jsx-text | Tour · ${expeditionTotals.totalDays} days · ${expeditionTotals.totalDistanceKm} km | Tour · ${expeditionTotals.totalDays} jours · ${expeditionTotals.totalDistanceKm} km |
| 975 | literal | jsx-text | Copied! | Lien copié ! |
| 979 | literal | jsx-text | Creating… | Création… |
| 982 | literal | jsx-text | Share | Partager |
| 995 | literal | jsx-text | Edit cuts | Coupes |
| 1103 | literal | jsx-attribute:lang | en | fr |
| 1125 | literal | jsx-attribute:aria-label | Ride plan sections | Sections détaillées du plan |
| 1131 | literal | jsx-text | Schedule & Checklist | Horaires & Check-list |
| 1132 | literal | jsx-text | Fuel & Resupply | Nutrition & Ravito |
| 1133 | literal | jsx-text | Weather & Effort | Météo & Effort |
| 1305 | literal | jsx-attribute:title | Could not export route | Impossible d’exporter le tracé |
| 1307 | literal | jsx-attribute:confirmLabel | OK | Compris |

#### `src/components/dashboard/DashboardEmptyState.tsx` (10 translatable / 10 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 34 | literal | jsx-text | No rides planned yet | Aucune sortie planifiée |
| 37 | literal | jsx-text | Your Cadence planner is ready. Set up your first ride with live weather, calm arrival timing, and simple fueling, or exp | Votre espace Cadence est prêt. Planifiez votre première sortie avec météo en direct, timing d’arrivée serein et ravitail |
| 48 | literal | jsx-text | Pace & Wind | Allure & Vent |
| 51 | literal | jsx-text | Realistic pace, elevation & wind impact along your route. | Estimation de l’allure, du relief et du vent sur le parcours. |
| 58 | literal | jsx-text | Reverse Timeline | Rétro-planning |
| 61 | literal | jsx-text | Exact departure time backward from your target. | Heure exacte de départ selon vos marges et préparatifs. |
| 68 | literal | jsx-text | Real-Food Fueling | Vrais aliments |
| 71 | literal | jsx-text | Real whole foods like dates, figs, and simple bars tailored to you. | Dattes, bananes, barres simples — adaptées à vos préférences. |
| 87 | literal | jsx-text | Create Your First Trip | Créer votre premier trajet |
| 97 | literal | jsx-text | Load Sample Trip (Demo) | Charger un trajet exemple (Démo) |

#### `src/components/dashboard/HeroRouteCard.tsx` (102 translatable / 102 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 311 | template | code | ${formatLabel} downloaded | ${formatLabel} téléchargé |
| 318 | template | code | ${formatLabel} export unavailable | Export ${formatLabel} indisponible |
| 603 | template | code | ${originShort} · ${clampedKm} km Loop | ${originShort} · Boucle de ${clampedKm} km |
| 621 | template | code | ${nextLoopKm} km loop radius | Rayon boucle ${nextLoopKm} km |
| 647 | literal | code | en-US | fr-FR |
| 734 | literal | code | Gravel & Trail | Chemins & Gravel |
| 738 | literal | code | Cycleway & Mixed | Voie verte & Bitume |
| 741 | literal | code | Paved Road | Asphalte / Route |
| 747 | literal | code | Alpine / Steep | Montagne / Exigeant |
| 751 | literal | code | Challenging | Sportif / Vallonné |
| 755 | literal | code | Moderate | Modéré |
| 758 | literal | code | Easy & Smooth | Facile & Roulant |
| 764 | literal | code | cutoff | bivouac |
| 765 | literal | code | shift | poste |
| 766 | literal | code | finish | arrivée |
| 767 | literal | code | hotel | hôtel |
| 960 | template | code | Ideal on ${surfaceBreakdown.suitability.tireWidthMm}c | Idéal en ${surfaceBreakdown.suitability.tireWidthMm}c |
| 964 | template | code | Capable on ${surfaceBreakdown.suitability.tireWidthMm}c | Adapté en ${surfaceBreakdown.suitability.tireWidthMm}c |
| 967 | template | code | Technical on ${surfaceBreakdown.suitability.tireWidthMm}c | Technique en ${surfaceBreakdown.suitability.tireWidthMm}c |
| 982 | expression | code | seg.nameEn | seg.nameFr |
| 986 | expression | code | meta.labelEn | meta.labelFr |
| 1313 | literal | code | Water Tap | Point d'eau |
| 1315 | literal | code | Cemetery | Cimetière |
| 1317 | literal | code | Food | Ravitaillement |
| 1319 | literal | code | Toilet / Med / Fuel | WC / Pharm. / Station |
| 1321 | literal | code | Train Bailout | Gare (Repli) |
| 1322 | literal | code | Bike Repair | Atelier vélo |
| 1372 | literal | code | On route | Sur la trace |
| 1375 | literal | code | detour | détour |
| 1381 | literal | code | Pinned | Épinglé |
| 1420 | literal | code | Easy cruise: effortless breathing, full conversation pace. | Allure balade : conversation fluide sans essoufflement. |
| 1424 | literal | code | Endurance tempo: steady pressure you can hold for hours. | Allure endurance : effort régulier soutenable plusieurs heures. |
| 1427 | literal | code | Punchy effort: deep breathing, strong muscular engagement. | Effort soutenu : respiration marquée, sollicitation musculaire élevée. |
| 1538 | literal | jsx-attribute:aria-label | Ride Mode | Mode Vélo |
| 1557 | literal | jsx-attribute:aria-label | Offline Ready | Hors ligne prêt |
| 1560 | literal | jsx-attribute:aria-label | Save Offline | Sauver hors ligne |
| 1566 | template | jsx-attribute:title | Offline pack saved (${offlinePack.amenitiesCount} stops, map & weather) | Pack hors ligne enregistré (${offlinePack.amenitiesCount} arrêts, carte & météo) |
| 1569 | literal | jsx-attribute:title | Save map, stops, surface & weather for zero-signal rides | Enregistrer carte, arrêts, surface et météo pour rouler sans réseau |
| 1594 | literal | jsx-attribute:aria-label | Export or send route | Exporter ou envoyer le parcours |
| 1595 | literal | jsx-attribute:title | Export or send route | Exporter ou envoyer le parcours |
| 1610 | literal | jsx-attribute:aria-label | Exit fullscreen | Quitter le plein écran |
| 1613 | literal | jsx-attribute:aria-label | Fullscreen map | Carte en plein écran |
| 1619 | literal | jsx-attribute:title | Exit fullscreen (Esc) | Quitter le plein écran (Échap) |
| 1622 | literal | jsx-attribute:title | Fullscreen map | Carte en plein écran |
| 1719 | template | code |  · ${pinnedStopCount} stop${pinnedStopCount > 1 ? 's' : ''} |  · ${pinnedStopCount} arrêt${pinnedStopCount > 1 ? 's' : ''} |
| 1739 | template | code | Course + climb & fueling alerts${stopSuffix} | Parcours + cols & alertes nutrition${stopSuffix} |
| 1742 | template | code | Binary course + Up Ahead cues${stopSuffix} | Parcours binaire + virages${stopSuffix} |
| 1766 | literal | code | GPS .GPX | GPS .GPX |
| 1767 | template | code | Universal GPS track & waypoints${stopSuffix} | Trace GPS universelle & repères${stopSuffix} |
| 1788 | literal | code | Training .TCX | Entraînement .TCX |
| 1789 | literal | code | Course with elevation, pace & power | Parcours avec dénivelé, allure & watts |
| 1821 | template | code | Send to ${hu.label} | Envoyer vers ${hu.label} |
| 1823 | template | code | Wireless .FIT course push to ${hu.label} | Synchroniser le .FIT sans fil vers ${hu.label} |
| 1826 | template | code | Connect ${hu.label} for 1-tap wireless push | Connecter ${hu.label} pour l'envoi en 1 clic |
| 1829 | literal | code | Push | Prêt |
| 1850 | template | code | Sent to ${hu.label} | Envoyé vers ${hu.label} |
| 1854 | template | code | ${hu.label} push failed (${res.reason \|\| 'error'}) | Échec ${hu.label} (${res.reason \|\| 'erreur'}) |
| 1870 | literal | code | Print A4 Ride Sheet | Imprimer feuille de route A4 |
| 1871 | literal | code | Printable A4 summary & cue sheet | Carnet de route et check-list imprimables |
| 1886 | literal | code | Share Group Link / Receipt | Partager lien groupe / Carte |
| 1887 | literal | code | Copy group plan URL + PNG ride card | Lien du plan groupe + carte story PNG |
| 1906 | literal | jsx-attribute:aria-label | Export and share options | Options d’export et partage |
| 1912 | literal | jsx-text | Export & send route | Exporter & envoyer le parcours |
| 1932 | literal | jsx-text | 100% Free — No Pro paywall | 100% Gratuit — Sans abonnement Pro |
| 1947 | literal | jsx-text | Nutrition & climb cues (.FIT) | Alertes nutrition & cols (.FIT) |
| 1968 | literal | jsx-text | Garmin / Wahoo: download .FIT below | Garmin / Wahoo : téléchargez le .FIT ci-dessous |
| 2098 | literal | jsx-text | Luggage load | Charge & sacoches |
| 2139 | expression | jsx-text | preset.en | preset.fr |
| 2147 | literal | jsx-text | Custom (kg) | Personnalisé (kg) |
| 2208 | literal | jsx-text | Ride type | Type de sortie |
| 2245 | expression | jsx-text | opt.en | opt.fr |
| 2274 | literal | jsx-text | Arrive mode | Mode Arrivée |
| 2277 | literal | jsx-text | Depart mode | Mode Départ |
| 2543 | literal | jsx-text | Edit multi-day stage cuts | Ajuster les étapes multi-jours |
| 2546 | literal | jsx-text | Split into multi-day stages | Découper en plusieurs jours |
| 2632 | literal | jsx-text | Saddle time (excl. pauses): | Temps en selle (hors pauses) : |
| 2636 | literal | jsx-text | Pause & buffer allowance: | Marge pauses & imprévus : |
| 2641 | literal | jsx-text | Total elapsed time: | Durée totale estimée : |
| 2706 | literal | jsx-attribute:aria-label | Target power (Watts) | Puissance cible (Watts) |
| 2712 | literal | jsx-text | % FTP Pacing | Allure % FTP |
| 2729 | literal | jsx-attribute:aria-label | Target pacing (% FTP) | Allure cible (% FTP) |
| 2852 | template | jsx-attribute:title | Saddle time: ${formatTimeHHMM(movingMinutes)} (excl. pauses) + ${bufferMinutes} min buffer = ${formatTimeHHMM(totalElaps | En selle : ${formatTimeHHMM(movingMinutes)} (hors pauses) + ${bufferMinutes} min pauses = ${formatTimeHHMM(totalElapsedM |
| 2879 | literal | jsx-text | Saddle time | Temps de selle |
| 2899 | literal | jsx-text | total | tot. |
| 2910 | nested | code | totalFuelUnits === 1 ? 'unit' : 'units' | totalFuelUnits === 1 ? 'unité' : 'unités' |
| 2917 | nested | code | fuelUnitsPerHr === 1 ? 'unit/h' : 'units/h' | fuelUnitsPerHr === 1 ? 'unité/h' : 'unités/h' |
| 2940 | literal | jsx-attribute:title | Open Fuel & Resupply | Ouvrir Nutrition & Ravito |
| 2948 | literal | jsx-text | Fuel Units | Unités Ravito |
| 2951 | literal | jsx-text | Fueling Rhythm | Rythme Ravito |
| 2964 | literal | jsx-text | Steady | Régulier |
| 2976 | literal | jsx-text | carbs | ravito |
| 2979 | literal | jsx-text | Water only needed | Eau seule suffit |
| 2983 | literal | jsx-text | Sip every 20 min | 1 gorgée / 20 min |
| 3007 | literal | jsx-attribute:title | Open Weather & Effort | Ouvrir Météo & Effort |
| 3037 | literal | jsx-text | paved | bitume |
| 3039 | literal | jsx-text | unpaved | gravel/sentier |
| 3054 | literal | jsx-attribute:aria-label | Zoom in | Zoomer |
| 3055 | literal | jsx-attribute:title | Zoom in | Zoomer |
| 3064 | literal | jsx-attribute:aria-label | Zoom out | Dézoomer |
| 3065 | literal | jsx-attribute:title | Zoom out | Dézoomer |
| 3081 | literal | jsx-attribute:aria-label | Fit route bounds | Recentrer sur l’itinéraire |
| 3082 | literal | jsx-attribute:title | Fit route bounds | Recentrer sur l’itinéraire |

#### `src/components/dashboard/NutritionBento.tsx` (147 translatable / 147 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 173 | literal | code | Real Food | Vrai Aliment |
| 177 | literal | code | Mixed Fuel | Mixte |
| 180 | literal | code | Gels & Iso | Gels & Iso |
| 192 | literal | code | en-US | fr-FR |
| 233 | template | code | ${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml + ${hydrationPlan.plannedRefillBidons} refill${hydrationPlan.pl | ${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml + ${hydrationPlan.plannedRefillBidons} recharge${hydrationPlan. |
| 389 | template | code | ${allocatedUnitCount} fuel unit${allocatedUnitCount > 1 ? 's' : ''} | ${allocatedUnitCount} ${allocatedUnitCount > 1 ? 'unités de ravito' : 'unité de ravito'} |
| 403 | template | code | More from drinks today: ${actualLiquidPct}% (usually ${baselineLiquidPct}%) | Plus de liquide aujourd’hui : ${actualLiquidPct} % (${baselineLiquidPct} % d’habitude) |
| 437 | literal | code | Finish / Return | Arrivée / Retour |
| 441 | literal | code | Hotel / Dining | Hôtel / Table d’étape |
| 445 | literal | code | Camp / Bivouac | Camp / Bivouac |
| 449 | literal | code | Stage finish | Arrivée d’étape |
| 452 | literal | code | Destination | Destination |
| 467 | template | code | ${fuelUnitsPerHour} Fuel Units / hr · ${supportivePacingLabel} | ${fuelUnitsPerHour} ${fuelUnitsPerHour > 1 ? 'unités' : 'unité'} / h · ${supportivePacingLabel} |
| 536 | literal | jsx-text | burned | brûlées |
| 546 | literal | jsx-text | sweat lost | de sueur |
| 572 | literal | jsx-text | Hide options | Fermer les options |
| 575 | literal | jsx-text | Adjust meal & logistics | Ajuster repas & logistique |
| 618 | literal | jsx-text | Window: | Créneau : |
| 679 | expression | code | item.nameEn | item.nameFr |
| 684 | expression | code | item.nameEn | item.nameFr |
| 685 | expression | code | item.portionLabelEn | item.portionLabelFr |
| 698 | template | code | Day ${currentDay}/${totalDays} · ~${totalManifestCarbs} g carbs (${totalManifestKcal} kcal) | Jour ${currentDay}/${totalDays} · ~${totalManifestCarbs} g C (${totalManifestKcal} kcal) |
| 702 | template | code | Day ${currentDay}/${totalDays} · ~${totalManifestUnits} total units | Jour ${currentDay}/${totalDays} · ~${totalManifestUnits} unités totales |
| 705 | template | code | Day ${currentDay}/${totalDays} · ${recommendedBidons} bottles / stage | Jour ${currentDay}/${totalDays} · ${recommendedBidons} bidons / étape |
| 711 | template | code | ${recommendedGPerHr} g/h (High effort) · ${prefBadgeLabel} | ${recommendedGPerHr} g/h (Effort intense) · ${prefBadgeLabel} |
| 715 | template | code | Max carbs/hr (${recommendedGPerHr} g/h) · ${prefBadgeLabel} | Max glucides/h (${recommendedGPerHr} g/h) · ${prefBadgeLabel} |
| 718 | template | code | ${recommendedGPerHr} g/h target (${powerZoneLabel} pace · ${effectiveCeilingGPerHr} g/h max) · ${prefBadgeLabel} | ${recommendedGPerHr} g/h (${powerZoneLabel} · max ${effectiveCeilingGPerHr} g/h) · ${prefBadgeLabel} |
| 722 | literal | code | fuel units/h | unités/h |
| 723 | literal | code | Steady rhythm | Rythme régulier |
| 751 | literal | jsx-text | Tour packing list | Liste de ravitaillement |
| 785 | literal | jsx-text | Electrolyte tabs | Doses électrolytes |
| 793 | literal | jsx-text | bottle doses | doses bidons |
| 808 | literal | jsx-text | Daily morning resupply: fresh gluten-free bread & fresh local fruit at each stage start. | Ravitaillement matin : pain ou galettes sans gluten + fruits frais locaux au départ d’étape. |
| 812 | literal | jsx-text | Daily morning bakery resupply: fresh sourdough & fresh local fruit at each stage start. | Ravitaillement matin : pain au levain végétal + fruits frais locaux au départ d’étape. |
| 815 | literal | jsx-text | Daily morning bakery resupply: 1 fresh baguette + fresh local fruit at each stage start. | Ravitaillement boulangerie : 1 baguette fraîche + fruits frais chaque matin au départ d’étape. |
| 855 | template | code | Buy ${displayLabel} | Acheter ${displayLabel} |
| 911 | template | jsx-attribute:aria-label | Remove ${displayLabel} from shopping list | Retirer ${displayLabel} de la liste de courses |
| 914 | template | jsx-attribute:aria-label | Add "Buy ${displayLabel}" to checklist | Ajouter « Acheter ${displayLabel} » à la checklist |
| 920 | literal | jsx-attribute:title | In shopping list (click to remove) | Dans la liste de courses (cliquer pour retirer) |
| 923 | literal | jsx-attribute:title | Add to shopping list | Ajouter à la liste de courses |
| 936 | literal | jsx-text | Added | Ajouté |
| 941 | literal | jsx-text | Buy | Acheter |
| 1050 | literal | jsx-attribute:label | Nutrition timeline | Chronologie nutrition |
| 1072 | template | jsx-text | Km-by-km fueling checkpoints (${fuelingCheckpoints.length}) | Rappels ravito km par km (${fuelingCheckpoints.length}) |
| 1119 | literal | code | Break Room / Workspace | Salle de Pause / Espace Bureau |
| 1126 | literal | code | Hydration only | Hydratation seule |
| 1129 | literal | code | Comfortable pre-ride meal | Repas digeste au calme |
| 1137 | literal | code | Consolidated recovery meal | Repas de récupération complet |
| 1143 | literal | code | Light start and hydration | Départ léger et hydratation |
| 1147 | literal | code | Quick drink before you leave | Petite boisson avant de partir |
| 1150 | literal | code | Breakfast before you ride | Petit-déjeuner avant de partir |
| 1156 | literal | code | An espresso and a glass of water with a pinch of salt, 15 min before you leave. You’ll eat once you’re rolling. | Un expresso et un verre d’eau avec une pincée de sel, 15 min avant de partir. Vous mangerez en roulant. |
| 1160 | literal | code | A small glass of juice or a light drink, an espresso and some water, 20 min before you leave. Easy on the stomach. | Un petit verre de jus ou de boisson légère, un expresso et de l’eau, 20 min avant de partir. Léger pour l’estomac. |
| 1163 | template | code | ${compliantPantry.preRide.nameEn}, an espresso and a tall glass of water with a pinch of salt, about 45 min before you l | ${compliantPantry.preRide.nameFr}, un expresso et un grand verre d’eau avec une pincée de sel, environ 45 min avant de p |
| 1167 | expression | code | compliantPantry.onBikeSolids[0]?.nameEn \|\| 'pocket snack' | compliantPantry.onBikeSolids[0]?.nameFr \|\| 'collation de poche' |
| 1178 | literal | code | Before you ride | Avant de partir |
| 1183 | literal | code | Light hydration & coffee | Hydratation & café au calme |
| 1187 | literal | code | Light drink before rollout | Boisson légère avant départ |
| 1190 | literal | code | Comfortable pre-ride meal | Repas digeste et hydratation au calme |
| 1202 | literal | code | In the saddle | En selle |
| 1203 | literal | code | Every 15–20 min | Toutes les 15–20 min |
| 1205 | literal | code | Sip water & take a small bite | 1 gorgée régulière & petite bouchée |
| 1208 | literal | code | Every 15–20 min: sip water & take a small bite | Toutes les 15–20 min : une gorgée d’eau et une petite bouchée |
| 1211 | template | code | Take a comfortable sip of water every 15–20 min. On rides over an hour, take a small bite (${primarySolidName}) at stead | Buvez une gorgée d’eau toutes les 15 à 20 min. Pour les sorties de plus d’une heure, prenez une petite bouchée (${primar |
| 1220 | literal | code | Within 30 min | Sous 30 min |
| 1222 | literal | code | Rehydrate & recovery meal | Réhydratation & repas de récupération |
| 1225 | literal | code | At arrival: rehydrate & eat within 30 min | À l’arrivée : boire et manger dans les 30 min |
| 1228 | template | code | Upon arrival (${stage1Loc}), drink a tall glass of water and enjoy your recovery meal or snack (${resolvedPostRidePantry | Dès l’arrivée (${stage1Loc}), buvez un grand verre d’eau et prenez votre collation de récupération (${resolvedPostRidePa |
| 1236 | literal | jsx-attribute:title | Intuitive rhythm & hydration | Guidage & rythme intuitif |
| 1238 | template | jsx-attribute:subtitle | Chronological rhythm cues & hydration pacing (${distance} km) free from calorie counting | Repères chronologiques & hydratation (${distance} km) sans comptage de calories |
| 1267 | literal | code | Before you ride | Avant de partir |
| 1268 | literal | code | 20 min before | 20 min avant |
| 1271 | literal | code | 0 g carbs · 350–500 ml water | 0 g glucides · 350–500 ml d’eau |
| 1274 | literal | code | Hydration · 1 water bottle | Hydratation · 1 bidon d’eau |
| 1286 | literal | code | Arrival | Arrivée |
| 1292 | template | code | ${resolvedPostRidePantry.nameEn} upon arrival (${stage1Loc}) with a glass of water and coffee or tea. | ${resolvedPostRidePantry.nameFr} à l’arrivée (${stage1Loc}) avec un grand verre d’eau et un café ou thé. |
| 1314 | literal | jsx-text | fuel units/h | unités/h |
| 1361 | literal | code | Before you ride | Avant de partir |
| 1375 | literal | code | On the bike | En selle |
| 1377 | template | code | KOM · ${isQuantitative ? `${recommendedGPerHr} g/h` : `${fuelUnitsPerHour} un/h`} | Bosses · ${isQuantitative ? `${recommendedGPerHr} g/h` : `${fuelUnitsPerHour} un/h`} |
| 1382 | literal | code | fuel units/h | unités/h |
| 1391 | template | code | Real-food fueling (${isQuantitative ? `${recommendedGPerHr} g/h` : `${fuelUnitsPerHour} un/h`}) | Ravito naturel sur mesure (${isQuantitative ? `${recommendedGPerHr} g/h` : `${fuelUnitsPerHour} un/h`}) |
| 1395 | literal | code | Carb & electrolyte hydration | Glucides & recharge électrolytes |
| 1399 | literal | code | Quick energy for punchy climbs | Énergie rapide pour les bosses |
| 1405 | template | code | Steady fueling using whole foods: ${compliantPantry.onBikeLiquid.nameEn} and pocket snacks (${compliantPantry.onBikeSoli | Ravito régulier avec des aliments simples : ${compliantPantry.onBikeLiquid.nameFr} et collations de poche (${compliantPa |
| 1410 | template | code | Steady hydration + ~${hydrationPlan.sodiumMgPerL} mg sodium/liter to keep energy flowing comfortably. | Hydratation régulière + ~${hydrationPlan.sodiumMgPerL} mg sodium/litre pour garder le rythme avec un bon confort digesti |
| 1413 | literal | code | Sip steadily with electrolytes to stay comfortably hydrated. | Buvez par petites gorgées régulières avec des électrolytes pour rester bien hydraté. |
| 1429 | template | code | At ${stage1Loc}, enjoy your recovery portion (${resolvedPostRidePantry.nameEn}) and a balanced meal with fresh water. | À l’arrivée (${stage1Loc}), prenez votre collation de récupération (${resolvedPostRidePantry.nameFr}) et un repas comple |
| 1449 | literal | jsx-text | bottles | bidons |
| 1473 | literal | code | Before you ride | Avant de partir |
| 1474 | literal | code | Alpine morning | Matin alpin |
| 1483 | literal | code | Mountain breakfast before the climbs | Petit-déjeuner de montagne avant les cols |
| 1491 | template | code | ${compliantPantry.preRide.nameEn}, hot coffee and a tall glass of water to tackle cold morning col temperatures. | ${compliantPantry.preRide.nameFr}, un café chaud et un grand verre d’eau pour aborder les températures fraîches des cols |
| 1501 | literal | code | On the road | En route |
| 1503 | literal | code | Steep pitches | Pentes fortes |
| 1506 | literal | code | Every 25 min | Toutes les 25 min |
| 1516 | literal | code | Climbing fuel & electrolytes | Énergie & électrolytes en montée |
| 1520 | literal | code | Village bakery & fresh snacks | Halte boulangerie & produits frais |
| 1525 | nested | code | dietaryFilters.includes('nut-free') ? 'Every 20 min: dates, fruit chews, and an electrolyte bottle (100% nut-free) to fu | dietaryFilters.includes('nut-free') ? 'Toutes les 20 min : dattes, pâtes de fruits et bidon électrolytes (100 % sans fru |
| 1533 | nested | code | dietaryFilters.includes('gluten-free') ? 'Village resupply halt: gluten-free baked treats, fresh fruit, and icy fountain | dietaryFilters.includes('gluten-free') ? 'Halte ravitaillement villageois : gâteaux ou galettes de riz sans gluten, frui |
| 1551 | literal | code | Bivouac dusk | Camp bivouac |
| 1551 | literal | code | Evening | Soirée |
| 1557 | literal | code | Mountain bivouac warm camp dinner | Dîner bivouac de montagne au réchaud |
| 1561 | literal | code | Wild bivouac meal & filtered water | Repas bivouac & eau filtrée |
| 1566 | nested | code | dietaryFilters.includes('vegan') ? `At ${stage1Loc}: hot plant-based lentil & curry rice stew, ${resolvedPostRidePantry. | dietaryFilters.includes('vegan') ? `À ${stage1Loc} : plat chaud végétal (lentilles corail & riz curry), ${resolvedPostRi |
| 1574 | template | code | Filtered water at camp (${stage1Loc}), warm meal with ${resolvedPostRidePantry.nameEn} to recover well for tomorrow. | Eau filtrée au camp (${stage1Loc}), repas chaud avec ${resolvedPostRidePantry.nameFr} pour bien récupérer avant le lende |
| 1577 | template | code | At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} and a hearty evening meal to refuel for tomorrow’s stage. | À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} et repas complet du soir pour recharger vos réserves avant l’étape sui |
| 1597 | literal | jsx-text | bottles | bidons |
| 1634 | literal | code | Before you ride | Avant de partir |
| 1648 | literal | code | On the road | En route |
| 1650 | literal | code | Picnic · 45 min | Pique-nique · 45 min |
| 1654 | template | code | Café stop · ${coffeeMin} min | Pause café · ${coffeeMin} min |
| 1657 | literal | code | On the road | En route |
| 1663 | literal | code | ~650 kcal · Balanced picnic | ~650 kcal · Pique-nique équilibré |
| 1667 | literal | code | Artisanal picnic feast | Pique-nique du terroir |
| 1676 | literal | code | Artisanal waterside picnic feast | Déjeuner pique-nique du terroir au bord de l’eau |
| 1680 | literal | code | Café stop on the way | Pause café en route |
| 1683 | template | code | Cruising fuel (~${fuelUnitsPerHour} fuel units/h) | Ravito de balade (~${fuelUnitsPerHour} unités/h) |
| 1687 | nested | code | dietaryFilters.includes('gluten-free') ? 'Seeded gluten-free artisan bread, plant-based spread, avocado, fresh tomatoes, | dietaryFilters.includes('gluten-free') ? 'Pain sans gluten aux graines, tartinade végétale, avocat, tomates fraîches, fr |
| 1699 | template | code | Planned café stop (${coffeeMin} min): ${customRation \|\| cafeSnack}. | Pause café prévue (${coffeeMin} min) : ${customRation \|\| cafeSnack}. |
| 1710 | literal | code | Dining 19:45 | Dîner 19:45 |
| 1714 | literal | code | Spa & dining | Spa & dîner |
| 1718 | literal | code | Recovery | Récupération |
| 1725 | literal | code | Evening vineyard dining & terroir table | Étape terroir & dîner gastronomique du soir |
| 1729 | literal | code | Spa hydration & restorative dinner | Hydratation spa & dîner récupérateur |
| 1733 | literal | code | Post-ride recovery & snack | Récupération post-sortie & collation |
| 1738 | template | code | At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} after the ride, followed by seasonal local dining. | À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} après l’étape, puis table réservée avec cuisine de saison. |
| 1742 | template | code | At ${stage1Loc}: mineral water & herbal tea after the thermal bath, followed by ${resolvedPostRidePantry.nameEn} and a l | À ${stage1Loc} : eau minérale et infusion après le bain chaud, suivi de ${resolvedPostRidePantry.nameFr} et d’un dîner l |
| 1746 | template | code | At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} and cool rehydration after your coffee spin. | À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} et réhydratation fraîche après la sortie café. |
| 1749 | template | code | At ${stage1Loc}: ${resolvedPostRidePantry.nameEn} and a relaxed meal to restore your energy. | À ${stage1Loc} : ${resolvedPostRidePantry.nameFr} et repas complet pour récupérer sereinement. |
| 1769 | literal | jsx-text | bottles | bidons |
| 1791 | literal | code | Before you ride | Avant de partir |
| 1805 | literal | code | On the road | En route |
| 1807 | template | code | Café stop · ${coffeeMin} min | Pause café · ${coffeeMin} min |
| 1816 | literal | code | Café stop on the way | Pause café en route |
| 1818 | literal | code | Steady-pace fuel | Ravito allure soutenue |
| 1823 | template | code | Planned café stop (${coffeeMin} min): ${customRation \|\| cafeSnack}. | Pause café prévue (${coffeeMin} min) : ${customRation \|\| cafeSnack}. |
| 1827 | template | code | ${compliantPantry.onBikeLiquid.nameEn} and a small snack at regular intervals to hold your pace. | ${compliantPantry.onBikeLiquid.nameFr} et une petite collation régulière pour garder le rythme. |
| 1858 | expression | code | resolvedPostRidePantry.portionLabelEn | resolvedPostRidePantry.portionLabelFr |
| 1864 | template | code | Quick snack before your shower (${stage1Loc}) | Collation rapide avant la douche (${stage1Loc}) |
| 1867 | template | code | Immediate recovery snack (${stage1Loc}) | Collation de récupération (${stage1Loc}) |
| 1870 | template | code | ${resolvedPostRidePantry.nameEn} upon arrival (${stage1Loc}) to start refueling comfortably. | ${resolvedPostRidePantry.nameFr} dès l’arrivée (${stage1Loc}) pour refaire tes réserves tranquillement. |
| 1886 | literal | code | Seated workplace breakfast | Collation repas au bureau |
| 1891 | template | code | Morning meal & coffee (${stage2Loc}) | Repas & café du matin (${stage2Loc}) |
| 1894 | template | code | Balanced seated meal (${stage2Loc}): ${breakRoomNames}. | Repas complet au calme (${stage2Loc}) : ${breakRoomNames}. |
| 1913 | template | code | Arrival recovery meal (${stage1Loc}) | Repas d’arrivée (${stage1Loc}) |
| 1916 | template | code | Complete recovery meal upon arrival (${stage1Loc}): ${arrivalNames}. | Repas complet à l’arrivée (${stage1Loc}) : ${arrivalNames}. |

#### `src/components/dashboard/PartnerSyncCard.tsx` (31 translatable / 31 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 91 | literal | code | Your partner | Votre partenaire |
| 108 | template | jsx-text | Shared by ${senderName} · Recalculated for your ${activeBike.name} (${effective.riderWeightKg} kg) | Plan partagé par ${senderName} · Recalculé pour votre ${activeBike.name} (${effective.riderWeightKg} kg) |
| 114 | literal | jsx-text | days | jours |
| 116 | literal | jsx-text | Leave by | Départ |
| 118 | literal | jsx-text | stops | arrêts |
| 133 | literal | jsx-text | Edit profile | Mon profil |
| 141 | literal | jsx-attribute:aria-label | Dismiss | Fermer |
| 159 | literal | code | labelEn | labelFr |
| 165 | template | code | My ${bikeLabel} Bike | Mon vélo ${bikeLabel} |
| 205 | literal | jsx-text | Shared blueprint · 10-second setup | Plan partagé · Personnalisation 10 s |
| 208 | template | jsx-text | ${senderName} shared “${sharedPlanBanner.name}” — adapt it to your bike & weight | ${senderName} vous a partagé « ${sharedPlanBanner.name} » — adaptez-le à votre vélo |
| 218 | literal | jsx-attribute:aria-label | Skip | Ignorer |
| 233 | literal | jsx-text | Your name | Votre prénom |
| 240 | literal | jsx-attribute:placeholder | e.g. Alex | Ex : Alex |
| 251 | literal | jsx-text | Your weight (kg) | Votre poids (kg) |
| 268 | literal | jsx-text | Bike & tyres | Vélo & pneus |
| 284 | expression | jsx-text | opt.labelEn | opt.labelFr |
| 285 | expression | jsx-text | opt.subEn | opt.subFr |
| 295 | literal | jsx-text | Bags & fuel | Bagages & nutrition |
| 311 | expression | jsx-text | opt.labelEn | opt.labelFr |
| 330 | expression | jsx-text | opt.labelEn | opt.labelFr |
| 340 | literal | jsx-text | Zero signup required · Your profile stays saved on this device. | Aucune création de compte requise · Vos réglages restent enregistrés localement. |
| 353 | literal | jsx-text | Skip for now | Passer |
| 363 | literal | jsx-text | Adapt plan to me | Adapter le plan à mon profil |
| 386 | literal | code | Both riders stay in a comfortable endurance zone (≤ 75% FTP) with a small effort gap. | Les deux cyclistes restent dans une zone d’endurance confortable (≤ 75 % FTP) avec un écart d’effort limité. |
| 409 | literal | jsx-text | Group Sync Check | Synchro duo |
| 412 | template | jsx-text | Shared pace · ${sync.groupSpeedKmH} km/h | Allure commune · ${sync.groupSpeedKmH} km/h |
| 432 | literal | jsx-text | Even effort | Effort équilibré |
| 435 | literal | jsx-text | Pace tweak suggested | Ajustement conseillé |
| 489 | template | jsx-text | Group pace set to ${sync.recommendedGroupSpeedKmH} km/h | Allure réglée à ${sync.recommendedGroupSpeedKmH} km/h |
| 492 | template | jsx-text | Set group pace to ${sync.recommendedGroupSpeedKmH} km/h | Passer l’allure du groupe à ${sync.recommendedGroupSpeedKmH} km/h |

#### `src/components/dashboard/PhysicsEngineCard.tsx` (100 translatable / 100 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 276 | literal | code | No-sweat spin | Balade sans transpirer |
| 280 | literal | code | Steady cruise | Rythme de croisière |
| 284 | literal | code | Brisk workout | Allure tonique |
| 287 | literal | code | Hard push | Gros effort |
| 293 | literal | code | Easy conversation | Discussion facile |
| 297 | literal | code | Comfortable chat | Souffle posé |
| 301 | literal | code | Short sentences | Phrases courtes |
| 304 | literal | code | Deep breathing | Souffle court |
| 310 | literal | code | Arrive fresh with a dry shirt. | Tu arrives frais, sans besoin de douche. |
| 314 | literal | code | Warm legs, sustainable all day. | Jambes chaudes, tenable toute la journée. |
| 318 | literal | code | Proper workout — sip regularly. | Vrai entraînement — pense à boire. |
| 321 | literal | code | Pace the start and fuel well. | Dose ton départ et ravitailles bien. |
| 328 | literal | code | Relaxed pace with real hills — spin light and enjoy the ride. | Allure tranquille malgré de vraies bosses — mouline léger et profite. |
| 331 | literal | code | Easy, no-sweat spin — chat the whole way and arrive fresh. | Sortie facile sans transpirer — tu peux discuter tout du long et arriver frais. |
| 336 | literal | code | Steady endurance pace across real climbs — keep an easy cadence on the hills. | Rythme d’endurance sur de vraies côtes — garde une cadence souple dans les bosses. |
| 339 | literal | code | Comfortable cruising pace — warm legs, easy breathing, sustainable all day. | Rythme de croisière confortable — jambes chaudes, souffle posé, tenable toute la journée. |
| 343 | literal | code | Brisk workout pace — warm legs and shorter sentences whenever the road tilts up. | Allure tonique — les jambes chauffent et tu parleras par phrases courtes dans les bosses. |
| 346 | literal | code | Demanding pace for this route — ease into the start so you still have legs at the finish. | Allure exigeante pour ce parcours — lève un peu le pied au début pour finir fort. |
| 351 | template | code | Around ${effectiveSpeed} km/h (trimmed slightly for darker or damper roads). | Environ ${effectiveSpeed} km/h (allure légèrement assouplie pour le noir ou la chaussée humide). |
| 354 | template | code | Around ${effectiveSpeed} km/h with wind and hills already factored in. | Environ ${effectiveSpeed} km/h, vent et relief déjà intégrés. |
| 360 | literal | code | Practically flat from start to finish. | Quasiment tout plat du début à la fin. |
| 364 | template | code | Climbing adds up to +${elevationM} m (${elevationScale}). | Le relief totalise +${elevationM} m (${elevationScale}). |
| 367 | template | code | Climbing adds up to +${elevationM} m. | Le relief totalise +${elevationM} m. |
| 373 | literal | code | Pancake flat | Tout plat |
| 377 | literal | code | Gentle rollers | Faux plats doux |
| 381 | literal | code | Hilly route | Parcours vallonné |
| 384 | literal | code | Big climbing day | Grosse journée de bosses |
| 393 | literal | code | Barely a rise along the way | Quasiment aucun dénivelé |
| 399 | template | code | Mostly smooth tarmac (${surfaceBreakdown.pavedPct}%) | Quasi tout bitume (${surfaceBreakdown.pavedPct} %) |
| 403 | template | code | Mixed roads · ${surfaceBreakdown.gravelPct}% gravel | Mix bitume et ${surfaceBreakdown.gravelPct} % chemins |
| 406 | template | code | ${surfaceBreakdown.pavedPct}% paved · ${surfaceBreakdown.gravelPct}% gravel | ${surfaceBreakdown.pavedPct} % bitume · ${surfaceBreakdown.gravelPct} % gravel |
| 413 | literal | code | The hills | Les côtes |
| 414 | literal | code | Shift down early on rises to keep your legs fresh. | Mouline tôt dans les bosses pour garder des jambes fraîches. |
| 420 | literal | code | Pushing through air | Fendre l’air |
| 421 | literal | code | Stay relaxed and tuck slightly on open stretches. | Reste souple et détendu sur les portions exposées au vent. |
| 427 | literal | code | Tyres & road drag | Pneus & revêtement |
| 428 | literal | code | Slightly softer tyres will smooth out the road buzz. | Un peu moins de pression rendra le roulage plus doux. |
| 433 | literal | code | Light & balanced | Fluide & équilibré |
| 434 | literal | code | Nothing fighting you — smooth, predictable pedaling. | Rien ne te freine vraiment — pédalage régulier tout du long. |
| 441 | template | code | ~${totalKcal} kcal burned | ~${totalKcal} kcal brûlées |
| 444 | literal | code | Light effort | Effort léger |
| 480 | literal | jsx-attribute:title | How this ride will feel | Comment la sortie va se ressentir |
| 501 | template | jsx-attribute:title | Effective Crr ${formattedCrr} (×${(physicsResult.crrMultiplier ?? 1).toFixed(2)})${(physicsResult.cautionDelayMinutes ?? | Crr effectif ${formattedCrr} (×${(physicsResult.crrMultiplier ?? 1).toFixed(2)})${(physicsResult.cautionDelayMinutes ??  |
| 572 | literal | jsx-text | In your legs & lungs | Jambes & souffle |
| 588 | literal | jsx-text | Hills & road feel | Relief & revêtement |
| 604 | literal | jsx-text | What works you most | Ce qui demande le plus |
| 623 | literal | jsx-text | Target pace | Allure estimée |
| 632 | literal | jsx-text | Wind & terrain adjusted | Ajustée au vent et au relief |
| 639 | literal | jsx-text | Effort feel | Niveau d’effort |
| 657 | literal | jsx-text | Hills & surface | Relief & route |
| 666 | literal | jsx-text | Paved | Bitume |
| 673 | literal | jsx-text | Wind vs road | Vent vs route |
| 680 | literal | jsx-text | air | air |
| 684 | literal | jsx-text | rolling & hills | pneus & pente |
| 762 | literal | jsx-text | Power budget | Répartition puissance |
| 765 | literal | jsx-text | Where your effort goes | Où va ton effort |
| 778 | template | jsx-attribute:aria-label | Power split: ${aeroBudgetPct}% aero, ${rollingBudgetPct}% rolling${gravityBudgetPct > 0 ? `, ${gravityBudgetPct}% climb` | Répartition : ${aeroBudgetPct}% aéro, ${rollingBudgetPct}% roulement${gravityBudgetPct > 0 ? `, ${gravityBudgetPct}% gra |
| 786 | literal | jsx-attribute:title | Aero drag | Aéro |
| 793 | literal | jsx-attribute:title | Rolling | Roulement |
| 800 | literal | jsx-attribute:title | Climb | Pente |
| 811 | literal | jsx-attribute:title | Drivetrain | Transmission |
| 822 | literal | jsx-text | Aero | Aéro |
| 825 | literal | jsx-text | Pushing air | Air |
| 836 | literal | jsx-text | Rolling | Roulement |
| 839 | literal | jsx-text | Tyres | Pneus |
| 856 | literal | jsx-text | Climbs | Côtes |
| 865 | literal | jsx-text | Chain | Chaîne |
| 875 | template | jsx-text | ${aeroBudgetPct}% of your effort is just pushing through air — stay relaxed on the open stretches. | ${aeroBudgetPct} % de ton effort sert surtout à fendre l’air — reste souple et relâché sur les portions exposées. |
| 879 | template | jsx-text | ${gravityBudgetPct}% of the work goes into the climbs — spin an easy gear early so your legs stay fresh. | ${gravityBudgetPct} % de l’effort part dans les bosses — mouline tôt pour garder des jambes fraîches jusqu’au bout. |
| 882 | template | jsx-text | Even balance across air (${aeroBudgetPct}%), tyres (${rollingBudgetPct}%), and hills — steady, predictable effort. | Bel équilibre entre l’air (${aeroBudgetPct} %), les pneus (${rollingBudgetPct} %) et le relief — effort régulier tout du |
| 886 | template | jsx-text |  The sharpest sting comes around km ${Math.round(sectional.peakAtKm)} (${sectional.peakGradePct.toFixed(1)}%). |  Le moment qui pique le plus arrive vers le km ${Math.round(sectional.peakAtKm)} (${sectional.peakGradePct.toFixed(1)} % |
| 914 | template | code | Sharpest rise: ${sectional.peakGradePct.toFixed(1)}% around km ${Math.round(sectional.peakAtKm)} · ${surfaceBreakdown.pa | Passage le plus raide : ${sectional.peakGradePct.toFixed(1)} % au km ${Math.round(sectional.peakAtKm)} · ${surfaceBreakd |
| 918 | template | code | Smooth, steady profile · ${surfaceBreakdown.pavedPct}% paved | Profil régulier et fluide · ${surfaceBreakdown.pavedPct} % bitume |
| 927 | template | code | peak ${sectional.peakZone} | pic ${sectional.peakZone} |
| 930 | template | code | peak ${sectional.peakClimbWatts} W | pic ${sectional.peakClimbWatts} W |
| 933 | template | code | ${aerobic}% aerobic · ${peak} · ${surfaceBreakdown.pavedPct}% paved | ${aerobic} % aérobie · ${peak} · ${surfaceBreakdown.pavedPct} % bitume |
| 983 | literal | jsx-text | Climb Splits | Cols & Allures |
| 986 | template | jsx-text | ${climbSplits.climbs.length} ${climbSplits.climbs.length === 1 ? 'climb' : 'climbs'} (+${climbSplits.totalClimbGainM} m) | ${climbSplits.climbs.length} ${climbSplits.climbs.length === 1 ? 'côte' : 'côtes'} (+${climbSplits.totalClimbGainM} m) |
| 1044 | literal | jsx-text | Dist / Grade | Dist / Pente |
| 1050 | literal | jsx-text | max | max |
| 1056 | literal | jsx-text | Target | Cible |
| 1068 | literal | jsx-text | Pace / VAM | Allure / VAM |
| 1095 | literal | jsx-text | Climb | Ascension |
| 1098 | literal | jsx-text | Dist / Grade | Dist / Pente |
| 1101 | literal | jsx-text | Target | Cible |
| 1104 | literal | jsx-text | Time | Durée |
| 1107 | literal | jsx-text | Fueling | Ravitaillement |
| 1133 | literal | jsx-text | avg | moy |
| 1165 | literal | jsx-text | Climb splits synthesized from route elevation gain (import a GPX for exact gradient ramp detection). | Profil d’ascension synthétisé depuis le D+ total (importe un GPX pour la détection précise des rampes). |
| 1260 | literal | jsx-text | Gravity | Gravité |
| 1277 | literal | jsx-text | Aero drag | Aéro |
| 1311 | literal | jsx-text | Road & grade | Route & pente |
| 1325 | literal | jsx-attribute:title | Rolling | Roulement |
| 1331 | literal | jsx-attribute:title | Climb gravity | Pente |
| 1349 | literal | jsx-attribute:title | Rolling | Roulement |
| 1359 | literal | jsx-attribute:title | Descent assist | Descente |
| 1390 | literal | jsx-text | Drivetrain | Transmission |
| 1455 | literal | jsx-text | Mechanical output | Rendement mécanique |
| 1470 | literal | jsx-text | Wheel power | Puissance à la roue |
| 1479 | literal | jsx-text | Aero / surface split | Répartition aéro / route |

#### `src/components/dashboard/PreFlightChecklistBento.tsx` (7 translatable / 7 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 72 | literal | code | en | fr |
| 123 | template | code | Shopping (${shoppingCount}) | Courses (${shoppingCount}) |
| 163 | template | code | Tubeless tire plugs (bacon strips) + CO2 & sealant check (${activeBike.name}) | Kit mèches Tubeless + cartouche CO2 & niveau préventif (${activeBike.name}) |
| 166 | template | code | Spare inner tube + tire levers & mini-pump (${activeBike.name}) | Chambre à air de secours + démonte-pneus & mini-pompe (${activeBike.name}) |
| 359 | literal | jsx-text | Shopping | Course |
| 374 | template | jsx-attribute:aria-label | Remove ${displayLabel} | Retirer ${displayLabel} |
| 375 | literal | jsx-attribute:title | Remove from list | Retirer de la liste |

#### `src/components/dashboard/ReadinessActionCard.tsx` (75 translatable / 75 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 117 | template | code | ${nextLoopKm} km loop radius | Rayon boucle ${nextLoopKm} km |
| 231 | literal | jsx-text | Projected | Score prévu |
| 284 | literal | code | Quick stop (5 min max) | Arrêt express (5 min max) |
| 287 | literal | code | Mid-ride lunch & recovery | Pause déjeuner & récupération |
| 316 | literal | code | Quick stop (5 min max) | Arrêt express (5 min max) |
| 319 | literal | code | Mid-ride lunch & recovery | Pause déjeuner & récupération |
| 415 | template | code | Added ${stopMinutes} min stop — timeline, finish (${stopPreview.timeline.gateArrivalTime}) & readiness updated | Pause de ${stopMinutes} min ajoutée — horaires, arrivée (${stopPreview.timeline.gateArrivalTime}) et score mis à jour |
| 420 | literal | code | View timeline | Voir la timeline |
| 428 | literal | code | Removed planned long stop from ride plan | Pause longue retirée du plan de route |
| 439 | template | code | Route adjusted to ${targetDistKm} km — saddle time (${shortenPreview.physics.movingTimeFormatted}), fueling & readiness  | Distance ajustée à ${targetDistKm} km — temps de selle (${shortenPreview.physics.movingTimeFormatted}), ravito et score  |
| 444 | literal | code | View route | Voir la carte |
| 452 | template | code | Switched to steady effort (${pacePreview.physics.powerZone} · ${pacePreview.targetWatts} W) — timeline & readiness updat | Allure réglée en effort régulier (${pacePreview.physics.powerZone} · ${pacePreview.targetWatts} W) — horaires et score m |
| 457 | literal | code | View effort | Voir l’effort |
| 528 | template | code | Shifted rollout to ${shiftPreview.timeline.hardDepartureTime} — weather, daylight & timeline refreshed | Départ décalé à ${shiftPreview.timeline.hardDepartureTime} — météo, luminosité et timeline actualisées |
| 534 | literal | code | View weather | Voir la météo |
| 535 | literal | code | View timeline | Voir la timeline |
| 544 | literal | code | Wet-weather gear & safety buffer added | Kit pluie & marge chaussée humide ajoutés |
| 547 | literal | code | Night-ride lights check & buffer added | Contrôle éclairage & marge nuit ajoutés |
| 554 | literal | code | View checklist | Voir la check-list |
| 570 | template | code | Pinned ${alt.name} at km ${alt.routeKm} — map, timeline & brief updated | ${alt.name} épinglé sur la trace (km ${alt.routeKm}) — carte et timeline mises à jour |
| 575 | literal | code | View timeline | Voir la timeline |
| 583 | literal | code | Ease the overall ride load | Alléger la charge de la sortie |
| 584 | literal | code | Add a planned recovery stop or trim the distance — your timeline, finish time, nutrition windows, and readiness score up | Planifiez une pause longue ou ajustez la distance — tout votre plan de route (horaires, arrivée, nutrition et score) se  |
| 590 | literal | code | Dial back the pace | Passer à une allure plus soutenable |
| 591 | literal | code | Switch to steady effort one zone lower to keep the ride comfortable from start to finish. | Passez en mode effort régulier une zone plus bas pour préserver vos jambes sur toute la distance. |
| 597 | literal | code | Finish essential pre-ride checks | Finaliser les essentiels avant le départ |
| 598 | literal | code | Tick remaining items right here — your checklist card and readiness score update live. | Cochez les éléments restants ici — votre check-list et votre score de préparation se mettent à jour en direct. |
| 604 | literal | code | Adjust your weather window | Ajuster le créneau météo |
| 605 | literal | code | Shift your schedule to pull a fresh hourly forecast, or add wet-weather prep to your checklist and timeline. | Décalez l’horaire pour actualiser la météo heure par heure, ou ajoutez le kit pluie à votre check-list et vos marges. |
| 611 | literal | code | Match your bike to the surface | Adapter le vélo au terrain |
| 612 | literal | code | Pick a bike better suited to this route’s surface, or adjust tyre width in your bike setup. | Choisissez un vélo mieux adapté au revêtement de cette trace, ou ajustez vos pneus dans vos réglages. |
| 618 | literal | code | Improve daylight visibility | Gagner en visibilité de jour |
| 619 | literal | code | Shift your rollout toward daylight, or turn on night-ride prep (lights check and safety buffer). | Décalez le départ vers le jour ou activez la préparation nuit (phares 800+ lm et marge de prudence). |
| 625 | literal | code | Resolve the flagged route stop | Régler le point signalé sur la trace |
| 626 | literal | code | Pin an open alternative stop or inspect the corridor on the map. | Épinglez une alternative ouverte ou ouvrez le radar sur la carte pour vérifier l’eau et les horaires. |
| 657 | literal | jsx-attribute:aria-label | Close guidance | Fermer les suggestions |
| 681 | literal | jsx-text | Quick stop (5 min max) | Arrêt express (5 min max) |
| 684 | literal | jsx-text | Plan a long stop | Planifier une pause longue |
| 699 | literal | jsx-text | Shorten the route | Raccourcir la distance |
| 707 | template | jsx-text | Pre-dawn winter start (${recoveryRule.rolloutHHMM}, dawn ${recoveryRule.civilDawnHHMM}): mid-ride rest stops are capped  | Départ hivernal avant l’aube (${recoveryRule.rolloutHHMM}, aube ${recoveryRule.civilDawnHHMM}) : les pauses sont limitée |
| 715 | literal | jsx-text | Mid-ride stop duration | Durée de la pause à mi-parcours |
| 739 | literal | jsx-attribute:title | Disabled pre-dawn in winter (5 min max cap) | Désactivé avant l’aube en hiver (limite 5 min max) |
| 763 | literal | jsx-text | Timeline stop label | Libellé sur la timeline |
| 770 | literal | jsx-attribute:placeholder | e.g. Mid-ride lunch & recovery | Ex. Pause déjeuner & récup |
| 786 | literal | jsx-text | Leave | Départ |
| 787 | literal | jsx-text | Finish | Fin |
| 802 | literal | jsx-text | Remove stop | Retirer la pause |
| 815 | template | jsx-text | Update stop (${stopMinutes} min) | Mettre à jour (${stopMinutes} min) |
| 818 | template | jsx-text | Add ${stopMinutes} min stop | Ajouter la pause (${stopMinutes} min) |
| 832 | literal | jsx-text | Target route distance | Nouvelle distance cible |
| 868 | literal | jsx-attribute:aria-label | Target distance in km | Distance cible en km |
| 899 | literal | jsx-text | Edit in Trip Setup | Modifier le tracé |
| 911 | template | jsx-text | Set route to ${targetDistKm} km | Passer à ${targetDistKm} km |
| 928 | literal | jsx-text | Easy endurance (Z2 · 65% FTP) | Endurance cool (Z2 · 65% FTP) |
| 932 | literal | jsx-text | Steady endurance (Z2 · 72% FTP) | Endurance active (Z2 · 72% FTP) |
| 936 | literal | jsx-text | Controlled tempo (Z3 · 80% FTP) | Tempo maîtrisé (Z3 · 80% FTP) |
| 977 | literal | jsx-text | Apply steadier pace | Appliquer cette allure |
| 988 | literal | jsx-text | Every item is checked off! | Tous les éléments sont cochés ! |
| 1007 | literal | jsx-text | Essential | Essentiel |
| 1018 | template | jsx-text | +${uncheckedChecklist.length - 6} more items in full checklist | +${uncheckedChecklist.length - 6} autres éléments dans la check-list |
| 1021 | template | jsx-text | ${effectiveChecklist.length - uncheckedChecklist.length} of ${effectiveChecklist.length} checked | ${effectiveChecklist.length - uncheckedChecklist.length} sur ${effectiveChecklist.length} cochés |
| 1036 | literal | jsx-text | Jump to full checklist | Ouvrir toute la check-list |
| 1085 | literal | jsx-text | Leave | Départ |
| 1088 | literal | jsx-text | daylight | de jour |
| 1103 | literal | jsx-text | Add rain prep | Ajouter kit pluie |
| 1115 | literal | jsx-text | Add night-ride prep | Activer prépa nuit |
| 1132 | template | jsx-text | Shift to ${shiftPreview.timeline.hardDepartureTime} | Décaler à ${shiftPreview.timeline.hardDepartureTime} |
| 1159 | template | code | Switched bike to ${bike.name} — pressure, physics & readiness updated | Vélo changé pour ${bike.name} — pression, physique et score mis à jour |
| 1183 | literal | jsx-text | tubes | chambre |
| 1184 | literal | jsx-text | Terrain | Terrain |
| 1185 | literal | jsx-text |  · Active |  · Actuel |
| 1193 | literal | jsx-text | Update tyre width / tubeless setup or add another bike in your bike specs. | Ajustez la largeur de pneus ou ajoutez un deuxième vélo dans vos réglages vélo. |
| 1212 | literal | jsx-text | Edit bike & tyres | Réglages vélo & pneus |
| 1241 | literal | jsx-text | Inspect on map | Ouvrir la carte & arrêts |
| 1254 | template | jsx-text | Pin ${brief.firstProblem.alternativeStop.name} | Épingler ${brief.firstProblem.alternativeStop.name} |

#### `src/components/dashboard/ResupplyRadarOverlay.tsx` (26 translatable / 26 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 287 | literal | code | No active route coordinates available to scan corridor. | Aucune coordonnée GPX active pour scanner le corridor. |
| 315 | literal | code | Could not load route stops. Please check your connection and retry. | Impossible de charger les points de passage. Vérifiez votre connexion et réessayez. |
| 401 | literal | code | Auto-marked stops cleared | Arrêts auto retirés |
| 419 | literal | code | All intervals are already covered. | Tous les intervalles sont déjà couverts. |
| 445 | template | code | +${addedStops.length} stop${addedStops.length > 1 ? 's' : ''} auto-marked | +${addedStops.length} arrêt${addedStops.length > 1 ? 's' : ''} épinglé${addedStops.length > 1 ? 's' : ''} |
| 506 | literal | code | Could not reroute through this stop right now. | Impossible de recalculer cet arrêt pour le moment. |
| 509 | literal | code | Could not remove this stop from the route right now. | Impossible de retirer cet arrêt pour le moment. |
| 616 | literal | code | WC / Med / Fuel | WC / Pharm. / Carb. |
| 622 | literal | code | Train Bailout | Gares (Repli) |
| 779 | template | jsx-attribute:headline | You’re well covered on water — taps within ${formatKm(waterGaps.maxGapKm, lang)} km, your bottles easily handle it. | Tu es large côté eau — des points d’eau tous les ${formatKm(waterGaps.maxGapKm, lang)} km, tes bidons couvrent tout. |
| 787 | template | code | ${openFood} bakery / café stop${openFood > 1 ? 's' : ''} spotted along your route — zero resupply stress. | ${openFood} boulangerie${openFood > 1 ? 's' : ''} / café${openFood > 1 ? 's' : ''} repéré${openFood > 1 ? 's' : ''} sur  |
| 791 | literal | code | No dry stretches to worry about along your route. | Aucun secteur sec préoccupant sur ta trace. |
| 801 | literal | jsx-text | Resupply filters | Filtres de ravitaillement |
| 889 | literal | jsx-text | stops | points |
| 961 | literal | jsx-text | Checkpoints | Points de passage |
| 983 | literal | jsx-attribute:title | Click to clear auto-marked stops | Cliquer pour retirer les arrêts auto-marqués |
| 986 | literal | jsx-attribute:title | Automatically pin open water taps every ~25 km and a mid-route café stop | Épingle automatiquement les points d’eau ouverts tous les ~25 km et une halte café |
| 992 | literal | jsx-text | Auto-Mark (25 km) | Auto-Marquer (25 km) |
| 1006 | literal | jsx-text | Retry Scan | Réessayer le scan |
| 1018 | literal | jsx-text | Build a Corridor A→B route or import a GPX track to scan stops along your route. | Tracez un corridor A→B ou importez un fichier GPX pour scanner les ravitaillements le long du parcours. |
| 1046 | literal | jsx-text | No water taps, bakeries, or bike repair stops mapped on OpenStreetMap along this corridor (1.2 km). | Aucun point d’eau, boulangerie ou atelier vélo répertorié dans OpenStreetMap le long de ce corridor (1,2 km). |
| 1078 | literal | code | WC / Med / Fuel | WC / Pharm. / Carb. |
| 1085 | literal | code | Train Bailout | Gares (Repli) |
| 1224 | literal | jsx-attribute:title | Inspect on OpenStreetMap | Voir la fiche OpenStreetMap |
| 1341 | literal | jsx-text | Source: OpenStreetMap contributors · Community-mapped data — treat stops as leads and verify hours before relying on a c | Source : contributeurs OpenStreetMap · Données communautaires — traitez ces arrêts comme des pistes et vérifiez les hora |
| 1382 | literal | jsx-attribute:title | Garmin .FIT course with pinned stops for Up Ahead | Parcours .FIT avec arrêts épinglés pour Garmin Up Ahead |

#### `src/components/dashboard/ReverseTimelineBento.tsx` (6 translatable / 6 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 220 | template | code | Wind adds ~${windImpactMin} min today, so we nudged roll-out earlier to ${timeline.hardDepartureTime}. | Le vent ajoute ~${windImpactMin} min aujourd’hui — ton départ est avancé à ${timeline.hardDepartureTime}. |
| 223 | template | code | You still reach your finish around ${timeline.gateArrivalTime} without chasing speed. | Tu arrives quand même vers ${timeline.gateArrivalTime} sans courir après le chrono. |
| 233 | template | code | Early ${timeline.hardDepartureTime} roll-out — lay your lights and kit out tonight. | Départ matinal à ${timeline.hardDepartureTime} — prépare tes feux et ta tenue la veille. |
| 236 | template | code | Keeps the morning effortless so your ${durStr} ride starts calm. | Ton matin reste fluide et tes ${durStr} de vélo démarrent sans stress. |
| 359 | literal | jsx-attribute:title | Pre-dawn winter start: rest stops capped at 5 min max and 30-min+ lunch breaks disabled | Départ hivernal avant l’aube : pauses ≤ 5 min max et pauses déjeuner (30 min+) désactivées |
| 364 | literal | jsx-text | Stops ≤ 5 min · Lunch disabled | Pauses ≤ 5 min · Déjeuner désactivé |

#### `src/components/dashboard/RideBriefCard.tsx` (25 translatable / 25 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 155 | literal | code | Copy ride plan link: | Copiez le lien du plan : |
| 179 | literal | code | Checklist | Check-list |
| 183 | literal | code | Resupply | Ravito |
| 185 | literal | code | Schedule | Horaires |
| 188 | literal | code | Weather | Météo |
| 190 | literal | code | Fuel | Nutrition |
| 197 | literal | jsx-attribute:aria-label | Ride brief | Briefing départ |
| 216 | literal | jsx-text | Ride brief | Briefing départ |
| 233 | literal | jsx-attribute:aria-label | Expand ride brief | Déplier le briefing départ |
| 249 | literal | jsx-attribute:title | Ride readiness | Prêt à partir |
| 274 | literal | jsx-attribute:aria-label | Collapse ride brief | Réduire le briefing départ |
| 277 | literal | jsx-attribute:aria-label | Expand ride brief | Déplier le briefing départ |
| 361 | literal | jsx-attribute:lang | en | fr |
| 395 | literal | jsx-text | View | Voir |
| 409 | literal | jsx-text | Undo | Annuler |
| 415 | literal | jsx-attribute:aria-label | Dismiss | Fermer |
| 498 | literal | jsx-attribute:title | Adjust or remove planned stop | Modifier ou retirer la pause longue |
| 501 | template | jsx-text | ${plannedLongStopMin} min stop | Pause ${plannedLongStopMin} min |
| 513 | literal | jsx-attribute:title | Pre-dawn winter start: rest stops capped at 5 min max and 30-min+ lunch breaks disabled | Départ hivernal avant l’aube : pauses ≤ 5 min max et pauses déjeuner (30 min+) désactivées |
| 518 | literal | jsx-text | Stops ≤ 5 min (pre-dawn winter) | Pauses ≤ 5 min (hiver avant l’aube) |
| 525 | template | jsx-text | Flip loop (−${loopComp.minutesSaved} min) | Sens inverse (−${loopComp.minutesSaved} min) |
| 528 | template | jsx-text | Default dir (−${loopComp.minutesSaved} min) | Sens normal (−${loopComp.minutesSaved} min) |
| 566 | literal | jsx-text | Link copied! | Lien copié ! |
| 570 | literal | jsx-text | Creating… | Création… |
| 573 | literal | jsx-text | Share with partner | Partager (duo) |

#### `src/components/dashboard/RideModeOverlay.tsx` (10 translatable / 10 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 418 | literal | code | Hydration Cue | Rappel hydratation |
| 714 | literal | jsx-text | Calm conditions · Daylight | Conditions calmes · Plein jour |
| 725 | template | jsx-text | Gusts ${maxGust} km/h | Rafales ${maxGust} km/h |
| 737 | literal | jsx-text | Light | Phare |
| 746 | expression | jsx-attribute:title | rideVisibility.lightingGear.batteryNoticeEn | rideVisibility.lightingGear.batteryNoticeFr |
| 754 | template | jsx-text | Sub-5°C battery (-30%) · ${Math.round(tempC)}°C | Batterie < 5°C (-30%) · ${Math.round(tempC)}°C |
| 855 | literal | jsx-text | Nearest water | Eau auto |
| 879 | literal | jsx-text | Winter shutoff risk: cemetery water may be turned off for frost | Risque coupure hivernale : robinet parfois fermé hors gel |
| 903 | template | jsx-text | Next drink cue in ${fuelMinutesLeft} min | Prochain rappel hydratation dans ${fuelMinutesLeft} min |
| 958 | literal | jsx-text | Voice muted: unmute above to hear spoken alerts | Son coupé : réactivez la voix pour entendre les alertes |

#### `src/components/dashboard/RideReadinessGauge.tsx` (3 translatable / 3 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 205 | literal | jsx-text | Ride readiness | Prêt à partir |
| 248 | literal | jsx-text | Why this score | Détail du score |
| 323 | literal | jsx-text | Weighted: weather 25 · bike & terrain 20 · effort 20 · checklist 15 · daylight 10 · stops 10. 75+ is good to go, 45–74 w | Pondération : météo 25 · vélo & terrain 20 · effort 20 · check-list 15 · lumière 10 · arrêts 10. 75+ prêt à rouler, 45–7 |

#### `src/components/dashboard/TerrainEffortStory.tsx` (23 translatable / 23 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 65 | expression | code | s | s.replace('.', ',') |
| 74 | template | code | ${v}% | ${v} % |
| 75 | literal | code | en-US | fr-FR |
| 81 | literal | code | Flats & descents | Plats & descentes |
| 82 | literal | code | Rolling roads | Faux-plats |
| 83 | literal | code | Climbs | Côtes |
| 145 | literal | jsx-attribute:aria-label | Elevation profile, each bar coloured by effort zone | Profil altimétrique, chaque barre colorée selon la zone d’effort |
| 236 | jsx | code | ( <>{strong(`${intensePct}%`)} of your ride sits at a hard effort ({f.duration(intenseMin)}). </> ) | ( <>{strong(f.pct(intensePct))} de la sortie dans le dur ({f.duration(intenseMin)}). </> ) |
| 242 | jsx | code | ( <>{strong(`${aerobicPct}%`)} of your ride stays at a comfortable pace ({f.duration(aerobicMin)}). </> ) | ( <>{strong(f.pct(aerobicPct))} de la sortie à une allure confortable ({f.duration(aerobicMin)}). </> ) |
| 247 | jsx | code | ( <>{strong(`${aerobicPct}%`)} of your ride stays in Z1–Z2 ({f.duration(aerobicMin)}). </> ) | ( <>{strong(f.pct(aerobicPct))} de la sortie en Z1–Z2 ({f.duration(aerobicMin)}). </> ) |
| 255 | template | code | a ${f.num(peakGrade)}% pitch — shift down early. | pente à ${f.num(peakGrade)} % — mouline tôt. |
| 258 | literal | code | an exposed stretch — stay tucked. | portion exposée — reste souple. |
| 262 | jsx | code | ( <> Toughest stretch {showWatts ? <>({strong(`${sectional.peakClimbWatts}\u00A0W`)} · {peakPctFtp}% FTP)</> : null} at  | ( <> Passage le plus exigeant {showWatts ? <>({strong(`${sectional.peakClimbWatts}\u00A0W`)} · {f.pct(peakPctFtp)} FTP)< |
| 277 | literal | code | Easy, steady pace: sustainable all day without draining your legs. | Allure douce et régulière : tu peux tenir ce rythme longtemps sans puiser dans tes réserves. |
| 281 | literal | code | Brisk tempo: burns through energy faster — eat early and steadily. | Allure soutenue : ça consomme vite — pense à grignoter tôt et régulièrement. |
| 284 | literal | code | Hard effort: fatigue builds quickly past an hour — easing the pace a touch pays off. | Effort intense : la fatigue grimpe vite après 1 h. N’hésite pas à baisser un peu la vitesse cible. |
| 301 | template | code | ${bandName(domBand.id, false)} cover ${domBand.pctDistance}% of the distance. ${bandName(hardBand.id, false)} ask for ${ | ${bandName(domBand.id, true)} : ${f.pct(domBand.pctDistance)} de la distance. ${bandName(hardBand.id, true)} demandent $ |
| 304 | literal | code | Even effort across the whole route — hold a steady rhythm. | Effort homogène sur tout le parcours — garde une cadence tranquille. |
| 312 | literal | jsx-text | Your ride will be | Ta sortie sera |
| 314 | expression | jsx-text | character.en | character.fr |
| 334 | literal | jsx-text | Time in zones | Temps par zone |
| 344 | literal | jsx-attribute:aria-label | Proportional power zone distribution | Répartition proportionnelle des zones de puissance |
| 415 | literal | jsx-text | Where the watts go | Où partent les watts |

#### `src/components/dashboard/TimelineContextualBanner.tsx` (11 translatable / 11 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 81 | literal | code | Arrival point | Point d’arrivée |
| 109 | literal | code | Finish Sector | Arrivée |
| 113 | literal | code | units/h | unités/h |
| 114 | literal | code | 15–20 min | 15–20 min |
| 122 | template | code | Steady fueling (${rateLabel}) · Target ~${targetSpeed} km/h | Rythme régulier (${rateLabel}) · Cible ~${targetSpeed} km/h |
| 130 | template | code | Keep a steady fueling rhythm (${rateLabel}) starting 20 min in for smooth endurance. | Maintenez un apport régulier (${rateLabel}) dès les 20 premières minutes pour lisser l’effort. |
| 154 | literal | code | Bivouac Site | Zone de Bivouac |
| 182 | literal | code | Hotel / Stage Finish | Hôtel / Étape |
| 390 | literal | jsx-text | Active ride options | Options actives |
| 398 | expression | code | def.labelEn | def.labelFr |
| 399 | expression | code | def.ruleTitleEn | def.ruleTitleFr |

### components/home (138 translatable / 138 total across 6 files)

#### `src/components/home/CompactTripCard.tsx` (1 translatable / 1 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 100 | literal | code | en | fr |

#### `src/components/home/HomeScreen.tsx` (18 translatable / 18 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 136 | literal | code | en-US | fr-FR |
| 251 | literal | code | Where to? | Où va-t-on ? |
| 405 | literal | jsx-text | Your planned trips | Vos trajets prévus |
| 428 | literal | jsx-text | See all | Tout voir |
| 435 | literal | jsx-text | No trips saved yet. | Aucune sortie enregistrée pour le moment. |
| 457 | literal | jsx-text | Load Demo | Trajet démo |
| 484 | literal | jsx-text | Cycling Multi-Tool | Multi-Tool vélo |
| 487 | literal | jsx-text | No login · 100% in-browser | Sans compte · 100 % navigateur |
| 498 | literal | jsx-text | All tools | Tout voir |
| 510 | literal | jsx-text | Fuel & bottles | Nutrition & bidons |
| 519 | literal | jsx-text | Flip my loop | Sens du vent |
| 528 | literal | jsx-text | Water & bakeries | Eau & boulangeries |
| 537 | literal | jsx-text | Stem sticker | Sticker cadre |
| 579 | literal | jsx-text | Local-first cycling physics & nutrition planner | Planificateur local · Physique cycliste & ravitaillement 100 % navigateur |
| 620 | literal | jsx-text | 1 trip | 1 trajet |
| 791 | literal | jsx-text | No trips saved yet | Aucune sortie enregistrée |
| 794 | literal | jsx-text | Create your first custom ride or load a demo profile to explore your Cadence ride plan. | Configurez votre première sortie personnalisée ou chargez un profil démo pour explorer votre plan de route Cadence. |
| 817 | literal | jsx-text | Load Sample Trip (Demo) | Charger un trajet démo |

#### `src/components/home/QuickRideBuilder.tsx` (88 translatable / 88 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 611 | literal | code | Starting point | Point de départ |
| 613 | template | code | ${distanceKm} km Loop | Boucle ${distanceKm} km |
| 616 | literal | code | Work destination | Destination bureau |
| 619 | template | code | Point-to-point (${distanceKm} km) | Aller simple (${distanceKm} km) |
| 662 | literal | code | North-East turn | Cap Nord-Est |
| 663 | literal | code | South-East turn | Cap Sud-Est |
| 697 | expression | code | activeType.labelEn | activeType.labelFr |
| 699 | expression | code | activeType.labelEn | activeType.labelFr |
| 700 | expression | code | activeType.labelEn | activeType.labelFr |
| 705 | template | code | ${activeType.labelEn} planned at ${resolvedSpeedKmH} km/h${vibeBakeryStop ? ' with bakery stop' : ''}. | ${activeType.labelFr} planifiée à ${resolvedSpeedKmH} km/h${vibeBakeryStop ? ' avec pause boulangerie' : ''}. |
| 753 | literal | code | Local start | Départ local |
| 755 | template | code | ${recipe.distanceKm} km Loop | Boucle ${recipe.distanceKm} km |
| 756 | literal | code | Work destination | Destination bureau |
| 790 | expression | code | recipe.titleEn | recipe.titleFr |
| 792 | expression | code | recipe.titleEn | recipe.titleFr |
| 792 | expression | code | recipe.metaEn | recipe.metaFr |
| 813 | literal | code | Imported route | Trace importée |
| 825 | template | code | Imported GPS route (${sourceLabel}) · ${parsed.distanceKm.toFixed(1)} km | Trace GPS importée (${sourceLabel}) · ${parsed.distanceKm.toFixed(1)} km |
| 833 | literal | code | Route start | Départ trace |
| 834 | literal | code | Route finish | Arrivée trace |
| 863 | literal | code | Could not read this route file. Please verify it is a valid .gpx, .tcx, or .fit track. | Impossible de lire ce fichier. Vérifiez qu’il s’agit d’une trace .gpx, .tcx ou .fit valide. |
| 889 | expression | code | outcome.guidanceEn | outcome.guidanceFr |
| 890 | literal | code | Direct import from this link is restricted (CORS/auth). Export as .GPX and drop the file next to this box. | Import via URL impossible depuis le navigateur (CORS/accès). Exportez en .GPX et déposez le fichier ci-contre. |
| 897 | literal | code | Browser import from this URL was blocked (CORS/login). Export as .GPX and drop the file next to this box. | Import via URL impossible depuis le navigateur (CORS/accès). Exportez en .GPX et déposez le fichier juste à côté. |
| 908 | template | code | Today · ${nextHourSchedule.timeStr} | Aujourd'hui · ${nextHourSchedule.timeStr} |
| 911 | literal | code | Tomorrow · 08:00 | Demain · 08:00 |
| 914 | literal | code | Tomorrow · 09:00 | Demain · 09:00 |
| 917 | literal | code | Next weekday · 09:00 | Prochain ouvré · 09:00 |
| 920 | literal | code | Sat · 08:30 | Sam · 08:30 |
| 942 | literal | jsx-text | Bakery stop | Arrêt boulangerie |
| 956 | literal | jsx-text | Circular loop | Boucle |
| 970 | literal | jsx-text | Light pack | Sac léger |
| 977 | template | code | Custom · ${resolvedSpeedKmH} km/h | Perso · ${resolvedSpeedKmH} km/h |
| 980 | expression | code | found.labelEn | found.labelFr |
| 985 | literal | jsx-attribute:aria-label | Import Route or Quick Ride Builder | Importer une trace ou esquisser une sortie |
| 995 | literal | jsx-text | Drop a route | Importer une trace |
| 998 | literal | jsx-text | Komoot, Strava, RideWithGPS or .GPX / .FIT | Komoot, Strava, RideWithGPS ou .GPX / .FIT |
| 1009 | literal | jsx-text | Drop a route to build your ride plan | Déposez une trace pour bâtir votre plan de sortie |
| 1012 | literal | jsx-text | Paste a route link or drop a GPX — weather, water stops, and fueling computed instantly. | Lien Komoot ou fichier GPX — météo, points d’eau et ravito calculés en un instant. |
| 1028 | literal | jsx-attribute:aria-label | Paste Komoot, Bikemap, RideWithGPS or Strava link | Coller un lien Komoot, Bikemap, RideWithGPS ou Strava |
| 1030 | literal | jsx-attribute:placeholder | Paste Komoot, Strava, RideWithGPS or Bikemap link… | Coller un lien Komoot / Strava / RideWithGPS / Bikemap… |
| 1045 | literal | jsx-text | Import Link | Importer |
| 1096 | literal | jsx-text | Drop .GPX, .TCX, or .FIT | Fichier .GPX, .TCX, .FIT |
| 1099 | literal | jsx-text | Drop a .GPX, .TCX, or .FIT file here | Déposez un fichier .GPX, .TCX ou .FIT ici |
| 1104 | template | jsx-text | Loaded: ${importSuccessName} | Prêt : ${importSuccessName} |
| 1107 | literal | jsx-text | Drag & drop or browse — launches straight into your ride plan | Glissez ou parcourez — ouverture directe |
| 1120 | literal | jsx-text | Browse | Parcourir |
| 1144 | literal | jsx-text | Connect Strava | Connecter Strava |
| 1150 | literal | jsx-attribute:aria-label | Dismiss warning | Fermer l’avertissement |
| 1172 | literal | jsx-text | No route yet? Sketch a quick ride from scratch | Pas encore de trace ? Esquisser une sortie rapide |
| 1187 | literal | jsx-text | I want a | Je pars sur une |
| 1199 | expression | jsx-text | activeType.labelEn | activeType.labelFr |
| 1206 | literal | jsx-attribute:aria-label | Ride type | Type de sortie |
| 1226 | expression | jsx-text | opt.labelEn | opt.labelFr |
| 1236 | literal | jsx-text | of | de |
| 1254 | literal | jsx-attribute:aria-label | Distance | Distance |
| 1299 | literal | jsx-attribute:aria-label | Custom distance in km | Distance personnalisée en km |
| 1300 | literal | jsx-attribute:placeholder | Custom km | Perso km |
| 1325 | literal | jsx-text | arriving by | arrivée pour |
| 1328 | literal | jsx-text | leaving | prévue |
| 1352 | literal | jsx-attribute:aria-label | Target arrival schedule | Heure d’arrivée cible |
| 1355 | literal | jsx-attribute:aria-label | Departure schedule | Heure de départ |
| 1363 | literal | jsx-attribute:aria-label | Schedule mode | Mode horaire |
| 1383 | literal | jsx-text | Arrive by | Arrivée à |
| 1402 | literal | jsx-text | Depart at | Départ à |
| 1410 | literal | jsx-text | Tomorrow · 09:00 | Demain · 09:00 |
| 1414 | literal | jsx-text | Next weekday · 09:00 | Prochain ouvré · 09:00 |
| 1418 | template | jsx-text | Today · ${nextHourSchedule.timeStr} | Aujourd'hui · ${nextHourSchedule.timeStr} |
| 1424 | template | jsx-text | Today · ${nextHourSchedule.timeStr} | Aujourd'hui · ${nextHourSchedule.timeStr} |
| 1428 | literal | jsx-text | Tomorrow · 08:00 | Demain · 08:00 |
| 1432 | literal | jsx-text | Sat · 08:30 | Sam · 08:30 |
| 1462 | literal | jsx-text | Custom Date / Time | Date & heure personnalisées |
| 1490 | literal | jsx-text | at a | à un rythme |
| 1509 | literal | jsx-attribute:aria-label | Target pace | Allure cible |
| 1531 | expression | jsx-text | opt.labelEn | opt.labelFr |
| 1533 | expression | jsx-text | opt.hintEn | opt.hintFr |
| 1545 | literal | jsx-text | Custom target speed | Vitesse perso (10–45 km/h) |
| 1583 | literal | jsx-attribute:label | Start (A · optional) | Départ (A · optionnel) |
| 1586 | literal | jsx-attribute:label | Start Location (optional) | Départ (optionnel) |
| 1591 | literal | jsx-attribute:placeholder | City or trailhead (e.g. Portland, Ghent…) | Ville ou adresse (ex: Lyon, Annecy…) |
| 1610 | literal | jsx-attribute:label | Destination (B · optional) | Destination (B · optionnel) |
| 1614 | literal | jsx-attribute:placeholder | Work, station, address… | Bureau, gare, adresse… |
| 1644 | literal | jsx-text | Fine-tune | Affiner |
| 1657 | literal | jsx-text | Build Ride Plan | Créer mon plan |
| 1670 | literal | jsx-text | 1-Tap Ride Recipes | Recettes en 1 clic |
| 1673 | literal | jsx-text | Launches straight into ride plan | Ouvre le plan de sortie instantanément |
| 1692 | expression | jsx-text | recipe.titleEn | recipe.titleFr |
| 1695 | expression | jsx-text | recipe.metaEn | recipe.metaFr |

#### `src/components/home/TripCard.tsx` (3 translatable / 3 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 74 | literal | code | en | fr |
| 88 | literal | jsx-text | Commute | Vélotaf |
| 109 | literal | jsx-attribute:title | Ride readiness | Prêt à partir |

#### `src/components/home/UpcomingTripCard.tsx` (11 translatable / 11 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 54 | literal | code | en-US | fr-FR |
| 66 | literal | code | Leave today | Départ aujourd’hui |
| 70 | literal | code | Tomorrow | Demain |
| 74 | template | code | In ${diffDays} days | Dans ${diffDays} j |
| 78 | template | code | ${Math.abs(diffDays)}d ago | Passé (${Math.abs(diffDays)} j) |
| 138 | literal | code | en | fr |
| 175 | literal | jsx-text | Commute | Vélotaf |
| 188 | literal | jsx-text | ready | prêt |
| 195 | literal | jsx-attribute:title | Ride readiness | Prêt à partir |
| 221 | literal | jsx-attribute:aria-label | Edit | Modifier |
| 222 | literal | jsx-attribute:title | Edit | Modifier |

#### `src/components/home/WeatherWidget.tsx` (17 translatable / 17 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 82 | literal | code | en | fr |
| 92 | template | code | Strong gusts (${peakGust} km/h) — tricky handling on open roads. | Grosses rafales (${peakGust} km/h) — délicat sur les routes exposées. |
| 95 | literal | code | Worth picking a sheltered route or waiting for a calmer window. | Ça vaut le coup de choisir un parcours abrité ou d’attendre une accalmie. |
| 102 | template | code | This headwind adds +${windInsight.ghostElevationM} m of invisible climbing${windInsight.iconicClimbComparison ? ` (${win | Ce vent de face ajoute +${windInsight.ghostElevationM} m de montée invisible${windInsight.iconicClimbComparison ? ` (${w |
| 105 | template | code | Feels like a +${windInsight.equivalentGradePct.toFixed(1)}% climb on flat ground — spin easy early instead of fighting i | Sensation de pente à +${windInsight.equivalentGradePct.toFixed(1)} % sur le plat — démarre souple au lieu de forcer. |
| 112 | template | code | Wet tarmac likely (${weather.precipitationRiskPercent}%) — grab a light rain shell. | Routes probablement humides (${weather.precipitationRiskPercent} %) — prends un coupe-pluie. |
| 115 | literal | code | Leave a touch more room for braking and smooth corners. | Garde un peu plus de marge au freinage et dans les virages. |
| 122 | template | code | Crisp ${weather.temperatureC}°C air — warm gloves and a wind shell save the first 15 min. | Air vif (${weather.temperatureC} °C) — des gants et un coupe-vent sauveront le début. |
| 125 | literal | code | Once your legs warm up, conditions stay dry and clean. | Une fois réchauffé, les conditions restent sèches et agréables. |
| 132 | template | code | Friendly ${weather.baseWindSpeedKmH} km/h tailwind — enjoy the free speed today. | Joli vent de dos (${weather.baseWindSpeedKmH} km/h) — profite de la vitesse gratuite. |
| 135 | literal | code | Smooth, supportive riding conditions across the route. | Conditions portantes et fluides sur la majorité du parcours. |
| 141 | literal | code | Calm air and dry roads — easy excuse to take the long way. | Air calme et bitume sec — une belle excuse pour rallonger un peu. |
| 144 | template | code | Just ${effectiveWindSpeed} km/h of breeze at ${weather.temperatureC}°C — nothing fighting your legs today. | Seulement ${effectiveWindSpeed} km/h de vent et ${weather.temperatureC} °C : rien ne te freine aujourd’hui. |
| 235 | literal | jsx-text | Temperature | Température |
| 317 | literal | jsx-text | Possible wet roads · take extra braking margin | Chaussée possiblement humide · prudence dans les virages |
| 318 | literal | jsx-text | Dry road conditions expected | Chaussée sèche attendue |
| 328 | literal | jsx-text | Target pace & aero: | Allure cible & aéro : |

### components/navigation (37 translatable / 37 total across 3 files)

#### `src/components/navigation/QuickCommandModal.tsx` (13 translatable / 13 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 150 | literal | code | Commute | Vélotaf |
| 176 | literal | code | Trips hub and quick builder | Hub des sorties et météo |
| 204 | literal | code | Route, timing, style, and pace | Itinéraire, horaire, style et allure |
| 218 | literal | code | Tyres, wind, fuel, bakeries, outfit, sticker | Pneus, vent, nutrition, eau, tenue, cadre |
| 235 | expression | code | tool.shortLabelEn | tool.shortLabelFr |
| 236 | expression | code | tool.taglineEn | tool.taglineFr |
| 252 | literal | code | Start a fresh ride in Trip setup | Démarrer un nouveau trajet dans Configuration |
| 264 | literal | code | Weight, bike, tyres, and fuel setup | Poids, vélo, pneus, nutrition et profil |
| 289 | literal | code | Share ride | Partager la sortie |
| 304 | literal | code | Print cue sheet (A4) | Imprimer la feuille A4 |
| 569 | literal | jsx-text | Navigate | Naviguer |
| 571 | literal | jsx-text | Open | Ouvrir |
| 574 | literal | jsx-text | Shortcuts: 1–4 views · ⌘K | Raccourcis : 1–4 vues · ⌘K |

#### `src/components/navigation/TopTelemetryBar.tsx` (23 translatable / 23 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 289 | literal | code | Rider | Cycliste |
| 302 | literal | code | Saved on this device | Enregistré sur cet appareil |
| 467 | literal | jsx-text | Guest rider | Cycliste invité |
| 531 | literal | jsx-text | Sync your rides | Synchronisez vos sorties |
| 534 | literal | jsx-text | Keep trips, bikes and checklists on all your devices. | Retrouvez trajets, vélos et checklists sur tous vos appareils. |
| 558 | literal | jsx-text | Preferences | Préférences |
| 600 | literal | jsx-text | Ride | Sortie |
| 611 | literal | jsx-attribute:sub | Tube | Chambre |
| 629 | literal | jsx-attribute:sub | Tyres · Wind · Fuel · Bakeries · Outfit · Top-tube sticker | Pneus · Vent · Nutrition · Boulangeries · Tenue · Sticker cadre |
| 646 | literal | jsx-text | Export & share | Export & partage |
| 685 | literal | jsx-text | Universal | Universel |
| 702 | literal | jsx-text | Courses | Parcours |
| 743 | literal | jsx-text | Saved | Enregistré |
| 775 | literal | jsx-text | Share ride | Partager |
| 793 | literal | jsx-text | Print A4 | Imprimer A4 |
| 812 | literal | jsx-text | Print Top-Tube Stem Sticker | Sticker cadre imprimable (Top-Tube) |
| 826 | literal | jsx-text | Support | Assistance |
| 834 | literal | jsx-attribute:sub | Report a bug or suggest an idea | Signaler un bug ou proposer une idée |
| 945 | literal | code | All tools | Tous les outils |
| 1047 | literal | jsx-text | Search | Rechercher |
| 1060 | literal | jsx-attribute:aria-label | Settings | Réglages |
| 1133 | expression | jsx-text | activeToolMeta.shortLabelEn | activeToolMeta.shortLabelFr |
| 1189 | literal | jsx-attribute:aria-label | Settings | Réglages |

#### `src/components/navigation/TripSwitcherPanel.tsx` (1 translatable / 1 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 234 | literal | jsx-text | Commute | Vélotaf |

### components/onboarding (226 translatable / 227 total across 8 files)

#### `src/components/onboarding/OnboardingHeader.tsx` (14 translatable / 15 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 46 | literal | jsx-text | Ride planner | Planificateur de sortie |
| 53 | literal | jsx-text | Guest planning · no account needed | Planification invité · aucun compte requis |
| 59 | literal | jsx-attribute:aria-label | Language selector | Sélecteur de langue |
| 81 | template | jsx-attribute:className [non-text] | text-ink-muted hover:text-ink | ${CHIP_TOKENS['yellow-vest'].surface} ${CHIP_TOKENS['yellow-vest'].primary} ${CHIP_RING_BASE} ${CHIP_TOKENS['yellow-vest |
| 107 | literal | jsx-attribute:title | Close and dismiss | Fermer l’assistant |
| 108 | literal | jsx-attribute:aria-label | Close and dismiss | Fermer l’assistant |
| 119 | literal | jsx-text | 4 steps to your ride | 4 étapes vers votre sortie |
| 120 | literal | jsx-text | Step 1 of 4 | Étape 1 sur 4 |
| 121 | literal | jsx-text | Step 2 of 4 | Étape 2 sur 4 |
| 122 | literal | jsx-text | Step 3 of 4 | Étape 3 sur 4 |
| 123 | literal | jsx-text | Step 4 of 4 | Étape 4 sur 4 |
| 124 | literal | jsx-text | 4 of 4 · complete | 4 sur 4 · Terminé |
| 125 | literal | jsx-text | Optional · save & sync | Optionnel · Enregistrer & synchroniser |
| 172 | expression | jsx-text | item.label | item.labelFr |
| 180 | literal | jsx-text | Your ride preview is already available. This choice is not a planning step. | Votre aperçu de sortie est déjà disponible. Ce choix n’est pas une étape obligatoire. |

#### `src/components/onboarding/Screen1Welcome.tsx` (9 translatable / 9 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 18 | literal | jsx-text | Your next ride, made clear | Votre prochaine sortie, en toute clarté |
| 22 | jsx | jsx-text | ( <> Know when to leave.<br /> Enjoy the ride. </> ) | ( <> Sachez quand partir.<br /> Profitez du trajet. </> ) |
| 36 | literal | jsx-text | Choose a route and a comfortable pace. Cadence helps you estimate your ride time and plan your arrival. | Choisissez un itinéraire et une allure confortable. Cadence estime votre temps de trajet et synchronise votre heure d’ar |
| 48 | literal | jsx-text | Plan a commute, workout or day out | Planifiez un trajet vélotaf, une séance sportive ou une balade |
| 58 | literal | jsx-text | See a useful ride preview before signing up | Consultez un aperçu complet avant de créer un compte |
| 68 | literal | jsx-text | Add rider and bike details only if you want | Ajoutez votre matériel et profil uniquement si vous le souhaitez |
| 76 | literal | jsx-text | Start from scratch, or explore a short sample ride anywhere in the world. You can change every choice later. | Partez de zéro ou explorez un exemple de sortie prêt à rouler. Vous pourrez modifier chaque paramètre par la suite. |
| 87 | literal | jsx-attribute:alt | Cadence ride plan preview | Aperçu du plan de sortie Cadence |
| 92 | literal | jsx-attribute:alt | Cadence ride plan preview | Aperçu du plan de sortie Cadence |

#### `src/components/onboarding/Screen2Purpose.tsx` (11 translatable / 11 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 30 | literal | jsx-text | Ride purpose | Profil de sortie |
| 34 | literal | jsx-text | What are you riding for? | Pourquoi roulez-vous aujourd’hui ? |
| 38 | literal | jsx-text | Choose the closest fit. We’ll keep the next choices relevant to your ride. | Choisissez le profil le plus proche. Les étapes suivantes s’adapteront à votre pratique. |
| 46 | literal | jsx-attribute:aria-label | Choose ride purpose | Choisir l’objectif de votre sortie |
| 88 | expression | jsx-text | purpose.name | purpose.nameFr |
| 91 | expression | jsx-text | purpose.subtitle | purpose.subtitleFr |
| 99 | literal | jsx-text | Selected | Sélectionné |
| 112 | expression | jsx-text | activeDef.contextTitle | activeDef.contextTitleFr |
| 116 | expression | jsx-text | activeDef.contextBody | activeDef.contextBodyFr |
| 122 | template | jsx-text | ${activeDef.name} selected | ${activeDef.nameFr} sélectionné |
| 130 | literal | jsx-text | No fitness profile or technical knowledge needed. Your purpose sets up helpful choices, not a fixed riding speed. | Aucun profil sportif ni connaissance technique requise. Votre objectif adapte les options utiles, pas une vitesse imposé |

#### `src/components/onboarding/Screen3Route.tsx` (50 translatable / 50 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 156 | literal | code | en | fr |
| 267 | literal | jsx-attribute:title | Clear | Effacer |
| 285 | literal | jsx-text | Matching locations | Suggestions d’adresses |
| 286 | literal | jsx-text | Suggested cycling hubs | Pôles cyclables suggérés |
| 289 | literal | jsx-text | ↑↓ to navigate | ↑↓ pour naviguer |
| 468 | literal | code | Please enter a start location to build the loop. | Veuillez saisir un point de départ pour tracer la boucle. |
| 489 | literal | code | Out & Back | Aller-retour |
| 490 | literal | code | Loop | Boucle |
| 504 | template | code | Offline fallback: ${result.distanceKm.toFixed(1)} km geometric loop created. | Mode hors-ligne : boucle géométrique de ${result.distanceKm.toFixed(1)} km générée. |
| 507 | template | code | ${shapeOverride === 'out-and-back' ? 'Out & back' : 'Bike loop'} routed: ${result.distanceKm.toFixed(1)} km (~${Math.rou | ${shapeOverride === 'out-and-back' ? 'Aller-retour' : 'Boucle vélo'} tracé : ${result.distanceKm.toFixed(1)} km (~${Math |
| 514 | literal | code | Unable to generate a bike loop for that start point. | Impossible de générer la boucle vélo pour ce départ. |
| 532 | literal | code | Please enter both origin and destination. | Veuillez renseigner le départ et l’arrivée. |
| 562 | template | code | Route computed: ${result.distanceKm.toFixed(1)} km (~${Math.round(result.estimatedMinutes)} min) | Itinéraire calculé : ${result.distanceKm.toFixed(1)} km (~${Math.round(result.estimatedMinutes)} min) |
| 570 | literal | code | Unable to fetch automatic distance. | Impossible de calculer la distance automatique. |
| 605 | literal | jsx-text | Route | Parcours |
| 609 | literal | jsx-text | Where will you ride? | Où allez-vous rouler ? |
| 613 | literal | jsx-text | Set your start and finish, build a distance loop, or bring a route you already have. | Indiquez départ et arrivée, fixez une distance cible ou importez un fichier GPX existant. |
| 621 | literal | jsx-attribute:aria-label | Route planning modes | Modes de planification |
| 636 | literal | jsx-text | From / to | Départ / Arrivée |
| 650 | literal | jsx-text | Start + distance | Départ + distance |
| 664 | literal | jsx-text | Import GPX | Importer un GPX |
| 673 | literal | jsx-attribute:label | From | Départ |
| 677 | literal | jsx-attribute:placeholder | e.g. Girona, Portland or type city | Ex: Annecy, Lyon ou tapez une ville |
| 697 | template | jsx-attribute:label | Via Stop ${idx + 1} | Étape intermédiaire ${idx + 1} |
| 701 | literal | jsx-attribute:placeholder | e.g. Coffee stop, climb, town… | Ex: Point café, col, village… |
| 731 | literal | jsx-attribute:title | Remove stop | Supprimer cet arrêt |
| 749 | literal | jsx-text | Add intermediate stop | Ajouter un arrêt intermédiaire |
| 755 | literal | jsx-attribute:label | To | Arrivée |
| 759 | literal | jsx-attribute:placeholder | e.g. Lakeside Park, Banyoles or station | Ex: Talloires, gare, lac ou sommet |
| 777 | literal | jsx-text | Quick auto-fill routes: | Suggestions d’itinéraires rapides : |
| 822 | literal | jsx-text | Fetch distance & route | Calculer l’itinéraire & la distance |
| 846 | literal | jsx-attribute:label | Start location | Point de départ |
| 849 | literal | jsx-attribute:placeholder | Starting location | Lieu de départ |
| 862 | literal | jsx-text | Target distance | Distance cible |
| 913 | literal | jsx-text | Circular Loop | Boucle |
| 926 | literal | jsx-text | Out & Back | Aller-retour |
| 961 | literal | jsx-text | Routing bike loop… | Traçage de la boucle… |
| 968 | literal | jsx-text | Generate Out & Back Route | Tracer un aller-retour vélo |
| 971 | literal | jsx-text | Generate Bike Loop | Tracer la boucle vélo |
| 992 | literal | jsx-text | Rotate direction | Autre cap |
| 1029 | literal | jsx-text | Select GPX trace | Choisir un fichier GPX |
| 1032 | literal | jsx-text | Drag and drop or click to browse | Glissez un fichier ou cliquez pour parcourir |
| 1048 | literal | jsx-text | Route ready | Parcours prêt |
| 1053 | literal | jsx-text | Calculated for this bicycle route. | Calculé pour cet itinéraire cyclable. |
| 1071 | literal | jsx-text | Build a bike loop from Start + Distance → | Tracer une boucle depuis Départ + Distance → |
| 1077 | literal | jsx-text | Pick a start point and distance — Cadence generates a real road-snapped circular loop or out-and-back ride. | Choisissez un point de départ et une distance : Cadence trace une vraie boucle cyclable (ou un aller-retour) prête pour  |
| 1089 | literal | jsx-attribute:originLabel | Start | Départ |
| 1090 | literal | jsx-attribute:destinationLabel | Finish | Arrivée |
| 1104 | literal | jsx-text | Example route distance | Distance de l’itinéraire |
| 1111 | literal | jsx-text | Map preview of the ride corridor with cycling route line and distance. | Aperçu cartographique du trajet avec tracé cyclable et bornes kilométriques. |

#### `src/components/onboarding/Screen4TimingPace.tsx` (46 translatable / 46 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 334 | literal | code | en | fr |
| 372 | template | code | Live weather: ${weather.temperatureC}°C · Wind ${weather.windSpeedKmH} km/h ${windDir} (${weather.effectiveHeadwindKmH}  | Météo en direct : ${weather.temperatureC}°C · Vent ${weather.windSpeedKmH} km/h ${windDir} (face : ${weather.effectiveHe |
| 378 | literal | code | Simulated weather applied (14°C · Wind 12 km/h West) | Météo simulée appliquée (14°C · Vent 12 km/h Ouest) |
| 395 | literal | jsx-text | Timing & pace | Horaires & allure |
| 399 | literal | jsx-text | Arrive on your own terms. | Maîtrisez votre temps de route. |
| 403 | literal | jsx-text | Pick a time and a pace that feels right. We’ll work out when to leave. | Choisissez un horaire et une allure adaptée. Cadence calcule l’heure de départ exacte. |
| 442 | literal | jsx-text | Arrive by | Arrivée à |
| 447 | literal | jsx-text | Selected | Sélectionné |
| 480 | literal | jsx-text | Depart at | Départ à |
| 485 | literal | jsx-text | Selected | Sélectionné |
| 496 | literal | jsx-text | Ride date | Date de la sortie |
| 510 | literal | jsx-text | Arrive by · local time | Heure d’arrivée · heure locale |
| 513 | literal | jsx-text | Depart at · local time | Heure de départ · heure locale |
| 545 | literal | jsx-text | Fetch live weather forecast | Synchroniser la météo en direct |
| 560 | literal | jsx-text | Your average riding pace | Votre allure moyenne |
| 581 | template | jsx-text | Custom speed (up to ${ONBOARDING_SPEED_BOUNDS.maxKmH} km/h) | Vitesse perso (jusqu’à ${ONBOARDING_SPEED_BOUNDS.maxKmH} km/h) |
| 629 | expression | jsx-text | tier.name | tier.nameFr |
| 647 | literal | jsx-text | Custom target speed | Vitesse cible personnalisée |
| 672 | literal | jsx-attribute:aria-label | Custom target speed slider in km/h | Curseur de vitesse cible en km/h |
| 711 | literal | jsx-text | Target effort power (optional · Watts) | Puissance cible (optionnel · Watts) |
| 714 | literal | jsx-text | Leave blank to pace by speed, or enter normalized power watts. | Laissez vide pour viser la vitesse, ou entrez une cible en Watts. |
| 727 | literal | jsx-attribute:placeholder | e.g. 220 | ex: 220 |
| 751 | template | jsx-text | Custom target speed set to ${speedKmH} km/h${targetEffortWatts ? ` · target ${targetEffortWatts} W` : ''}. | Allure personnalisée calibrée à ${speedKmH} km/h${targetEffortWatts ? ` · cible ${targetEffortWatts} W` : ''}. |
| 754 | expression | jsx-text | selectedPaceDef.description | selectedPaceDef.descriptionFr |
| 764 | literal | jsx-text | Stopover, sightseeing & bike parking buffer | Pause café, visite ou déchargement · marge |
| 768 | literal | jsx-text | Camp setup, evening charging & gear buffer | Installation bivouac, recharge soir & rangement · marge |
| 772 | literal | jsx-text | Cooldown, bike check & arrival buffer | Retour au calme, rangement vélo & marge d’arrivée |
| 775 | literal | jsx-text | Time to park & get ready · commute buffer | Temps de stationnement & préparation · marge |
| 797 | literal | jsx-text | Helpful ride options | Options pour cette sortie |
| 805 | expression | jsx-attribute:label | chipDef.labelEn | chipDef.labelFr |
| 826 | literal | jsx-text | Advanced physics · optional | Physique avancée · optionnel |
| 834 | literal | jsx-text | Headwind speed | Vent effectif (face) |
| 849 | literal | jsx-text | Average gradient | Pente moyenne |
| 871 | literal | jsx-text | Your estimated timing | Votre timing estimé |
| 877 | literal | jsx-text | Distance | Distance |
| 885 | literal | jsx-text | Custom pace | Allure perso |
| 888 | template | jsx-text | ${selectedPaceDef.name} pace | Allure choisie |
| 897 | literal | jsx-text | Riding time | Temps de pédalage |
| 903 | literal | jsx-text | Buffer time | Marge de préparation |
| 910 | literal | jsx-text | Shower & changing | Douche & changement |
| 918 | literal | jsx-text | Ride options buffer | Marges options trajet |
| 936 | literal | jsx-text | Leave at | Départ à |
| 943 | literal | jsx-text | Arrive at | Arrivée à |
| 951 | template | jsx-text | Arrive at ${arriveTimeFormatted}. Park and be ready by ${readyTimeFormatted}. | Arrivée à ${arriveTimeFormatted}. Prêt pour ${readyTimeFormatted}. |
| 955 | template | jsx-text | Depart at ${leaveTimeFormatted}. Arrive at destination around ${arriveTimeFormatted}. | Départ à ${leaveTimeFormatted}. Arrivée vers ${arriveTimeFormatted}. |
| 963 | template | jsx-text | ${distanceKm.toFixed(1)} km ÷ ${speedKmH} km/h = ${ridingMinutes} min riding. Estimate excludes traffic delays, stops an | ${distanceKm.toFixed(1)} km ÷ ${speedKmH} km/h = ${ridingMinutes} min de vélo. Prévoyez une marge selon les feux et le t |

#### `src/components/onboarding/Screen5RiderBike.tsx` (44 translatable / 44 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 112 | literal | jsx-text | Rider & bike · optional | Vélo & cycliste · optionnel |
| 116 | literal | jsx-text | A little setup, only if you want. | Un peu de configuration, si vous le souhaitez. |
| 120 | literal | jsx-text | Keep these defaults or fine-tune your bike specs. You can plan this ride without a personal profile. | Conservez les réglages par défaut ou ajustez votre monture. Aucun profil personnel n’est requis. |
| 127 | literal | jsx-text | Example defaults are shown below. Adjust weights or fine-tune your bike specifications if helpful. | Les valeurs par défaut sont affichées ci-dessous. Ajustez le poids ou affinez les spécifications techniques de votre vél |
| 137 | literal | jsx-text | Rider weight | Poids du cycliste |
| 153 | literal | jsx-text | Default · adjust if useful | Par défaut · ajustable |
| 160 | literal | jsx-text | Luggage weight | Poids des bagages |
| 176 | literal | jsx-text | Default · no luggage | Par défaut · sans bagages |
| 184 | literal | jsx-text | Bike | Type de vélo |
| 196 | expression | jsx-text | currentBike.name | currentBike.nameFr |
| 208 | literal | jsx-attribute:aria-label | Bike | Type de vélo |
| 232 | expression | jsx-text | bike.name | bike.nameFr |
| 238 | literal | jsx-text | Inner tube | Chambre à air |
| 253 | literal | jsx-text | Default · choose a different bike if needed | Par défaut · choisissez un autre vélo si nécessaire |
| 268 | literal | jsx-text | Quantitative Data · Power & Watts (FTP) | Suivi quantitatif · Puissance & Watts (FTP) |
| 272 | literal | jsx-text | Sport rides default to quantitative data (g/h, Watts, Zones). Keep this on if you ride with a power meter or target watt | En sortie Sportive, l’affichage quantitatif (g/h, Watts, Zones) est activé par défaut. Activez cet interrupteur pour pil |
| 275 | literal | jsx-text | Turn this on to enable full quantitative data (Watts, FTP zones, and exact g/hr targets) instead of Fuel-First. | Activez cette option pour passer aux données quantitatives complètes (Watts, FTP et objectifs g/h précis). |
| 293 | literal | jsx-attribute:aria-label | Enable power and Watts | Activer le suivi en Watts |
| 306 | literal | jsx-text | Threshold power (FTP) | Puissance au seuil (FTP) |
| 309 | literal | jsx-text | Used for effort zones and pacing targets | Utilisé pour vos zones et cibles d’effort |
| 341 | literal | jsx-text | Fine-tune technical bike details · optional | Affiner les données techniques du vélo · optionnel |
| 357 | literal | jsx-text | Bike weight (frame + parts) | Poids du vélo (cadre + composants) |
| 380 | literal | jsx-text | Tire width | Largeur des pneus |
| 383 | literal | jsx-text | Printed on tire sidewall (or pick closest style) | Indiquée sur le flanc (ou choisissez au plus proche) |
| 394 | literal | jsx-attribute:aria-label | Tire width in mm | Largeur du pneu en mm |
| 433 | expression | jsx-text | preset.hintEn | preset.hintFr |
| 445 | literal | jsx-text | Tubeless setup | Montage Tubeless |
| 448 | literal | jsx-text | Lower pressure & pinch-flat protection | Basse pression confort & anti-pincement |
| 465 | literal | jsx-text | Tubeless Active | Tubeless Actif |
| 465 | literal | jsx-text | Inner Tube | Chambre à air |
| 472 | literal | jsx-text | Aerodynamic drag (CdA) | Traînée aérodynamique (CdA) |
| 485 | literal | jsx-text | Aero TT (0.28) | Aéro CLM (0.28) |
| 486 | literal | jsx-text | Gravel (0.38) | Gravel (0.38) |
| 487 | literal | jsx-text | Upright Urban (0.48) | Urbain relevé (0.48) |
| 494 | literal | jsx-text | Rolling resistance (Crr) | Résistance au roulement (Crr) |
| 511 | literal | jsx-text | Drivetrain efficiency | Rendement de transmission |
| 526 | literal | jsx-text | Standard (93%) | Standard (93%) |
| 527 | literal | jsx-text | Cleaned (95%) | Nettoyé (95%) |
| 528 | literal | jsx-text | Race Wax (97-98%) | Cire Course (97-98%) |
| 540 | literal | jsx-text | Your ride stays simple | Votre sortie reste simple |
| 544 | template | jsx-text | This preview uses the pace you chose. Rider and bike details don’t change your selected ${selectedSpeedKmH} km/h pace. | Cet aperçu utilise l’allure choisie (${selectedSpeedKmH} km/h). Les détails du cycliste et du vélo n’altèrent pas votre  |
| 551 | literal | jsx-text | Estimated riding time | Temps de pédalage estimé |
| 561 | literal | jsx-text | Example defaults selected | Valeurs par défaut sélectionnées |
| 567 | literal | jsx-text | Skip for now keeps these defaults and opens your ride preview. You can revisit this setup from the preview whenever you  | L’option « Passer pour l’instant » conserve ces réglages par défaut et ouvre immédiatement l’aperçu. Vous pourrez y reve |

#### `src/components/onboarding/Screen6RideReady.tsx` (27 translatable / 27 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 65 | literal | jsx-text | Step 4 of 4 · Ride preview | Étape 4 sur 4 · Aperçu de sortie |
| 69 | literal | jsx-text | Your first ride is ready. | Votre première sortie est prête. |
| 73 | template | jsx-text | A clear plan for your ${purpose ? purpose.toLowerCase() : 'ride'}. Review the estimates, make a change, or keep going wi | Un plan clair pour votre sortie ${purpose ? purpose.toLowerCase() : ''}. Vérifiez les estimations, modifiez un point ou  |
| 101 | literal | jsx-text | Edit route | Modifier le parcours |
| 120 | literal | jsx-text | Example route | Itinéraire |
| 130 | literal | jsx-text | Est. riding time | Pédalage est. |
| 140 | literal | jsx-text | Selected pace | Allure choisie |
| 149 | literal | jsx-text | Illustrative route and estimates, not turn-by-turn navigation. Check your route before riding. | Itinéraire et estimations illustratives, sans guidage pas-à-pas direct. Vérifiez votre route avant de rouler. |
| 161 | literal | jsx-text | · estimated | · estimation |
| 169 | literal | jsx-text | Edit timing | Modifier l’horaire |
| 182 | template | jsx-text | Leave ${originShort} | Départ de ${originShort} |
| 185 | template | jsx-text | ${ridingMinutes} min riding at ${speedKmH} km/h | ${ridingMinutes} min de pédalage à ${speedKmH} km/h |
| 198 | template | jsx-text | Arrive at ${destShort} | Arrivée à ${destShort} |
| 201 | template | jsx-text | ${parkingBufferMin} min to park & get ready | ${parkingBufferMin} min pour garer le vélo & se changer |
| 214 | literal | jsx-text | Ready for your day | Prêt pour votre journée |
| 218 | literal | jsx-text | Your arrive-by target | Votre objectif d’arrivée |
| 219 | literal | jsx-text | Target arrival with buffer | Arrivée finale avec marge |
| 228 | literal | jsx-text | Ready to review | Prêt pour la revue |
| 233 | literal | jsx-text | Route & timing | Parcours & horaires |
| 237 | literal | jsx-text | Set | Défini |
| 243 | literal | jsx-text | Rider & bike | Cycliste & vélo |
| 252 | literal | jsx-text | Edit setup | Modifier |
| 253 | literal | jsx-text | Defaults · Edit setup | Défauts · Modifier |
| 263 | template | jsx-text | Live weather · ${weatherSummary \|\| 'Forecast applied'} | Météo en direct · ${weatherSummary \|\| 'Prévision appliquée'} |
| 269 | literal | jsx-text | Live weather conditions factored into your ride plan. | Conditions météorologiques réelles appliquées à votre plan de route. |
| 279 | literal | jsx-text | Weather not fetched · check before you go | Météo non chargée · vérifiez avant de partir |
| 285 | literal | jsx-text | Timing excludes stops, traffic delays and weather. No live conditions have been checked. | Le timing exclut les arrêts, le trafic et la météo réelle. Aucune condition en direct n’a été chargée. |

#### `src/components/onboarding/Screen7SaveSync.tsx` (25 translatable / 25 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 44 | literal | code | Please enter your email. | Veuillez saisir votre adresse email. |
| 57 | literal | code | Magic sign-in link sent! Check your email inbox. | Lien de connexion envoyé ! Vérifiez votre boîte de réception. |
| 65 | literal | code | Password must be at least 6 characters. | Le mot de passe doit comporter au moins 6 caractères. |
| 81 | literal | code | Please enter your password. | Veuillez saisir votre mot de passe. |
| 93 | literal | code | Authentication failed. | Erreur d’authentification. |
| 105 | literal | jsx-text | Optional step | Étape optionnelle |
| 109 | literal | jsx-text | Take this ride with you. Or stay here. | Emportez cette sortie. Ou restez ici. |
| 113 | literal | jsx-text | Your ride preview is ready either way. Choose how you want to keep planning. | Votre aperçu est prêt dans les deux cas. Choisissez comment synchroniser ou enregistrer votre trajet. |
| 125 | literal | jsx-text | Save to an account | Enregistrer sur un compte |
| 129 | literal | jsx-text | Sign in or create an account right here to sync this ride to your other devices. | Connectez-vous ou créez un compte directement ici pour synchroniser ce trajet sur vos appareils. |
| 137 | literal | jsx-attribute:aria-label | Authentication mode | Mode d'authentification |
| 155 | literal | jsx-text | Create account | Créer un compte |
| 172 | literal | jsx-text | Sign in | Se connecter |
| 189 | literal | jsx-text | Email link | Lien e-mail |
| 215 | literal | jsx-text | Password | Mot de passe |
| 260 | literal | jsx-text | Create account & launch | Créer mon compte & lancer |
| 262 | literal | jsx-text | Sign in & launch | Se connecter & lancer |
| 263 | literal | jsx-text | Send sign-in link | Envoyer le lien par e-mail |
| 270 | literal | jsx-text | Your rides sync securely across your signed-in devices. | Vos sorties sont synchronisées et sauvegardées de façon sécurisée. |
| 280 | literal | jsx-text | Stay on this device | Continuer sur cet appareil |
| 284 | literal | jsx-text | Keep this ride in this browser’s local storage, without creating an account. It won’t sync to your other devices. | Conservez cette sortie dans le stockage local de ce navigateur, sans créer de compte. Elle ne sera pas synchronisée aill |
| 290 | literal | jsx-text | Clearing browser data or using private browsing may remove local rides. Another browser or device won’t have this local  | La suppression des données de navigation ou le mode privé peuvent effacer les trajets locaux. |
| 297 | literal | jsx-text | You can sign in any time later from Settings. | Vous pourrez créer un compte plus tard depuis le menu. |
| 306 | literal | jsx-text | This ride | Cette sortie |
| 309 | template | jsx-text | estimated ${ridingMinutes} min riding | estimé à ${ridingMinutes} min |

### components/print (59 translatable / 59 total across 2 files)

#### `src/components/print/PrintFlightSheet.tsx` (54 translatable / 54 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 40 | literal | code | en-US | fr-FR |
| 229 | literal | jsx-text | Multi-day itinerary | Itinéraire du séjour (étapes) |
| 232 | literal | jsx-text | stages | étapes |
| 239 | literal | jsx-text | Stage | Étape |
| 240 | literal | jsx-text | Date | Date |
| 241 | literal | jsx-text | Route | Itinéraire |
| 242 | literal | jsx-text | Distance / Elev | Distance / Déniv. |
| 243 | literal | jsx-text | Pace | Allure |
| 244 | literal | jsx-text | Cutoff | Arrivée |
| 245 | literal | jsx-text | Accommodation | Hébergement |
| 251 | template | code | Day ${stage.dayNumber} | J${stage.dayNumber} |
| 281 | literal | jsx-text | (*) Active stage detailed below in the schedule and checklist. | (*) Étape active détaillée ci-dessous (horaires et check-list). |
| 292 | literal | jsx-text | Accommodation: | Hébergement : |
| 343 | literal | jsx-text | units/h | unités/h |
| 344 | literal | jsx-text | Steady rhythm | Rythme régulier |
| 350 | literal | jsx-text | fuel units / hr | unités ravito / h |
| 351 | literal | jsx-text | Steady hydration | Hydratation régulière |
| 359 | literal | jsx-text | Weather conditions: | Conditions météo : |
| 360 | literal | jsx-text | Wind | Vent |
| 361 | literal | jsx-text | Visibility | Visibilité |
| 364 | literal | jsx-text | Lighting note: | Éclairage conseillé : |
| 366 | literal | jsx-text | 800–1000 lm beam & reflective vest | Feu 800–1000 lm et gilet haute visibilité |
| 367 | literal | jsx-text | Daytime safety light | Feu de jour conseillé |
| 427 | literal | jsx-text | saved stop | arrêt enregistré |
| 428 | literal | jsx-text | saved stops | arrêts enregistrés |
| 450 | literal | code | Water | Point d'eau |
| 452 | literal | code | Cemetery | Cimetière |
| 454 | literal | code | Food | Alimentation |
| 456 | literal | code | Essential | Essentiel |
| 458 | literal | code | Train Bailout | Gare (Repli) |
| 459 | literal | code | Bike shop | Atelier vélo |
| 466 | template | jsx-text | ${catLabel}: | ${catLabel} : |
| 470 | literal | jsx-text | On route | Sur l’itinéraire |
| 491 | literal | jsx-text | Unpaved & Technical Surface Sectors | Secteurs non asphaltés & techniques |
| 496 | template | jsx-text | ${surfaceBreakdown.pavedPct}% paved · ${surfaceBreakdown.gravelPct}% gravel · ${surfaceBreakdown.singletrackPct}% trail  | ${surfaceBreakdown.pavedPct}% bitume · ${surfaceBreakdown.gravelPct}% gravel · ${surfaceBreakdown.singletrackPct}% senti |
| 505 | literal | jsx-text | Sector km | Secteur km |
| 508 | literal | jsx-text | Surface | Revêtement |
| 511 | literal | jsx-text | Surface advisory | Recommandation terrain |
| 525 | template | jsx-text | ${seg.nameEn}: | ${seg.nameFr} : |
| 526 | expression | jsx-text | seg.riderNoteEn | seg.riderNoteFr |
| 540 | literal | jsx-text | Water Gap & Hydration Depletion Alerts | Alertes autonomie hydrique (zones sans eau) |
| 545 | template | jsx-text | Onboard: ${effectiveSpecs.frameBottleSlots ?? 2}×${effectiveSpecs.bidonSizeMl ?? 650} mL | Portage : ${effectiveSpecs.frameBottleSlots ?? 2}×${effectiveSpecs.bidonSizeMl ?? 650} mL |
| 554 | literal | jsx-text | Alert | Niveau |
| 557 | literal | jsx-text | Span | Portion |
| 560 | literal | jsx-text | Depletion & Advice | Déplétion & Consigne |
| 569 | literal | jsx-text | CRITICAL | CRITIQUE |
| 572 | literal | jsx-text | CAUTION | VIGILANCE |
| 639 | literal | jsx-text | Climb Splits & Fueling Checkpoints (Climb-Adjusted) | Cols & Points de Ravitaillement (Allure ajustée) |
| 648 | literal | jsx-text | Cat | Cat. |
| 649 | literal | jsx-text | Climb | Ascension |
| 651 | literal | jsx-text | Gain / Grade | D+ / Pente |
| 652 | literal | jsx-text | Target Power | Puissance cible |
| 653 | literal | jsx-text | ETA / Dur. | ETA / Durée |
| 654 | literal | jsx-text | Fueling Cue | Ravitaillement |

#### `src/components/print/TopTubeStickerSheet.tsx` (5 translatable / 5 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 146 | literal | jsx-text | Tape with clear tape | Coller + scotch clair |
| 177 | literal | jsx-text | Top-Tube Stem Sticker | Sticker Cadre / Potence |
| 180 | template | jsx-text | Print at 100% scale (actual size · ${preset.dimLabel}). Cut along the dashed line and seal onto your top tube with clear | Imprimer à 100 % (taille réelle · ${preset.dimLabel}). Découper sur les pointillés et fixer sur le tube supérieur avec d |
| 187 | literal | jsx-text | 2 copies | 2 exemplaires |
| 202 | literal | jsx-text | Scale check (should measure exactly 5 cm) | Repère d’échelle (doit mesurer exactement 5 cm) |

### components/settings (119 translatable / 119 total across 2 files)

#### `src/components/settings/PantryBuilderSection.tsx` (24 translatable / 24 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 340 | expression | code | resolvedPantry.preRide.nameEn | resolvedPantry.preRide.nameFr |
| 349 | expression | code | resolvedPantry.onBikeLiquid.nameEn | resolvedPantry.onBikeLiquid.nameFr |
| 361 | expression | code | s.nameEn | s.nameFr |
| 371 | expression | code | resolvedPantry.postRide.nameEn | resolvedPantry.postRide.nameFr |
| 463 | expression | jsx-text | item.nameEn | item.nameFr |
| 476 | expression | jsx-text | item.portionLabelEn | item.portionLabelFr |
| 496 | literal | jsx-attribute:aria-label | Delete | Supprimer |
| 496 | expression | jsx-attribute:aria-label | item.nameEn | item.nameFr |
| 555 | literal | jsx-text | Active | Actif |
| 624 | literal | jsx-text | Liquid | Liquide |
| 624 | literal | jsx-text | Solids | Solide |
| 646 | literal | jsx-text | Liquid | Liquide |
| 648 | literal | jsx-text | Liquid | Liquide |
| 787 | literal | jsx-text | 1 to 3 items | 1 à 3 choix |
| 790 | literal | jsx-text | Select 1 | 1 choix |
| 806 | literal | jsx-text | All | Tous |
| 874 | literal | jsx-text | Add your own bar, gel, bottle mix, or homemade snack | Ajoutez votre propre barre, gel, boisson ou collation maison |
| 1023 | literal | jsx-text | Portion size | Taille de portion |
| 1028 | literal | jsx-text | 1 unit | 1 unité |
| 1028 | literal | jsx-text | Snack | Collation |
| 1029 | literal | jsx-text | 2 units | 2 unités |
| 1029 | literal | jsx-text | Regular | Moyenne |
| 1030 | literal | jsx-text | 3 units | 3 unités |
| 1030 | literal | jsx-text | Full meal | Repas |

#### `src/components/settings/RiderBikeSpecsModal.tsx` (95 translatable / 95 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 385 | literal | jsx-text | Rider profile & settings | Profil cycliste & réglages |
| 399 | literal | jsx-text | Pro view | Vue pro |
| 401 | literal | jsx-text | Guided | Guidé |
| 402 | literal | jsx-text | Guided | Guidé |
| 424 | literal | jsx-attribute:aria-label | Settings sections | Sections des réglages |
| 439 | literal | jsx-text | Rider & View | Cycliste & Vue |
| 453 | template | jsx-text | Bikes (${localSpecs.bikes.length}) | Vélos (${localSpecs.bikes.length}) |
| 467 | literal | jsx-text | Snacks & Drinks | Ravitaillement |
| 484 | literal | jsx-text | Rider, view & effort style | Cycliste, affichage & rythme |
| 487 | literal | jsx-text | Display detail, riding experience, optional watts and fueling comfort | Mode d’affichage, expérience, puissance en watts et nutrition |
| 499 | literal | jsx-text | snacks/h | collations/h |
| 503 | literal | jsx-text | Steady rhythm | Rythme régulier |
| 517 | literal | jsx-text | Ride plan detail | Affichage du plan de sortie |
| 532 | literal | jsx-text | Guided view | Vue guidée |
| 550 | literal | jsx-text | Pro mode (Data) | Mode Pro (Données) |
| 558 | literal | jsx-text | How you pace your effort | Mesure de l’effort |
| 572 | literal | jsx-text | By effort feel | Aux sensations |
| 585 | literal | jsx-text | Power / Watts (FTP) | Puissance (Watts / FTP) |
| 595 | literal | jsx-text | Rider name | Prénom / Nom du cycliste |
| 604 | literal | jsx-attribute:placeholder | e.g. Mauricio | ex. Mauricio |
| 612 | literal | jsx-text | Rider experience profile | Profil d’expérience cycliste |
| 618 | literal | jsx-text | Occasional | Occasionnel |
| 621 | literal | jsx-text | Guided · 40 g/h | Guidé · 40 g/h |
| 625 | literal | jsx-text | Guided · ~2/h | Guidé · ~2/h |
| 628 | literal | jsx-text | Guided · Relaxed | Guidé · Balade |
| 634 | literal | jsx-text | Regular | Régulier |
| 637 | literal | jsx-text | Endurance · 60 g/h | Endurance · 60 g/h |
| 641 | literal | jsx-text | Endurance · ~3/h | Endurance · ~3/h |
| 644 | literal | jsx-text | Endurance · Steady | Endurance · Régulier |
| 650 | literal | jsx-text | Sportive | Performance |
| 653 | literal | jsx-text | High-output · 90 g/h | Intensif · 90 g/h |
| 657 | literal | jsx-text | High-output · ~4/h | Intensif · ~4/h |
| 660 | literal | jsx-text | Sport · Brisk | Sport · Soutenu |
| 761 | literal | jsx-text | Don't know your FTP? Estimate from your weight: | Pas de capteur de puissance ? Estimez votre FTP : |
| 771 | literal | jsx-text | Hide | Masquer |
| 771 | literal | jsx-text | Estimate FTP | Estimer FTP |
| 779 | template | jsx-text | FTP is your 1-hour sustainable pedal power. Based on ${localSpecs.riderWeightKg \|\| 68} kg: | La FTP est la puissance max soutenable 1 h. Basé sur ${localSpecs.riderWeightKg \|\| 68} kg : |
| 788 | literal | jsx-text | Casual / Touring | Balade / Loisir |
| 793 | literal | jsx-text | Active club | Cycliste régulier |
| 798 | literal | jsx-text | Trained / Sportive | Entraîné / Sportif |
| 912 | literal | jsx-text | Carbohydrate intake target | Capacité d’assimilation glucidique |
| 918 | literal | jsx-text | Gentle on the stomach · easy digestion | Estomac doux · zéro surcharge digestive |
| 922 | literal | jsx-text | Balanced endurance · multi-hour rides | Endurance équilibrée · sorties longues |
| 925 | literal | jsx-text | High intake · sustained sporty efforts | Haute assimilation · rythme sportif soutenu |
| 948 | literal | jsx-attribute:aria-label | Carbohydrates per hour | Glucides par heure |
| 954 | literal | jsx-text | 35 g Gentle | 35 g Doux |
| 955 | literal | jsx-text | 50 g Touring | 50 g Rando |
| 956 | literal | jsx-text | 65 g Steady | 65 g Sport |
| 957 | literal | jsx-text | 90 g Sportive | 90 g Pro |
| 1001 | literal | jsx-text | snacks/h | collations/h |
| 1011 | literal | jsx-text | Gentle · ~2/h | Doux · ~2/h |
| 1016 | literal | jsx-text | Balanced · ~3/h | Équilibré · ~3/h |
| 1021 | literal | jsx-text | High intake · ~4/h | Intensif · ~4/h |
| 1064 | literal | jsx-text | Rhythm & hydration cues | Régularité & hydratation |
| 1093 | literal | jsx-text | Customize snacks, bottles & diet preferences | Personnaliser vos collations & boissons |
| 1104 | literal | jsx-text | Connected Apps | Applications connectées |
| 1108 | template | jsx-text | Strava connected (${stravaStatus.athleteName \|\| 'Rider'}) — direct route import enabled | Strava connecté (${stravaStatus.athleteName \|\| 'Athlète'}) — import direct des parcours |
| 1111 | literal | jsx-text | Connect Strava to import route links directly in 1 click. | Connectez Strava pour importer vos liens de parcours en 1 clic. |
| 1118 | literal | jsx-text | Strava import isn’t enabled on this server yet — export a .GPX/.FIT from Strava instead. | L’import Strava n’est pas encore activé sur ce serveur — importez un fichier .GPX/.FIT depuis Strava. |
| 1121 | template | jsx-text | Strava connection failed (${stravaStatus.error}). | Connexion Strava interrompue (${stravaStatus.error}). |
| 1140 | literal | jsx-text | Disconnect | Déconnecter |
| 1149 | literal | jsx-text | Connect Strava | Connecter Strava |
| 1179 | template | jsx-text | Connect ${label} | Connecter ${label} |
| 1207 | literal | jsx-text | Tires, weight, bottle setup and optional bike physics settings | Pneus, poids, bidons et réglages avancés du vélo |
| 1264 | literal | jsx-text | Tube | Chambre |
| 1293 | literal | jsx-text | Bike style | Type de vélo |
| 1296 | literal | jsx-text | Sets smart defaults | Adapte les valeurs par défaut |
| 1302 | literal | jsx-text | Road | Route |
| 1304 | literal | jsx-text | City | Ville |
| 1305 | literal | jsx-text | Tour | Rando |
| 1306 | literal | jsx-text | MTB | VTT |
| 1335 | literal | jsx-text | Tires & width | Largeur & montage des pneus |
| 1338 | literal | jsx-text | Printed on the tire sidewall (e.g. 28 or 38), or pick closest | Indiqué sur le flanc (ex. 28 ou 38), ou choisissez au plus proche |
| 1349 | literal | jsx-attribute:aria-label | Tire width in mm | Largeur du pneu en mm |
| 1395 | expression | jsx-text | preset.hintEn | preset.hintFr |
| 1408 | literal | jsx-text | Inner tube or Tubeless? | Chambre à air ou Tubeless ? |
| 1414 | literal | jsx-attribute:aria-label | Tyre pressure unit | Unité pression pneus |
| 1443 | literal | jsx-text | No tube · supple ride | Sans chambre · basse pression |
| 1447 | literal | jsx-text | Inner tube | Chambre à air |
| 1448 | literal | jsx-text | Most common · classic | Le plus courant · simple |
| 1474 | literal | jsx-text | Not sure? Most city and entry-level bikes use inner tubes. | Pas sûr ? La plupart des vélos de ville ou loisir ont une chambre à air. |
| 1510 | literal | jsx-text | Bottle size | Volume bidon |
| 1542 | literal | jsx-text | Frame cages | Porte-bidons cadre |
| 1584 | literal | jsx-text | Advanced tire & aero settings (optional) | Réglages avancés (carcasse · hookless · Crr · CdA) |
| 1603 | literal | jsx-text | Tire casing | Carcasse du pneu |
| 1606 | literal | jsx-text | Race supple vs reinforced | Souple vs renforcée |
| 1612 | literal | jsx-text | Supple | Souple |
| 1614 | literal | jsx-text | Reinforced | Renforcée |
| 1644 | literal | jsx-text | Hookless rims | Jantes Hookless (sans crochets) |
| 1647 | literal | jsx-text | Caps pressure at 5.0 bar ETRTO limit | Plafonne la pression à 5,0 bar (ETRTO) |
| 1663 | literal | jsx-text | Hookless (5 bar) | Hookless (5 bar) |
| 1666 | literal | jsx-text | Hooked | Standard |
| 1688 | literal | jsx-text | Fast | Rapide |
| 1689 | literal | jsx-text | Mixed | Mixte |
| 1690 | literal | jsx-text | Rugged | Robuste |

### components/tools (311 translatable / 311 total across 10 files)

#### `src/components/tools/FreeWebToolsView.tsx` (11 translatable / 11 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 247 | literal | jsx-text | Going somewhere? | Une sortie en vue ? |
| 250 | literal | jsx-text | Try this Multi-Tool for your next bike ride so you can be fully prepared. No accounts, 100% private, bespoke to you. | Essaie ce Multi-Tool pour préparer ta prochaine sortie vélo. Sans compte, 100 % privé, pensé pour toi. |
| 278 | expression | jsx-text | card.questionEn | card.questionFr |
| 284 | expression | jsx-text | card.captionEn | card.captionFr |
| 311 | literal | jsx-text | Want a cheat sheet taped to your top tube? | Envie d’un pense-bête scotché sur ton cadre ? |
| 316 | literal | jsx-text | Printable | Imprimable |
| 320 | literal | jsx-text | Print a real-size top-tube stem sticker with your climbs, chosen bakeries, water taps, and cues. | Créez un sticker cadre à taille réelle (cols, points d’eau, boulangeries et rappels) prêt à imprimer et découper. |
| 334 | literal | jsx-text | Every calculation runs locally in your browser · Free live weather & map engines built in. | Tous les calculs tournent localement sur ton appareil · Météo et cartes en direct gratuites. |
| 368 | literal | jsx-text | All tools | Tous les outils |
| 396 | expression | jsx-text | item.pillEn | item.pillFr |
| 428 | expression | jsx-text | currentMeta.questionEn | currentMeta.questionFr |

#### `src/components/tools/FuelPlanTool.tsx` (40 translatable / 40 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 321 | template | code | Bike Ride Fuel Grocery List (${hoursLabel} · ${tempC}°C${weatherLocation ? ` · ${weatherLocation}` : ''}) — Cadence | Liste ravitaillement vélo (${hoursLabel} · ${tempC} °C${weatherLocation ? ` · ${weatherLocation}` : ''}) — Cadence |
| 383 | literal | jsx-text | What to eat & drink on your ride — real food first | Combien manger et boire à vélo — sans gels imposés |
| 388 | literal | jsx-text | Pull live forecast temperatures for your ride time to calibrate sweat rate and bottles, then set your time and pace. | Charge la météo de ta ville pour calibrer tes bidons et ta transpiration, puis règle ta durée et ton allure. |
| 411 | literal | jsx-text | Riding time | Durée sur la selle |
| 441 | template | jsx-text | Temperature (${weatherLocation}) · Adjust manually | Température (${weatherLocation}) · Ajuster manuellement |
| 444 | literal | jsx-text | Or set forecast temperature manually | Ou régler la température manuellement |
| 464 | template | jsx-text | Temp (${weatherLocation}) | Température (${weatherLocation}) |
| 467 | literal | jsx-text | Forecast temp | Température prévue |
| 494 | literal | jsx-text | Effort level | Intensité prévue |
| 512 | expression | jsx-text | preset.labelEn | preset.labelFr |
| 515 | expression | jsx-text | preset.subEn | preset.subFr |
| 526 | literal | jsx-text | Fuel style | Style de ravitaillement |
| 547 | expression | jsx-text | opt.en | opt.fr |
| 553 | expression | jsx-text | FUEL_STYLE_DESCRIPTIONS[fuelPref].en | FUEL_STYLE_DESCRIPTIONS[fuelPref].fr |
| 561 | literal | jsx-text | Bottle size | Taille des bidons |
| 581 | literal | jsx-text | Cages on bike | Porte-bidons sur le vélo |
| 604 | literal | jsx-text | Dietary needs (optional) | Filtres alimentaires (optionnel) |
| 623 | expression | jsx-text | chip.labelEn | chip.labelFr |
| 637 | literal | jsx-text | Your fueling blueprint | Ton plan carburant |
| 648 | literal | jsx-text | Carbs / hr | Glucides / h |
| 656 | literal | jsx-text | Water only | Eau seule |
| 659 | literal | jsx-text | total | total |
| 666 | literal | jsx-text | Bottles | Bidons |
| 674 | template | jsx-text | + ${plan.hydration.plannedRefillBidons} refill(s) | + ${plan.hydration.plannedRefillBidons} recharge(s) |
| 677 | literal | jsx-text | No refill needed | Sans recharge |
| 686 | literal | jsx-text | Rhythm | Rythme |
| 693 | literal | jsx-text | Regular sips | Gorgées régulières |
| 696 | template | jsx-text | Bite / ${plan.eatEveryMin} min | Bouchée / ${plan.eatEveryMin} min |
| 709 | template | jsx-text | ~${plan.estimatedTotalKcal.toLocaleString()} kcal burned (≈ ${plan.croissantsEarned} croissant${plan.croissantsEarned >= | ~${plan.estimatedTotalKcal.toLocaleString()} kcal brûlées (≈ ${plan.croissantsEarned} croissant${plan.croissantsEarned > |
| 715 | template | jsx-text | ~${plan.totalSweatLiters} L sweat lost | ~${plan.totalSweatLiters} L de sueur |
| 724 | literal | jsx-text | Under 45 min, your stored energy is plenty — bring one water bottle, no gels needed. | Sous 45 min, tes réserves suffisent largement — prends juste un bidon d’eau, pas besoin de gel. |
| 736 | literal | jsx-text | Before you roll out | Avant le départ |
| 742 | literal | jsx-text | In your pockets & bottles | Dans tes poches & bidons |
| 748 | literal | jsx-text | After the ride (recovery) | À l’arrivée (récupération) |
| 786 | literal | jsx-text | Electrolyte target | Sodium recommandé |
| 808 | literal | jsx-text | Grocery list copied! | Liste de courses copiée ! |
| 811 | literal | jsx-text | Copy grocery list | Copier la liste de courses |
| 820 | literal | jsx-text | Copied to clipboard: | Copié dans ton presse-papiers : |
| 826 | literal | jsx-text | Hide | Masquer |
| 843 | literal | jsx-text | Open full Ride Plan in Cadence (Free) | Ouvrir le plan complet dans Cadence (Gratuit) |

#### `src/components/tools/LeaveByTool.tsx` (22 translatable / 22 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 51 | literal | code | Home | Départ |
| 52 | literal | code | Target | Arrivée |
| 61 | literal | code | Arrival | Rendez-vous |
| 84 | literal | code | Target | Rendez-vous |
| 112 | literal | jsx-text | Count backwards with live wind & buffers | Calcule ton heure de départ exacte |
| 117 | literal | jsx-text | Pull live wind for your city to account for real headwind slowdown, plus shower, lock-up, and coffee buffers. | Charge le vent réel dans ta ville pour estimer le ralentissement, puis ajoute tes marges douche, cadenas ou café. |
| 142 | literal | jsx-text | Distance | Distance |
| 160 | literal | jsx-text | Usual speed | Ton allure habituelle |
| 180 | literal | jsx-text | Lock bike, shower & change | Douche / changement / cadenas |
| 198 | literal | jsx-text | Coffee stop / extra buffer | Pause café / marge sécurité |
| 226 | template | jsx-text | Live wind (${liveLocation}) · Adjust manually | Vent prévu (${liveLocation}) · Ajuster manuellement |
| 229 | literal | jsx-text | Or set headwind manually | Ou régler le vent de face manuellement |
| 249 | literal | jsx-text | Headwind | Vent de face |
| 272 | literal | jsx-text | Recommended leave-by time | Heure de départ conseillée |
| 279 | literal | jsx-text | Roll out no later than | Pars au plus tard à |
| 285 | literal | jsx-text | riding | roulé |
| 287 | template | jsx-text |  (incl. +${leaveBy.windPenaltyMin} min wind) |  (dont +${leaveBy.windPenaltyMin} min vent) |
| 297 | literal | jsx-text | Effective speed | Vitesse réelle |
| 305 | literal | jsx-text | Buffers included | Marges incluses |
| 320 | template | code | ${distanceKm} km Commute | Trajet ${distanceKm} km |
| 328 | literal | code | Commute | Vélotaf |
| 337 | literal | jsx-text | Open full Ride Plan in Cadence | Ouvrir le plan complet dans Cadence |

#### `src/components/tools/LoopWindFlipperTool.tsx` (78 translatable / 78 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 124 | literal | code | Could not fetch live sector weather for this route. | Impossible de récupérer la météo sur ce parcours. |
| 133 | literal | code | Live wind forecast temporarily unavailable. | Prévision météo temporairement indisponible. |
| 189 | literal | code | Clockwise | Sens horaire |
| 193 | literal | code | Counter-clockwise | Sens anti-horaire |
| 196 | literal | code | Original direction | Sens original |
| 202 | literal | code | Counter-clockwise | Sens anti-horaire |
| 206 | literal | code | Clockwise | Sens horaire |
| 209 | literal | code | Reversed direction | Sens inversé |
| 253 | literal | jsx-text | Flip a loop GPX (CW vs. CCW) | Comparer les 2 sens d’une boucle (GPX) |
| 256 | literal | jsx-text | Drop a loop to see which direction gives a tailwind home | Déposez une boucle pour éviter le vent de face au retour |
| 275 | literal | jsx-text | No GPX? Check today’s wind & best direction | Pas de GPX ? Vent du jour & côte invisible |
| 280 | literal | jsx-text | Live city wind compass, invisible hill grade & time impact | Boussole vent en direct, pente équivalente & temps perdu |
| 299 | literal | jsx-attribute:stepBadge | Step 1 | Étape 1 |
| 313 | literal | jsx-text | Step 2 | Étape 2 |
| 316 | literal | jsx-text | When are you rolling out? | Tu pars quand et à quelle allure ? |
| 332 | literal | jsx-text | Compare CW vs. CCW | Comparer les 2 sens |
| 340 | literal | jsx-text | Ride date | Date de la sortie |
| 351 | literal | jsx-text | Start time | Heure de départ |
| 362 | literal | jsx-text | Target pace | Allure cible |
| 382 | literal | jsx-text | Sampling hourly wind along both loop directions… | Analyse du vent heure par heure dans les deux sens… |
| 402 | literal | jsx-text | Never suffer a brutal headwind on the final kilometers home | Ne finis plus jamais tes derniers kilomètres vent de face |
| 407 | literal | jsx-text | Drop a loop GPX or link above and Cadence automatically tests clockwise vs. counter-clockwise wind at your exact arrival | Importe une boucle GPX ci-dessus pour comparer le sens horaire et anti-horaire heure par heure. Pas de fichier sous la m |
| 420 | literal | jsx-text | No GPX? Check best direction in my city | Pas de GPX ? Voir la meilleure direction dans ma ville |
| 447 | literal | jsx-text | Seasonal estimate (>14 days out) | Estimation saisonnière (>14 j) |
| 450 | literal | jsx-text | Hourly sector wind verdict | Verdict météo horaire par secteur |
| 457 | literal | jsx-text | Balanced wind in both directions | Vent équilibré dans les deux sens |
| 461 | template | jsx-text | Flip the loop (${reverseLabel}) | Inversez la boucle (${reverseLabel}) |
| 464 | template | jsx-text | Keep this direction (${forwardLabel}) | Gardez ce sens (${forwardLabel}) |
| 470 | literal | jsx-text | Less than 2 min difference — pick whichever way puts your climbs or coffee stop where you want. | Moins de 2 minutes d’écart entre les deux sens — choisis selon tes bosses ou tes cafés. |
| 474 | template | jsx-text | Saves roughly ${minutesSaved} min and ${wattsSaved} W average effort over ${loadedRoute.parsed.distanceKm.toFixed(1)} km | Économise environ ${minutesSaved} min et ${wattsSaved} W d’effort moyen sur ${loadedRoute.parsed.distanceKm.toFixed(1)}  |
| 478 | template | jsx-text | Saves roughly ${wattsSaved} W average effort over ${loadedRoute.parsed.distanceKm.toFixed(1)} km. | Économise environ ${wattsSaved} W d’effort moyen sur ${loadedRoute.parsed.distanceKm.toFixed(1)} km. |
| 481 | template | jsx-text | Saves roughly ${minutesSaved} min over ${loadedRoute.parsed.distanceKm.toFixed(1)} km. | Économise environ ${minutesSaved} min sur ${loadedRoute.parsed.distanceKm.toFixed(1)} km. |
| 495 | literal | jsx-text | Saved | Gagné |
| 503 | literal | jsx-text | Effort | Effort |
| 543 | literal | jsx-text | Better wind | Meilleur vent |
| 551 | literal | jsx-text | Moving time | Temps roulé |
| 560 | literal | jsx-text | Avg effort | Effort moy. |
| 574 | literal | jsx-text | Wind by route sector (original direction) | Vent par secteur (sens original) |
| 598 | literal | jsx-text | Head | Face |
| 600 | literal | jsx-text | Tail | Dos |
| 601 | literal | jsx-text | Cross | Travers |
| 622 | literal | jsx-text | Open full Ride Plan (flipped direction) | Ouvrir le plan complet (boucle inversée) |
| 625 | literal | jsx-text | Open full Ride Plan in Cadence | Ouvrir le plan complet dans Cadence |
| 646 | literal | jsx-text | What invisible hill is today’s wind creating? | Quel mur invisible le vent crée-t-il aujourd’hui ? |
| 651 | literal | jsx-text | Pull live wind for your city to see which way to head out for a tailwind home, and what today’s wind really feels like i | Charge la météo de ta ville pour savoir dans quel sens partir (vent de dos au retour) et voir ce que le vent coûte vraim |
| 682 | expression | jsx-text | p.labelEn | p.labelFr |
| 692 | literal | jsx-text | Ride distance | Distance |
| 710 | literal | jsx-text | Your usual speed | Ton allure habituelle |
| 730 | literal | jsx-text | Which way are you heading out? | Tu pars dans quel sens ? |
| 757 | expression | jsx-text | opt.labelEn | opt.labelFr |
| 776 | literal | jsx-text | Tweak wind or rider weight manually | Simuler un autre vent ou ajuster ton poids |
| 779 | literal | jsx-text | Or set wind & rider weight manually | Ou régler le vent et ton poids manuellement |
| 800 | literal | jsx-text | Wind relative to your bike | Orientation du vent par rapport à toi |
| 813 | expression | jsx-text | a.labelEn | a.labelFr |
| 824 | literal | jsx-text | Wind | Vent |
| 825 | literal | jsx-text | Wind speed | Force du vent |
| 845 | literal | jsx-text | Rider weight | Ton poids |
| 870 | literal | jsx-text | The Invisible Hill effect | L’effet côte invisible |
| 875 | literal | jsx-text | gusts | raf. |
| 892 | template | jsx-text | Head out ${windInsight.outboundIntoWindCardinal} → roll home with a ${windInsight.returnTailwindCardinal} tailwind | Pars vers ${windInsight.outboundIntoWindCardinal} → rentre vent de dos (${windInsight.returnTailwindCardinal}) |
| 897 | template | jsx-text | In ${liveLocation}, wind blows from the ${windInsight.outboundIntoWindCardinal} (${windSpeedKmH} km/h). Face it early wh | À ${liveLocation}, le vent souffle de ${windInsight.outboundIntoWindCardinal} (${windSpeedKmH} km/h). Affronte-le à l’al |
| 911 | literal | jsx-text | On flat ground, this wind feels like climbing: | Sur le plat, ce vent donne la sensation de grimper : |
| 915 | literal | jsx-text | Free tailwind push — feels like rolling downhill: | Coup de pouce gratuit — sensation de descente : |
| 918 | literal | jsx-text | Flat-road impact: | Impact sur le plat : |
| 926 | literal | jsx-text | grade | de pente |
| 971 | template | jsx-text | = +${windInsight.ghostElevationM} m of ghost climbing across your ${distanceKm} km | = +${windInsight.ghostElevationM} m de dénivelé fantôme sur tes ${distanceKm} km |
| 974 | template | jsx-text | = ${Math.abs(windInsight.ghostElevationM)} m of free downhill across your ${distanceKm} km | = ${Math.abs(windInsight.ghostElevationM)} m de descente gratuite sur tes ${distanceKm} km |
| 991 | literal | jsx-text | At your normal effort | À ton effort habituel |
| 1008 | template | jsx-text | +${windInsight.timeDeltaMin} min slower (${formatMin(windInsight.sameEffortTimeMin)} vs ${formatMin(windInsight.calmTime | +${windInsight.timeDeltaMin} min de plus (${formatMin(windInsight.sameEffortTimeMin)} vs ${formatMin(windInsight.calmTim |
| 1012 | template | jsx-text | ${Math.abs(windInsight.timeDeltaMin)} min faster (${formatMin(windInsight.sameEffortTimeMin)} vs ${formatMin(windInsight | ${Math.abs(windInsight.timeDeltaMin)} min gagnées (${formatMin(windInsight.sameEffortTimeMin)} vs ${formatMin(windInsigh |
| 1015 | template | jsx-text | Same ride time (${formatMin(windInsight.calmTimeMin)}) | Temps identique (${formatMin(windInsight.calmTimeMin)}) |
| 1026 | literal | jsx-text | Extra burned by wind alone | Brûlé en plus par le vent seul |
| 1029 | literal | jsx-text | Energy saved by tailwind | Économisé grâce au vent de dos |
| 1046 | template | jsx-text | Total ride burn: ${windInsight.totalRideKcal} kcal (${windInsight.calmRideKcal} calm) | Total sortie : ${windInsight.totalRideKcal} kcal (${windInsight.calmRideKcal} sans vent) |
| 1057 | template | jsx-text | Pushing through air: ${windInsight.airResistanceSharePct}% of your total effort | Résistance de l’air : ${windInsight.airResistanceSharePct} % de ton effort |
| 1062 | literal | jsx-text | How much of your pedaling goes strictly into fighting the wind (the rest is tyre rolling). | Part de ton pédalage consacrée uniquement à fendre le vent (le reste étant les pneus). |
| 1070 | literal | jsx-text | Power meter: | Capteur puissance : |
| 1098 | literal | jsx-text | Open full Ride Plan in Cadence | Ouvrir le plan complet dans Cadence |

#### `src/components/tools/StemStickerTool.tsx` (42 translatable / 42 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 77 | literal | code | Sunday Coffee Loop | Sortie du dimanche |
| 86 | literal | code | Roll out | Départ |
| 89 | literal | code | Finish | Arrivée |
| 124 | literal | code | Roll out | Départ |
| 125 | literal | code | Finish | Arrivée |
| 202 | literal | code | My Bike Ride | Ma sortie vélo |
| 210 | literal | code | Roll out | Départ |
| 211 | literal | code | Finish | Arrivée |
| 302 | literal | jsx-text | Customize your top-tube cheat sheet | Personnalise ton pense-bête de cadre |
| 307 | literal | jsx-text | Edit the title, numbers, and exact stops you want, print at 100%, cut along the dashed border, and seal onto your top tu | Modifie librement le titre, les chiffres et tes repères, imprime à 100 %, découpe et fixe sur le tube supérieur avec du  |
| 317 | literal | jsx-text | Sticker header (editable) | En-tête du sticker (modifiable) |
| 325 | literal | jsx-attribute:placeholder | Name your ride… | Nom de ta sortie… |
| 326 | literal | jsx-attribute:aria-label | Ride title | Nom de la sortie |
| 333 | literal | jsx-text | Distance (km) | Distance (km) |
| 347 | literal | jsx-text | Climbing (+m) | Dénivelé (+m) |
| 361 | literal | jsx-text | Start label | Départ (label) |
| 373 | literal | jsx-text | Finish label | Arrivée (label) |
| 389 | literal | jsx-text | Top-tube strip width | Format du tube supérieur |
| 406 | expression | jsx-text | p.labelEn | p.labelFr |
| 419 | literal | jsx-text | Start | Départ |
| 431 | literal | jsx-text | Pace (km/h) | Allure (km/h) |
| 447 | literal | jsx-text | Copies | Exemplaires |
| 476 | literal | jsx-text | Auto eat & drink reminders | Rappels manger & boire automatiques |
| 479 | literal | jsx-text | Adds “Eat snack & sip water” rows every 20–30 km between your chosen stops. | Ajoute une ligne « Manger & boire » tous les 20–30 km entre tes arrêts. |
| 499 | literal | jsx-text | Bakeries & water taps on your route | Arrêts eau & boulangeries sur ta trace |
| 503 | template | jsx-text | ${scannedAmenities.length} found · pick the exact stops you want on your sticker (${selectedStopIds.length} selected). | ${scannedAmenities.length} trouvés · coche uniquement ceux que tu veux sur le sticker (${selectedStopIds.length} sélecti |
| 506 | literal | jsx-text | Scan OpenStreetMap along your GPX, then choose which stops go onto the strip. | Scanne la carte puis choisis toi-même les arrêts à imprimer. |
| 526 | literal | jsx-text | Scanning… | Scan… |
| 530 | literal | jsx-text | Rescan | Rescanner |
| 533 | literal | jsx-text | Scan route stops | Scanner les arrêts |
| 546 | literal | jsx-text | All | Tout |
| 547 | literal | jsx-text | Bakeries | Boulangeries |
| 548 | literal | jsx-text | Water | Eau |
| 572 | literal | jsx-text | Auto-pick 3–4 stops | Suggérer 3–4 arrêts |
| 580 | literal | jsx-text | Clear | Tout décocher |
| 656 | literal | jsx-text | Add a custom cue (e.g. bakery, climb, feed zone) | Ajouter un repère perso (ex. boulangerie, col, ravito) |
| 676 | literal | jsx-attribute:placeholder | e.g. Village bakery | Ex : Café Place du Port |
| 724 | template | jsx-text | Print / Save PDF at actual size (${copies}×) | Imprimer / PDF à taille réelle (${copies}×) |
| 737 | literal | jsx-text | Open full Ride Plan in Cadence | Ouvrir le plan complet dans Cadence |
| 749 | literal | jsx-text | Actual-size preview | Aperçu taille réelle |
| 753 | literal | jsx-text | cues | repères |
| 768 | literal | jsx-text | Tip: keep print scale at “100%” (Actual Size) and check the 5 cm calibration ruler before cutting. | Astuce : laisse l’échelle sur « 100 % » (Taille réelle) dans ta boîte d’impression et vérifie la règle 5 cm avant de déc |

#### `src/components/tools/ToolLiveWeatherBar.tsx` (17 translatable / 17 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 152 | literal | code | Forecast temporarily unavailable — you can adjust the settings below. | Météo indisponible pour le moment — tu peux ajuster les réglages ci-dessous. |
| 181 | literal | code | Geolocation is not available in this browser. | Géolocalisation non prise en charge sur ce navigateur. |
| 202 | literal | code | My location | Ma position |
| 215 | literal | code | Location access declined — simply type your city above. | Accès position refusé — tape simplement ta ville ci-dessus. |
| 230 | expression | jsx-text | titleEn | titleFr |
| 233 | expression | jsx-text | subtitleEn | subtitleFr |
| 254 | literal | jsx-text | Seasonal estimate | Estimation saisonnière |
| 257 | literal | jsx-text | Live forecast | Météo en direct |
| 273 | literal | jsx-attribute:title | Use my current location | Utiliser ma position GPS |
| 274 | literal | jsx-attribute:aria-label | Use my current location | Utiliser ma position GPS |
| 291 | literal | jsx-attribute:placeholder | Search city (e.g. Lyon, Boulder…) | Ville (ex. Lyon, Nice, Montréal…) |
| 305 | literal | jsx-text | Date | Date |
| 317 | expression | jsx-text | timeLabelEn | timeLabelFr |
| 333 | template | jsx-text | Fetching hourly weather for ${selectedLoc?.label \|\| 'your city'}… | Chargement de la météo horaire pour ${selectedLoc?.label \|\| 'ta ville'}… |
| 354 | literal | jsx-text | gusts | raf. |
| 368 | literal | jsx-attribute:title | Refresh forecast | Actualiser la météo |
| 371 | literal | jsx-text | Refresh | Actualiser |

#### `src/components/tools/ToolRouteDropzone.tsx` (13 translatable / 13 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 78 | literal | code | Could not read a valid GPS track from this file. | Impossible de lire une trace GPS valide dans ce fichier. |
| 93 | literal | code | Could not parse route file (.GPX, .TCX, or .FIT). | Erreur lors de la lecture du fichier (.GPX, .TCX ou .FIT). |
| 114 | expression | code | outcome.guidanceEn | outcome.guidanceFr |
| 115 | literal | code | Could not import that link — export the .GPX file and drop it here. | Lien non reconnu ou privé — exportez le .GPX et déposez-le ici. |
| 130 | literal | code | Could not import this route link. | Import impossible pour ce lien. |
| 187 | literal | jsx-text | Swap GPX | Changer de GPX |
| 194 | literal | jsx-attribute:aria-label | Clear route | Effacer le parcours |
| 240 | expression | jsx-text | headlineEn \|\| 'Drop a route (.GPX, .TCX, .FIT) or paste a link' | headlineFr \|\| 'Dépose ton parcours (.GPX, .TCX, .FIT) ou colle un lien' |
| 246 | expression | jsx-text | sublineEn \|\| 'Your file never leaves your browser — zero account needed.' | sublineFr \|\| 'Ton fichier reste 100 % dans ton navigateur — aucun compte requis.' |
| 268 | literal | jsx-text | Browse GPX / FIT | Choisir un GPX / FIT |
| 281 | literal | jsx-attribute:placeholder | Or paste a Komoot, Strava, RideWithGPS, or Bikemap link… | Ou collez un lien Komoot, Strava, RideWithGPS ou Bikemap… |
| 295 | literal | jsx-text | Import link | Importer le lien |
| 317 | literal | jsx-text | Use my saved ride: | Utiliser ma sortie enregistrée : |

#### `src/components/tools/TyrePressureTool.tsx` (28 translatable / 28 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 156 | literal | jsx-text | Reading real road & trail surfaces along your route… | Lecture des revêtements réels sur ton parcours… |
| 168 | literal | jsx-text | Detected route surfaces: | Surface détectée sur ton parcours : |
| 172 | literal | jsx-text | paved | bitume |
| 173 | literal | jsx-text | trail | sentier |
| 184 | literal | jsx-text | Your rider, bike & luggage setup | Ton vélo & ton chargement |
| 189 | literal | jsx-text | 15% tyre-drop math, front/rear load split, and ETRTO 5.0 bar hookless safety cap. | Méthode de déformation à 15 %, répartition avant/arrière et plafond de sécurité hookless 5,0 bar. |
| 214 | literal | jsx-text | Your weight | Ton poids |
| 232 | literal | jsx-text | Bike weight | Poids du vélo |
| 250 | literal | jsx-text | Luggage / bags | Bagages / sacoches |
| 269 | literal | jsx-text | Tyre width | Largeur de pneu mesurée |
| 316 | expression | jsx-text | opt.en | opt.fr |
| 324 | literal | jsx-text | Terrain | Terrain dominant |
| 343 | expression | jsx-text | opt.en | opt.fr |
| 361 | literal | jsx-text | Inner tube | Chambre à air |
| 372 | literal | jsx-text | Hookless rim (5 bar max) | Jante Hookless (max 5 bar) |
| 383 | literal | jsx-text | Wet roads (−0.2 bar) | Route mouillée (−0,2 bar) |
| 393 | literal | jsx-text | Casing: | Carcasse : |
| 395 | literal | jsx-text | Supple | Souple |
| 399 | literal | jsx-text | Reinforced | Renforcée |
| 412 | literal | jsx-text | Recommended pressure | Pression recommandée |
| 422 | literal | jsx-text | Front tyre | Pneu avant |
| 435 | literal | jsx-text | Rear tyre | Pneu arrière |
| 453 | literal | jsx-text | Capped at 5.0 bar (72.5 PSI) per ETRTO hookless rim safety limits. | Plafonné à 5,0 bar (72,5 PSI) selon la norme de sécurité ETRTO Hookless. |
| 464 | literal | jsx-text | front | avant |
| 467 | literal | jsx-text | rear | arrière |
| 478 | template | jsx-text | Running ${diffBar.toFixed(1)} bar softer up front keeps steering planted over rough chatter while preventing pinch flats | Gonfler ${diffBar.toFixed(1)} bar de moins à l’avant absorbe les vibrations et garde le guidon collé en virage tout en é |
| 481 | template | jsx-text | Total system ${totalSystemKg} kg (${riderKg} + ${bikeKg} + ${luggageKg} kg). Fine-tune ±0.2 bar for feel. | Masse totale ${totalSystemKg} kg (${riderKg} + ${bikeKg} + ${luggageKg} kg). Ajuste ±0,2 bar selon ton confort. |
| 503 | literal | jsx-text | Open full Ride Plan in Cadence | Ouvrir le plan complet dans Cadence |

#### `src/components/tools/WaterBakeryTool.tsx` (42 translatable / 42 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 104 | literal | code | OpenStreetMap corridor scan timed out — retry in a few seconds. | Le serveur cartographique répond lentement — réessayez dans quelques secondes. |
| 141 | literal | code | Could not calculate a bike route between those two places. | Impossible de calculer un itinéraire vélo entre ces deux lieux. |
| 174 | literal | code | Could not route those places — pick suggestions from the list or drop a GPX. | Itinéraire introuvable — vérifiez les noms ou déposez un fichier GPX. |
| 303 | literal | jsx-text | Quick A → B route (No GPX) | Trajet A → B (sans GPX) |
| 306 | literal | jsx-text | Type start & destination | Tapez départ & arrivée |
| 323 | literal | jsx-text | Upload GPX or link | Importer GPX ou lien |
| 326 | literal | jsx-text | Komoot, Strava, .GPX, .FIT | Komoot, Strava, .GPX, .FIT |
| 340 | literal | jsx-text | Step 1 | Étape 1 |
| 343 | literal | jsx-text | Where are you riding? Cadence maps the bike route & checks open stops. | Tu roules où ? Cadence trace l’itinéraire vélo et scanne les arrêts. |
| 353 | literal | jsx-attribute:label | Start from | Point de départ |
| 355 | literal | jsx-attribute:placeholder | e.g. Boulder, London, Austin… | Ex : Nantes, Lyon, Bordeaux… |
| 369 | literal | jsx-attribute:label | Destination (or turnaround) | Destination (ou mi-parcours) |
| 371 | literal | jsx-attribute:placeholder | e.g. Lyons CO, Box Hill… | Ex : Clisson, Beaujolais… |
| 398 | literal | jsx-text | Mapping cycling route… | Calcul du tracé vélo… |
| 401 | literal | jsx-text | Find open bakeries & water stops | Trouver les boulangeries ouvertes & points d’eau |
| 417 | literal | jsx-attribute:stepBadge | Step 1 | Étape 1 |
| 429 | literal | jsx-text | Ride date | Date |
| 440 | literal | jsx-text | Start time | Départ |
| 451 | literal | jsx-text | Pace | Allure |
| 466 | literal | jsx-text | Bottles / °C | Bidons / °C |
| 510 | literal | jsx-text | Building your cycling route… | Calcul de ton itinéraire cyclable… |
| 513 | literal | jsx-text | Scanning bakeries, cafés, fountains, and cemetery taps along your route… | Scan des boulangeries, cafés, fontaines et cimetières le long du parcours… |
| 534 | literal | jsx-text | Retry scan | Réessayer |
| 547 | literal | jsx-text | Stop rolling up to closed village bakeries at 1:15 PM | Arrêtez de trouver la boulangerie du village fermée à 13 h 15 |
| 552 | literal | jsx-text | Type any start and destination above (no GPX needed!) or drop a route file — Cadence checks opening hours at your actual | Entre simplement un départ et une arrivée ci-dessus (ou importe un GPX) : Cadence vérifie les horaires d’ouverture à ton |
| 590 | literal | jsx-text | Heads up: long dry stretch ahead | Attention : long tronçon sans eau |
| 594 | literal | jsx-text | Dry stretch: top off bottles beforehand | Tronçon sec : remplissez bien avant |
| 597 | literal | jsx-text | Water stops look well spaced | Eau bien répartie sur le parcours |
| 606 | template | jsx-text | Longest stretch without water: ${analysis.waterGaps.maxGapKm.toFixed(1)} km · ${analysis.waterStops.length} water points | Plus grand écart : ${analysis.waterGaps.maxGapKm.toFixed(1)} km · ${analysis.waterStops.length} points d’eau détectés. |
| 615 | literal | jsx-text | bakeries / cafés | boulangeries / cafés |
| 618 | literal | jsx-text | water taps | points d’eau |
| 629 | literal | jsx-text | All | Tout |
| 632 | literal | jsx-text | Bakeries & cafés | Boulangeries & cafés |
| 636 | literal | jsx-text | Water & cemeteries | Eau & cimetières |
| 658 | literal | jsx-text | open at ETA | ouvert(s) à l’arrivée |
| 664 | literal | jsx-text | closed | fermé(s) |
| 673 | literal | jsx-text | No mapped stops found in this category along the corridor — pack self-sufficiently. | Aucun point trouvé dans cette catégorie sur le tracé — prévois ton autonomie au départ. |
| 739 | literal | jsx-text | Tap | Robinet |
| 743 | literal | jsx-text | Hours n/a | Horaires n/d |
| 746 | literal | jsx-text | Water | Eau |
| 758 | literal | jsx-text | Community map data: treat stops as reliable leads rather than a guarantee, especially seasonal fountains in winter. | Données communautaires cartographiques : traitez chaque point comme une piste utile, pas une garantie absolue (surtout e |
| 771 | literal | jsx-text | Open full Ride Plan & export .FIT | Ouvrir le plan complet & exporter en .FIT |

#### `src/components/tools/WhatToWearTool.tsx` (18 translatable / 18 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 110 | literal | jsx-text | Live weather for your ride | Météo de ta sortie |
| 113 | literal | jsx-text | Search any city worldwide (or tap GPS) to fetch real hourly temperature, wind, rain risk, and daylight windows. | Cherche ta ville pour charger la température, le vent, la pluie et les heures de jour en direct. |
| 137 | literal | jsx-text | Ride length | Durée prévue |
| 155 | literal | jsx-text | Your riding speed | Ta vitesse moyenne |
| 183 | literal | jsx-text | Fine-tune weather manually | Ajuster température / vent / pluie manuellement |
| 186 | literal | jsx-text | Or set weather conditions manually | Ou régler la météo manuellement |
| 209 | literal | jsx-text | Air temperature | Température air |
| 229 | literal | jsx-text | Wind | Vent |
| 248 | literal | jsx-text | Rain chance | Risque pluie |
| 273 | literal | jsx-text | Recommended kit | Tenue recommandée |
| 286 | template | jsx-text | Feels like at ${speedKmH} km/h | Ressenti à ${speedKmH} km/h |
| 293 | template | jsx-text | −${result.windChillDropC}°C colder on the bike than air (${tempC}°C) | −${result.windChillDropC} °C de moins sur le vélo que l’air (${tempC} °C) |
| 296 | template | jsx-text | Air ${tempC}°C · Wind ${windKmH} km/h | Air ${tempC} °C · Vent ${windKmH} km/h |
| 305 | literal | jsx-text | Lights & daylight | Éclairage & jour |
| 323 | literal | jsx-text | Upper body | Haut du corps |
| 329 | literal | jsx-text | Legs, hands & feet | Jambes, mains & pieds |
| 337 | literal | jsx-text | Rain & eyewear | Pluie & lunettes |
| 353 | literal | jsx-text | Plan this ride in Cadence | Planifier cette sortie dans Cadence |

### components/tour (57 translatable / 57 total across 2 files)

#### `src/components/tour/GpxStageSlicerModal.tsx` (49 translatable / 49 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 125 | literal | code | en-US | fr-FR |
| 605 | literal | code | Camp | Camping |
| 609 | literal | code | Lodging | Hébergement |
| 613 | literal | code | Train | Gare |
| 616 | literal | code | Town | Bourg |
| 621 | literal | code | on route | sur la trace |
| 624 | template | code | ${projected.offRouteKm} km off route | à ${projected.offRouteKm} km de la trace |
| 1109 | literal | jsx-attribute:aria-label | Multi-day stage slicer | Découper la trace en étapes |
| 1127 | literal | jsx-attribute:title | Fit full route | Centrer tout le parcours |
| 1131 | literal | jsx-text | Fit all | Tout voir |
| 1138 | literal | jsx-attribute:aria-label | Close | Fermer |
| 1159 | literal | jsx-text | Multi-Day Slicer | Découpage Multi-Jours |
| 1168 | literal | jsx-text | days | jours |
| 1195 | template | jsx-text | ${sunsetAlertCount} stage(s) finish after sunset — add a day or start earlier. | ${sunsetAlertCount} étape(s) arrivent après le coucher du soleil — ajoutez un jour ou partez plus tôt. |
| 1236 | template | jsx-text | Day ${stage.dayNumber} | Jour ${stage.dayNumber} |
| 1253 | template | jsx-attribute:title | Sunset: ${stage.sunsetHHMM} | Coucher du soleil : ${stage.sunsetHHMM} |
| 1315 | literal | jsx-attribute:title | Rename location | Modifier le lieu |
| 1316 | template | jsx-attribute:aria-label | Edit ${displayVal} | Modifier ${displayVal} |
| 1330 | literal | jsx-text | Start | Départ |
| 1336 | literal | jsx-text | Destination | Arrivée |
| 1366 | literal | jsx-attribute:title | Click to rename stop | Cliquer pour renommer l’étape |
| 1395 | literal | jsx-text | Sleep stops | Dormir ici |
| 1402 | literal | jsx-attribute:title | Remove this split | Supprimer cette coupure |
| 1403 | template | jsx-attribute:aria-label | Remove split N${cutIdx + 1} | Supprimer coupure N${cutIdx + 1} |
| 1417 | literal | jsx-text | Searching nearby campsites, hotels & stations… | Recherche de campings, hôtels & gares à proximité… |
| 1435 | template | jsx-attribute:title | Snap cut to ${spot.name} (${spot.distanceFromCutKm} km) | Caler la coupure sur ${spot.name} (${spot.distanceFromCutKm} km) |
| 1454 | literal | jsx-text | No camp/lodging found within 9 km — drag the pin toward a nearby town. | Aucun camping ou hôtel trouvé dans 9 km — glissez le repère vers un village. |
| 1469 | literal | jsx-text | Click curve to split · Drag N1, N2 to adjust | Cliquez sur le profil pour couper · Glissez N1, N2 |
| 1479 | literal | jsx-text | Merge to 1 day | Fusionner en 1 jour |
| 1487 | literal | jsx-text | Keep 1 day | Garder en 1 jour |
| 1519 | literal | jsx-text | click to split | cliquer pour couper |
| 1525 | literal | jsx-text | Click profile to add a split · Drag handles to adjust | Cliquez sur le profil pour ajouter une coupure · Glissez les poignées |
| 1597 | template | jsx-attribute:aria-label | Night ${cutIdx + 1} split | Coupure Nuit ${cutIdx + 1} |
| 1651 | literal | jsx-attribute:aria-label | Fewer days | Un jour de moins |
| 1657 | literal | jsx-text | days | jours |
| 1663 | literal | jsx-attribute:aria-label | More days | Un jour de plus |
| 1674 | literal | jsx-attribute:aria-label | Split balance mode | Mode de répartition |
| 1680 | literal | jsx-attribute:title | Shortens hilly days so daily effort stays balanced | Raccourcit les journées avec beaucoup de dénivelé |
| 1691 | literal | jsx-text | Balanced effort | Effort égal |
| 1702 | literal | jsx-text | Equal km | Km égaux |
| 1718 | literal | jsx-text | Tour pace & timing | Paramètres du tour |
| 1734 | literal | jsx-text | Start date | Date départ |
| 1747 | literal | jsx-text | Daily rollout | Départ / jour |
| 1780 | literal | jsx-text | Cruising pace | Allure de croisière |
| 1797 | expression | jsx-text | p.labelEn | p.labelFr |
| 1810 | literal | jsx-text | Luggage load | Chargement sacoches |
| 1827 | expression | jsx-text | lp.labelEn | lp.labelFr |
| 1851 | expression | jsx-text | currentPacePreset.labelEn | currentPacePreset.labelFr |
| 1872 | template | jsx-text | Apply ${dayCount}-Day Tour | Créer le tour (${dayCount} jours) |

#### `src/components/tour/LongRouteChoiceModal.tsx` (8 translatable / 8 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 67 | literal | jsx-text | Multi-day route detected | Long parcours détecté |
| 75 | template | jsx-text | Route file read successfully · ${distKm} km loaded | Fichier lu avec succès · ${distKm} km importés |
| 82 | template | jsx-text | This route looks like a ~${suggestedDays}-day trip. How would you like to set it up? | Ce parcours ressemble à un voyage sur ~${suggestedDays} jours. Comment souhaitez-vous le préparer ? |
| 102 | literal | jsx-text | Cut it for me | Découper pour moi |
| 105 | template | jsx-text | Jump straight into the slicer with ${suggestedDays} balanced days, sleep stops & per-day GPX. | Ouvre le découpeur sur ${suggestedDays} étapes équilibrées avec bivouacs et GPX par jour. |
| 127 | literal | jsx-text | Let me fine-tune | Me laisser ajuster |
| 130 | literal | jsx-text | Open Trip Setup to tweak bike, pace, or dates — with a 1-click button to slice later. | Ouvre les réglages du trajet (vélo, allure, dates) avec accès direct au découpeur. |
| 148 | literal | jsx-text | Keep as 1 day & open ride plan | Garder sur 1 seul jour (vue trajet) |

### context (5 translatable / 5 total across 1 files)

#### `src/context/LanguageContext.tsx` (5 translatable / 5 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 132 | literal | code | fr | en |
| 235 | literal | code | Gate | Porte |
| 236 | literal | code | Hotel Check-in / Stage Lodging | Réception Hôtel / Étape |
| 237 | literal | code | Camp / Bivouac Site | Zone de Bivouac / Camp |
| 238 | literal | code | Finish Line / Clubhouse | Ligne d’arrivée / Club |

### data (8 translatable / 8 total across 2 files)

#### `src/data/demoToolRoutes.ts` (5 translatable / 5 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 123 | literal | code | Start | Départ |
| 124 | literal | code | Finish | Arrivée |
| 353 | literal | code | flipped | inversé |
| 355 | template | code | ${dist} km Ride | Sortie ${dist} km |
| 359 | literal | code | Commute | Vélotaf |

#### `src/data/pantryCatalog.ts` (3 translatable / 3 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 620 | literal | code | Double espresso & maple oat bar or fresh banana | Double expresso & galette d’avoine à l’érable ou banane fraîche |
| 625 | literal | code | Double espresso & chocolate pastry or brioche | Double expresso & pain au chocolat ou brioche pur beurre |
| 629 | literal | code | Double espresso & artisanal bakery pastry or banana | Double expresso & viennoiserie artisanale ou banane |

### services (27 translatable / 27 total across 4 files)

#### `src/services/locationService.ts` (8 translatable / 8 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 282 | literal | code | Place | Lieu |
| 285 | literal | code | Address | Adresse |
| 288 | literal | code | Street | Rue |
| 291 | literal | code | Station | Gare |
| 294 | literal | code | City | Ville |
| 297 | literal | code | Venue | Établissement |
| 300 | literal | code | Peak | Sommet |
| 302 | literal | code | Place | Lieu |

#### `src/services/overpassCorridor.ts` (16 translatable / 16 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 423 | literal | code | Natural Spring | Source naturelle |
| 426 | literal | code | Public Water Tap | Point d'eau / Borne |
| 429 | literal | code | Drinking Water Fountain | Fontaine d'eau potable |
| 434 | literal | code | Cemetery (Water Spigot) | Cimetière (Point d'eau garanti) |
| 446 | literal | code | Bakery | Boulangerie artisanale |
| 448 | literal | code | Café / Bistro | Café / Étape |
| 450 | literal | code | Village Inn / Restaurant | Auberge / Restaurant |
| 452 | literal | code | Supermarket / Grocery | Alimentation / Épicerie |
| 464 | literal | code | Bicycle Shop | Magasin & Atelier vélo |
| 466 | literal | code | Bike Repair Station | Station gonflage & outils |
| 468 | literal | code | Campsite / Refuge | Bivouac / Refuge |
| 470 | literal | code | Trail Shelter | Abri & Refuge |
| 480 | literal | code | Public Toilets | Toilettes publiques |
| 482 | literal | code | Petrol Station | Station-service / Boutique |
| 484 | literal | code | Pharmacy | Pharmacie |
| 489 | literal | code | Train Station (Bailout) | Gare / Halte (Repli) |

#### `src/services/routeWeatherService.ts` (2 translatable / 2 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 338 | literal | code | en | fr |
| 534 | template | code | Coldest stretch: KM ${coldestSector.startKm}–${coldestSector.endKm} (${coldestSector.temperatureC}°C, feels ${coldestSec | Secteur le plus frais : KM ${coldestSector.startKm}–${coldestSector.endKm} (${coldestSector.temperatureC}°C, ressenti ${ |

#### `src/services/weatherService.ts` (1 translatable / 1 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 135 | expression | code | COMPASS_CARDINALS_EN[index] | COMPASS_CARDINALS_FR[index] |

### types (66 translatable / 66 total across 2 files)

#### `src/types/specs.ts` (3 translatable / 3 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 345 | template | code | ${units} fuel unit${units > 1 ? 's' : ''} | ${units} ${units > 1 ? 'unités de ravito' : 'unité de ravito'} |
| 348 | literal | code | Steady fueling rhythm | Rythme de ravito régulier |
| 351 | template | code | ${grams}g carbs | ${grams}g glucides |

#### `src/types/trip.ts` (63 translatable / 63 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 473 | template | code | ${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml bottle(s) on bike (${hydrationPlan.totalFluidNeedMl} ml target) | ${hydrationPlan.carriedOnFrameBidons}× bidon(s) de ${bidonSizeMl} ml sur le vélo (${hydrationPlan.totalFluidNeedMl} ml c |
| 476 | template | code | ${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml bottle(s) on bike | ${hydrationPlan.carriedOnFrameBidons}× bidon(s) de ${bidonSizeMl} ml sur le vélo |
| 479 | template | code | ${hydrationPlan.carriedOnFrameBidons}× ${bidonSizeMl} ml bottle(s) on frame + ${hydrationPlan.plannedRefillBidons} plann | ${hydrationPlan.carriedOnFrameBidons}× bidon(s) de ${bidonSizeMl} ml sur cadre + ${hydrationPlan.plannedRefillBidons} re |
| 499 | template | code | Tubeless tire pressure calibrated to ${bar} bar & sealant checked | Pression Tubeless calibrée à ${bar.replace('.', ',')} bar & préventif vérifié |
| 502 | template | code | Tire pressure calibrated to ${bar} bar | Pression des pneus calibrée à ${bar.replace('.', ',')} bar |
| 512 | nested | code | distanceKm > 50 ? "Multi-tool, tubeless plug darts, CO2 inflator & backup micro-tube" : "Multi-tool, tubeless plug kit & | distanceKm > 50 ? "Multi-outil, mèches tubeless, cartouche CO2 & chambre de secours" : "Multi-outil, mèches tubeless & g |
| 519 | nested | code | distanceKm > 50 ? "Multi-tool, 2× tire levers, spare tube & mini pump" : "Multi-tool & spare tube" | distanceKm > 50 ? "Multi-outil, 2 démonte-pneus, chambre à air & mini-pompe (kit anti-crève)" : "Multi-outil & kit anti- |
| 535 | literal | code | Full anti-puncture kit: tubeless plugs, CO2 cartridge & spare tube | Kit anti-crève renforcé : mèches tubeless, cartouche CO2 & chambre à air |
| 547 | literal | code | Thermal windproof gloves & neck gaiter | Gants thermiques coupe-vent & tour de cou |
| 571 | literal | code | Light wind vest, flat repair kit & payment card for coffee stop | Coupe-vent léger, kit crevaison & moyen de paiement pour la pause café |
| 573 | literal | code | Front touring headlight & rear safety flasher | Éclairage avant & feu arrière flash de sécurité |
| 577 | literal | code | Hotel Check-in: booking confirmation, ID & payment card | Check-in Hôtel : confirmation de réservation, pièce d’identité & CB |
| 578 | literal | code | Pannier / Saddlebag weight distribution & dry-bag waterproofing | Répartition du poids sacoches / sac de selle & sac étanche |
| 579 | literal | code | Evening charging & recovery (GPS, lights, power bank & recovery kit) | Recharge du soir & récupération (GPS, phares, batterie & étirements) |
| 580 | literal | code | Casual off-bike evening clothes & walking shoes | Tenue civile pour le soir & chaussures de marche légères |
| 581 | literal | code | Compact bike lock for overnight hotel storage | Antivol compact pour le local vélo de l’hôtel |
| 583 | literal | code | Front touring headlight & rear safety flasher | Éclairage avant & feu arrière flash de sécurité |
| 592 | template | code | Whole-food ride fuel (~${carbTarget} g/h: dates, fruit chews) & electrolyte bottles | Ravito aliments vrais (~${carbTarget} g/h : dattes, pâtes de fruits) & bidons électrolytes |
| 596 | template | code | Whole-food ride fuel (~${fuelUnitsPerHr} fuel units/hr: dates, fruit chews) & electrolyte bottles | Ravito aliments vrais (~${fuelUnitsPerHr} unités/h : dattes, pâtes de fruits) & bidons électrolytes |
| 599 | literal | code | Whole-food ride fuel (dates, fruit chews) & electrolyte bottles | Ravito aliments vrais (dattes, pâtes de fruits) & bidons électrolytes |
| 603 | template | code | Carb mix in bottles (~${carbTarget} g/h) & energy gels | Boisson glucidique en bidons (~${carbTarget} g/h) & gels ravito |
| 607 | template | code | Hydration drink in bottles (~${fuelUnitsPerHr} fuel units/hr) & pocket snacks | Boisson glucidique en bidons (~${fuelUnitsPerHr} unités/h) & collations rapides |
| 610 | literal | code | Hydration bottles & pocket snacks | Boisson en bidons & collations de poche |
| 617 | literal | code | GPS computer synced with sensors | Compteur GPS synchronisé avec capteurs |
| 618 | literal | code | Aero kit & lightweight wind gilet | Tenue aéro ajustée & gilet coupe-vent léger |
| 621 | literal | code | Quick CO2 inflator & low-profile tire levers | Cartouche CO2 rapide & démonte-pneus ultra-plats |
| 625 | literal | code | Pannier / Saddlebag weight distribution (balanced load) | Répartition du poids sacoches / sac de selle (équilibre du vélo) |
| 626 | literal | code | Bivouac bag / compact tent & sleeping pad | Sac de bivouac / tente compacte & matelas isolant |
| 627 | literal | code | Evening charging & recovery (20,000mAh power bank, cables & rest kit) | Recharge du soir & récupération (batterie 20 000 mAh, câbles & repos) |
| 628 | literal | code | Water filtration flask + 2L hydration capacity | Flasque filtrante + capacité hydrique de 2 L |
| 629 | literal | code | Chain tool, quick-links & spare hanger | Dérive-chaîne, maillons rapides & patte de dérailleur |
| 636 | template | code | Multi-day kit rotation: ${totalDays}x base layers / chamois cream & evening camp clothes in dry-bag | Rotation textile (${totalDays} jours) : rechanges cuissard, crème chamois & tenue de soir en sac étanche |
| 645 | template | code | Evening charging & autonomy (${totalDays} days): multi-port USB-C splitter for GPS, radar & 800-1000lm lights | Recharge du soir multi-étapes (${totalDays} jours) : chargeur multi-ports USB-C (GPS, radar, phares) |
| 654 | template | code | Hotel Check-in / bivouac stops & rail bike passes saved offline (${totalDays} stages) | Check-in Hôtel / bivouacs & billets train vélo sauvegardés hors-ligne (${totalDays} étapes) |
| 666 | literal | code | Security badge & credentials | Badge d'accès entreprise & identifiants |
| 667 | literal | code | Work laptop & USB-C charger | Ordinateur portable pro & chargeur USB-C |
| 668 | literal | code | Clean work clothes packed in dry-bag | Tenue de travail propre rangée en sac étanche |
| 669 | literal | code | Shower kit & microfiber quick-dry towel | Trousse de douche & serviette microfibre séchage rapide |
| 670 | literal | code | Heavy-duty bike lock | Antivol U haute sécurité pour le parking vélo |
| 671 | literal | code | Recovery snack packed | Collation de récupération prête dans le sac |
| 678 | literal | code | Extra whole-food fueling rations & electrolytes packed | Rations ravito supplémentaires (pâtes de fruits, dattes & électrolytes) |
| 691 | literal | code | High-mountain tubeless plug darts, spare brake pads & CO2 canisters | Mèches tubeless haute montagne, plaquettes de rechange & cartouches CO2 |
| 700 | literal | code | Offline topographic GPS trail maps & emergency contacts | Tracés GPS topographiques hors-ligne & secours montagne |
| 714 | literal | code | High-beam headlight (800+ lumens) fully charged & rear flasher | Phare avant 800+ lumens chargé & feu arrière clignotant puissant |
| 723 | literal | code | Reflective sash/vest & reflective ankle bands | Baudrier / gilet haute visibilité & bandes réfléchissantes de cheville |
| 736 | literal | code | Compact cafe frame lock & contactless payment for coffee pause | Antivol de cadre rapide & moyen de paiement pour la pause café |
| 748 | literal | code | Insulated picnic pannier with fresh provisions, cutlery & folding knife | Sacoche isotherme avec victuailles fraîches, couverts & couteau pliant |
| 760 | literal | code | Padded bottle protective sleeves for pannier wine transport | Manchons de protection matelassés pour bouteilles de vin en sacoche |
| 772 | literal | code | Wilderness trauma kit: sterile dressings, antiseptic & space blanket | Trousse de secours : pansements compressifs, antiseptique & couverture de survie |
| 784 | literal | code | Rugged 20,000mAh battery pack & weatherproof charging cables | Batterie externe 20 000 mAh renforcée & faisceau de câbles étanches |
| 796 | literal | code | Full mudguards inspected & Gore-Tex Shakedry rain shell stowed | Garde-boue intégraux vérifiés & veste pluie Gore-Tex Shakedry |
| 808 | literal | code | Ultralight bivouac shelter, insulated sleeping pad & water filter flask | Abri bivouac ultraléger, matelas gonflable isolant & flasque filtrante |
| 820 | template | code | Calibrated carb drink mix (~${carbTarget} g/h) & sodium salt tabs | Mélange glucidique calibré (~${carbTarget} g/h) & capsules de sodium |
| 832 | literal | code | 15" Work laptop inside IPX6 waterproof dry sleeve & USB-C charger | Ordinateur pro 15" dans housse étanche IPX6 & chargeur USB-C |
| 844 | literal | code | Trail tire pressure lowered to 2.4-2.8 bar & plug tool mounted | Pression tout-terrain ajustée à 2,4–2,8 bar & outil mèches prêt |
| 856 | literal | code | Rear Garmin Varia radar charged & peloton hand signals briefed | Radar arrière Garmin Varia chargé & signaux de peloton synchronisés |
| 868 | literal | code | Microfiber quick-dry towel, toiletries & fresh change of clothes in dry bag | Serviette microfibre, trousse de toilette & tenue propre sous sac étanche |
| 880 | literal | code | Comfortable walking shoes & secure bike lock for monuments | Chaussures confortables pour la marche & antivol sécurisé de visite |
| 892 | literal | code | Handlebar weatherproof camera bag, lens cloth & spare battery | Sacoche appareil photo étanche de guidon & lingette microfibre |
| 904 | literal | code | Swimsuit, sandals & recovery compression socks for thermal spa | Maillot de bain, sandales & chaussettes de récupération pour le spa |
| 916 | literal | code | Structured threshold interval workout synced to GPS head unit | Séance de fractionné par intervalles synchronisée sur le compteur GPS |
| 928 | literal | code | Low-ratio climbing cog checked (32/34T) & freshly waxed chain | Grand pignon de montagne vérifié (32/34D) & chaîne dégraissée |
| 945 | literal | code | High-output 800–1000 lm headlight & reflective gear (low weather visibility) | Éclairage puissant 800–1000 lm & équipement réfléchissant (visibilité réduite météo) |

### utils (702 translatable / 702 total across 22 files)

#### `src/utils/cafeSnack.ts` (4 translatable / 4 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 24 | literal | code | An espresso and a rice cake or a banana | Un expresso et une galette de riz ou une banane |
| 29 | nested | code | nutFree ? 'An espresso and sourdough toast with jam' : 'An espresso and a plant-based pastry' | nutFree ? 'Un expresso et un pain au levain avec confiture' : 'Un expresso et une viennoiserie végétale' |
| 38 | literal | code | An espresso and an apple turnover | Un expresso et un chausson aux pommes |
| 42 | literal | code | An espresso and a pastry of your choice | Un expresso et une viennoiserie de votre choix |

#### `src/utils/climbSplits.ts` (18 translatable / 18 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 109 | literal | code | Cat 1 | Cat. 1 |
| 111 | literal | code | Cat 2 | Cat. 2 |
| 113 | literal | code | Cat 3 | Cat. 3 |
| 115 | literal | code | Cat 4 | Cat. 4 |
| 117 | literal | code | Hill | Côte |
| 232 | literal | code | en | fr |
| 236 | template | code | Climb ${idx} (${catLabel}) | Ascension ${idx} (${catLabel}) |
| 264 | template | code | ${dates} date${dates > 1 ? 's' : ''} (or bar) | ${dates} datte${dates > 1 ? 's' : ''} (ou barre) |
| 276 | literal | code | 1 bottle | 1 bidon |
| 278 | literal | code | 1/2 bottle | 1/2 bidon |
| 284 | literal | code | Hydrate | Hydratation |
| 289 | template | code | Fuel ${carbsG}g+H2O | Ravito ${carbsG}g+Eau |
| 292 | template | code | Eat ${carbsG}g | Manger ${carbsG}g |
| 294 | template | code | Drink ${fluidMl}ml | Boire ${fluidMl}ml |
| 522 | template | code | Km ${preClimbKm}: ${cueItems} before ${climb.avgGradePct}% climb | Km ${preClimbKm} : ${cueItems} avant la rampe (${climb.avgGradePct} %) |
| 568 | template | code | Km ${distKm}: ${unitDesc} | Km ${distKm} : ${unitDesc} |
| 573 | template | code | ${carbsGrams} g carbs | ${carbsGrams} g glucides |
| 578 | template | code | pre-${upcomingClimb.name} | avant ${upcomingClimb.name} |

#### `src/utils/cueSheet.ts` (13 translatable / 13 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 26 | literal | code | Water | Point d'eau |
| 28 | literal | code | Cemetery Water | Cimetière (Eau) |
| 30 | literal | code | Food | Ravitaillement |
| 32 | literal | code | Repair / Shelter | Atelier / Abri |
| 34 | literal | code | Toilet / Fuel / Med | WC / Pharm. / Station |
| 36 | literal | code | Train Bailout | Gare (Repli) |
| 393 | literal | code | On route | Sur la trace |
| 397 | template | code | +${detourKm.toFixed(1)} km detour | +${detourKm.toFixed(1)} km détour |
| 401 | literal | code | Hours | Horaires |
| 404 | literal | code | Est. | Passage |
| 407 | literal | code | Refill water bottles | Remplir les bidons |
| 411 | literal | code | Resupply food & water | Ravitaillement alimentation / eau |
| 414 | literal | code | Bike repair / shelter stop | Point mécanique / abri |

#### `src/utils/effectiveChecklist.ts` (2 translatable / 2 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 39 | template | code | Tubeless tire plugs (bacon strips) + CO2 & sealant check (${activeBike.name}) | Kit mèches Tubeless + cartouche CO2 & niveau préventif (${activeBike.name}) |
| 42 | template | code | Spare inner tube + tire levers & mini-pump (${activeBike.name}) | Chambre à air de secours + démonte-pneus & mini-pompe (${activeBike.name}) |

#### `src/utils/gpxSlicer.ts` (2 translatable / 2 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 724 | template | code | Stop ${i} (km ${Math.round(s.startKm)}) | Étape ${i} (km ${Math.round(s.startKm)}) |
| 729 | template | code | Stop ${dayNumber} (km ${Math.round(s.endKm)}) | Étape ${dayNumber} (km ${Math.round(s.endKm)}) |

#### `src/utils/kitAdvisor.ts` (19 translatable / 19 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 58 | literal | code | Deep winter (<3°C) | Grand froid (<3°C) |
| 60 | literal | code | Heavy merino base layer + windproof thermal winter jacket | Sous-maillot mérinos épais + veste thermique coupe-vent |
| 63 | literal | code | Thermal bib tights, insulated winter gloves, neoprene overshoes & neck buff | Cuissard long thermique, gants hiver isolés, sur-chaussures néoprène & tour de cou |
| 67 | literal | code | Thermal kit (3–9°C) | Thermique (3–9°C) |
| 69 | literal | code | Long-sleeve base layer + Roubaix thermal jersey + windproof gilet | Sous-maillot manches longues + maillot gratté + gilet coupe-vent |
| 72 | literal | code | Thermal bib tights or leg warmers, long-finger windproof gloves & toe covers | Collant long ou jambières thermiques, gants longs coupe-vent & couvre-orteils |
| 76 | literal | code | Mid-season (10–15°C) | Mi-saison (10–15°C) |
| 78 | literal | code | Short-sleeve jersey + arm warmers + packable wind vest (gilet) | Maillot manches courtes + manchettes amovibles + gilet coupe-vent pliable |
| 81 | nested | code | feelsLikeC <= 12 ? 'Bib shorts + light knee warmers & light full-finger liners' : 'Standard bib shorts & light mitts' | feelsLikeC <= 12 ? 'Cuissard court + genouillères légères & gants fins' : 'Cuissard court classique & mitaines ou gants  |
| 89 | literal | code | Mild aero (16–22°C) | Tempéré (16–22°C) |
| 91 | literal | code | Sleeveless mesh base layer + breathable summer jersey | Sous-maillot mesh sans manches + maillot été respirant |
| 94 | literal | code | Lightweight summer bib shorts & aero socks | Cuissard été léger & chaussettes aéro |
| 98 | literal | code | Hot weather (>22°C) | Chaleur (>22°C) |
| 100 | literal | code | Ultralight open-mesh jersey (full-zip ventilation) | Maillot ultra-léger ajouré zip intégral (sans sous-couche épaisse) |
| 103 | literal | code | Ventilated summer bibs, SPF 50 sun protection & high-sodium bidon | Cuissard été ventilé, crème solaire SPF 50 & électrolytes renforcés |
| 110 | template | code | ${rainRisk}% rain risk: taped-seam waterproof shell + fenders & clear hydrophobic lens | Pluie ${rainRisk}% : veste membrane imperméable coutures étanches + garde-boue & écran hydrophobe clair |
| 114 | template | code | ${rainRisk}% shower risk: packable DWR shell in jersey pocket + photochromic lens | Averses ${rainRisk}% : coupe-vent déperlant DWR en poche centrale + verres photochromiques |
| 118 | literal | code | Low light: clear or Cat. 0–1 photochromic eyewear + hi-vis ankle/vest accents | Faible luminosité : verres clairs ou photochromiques Cat. 0–1 + rappels rétroréfléchissants |
| 122 | literal | code | Dry corridor: high-contrast Cat. 2–3 sun cycling eyewear | Route sèche : lunettes solaires Cat. 2–3 haute définition |

#### `src/utils/nlpParser.ts` (15 translatable / 15 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 312 | literal | code | Gate | Porte |
| 313 | literal | code | Gate | Porte |
| 340 | template | code | Locker (${mins}m) | Vestiaire (${mins}m) |
| 347 | literal | code | Non-stop | Sans arrêt |
| 350 | literal | code | Planned (+10 min) | Prévu (+10 min) |
| 377 | literal | code | +10m & kit | Marge +10m & kit |
| 379 | literal | code | Puncture kit | Kit anti-crève |
| 606 | template | code | ${monthShortEn[pMonth - 1]} ${pDay.toString().padStart(2, '0')}, ${pYear} | ${pDay.toString().padStart(2, '0')} ${monthShortFr[pMonth - 1]} ${pYear} |
| 619 | literal | code | Bikepacking / Adventure | Bikepacking / Bivouac |
| 635 | literal | code | Escapade / Leisure Stay | Escapade / Séjour |
| 637 | literal | code | Hotel Reception | Réception Hôtel |
| 646 | literal | code | Commute Ride | Trajet Vélotaf |
| 702 | template | code | ${orig} → ${dest} Tour | ${orig} → ${dest} |
| 714 | nested | code | `Ride to ${dest}` | parsedValues.tag === 'ESCAPADE' ? `Escapade à ${dest}` : `Trajet vers ${dest}` |
| 729 | literal | code | Calm | Calme |

#### `src/utils/nutrition.ts` (161 translatable / 161 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 463 | expression | code | liquidItem.portionLabelEn | liquidItem.portionLabelFr |
| 468 | nested | code | hasPrefix ? `${carbBottles} bottle${carbBottles > 1 ? 's' : ''} of ${noun}` : `${carbBottles} × ${rawLabel}` | hasPrefix ? `${carbBottles} bidon${carbBottles > 1 ? 's' : ''} ${noun}` : `${carbBottles} × ${rawLabel}` |
| 478 | template | code | ${waterBottles} bottle${waterBottles > 1 ? 's' : ''} of water | ${waterBottles} bidon${waterBottles > 1 ? 's' : ''} d’eau |
| 505 | literal | code | Pure Water & Electrolytes | Eau Pure & Électrolytes |
| 506 | template | code | 1× ${bidonSizeMl} ml bottle (450 ml target) | 1× Bidon ${bidonSizeMl} ml (450 ml cible) |
| 511 | literal | code | Pure water & electrolytes (0 g C) | Eau pure & électrolytes (0 g C) |
| 512 | literal | code | 1 bottle water | 1 bidon d’eau |
| 513 | literal | code | Just water for a short ride (under 45 min). | Hydratation seule pour une sortie courte (< 45 min). |
| 551 | expression | code | liquidItem.nameEn | liquidItem.nameFr |
| 557 | template | code | ${liquidItem.nameEn} (${liquidCarbs}g carbs · ${totalBidonsNeeded} × ${bidonSizeMl} ml · ~${sodiumMgPerL} mg sodium/L) | ${liquidItem.nameFr} (${liquidCarbs} g glucides · ${totalBidonsNeeded} × ${bidonSizeMl} ml · ~${sodiumMgPerL} mg sodium/ |
| 561 | literal | code | Sip little and often, with electrolytes. | Buvez par petites gorgées régulières, avec des électrolytes. |
| 637 | expression | code | item.portionLabelEn | item.portionLabelFr |
| 639 | expression | code | item.nameEn | item.nameFr |
| 640 | template | code | ${units} serving${units > 1 ? 's' : ''} | ${units} portion${units > 1 ? 's' : ''} |
| 645 | template | code | ${item.nameEn} (${units * item.carbsG}g carbs) | ${item.nameFr} (${units * item.carbsG} g glucides) |
| 650 | literal | code | Salty break, about every 90 min. | Pause salée, environ toutes les 90 min. |
| 654 | literal | code | Salty snack for variety. | En-cas salé pour varier les saveurs. |
| 657 | literal | code | Easy-to-digest energy. | Énergie facile à digérer. |
| 684 | literal | code | Isotonic Carb Drink Mix + Electrolytes | Boisson Glucidique Isotonique + Électrolytes |
| 687 | template | code | ${liquidCarbBidons}× Carbohydrate Bottle (${bidonSizeMl} ml) + ${pureWaterBidons}× Pure/Electrolyte Water Bottle${pureWa | ${liquidCarbBidons}× Bidon Glucidique (${bidonSizeMl} ml) + ${pureWaterBidons}× Bidon${pureWaterBidons > 1 ? 's' : ''} E |
| 690 | template | code | ${liquidCarbBidons}× ${bidonSizeMl} ml bottle${liquidCarbBidons > 1 ? 's' : ''} | ${liquidCarbBidons}× Bidon${liquidCarbBidons > 1 ? 's' : ''} ${bidonSizeMl} ml |
| 697 | template | code | Isotonic carb mix (${liquidCarbBidons * ISOTONIC_SCOOP_BIDON.carbsG} g C) | Boisson glucidique isotonique (${liquidCarbBidons * ISOTONIC_SCOOP_BIDON.carbsG} g C) |
| 702 | template | code | ${liquidCarbBidons}× Carbohydrate Bottle + ${pureWaterBidons}× Water Bottle${pureWaterBidons > 1 ? 's' : ''} | ${liquidCarbBidons}× Bidon glucidique + ${pureWaterBidons}× Bidon${pureWaterBidons > 1 ? 's' : ''} eau/électrolytes |
| 705 | template | code | ${liquidCarbBidons} ${liquidCarbBidons > 1 ? 'bottles' : 'bottle'} hydration drink | ${liquidCarbBidons} ${liquidCarbBidons > 1 ? 'bidons' : 'bidon'} d’eau & électrolytes |
| 708 | literal | code | Easy to drink, nothing to chew. | Facile à boire, rien à mâcher. |
| 716 | literal | code | Dual-Source Energy Gels | Gels Énergétiques Glucose/Fructose |
| 722 | template | code | ${counts.gelsCount}× energy gel (${counts.gelsCount * ENERGY_GEL_UNIT.carbsG} g C) | ${counts.gelsCount}× gel énergétique (${counts.gelsCount * ENERGY_GEL_UNIT.carbsG} g C) |
| 725 | template | code | ${counts.gelsCount} quick pocket ${counts.gelsCount > 1 ? 'snacks' : 'snack'} | ${counts.gelsCount} ${counts.gelsCount > 1 ? 'collations' : 'collation'} de poche rapide |
| 728 | literal | code | Take ahead of climbs or exposed headwind sections. | À prendre avant les côtes ou sections exposées. |
| 742 | literal | code | 50/50 Water & 100% Pressed Apple/Grape Juice | 50/50 Eau & Pur Jus de Pomme/Raisin Pressé |
| 745 | template | code | ${liquidCarbBidons}× Carbohydrate Bottle (${bidonSizeMl} ml) + ${pureWaterBidons}× Pure/Electrolyte Water Bottle${pureWa | ${liquidCarbBidons}× Bidon Glucidique (${bidonSizeMl} ml) + ${pureWaterBidons}× Bidon${pureWaterBidons > 1 ? 's' : ''} E |
| 748 | template | code | ${liquidCarbBidons}× ${bidonSizeMl} ml bottle${liquidCarbBidons > 1 ? 's' : ''} | ${liquidCarbBidons}× Bidon${liquidCarbBidons > 1 ? 's' : ''} ${bidonSizeMl} ml |
| 755 | template | code | 50/50 water & 100% pressed juice (${liquidCarbBidons * JUICE_BIDON_650ML.carbsG} g C) | 50/50 eau & pur jus pressé (${liquidCarbBidons * JUICE_BIDON_650ML.carbsG} g C) |
| 760 | template | code | ${liquidCarbBidons}× Carbohydrate Bottle + ${pureWaterBidons}× Water Bottle${pureWaterBidons > 1 ? 's' : ''} | ${liquidCarbBidons}× Bidon glucidique + ${pureWaterBidons}× Bidon${pureWaterBidons > 1 ? 's' : ''} eau/électrolytes |
| 763 | template | code | ${liquidCarbBidons} ${liquidCarbBidons > 1 ? 'bottles' : 'bottle'} diluted fruit juice | ${liquidCarbBidons} ${liquidCarbBidons > 1 ? 'bidons' : 'bidon'} jus naturel dilué |
| 766 | literal | code | Juice cut with water, easy on the stomach. | Jus coupé d’eau, léger pour l’estomac. |
| 774 | literal | code | Medjool Dates (Pitted) | Dattes Medjool (Dénoyautées) |
| 775 | template | code | ${counts.datesCount} plump dates | ${counts.datesCount} dattes |
| 780 | template | code | Medjool dates (${counts.datesCount * MEDJOOL_DATE.carbsG} g C) | Dattes Medjool dénoyautées (${counts.datesCount * MEDJOOL_DATE.carbsG} g C) |
| 783 | template | code | ${counts.datesCount} plump ${counts.datesCount > 1 ? 'dates' : 'date'} or dried fruit | ${counts.datesCount} ${counts.datesCount > 1 ? 'dattes' : 'datte'} ou fruits secs |
| 786 | literal | code | Rich in natural potassium, melt-in-mouth chewability. | Riches en potassium naturel, texture fondante. |
| 793 | literal | code | Fast Energy Gel (Climb Backup) | Gel Énergétique Rapide (Secours Bosses) |
| 799 | template | code | ${counts.gelsCount}× energy gel (${counts.gelsCount * ENERGY_GEL_UNIT.carbsG} g C) | ${counts.gelsCount}× gel énergétique (${counts.gelsCount * ENERGY_GEL_UNIT.carbsG} g C) |
| 802 | template | code | ${counts.gelsCount} quick pocket ${counts.gelsCount > 1 ? 'snacks' : 'snack'} | ${counts.gelsCount} ${counts.gelsCount > 1 ? 'collations' : 'collation'} de poche rapide |
| 805 | literal | code | Take ahead of climbs or exposed headwind sections. | À prendre avant les côtes ou sections exposées. |
| 810 | literal | code | Artisanal Fruit Chews & Dried Figs | Pâtes de Fruits Artisanales & Figues |
| 811 | template | code | ${counts.chewsCount} pieces | ${counts.chewsCount} portions |
| 816 | template | code | Artisanal fruit chews (${counts.chewsCount * FRUIT_CHEW_PIECE.carbsG}g C) | Pâtes de fruits artisanales (${counts.chewsCount * FRUIT_CHEW_PIECE.carbsG}g C) |
| 819 | template | code | ${counts.chewsCount} ${counts.chewsCount > 1 ? 'pieces' : 'piece'} fruit chews or dried figs | ${counts.chewsCount} ${counts.chewsCount > 1 ? 'bouchées' : 'bouchée'} de fruits secs ou figues |
| 822 | literal | code | Steady release plus quick boost for climbs and headwinds. | Énergie progressive et coup de boost dans les côtes. |
| 836 | expression | code | savoryItem.nameEn | savoryItem.nameFr |
| 837 | template | code | ${savoryCount} savory serving${savoryCount > 1 ? 's' : ''} | ${savoryCount} portion${savoryCount > 1 ? 's' : ''} salée${savoryCount > 1 ? 's' : ''} |
| 844 | template | code | ${savoryItem.nameEn} (${savoryCount * savoryItem.carbsG}g carbs) | ${savoryItem.nameFr} (${savoryCount * savoryItem.carbsG} g glucides) |
| 847 | expression | code | savoryItem.portionLabelEn | savoryItem.portionLabelFr |
| 848 | literal | code | Salty break, about every 90 min. | Pause salée, environ toutes les 90 min. |
| 945 | literal | code | Light carb drink (pure juice or salted maple water) | Boisson glucidique légère (pur jus ou eau d’érable salée) |
| 953 | literal | code | Light carb drink (250 ml, 28 g carbs) | Boisson glucidique légère (250 ml, 28 g glucides) |
| 956 | literal | code | 1 small glass of juice or light drink | 1 petit verre de jus ou boisson légère |
| 957 | literal | code | Light drink, easy on the stomach 20 min before you leave. | Boisson légère, facile à digérer 20 min avant de partir. |
| 963 | literal | code | Double espresso | Double expresso |
| 964 | literal | code | 60 ml (2 shots) | 60 ml (2 doses) |
| 969 | literal | code | Double espresso (60 ml, ~140 mg caffeine) | Double expresso (60 ml, ~140 mg caféine) |
| 970 | literal | code | 1 coffee or espresso | 1 café ou expresso |
| 971 | literal | code | A quick pick-me-up before you leave. | Un petit coup de fouet avant de partir. |
| 975 | literal | code | Water with a pinch of salt | Eau fraîche + pincée de sel |
| 981 | literal | code | Water with a pinch of salt (300 ml) | Eau fraîche + sel (300 ml) |
| 982 | literal | code | 1 tall glass of salted water | 1 grand verre d’eau salée |
| 983 | literal | code | Pre-ride water with a pinch of salt. | Hydratation avant le départ avec une pincée de sel. |
| 992 | literal | code | Double espresso | Double expresso |
| 993 | literal | code | 60 ml (2 shots) | 60 ml (2 doses) |
| 998 | literal | code | Double espresso (60 ml, ~140 mg caffeine, 0 g carbs) | Double expresso (60 ml, ~140 mg caféine, 0 g glucides) |
| 999 | literal | code | 1 coffee or espresso | 1 café ou expresso |
| 1000 | literal | code | A quick espresso for a light start. | Un café court pour démarrer léger. |
| 1004 | literal | code | Water with a pinch of salt | Eau fraîche + pincée de sel |
| 1010 | literal | code | Water with a pinch of salt (350 ml) | Eau fraîche + sel (350 ml) |
| 1011 | literal | code | 1 tall glass of salted water | 1 grand verre d’eau salée |
| 1012 | literal | code | A tall glass of water with a pinch of salt before rolling out. | Un grand verre d’eau avec une pincée de sel avant de rouler. |
| 1023 | expression | code | compliantPantry.preRide.nameEn | compliantPantry.preRide.nameFr |
| 1024 | literal | code | 1 portion | 1 portion |
| 1029 | template | code | ${compliantPantry.preRide.nameEn} (${compliantPantry.preRide.carbsG} g carbs, ${compliantPantry.preRide.proteinG} g prot | ${compliantPantry.preRide.nameFr} (${compliantPantry.preRide.carbsG} g glucides, ${compliantPantry.preRide.proteinG} g p |
| 1032 | expression | code | compliantPantry.preRide.portionLabelEn | compliantPantry.preRide.portionLabelFr |
| 1033 | literal | code | Easy to digest before you head out. | Facile à digérer avant de partir. |
| 1037 | literal | code | Double espresso | Double expresso |
| 1038 | literal | code | 60 ml (2 shots) | 60 ml (2 doses) |
| 1043 | literal | code | Double espresso (60 ml, ~140 mg caffeine) | Double expresso (60 ml, ~140 mg caféine) |
| 1044 | literal | code | 1 coffee or espresso | 1 café ou expresso |
| 1045 | literal | code | A quick pick-me-up before you leave. | Un petit coup de fouet avant de partir. |
| 1049 | literal | code | Water with a pinch of salt | Eau fraîche + pincée de sel |
| 1055 | literal | code | Water with a pinch of salt (300 ml) | Eau fraîche + sel (300 ml) |
| 1056 | literal | code | 1 tall glass of salted water | 1 grand verre d’eau salée |
| 1057 | literal | code | Pre-ride water with a pinch of salt. | Hydratation avant le départ avec une pincée de sel. |
| 1112 | literal | code | nameEn | nameFr |
| 1113 | literal | code | 1 recovery portion | 1 portion de récupération |
| 1118 | template | code | ${resolvedPostRidePantry.nameEn} (${resolvedPostRidePantry.carbsG}g carbs, ${resolvedPostRidePantry.proteinG}g protein) | ${resolvedPostRidePantry.nameFr} (${resolvedPostRidePantry.carbsG} g glucides, ${resolvedPostRidePantry.proteinG} g prot |
| 1121 | expression | code | resolvedPostRidePantry.portionLabelEn | resolvedPostRidePantry.portionLabelFr |
| 1122 | literal | code | Carbs and protein to help you recover. | Glucides et protéines pour bien récupérer. |
| 1130 | expression | code | preRidePantry.nameEn | preRidePantry.nameFr |
| 1131 | literal | code | Breakfast portion moved to recovery | Portion du petit-déjeuner reportée |
| 1136 | template | code | ${preRidePantry.nameEn} (${recoveryCarbBonus}g carbs) | ${preRidePantry.nameFr} (${recoveryCarbBonus} g glucides) |
| 1141 | expression | code | preRidePantry.portionLabelEn | preRidePantry.portionLabelFr |
| 1144 | template | code | Half portion: ${preRidePantry.portionLabelEn} | Une demi-portion : ${preRidePantry.portionLabelFr} |
| 1147 | literal | code | The breakfast you kept light, enjoyed now instead. | Le petit-déjeuner que vous avez allégé, à rattraper ici. |
| 1165 | literal | code | Gluten-free oat bar or instant oats cup | Galette d’avoine sans gluten ou flocons minute |
| 1168 | literal | code | Packable oat bar or instant oats cup | Galette d’avoine ou flocons d’avoine minute |
| 1171 | literal | code | 1 serving (65 g) | 1 portion (65 g) |
| 1176 | template | code | ${isGF ? 'GF oat bar' : 'Packable oat bar'} (65 g, 42 g carbs, 8 g protein) | ${isGF ? 'Galette d’avoine sans gluten' : 'Galette d’avoine'} (65 g, 42 g glucides, 8 g protéines) |
| 1179 | literal | code | 1 oat bar or instant oats cup | 1 galette ou bol d’avoine |
| 1180 | literal | code | Packs in your bag, no fridge needed. | Se transporte dans le sac, sans frigo. |
| 1185 | literal | code | Certified GF overnight oats with plant milk | Flocons d’avoine sans gluten au lait végétal |
| 1188 | literal | code | Oat milk overnight oats with chia | Flocons d’avoine préparés au lait d’avoine & chia |
| 1191 | literal | code | 250 g jar | Bocal 250 g |
| 1196 | template | code | ${isGF ? 'GF overnight oats' : 'Oat milk overnight oats'} (250 g jar, 42 g carbs, 8 g protein) | ${isGF ? 'Avoine sans gluten' : 'Flocons d’avoine préparés'} (250 g, 42 g glucides, 8 g protéines) |
| 1199 | literal | code | 1 jar of prepared oats | 1 bocal d’avoine préparée |
| 1200 | literal | code | Prepared the night before, cool and filling. | Préparé la veille, frais et rassasiant. |
| 1206 | literal | code | 1 firm banana or fresh strawberries | 1 banane ferme ou portion de fraises |
| 1212 | literal | code | 1 firm banana (120 g, 27 g carbs) | 1 banane ferme (120 g, 27 g glucides) |
| 1213 | literal | code | 1 serving of fresh fruit | 1 portion de fruits frais |
| 1214 | literal | code | Gentle on the stomach. | Doux pour l’estomac. |
| 1218 | literal | code | 1 crisp seasonal apple | 1 pomme croquante de saison |
| 1224 | literal | code | 1 crisp apple (140 g, 19 g carbs) | 1 pomme croquante (140 g, 19 g glucides) |
| 1225 | literal | code | 1 crisp fresh apple | 1 pomme croquante fraîche |
| 1226 | literal | code | Fresh and crisp. | Fruits frais et croquants. |
| 1232 | literal | code | Toasted pumpkin & sunflower seeds | Graines de courge & tournesol grillées |
| 1238 | literal | code | Pumpkin & sunflower seeds (20 g, 10 g fats) | Graines de courge & tournesol (20 g, 10 g lipides) |
| 1239 | literal | code | 1 small handful of seeds | 1 poignée de graines |
| 1240 | literal | code | Crunchy and savory, 100% nut-free. | Croquant salé, garanti sans fruits à coque. |
| 1244 | literal | code | Raw walnuts | Cerneaux de noix |
| 1250 | literal | code | Walnuts (20 g, 13 g fats) | Cerneaux de noix (20 g, 13 g lipides) |
| 1251 | literal | code | 1 small handful of walnuts | 1 poignée de noix |
| 1252 | literal | code | A small handful alongside your meal. | Une petite poignée pour accompagner le repas. |
| 1294 | template | code | ${breadLabelEn} (${fillingLabelEn}) | ${breadLabelFr} (${fillingLabelFr}) |
| 1295 | literal | code | 100 g half sandwich | 100 g (demi-sandwich) |
| 1300 | template | code | ${breadLabelEn} (100 g, 36 g carbs, ${isVegan ? '10 g' : '14 g'} protein) | ${breadLabelFr} (100 g, 36 g glucides, ${isVegan ? '10 g' : '14 g'} protéines) |
| 1303 | literal | code | 1 half fresh sandwich | 1 demi-sandwich frais |
| 1304 | literal | code | Something savory to keep you going through the morning. | Une part salée pour tenir toute la matinée. |
| 1309 | literal | code | Filter coffee or hot tea | Café filtre ou thé chaud |
| 1310 | literal | code | 200 ml mug | Tasse 200 ml |
| 1315 | literal | code | Filter coffee or tea (200 ml mug) | Café filtre ou thé (200 ml) |
| 1316 | literal | code | 1 mug of coffee or tea | 1 tasse de café ou thé |
| 1317 | literal | code | A warm drink as you ease into the day. | Une boisson chaude pour bien démarrer la journée. |
| 1331 | literal | code | On arrival | À l’arrivée |
| 1332 | literal | code | Break Room / Office | Salle de Pause / Bureau |
| 1337 | nested | code | preRideStyle === 'fasted-rollout' ? 'Light start & hydration' : preRideStyle === 'light-liquid' ? 'Quick drink before yo | preRideStyle === 'fasted-rollout' ? 'Départ léger & hydratation' : preRideStyle === 'light-liquid' ? 'Petite boisson ava |
| 1349 | literal | code | Home | Domicile |
| 1350 | nested | code | preRideStyle === 'fasted-rollout' ? 'A coffee and a tall glass of water before you leave, then eat once you’re rolling.' | preRideStyle === 'fasted-rollout' ? 'Un café et un grand verre d’eau avant de partir, puis vous mangerez en route.' : pr |
| 1367 | literal | code | On-bike hydration (< 45 min) | Hydratation en selle (< 45 min) |
| 1371 | template | code | On-bike sports fueling (${effectiveHourlyRateG} g/h) | Ravito sportif en selle (${effectiveHourlyRateG} g/h) |
| 1375 | template | code | On-bike mixed fueling (${effectiveHourlyRateG} g/h) | Ravito mixte en selle (${effectiveHourlyRateG} g/h) |
| 1378 | template | code | On-bike real-food fueling (${effectiveHourlyRateG} g/h) | Ravito naturel en selle (${effectiveHourlyRateG} g/h) |
| 1381 | literal | code | Rollout to arrival (sip every 15–20 min) | Du départ à l’arrivée (boire toutes les 15–20 min) |
| 1382 | literal | code | On the road | Sur la route |
| 1385 | literal | code | Short ride: your natural reserves are plenty. Plain water is all you need on the bike. | Sortie courte : vos réserves suffisent. Un bidon d’eau suffit pour la route. |
| 1389 | template | code | Tuned to your digestion comfort (${effectiveHourlyRateG} g/h): drink mix and pocket gels. | Calibré selon votre confort digestif (${effectiveHourlyRateG} g/h) : boisson glucidique et gels d’appoint. |
| 1393 | template | code | Tuned to ${effectiveHourlyRateG} g/h: real food for steady riding + 1 quick snack for the climbs. | Calibré sur ${effectiveHourlyRateG} g/h : vrais aliments pour rouler au train + 1 collation rapide pour les côtes. |
| 1396 | template | code | Tuned to ${effectiveHourlyRateG}g/h with simple, easy-to-carry foods. | Calibré sur ${effectiveHourlyRateG} g/h avec des aliments simples et faciles à emporter. |
| 1407 | template | code | Phase 1: ${stage1Location} | Phase 1 : ${stage1Location} |
| 1410 | literal | code | Immediate post-effort replenishment. Consumed upon arrival before shower. | Recharge immédiate post-effort. Consommation rapide avant la douche. |
| 1417 | template | code | Phase 2: ${stage2Location} | Phase 2 : ${stage2Location} |
| 1420 | literal | code | Relaxed breakfast or meal before starting workday / daily activity. | Petit-déjeuner ou collation partagée à l’espace de travail. |
| 1429 | template | code | Arrival Recovery Meal (${stage1Location}) | Repas Récupérateur d’Arrivée (${stage1Location}) |
| 1432 | literal | code | Consolidated recovery meal at destination (glycogen resynthesis + complete protein). | Repas complet et équilibré à destination (recharge glycogène + protéines complètes). |

#### `src/utils/openingHours.ts` (16 translatable / 16 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 288 | literal | code | Open 24/7 | Ouvert 24h/24 |
| 358 | template | code | Closed at ${formattedEta} | Fermé à ${formattedEta} |
| 359 | template | code | Closed on ride day (hours: ${rawHours}) | Fermé ce jour (horaires : ${rawHours}) |
| 369 | template | code | Closed at ${formattedEta} | Fermé à ${formattedEta} |
| 370 | template | code | Closed at estimated arrival (${formattedEta}) · ${rawHours} | Fermé à l'heure d'arrivée estimée (${formattedEta}) · ${rawHours} |
| 383 | literal | code | Open 24/7 | Ouvert 24h/24 |
| 396 | template | code | Closing soon (${closingHHMM}) | Ferme bientôt (${closingHHMM}) |
| 399 | template | code | Closes in ${remainingMin} min at ${closingHHMM} (arrival ${formattedEta}) · ${rawHours} | Ferme dans ${remainingMin} min à ${closingHHMM} (arrivée ${formattedEta}) · ${rawHours} |
| 407 | template | code | Open at ${formattedEta} | Ouvert à ${formattedEta} |
| 408 | template | code | Open at ${formattedEta} (until ${closingHHMM}) · ${rawHours} | Ouvert à ${formattedEta} (jusqu'à ${closingHHMM}) · ${rawHours} |
| 425 | template | code | Closing soon (${closingHHMM}) | Ferme bientôt (${closingHHMM}) |
| 428 | template | code | Closes in ${remainingMin} min at ${closingHHMM} (arrival ${formattedEta}) · ${rawHours} | Ferme dans ${remainingMin} min à ${closingHHMM} (arrivée ${formattedEta}) · ${rawHours} |
| 436 | template | code | Open at ${formattedEta} | Ouvert à ${formattedEta} |
| 437 | template | code | Open at ${formattedEta} (until ${closingHHMM}) · ${rawHours} | Ouvert à ${formattedEta} (jusqu'à ${closingHHMM}) · ${rawHours} |
| 448 | template | code | Closed at ${formattedEta} | Fermé à ${formattedEta} |
| 449 | template | code | Closed at ${formattedEta} · ${rawHours} | Fermé à ${formattedEta} · ${rawHours} |

#### `src/utils/physics.ts` (28 translatable / 28 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 238 | literal | code | dark | nuit |
| 239 | literal | code | wet | mouillé |
| 240 | literal | code | damp | humide |
| 241 | literal | code | surface | surface |
| 243 | literal | code | cold tyres | pneus froids |
| 248 | template | code | −${pacePct}% pace${joined ? ` (${joined})` : ''} | −${pacePct}% allure${joined ? ` (${joined})` : ''} |
| 252 | template | code | +${crrPct}% Crr${joined ? ` (${joined})` : ''} | +${crrPct}% Crr${joined ? ` (${joined})` : ''} |
| 937 | literal | code | Sheltered Flats & Descents | Plats abrités & Descentes |
| 938 | literal | code | Active recovery & light cadence spin | Récupération active, souplesse de pédalage |
| 943 | literal | code | Rolling Cruise & Wind Exposure | Faux-plats & Sections ventées |
| 944 | literal | code | Steady endurance rhythm on undulating roads | Allure endurance régulière en prise d’air |
| 949 | literal | code | Climbs & Punchy Ramps (>3.5%) | Côtes & Relances (>3,5 %) |
| 950 | literal | code | Peak muscular effort — shift down early! | Pic d’effort musculaire — moulinez tôt ! |
| 1031 | template | code | ${roundedW}W — Gentle, effortless spin | ${roundedW} W — Promenade fluide & très confortable |
| 1034 | literal | code | Easy nasal breathing — you can chat in full paragraphs all day. | Respiration calme par le nez, conversation fluide sans aucun essoufflement. |
| 1037 | literal | code | Feels like an unhurried stroll on flat ground. | Équivaut à une marche tranquille sur terrain plat. |
| 1041 | template | code | ${roundedW}W — All-day bikepacking endurance pace | ${roundedW} W — Allure endurance idéale (rythme voyage) |
| 1044 | literal | code | Comfortable full-sentence conversation; warm legs with zero burn. | Vous parlez en phrases complètes ; les jambes chauffent doucement sans brûler. |
| 1047 | literal | code | Feels like a brisk, purposeful walk with a friend. | Équivaut à une marche rapide et tonique en discutant. |
| 1051 | template | code | ${roundedW}W — Brisk "Tempo" effort (engaged & focused) | ${roundedW} W — Allure soutenue "Tempo" (effort tonique) |
| 1054 | literal | code | Short 4–5 word phrases; deep rhythmic breathing. | Phrases courtes de 4–5 mots ; concentration active et souffle profond. |
| 1057 | literal | code | Feels like climbing a long flight of stairs at a steady clip. | Équivaut à monter un long escalier d’un pas régulier. |
| 1061 | template | code | ${roundedW}W — High threshold push (best kept short on tours) | ${roundedW} W — Effort intense près du seuil (à limiter en voyage) |
| 1064 | literal | code | 1–2 words at a time; heavy legs — switch to "Cap Effort" to ease off. | Un ou deux mots maximum ; jambes sollicitées — passez en "Effort Fixe" pour souffler. |
| 1067 | literal | code | Feels like a fast uphill run — sustainable for ~45–60 min max. | Équivaut à courir vite en côte ou grimper deux marches à la fois. |
| 1076 | literal | code | Watts measure the actual leg push on your pedals right now (unlike speed, which drops in wind or hills). | Les Watts mesurent l'énergie mécanique réelle appuyée sur vos pédales (indépendamment du vent ou de la pente). |
| 1079 | template | code | Your FTP (${ftpWatts}W) is the max steady power you can sustain for 1 hour (${pct}% used on this ride). | Votre FTP (${ftpWatts} W) est la puissance maximale que vous pouvez tenir pendant 1 heure sans exploser (${pct} % utilis |
| 1082 | template | code | ${wkg} W/kg divides your watts by body weight (${riderWeightKg}kg) — what truly matters on climbs. | ${wkg} W/kg rapporte votre puissance à votre poids (${riderWeightKg} kg) — le vrai repère dès que la route grimpe. |

#### `src/utils/planShare.ts` (11 translatable / 11 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 654 | template | code | ${stageCount}-day tour · ${Math.round(stages!.reduce((s, st) => s + st.route.distanceKm, 0))} km · Shared blueprint | Tour ${stageCount} jours · ${Math.round(stages!.reduce((s, st) => s + st.route.distanceKm, 0))} km · Plan partagé |
| 657 | template | code | ${resolvedKm} km · ${resolvedOrigin} → ${resolvedDest} (+${resolvedEl} m) · Shared Group Plan (${pinnedAmenities.length} | ${resolvedKm} km · ${resolvedOrigin} → ${resolvedDest} (+${resolvedEl} m) · Plan de groupe (${pinnedAmenities.length} ar |
| 812 | literal | code | You | Vous |
| 813 | literal | code | Partner | Partenaire |
| 933 | template | code | , ${hrs}h before sunset | , ${hrs}h avant le coucher |
| 935 | template | code | , ${hrs}h after sunset | , ${hrs}h après la nuit |
| 938 | template | code | , ${diffMin} min before sunset | , ${diffMin} min avant la nuit |
| 940 | template | code | , ${Math.abs(diffMin)} min after sunset | , ${Math.abs(diffMin)} min après la nuit |
| 945 | template | code | At ${groupSpeedKmH} km/h, both riders stay in a comfortable ${rZone}/${sZone} endurance groove (${Math.round(rCalc.legWa | À ${groupSpeedKmH} km/h, vous roulez tous les deux en ${rZone}/${sZone} confortable (${Math.round(rCalc.legWatts)} W vs  |
| 953 | template | code | At ${groupSpeedKmH} km/h, ${harderName} hits ${harderPct}% FTP (${harderZone}). Ease to ${recommendedGroupSpeedKmH} km/h | À ${groupSpeedKmH} km/h, ${harderName} monte à ${harderPct}% FTP (${harderZone}). Passez à ${recommendedGroupSpeedKmH} k |
| 957 | template | code | ${effortGapPct}% FTP effort gap at ${groupSpeedKmH} km/h — take turns gently on climbs so nobody cooks early. | Écart d’effort de ${effortGapPct}% FTP entre vous deux à ${groupSpeedKmH} km/h — prévoyez des relais doux en bosse. |

#### `src/utils/renderTelemetryCard.ts` (16 translatable / 16 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 940 | literal | code | WIND IMPACT | EFFET DU VENT |
| 941 | literal | code | Aero wind resistance | Résistance aérodynamique du vent |
| 946 | literal | code | CARB BURN | GLUCIDES |
| 947 | literal | code | Hourly carb energy | Dépense horaire estimée |
| 952 | literal | code | AIR DENSITY | DENSITÉ DE L’AIR |
| 953 | literal | code | Local air density (ρ) | Densité atmosphérique locale (ρ) |
| 958 | literal | code | EFFORT ZONE | ZONE D’EFFORT |
| 988 | expression | code | zoneToken.name | ZONE_LABELS_FR[data.powerZone] \|\| ZONE_LABELS_FR.Z1 |
| 1087 | template | code | ${bidons}× Bottle${bidons > 1 ? 's' : ''} | ${bidons}× Bidon${bidons > 1 ? 's' : ''} |
| 1095 | literal | code | TOTAL WORK | TRAVAIL TOTAL |
| 1097 | literal | code | Energy spent | Énergie dépensée |
| 1102 | literal | code | HYDRATION | HYDRATATION |
| 1104 | template | code | ~${(data as any).bottleVolumeMl \|\| 650} ml / bottle | ~${(data as any).bottleVolumeMl \|\| 650} ml par bidon |
| 1111 | literal | code | FUELING | RAVITAILLEMENT |
| 1112 | literal | code | Ready | Prêt |
| 1113 | literal | code | Plan ready | Plan vérifié |

#### `src/utils/rideBrief.ts` (71 translatable / 71 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 112 | template | code | ${base} incl. stops | ${base} arrêts inclus |
| 114 | template | code | ${base} saddle | ${base} de selle |
| 188 | literal | code | Commute | Vélotaf |
| 215 | literal | code | Start time | Départ prévu |
| 218 | literal | code | Leave by | Départ limite |
| 223 | template | code | Est. ${timeline.gateArrivalTime} finish | Fin estimée ${timeline.gateArrivalTime} |
| 227 | template | code | For your ${timeline.shiftStartTime} start | Pour ton arrivée à ${timeline.shiftStartTime} |
| 230 | template | code | For ${timeline.gateArrivalTime} finish | Pour arriver vers ${timeline.gateArrivalTime} |
| 243 | literal | code | en | fr |
| 276 | literal | code | Lights on. Easy, steady ride. | Allume tes feux et roule tranquille. |
| 280 | literal | code | Worth a quick tweak before you roll. | Un petit ajustement avant de partir. |
| 284 | literal | code | Almost set — check the flags below. | Presque prêt — jette un œil aux points clés. |
| 287 | literal | code | Good to roll. | Feu vert, bonne route. |
| 300 | template | code | ${distRounded} km on ${activeBike.name} looks straightforward — set ${pressureFormatted} and enjoy the ride${wattsTail}. | Tes ${distRounded} km sur ${activeBike.name} s’annoncent simples — gonfle à ${pressureFormatted} et profite${wattsTail}. |
| 305 | literal | code | Best to wait or adjust. | Mieux vaut reporter ou adapter. |
| 306 | template | code | Rough conditions on this ${distRounded} km ${archWordEn} — check the gusts and road grip before rolling out. | Conditions rudes sur ce parcours de ${distRounded} km — vérifie les rafales et l’adhérence avant de partir. |
| 316 | template | code | Flip the loop. Save ${loopComp.minutesSaved} min. | Inverse la boucle, gagne ${loopComp.minutesSaved} min. |
| 319 | template | code | Riding ${orientationLabelEn} puts the ${windCardinal} wind behind you on the way back for a smoother finish${wattsTail}. | Partir dans le ${orientationLabelFr} met le vent ${windCardinal} dans ton dos pour rentrer plus léger${wattsTail}. |
| 323 | literal | code | Give yourself an easy start. | Pars tranquille. |
| 324 | template | code | A ${distRounded} km commute is a proper ride — settle into a comfortable rhythm and save your legs for the day${wattsTai | Un vélotaf de ${distRounded} km, c’est déjà une vraie sortie — cale un rythme confortable pour arriver frais${wattsTail} |
| 328 | literal | code | Pace easy early, finish strong. | Gère la première moitié. |
| 329 | template | code | ${distRounded} km on ${activeBike.name} is a proper day out — eat early and keep the first half relaxed${wattsTail}. | ${distRounded} km sur ${activeBike.name}, c’est une belle virée — mange tôt et garde de la réserve sur les premiers kilo |
| 335 | template | code | makes the flats feel like a +${windInsight.equivalentGradePct.toFixed(1)}% climb | transforme le plat en côte à +${windInsight.equivalentGradePct.toFixed(1)} % |
| 338 | template | code | adds ~${Math.round(physics.windDelayMinutes)} min if you fight it | ajoute ~${Math.round(physics.windDelayMinutes)} min si tu forces |
| 341 | literal | code | Steady effort into the breeze. | Roule souple face au vent. |
| 342 | template | code | A ${baseWind} km/h ${windCardinal} breeze ${gradeLabel} — spin smooth instead of chasing your usual speed${wattsTail}. | Un vent ${windCardinal} de ${baseWind} km/h ${gradeLabel} — garde un coup de pédale fluide au lieu de courir après la mo |
| 346 | literal | code | Softer tyres, smoother gravel. | Pression souple pour le gravel. |
| 347 | template | code | With ${unpavedPct}% unpaved roads across ${distRounded} km, ${pressureFormatted} on ${activeBike.name} keeps steering pl | Avec ${unpavedPct} % de chemins sur ${distRounded} km, ${pressureFormatted} sur ${activeBike.name} te garde du grip et d |
| 351 | literal | code | Nice breeze at your back. | Joli vent dans le dos. |
| 352 | template | code | A supportive ${windCardinal} tailwind helps carry your ${distRounded} km ${archWordEn} on ${activeBike.name} — enjoy the | Le vent ${windCardinal} pousse tes ${distRounded} km sur ${activeBike.name} — profite de l’élan gratuit. |
| 368 | template | code | Real climbing: ${realElevM} m · Wind adds +${windInsight.ghostElevationM} m of invisible climbing${windInsight.iconicCli | Vrai dénivelé : ${realElevM} m · Le vent ajoute +${windInsight.ghostElevationM} m de montée invisible${windInsight.iconi |
| 375 | template | code | Around ${totalKcal.toLocaleString('en-US')} kcal burned (≈ ${croissantsEquiv} ${croissantLabel}) and ~${totalSweatLiters | Environ ${totalKcal.toLocaleString('fr-FR')} kcal brûlées (≈ ${croissantsEquiv} ${croissantLabel}) et ~${totalSweatLiter |
| 382 | template | code | ${tempC}°C at the front door, ${feelsLikeC}°C once you’re rolling — an extra layer helps for the first 20 minutes. | ${tempC} °C devant la porte, ${feelsLikeC} °C une fois lancé — une couche de plus aide bien sur les 20 premières minutes |
| 389 | template | code | Today’s tailwind gives you the equivalent of ${Math.abs(windInsight.ghostElevationM)} m of free downhill across the ride | Le vent de dos aujourd’hui t’offre l’équivalent de ${Math.abs(windInsight.ghostElevationM)} m de descente gratuite sur l |
| 408 | literal | code | Lights on for the whole ride | Éclairage requis sur tout le trajet |
| 409 | template | code | ${daylightMin} min daylight · Bring a ${lumensCompact} light | ${daylightMin} min de jour · Phare ${lumensCompact} |
| 433 | literal | code | Low-light sections ahead | Passages à faible luminosité |
| 434 | template | code | ${lowLightPct}% twilight/dark · Pack ${lumensCompact} optics | ${lowLightPct}% pénombre · Optiques ${lumensCompact} |
| 443 | template | code | Tyres: ${pressureSpacedFormatted} | Pneus : ${pressureSpacedFormatted} |
| 446 | template | code | ${tireWidthMm} mm ${activeBike.isTubeless ? 'tubeless' : 'tubes'}${unpavedPct > 0 ? ` · ${unpavedPct}% unpaved` : ' · 15 | ${tireWidthMm} mm ${activeBike.isTubeless ? 'tubeless' : 'chambre'}${unpavedPct > 0 ? ` · ${unpavedPct}% chemins` : ' ·  |
| 459 | template | code | Rain risk ${rainRisk}%${gusts >= 30 ? ` · ${gusts} km/h gusts` : ''} | Pluie ${rainRisk}%${gusts >= 30 ? ` · rafales ${gusts} km/h` : ''} |
| 462 | template | code | Wind from ${windCardinal} · ${kit.tierBadge} + ${kit.upperBody} | Vent ${windCardinal} · ${kit.tierBadge} + ${kit.upperBody} |
| 471 | template | code | Gusts reach ${gusts} km/h | Rafales jusqu'à ${gusts} km/h |
| 472 | template | code | Wind from ${windCardinal} · Stay steady in exposed sections | Vent ${windCardinal} · Reste souple en zone exposée |
| 498 | template | code | Calm skies · ${kit.tierBadge} | Ciel calme · ${kit.tierBadge} |
| 499 | template | code | Wind ${windCardinal} ${baseWind} km/h · Feels like ${feelsLikeC}°C · ${roadSurfaceTextEn} | Vent ${windCardinal} ${baseWind} km/h · Ressenti ${feelsLikeC}°C · ${roadSurfaceTextFr} |
| 516 | literal | code | Sip & bite every 20 min | Gorgée & bouchée toutes les 20 min |
| 520 | template | code | ~${fuelUnitsPerHr} snacks / hr | ~${fuelUnitsPerHr} en-cas / h |
| 523 | template | code | Fuel regularly: ${carbsPerHr} g carbs/h | Ravito régulier : ${carbsPerHr} g/h |
| 528 | template | code | ${bottlesBadge} · ${totalCarbsG} g total | ${bottlesBadge} · ${totalCarbsG} g au total |
| 537 | literal | code | Stay hydrated · No extra carbs needed | Hydrate-toi · Pas besoin de glucides en plus |
| 540 | template | code | ${bottlesBadge} · Pre-ride fuel covers energy | ${bottlesBadge} · Ton repas d’avant départ suffit |
| 632 | template | code | ${stop.name} ${isClosed ? 'closed' : 'closing soon'} at ${eta} (km ${stop.routeKm}) → nearest open: ${openAlt.name} at k | ${stop.name} ${isClosed ? 'fermé' : 'ferme bientôt'} à ${eta} (km ${stop.routeKm}) → ouvert le plus proche : ${openAlt.n |
| 635 | template | code | ${stop.name} ${isClosed ? 'closed' : 'closing soon'} at arrival (${eta}, km ${stop.routeKm}) | ${stop.name} ${isClosed ? 'fermé' : 'ferme bientôt'} à ton passage (${eta}, km ${stop.routeKm}) |
| 640 | template | code | ${openAlt.name} is open at ${altEta} (${openAlt.detourMeters < 75 ? 'on route' : `+${openAlt.detourMeters} m detour`}).  | ${openAlt.name} est ouvert à ${altEta} (${openAlt.detourMeters < 75 ? 'sur la trace' : `+${openAlt.detourMeters} m`}). H |
| 669 | template | code | Critical water gap km ${g.startKm}–${g.endKm} (${g.distanceKm} km · ${g.depletionPct ?? 100}% depletion) | Trou d’eau critique km ${g.startKm}–${g.endKm} (${g.distanceKm} km · ${g.depletionPct ?? 100}% d’autonomie) |
| 672 | template | code | Estimated need ${g.gapFluidNeedMl ?? 0} ml vs ${g.onboardCapacityMl ?? frameBottleSlots * bidonSizeMl} ml on frame — pac | Besoin estimé ${g.gapFluidNeedMl ?? 0} ml pour ${g.onboardCapacityMl ?? frameBottleSlots * bidonSizeMl} ml sur le cadre  |
| 681 | template | code | Long dry stretch km ${g.startKm}–${g.endKm} (${g.distanceKm} km) | Long secteur sans eau km ${g.startKm}–${g.endKm} (${g.distanceKm} km) |
| 684 | template | code | Uses ~${g.depletionPct ?? 70}% of bottle capacity — top up before km ${g.startKm}. | Consomme ~${g.depletionPct ?? 70} % de tes bidons — remplis avant le km ${g.startKm}. |
| 703 | template | code | Heavy headwind km ${worstWindSector.startKm}–${worstWindSector.endKm} (${Math.round(worstWindSector.effectiveHeadwindKmH | Gros vent de face km ${worstWindSector.startKm}–${worstWindSector.endKm} (${Math.round(worstWindSector.effectiveHeadwind |
| 706 | template | code | Wind adds around +${Math.round(physics.windDelayMinutes)} min around ${worstWindSector.etaHHMM} — save a bit of energy b | Le vent ajoute environ +${Math.round(physics.windDelayMinutes)} min vers ${worstWindSector.etaHHMM} — garde un peu d’éne |
| 714 | template | code | Wind slows this ride by about +${Math.round(physics.windDelayMinutes)} min | Le vent ralentit la sortie d’environ +${Math.round(physics.windDelayMinutes)} min |
| 717 | literal | code | Better to ride by feel than chase your usual average speed. | Mieux vaut rouler aux sensations qu’en chassant ta vitesse moyenne habituelle. |
| 732 | template | code | Rain likely (${Math.round(maxRain)}%) — expect wet roads | Pluie probable (${Math.round(maxRain)} %) — routes humides |
| 735 | literal | code | Pack a rain shell, clear lenses, and drop 0.2 bar for extra cornering grip. | Prends un coupe-pluie, des verres clairs et retire 0,2 bar pour garder du grip. |
| 747 | literal | code | All clear across weather, pace, and stops | Rien à signaler sur la trace ni côté météo |
| 751 | literal | code | Tip: open the Resupply tab to check live water stops and bakery opening hours. | Astuce : ouvre l’onglet Ravitaillement pour vérifier les fontaines et les boulangeries ouvertes. |
| 754 | template | code | ${pinnedAmenities.length} pinned stop(s) verified against your arrival window. | ${pinnedAmenities.length} arrêt(s) épinglé(s) vérifié(s) pour ton passage. |
| 878 | template | code | ${hydration.carriedOnFrameBidons}× ${bidonSizeMl} ml + ${hydration.plannedRefillBidons} refill${hydration.plannedRefillB | ${hydration.carriedOnFrameBidons}× ${bidonSizeMl} ml + ${hydration.plannedRefillBidons} rech. |
| 929 | literal | code | en | fr |
| 1013 | literal | code | en | fr |

#### `src/utils/rideReadiness.ts` (58 translatable / 58 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 185 | template | code | Rain ${Math.round(w.rainRiskPct)}% | Pluie ${Math.round(w.rainRiskPct)}% |
| 186 | template | code | gusts ${Math.round(w.gustKmH)} km/h | rafales ${Math.round(w.gustKmH)} km/h |
| 187 | template | code | feels ${Math.round(t)}°C | ressenti ${Math.round(t)}°C |
| 194 | literal | code | Shift the window or pack a rain shell | Décalez la sortie ou prenez une veste imperméable |
| 196 | literal | code | Pick a calmer window | Choisis un créneau moins venté |
| 200 | literal | code | Ride later in the day or layer up | Pars plus tard dans la journée ou couvre-toi bien |
| 203 | literal | code | Ride earlier, before the heat | Pars plus tôt, à la fraîche |
| 209 | literal | code | Adjust window | Ajuster le créneau |
| 264 | expression | code | { road: 'Road', gravel: 'Gravel', mtb: 'MTB', urban: 'City', touring: 'Touring' }[cat] | { road: 'Route', gravel: 'Gravel', mtb: 'VTT', urban: 'Ville', touring: 'Rando' }[cat] |
| 267 | literal | code | Bike | Vélo |
| 269 | literal | code | surface assumed paved | surface supposée goudron |
| 273 | literal | code | 100% paved | 100% goudron |
| 276 | template | code | ${Math.round(unpaved)}% unpaved | ${Math.round(unpaved)}% chemins |
| 284 | literal | code | A road or gravel bike would be faster here | Un vélo route ou gravel irait plus vite ici |
| 286 | literal | code | Take an MTB or ≥ 45 mm tyres | Prends un VTT ou des pneus ≥ 45 mm |
| 289 | template | code | Switch to ≥ ${needed} mm tyres | Passe à des pneus ≥ ${needed} mm |
| 291 | literal | code | Carry spare tubes and a patch kit | Emportez chambres et rustines |
| 293 | literal | code | Take the technical sectors steady | Roulez prudemment sur les secteurs techniques |
| 297 | literal | code | Switch bike | Changer de vélo |
| 324 | template | code |  · ${plannedStopMin} min stop |  · pause ${plannedStopMin} min |
| 328 | template | code |  · ${plannedStopMin} min max stop |  · pause ${plannedStopMin} min max |
| 339 | literal | code | Ease the pace by one zone | Baisse l’allure d’une zone |
| 341 | literal | code | Ease pace | Baisser l’allure |
| 343 | literal | code | Shorten the route (stops capped at 5 min pre-dawn in winter) | Raccourcissez la trace (pauses limitées à 5 min avant l’aube en hiver) |
| 347 | literal | code | Shorten route | Raccourcir la trace |
| 349 | literal | code | Shorten the route or extend your stop | Raccourcissez la trace ou allongez la pause |
| 353 | literal | code | Adjust route / stop | Ajuster trace / pause |
| 355 | literal | code | Shorten the route or plan a long stop | Raccourcissez la trace ou prévoyez une pause longue |
| 359 | literal | code | Add stop / shorten | Ajouter pause / raccourcir |
| 370 | literal | code | No checklist | Aucune check-list |
| 384 | template | code | ${c.checked} of ${c.total} checked${critLeft > 0 ? ` · ${critLeft} essential left` : ''} | ${c.checked} sur ${c.total} cochés${critLeft > 0 ? ` · ${critLeft} essentiel${critLeft > 1 ? 's' : ''}` : ''} |
| 392 | template | code | Tick ${critLeft} essential item${critLeft > 1 ? 's' : ''} | Cochez ${critLeft} élément${critLeft > 1 ? 's' : ''} essentiel${critLeft > 1 ? 's' : ''} |
| 395 | template | code | Finish your checklist (${left} left) | Finissez la check-list (${left} restant${left > 1 ? 's' : ''}) |
| 399 | literal | code | Review checklist | Voir la check-list |
| 410 | template | code | ${Math.round(night)}% in the dark | ${Math.round(night)}% de nuit |
| 414 | template | code | ${Math.round(twilight)}% twilight | ${Math.round(twilight)}% pénombre |
| 417 | template | code | ${Math.round(daylight)}% daylight | ${Math.round(daylight)}% de jour |
| 422 | literal | code | Leave earlier or charge your lights | Pars plus tôt ou charge tes éclairages |
| 427 | literal | code | Shift departure | Décaler le départ |
| 438 | literal | code | No blockers | Aucun point bloquant |
| 442 | template | code | ${r.issueCount} issue${r.issueCount > 1 ? 's' : ''} flagged | ${r.issueCount} point${r.issueCount > 1 ? 's' : ''} à vérifier |
| 445 | literal | code | Minor note | Info à noter |
| 450 | literal | code | Sort the flagged stop or water gap | Réglez le point signalé sur la trace |
| 455 | literal | code | Review stops | Voir les arrêts |
| 472 | literal | code | Weather | Météo |
| 473 | literal | code | Bike & terrain | Vélo & terrain |
| 474 | literal | code | Effort | Effort |
| 475 | literal | code | Checklist | Check-list |
| 476 | literal | code | Daylight | Lumière |
| 477 | literal | code | Route & stops | Trace & arrêts |
| 499 | template | code | Pulled down by ${weakest.label.toLowerCase()} (${weakest.score}/100) | Freiné par ${weakest.label.toLowerCase()} (${weakest.score}/100) |
| 506 | literal | code | Severe wind conditions | Conditions de vent sévères |
| 513 | literal | code | Good to go | Prêt à rouler |
| 517 | literal | code | Worth a tweak | À ajuster |
| 520 | literal | code | Needs a change | À revoir |
| 525 | literal | code | Conditions line up. Good to go. | Les conditions sont alignées — tu peux y aller. |
| 529 | literal | code | Rideable. A tweak or two will make it better. | Faisable — un ou deux ajustements la rendront plus agréable. |
| 532 | literal | code | A few things are off — worth adjusting before you roll. | Pas mal de points à revoir avant de partir. |

#### `src/utils/rideVoiceAlerts.ts` (23 translatable / 23 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 212 | literal | code | Planned stop | Arrêt prévu |
| 215 | literal | code | Water stop | Point d'eau |
| 217 | literal | code | Cemetery water stop | Point d'eau cimetière |
| 219 | literal | code | Food stop | Ravitaillement |
| 221 | literal | code | Bike shop or shelter | Atelier vélo ou abri |
| 223 | literal | code | Essentials stop | Services |
| 225 | literal | code | Train station | Gare de repli |
| 261 | template | code | ${stopLabel} in 1 km | ${stopLabel} dans 1 km |
| 262 | template | code | ${stopLabel} in 1 kilometer: ${stopName}. | ${stopLabel} dans 1 kilomètre : ${stopName}. |
| 276 | template | code | ${stopLabel} ahead | ${stopLabel} à proximité |
| 277 | template | code | ${stopLabel} right ahead: ${stopName}. | ${stopLabel} juste devant : ${stopName}. |
| 293 | template | code | In ${meters} meters, ${entry.instruction}. | Dans ${meters} mètres, ${entry.instruction}. |
| 314 | literal | code | Hydration cue: take a few sips from your bottle. | Rappel hydratation : buvez quelques gorgées. |
| 319 | literal | code | Fueling cue: take a carb bite or gel. | Rappel ravitaillement : prenez une portion de glucides. |
| 323 | literal | code | Drink and fuel cue: sip water and take a carb bite. | Rappel hydratation et énergie : buvez et prenez une bouchée. |
| 343 | template | code | Test: ${label} in 1 km | Test : ${label} dans 1 km |
| 344 | template | code | ${label} in 1 kilometer: ${name}. Also remember to take a sip. | ${label} dans 1 kilomètre : ${name}. Pensez aussi à boire. |
| 354 | template | code | Test: ${nextTurn.instruction} | Test : ${nextTurn.instruction} |
| 355 | template | code | In 250 meters, ${nextTurn.instruction}. | Dans 250 mètres, ${nextTurn.instruction}. |
| 364 | literal | code | Test: Water & fueling cue | Test : Rappel hydratation & point d’eau |
| 365 | literal | code | Water stop in 1 kilometer. Take a few sips from your bottle. | Point d'eau dans 1 kilomètre. Buvez quelques gorgées. |
| 469 | literal | code | en-US | fr-FR |
| 474 | literal | code | en | fr |

#### `src/utils/routing.ts` (7 translatable / 7 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 101 | literal | code | No cycling path found between those locations and via-points. | Aucun itinéraire cyclable trouvé entre ces lieux et points de passage. |
| 109 | template | code | Could not calculate cycling directions right now (status ${lastStatus}). | Impossible de calculer l’itinéraire vélo pour le moment (code ${lastStatus}). |
| 119 | literal | code | Could not calculate cycling directions right now (request timed out). | Impossible de calculer l’itinéraire vélo pour le moment (délai dépassé). |
| 139 | template | code | Could not find coordinates for origin ("${originText}"). Please choose a suggestion from the dropdown. | Impossible de trouver les coordonnées du départ ("${originText}"). Choisissez une suggestion dans la liste. |
| 162 | template | code | Could not locate intermediate stop "${trimmedName \|\| `Stop ${i + 1}`}". Please pick a suggestion from the dropdown. | Impossible de localiser l’arrêt intermédiaire "${trimmedName \|\| `Étape ${i + 1}`}". Choisissez une suggestion dans la  |
| 181 | template | code | Could not find coordinates for destination ("${destText}"). Please choose a suggestion from the dropdown. | Impossible de trouver les coordonnées de la destination ("${destText}"). Choisissez une suggestion dans la liste. |
| 939 | template | code | Could not locate "${originText}". Choose a suggestion from the dropdown. | Impossible de localiser "${originText}". Sélectionnez un lieu dans la liste. |

#### `src/utils/stemSticker.ts` (13 translatable / 13 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 223 | template | code | 1×${bidonSizeMl} ml · Water only | 1×${bidonSizeMl} ml · Eau seule |
| 226 | template | code | Eat /${eatMin}m · Sip /${sipMin}m · ${hydration.carriedOnFrameBidons}×${bidonSizeMl}ml | Manger /${eatMin}m · Boire /${sipMin}m · ${hydration.carriedOnFrameBidons}×${bidonSizeMl}ml |
| 300 | template | code | DRY ${worstGap.distanceKm.toFixed(0)} km (→ km ${worstGap.endKm.toFixed(0)}) | SEC ${worstGap.distanceKm.toFixed(0)} km (→ km ${worstGap.endKm.toFixed(0)}) |
| 303 | literal | code | Fill all bottles here | Remplir tous les bidons |
| 354 | literal | code | Open ✓ | Ouvert ✓ |
| 358 | literal | code | Closed ✗ | Fermé ✗ |
| 362 | literal | code | Closing soon | Ferme bientôt |
| 389 | literal | code | Cemetery tap | Robinet cimetière |
| 392 | literal | code | Water tap | Point d’eau |
| 425 | literal | code | Eat snack & sip water | Manger & boire |
| 443 | literal | code | Roll out | Départ |
| 452 | literal | code | Finish | Arrivée |
| 458 | literal | code | My Bike Ride | Ma sortie vélo |

#### `src/utils/timeline.ts` (184 translatable / 184 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 207 | literal | code | Water stop | Point d'eau |
| 213 | literal | code | Cemetery water | Cimetière (Eau) |
| 219 | literal | code | Resupply stop | Ravitaillement |
| 225 | literal | code | Repair / Shelter | Atelier / Abri |
| 231 | literal | code | Toilet / Fuel / Med | WC / Pharm. / Station |
| 237 | literal | code | Train bailout | Gare de repli |
| 311 | literal | code | Self-Supported Fuel Stop | Arrêt Ravitaillement Autonome |
| 315 | template | code | Calculated arrival at ${time} (19:00–07:00)${closedStopName ? ` — ${closedStopName} closed` : ''}. Rely on onboard self- | Arrivée prévue à ${time} (19:00–07:00)${closedStopName ? ` — ${closedStopName} fermé` : ''}. Ravitaillement autonome emb |
| 396 | template | code | Intermediate stop ${idx + 1} | Étape ${idx + 1} |
| 453 | literal | code | Routed via stop | Étape intégrée au tracé |
| 456 | literal | code | Radar pin | Épingle Radar |
| 473 | literal | code | en | fr |
| 502 | literal | code | Intermediate stop along the route | Point de passage intermédiaire sur le parcours |
| 625 | literal | code | Hotel Check-in | Réception Hôtel |
| 627 | literal | code | Camp / Bivouac Site | Zone de Bivouac |
| 629 | literal | code | Finish Line | Ligne d’arrivée |
| 630 | literal | code | Gate | Porte |
| 639 | expression | code | rawGate.replace(/^Porte\b/i, 'Gate') | rawGate.replace(/^Gate\b/i, 'Porte') |
| 665 | literal | code | Hydration & Fast Carbs Primer | Hydratation & Charge Glucides Rapides |
| 666 | literal | code | Home Base | Domicile |
| 670 | literal | code | 500 ml electrolytes + 60 g fast carbs. Check GPS/HR battery. | 500 ml électrolytes + 60 g glucides rapides. Contrôle charge GPS/cardio. |
| 673 | template | code | Tall glass electrolytes + ${compliantPantry.preRide.nameEn.toLowerCase()}. | Grand verre électrolytes + ${compliantPantry.preRide.nameFr.toLowerCase()}. |
| 681 | literal | code | Tire pressure & bike check | Contrôle vélo & pression des pneus |
| 682 | literal | code | Roll-Out Point | Zone de départ |
| 685 | template | code | Tire pressures dialed for smooth rolling. Lube check and ${slots}× ${bidonMl} ml water bottle${slots > 1 ? 's' : ''}. | Pression des pneus ajustée pour un bon rendement. Vérification lubrification chaîne et mise en place des ${slots} bidon$ |
| 693 | literal | code | Start ride & gentle warmup | Départ & échauffement progressif |
| 694 | literal | code | Origin | Départ |
| 697 | template | code | 15-min progressive spin before settling into target pace (~${route.targetSpeedKmH \|\| 30} km/h). | 15 min de vélocité progressive avant de caler l'allure cible (~${route.targetSpeedKmH \|\| 30} km/h). |
| 705 | literal | code | Mid-Ride Carb & Electrolyte Window | Fenêtre Ravito Glucides & Électrolytes |
| 706 | literal | code | Pacing Sector | Secteur Allure |
| 710 | template | code | On-bike fuel: ~${riderCarbs} g carbs/h with steady hydration. | Ravito en selle : ~${riderCarbs} g glucides/h et hydratation régulière. |
| 713 | template | code | On-bike fuel (${fuelRateText}) — keep a steady rhythm. | Ravito en selle (${fuelRateText}) — reste régulier. |
| 721 | template | code | Stage Finish: ${destTitle} | Arrivée d'étape : ${destTitle} |
| 725 | literal | code | Cross route finish marker. 5-min easy spin down below 120 bpm. | Passage de la ligne d’arrivée. 5 min de retour au calme souple sous 120 bpm. |
| 733 | literal | code | Post-Ride Recovery & Stretch | Récupération & étirements |
| 734 | literal | code | Post-ride | Après la sortie |
| 738 | literal | code | 25 g protein + 500 ml cold water and light stretch. | 25 g protéines + 500 ml eau fraîche et étirements légers. |
| 741 | template | code | ${compliantPantry.postRide.nameEn} + tall glass of cold water. | ${compliantPantry.postRide.nameFr} + grand verre d’eau fraîche. |
| 752 | literal | code | KOM Segment Attacks & Ridge Climbs | Chasse aux KOM & Répétitions en Côte |
| 753 | literal | code | KOM Ridge Segment | Secteur Bosses |
| 757 | literal | code | Punchy 380 W+ surges on target segments, out-of-the-saddle attacks and smooth recovery descents. | Attaques à 380 W+ sur les segments clés, relances explosives en danseuse et descente souple en récupération. |
| 760 | literal | code | Punchy hard surges on target segments, out-of-the-saddle attacks and smooth recovery descents. | Attaques soutenues sur les segments clés, relances dynamiques en danseuse et descente souple en récupération. |
| 772 | literal | code | Threshold VO2max Interval Sets (310 W+) | Fractionné au Seuil (Séries à 310 W+) |
| 775 | literal | code | Sustained Threshold Interval Sets | Fractionné soutenu au seuil |
| 778 | literal | code | Interval Stretch | Zone d’effort |
| 782 | literal | code | Structured threshold repetitions holding 310 W+ with steady cadence (95–100 RPM). | Répétitions au seuil (310 W+) avec maintien d’une cadence régulière à 95–100 tr/min. |
| 785 | literal | code | Structured hard threshold repetitions with smooth cadence control (95-100 RPM). | Répétitions soutenues au seuil avec maintien d’une cadence fluide à 95–100 tr/min. |
| 796 | literal | code | Paceline Rotations (33 km/h) | Peloton & Relais Organisés (33 km/h) |
| 797 | literal | code | Open Road | Groupe |
| 800 | literal | code | Smooth 20–30 s pulls at 33 km/h, saving 15–20% effort riding in the draft. | Relais réguliers de 20–30 s à 33 km/h avec 15–20 % d’économie d’effort à l’abri du vent. |
| 811 | template | code | Tailored Carb Pacing (${riderCarbs} g/h) & Electrolytes | Ravitaillement ${riderCarbs} g glucides/h & électrolytes |
| 814 | template | code | Steady Fueling (${fuelRateText}) & Electrolytes | Ravitaillement (${fuelRateText}) & électrolytes |
| 818 | template | code | Steady fueling calibrated to your carb target (${riderCarbs} g/h) + 500–750 mg sodium reload to prevent bonking and cram | Apport régulier calibré sur votre tolérance digestive (${riderCarbs} g/h) + recharge sodium 500–750 mg pour éviter toute |
| 821 | template | code | Steady fueling calibrated to your digestion comfort (${fuelRateText}) + electrolyte sips to prevent energy dips. | Apport régulier calibré sur votre confort digestif (${fuelRateText}) + boisson électrolytes pour éviter le coup de mou. |
| 835 | literal | code | Pannier / Saddlebag weight distribution & meals | Répartition du poids sacoches & repas |
| 836 | literal | code | Camp / Base | Camp / Départ |
| 839 | literal | code | Pack dry bags, balance panniers/saddlebag, check water filter. | Compression sacs étanches, équilibrage sacoches et filtre à eau. |
| 847 | literal | code | Check bags, brakes & repair kit | Contrôle sacoches, freins & kit réparation |
| 848 | literal | code | Trailhead | Départ |
| 851 | literal | code | Torque check handlebar harness, secure seat-pack sway, check tire sidewalls for loaded clearance. | Serrage du harnais de cintre, maintien de la sacoche de selle et vérification des flancs de pneus sous charge. |
| 859 | template | code | Trailhead rollout toward ${destTitle} | Départ expédition vers ${destTitle} |
| 860 | literal | code | Origin | Départ |
| 863 | template | code | Steady endurance cadence (~${route.targetSpeedKmH \|\| 18} km/h) under loaded cargo mass. | Cadence d’endurance régulière (~${route.targetSpeedKmH \|\| 18} km/h) avec vélo chargé. |
| 871 | literal | code | Mid-Stage Water Resupply & Bag Check | Ravito Mi-Étape, Eau & Sanglage |
| 872 | literal | code | Midway Sector | Mi-Parcours |
| 875 | literal | code | Check frame bag straps for trail vibration looseness. Top off water bladders. | Contrôle de tension des sangles après vibrations et remplissage des réserves d’eau. |
| 883 | template | code | Arrival at ${destTitle} | Arrivée à ${destTitle} |
| 887 | literal | code | Reach destination or bivouac zone. Survey ground for camp setup. | Arrivée sur la zone de bivouac avant le crépuscule. Repérage d’un sol plat. |
| 895 | literal | code | Bivouac Setup, Evening Charging & Recovery | Montage Bivouac, Recharge & Récupération |
| 896 | literal | code | Bivouac Site | Zone de Bivouac |
| 899 | literal | code | Pitch shelter, charge GPS/lights on power bank, warm dinner. | Montage tente, recharge GPS/feux sur batterie et dîner chaud. |
| 910 | literal | code | Alpine Pass Summit & Brake Pad Check | Franchissement de Col & Contrôle Freins |
| 911 | literal | code | Alpine Pass Summit | Sommet du Col |
| 914 | literal | code | Brake pad bite check before technical descent, altitude hydration and wind gilet deployed. | Contrôle du mordant des freins avant la descente technique, hydratation haute altitude et coupe-vent enfilé. |
| 921 | literal | code | Mountain Bivouac Arrival before Dusk | Arrivée Bivouac Montagne avant Crépuscule |
| 922 | literal | code | Target arrival before 19:30 to secure sheltered mountain camp against altitude wind. | Arrivée conseillée avant 19:30 pour installer le campement abrité du vent d’altitude. |
| 935 | literal | code | On-route self-supported | En autonomie sur le parcours |
| 937 | literal | code | Village Bakery | Boulangerie de village |
| 946 | literal | code | Village Bakery & Spring Water Resupply | Ravitaillement Boulangerie & Eau de Source |
| 947 | literal | code | Village Spring Waypoint | Fontaine du Village |
| 951 | literal | code | Quick 5-min max stop (pre-dawn winter cap) to prevent core temp drop: top off water & grab rations. | Arrêt express de 5 min max (départ hivernal avant l’aube) pour éviter le refroidissement : recharge eau et pain/fruits s |
| 954 | literal | code | Top off 2L water capacity, pick up fresh bread, dried fruit & energy rations. | Recharge des 2L d’eau, approvisionnement en pain frais, fruits secs et bananes. |
| 965 | literal | code | Wild Bivouac: Leave-No-Trace & Gravity Filter | Bivouac Sauvage : Zéro Trace & Filtration d’Eau |
| 966 | literal | code | Pitch ultralight shelter, gravity water filtration, hot camp stove stew, and pristine leave-no-trace protocol. | Montage de l’abri ultraléger, filtration d’eau à la flasque et repas chaud lyophilisé au réchaud. |
| 975 | literal | code | Off-Grid Trail Pressure & Tubeless Dart Check | Calibrage Pression Tout-Terrain & Mèches |
| 976 | literal | code | Pressures dialed to 2.4 bar for loose trail grip, tubeless dart plug tool mounted within reach. | Pression descendue à 2,4 bar pour maximiser l’adhérence sur piste caillouteuse, outil mèches accessible. |
| 991 | literal | code | Pannier balance & hydration primer | Répartition sacoches & hydratation |
| 992 | literal | code | Home / Start | Départ |
| 995 | literal | code | Drink 400 ml electrolytes; balance pannier/saddlebag load. | 400 ml eau + électrolytes ; contrôle équilibrage sacoches. |
| 1004 | literal | code | Fasted hydration | Hydratation pré-départ (à jeun) |
| 1005 | literal | code | Pre-Ride Energy Breakfast | Collation Énergétique Pré-Départ |
| 1006 | literal | code | Kitchen Counter | Cuisine |
| 1010 | template | code | Light hydration (water + espresso or tea). Fill ${slots}× water bottle${slots > 1 ? 's' : ''} for the road. | Hydratation légère (eau + expresso ou thé). Remplissage des ${slots} bidon${slots > 1 ? 's' : ''} pour la route. |
| 1013 | template | code | ${compliantPantry.preRide.nameEn} + espresso. Fill ${slots}× water bottle${slots > 1 ? 's' : ''} for the road. | ${compliantPantry.preRide.nameFr} + expresso. Remplissage des ${slots} bidon${slots > 1 ? 's' : ''} pour la route. |
| 1021 | literal | code | Quick bike check | Contrôle rapide du vélo |
| 1022 | literal | code | Start | Départ |
| 1025 | literal | code | Tire pressures at touring spec, panniers strapped, GPS route locked. | Pression pneus cyclo, sacoches sanglées, kit anti-crève et trace GPS chargée. |
| 1033 | template | code | Rollout toward ${destTitle} | Départ vers ${destTitle} |
| 1034 | literal | code | Origin | Départ |
| 1037 | template | code | Steady touring pace (~${route.targetSpeedKmH} km/h). Target arrival by ${targetArrival}. | Allure cyclo régulière (~${route.targetSpeedKmH} km/h). Arrivée cible à ${targetArrival}. |
| 1045 | literal | code | Scenic Mid-Route Transition | Pause Ravito & Mi-Parcours |
| 1046 | literal | code | Midway Sector | Mi-Parcours |
| 1049 | literal | code | Hydration check & energy bar. Maintain smooth, sustainable cadence. | Hydratation & encas énergétique. Gardez une cadence souple et confortable. |
| 1057 | template | code | Arrival in ${destTitle} | Arrivée à ${destTitle} |
| 1061 | template | code | Roll into ${destTitle}. Navigate to accommodation entrance. | Entrée dans ${destTitle}. Approche calme jusqu'à la réception de l'hébergement. |
| 1069 | literal | code | Hotel Check-In & Secure Bike Storage | Check-In Hôtel & Local Vélo Sécurisé |
| 1070 | literal | code | Hotel Reception | Réception Hôtel |
| 1073 | literal | code | Hotel Check-in at reception, secure bike in dedicated storage/room, and unload panniers. | Enregistrement à la réception, rangement du vélo au local fermé et dépôt des bagages. |
| 1081 | literal | code | Evening Charging, Shower & Recovery | Recharge Soir, Douche & Récupération |
| 1082 | literal | code | Hotel Room | Chambre d'Hôtel |
| 1085 | literal | code | Charge GPS/lights, hot shower, and casual evening kit. | Recharge GPS/feux, douche chaude et tenue du soir. |
| 1093 | template | code | Explore ${destTitle} & Evening Dining | Découverte de ${destTitle} & Dîner |
| 1094 | template | code | ${destTitle} Center | Centre de ${destTitle} |
| 1097 | literal | code | Stroll town center, visit local sights, relaxed dinner without timeline stress. | Balade à pied dans le centre, découverte locale et dîner détendu sans contrainte horaire. |
| 1110 | literal | code | Waterside Scenic Picnic Lunch (45 min) | Déjeuner Pique-Nique au Bord de l’Eau (45 min) |
| 1111 | literal | code | Scenic Riverbank Halt | Halte Fluviale / Lac |
| 1115 | template | code | 45-min waterside pause: ${primarySolid.nameEn.toLowerCase()}, fresh fruit and local specialties in the sun. | Pause détente de 45 min : ${primarySolid.nameFr.toLowerCase()}, fruits frais et spécialités locales adaptées au soleil. |
| 1118 | literal | code | 45-min waterside pause: artisanal sourdough, regional cheese, fresh fruit and hydration in the sun. | Pause détente de 45 min : pain frais, fromage local du terroir, fruits frais et hydratation au soleil. |
| 1129 | literal | code | Château & Heritage Site Visit (30 min) | Visite Patrimoine & Pause Château (30 min) |
| 1130 | literal | code | Heritage Monument | Site Historique |
| 1133 | literal | code | Secure bike parking at castle gates, 30-min walking exploration of historic grounds. | Stationnement sécurisé du vélo au pied des remparts et découverte à pied des monuments classés. |
| 1143 | literal | code | Regional Gastronomy & Terroir Dining | Dîner Gastronomique du Terroir & Vignoble |
| 1144 | literal | code | Table booked for 19:45: local wine pairings, regional farm-to-table cuisine, and relaxed recovery. | Table réservée pour 19:45 : accords mets-vins de terroir, spécialités régionales et récupération gourmande. |
| 1155 | literal | code | Golden Hour Scenic Photography Stop | Spot Photo : Halte Lumière Dorée |
| 1156 | literal | code | Scenic Overlook | Belvédère Panoramique |
| 1159 | literal | code | 15-min pause to capture golden hour panoramas with handlebar camera gear. | Pause de 15 min pour immortaliser les paysages dans la lumière rasante de fin d’après-midi. |
| 1176 | literal | code | Wake up and drink water | Réveil & hydratation |
| 1177 | literal | code | Home Base | Domicile |
| 1180 | literal | code | Drink 300 ml fresh water with pinch of salt. Wake up and get ready. | Boire 300 ml d’eau fraîche avec une pincée de sel. Mise en route. |
| 1189 | literal | code | Fasted hydration | Hydratation pré-départ (à jeun) |
| 1190 | literal | code | Breakfast | Petit-déjeuner |
| 1191 | literal | code | Kitchen Counter | Cuisine |
| 1195 | literal | code | Light hydration (water + coffee or tea). Your breakfast awaits at arrival. | Hydratation légère (eau + café ou thé). Votre encas vous attend à l’arrivée. |
| 1198 | template | code | ${compliantPantry.preRide.nameEn} (${compliantPantry.preRide.portionLabelEn}) + coffee or tea. Easy morning digestion. | ${compliantPantry.preRide.nameFr} (${compliantPantry.preRide.portionLabelFr}) + café ou thé. Digestion matinale légère. |
| 1206 | literal | code | Quick bike check | Contrôle rapide du vélo |
| 1207 | literal | code | By the door | Départ |
| 1210 | literal | code | Verify tire pressure, battery status, bottles mounted, badge secured. | Vérifier pression des pneus, batteries feux/radar, bidons montés et badge d’accès. |
| 1218 | template | code | Time to go: ${hardDepartureTime} | Heure de départ : ${hardDepartureTime} |
| 1219 | literal | code | Start | Départ |
| 1222 | template | code | Roll out at target pace (${route.targetSpeedKmH} km/h). Headwind buffer: +${weatherHeadwindImpactMinutes} min. | Départ à l'allure cible (${route.targetSpeedKmH} km/h). Marge vent de face : +${weatherHeadwindImpactMinutes} min. |
| 1231 | literal | code | Severe Headwind Warning | Alerte vent de face sévère |
| 1234 | literal | code | Mid-Ride Pacing Sector | Secteur Allure & Traversée Exposée |
| 1237 | literal | code | Open Road Sector | Route Ouverte |
| 1242 | template | code | Severe headwind (+${weatherHeadwindImpactMinutes} min penalty on a ${Math.round(route.distanceKm)} km route). Consider r | Vent de face sévère (+${weatherHeadwindImpactMinutes} min de pénalité sur ${Math.round(route.distanceKm)} km). Envisagez |
| 1246 | template | code | Headwind detected (${windKmh} km/h). Tuck low on the hoods to save ~${Math.round(windKmh * 3.5)} W. | Vent de face détecté (${windKmh} km/h). Position basse sur les cocottes pour économiser ~${Math.round(windKmh * 3.5)} W. |
| 1249 | template | code | Headwind detected (${windKmh} km/h). Hold a low riding posture to save energy into the wind. | Vent de face détecté (${windKmh} km/h). Position basse sur les cocottes pour protéger votre allure face au vent. |
| 1252 | literal | code | Calm road conditions. Cruise at a steady cadence (88–92 RPM). | Vent calme sur le parcours. Cadence régulière (88–92 tr/min). |
| 1260 | template | code | Arrival & Bike Lockup (${localizedGate}) | Arrivée & stationnement vélo (${localizedGate}) |
| 1266 | template | code | Arrive at ${localizedGate} and lock your bike. | Arrivée à ${localizedGate} et stationnement du vélo. |
| 1274 | literal | code | Arrival snack | Collation à l’arrivée |
| 1275 | literal | code | At work | À l’arrivée |
| 1280 | literal | code | Quick snack before showering. | Collation rapide avant la douche. |
| 1283 | literal | code | Quick snack and bike lockup. | Collation rapide et rangement du vélo. |
| 1294 | literal | code | Shower & Clean Kit Change | Douche & Tenue de Travail |
| 1295 | literal | code | Showers | Douches |
| 1298 | template | code | Shower and swap into work attire (${showerChangeMinutes} min, ready by ${resolvedShiftStartTime}). | Douche et passage en tenue de bureau propre (${showerChangeMinutes} min, prêt pour ${resolvedShiftStartTime}). |
| 1308 | literal | code | At work / Shift start | Au bureau / Prise de poste |
| 1309 | literal | code | Work Desk | Poste de Travail |
| 1312 | literal | code | Arrive composed, fully fueled, and ready for work. | Installation au poste à l’heure, ravitaillé et prêt pour la journée. |
| 1326 | literal | code | On-route self-supported | En autonomie sur le parcours |
| 1328 | literal | code | Cafe / Roastery | Café / Roaster |
| 1341 | literal | code | Cafe Waypoint & Espresso Pause | Pause Café & Ravitaillement Roaster |
| 1342 | literal | code | Roastery Waypoint | Café d’Étape |
| 1346 | template | code | Quick stop capped at ${coffeeCapMin} min max (pre-dawn winter rule) to prevent core temp drop. ${cafeSnack}. | Pause express limitée à ${coffeeCapMin} min max (départ hivernal avant l’aube) pour éviter le refroidissement. ${cafeSna |
| 1349 | template | code | Scheduled ${coffeeCapMin}-min morning coffee stop. ${cafeSnack} before rolling again. | Pause café matinale planifiée (${coffeeCapMin} min). ${cafeSnack} avant la relance. |
| 1360 | literal | code | Night Ride Prep & 800+ lm Check | Sécurité Nocturne & Contrôle Phare 800+ lm |
| 1361 | literal | code | 800+ lm headlight high-beam verified, hi-vis reflective sash adjusted, rear radar active. | Phare 800+ lumens vérifié en mode plein faisceau, baudrier rétro-réfléchissant ajusté et radar actif. |
| 1371 | literal | code | Tempo Cadence & Cardio Surge Sector | Secteur Allure & Relais Cardio Tempo |
| 1373 | literal | code | Sustained Zone 3 tempo (~260W). High-output aerobic pacing to turn commute into a structured workout. | Relance en Zone 3 soutenue (~260W). Rythme cardio soutenu pour maximiser le bénéfice entraînement. |
| 1376 | literal | code | Sustained tempo effort. Steady aerobic pacing to turn your ride into an energizing workout. | Relance soutenue en rythme tempo. Effort cardio régulier pour dynamiser le trajet. |
| 1385 | template | code | Arrival with Peak Rush Buffer (${localizedGate}) | Arrivée Portillon avec Marge Heure de Pointe (${localizedGate}) |
| 1386 | literal | code | Arrival cushion with +12 min buffer factoring bridge bottlenecks and urban traffic. | Franchissement sécurisé avec marge de +12 min pour parer aux goulets d’étranglement urbains. |
| 1395 | literal | code |  15" Work laptop secured in IPX6 waterproof pannier. |  Ordinateur portable 15" rangé dans la sacoche étanche IPX6. |
| 1421 | template | code | Savory palate reset (T + ${m} min) | Pause salée (T + ${m} min) |
| 1422 | literal | code | On-bike | En selle |
| 1425 | literal | code | Savory palate reset: Swap sweet fuel for salted snack + plain water sip | Pause salée : Alternez le sucré avec une collation salée + gorgée d’eau pure |
| 1437 | template | code | Carb Intake (T + ${m} min) | Apport glucides (T + ${m} min) |
| 1438 | literal | code | On-bike | En selle |
| 1441 | literal | code | Carb intake reminder: take a carbohydrate serving + sip of water | Rappel ravitaillement : prenez une portion de glucides + gorgée d’eau |
| 1456 | literal | code | Planned recovery stop | Pause longue & récupération |
| 1463 | template | code | Mid-route · km ${midKm} | Mi-parcours · km ${midKm} |
| 1463 | literal | code | Mid-route | Mi-parcours |
| 1467 | template | code | Quick stop capped at ${longStopMin} min max (pre-dawn winter rule) to prevent core temperature drop. | Pause express limitée à ${longStopMin} min max (départ hivernal avant l’aube) pour maintenir la température corporelle. |
| 1470 | template | code | Scheduled ${longStopMin}-min break to stretch, eat real food, and refill bottles. | Pause planifiée de ${longStopMin} min pour récupérer, manger du solide et recharger les bidons. |

#### `src/utils/toolCatalog.ts` (8 translatable / 8 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 287 | literal | code | Cadence — Smart Ride Weather, Stops & Fueling (Free) | Cadence — Météo de sortie, ravitaillement & nutrition vélo (Gratuit) |
| 290 | literal | code | Plan smarter bike rides with live route weather, resupply radar for water taps & bakeries, simple fueling plans, and fre | Planifiez vos sorties vélo avec météo par secteur, radar points d’eau & boulangeries, nutrition aliments vrais et export |
| 294 | expression | code | TOOL_HUB_META.seoTitleEn | TOOL_HUB_META.seoTitleFr |
| 295 | expression | code | TOOL_HUB_META.seoDescriptionEn | TOOL_HUB_META.seoDescriptionFr |
| 299 | expression | code | entry.seoTitleEn | entry.seoTitleFr |
| 302 | expression | code | TOOL_HUB_META.seoTitleEn | TOOL_HUB_META.seoTitleFr |
| 306 | expression | code | entry.seoDescriptionEn | entry.seoDescriptionFr |
| 309 | expression | code | TOOL_HUB_META.seoDescriptionEn | TOOL_HUB_META.seoDescriptionFr |

#### `src/utils/waterGapCopy.ts` (6 translatable / 6 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 7 | literal | code | en-US | fr-FR |
| 22 | template | code | Carry ${extra} extra bottle${extra > 1 ? 's' : ''} or plan a refill stop | Emportez ${extra} bidon${extra > 1 ? 's' : ''} supplémentaire${extra > 1 ? 's' : ''} ou prévoyez un point d’eau |
| 26 | template | code | Fill every bottle before km ${start} | Remplissez tous vos bidons avant le km ${start} |
| 36 | literal | code | en-US | fr-FR |
| 39 | literal | code | more than your bottles hold | plus que vos bidons |
| 42 | template | code | ${pct}% of your bottles | ${pct} % de vos bidons |

#### `src/utils/weeklyWeatherSummary.ts` (18 translatable / 18 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 51 | literal | code | today | aujourd'hui |
| 52 | literal | code | tomorrow | demain |
| 55 | literal | code | en-US | fr-FR |
| 80 | literal | code |  &  |  et  |
| 100 | template | code | around ${avgHigh}°C | autour de ${avgHigh}°C |
| 103 | template | code | highs ${minHigh}–${maxHigh}°C | max ${minHigh}–${maxHigh}°C |
| 138 | template | code | Snow and freezing temps (${tempPhrase}) in the mix this week. Take it easy on the corners—or keep it on the trainer. | Neige et gel (${tempPhrase}) au programme cette semaine. Prudence dans les virages, ou session home-trainer. |
| 152 | template | code | Stormy, rain-soaked week ahead (${tempPhrase}). You can do it, just cover yourself from head to toe and dodge the heavy  | Semaine orageuse et bien arrosée (${tempPhrase}). Tu peux le faire, couvre-toi juste de la tête aux pieds et évite les g |
| 156 | template | code | Rain pretty much all week (${tempPhrase}). You can do it, just cover yourself from head to toe. | De la pluie presque toute la semaine (${tempPhrase}). Tu peux le faire, couvre-toi juste de la tête aux pieds. |
| 172 | template | code | Lots of rain this week (${rainDays.length} wet days, ${tempPhrase})—${bestDryLabel} looks driest. You can do it, just co | Semaine bien humide (${rainDays.length} jours de pluie, ${tempPhrase}) — ${bestDryLabel} s'annonce le plus sec. Tu peux  |
| 177 | template | code | Plenty of rain in the forecast (${rainDays.length} wet days, ${tempPhrase}). You can do it, just cover yourself from hea | Pas mal de pluie au programme (${rainDays.length} jours humides, ${tempPhrase}). Tu peux le faire, couvre-toi juste de l |
| 185 | template | code | Mixed bag this week (${tempPhrase})—mostly dry, with rain ${rainDays.length === 2 ? 'around ' : 'on '}${rainList}. Keep  | Semaine mitigée (${tempPhrase}) — plutôt sec dans l'ensemble, avec de la pluie ${rainList}. Garde un coupe-pluie sous la |
| 193 | template | code | Mostly dry this week (${tempPhrase}), though it's looking breezy (up to ${peakWind} km/h). Free tailwinds if you plan it | Plutôt sec cette semaine (${tempPhrase}), mais venteux (jusqu'à ${peakWind} km/h). De quoi chasser le vent de dos. |
| 201 | template | code | Mostly dry all week (${tempPhrase}), with just a passing shower possible ${wetWhen}. Easy riding ahead. | Semaine globalement sèche (${tempPhrase}), juste une averse possible ${wetWhen}. Roule tranquille. |
| 208 | template | code | Dry and crisp all week (${tempPhrase}${minLow <= 3 ? ', chilly mornings' : ''}). Throw on warm layers and enjoy the quie | Sec et frais toute la semaine (${tempPhrase}${minLow <= 3 ? ', matins frisquets' : ''}). Une bonne couche thermique et p |
| 214 | template | code | Warm, dry stretch all week (${tempPhrase}). Roll out early if you can and pack an extra bottle. | Semaine chaude et sèche (${tempPhrase}). Pars tôt si possible et prends un bidon de plus. |
| 220 | template | code | Clear, dry skies all week (${tempPhrase})—basically an open invitation to take the long way. | Temps sec et lumineux toute la semaine (${tempPhrase}) — l'excuse parfaite pour rallonger le parcours. |
| 225 | template | code | Dry and calm all week (${tempPhrase}). Solid weather to get the miles in. | Semaine sèche et calme (${tempPhrase}). Des conditions idéales pour aligner les kilomètres. |

#### `src/utils/windInsights.ts` (9 translatable / 9 total)

| Line | Kind | Context | EN | FR |
|---:|---|---|---|---|
| 74 | template | code | ≈ ${floors} flights of stairs | ≈ ${floors} étages d’escaliers |
| 80 | literal | code | ≈ the Arc de Triomphe | ≈ l’Arc de Triomphe |
| 83 | template | code | ≈ a ${floors}-story building | ≈ un immeuble de ${floors} étages |
| 88 | literal | code | ≈ the Statue of Liberty | ≈ la Statue de la Liberté |
| 91 | literal | code | ≈ climbing Montmartre | ≈ la butte Montmartre |
| 95 | template | code | ≈ ${pct}% of the Eiffel Tower | ≈ ${pct} % de la Tour Eiffel |
| 101 | template | code | ≈ ${ratio}× the Eiffel Tower | ≈ ${ratio}× la Tour Eiffel |
| 107 | template | code | ≈ ${ratio}× Alpe d’Huez | ≈ ${ratio}× l’Alpe d’Huez |
| 112 | template | code | ≈ ${ratio}× Mont Ventoux | ≈ ${ratio}× le Mont Ventoux |

