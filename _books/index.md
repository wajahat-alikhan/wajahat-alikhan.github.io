---
title: Books & Philosophy
permalink: /books/
layout: beyond
vibe: books
---

# Books & Philosophy

You may have noticed the quotes scattered across this site. Socrates started it.

Some books that stayed with me long after the last page — the linked ones have a note attached:

{% assign entries = site.books | where_exp: "doc", "doc.url != page.url" | reverse %}
<ul class="entry-list">
  <li><em>Meditations</em> — Marcus Aurelius</li>
  <li><em>Man's Search for Meaning</em> — Viktor Frankl</li>
{% for e in entries %}  <li><a href="{{ e.url | relative_url }}">{{ e.title }}</a><span class="leader"></span>{% if e.date %}<span class="entry-date">{{ e.date | date: "%b %Y" }}</span>{% endif %}</li>
{% endfor %}</ul>

> A reader lives a thousand lives before he dies. The man who never reads lives only one -- George R. R. Martin

[← Beyond](/beyond/) · [Home](/)
