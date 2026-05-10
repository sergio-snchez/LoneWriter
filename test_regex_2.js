const text = "Bronmir, as his comrades from the tribe call him, continued chewing ashes to clean his teeth... The High Mountains, where thermal waters emanate from small geysers, warm the atmosphere with water vapor. A Prulk eats grass by the riverbank... it even takes a stone to its mouth without realizing... those hairy, gigantic beasts eat whatever is put in front of them.";
const PROPER_NOUN_REGEX = /(?:^|(?<=[.!?¿¡\n\r—–""«‹()\[\] \t,;:]))([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ][a-záéíóúàèìòùäëïöüâêîôûñ\u2019']{1,}(?:\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑ][a-záéíóúàèìòùäëïöüâêîôûñ\u2019']{1,}){0,3})/gmu;

let match;
const candidates = new Set();
while ((match = PROPER_NOUN_REGEX.exec(text)) !== null) {
  const raw = (match[2] || match[1] || '').trim();
  candidates.add(raw);
}
console.log([...candidates]);
