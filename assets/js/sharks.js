// Sharks — a faint ASCII ocean behind the homepage.
// Small schools of fish drift through the page as single characters, and a
// changing cast of large animals swims among them: sharks, orcas and narwhals
// that hunt the stragglers, whales and a whale shark that cruise past and
// blow, a manta ray, and a giant squid trailing its arms. Each is drawn cell by cell from
// its own outline: lit from the top-left, with sparse glyphs on lit skin and
// dense ones in shadow, sampled several times per cell so the edges stay
// soft, with fins that bank, paddle or flap and skin that carries its own
// markings. Swimming stirs up a wake that spreads and fades, fish shy away
// from the cursor, and a click splashes. Everything is drawn lightly so the
// text on top stays the point of the page.
(function () {
  var canvas = document.getElementById('sharks');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Monospace for the ASCII, then system faces for Korean, Japanese, Chinese and Urdu.
  var FONT = '600 11px ui-monospace, "SFMono-Regular", Menlo, Consolas, "Apple SD Gothic Neo", ' +
             '"Hiragino Sans", "PingFang SC", "Geeza Pro", "Noto Sans CJK KR", "Noto Naskh Arabic", monospace';
  var LINE = 12;                // row height in px
  var STEP = 1 / 30;            // simulation step; ASCII reads better unhurried
  var NODES = 16;               // spine joints per animal

  // Each animal's skin is written in its own script. A ramp runs from the
  // lightest strokes to the heaviest, so a script can still carry the
  // shading; `name` is spelled down the animal's back, and `fish` is the
  // glyph a school of that script swims as. Wide scripts (CJK) take two
  // cells per character, measured on resize.
  var SCRIPTS = {
    latin:  { ramp: '.,:;ilrcvoxzsaenukhdbqpgmwWM', fish: '><' },
    kana:   { ramp: '・ノくしへつりうかさきまなゆ海魚鮫鯨鬱', fish: 'う' },
    hangul: { ramp: 'ㅡㅣㄱㄴㅅㅇ이가나다마바사한강달닭밝붉뷁', fish: '어' },
    hanzi:  { ramp: '丶一二人十大山水木石米林海魚鳥龍鬱', fish: '鱼' },
    urdu:   { ramp: 'ءارودلںبینکگمعقفسصطشضظ', fish: 'م', rtl: true }
  };
  var SCRIPT_NAMES = Object.keys(SCRIPTS);
  SCRIPT_NAMES.forEach(function (k) {
    var sc = SCRIPTS[k];
    sc.codes = Array.prototype.map.call(sc.ramp, function (ch) { return ch.charCodeAt(0); });
    sc.fishCodes = Array.prototype.map.call(sc.fish, function (ch) { return ch.charCodeAt(0); });
  });

  // Pick from a script's ramp by ink (0–1), nudged by a small jitter.
  function scriptGlyph(sc, ink, jitter) {
    return sc.codes[clamp(Math.floor(ink * sc.codes.length) + jitter, 0, sc.codes.length - 1)];
  }

  // Colour classes, and per theme an rgb for each plus an alpha per tone (1–6).
  var INK = 0, TEAL = 1, AMBER = 2, ROSE = 3, VIOLET = 4, WAKE = 5, HEAT = 6;
  var ACCENT = 1, TONE_COUNT = 7;
  var PALETTE = {
    light: {
      rgb: ['38,46,56', '40,140,150', '196,128,40', '196,72,84', '128,92,188', '60,128,188', '216,92,52'],
      alpha: [0, 0.06, 0.1, 0.15, 0.21, 0.29, 0.38]
    },
    dark: {
      rgb: ['210,220,235', '96,200,210', '230,170,84', '235,112,124', '180,142,240', '112,208,240', '255,132,84'],
      alpha: [0, 0.05, 0.085, 0.13, 0.18, 0.25, 0.33]
    }
  };

  // What a sample of an animal can land on.
  var BODY = 1, FIN = 2, RIDGE = 3, GILL = 4, SEAM = 5, KNOB = 6, SPOT = 7, PALE = 8;

  var W = 0, H = 0, cw = 7, cols = 0, rows = 0;
  var chars, tones, classes;                // the composed frame
  var sOn, sChars, sTones, sClasses, shadow; // the animal layer
  var energy, energyTmp, heat;              // wake and feeding flashes
  var buckets = [];
  var fish = [], swimmers = [], events = [];
  var pointer = { x: 0, y: 0, active: false };
  var time = 0, lastSpawn = 0, nextArrival = 0, nextId = 1;

  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function ease(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function dome(x) { return Math.sqrt(Math.max(0, 1 - x * x)); }
  function wrapAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  // Integer hash → [0, 1); stable, so a texture can stay pinned to the skin.
  function hash(a, b, c) {
    var h = Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }

  // Round markings on a jittered grid laid over the skin (u along, v across, px).
  function spotted(u, v, sizeU, sizeV, seed, radius) {
    var gu = u / sizeU, gv = v / sizeV, cu = Math.floor(gu), cv = Math.floor(gv);
    var jx = 0.25 + 0.5 * hash(cu, cv, seed), jy = 0.25 + 0.5 * hash(cu, cv, seed + 7);
    return (gu - cu - jx) * (gu - cu - jx) + (gv - cv - jy) * (gv - cv - jy) < radius * radius;
  }

  // ---------- Body plans, seen from above ----------
  // Everything is a fraction of body length; s runs 0 (snout) → 1 (tail).
  // A fin is a triangle from two roots on the spine out to a tip; it can
  // bank into turns, paddle (sweep) or flap (reach), and have a curved-in
  // trailing edge. A skin() hook returns how pale the skin is at a point
  // and may mark it as a seam, a knob or a spot instead, or as a white
  // marking (PALE, at brightness `paint`) that shows whatever the lighting.

  var skinKind = 0, seamAcross = false, paint = 0;

  function sharkBody(s) {
    if (s < 0.14) return 0.085 * Math.pow(Math.sin(s / 0.14 * Math.PI / 2), 0.8);
    if (s < 0.3) return 0.085 + 0.015 * ease(0.14, 0.3, s);
    if (s < 0.85) return 0.016 + 0.084 * Math.pow(1 - (s - 0.3) / 0.55, 1.3);
    var k = (s - 0.85) / 0.15;
    return 0.016 * (1 - k) + 0.01 * Math.sin(k * Math.PI);
  }

  // A tapered torpedo: snout radius, widest at `peak`, narrowing to the tail stock.
  function torpedo(nose, width, peak, swell, stock, curve) {
    return function (s) {
      if (s < 0.1) return width * Math.pow(Math.sin(s / 0.1 * Math.PI / 2), nose);
      if (s < peak) return width + swell * ease(0.1, peak, s);
      if (s < 0.87) return stock + (width + swell - stock) * Math.pow(1 - (s - peak) / (0.87 - peak), curve);
      return stock * (1 - (s - 0.87) / 0.13) + 0.002;
    };
  }

  var SHAPES = {
    shark: {
      body: sharkBody, albedo: 1,
      fins: [
        { root: [0.17, 0.42], tip: [0.53, 0.24], sickle: true, bank: true },
        { root: [0.58, 0.65], tip: [0.7, 0.08] },
        { root: [0.84, 0.95], tip: [1.04, 0.09], asym: 0.75 }
      ],
      dorsal: [0.34, 0.46], dorsal2: [0.72, 0.76], gills: [0.18, 0.27],
      eyes: [0.11, 0.06]
    },
    // A slim neck under a wide, swept-back head with an eye at each tip.
    hammerhead: {
      body: function (s) {
        if (s < 0.07) return 0.04;
        if (s < 0.3) return 0.04 + 0.06 * ease(0.07, 0.3, s);
        return sharkBody(s) * 0.92;
      },
      albedo: 0.95,
      head: { span: 0.19, sweep: 0.03, depth: 0.085 },
      fins: [
        { root: [0.18, 0.4], tip: [0.5, 0.22], sickle: true, bank: true },
        { root: [0.56, 0.63], tip: [0.68, 0.07] },
        { root: [0.84, 0.95], tip: [1.04, 0.12], asym: 0.7 }
      ],
      dorsal: [0.27, 0.43], dorsal2: [0.7, 0.74], gills: [0.15, 0.24],
      eyes: [0.075, 0.175]
    },
    // Black back, a tall dorsal fin, a grey saddle behind it and the white
    // eye patches that show from above; broad paddle flippers and flukes.
    orca: {
      body: torpedo(0.6, 0.08, 0.35, 0.02, 0.014, 1.2), albedo: 0.3,
      fins: [
        { root: [0.19, 0.31], tip: [0.42, 0.2], bank: true },
        { root: [0.85, 0.95], tip: [1.03, 0.12], sickle: true }
      ],
      dorsal: [0.38, 0.5],
      eyes: [0.11, 0.06],
      skin: function (s, across) {
        if (s > 0.13 && s < 0.27 && across > 0.45) { skinKind = PALE; paint = 0.95; }
        else if (s > 0.52 && s < 0.64 && across < 0.75) { skinKind = PALE; paint = 0.6; }
        return 1;
      }
    },
    // Long and slender with a broad flat head, a ridge down the rostrum,
    // mottled skin, a tiny dorsal far back and wide notched flukes.
    blue: {
      body: torpedo(0.5, 0.07, 0.36, 0.008, 0.011, 1.05), albedo: 0.8,
      fins: [
        { root: [0.24, 0.29], tip: [0.36, 0.07], bank: true },
        { root: [0.87, 0.96], tip: [1.03, 0.12], sickle: true }
      ],
      dorsal: [0.75, 0.775],
      blow: [0.13, 0], spout: true,
      skin: function (s, across, v, L) {
        if (s > 0.02 && s < 0.12 && across < 0.14) { skinKind = SEAM; seamAcross = false; return 1; }
        return spotted(s * L, v, L * 0.035, L * 0.02, 5, 0.3) ? 1.35 : 1;
      }
    },
    // Stocky, with very long white flippers, knobbly head and big flukes.
    humpback: {
      body: torpedo(0.55, 0.075, 0.32, 0.02, 0.013, 1.15), albedo: 0.5,
      fins: [
        { root: [0.24, 0.31], tip: [0.52, 0.33], bank: true, pale: 0.85 },
        { root: [0.85, 0.95], tip: [1.04, 0.15], sickle: true }
      ],
      dorsal: [0.66, 0.7],
      blow: [0.15, 0], spout: true,
      skin: function (s, across, v, L) {
        if (s < 0.2 && across < 0.7 && spotted(s * L, v, L * 0.03, L * 0.018, 9, 0.28)) skinKind = KNOB;
        return 1;
      }
    },
    // Wide swept wings that flap slowly, horn-like fins either side of a
    // flat head, white shoulder marks and a thin whip of a tail.
    manta: {
      body: function (s) {
        if (s < 0.03) return 0.085;
        if (s < 0.42) return 0.085 + 0.01 * Math.sin((s - 0.03) / 0.39 * Math.PI);
        if (s < 0.5) return 0.085 * (1 - (s - 0.42) / 0.08) + 0.006;
        return 0.006 * (1 - (s - 0.5) / 0.5) + 0.002;
      },
      albedo: 0.45,
      fins: [
        { root: [0.03, 0.42], tip: [0.3, 0.42], sickle: true, flap: 0.16, sweep: 0.05, rate: 0.5, alb: 1 },
        { root: [0, 0.07], tip: [-0.07, 0.075] }
      ],
      eyes: [0.05, 0.082],
      skin: function (s, across) {
        if (s > 0.08 && s < 0.3 && across > 0.35 && across < 0.9) { skinKind = PALE; paint = 0.9; }
        return 1;
      },
      // The white shoulder marks spill out onto the wing roots.
      wingPale: [0.1, 0.28, 0.16, 0.9]
    },
    // The biggest fish: a broad flat head with the mouth across its front,
    // ridges down the back, and white spots, finer on the head.
    whaleShark: {
      body: function (s) {
        if (s < 0.03) return 0.085 + 0.01 * s / 0.03;
        if (s < 0.3) return 0.095 + 0.02 * ease(0.03, 0.3, s);
        if (s < 0.86) return 0.014 + 0.101 * Math.pow(1 - (s - 0.3) / 0.56, 1.2);
        var k = (s - 0.86) / 0.14;
        return 0.014 * (1 - k) + 0.008 * Math.sin(k * Math.PI);
      },
      albedo: 0.55,
      fins: [
        { root: [0.2, 0.34], tip: [0.46, 0.22], sickle: true, bank: true },
        { root: [0.6, 0.66], tip: [0.7, 0.06] },
        { root: [0.84, 0.95], tip: [1.05, 0.13], sickle: true, asym: 0.7 }
      ],
      dorsal: [0.42, 0.52], dorsal2: [0.72, 0.75], gills: [0.13, 0.22],
      eyes: [0.05, 0.085],
      skin: function (s, across, v, L) {
        if (s > 0.22 && s < 0.82 && (Math.abs(across - 0.38) < 0.1 || Math.abs(across - 0.72) < 0.08)) {
          skinKind = SEAM; seamAcross = false; return 1;
        }
        var size = s < 0.22 ? 0.025 : 0.045;
        if (spotted(s * L, v, L * size, L * size * 0.75, 21, 0.28)) { skinKind = PALE; paint = 0.92; }
        return 1;
      }
    },
    // A huge squared-off head a third of its length, the blowhole set off to
    // the left, wrinkled skin, a low hump with knuckles behind it, and the
    // pale scars squid leave on its head.
    sperm: {
      body: function (s) {
        if (s < 0.03) return 0.06 + 0.012 * s / 0.03;
        if (s < 0.33) return 0.072;
        if (s < 0.4) return 0.072 + 0.01 * Math.sin((s - 0.33) / 0.07 * Math.PI);
        if (s < 0.88) return 0.012 + 0.06 * Math.pow(1 - (s - 0.4) / 0.48, 1.1);
        return 0.012 * (1 - (s - 0.88) / 0.12) + 0.002;
      },
      albedo: 0.55,
      fins: [
        { root: [0.34, 0.38], tip: [0.44, 0.065], bank: true },
        { root: [0.86, 0.95], tip: [1.03, 0.13], sickle: true }
      ],
      dorsal: [0.6, 0.68],
      eyes: [0.34, 0.068],
      blow: [0.025, -0.03], spout: true,
      skin: function (s, across, v, L) {
        if (s > 0.68 && s < 0.84 && across < 0.2 && Math.abs((s - 0.68) / 0.04 % 1 - 0.5) < 0.2) { skinKind = KNOB; return 1; }
        if (s > 0.36 && s < 0.86 && across < 0.85) {
          var band = s / 0.028;
          if (Math.abs(band - Math.round(band)) < 0.18 && hash(Math.round(band), Math.floor(across * 3), 41) < 0.6) {
            skinKind = SEAM; seamAcross = true; return 1;
          }
        }
        if (s < 0.33 && spotted(s * L, v, L * 0.05, L * 0.03, 17, 0.14)) { skinKind = PALE; paint = 0.85; }
        return 1;
      }
    },
    // Pale and dark-mottled, with a low ridge in place of a dorsal fin and
    // a long spiral tusk.
    narwhal: {
      body: torpedo(0.7, 0.07, 0.32, 0.015, 0.012, 1.2), albedo: 0.95,
      fins: [
        { root: [0.2, 0.27], tip: [0.33, 0.09], bank: true },
        { root: [0.86, 0.95], tip: [1.02, 0.12], sickle: true }
      ],
      dorsal: [0.42, 0.62],
      eyes: [0.08, 0.05],
      tusk: 0.5,
      skin: function (s, across, v, L) {
        return s > 0.12 && spotted(s * L, v, L * 0.035, L * 0.025, 31, 0.32) ? 0.5 : 1;
      }
    },
    // Mantle first: a pointed tip with diamond fins, a red mottled mantle,
    // big eyes on the head, then eight arms and two long tentacles with
    // clubbed ends, all curling as it jets along.
    squid: {
      body: function (s) {
        if (s < 0.08) return 0.055 * s / 0.08;
        if (s < 0.3) return 0.055 + 0.015 * ease(0.08, 0.3, s);
        if (s < 0.42) return 0.07 - 0.02 * ease(0.3, 0.42, s);
        if (s < 0.5) return 0.05 + 0.006 * Math.sin((s - 0.42) / 0.08 * Math.PI);
        if (s < 0.58) return 0.05 * (1 - (s - 0.5) / 0.08) + 0.01;
        return 0;
      },
      albedo: 0.7,
      fins: [{ root: [0, 0.17], tip: [0.09, 0.13], flap: 0.18, rate: 1.4 }],
      dorsal: [0.14, 0.36],
      eyes: [0.46, 0.042], eyeGlyph: 79,
      arms: { from: 0.55, to: 0.86, count: 8, spread: 0.035 },
      skin: function (s, across, v, L) {
        return s < 0.42 && spotted(s * L, v, L * 0.025, L * 0.02, 51, 0.3) ? 0.6 : 1;   // chromatophores
      }
    }
  };

  // How each animal moves. len/min/max size it against the viewport;
  // `huge` animals are the giants, only one of which is in the water at a time.
  // The gait: `beat` is how fast the tail, flukes or wings stroke at cruising
  // speed; each stroke is a `surge` of speed and a glide; `yaw` is how far a
  // side-to-side tail swings the head, so the path itself weaves (flukes beat
  // up and down, which from above barely shows); `stroke` scales strokes
  // per beat (a manta's come with its wing flaps).
  var SPECIES = {
    shark:      { beat: 3.4, yaw: 0.14, surge: 0.16, color: ['70,96,130', '150,182,218'], script: 'latin', name: 'SHARK', len: 0.62, min: 240, max: 520, cruise: 32, hunt: 70, turn: 0.6, huntTurn: 1.5, bend: 0.18, wave: 0.048, hunts: true, scare: 1, depth: 1 },
    hammerhead: { beat: 3.4, yaw: 0.14, surge: 0.16, color: ['118,108,62', '206,194,134'], script: 'kana', name: 'サメ', len: 0.62, min: 240, max: 520, cruise: 30, hunt: 66, turn: 0.6, huntTurn: 1.5, bend: 0.18, wave: 0.048, hunts: true, scare: 1, depth: 0.8 },
    orca:       { beat: 2.2, yaw: 0.03, surge: 0.3, color: ['28,34,48', '226,232,242'], script: 'hangul', name: '범고래', len: 0.55, min: 230, max: 460, cruise: 36, hunt: 80, turn: 0.7, huntTurn: 1.6, bend: 0.13, wave: 0.016, hunts: true, scare: 1, depth: 0.9, pod: true },
    narwhal:    { beat: 2.6, yaw: 0.03, surge: 0.3, color: ['62,118,122', '142,206,204'], script: 'latin', name: 'NARWHAL', len: 0.55, min: 240, max: 440, cruise: 30, hunt: 60, turn: 0.55, huntTurn: 1.3, bend: 0.12, wave: 0.016, hunts: true, scare: 1, depth: 0.85, pod: true },
    manta:      { beat: 2.4, yaw: 0, surge: 0.35, stroke: 0.5, color: ['84,72,156', '176,164,242'], script: 'urdu', len: 0.7, min: 300, max: 520, cruise: 26, turn: 0.4, bend: 0.05, wave: 0.006, scare: 0.4, depth: 0.7 },
    squid:      { beat: 3, yaw: 0, surge: 0, color: ['186,62,72', '242,116,116'], script: 'kana', name: 'イカ', len: 0.95, min: 360, max: 680, cruise: 26, turn: 0.45, bend: 0.12, wave: 0.03, scare: 0.6, depth: 0.6, jet: true },
    whaleShark: { beat: 1.8, yaw: 0.08, surge: 0.14, color: ['36,96,152', '108,176,238'], script: 'hangul', name: '고래상어', len: 1, min: 380, max: 800, cruise: 20, turn: 0.3, bend: 0.12, wave: 0.035, scare: 0.4, depth: 0.5, huge: true },
    sperm:      { beat: 1.4, yaw: 0.02, surge: 0.3, color: ['112,88,76', '206,178,160'], script: 'hanzi', name: '抹香鯨', len: 1, min: 380, max: 780, cruise: 22, turn: 0.25, bend: 0.08, wave: 0.012, scare: 0.4, depth: 0.45, huge: true },
    blue:       { beat: 1.2, yaw: 0.02, surge: 0.28, color: ['58,104,158', '126,176,228'], script: 'hanzi', name: '藍鯨', len: 1.15, min: 420, max: 900, cruise: 22, turn: 0.22, bend: 0.07, wave: 0.012, scare: 0.4, depth: 0.4, huge: true },
    humpback:   { beat: 1.4, yaw: 0.02, surge: 0.3, color: ['50,58,92', '174,184,216'], script: 'urdu', name: 'وہیل', len: 0.95, min: 360, max: 720, cruise: 24, turn: 0.28, bend: 0.09, wave: 0.014, scare: 0.4, depth: 0.45, huge: true }
  };

  // Each species, and each fish school, draws in its own colour: an rgb
  // for the light page and a lighter one for the dark page, registered as
  // extra colour classes after the shared ones above.
  function addColour(pair) {
    PALETTE.light.rgb.push(pair[0]);
    PALETTE.dark.rgb.push(pair[1]);
    return PALETTE.light.rgb.length - 1;
  }
  Object.keys(SPECIES).forEach(function (k) { SPECIES[k].cls = addColour(SPECIES[k].color); });
  var FISH_COLOURS = [['150,104,40', '232,190,120'], ['44,128,120', '120,214,200'], ['152,74,110', '232,150,190'],
                      ['74,110,52', '168,214,138'], ['60,92,170', '150,180,250']].map(addColour);
  var IVORY = addColour(['140,126,92', '238,226,196']);
  var CLASSES = PALETTE.light.rgb.length;

  // Who can show up, and how often.
  var CAST = [['shark', 3], ['hammerhead', 2], ['orca', 2], ['narwhal', 1.5], ['manta', 2], ['squid', 1.5],
              ['whaleShark', 1.2], ['sperm', 1], ['blue', 1], ['humpback', 1.2]];

  function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
    var d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    var d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    var d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }

  // ---------- The cast ----------

  function makeSwimmer(kind, size, x, y, heading) {
    var sp = SPECIES[kind];
    var length = clamp(Math.min(W, H) * sp.len, sp.min, sp.max) * size;
    var nodes = new Float32Array(NODES * 2);
    var seg = length / (NODES - 1);
    for (var n = 0; n < NODES; n++) {
      nodes[n * 2] = x - Math.cos(heading) * seg * n;
      nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
    }
    var sh = {
      id: nextId++, kind: kind, sp: sp, shape: SHAPES[kind], size: size, length: length, nodes: nodes,
      heading: heading, speed: sp.cruise, turn: 0, wander: 0, meanderTo: 0, meanderAt: 0,
      goalX: 0, goalY: 0, goalUntil: 0, phase: rand(0, 6),
      hunger: rand(0.2, 0.5), target: null, retargetAt: 0,
      leaveAt: time + rand(45, 80), leaving: false, exitX: 0,
      nextSpout: time + rand(4, 12), depth: sp.depth * (0.9 + 0.1 * size),
      knockX: 0, knockY: 0, knockFade: 2.5, bounceDir: 0, bounceShare: 0, bounceUntil: 0, lastHit: {}
    };
    swimmers.push(sh);
    return sh;
  }

  // The next point to swim for: somewhere on the other side of the page.
  function pickGoal(sh) {
    var right = sh.nodes[0] < W / 2;
    sh.goalX = W * (right ? rand(0.62, 0.92) : rand(0.08, 0.38));
    sh.goalY = H * rand(0.15, 0.85);
    sh.goalUntil = time + rand(18, 30);
  }

  // Swim in from the left or right edge, just out of sight.
  function enter(kind, size, y, fromLeft) {
    var heading = (fromLeft ? 0 : Math.PI) + rand(-0.3, 0.3);
    var sh = makeSwimmer(kind, size, fromLeft ? -20 : W + 20, y, heading);
    return sh;
  }

  function pick(table, skip) {
    var total = 0, i;
    for (i = 0; i < table.length; i++) if (!skip(table[i][0])) total += table[i][1];
    var r = Math.random() * total;
    for (i = 0; i < table.length; i++) {
      if (skip(table[i][0])) continue;
      r -= table[i][1];
      if (r <= 0) return table[i][0];
    }
    return table[0][0];
  }

  // Keep a few animals in the water, at most one giant at a time; as one
  // leaves, another arrives a little later.
  function manage() {
    var count = swimmers.length, huge = false;
    for (var i = 0; i < count; i++) if (swimmers[i].sp.huge) huge = true;
    var max = W < 720 ? 2 : 3;
    if (count >= max || time < nextArrival) return;
    var kind = pick(CAST, function (k) { return huge && SPECIES[k].huge; });
    var fromLeft = Math.random() < 0.5, y = rand(H * 0.2, H * 0.8);
    enter(kind, rand(0.85, 1), y, fromLeft);
    // Orcas and narwhals travel in pairs when there's room.
    if (SPECIES[kind].pod && count + 2 <= max) enter(kind, 0.78, y + (y < H / 2 ? 80 : -80), fromLeft);
    nextArrival = time + rand(8, 16);
  }

  function randomColour() { return FISH_COLOURS[Math.floor(Math.random() * FISH_COLOURS.length)]; }
  function randomScript() { return SCRIPTS[SCRIPT_NAMES[Math.floor(Math.random() * SCRIPT_NAMES.length)]]; }

  // Each school swims in one script and one colour.
  function addSchool(cx, cy, size, dir, school) {
    var script = randomScript(), colour = randomColour();
    for (var k = 0; k < size; k++) {
      fish.push({
        x: cx + rand(-40, 40), y: cy + rand(-20, 20),
        vx: Math.cos(dir) * 40, vy: Math.sin(dir) * 40,
        school: school, script: script, colour: colour, depth: rand(0.5, 1), turn: 0,
        alarm: 0, alive: true, respawnAt: 0
      });
    }
  }

  function seed() {
    var total = clamp(Math.round(W * H / 9000), 36, 140);
    var school = 0;
    fish = [];
    while (fish.length < total) {
      var size = Math.min(Math.round(rand(8, 18)), total - fish.length);
      addSchool(rand(W * 0.1, W * 0.9), rand(H * 0.1, H * 0.9), size,
                Math.random() < 0.5 ? 0 : Math.PI, school++);
    }
    // Open with a shark already in view, and on wider screens one of the giants.
    swimmers = [];
    makeSwimmer('shark', 1, W * 0.28, H * rand(0.3, 0.7), 0);
    if (W >= 720) {
      var giant = pick(CAST, function (k) { return !SPECIES[k].huge; });
      makeSwimmer(giant, 0.9, W * 0.7, H * rand(0.35, 0.65), Math.PI);
    }
    nextArrival = rand(12, 22);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var first = W === 0;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    cw = ctx.measureText('M').width || 7;
    SCRIPT_NAMES.forEach(function (k) {
      var sc = SCRIPTS[k];
      sc.wide = ctx.measureText(sc.ramp.charAt(sc.ramp.length - 1)).width > cw * 1.4;
    });
    cols = Math.ceil(W / cw);
    rows = Math.ceil(H / LINE);
    var n = cols * rows;
    chars = new Uint16Array(n); tones = new Uint8Array(n); classes = new Uint8Array(n);
    sOn = new Uint8Array(n); sChars = new Uint16Array(n); sTones = new Uint8Array(n);
    sClasses = new Uint8Array(n); shadow = new Uint8Array(n);
    energy = new Float32Array(n); energyTmp = new Float32Array(n); heat = new Float32Array(n);
    if (first) seed();
  }

  // ---------- Fish ----------

  function stepFish(dt) {
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      if (!f.alive) continue;
      var ax = 0, ay = 0, avx = 0, avy = 0, cx = 0, cy = 0, n = 0, relayed = 0;

      for (var j = 0; j < fish.length; j++) {
        var o = fish[j];
        if (j === i || !o.alive) continue;
        var dx = o.x - f.x, dy = o.y - f.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > 4900) continue;              // 70px neighbourhood
        var d = Math.sqrt(d2) || 0.01;
        if (d < 16) { ax -= dx / d * (16 - d) * 14; ay -= dy / d * (16 - d) * 14; }
        if (o.school === f.school) { avx += o.vx; avy += o.vy; cx += dx; cy += dy; n++; }
        if (o.alarm > relayed) relayed = o.alarm;
      }
      if (n) {
        ax += (avx / n - f.vx) * 1.6 + cx / n * 1.2 * (1 - f.alarm);
        ay += (avy / n - f.vy) * 1.6 + cy / n * 1.2 * (1 - f.alarm);
      }

      // Big animals: keep clear of the front half of every body, and break
      // to the side of its path rather than straight ahead of it. Hunters
      // put the school to flight; the rest are just given room.
      var fear = 0;
      for (var s = 0; s < swimmers.length; s++) {
        var sh = swimmers[s];
        var reach = sh.length * 0.5 + 50;
        for (var k = 0; k <= 8; k += 4) {
          var ex = f.x - sh.nodes[k * 2], ey = f.y - sh.nodes[k * 2 + 1];
          var de = Math.sqrt(ex * ex + ey * ey);
          if (de >= reach || de < 0.01) continue;
          var w = (1 - de / reach) * (1 - de / reach) * sh.sp.scare;
          var hx = Math.cos(sh.heading), hy = Math.sin(sh.heading);
          var side = hx * ey - hy * ex >= 0 ? 1 : -1;
          ax += (ex / de * 0.7 - hy * side * 0.8) * 900 * w;
          ay += (ey / de * 0.7 + hx * side * 0.8) * 900 * w;
          fear = Math.max(fear, Math.sqrt(w));
        }
      }

      if (pointer.active) {
        var px = f.x - pointer.x, py = f.y - pointer.y;
        var dp = Math.sqrt(px * px + py * py);
        if (dp < 110 && dp > 0.01) {
          var wp = (1 - dp / 110) * (1 - dp / 110);
          ax += px / dp * 900 * wp;
          ay += py / dp * 900 * wp;
          fear = Math.max(fear, Math.sqrt(wp) * 0.8);
        }
      }

      // Panic passes from fish to fish through a school, fading as it goes.
      f.alarm = Math.max(f.alarm * Math.exp(-dt * 0.8), fear);
      if (relayed * 0.8 > f.alarm) f.alarm += (relayed * 0.8 - f.alarm) * Math.min(1, dt * 5);

      // Soft walls, a little restlessness, and a preference for swimming level.
      if (f.x < 30) ax += (30 - f.x) * 6; else if (f.x > W - 30) ax -= (f.x - W + 30) * 6;
      if (f.y < 30) ay += (30 - f.y) * 6; else if (f.y > H - 30) ay -= (f.y - H + 30) * 6;
      ax += (Math.random() - 0.5) * 50;
      ay += (Math.random() - 0.5) * 50 - f.vy * (1 - 0.7 * f.alarm);

      var speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
      var want = 38 * (1 + 1.4 * f.alarm);
      ax += (want - speed) * f.vx / speed * 1.5;
      ay += (want - speed) * f.vy / speed * 1.5;

      var before = Math.atan2(f.vy, f.vx);
      f.vx += ax * dt;
      f.vy += ay * dt;
      var max = 60 * (1 + 1.6 * f.alarm);
      speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      if (speed > max) { f.vx *= max / speed; f.vy *= max / speed; }
      // Smoothed turn rate: a fish turning hard catches the light.
      f.turn += (wrapAngle(Math.atan2(f.vy, f.vx) - before) / dt - f.turn) * Math.min(1, dt * 8);
      f.x = clamp(f.x + f.vx * dt, -40, W + 40);
      f.y = clamp(f.y + f.vy * dt, -40, H + 40);
    }
  }

  // Eaten fish come back together, as a new school swimming in from an edge.
  function respawn() {
    var due = [];
    for (var i = 0; i < fish.length; i++) {
      if (!fish[i].alive && fish[i].respawnAt <= time) due.push(fish[i]);
    }
    if (!due.length || (due.length < 6 && time - lastSpawn < 10)) return;
    lastSpawn = time;
    var left = Math.random() < 0.5;
    var x = left ? -20 : W + 20, y = rand(H * 0.15, H * 0.85);
    var dir = (left ? 0 : Math.PI) + rand(-0.3, 0.3);
    var school = Math.round(rand(1000, 1e6)), script = randomScript(), colour = randomColour();
    for (var k = 0; k < due.length; k++) {
      var f = due[k];
      f.alive = true; f.alarm = 0; f.turn = 0; f.school = school; f.script = script; f.colour = colour; f.depth = rand(0.5, 1);
      f.x = x + rand(-40, 40); f.y = y + rand(-25, 25);
      f.vx = Math.cos(dir) * 50; f.vy = Math.sin(dir) * 50;
    }
  }

  // ---------- Swimmers ----------

  function findPrey(sh) {
    var hx = sh.nodes[0], hy = sh.nodes[1];
    var fx = Math.cos(sh.heading), fy = Math.sin(sh.heading);
    var best = null, bestScore = Infinity;
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      if (!f.alive) continue;
      var dx = f.x - hx, dy = f.y - hy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > sh.length + 120 || d < 0.01) continue;
      var ahead = (dx * fx + dy * fy) / d;
      if (ahead < 0.3) continue;
      var score = d * (2 - ahead);
      if (score < bestScore) { bestScore = score; best = f; }
    }
    return best;
  }

  function stepSwimmers(dt) {
    for (var s = swimmers.length - 1; s >= 0; s--) {
      var sh = swimmers[s], sp = sh.sp, L = sh.length, nodes = sh.nodes;
      var hx = nodes[0], hy = nodes[1];

      if (!sh.leaving && time >= sh.leaveAt) {
        sh.leaving = true;
        sh.exitX = hx < W / 2 ? -L * 1.3 : W + L * 1.3;
      }

      // Cruise in long passes: head for a point well across the page, and
      // once there (or after a while) pick another on the far side. A slow
      // meander bends each pass into lazy S-curves rather than circles.
      var gx = sh.goalX - hx, gy = sh.goalY - hy, gd = Math.sqrt(gx * gx + gy * gy) || 1;
      if (time >= sh.goalUntil || gd < L * 0.35) {
        pickGoal(sh);
        gx = sh.goalX - hx; gy = sh.goalY - hy; gd = Math.sqrt(gx * gx + gy * gy) || 1;
      }
      if (time >= sh.meanderAt) {
        sh.meanderTo = rand(-0.55, 0.55);
        sh.meanderAt = time + rand(3, 7);
      }
      sh.wander += (sh.meanderTo - sh.wander) * Math.min(1, dt * 0.5);
      // Off the page, the pull home grows stronger.
      var over = Math.max(-hx, hx - W, -hy, hy - H, 0);
      var pull = 1 + clamp(over / (L * 0.3), 0, 1) * 3;
      var ga = Math.atan2(gy, gx) + sh.wander / pull;
      var dx = Math.cos(sh.heading) * 0.6 + Math.cos(ga) * pull;
      var dy = Math.sin(sh.heading) * 0.6 + Math.sin(ga) * pull;

      var hunting = false;
      if (sp.hunts && !sh.leaving) {
        sh.hunger = Math.min(1, sh.hunger + dt * 0.035);
        if (time >= sh.retargetAt) {
          sh.target = sh.hunger > 0.4 ? findPrey(sh) : null;
          sh.retargetAt = time + 0.5;
        }
        hunting = sh.target && sh.target.alive;
        if (hunting) {
          var tx = sh.target.x + sh.target.vx * 0.3 - hx;
          var ty = sh.target.y + sh.target.vy * 0.3 - hy;
          var td = Math.sqrt(tx * tx + ty * ty) || 1;
          dx += tx / td * (1.5 + 2 * sh.hunger);
          dy += ty / td * (1.5 + 2 * sh.hunger);
        }
      }

      if (sh.leaving) {
        // Head for the nearer side and swim out of the page.
        var lx = sh.exitX - hx, ly = (H / 2 - hy) * 0.2, ld = Math.sqrt(lx * lx + ly * ly) || 1;
        dx += lx / ld * 3;
        dy += ly / ld * 3;
      }

      // After a collision, swim off along the new heading for a while.
      var bouncing = time < sh.bounceUntil;
      if (bouncing) {
        dx += Math.cos(sh.bounceDir) * 4 * sh.bounceShare;
        dy += Math.sin(sh.bounceDir) * 4 * sh.bounceShare;
      }

      // Big bodies turn wide, and wider still the faster they go.
      var limit = (hunting ? sp.huntTurn : sp.turn) * (bouncing ? 1 + sh.bounceShare : 1) * dt;
      var turned = clamp(wrapAngle(Math.atan2(dy, dx) - sh.heading), -limit, limit);
      sh.heading = wrapAngle(sh.heading + turned);
      sh.turn += (turned / dt - sh.turn) * Math.min(1, dt * 3);
      // A squid moves by jet: a surge, then a glide.
      var cruise = sp.jet ? sp.cruise * (0.4 + 1.4 * Math.pow(Math.max(0, Math.sin(sh.phase * 0.45)), 2)) : sp.cruise;
      sh.speed += ((hunting ? sp.hunt : cruise) - sh.speed) * Math.min(1, dt * (sp.jet ? 2 : 1));

      // The stroke: the beat quickens with speed; each sweep of the tail (two
      // per beat) or each flap is a surge, with a glide between, and a
      // side-sweeping tail swings the head the other way.
      sh.phase += dt * sp.beat * (0.5 + 0.5 * sh.speed / sp.cruise);
      var sweep = Math.sin(sh.phase * (sp.stroke || 1));
      var surge = 1 + sp.surge * (2 * sweep * sweep - 1);
      var yaw = sh.heading - sp.yaw * Math.sin(sh.phase);

      nodes[0] += Math.cos(yaw) * sh.speed * surge * dt;
      nodes[1] += Math.sin(yaw) * sh.speed * surge * dt;

      // The body follows the head, each joint allowed only a small bend.
      var seg = L / (NODES - 1), prev = sh.heading + Math.PI;
      for (var n = 1; n < NODES; n++) {
        var bx = nodes[(n - 1) * 2], by = nodes[(n - 1) * 2 + 1];
        var a = Math.atan2(nodes[n * 2 + 1] - by, nodes[n * 2] - bx);
        a = prev + clamp(wrapAngle(a - prev), -sp.bend, sp.bend);
        nodes[n * 2] = bx + Math.cos(a) * seg;
        nodes[n * 2 + 1] = by + Math.sin(a) * seg;
        prev = a;
      }

      // Knocked by a collision: the whole body drifts with the blow as it fades.
      if (sh.knockX || sh.knockY) {
        for (n = 0; n < NODES; n++) {
          nodes[n * 2] += sh.knockX * dt;
          nodes[n * 2 + 1] += sh.knockY * dt;
        }
        var damp = Math.exp(-dt * sh.knockFade);
        sh.knockX *= damp; sh.knockY *= damp;
        if (Math.abs(sh.knockX) + Math.abs(sh.knockY) < 0.5) sh.knockX = sh.knockY = 0;
      }

      // Whales come up to breathe now and then: a burst of spray at the blowhole.
      if (sh.shape.spout && time >= sh.nextSpout) {
        var bs = Math.round(sh.shape.blow[0] * (NODES - 1));
        events.push({ kind: 'spout', x: nodes[bs * 2], y: nodes[bs * 2 + 1] });
        sh.nextSpout = time + rand(12, 24);
      }

      // Feed.
      if (hunting) {
        var mouth = L * 0.05 + 6;
        for (var i = 0; i < fish.length; i++) {
          var f = fish[i];
          if (!f.alive || sh.hunger < 0.2) continue;
          var mx = f.x - nodes[0], my = f.y - nodes[1];
          if (mx * mx + my * my < mouth * mouth) {
            f.alive = false;
            f.respawnAt = time + rand(4, 9);
            sh.hunger = Math.max(0, sh.hunger - 0.2);
            events.push({ kind: 'eat', x: f.x, y: f.y });
          }
        }
      }

      // Gone once the whole body has left the page.
      if (sh.leaving) {
        var out = true;
        for (n = 0; n < NODES && out; n++) {
          var nx = nodes[n * 2], ny = nodes[n * 2 + 1];
          if (nx > -L * 0.3 && nx < W + L * 0.3 && ny > -L * 0.3 && ny < H + L * 0.3) out = false;
        }
        if (out) swimmers.splice(s, 1);
      }
    }
  }

  // Bodies don't pass through each other. Mass goes with volume (length
  // cubed), so a shark meeting a whale is the one that moves. Where two
  // overlap they are pushed apart by that ratio; if they were closing on
  // each other there's an impact: both are knocked away from the contact
  // and glance off onto new headings. The lighter one is thrown harder,
  // drifts further, turns sharper and darts off startled; a heavy one
  // barely notices. The water splashes where they met.
  function collide() {
    for (var a = 0; a < swimmers.length; a++) {
      for (var b = a + 1; b < swimmers.length; b++) {
        var A = swimmers[a], B = swimmers[b];
        var hx = A.nodes[0] - B.nodes[0], hy = A.nodes[1] - B.nodes[1];
        if (hx * hx + hy * hy > Math.pow(A.length + B.length, 2)) continue;

        // The deepest overlap between any two body sections.
        var depth = 0, nx = 0, ny = 0, px = 0, py = 0;
        for (var i = 0; i < NODES; i++) {
          var ra = A.shape.body(i / (NODES - 1)) * A.length;
          if (ra < 2) continue;
          var ax = A.nodes[i * 2], ay = A.nodes[i * 2 + 1];
          for (var j = 0; j < NODES; j++) {
            var rb = B.shape.body(j / (NODES - 1)) * B.length;
            if (rb < 2) continue;
            var dx = ax - B.nodes[j * 2], dy = ay - B.nodes[j * 2 + 1];
            var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
            var pen = ra + rb + 4 - d;
            if (pen > depth) {
              depth = pen; nx = dx / d; ny = dy / d;
              px = B.nodes[j * 2] + nx * rb; py = B.nodes[j * 2 + 1] + ny * rb;
            }
          }
        }
        if (depth <= 0) continue;

        var mA = Math.pow(A.length, 3), mB = Math.pow(B.length, 3);
        var shareA = mB / (mA + mB), shareB = 1 - shareA;   // how much each one gives
        for (var n = 0; n < NODES; n++) {
          A.nodes[n * 2] += nx * depth * shareA; A.nodes[n * 2 + 1] += ny * depth * shareA;
          B.nodes[n * 2] -= nx * depth * shareB; B.nodes[n * 2 + 1] -= ny * depth * shareB;
        }

        // Closing speed along the contact normal; only a real approach is an impact.
        var vax = Math.cos(A.heading) * A.speed + A.knockX, vay = Math.sin(A.heading) * A.speed + A.knockY;
        var vbx = Math.cos(B.heading) * B.speed + B.knockX, vby = Math.sin(B.heading) * B.speed + B.knockY;
        var closing = -((vax - vbx) * nx + (vay - vby) * ny);
        var pair = Math.min(A.id, B.id) + ':' + Math.max(A.id, B.id);
        if (closing < 3 || time - (A.lastHit[pair] || -9) < 1.2) continue;
        A.lastHit[pair] = B.lastHit[pair] = time;

        // Even a glancing touch shoves; a head-on hit throws.
        var blow = (Math.min(closing, 120) + 25) * 2;
        var kickA = blow * shareA * (0.4 + shareA), kickB = blow * shareB * (0.4 + shareB);
        A.knockX += nx * kickA; A.knockY += ny * kickA;
        B.knockX -= nx * kickB; B.knockY -= ny * kickB;
        glance(A, nx, ny, shareA);
        glance(B, -nx, -ny, shareB);
        events.push({ kind: 'bump', x: px, y: py, power: clamp(closing / 60, 0.3, 1.5) });
      }
    }
  }

  // Turn off a contact whose normal (nx, ny) points away from the other
  // body: reflect the heading if it was swimming into it, and jolt it round
  // by however much of the blow this animal takes.
  function glance(sh, nx, ny, share) {
    var vx = Math.cos(sh.heading), vy = Math.sin(sh.heading), into = vx * nx + vy * ny;
    if (into < 0) { vx -= 2 * into * nx; vy -= 2 * into * ny; }
    else { vx += nx * 0.6; vy += ny * 0.6; }
    sh.bounceDir = Math.atan2(vy, vx);
    sh.bounceShare = share * share;
    sh.bounceUntil = time + 0.5 + 2.5 * share * share;
    sh.heading = wrapAngle(sh.heading + clamp(wrapAngle(sh.bounceDir - sh.heading), -1.1, 1.1) * share * share);
    sh.speed += 45 * share * share;
    // A light animal keeps drifting with the blow for longer.
    sh.knockFade = 3.2 - 2.2 * share;
    sh.target = null;
    sh.retargetAt = time + 1.5;
  }

  // ---------- Wake ----------

  function cellAt(x, y) {
    var c = Math.floor(x / cw), r = Math.floor(y / LINE);
    return c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  }

  // Add a soft disc of `amount` to a field, `radius` cells across.
  function splat(field, x, y, radius, amount) {
    var c0 = Math.floor(x / cw), r0 = Math.floor(y / LINE);
    for (var r = r0 - radius; r <= r0 + radius; r++) {
      for (var c = c0 - radius * 2; c <= c0 + radius * 2; c++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        var d = Math.sqrt((c - c0) * (c - c0) / 4 + (r - r0) * (r - r0));
        if (d > radius) continue;
        var i = r * cols + c;
        field[i] = Math.min(1.5, field[i] + amount * (1 - d / (radius + 1)));
      }
    }
  }

  function stepWake(dt) {
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      if (ev.kind === 'eat') { splat(heat, ev.x, ev.y, 1, 1); splat(energy, ev.x, ev.y, 3, 0.8); }
      else if (ev.kind === 'spout') splat(energy, ev.x, ev.y, 4, 1.5);
      else if (ev.kind === 'bump') splat(energy, ev.x, ev.y, Math.round(3 + 3 * ev.power), 0.7 + 0.6 * ev.power);
      else splat(energy, ev.x, ev.y, 6, 1.3);
    }
    events.length = 0;

    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      if (!f.alive) continue;
      var k = cellAt(f.x, f.y);
      if (k >= 0) energy[k] = Math.min(1.5, energy[k] + 0.012 + f.alarm * 0.03);
    }
    for (var s = 0; s < swimmers.length; s++) {
      // The tail sweeps the most water.
      var sh = swimmers[s], stir = 0.03 + sh.speed * 0.001 + sh.length * 0.00004;
      for (var n = NODES - 6; n < NODES; n++) {
        k = cellAt(sh.nodes[n * 2], sh.nodes[n * 2 + 1]);
        if (k >= 0) energy[k] = Math.min(1.5, energy[k] + stir);
      }
    }
    if (pointer.active) splat(energy, pointer.x, pointer.y, 1, 0.06);

    // Spread to the four neighbours and fade, so a wake widens as it dies.
    var fade = Math.exp(-dt * 1.4);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        k = r * cols + c;
        var sum = energy[k] * 4 +
          (c > 0 ? energy[k - 1] : energy[k]) + (c < cols - 1 ? energy[k + 1] : energy[k]) +
          (r > 0 ? energy[k - cols] : energy[k]) + (r < rows - 1 ? energy[k + cols] : energy[k]);
        energyTmp[k] = sum / 8 * fade;
      }
    }
    var swap = energy; energy = energyTmp; energyTmp = swap;
    var cool = Math.exp(-dt * 2.2);
    for (k = 0; k < heat.length; k++) heat[k] *= cool;
  }

  function step(dt) {
    time += dt;
    manage();
    stepFish(dt);
    stepSwimmers(dt);
    collide();
    respawn();
    stepWake(dt);
  }

  // ---------- Drawing swimmers ----------

  var spine = new Float32Array(NODES * 2), arc = new Float32Array(NODES), arcTotal = 1;
  var shape, phase = 0, bank = 0;
  var finTip = new Float32Array(8), finReach = new Float32Array(16);
  // What the last sample() landed on.
  var hitKind = 0, hitShade = 0, hitAlb = 1, hitPaint = 0, hitS = 0, hitV = 0, hitDist = 0, hitAng = 0;

  // Classify one point against the current animal, in body coordinates:
  // u along the spine from the snout, a across it on either side.
  function sample(px, py, L) {
    var best = Infinity, bestU = 0, side = 1, nx = 0, ny = 0;
    for (var i = 0; i < NODES - 1; i++) {
      var ax = spine[i * 2], ay = spine[i * 2 + 1];
      var ux = spine[i * 2 + 2] - ax, uy = spine[i * 2 + 3] - ay;
      var len2 = ux * ux + uy * uy || 1, len = Math.sqrt(len2);
      var t = ((px - ax) * ux + (py - ay) * uy) / len2;
      // The end segments run on past the snout and tail, so fins and the
      // head can reach beyond the spine itself.
      if (i > 0 && t < 0) t = 0;
      if (i < NODES - 2 && t > 1) t = 1;
      var qx = px - (ax + ux * t), qy = py - (ay + uy * t);
      var d2 = qx * qx + qy * qy;
      if (d2 < best) {
        best = d2;
        bestU = arc[i] + t * len;
        side = ux * qy - uy * qx >= 0 ? 1 : -1;
        var dl = Math.sqrt(d2) || 1;
        nx = qx / dl; ny = qy / dl;
        hitAng = Math.atan2(uy, ux);
      }
    }

    var a = Math.sqrt(best), s = bestU / arcTotal, u = s * L;
    hitDist = a; hitS = s; hitV = a * side; hitAlb = shape.albedo;

    var head = shape.head;
    if (head && u < L * (head.sweep + head.depth)) {
      // Hammerhead: a wide wing across the snout, its tips swept back.
      var r = a / (L * head.span);
      var front = L * head.sweep * r * r;
      if (r <= 1 && u >= front && u <= front + L * head.depth * (1 - 0.25 * r * r * r * r)) {
        hitKind = BODY;
        hitShade = 0.66 - 0.22 * r + (u < front + L * 0.012 ? 0.12 : 0);
        return true;
      }
    }

    if (s >= 0 && s <= 1) {
      var w = shape.body(s) * L;
      if (shape.ripple) w *= 1 + shape.ripple * Math.sin(phase * 2.2 - s * 28);
      if (a <= w) {
        var across = a / (w || 1);
        // A rounded back lit from the top-left; the flanks fall into shadow.
        var facing = (nx * -0.6 + ny * -0.8) * across;
        var shade = 0.62 - 0.42 * across * across + 0.3 * facing;
        var kind = BODY;
        skinKind = 0;
        if (shape.skin) hitAlb *= shape.skin(s, across, a * side, L);
        if (skinKind) kind = skinKind;
        else if (shape.dorsal && s > shape.dorsal[0] && s < shape.dorsal[1] && across < 0.28) { kind = RIDGE; shade = 1; }
        else if (shape.dorsal2 && s > shape.dorsal2[0] && s < shape.dorsal2[1] && across < 0.38) shade = Math.max(shade, 0.85);
        else if (shape.gills && s > shape.gills[0] && s < shape.gills[1] && across > 0.55 &&
                 Math.floor((s - shape.gills[0]) / (shape.gills[1] - shape.gills[0]) * 5) % 2 === 0) kind = GILL;
        else if (s < 0.05) shade = Math.max(shade, 0.75);   // pale snout
        hitKind = kind;
        hitShade = clamp(shade, 0, 1);
        hitPaint = paint;
        return true;
      }
    }

    var fins = shape.fins, off = side > 0 ? 0 : 8;
    for (var f = 0; f < fins.length; f++) {
      var fin = fins[f], tipU = finTip[f], reach = finReach[off + f];
      var r1 = L * fin.root[1];
      if (inTriangle(u, a, L * fin.root[0], 0, r1, 0, tipU, reach) &&
          !(fin.sickle && inTriangle(u, a, r1, 0, r1 + (tipU - r1) * 0.4, reach * 0.5, tipU, reach))) {
        hitKind = FIN;
        hitShade = 0.36 + 0.22 * (1 - clamp(a / reach, 0, 1));
        var wp = shape.wingPale;
        if (fin.pale) { hitKind = PALE; hitPaint = fin.pale; }
        else if (wp && f === 0 && s > wp[0] && s < wp[1] && a < L * wp[2]) { hitKind = PALE; hitPaint = wp[3]; }
        return true;
      }
    }
    return false;
  }

  // Outline glyph for an edge running at angle a (screen space, y down).
  function strokeGlyph(a) {
    a = ((a % Math.PI) + Math.PI) % Math.PI;
    if (a < Math.PI / 8 || a > Math.PI * 7 / 8) return 45;   // -
    if (a < Math.PI * 3 / 8) return 92;                      // \
    if (a < Math.PI * 5 / 8) return 124;                     // |
    return 47;                                               // /
  }

  function putAnimal(i, ch, tone, cls) {
    sOn[i] = 1; sChars[i] = ch; sTones[i] = tone; sClasses[i] = cls;
  }

  // The point on the render spine at s, pushed sideways by `off` px.
  var at = { x: 0, y: 0, ang: 0 };
  function spineAt(s, off) {
    var target = s * arcTotal, i = 0;
    while (i < NODES - 2 && arc[i + 1] < target) i++;
    var ux = spine[i * 2 + 2] - spine[i * 2], uy = spine[i * 2 + 3] - spine[i * 2 + 1];
    var len = Math.sqrt(ux * ux + uy * uy) || 1, t = clamp((target - arc[i]) / len, 0, 1);
    at.x = spine[i * 2] + ux * t - uy / len * off;
    at.y = spine[i * 2 + 1] + uy * t + ux / len * off;
    at.ang = Math.atan2(uy, ux);
    return at;
  }

  var CORNERS = [0.2, 0.25, 0.8, 0.25, 0.2, 0.75, 0.8, 0.75];

  // How much ink a cell carries: dark skin on a light page, bright skin on a
  // dark one, so the lighting reads the same either way. A floor keeps
  // shadowed flanks from fading out of the silhouette.
  function inkFor(brightness, dark) {
    return 0.2 + 0.8 * clamp(dark ? brightness : 1 - brightness, 0, 1);
  }

  function rasterSwimmer(sh, dark) {
    var L = sh.length, nodes = sh.nodes, sp = sh.sp, script = SCRIPTS[sp.script];
    shape = sh.shape;
    var tint = sp.cls;
    phase = sh.phase;
    var swim = clamp(sh.speed / 55, 0.5, 1.4);

    // Render spine: the sim spine plus a travelling wave toward the tail.
    for (var n = 0; n < NODES; n++) {
      var a = Math.max(0, n - 1), b = Math.min(NODES - 1, n + 1);
      var tx = nodes[b * 2] - nodes[a * 2], ty = nodes[b * 2 + 1] - nodes[a * 2 + 1];
      var tl = Math.sqrt(tx * tx + ty * ty) || 1;
      var s = n / (NODES - 1);
      var sway = Math.sin(sh.phase - s * 5) * L * sp.wave * (0.1 + 0.9 * Math.pow(s, 1.7)) * swim * (sp.yaw > 0.1 ? 1.3 : 1);
      spine[n * 2] = nodes[n * 2] - ty / tl * sway;
      spine[n * 2 + 1] = nodes[n * 2 + 1] + tx / tl * sway;
    }
    arc[0] = 0;
    for (n = 1; n < NODES; n++) {
      arc[n] = arc[n - 1] + Math.sqrt(Math.pow(spine[n * 2] - spine[n * 2 - 2], 2) +
                                      Math.pow(spine[n * 2 + 1] - spine[n * 2 - 1], 2));
    }
    arcTotal = arc[NODES - 1] || 1;

    // Fins for this frame. Banking: the fin on the inside of a turn
    // foreshortens and the outer one spreads. Paddling fins also sweep
    // back and forth along the body.
    bank = clamp(sh.turn * 0.4, -0.3, 0.3);
    var pad = 0.1;
    for (var f = 0; f < shape.fins.length; f++) {
      var fin = shape.fins[f], beat = Math.sin(sh.phase * (fin.rate || 1) + (fin.off || 0));
      var reach = L * fin.tip[1] * (fin.flap ? 1 + fin.flap * beat : 1 + 0.05 * Math.sin(sh.phase * 0.5));
      finTip[f] = L * (fin.tip[0] + (fin.sweep || 0) * beat);
      finReach[f] = reach * (fin.bank ? 1 - bank : 1);
      finReach[8 + f] = reach * (fin.bank ? 1 + bank : 1) * (fin.asym || 1);
      pad = Math.max(pad, fin.tip[1] * (1 + (fin.flap || 0)) + 0.05, Math.abs(fin.tip[0] - 0.5) - 0.45);
    }
    if (shape.head) pad = Math.max(pad, shape.head.span + 0.05);

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (n = 0; n < NODES; n++) {
      minX = Math.min(minX, spine[n * 2]); maxX = Math.max(maxX, spine[n * 2]);
      minY = Math.min(minY, spine[n * 2 + 1]); maxY = Math.max(maxY, spine[n * 2 + 1]);
    }
    var margin = L * pad;
    var c0 = Math.max(0, Math.floor((minX - margin) / cw)), c1 = Math.min(cols - 1, Math.floor((maxX + margin) / cw));
    var r0 = Math.max(0, Math.floor((minY - margin) / LINE)), r1 = Math.min(rows - 1, Math.floor((maxY + margin) / LINE));
    if (c0 > c1 || r0 > r1) return;
    var far = margin + Math.sqrt(cw * cw + LINE * LINE);
    var dim = sh.depth < 0.85 ? 1 : 0;   // deeper animals are a shade fainter
    var shiftC = Math.round(L * 0.03 / cw) + 1, shiftR = Math.round(L * 0.018 / LINE) + 1;
    var tick = Math.floor(time * 2.5);

    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        var x = c * cw, y = r * LINE;
        var center = sample(x + cw / 2, y + LINE / 2, L);
        if (!center && hitDist > far) continue;
        var kind = hitKind, shade = hitShade, alb = hitAlb, pale = hitPaint, bs = hitS, bv = hitV, ang = hitAng;
        var across = seamAcross;

        // Four more samples near the corners: how much of the cell is
        // animal, and which way the inside lies.
        var hits = center ? 1 : 0, gx = 0, gy = 0;
        for (var k = 0; k < 8; k += 2) {
          if (sample(x + CORNERS[k] * cw, y + CORNERS[k + 1] * LINE, L)) {
            hits++;
            gx += (CORNERS[k] - 0.5) * cw;
            gy += (CORNERS[k + 1] - 0.5) * LINE;
          }
        }
        if (!hits) continue;
        var cover = hits / 5, i = r * cols + c;

        // A key pinned to the skin, so each glyph rides along with the body.
        var key = Math.floor(hash(Math.round(bs * 60), Math.round(bv / cw), sh.id) * 1e9);
        var roll = hash(key, tick + key % 5, 3);

        if (!center || cover < 0.6) {
          // Soft edge: a stroke following the outline where the cell is
          // mostly covered, a light speck where it is barely touched.
          var ch = cover >= 0.4 && (gx || gy) ? strokeGlyph(Math.atan2(gy, gx) + Math.PI / 2)
                                              : (key % 2 ? 46 : 39);
          putAnimal(i, ch, clamp((cover >= 0.4 ? 3 : 2) - dim, 1, 6), roll < 0.04 ? ACCENT + key % 4 : tint);
          continue;
        }

        var sc = c + shiftC, sr = r + shiftR;
        if (sc < cols && sr < rows) shadow[sr * cols + sc] = 1;

        var shimmer = (hash(c, r, Math.floor(time * 6)) - 0.5) * 0.06;
        var ink = inkFor(kind === PALE ? pale + 0.1 * (shade - 0.5) : shade * alb, dark) + shimmer;
        var glyph, tone, cls = tint;
        // A wide script fills only every other column; the cell between is
        // left blank (but still part of the animal) for the glyph to spill into.
        var gap = script.wide && c % 2;
        if (kind === RIDGE) {
          // The animal's name, spelled down its back in its own script.
          // Spelled in reading order whichever way the animal faces.
          var name = sh.sp.name, d0 = shape.dorsal[0], d1 = shape.dorsal[1];
          var along = clamp((bs - d0) / (d1 - d0), 0, 0.999);
          if ((Math.cos(ang) < 0) !== !!script.rtl) along = 0.999 - along;
          glyph = name ? name.charCodeAt(Math.floor(along * name.length)) : (key % 2 ? 64 : 35);
          if (name && gap) glyph = 32;
          tone = 6;
        }
        else if (kind === GILL) { glyph = strokeGlyph(ang + Math.PI / 2); tone = 5; }
        else if (kind === SEAM) { glyph = strokeGlyph(ang + (across ? Math.PI / 2 : 0)); tone = 5; }
        else if (kind === KNOB) { glyph = 111; tone = 4; }                          // o
        else if (kind === SPOT) { glyph = key % 3 ? 111 : 42; tone = 5; cls = TEAL; }
        else {
          var jitter = Math.floor(hash(key, tick, 9) * 3) - 1;
          glyph = gap ? 32 : scriptGlyph(script, ink, jitter);
          tone = clamp(1 + Math.round(ink * 4), 1, 5) + (kind === FIN ? 0 : 1);
          if (roll < 0.05) cls = ACCENT + key % 4;
        }
        putAnimal(i, glyph, clamp(tone - dim, 1, 6), cls);
      }
    }

    // Arms trailing from the head: each follows the spine, spreading a
    // little and curling as the animal swims; suckers here and there, and
    // the two long tentacles end in clubs written in the animal's script.
    if (shape.arms) {
      var ar = shape.arms, ds = cw * 0.8 / L;
      for (var m = 0; m < ar.count + 2; m++) {
        var tentacle = m >= ar.count;
        var spread = tentacle ? (m - ar.count - 0.5) * 0.6 : (m / (ar.count - 1) - 0.5) * 2;
        var end = tentacle ? 1 : ar.to;
        for (var as = ar.from; as <= end; as += ds) {
          var along = (as - ar.from) / (end - ar.from);
          var curl = Math.sin(sh.phase * 1.1 - as * 18 + m * 1.3) * L * 0.014 * along;
          spineAt(as, spread * L * ar.spread * (1 - 0.6 * along) + curl);
          k = cellAt(at.x, at.y);
          if (k < 0) continue;
          var club = tentacle && along > 0.82;
          var g = club ? scriptGlyph(script, 0.7 + 0.3 * hash(m, Math.round(as * 100), sh.id), 0)
                       : hash(m, Math.round(as * 60), sh.id) < 0.18 ? 111 : strokeGlyph(at.ang);
          putAnimal(k, g, clamp((club ? 6 : 4) - Math.round(2 * along) - dim, 1, 6), tint);
        }
      }
    }

    // A tusk straight out from the snout, twisting every third cell.
    if (shape.tusk) {
      var fx = spine[0] - spine[2], fy = spine[1] - spine[3], fl = Math.sqrt(fx * fx + fy * fy) || 1;
      fx /= fl; fy /= fl;
      var shaft = strokeGlyph(Math.atan2(fy, fx)), twist = Math.abs(fx) > 0.7 ? 126 : 41;   // ~ )
      for (var td = cw * 0.5, tn = 0; td <= shape.tusk * L; td += cw * 0.75, tn++) {
        k = cellAt(spine[0] + fx * td, spine[1] + fy * td);
        if (k >= 0) putAnimal(k, tn % 3 === 2 ? twist : shaft, clamp(5 - Math.round(2 * td / (shape.tusk * L)) - dim, 1, 6), IVORY);
      }
    }

    // Eyes and blowholes are stamped on, so they always show.
    if (shape.eyes) {
      for (var e = -1; e <= 1; e += 2) {
        spineAt(shape.eyes[0], shape.eyes[1] * L * e);
        k = cellAt(at.x, at.y);
        if (k >= 0 && sOn[k]) putAnimal(k, shape.eyeGlyph || 111, clamp(6 - dim, 1, 6), INK);   // o
      }
    }
    if (shape.blow) {
      spineAt(shape.blow[0], shape.blow[1] * L);
      k = cellAt(at.x, at.y);
      if (k >= 0 && sOn[k]) putAnimal(k, 34, clamp(5 - dim, 1, 6), INK);            // "
    }
  }

  // ---------- Composing a frame ----------

  function put(i, ch, tone, cls) { chars[i] = ch; tones[i] = tone; classes[i] = cls; }

  function render() {
    var dark = root.classList.contains('dark');
    var n = cols * rows, i;
    chars.fill(0); sOn.fill(0); shadow.fill(0);

    // Deepest first, so nearer animals swim over them.
    var order = swimmers.slice().sort(function (a, b) { return a.depth - b.depth; });
    for (i = 0; i < order.length; i++) rasterSwimmer(order[i], dark);

    // Back to front: wake, feeding flashes, shadows, fish, animals.
    for (i = 0; i < n; i++) {
      var e = energy[i];
      if (heat[i] > 0.1) put(i, heat[i] > 0.55 ? 42 : 183, clamp(Math.ceil(heat[i] * 5), 1, 6), HEAT);   // * ·
      else if (e > 0.35) put(i, e > 0.9 ? 111 : e > 0.6 ? 183 : 46, clamp(Math.ceil((e - 0.35) * 6), 1, 5), WAKE);
      else if (shadow[i] && (i + Math.floor(i / cols)) % 2) put(i, 46, 1, INK);
    }

    for (i = 0; i < fish.length; i++) {
      var f = fish[i];
      if (!f.alive) continue;
      var k = cellAt(f.x, f.y);
      if (k < 0) continue;
      var glint = Math.max(clamp(Math.abs(f.turn) / 3, 0, 1), f.alarm);
      var v = 0.3 + 0.4 * (f.depth - 0.5) / 0.5 + 0.3 * glint;
      // English schools point the way they swim; the rest swim as their script's word for fish.
      var codes = f.script.fishCodes;
      var glyph = codes.length > 1 ? (f.depth > 0.72 ? codes[f.vx >= 0 ? 0 : 1] : 45) : codes[0];
      put(k, glyph, clamp(1 + Math.floor(v * 5), 1, 6), f.colour);
    }

    for (i = 0; i < n; i++) if (sOn[i]) put(i, sChars[i], sTones[i], sClasses[i]);

    // Group cells by colour and tone, so each group is one fillStyle.
    for (i = 0; i < CLASSES * TONE_COUNT; i++) (buckets[i] || (buckets[i] = [])).length = 0;
    for (i = 0; i < n; i++) {
      if (chars[i] && chars[i] !== 32) buckets[classes[i] * TONE_COUNT + tones[i]].push(i);
    }

    ctx.clearRect(0, 0, W, H);
    var palette = dark ? PALETTE.dark : PALETTE.light;
    for (var b = 0; b < buckets.length; b++) {
      var group = buckets[b];
      if (!group.length) continue;
      ctx.fillStyle = 'rgba(' + palette.rgb[Math.floor(b / TONE_COUNT)] + ',' + palette.alpha[b % TONE_COUNT] + ')';
      for (var g = 0; g < group.length; g++) {
        var c = group[g];
        ctx.fillText(String.fromCharCode(chars[c]), (c % cols) * cw, Math.floor(c / cols) * LINE);
      }
    }
  }

  // ---------- Loop ----------

  var raf = 0, last = 0, acc = 0;

  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    var stepped = false;
    while (acc >= STEP) { step(STEP); acc -= STEP; stepped = true; }
    if (stepped) render();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    cancelAnimationFrame(raf);
    if (document.hidden || reduce.matches) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // Reduced motion: let the water settle for a few seconds, then hold still.
  function still() {
    cancelAnimationFrame(raf);
    for (var i = 0; i < 120; i++) step(STEP);
    render();
  }

  resize();
  if (reduce.matches) still(); else start();

  window.addEventListener('resize', function () {
    resize();
    if (reduce.matches) render();
  });
  document.addEventListener('visibilitychange', start);
  reduce.addEventListener('change', function () { if (reduce.matches) still(); else start(); });

  // A still frame has to be redrawn by hand when the theme flips.
  new MutationObserver(function () { if (reduce.matches) render(); })
    .observe(root, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('pointermove', function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = e.pointerType === 'mouse';
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { pointer.active = false; });

  window.addEventListener('pointerdown', function (e) {
    if (reduce.matches) return;
    events.push({ kind: 'splash', x: e.clientX, y: e.clientY });
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i], dx = f.x - e.clientX, dy = f.y - e.clientY;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > 220 || d < 0.01) continue;
      f.vx += dx / d * (1 - d / 220) * 220;
      f.vy += dy / d * (1 - d / 220) * 220;
      f.alarm = 1;
    }
  }, { passive: true });

  // Preview hook: ?cast=orca,squid puts those animals in view at once.
  var wanted = new URLSearchParams(window.location.search).get('cast');
  if (wanted) {
    swimmers = [];
    wanted.split(',').forEach(function (kind, n, all) {
      if (!SPECIES[kind]) return;
      makeSwimmer(kind, 1, W * (n + 1) / (all.length + 1), H * (n % 2 ? 0.35 : 0.65), n % 2 ? Math.PI : 0).leaveAt = time + 600;
    });
    nextArrival = time + 600;
  }
})();
