const fs = require('fs');
const G = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-cybersky-peru/selfies';
const piloto = {
  'arequipa': {
    who: 'a Peruvian couple in their early thirties, she with straight black hair and a denim jacket, he with short hair, a light beard and a dark overshirt',
    reaction: 'she has both hands on her cheeks; he leans in with his jaw dropped',
    scene: 'the Plaza de Armas of Arequipa, Peru, at dusk: the white volcanic-stone cathedral glowing warm under its lights, the arcades and wrought-iron street lamps already switched on, the El Misti volcano as a dark silhouette against the sunset.',
    light: 'Blue hour just after sunset: the upper sky is deep blue turning violet, the horizon behind the volcano glows peach and soft pink, a few thin clouds lit pink near the horizon only. Warm street lamps and the lit cathedral facade glow behind them.'
  },
  'punta-cana': {
    who: 'a Peruvian couple in their mid thirties in beachwear, she with wavy dark hair, he with short hair and a light stubble',
    reaction: 'he points back at the beach with his mouth wide open; she covers her mouth with one hand, eyes wide',
    scene: 'a palm-fringed Caribbean beach in Punta Cana, Dominican Republic, with leaning coconut palms, white sand and calm sea.',
    light: 'Golden hour, low warm sun to the left behind the palms: warm rim light on their hair and shoulders, faces lit by the warm reflected light. The upper sky is clean deep blue fading to warm gold and soft pink near the horizon, a few small pink-lit clouds near the horizon only. The sea is deep blue-green, not neon turquoise.'
  },
  'tarapoto': {
    who: 'three Peruvian friends in their mid twenties in t-shirts, squeezed together in the frame',
    reaction: 'one raises both hands to her head in disbelief, the other two stare at the camera with eyes wide and mouths open',
    scene: 'a jungle waterfall falling into a natural pool near Tarapoto, Peru, surrounded by lush tropical vegetation.',
    light: 'Late afternoon golden sunlight streaming through the jungle canopy from behind, warm rim light on their hair, glowing mist from the waterfall, sun flares and glints on the water turning into soft round bokeh. The visible sky in the upper part is a clean warm blue with soft golden haze.'
  }
};
const P = (d) => [
  'A real smartphone selfie of ' + d.who + ', reacting with genuine, big surprise as if they just discovered an unbelievably cheap flight price: eyes wide open with the white visible above the iris, eyebrows raised high, mouths open in an amazed "wow". ' + d.reaction + '. Location: ' + d.scene + ' The destination is clearly recognizable behind them.',
  '',
  'They are real, ordinary, attractive travelers, not models: real human skin with visible pores and natural texture, small asymmetries, flyaway hairs, natural teeth, natural makeup at most, real fabric wrinkles. No beauty filter, no skin smoothing, no plastic or waxy skin, no CGI look.',
  '',
  'Camera: shot with the ultra-wide fisheye selfie lens of a phone held close at arm\'s length: strong curved fisheye perspective, the edges of the scene bend outward, the faces are big and close to the lens, the arm holding the phone enters from the lower edge. The image fills the whole rectangular frame edge to edge: no circular frame, no black ring, no vignette, no black corners. Shallow depth of field like a phone portrait mode: the people are sharp, the landmark behind them is slightly soft but still recognizable, and every light in the background turns into soft round bokeh.',
  '',
  'Light and color: ' + d.light + ' Rich, vibrant but believable color with warm skin tones; shadows lean cool blue-violet, highlights warm amber. Natural photographic contrast with detail in highlights and shadows. No HDR halos, no over-sharpening, no crunchy textures, no illustration look.',
  '',
  'Composition: square frame. The faces are large, filling 35 to 45% of the frame height, placed in the right and lower-right part of the frame. The landmark sits in the middle band, to their left. The top third of the frame is open sky with a smooth color gradient and nothing important in it. A few distant passers-by at most, small and out of focus. No text, no readable signs, no logos.'
].join('\n');
fs.mkdirSync(G + '/prompts-v3', { recursive: true });
fs.mkdirSync(G + '/fotos-v3', { recursive: true });
for (const [k, d] of Object.entries(piloto)) fs.writeFileSync(G + '/prompts-v3/' + k + '.txt', P(d));
console.log(Object.keys(piloto).join(' '));
