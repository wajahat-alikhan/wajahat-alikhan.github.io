// ASCII aquarium — a little stretch of ocean drawn as characters into a <pre>.
// The column is narrow, so every creature is built to read by its silhouette:
// a few strokes, a hint of interior, nothing more. Each kind keeps its own
// habits — fish cruise and turn, jellyfish pulse and drift, seahorses hover,
// crabs work the sand, and the coral and anemones simply stay put.
(function () {
  var pre = document.getElementById('aquarium');
  if (!pre) return;

  var FPS = 12;                 // ASCII reads better slow than smooth
  var SAND = ['.', '.', ':', '-'];
  var BUBBLES = ['.', 'o', '°'];
  var SURFACE = '~~~~~^~~~~~~~~~^~~~~~~~^~~~~~';
  var GAP_X = 1.5, GAP_Y = 1;   // clearance kept between two creatures

  // `band` is the slice of water a creature prefers, top (0) to sand (1).
  // Sprites face right; the left-facing frames are mirrored on load.
  var SPECIES = [
    {
      name: 'fish', kind: 'swim', odds: 5, speed: [0.55, 0.95], band: [0, 1],
      frames: [[
        "     .---.",
        " /\\ /     \\",
        "<  (   o   >",
        " \\/ '.___.'"
      ]]
    },
    {
      name: 'longfish', kind: 'swim', odds: 4, speed: [0.70, 1.10], band: [0, 0.8],
      frames: [[
        "    .---------.",
        " >=(  :   o    >",
        "    '---------'"
      ]]
    },
    {
      name: 'angel', kind: 'swim', odds: 4, speed: [0.40, 0.70], band: [0, 1],
      frames: [[
        "  \\  .-.",
        "   \\/   \\",
        "   (  o  >",
        "   /\\   /",
        "  /  '-'"
      ]]
    },
    {
      name: 'puffer', kind: 'swim', odds: 3, speed: [0.35, 0.60], band: [0.1, 1],
      frames: [[
        "   .-''-.",
        "  / :  : \\",
        " (  o    |>",
        "  \\ :  : /",
        "   '-..-'"
      ]]
    },
    {
      name: 'turtle', kind: 'swim', odds: 2, speed: [0.25, 0.45], band: [0.2, 1],
      frames: [[
        "    .----.",
        " __/ :::: \\__",
        " \\_|'----'|_/o>"
      ]]
    },
    {
      name: 'ray', kind: 'swim', odds: 2, speed: [0.30, 0.50], band: [0.45, 1],
      frames: [[
        "   _.----._",
        " .'    o   '.",
        " '-._    _.-'~~~",
        "    '----'"
      ]]
    },
    {
      name: 'school', kind: 'swim', odds: 3, speed: [1.10, 1.70], band: [0, 0.5],
      frames: [[
        "  ><>",
        " ><>",
        "   ><>"
      ], [
        " ><>",
        "  ><>",
        "  ><>"
      ]]
    },
    {
      name: 'jelly', kind: 'drift', odds: 3, speed: [0.10, 0.22], band: [0, 0.75],
      frames: [[
        "   .---.",
        "  /     \\",
        "  '--.--'",
        "   | | |",
        "   ' | '"
      ], [
        "   .-^-.",
        "  /     \\",
        "  '--.--'",
        "   ) | (",
        "   ' ' '"
      ]]
    },
    {
      name: 'squid', kind: 'drift', odds: 2, speed: [0.14, 0.30], band: [0.1, 0.8],
      frames: [[
        "   /\\",
        "  / o\\",
        "  '--'",
        "  \\|||/",
        "   ''"
      ], [
        "   /\\",
        "  / o\\",
        "  '--'",
        "  /|||\\",
        "   ''"
      ]]
    },
    {
      name: 'seahorse', kind: 'hover', odds: 2, speed: [0.08, 0.18], band: [0.35, 1],
      frames: [[
        "  .-.",
        " ( o )",
        "  '-. \\",
        "    | |",
        "   / /",
        "  | |",
        "   \\_)"
      ]]
    },
    {
      name: 'crab', kind: 'walk', odds: 3, speed: [0.30, 0.55],
      frames: [[
        " \\  .--.  /",
        "(  (o  o)  )",
        " ' /'--'\\ '"
      ], [
        " \\_ .--. _/",
        " ( (o  o) )",
        "  //'--'\\\\"
      ]]
    },
    {
      name: 'shrimp', kind: 'walk', odds: 2, speed: [0.45, 0.80],
      frames: [[
        "   _.-.",
        " <(  o >",
        "   `^^"
      ], [
        "   _.-.",
        " <(  o >",
        "   ^^`"
      ]]
    }
  ];

  // Rooted on the sand and never moving: the scenery the fish swim past.
  var FIXTURES = [
    [
      "  \\*/",
      " -*o*-",
      "  /*\\"
    ],
    [
      " \\ | / |",
      "  \\|/|/",
      "  (___)"
    ],
    [
      "   \\ /",
      " \\  Y  /",
      "  \\_|_/",
      "    |"
    ]
  ];

  var MIRROR = { '<': '>', '>': '<', '(': ')', ')': '(', '[': ']', ']': '[',
                 '{': '}', '}': '{', '/': '\\', '\\': '/' };

  function width(art) {
    return art.reduce(function (w, line) { return Math.max(w, line.length); }, 0);
  }

  function mirror(art) {
    var w = width(art);
    return art.map(function (line) {
      var out = '';
      for (var i = w - 1; i >= 0; i--) {
        var c = line.charAt(i) || ' ';
        out += MIRROR[c] || c;
      }
      return out;
    });
  }

  SPECIES.forEach(function (sp) {
    sp.left = sp.frames.map(mirror);
    sp.w = sp.frames.reduce(function (w, f) { return Math.max(w, width(f)); }, 0);
    sp.h = sp.frames[0].length;
  });

  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  var cols = 0, rows = 0, charW = 0;
  var life = [], waiting = [], bubbles = [], plants = [], props = [], motes = [], sand = '';
  var t = 0, running = false, onScreen = false, last = 0, acc = 0;

  // ---- how many characters fit in the column --------------------------------
  function measure() {
    var probe = document.createElement('span');
    probe.textContent = new Array(81).join('M');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    pre.appendChild(probe);
    charW = probe.getBoundingClientRect().width / 80;
    pre.removeChild(probe);

    var avail = pre.getBoundingClientRect().width || 250;
    cols = Math.max(24, Math.floor(avail / (charW || 5)));
    rows = cols < 32 ? 16 : 20;
  }

  function ceiling() { return 1; }
  function bed(h) { return rows - 2 - h; }

  // Do these two creatures (plus the clearance gap) touch?
  function clash(a, b) {
    return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + GAP_X > 0 &&
           Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + GAP_Y > 0;
  }

  // Draw from the pool by `odds`, so the common fish stay common.
  function pickWeighted(pool) {
    var total = pool.reduce(function (sum, sp) { return sum + (sp.odds || 1); }, 0);
    var roll = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      roll -= pool[i].odds || 1;
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function spawn(anywhere) {
    var walkers = life.filter(function (f) { return f && f.kind === 'walk'; }).length;
    var pool = SPECIES.filter(function (sp) {
      if (sp.w > cols - 2) return false;
      return sp.kind !== 'walk' || walkers < 1;   // the sand only fits one
    });
    if (!pool.length) return null;

    // Avoid two of the same creature at once when there is another to pick
    var fresh = pool.filter(function (sp) {
      return !life.some(function (f) { return f && f.species === sp; });
    });
    var sp = pickWeighted(fresh.length ? fresh : pool);

    var dir = Math.random() < 0.5 ? 1 : -1;
    var w = sp.w, h = sp.h;
    var lo = ceiling(), hi = bed(h);
    if (hi <= lo) return null;
    if (sp.band) {                               // keep to its slice of water
      lo = Math.max(lo, ceiling() + (hi - ceiling()) * sp.band[0]);
      hi = Math.min(hi, ceiling() + (bed(h) - ceiling()) * sp.band[1]);
    }

    // Look for an opening; a creature that cannot find one waits offscreen.
    var x, y, found = false;
    for (var tries = 0; tries < 24 && !found; tries++) {
      x = anywhere ? rand(0, cols - w) : (dir > 0 ? -w : cols);
      y = sp.kind === 'walk' ? bed(h) + 1 : rand(lo, hi);
      found = !life.some(function (f) { return f && clash(f, { x: x, y: y, w: w, h: h }); });
    }
    if (!found) return null;

    var speed = rand(sp.speed[0], sp.speed[1]);
    return {
      species: sp,
      kind: sp.kind,
      w: w,
      h: h,
      art: (dir > 0 ? sp.frames : sp.left)[0],
      cel: 0,
      celIn: rand(0.5, 1.1),
      x: x,
      y: y,
      dir: dir,
      speed: speed,
      vx: dir * speed,
      vy: 0,
      rise: sp.kind === 'drift' ? rand(0.16, 0.30) : rand(0.08, 0.26),
      rate: rand(0.10, 0.26),
      phase: rand(0, Math.PI * 2),
      turnIn: rand(10, 32),
      age: 0,
      span: rand(45, 110),          // then it moves on and another drifts in
      leaving: false,
      nextBubble: rand(2, 9)
    };
  }

  function stock() {
    var crowd = Math.max(3, Math.min(6, Math.round(cols * rows / 200)));
    life = [];
    waiting = [];
    for (var i = 0; i < crowd; i++) {
      life.push(spawn(true));
      waiting.push(rand(2, 6));
    }

    // kelp stalks and scenery, each given its own stretch of sand
    var taken = [];
    function floorSlot(w) {
      for (var attempt = 0; attempt < 30; attempt++) {
        var x = Math.round(rand(0, Math.max(1, cols - w)));
        var free = taken.every(function (span) {
          return x + w + 1 < span[0] || x > span[1] + 1;
        });
        if (free) {
          taken.push([x, x + w]);
          return x;
        }
      }
      return null;
    }

    plants = [];
    var strands = Math.max(2, Math.round(cols / 15));
    for (var s = 0; s < strands; s++) {
      var at = floorSlot(1);
      if (at === null) continue;
      plants.push({
        x: at,
        h: Math.round(rand(3, Math.min(8, rows - 5))),
        phase: rand(0, Math.PI * 2),
        sway: rand(0.5, 0.9)
      });
    }

    props = [];
    var count = Math.max(1, Math.round(cols / 26));
    for (var p = 0; p < count; p++) {
      var art = pick(FIXTURES);
      var spot = floorSlot(width(art));
      if (spot !== null) props.push({ art: art, x: spot });
    }

    sand = '';
    for (var c = 0; c < cols; c++) sand += Math.random() < 0.4 ? pick(SAND) : ' ';

    bubbles = [];

    // specks of plankton drifting through the open water
    motes = [];
    var specks = Math.round(cols * rows / 130);
    for (var m = 0; m < specks; m++) {
      motes.push({
        x: rand(0, cols),
        y: rand(1, rows - 2),
        drift: rand(-0.25, 0.25),
        phase: rand(0, Math.PI * 2),
        ch: Math.random() < 0.7 ? '.' : "'"
      });
    }
  }

  // ---- drawing --------------------------------------------------------------
  function draw() {
    var grid = [], r, c;
    for (r = 0; r < rows; r++) grid.push(new Array(cols).fill(' '));

    function put(x, y, ch) {
      if (ch === ' ') return;
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || x >= cols || y < 0 || y >= rows) return;
      grid[y][x] = ch === '\u0000' ? ' ' : ch;
    }

    // `solid` clears the span each row covers before drawing it, so a creature
    // passing kelp hides what is behind it instead of tangling with it.
    function blit(art, x, y, shift, solid) {
      for (var i = 0; i < art.length; i++) {
        var line = art[i];
        var dx = shift ? shift(i) : 0;
        if (solid) {
          var from = line.search(/\S/);
          if (from >= 0) {
            for (var k = from; k <= line.replace(/\s+$/, '').length - 1; k++) {
              put(x + k + dx, y + i, '\u0000');
            }
          }
        }
        for (var j = 0; j < line.length; j++) put(x + j + dx, y + i, line.charAt(j));
      }
    }

    for (c = 0; c < cols; c++) put(c, rows - 1, sand.charAt(c));
    props.forEach(function (p) { blit(p.art, p.x, rows - 1 - p.art.length); });

    plants.forEach(function (weed) {
      for (var i = 0; i < weed.h; i++) {
        var tip = (i + 1) / weed.h;
        var lean = Math.sin(t * weed.sway + weed.phase) * 1.4 * tip * tip;
        put(weed.x + lean, rows - 2 - i, Math.sin(t * weed.sway + weed.phase + i) > 0 ? ')' : '(');
      }
    });

    motes.forEach(function (m) {
      put(m.x, m.y + Math.sin(t * 0.5 + m.phase) * 1.2, m.ch);
    });

    bubbles.forEach(function (b) {
      put(b.x + Math.sin(t * 2.4 + b.phase) * 0.9, b.y, b.ch);
    });

    life.forEach(function (f) {
      if (f) blit(f.art, f.x, f.y, null, true);
    });

    var shift = Math.floor(t * 1.6);
    for (c = 0; c < cols; c++) {
      grid[0][c] = SURFACE.charAt(((c + shift) % SURFACE.length + SURFACE.length) % SURFACE.length);
      var ripple = Math.sin((c + shift * 0.6) * 0.42) + 0.6 * Math.sin((c - shift) * 0.17);
      if (ripple > 1.25 && grid[1][c] === ' ') grid[1][c] = '-';
      else if (ripple > 0.95 && grid[1][c] === ' ') grid[1][c] = '.';
    }

    pre.textContent = grid.map(function (row) { return row.join(''); }).join('\n');
  }

  // ---- how each kind moves ---------------------------------------------------
  function steer(f, dt) {
    // Nothing stays forever: once its time is up a creature makes for the
    // nearest edge and leaves, which keeps the cast turning over.
    f.age += dt;
    if (!f.leaving && f.age > f.span) {
      f.leaving = true;
      f.dir = (f.x + f.w / 2 < cols / 2) ? -1 : 1;
      f.speed = Math.max(f.speed * 1.4, 0.7);   // no dawdling on the way out
    }

    if (f.species.frames.length > 1) {           // pulse, flap, scuttle
      f.celIn -= dt;
      if (f.celIn <= 0) {
        f.cel = (f.cel + 1) % f.species.frames.length;
        f.celIn = f.kind === 'walk' ? rand(0.25, 0.4) : rand(0.6, 1.1);
      }
    }

    if (f.kind === 'walk') {
      f.y = bed(f.h) + 1;
      f.vx += (f.dir * f.speed - f.vx) * Math.min(1, dt * 1.2);
      if (!f.leaving && ((f.dir > 0 && f.x > cols - f.w - 1) || (f.dir < 0 && f.x < 1))) {
        f.dir = -f.dir;
      }
    } else {
      // a slow wander up and down, nudged away from the surface and the sand
      var want = f.rise * Math.sin(t * f.rate * 6 + f.phase);
      if (f.kind === 'drift') want = f.rise * Math.sin(t * 0.22 + f.phase);
      if (f.y < ceiling() + 1.5) want = Math.abs(f.rise);
      if (f.y > bed(f.h) - 1.5) want = -Math.abs(f.rise);
      f.vy += (want - f.vy) * Math.min(1, dt * 1.4);

      // now and then it doubles back; easing vx through zero turns it over
      f.turnIn -= dt;
      if (f.turnIn <= 0 && !f.leaving) {
        f.dir = -f.dir;
        f.turnIn = rand(12, 34);
      }
      f.vx += (f.dir * f.speed - f.vx) * Math.min(1, dt * (f.kind === 'swim' ? 0.6 : 0.3));
      f.y += f.vy * dt;
    }

    f.x += f.vx * dt;
    if (f.vx * f.dir > 0) {                      // settled into its heading
      f.art = (f.dir > 0 ? f.species.frames : f.species.left)[f.cel];
    } else {
      f.art = (f.vx > 0 ? f.species.frames : f.species.left)[f.cel];
    }
  }

  // Nobody swims through anybody: push an overlapping pair apart along
  // whichever axis they are least buried in, and let the shove bleed into
  // their heading so they peel away instead of grinding together.
  function separate(dt) {
    for (var pass = 0; pass < 4; pass++) {
      var settled = true;
      for (var i = 0; i < life.length; i++) {
        var a = life[i];
        if (!a) continue;
        for (var j = i + 1; j < life.length; j++) {
          var b = life[j];
          if (!b || !clash(a, b)) continue;
          settled = false;

          var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + GAP_X;
          var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + GAP_Y;
          var up = (a.y + a.h / 2 <= b.y + b.h / 2) || (a.y === b.y && i < j) ? -1 : 1;

          if (oy <= ox) {
            var shove = Math.min(oy, 1.2) / 2;
            var before = a.y + b.y;
            a.y += up * shove;
            b.y -= up * shove;
            clamp(a);
            clamp(b);
            if (Math.abs(a.y + b.y - before) > 0.01) {
              if (pass === 0) {
                a.vy += up * 1.6 * dt * 6;
                b.vy -= up * 1.6 * dt * 6;
              }
              continue;
            }
            // pinned against the surface or the sand — give way sideways
          }

          var left = (a.x + a.w / 2 <= b.x + b.w / 2) ? -1 : 1;
          var slide = Math.min(ox, 1.0) / 2;
          a.x += left * slide;
          b.x -= left * slide;
        }
      }
      if (settled) break;
    }
  }

  // Coral and anemones are solid: swimmers rise over them rather than through.
  function avoidScenery(f, dt) {
    if (f.kind === 'walk') return;               // the crab works around them
    props.forEach(function (p) {
      var box = { x: p.x, y: rows - 1 - p.art.length, w: width(p.art), h: p.art.length };
      if (!clash(f, box)) return;
      var over = Math.min(f.y + f.h, box.y + box.h) - Math.max(f.y, box.y) + GAP_Y;
      f.y -= Math.min(over, 1.2);
      f.vy -= 1.2 * dt * 6;
      clamp(f);
    });
  }

  function clamp(f) {
    if (f.kind === 'walk') { f.y = bed(f.h) + 1; return; }
    f.y = Math.max(ceiling(), Math.min(bed(f.h), f.y));
  }

  function step(dt) {
    t += dt;

    life.forEach(function (f, i) {
      if (!f) {
        waiting[i] -= dt;
        if (waiting[i] <= 0) {
          life[i] = spawn(false);
          waiting[i] = life[i] ? 0 : rand(1.5, 3);
        }
        return;
      }

      steer(f, dt);
      avoidScenery(f, dt);

      if (f.x > cols + 2 || f.x + f.w < -2) {   // left the frame
        life[i] = null;
        waiting[i] = rand(2, 7);
        return;
      }

      f.nextBubble -= dt;
      if (f.nextBubble <= 0) {
        f.nextBubble = rand(5, 14);
        blow(f.vx > 0 ? f.x + f.w - 1 : f.x + 1, f.y + Math.floor(f.h / 2));
      }
    });

    separate(dt);

    motes.forEach(function (m) {
      m.x += m.drift * dt;
      if (m.x < 0) m.x += cols;
      if (m.x > cols) m.x -= cols;
    });

    bubbles = bubbles.filter(function (b) {
      b.y -= b.rise * dt;
      return b.y > 0.5;
    });
  }

  function blow(x, y) {
    if (bubbles.length > 24) return;
    bubbles.push({
      x: x, y: y,
      rise: rand(2.2, 3.6),
      phase: rand(0, Math.PI * 2),
      ch: pick(BUBBLES)
    });
  }

  function frame(now) {
    if (!running) return;
    acc += Math.min(now - last, 250);
    last = now;
    var interval = 1000 / FPS;
    while (acc >= interval) {
      step(interval / 1000);
      acc -= interval;
    }
    draw();
    requestAnimationFrame(frame);
  }

  function play() {
    if (running || !onScreen || document.hidden) return;
    running = true;
    last = performance.now();
    acc = 0;
    requestAnimationFrame(frame);
  }

  function pause() { running = false; }

  // ---- wiring ---------------------------------------------------------------
  measure();
  stock();
  draw();

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        onScreen ? play() : pause();
      }, { threshold: 0 }).observe(pre);
    } else {
      onScreen = true;
      play();
    }

    document.addEventListener('visibilitychange', function () {
      document.hidden ? pause() : play();
    });

    // A tap or click lets a few bubbles up from the sand
    pre.addEventListener('pointerdown', function (e) {
      var box = pre.getBoundingClientRect();
      var x = charW ? (e.clientX - box.left) / charW : cols / 2;
      for (var i = 0; i < 3; i++) blow(x + rand(-1, 1), rows - 2);
    });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var before = cols + 'x' + rows;
      measure();
      if (before === cols + 'x' + rows) return;
      stock();
      draw();
    }, 180);
  });
})();
