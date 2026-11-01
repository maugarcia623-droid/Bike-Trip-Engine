import { parseTripDescription } from '../src/utils/nlpParser';

const prompts = [
  "Je pars de Nantes à 7h15 pour arriver à 8h30 Porte 17, 22km allure 28km/h",
  "Vélotaf demain départ 7h et quart vers Saint-Nazaire, shift à 9h",
  "Sortie gran fondo samedi matin 80km à 32 km/h arrivée midi",
  "Escapade week-end à Clisson, hôtel réservé check-in 15h, 38km allure 22 km/h",
  "Bikepacking 2 jours vers Pornic, 70km, bivouac avant 18h avec tente et 12kg de sacoches",
  "Trajet rapide 15km a 30km/h pas de sac",
  "Commute 25 km, target speed 26 km/h, gate 4, 15 km/h headwind, 8°C",
  "Rando vélo 45 km de Nantes à Pornichet départ 8h avec 5kg de sacoches",
  "Vélotaf avec vent de face 25 km/h rafales 40 km/h, prévoir marge 15 min anti-crevaison",
  "Sortie tempo 60 bornes à 34 de moyenne",
  "Je pars à 8h moins le quart pour la Porte Sud",
  "Trajet vélotaf de 18 km, embauche à 8h30, pause café ravito de 10 min",
  "Escapade à Guérande départ 9h30 arrivée 14h, 55km",
  "Bikepacking autonomie 90km allure 18km/h bivouac 19h",
  "Commute 12 km holding 24 kph zero luggage",
  "Je pèse 82kg et mon vélo 11.5kg avec 6kg d équipement",
  "Vélotaf sous la pluie 80% de risque, 6 degrés, vent 20 kmh",
  "Sortie cyclosportive 120km dénivelé 1200m allure 30km/h",
  "Trajet Nantes vers La Baule 75km à 27km/h",
  "Je veux faire 35 km à 25 km/h pour arriver à 8h30 à la Porte 17 sans bouffe au bureau"
];


const results = prompts.map((p, idx) => {
  const isFr = p.includes("Je") || p.includes("Sortie") || p.includes("Trajet") || p.includes("Escapade") || p.includes("Rando") || p.includes("Vélotaf");
  const res = parseTripDescription(p, undefined, isFr ? 'fr' : 'en');
  return {
    idx: idx + 1,
    prompt: p,
    tag: res.parsedValues.tag,
    origin: res.parsedValues.route?.origin,
    destination: res.parsedValues.route?.destination,
    gate: res.parsedValues.office?.gateName,
    speed: res.parsedValues.route?.targetSpeedKmH,
    distance: res.parsedValues.route?.distanceKm,
    departureTime: res.parsedValues.departureTime,
    arrivalTime: res.parsedValues.office?.targetGateArrivalTime,
    shiftTime: res.parsedValues.office?.shiftStartTime,
    summary: res.extractedSummary,
    detected: res.detected,
  };
});

console.log(JSON.stringify(results, null, 2));
