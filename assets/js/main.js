// Light/dark theme toggle
(function () {
  var button = document.getElementById('theme-toggle');
  if (!button) return;

  button.addEventListener('click', function () {
    var dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });

  // Follow system changes unless the user has picked a theme explicitly
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem('theme')) {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
})();

// Reading progress bar (blog pages only)
(function () {
  if (!document.body.classList.contains('reading')) return;
  var bar = document.createElement('div');
  bar.id = 'reading-progress';
  document.body.appendChild(bar);
  function update() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    bar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// Typewriter effect cycling through greetings
(function () {
  var el = document.getElementById('typewriter');
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var greetings = ['Hello', '안녕하세요', 'السلام علیکم'];
  var gi = 0;
  var ci = 0;
  var deleting = false;

  el.classList.add('typing');
  el.textContent = '';

  function tick() {
    var word = Array.from(greetings[gi]);
    ci += deleting ? -1 : 1;
    el.textContent = word.slice(0, ci).join('');

    if (!deleting && ci === word.length) {
      deleting = true;
      setTimeout(tick, 2200);
    } else if (deleting && ci === 0) {
      deleting = false;
      gi = (gi + 1) % greetings.length;
      setTimeout(tick, 500);
    } else {
      setTimeout(tick, deleting ? 60 : 110);
    }
  }

  setTimeout(tick, 600);
})();

// Reveal content as it scrolls into view
(function () {
  var items = document.querySelectorAll('section > h2, section > p, section > ul, section > ol, section > blockquote, section > h6');
  if (!('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  items.forEach(function (el) {
    el.classList.add('reveal');
    observer.observe(el);
  });
})();
