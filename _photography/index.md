---
title: Photography
permalink: /photography/
layout: beyond
vibe: photography
---

# Photography

A few frames from my wanderings — mostly cities in Korea and Japan. Drop by again, this gallery grows.

<p><a class="ig-link" href="https://www.instagram.com/oneicedmatchalatteplease/">Instagram — @oneicedmatchalatteplease</a></p>

{% assign photos = site.static_files | where_exp: "f", "f.path contains '/assets/photos/'" %}
<div class="photo-grid">
{% for photo in photos %}{% if photo.extname == '.jpg' or photo.extname == '.jpeg' or photo.extname == '.png' or photo.extname == '.webp' %}  <figure>
    <a href="{{ photo.path | relative_url }}" target="_blank"><img src="{{ photo.path | relative_url }}" alt="{{ photo.basename | replace: '-', ' ' }}" loading="lazy"></a>
    <figcaption>{{ photo.basename | replace: "-", " " }}</figcaption>
  </figure>
{% endif %}{% endfor %}
</div>

{% assign entries = site.photography | where_exp: "doc", "doc.url != page.url" | reverse %}
{% if entries.size > 0 %}
<h2>Series</h2>
<ul class="entry-list">
{% for e in entries %}  <li><a href="{{ e.url | relative_url }}">{{ e.title }}</a><span class="leader"></span>{% if e.date %}<span class="entry-date">{{ e.date | date: "%b %Y" }}</span>{% endif %}</li>
{% endfor %}</ul>
{% endif %}

> Photography is the story I fail to put into words -- Destin Sparks

[← Beyond](/beyond/) · [Home](/)
