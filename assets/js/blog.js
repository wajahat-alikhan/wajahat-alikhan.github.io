// Gwern-style extras for essay pages: an auto-built table of contents
// and footnotes moved into the right margin as sidenotes when it fits.

// Table of contents — built from headings, floated left so text wraps it
(function () {
  var body = document.getElementById('markdownBody');
  if (!body) return;

  var headings = body.querySelectorAll('h1, h2, h3');
  if (headings.length < 2) return;

  // Ensure every heading has an id to link to
  headings.forEach(function (h) {
    if (!h.id) {
      h.id = h.textContent.trim().toLowerCase()
        .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    }
  });

  var toc = document.createElement('div');
  toc.id = 'TOC';
  var title = document.createElement('div');
  title.className = 'toc-title';
  title.textContent = 'Contents';
  toc.appendChild(title);

  var rootList = document.createElement('ul');
  toc.appendChild(rootList);
  var stack = [{ level: null, list: rootList, lastItem: null }];

  headings.forEach(function (h) {
    var level = parseInt(h.tagName.charAt(1), 10);
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    var parent = stack[stack.length - 1];
    if (parent.level !== null && level > parent.level && parent.lastItem) {
      // Reuse an existing sub-list so numbering continues (1.1, 1.2, …)
      var last = parent.lastItem.lastElementChild;
      var sub = last && last.tagName === 'UL' ? last : document.createElement('ul');
      if (!sub.parentNode) parent.lastItem.appendChild(sub);
      parent = { level: level, list: sub, lastItem: sub.lastElementChild };
      stack.push(parent);
    }
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    parent.list.appendChild(li);
    if (parent.level === null) parent.level = level;
    parent.lastItem = li;
  });

  body.insertBefore(toc, body.firstChild);
})();

// Sidenotes — on wide screens, footnotes appear in the margin beside
// their reference instead of at the bottom of the page
(function () {
  var content = document.getElementById('markdownBody');
  if (!content) return;
  var refs = content.querySelectorAll('sup[id^="fnref"]');
  if (!refs.length) return;

  var mq = window.matchMedia('(min-width: 1380px)');

  function layout() {
    content.querySelectorAll('.sidenote').forEach(function (n) { n.remove(); });
    document.body.classList.toggle('sidenotes-active', mq.matches);
    if (!mq.matches) return;

    var contentTop = content.getBoundingClientRect().top;
    var lastBottom = -Infinity;

    refs.forEach(function (sup) {
      var id = sup.id.replace(/^fnref:?/, '');
      var fn = document.getElementById('fn:' + id) || document.getElementById('fn' + id);
      if (!fn) return;

      var note = document.createElement('div');
      note.className = 'sidenote';
      var num = document.createElement('span');
      num.className = 'sidenote-number';
      num.textContent = sup.textContent.trim() + '. ';
      note.appendChild(num);

      var copy = fn.cloneNode(true);
      copy.querySelectorAll('.reversefootnote, [role="doc-backlink"]').forEach(function (b) { b.remove(); });
      while (copy.firstChild) note.appendChild(copy.firstChild);

      content.appendChild(note);
      var top = sup.getBoundingClientRect().top - contentTop;
      if (top < lastBottom + 10) top = lastBottom + 10;
      note.style.top = top + 'px';
      lastBottom = top + note.offsetHeight;
    });
  }

  var timer;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(layout, 150);
  });
  window.addEventListener('load', layout);
  layout();
})();
