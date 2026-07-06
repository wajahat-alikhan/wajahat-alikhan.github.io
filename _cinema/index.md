---
title: Cinema
permalink: /cinema/
layout: beyond
vibe: anime
---

# Cinema

Stories I keep coming back to — animated or otherwise. Always happy to trade recommendations; you know where to find me.

<p class="now-showing">Now watching — Steins;Gate</p>

## Anime

* Death Note
* Hunter × Hunter
* One Piece

## Films

* Fight Club
* Se7en
* Interstellar
* Parasite

## Series

* Dark
* Prison Break

{% assign entries = site.cinema | where_exp: "doc", "doc.url != page.url" | reverse %}
{% if entries.size > 0 %}
## Screening Log
<ul class="entry-list">
{% for e in entries %}  <li><a href="{{ e.url | relative_url }}">{{ e.title }}</a><span class="leader"></span>{% if e.date %}<span class="entry-date">{{ e.date | date: "%b %Y" }}</span>{% endif %}</li>
{% endfor %}</ul>
{% endif %}

> The movies are like a machine that generates empathy -- Roger Ebert

[← Beyond](/beyond/) · [Home](/)
