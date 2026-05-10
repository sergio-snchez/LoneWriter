const PROPER_NOUN_REGEX = /(?:^|(?<=[.!?¿¡\n\r—–""«‹()\[\] \t,;:]))([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ][a-záéíóúàèìòùäëïöüâêîôûñ\u2019']{1,}(?:\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ][a-záéíóúàèìòùäëïöüâêîôûñ\u2019']{1,}){0,3})/gmu;
const plainText = 'El nombre de esta persona es Carlos Perez y vive en Madrid, trabajando para Industrias ACME pero sin embargo...';
let match;
const candidates = [];
while ((match = PROPER_NOUN_REGEX.exec(plainText)) !== null) {
  candidates.push(match[1]);
}
console.log(candidates);
