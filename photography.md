---
title: Photography
permalink: /photography/
layout: beyond
vibe: photography
---

# Photography

A few frames from my wanderings — mostly cities in Korea and Japan. Drop by again, this gallery grows.

{% assign photos = site.static_files | where_exp: "f", "f.path contains '/assets/photos/'" %}
<div class="photo-grid">
{% for photo in photos %}{% if photo.extname == '.jpg' or photo.extname == '.jpeg' or photo.extname == '.png' or photo.extname == '.webp' %}  <a href="{{ photo.path | relative_url }}" target="_blank"><img src="{{ photo.path | relative_url }}" alt="Photograph" loading="lazy"></a>
{% endif %}{% endfor %}
</div>

> Photography is the story I fail to put into words -- Destin Sparks

[← Beyond Research](/beyond/) · [Home](/)
