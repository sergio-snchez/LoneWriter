// test-mpc.js
const html = "<p>Noemi, por favor —dijo, mientras su mirada perdida en el horizonte del bar se fijaba ahora en la chica encargada de la limpieza—, tráeme mi Grok con soda. Que no pique demasiado... y añádele un toque de canela. Gracias.</p>";
const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const PROPER_NOUN_REGEX = /(?<=[ \t,;:—–"«‹()\[\]])([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ][a-záéíóúàèìòùäëïöüâêîôûñ\u2019']{2,}(?:\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ][a-záéíóúàèìòùäëïöüâêîôûñ\u2019']{2,}){0,3})/gu;
let m;
console.log("TEXT:", txt);
while((m = PROPER_NOUN_REGEX.exec(txt))!==null) {
  console.log("Found:", m[1], m[1].toLowerCase());
}
