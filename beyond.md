---
title: Beyond
permalink: /beyond/
layout: beyond
---

# Beyond

The lab is only half the story — this is the other half. Photographs, books, films, and paintings I keep returning to. A page that grows as I do.

## Photography

A few frames from my wanderings — mostly cities in Korea and Japan.

<p><a class="ig-link" href="https://www.instagram.com/oneicedmatchalatteplease/">@oneicedmatchalatteplease</a></p>

{% assign photos = site.static_files | where_exp: "f", "f.path contains '/assets/photos/'" %}
<div class="memory-board">
{% for photo in photos %}{% if photo.extname == '.jpg' or photo.extname == '.jpeg' or photo.extname == '.png' or photo.extname == '.webp' %}  <figure>
    <a href="{{ photo.path | relative_url }}" target="_blank"><img src="{{ photo.path | relative_url }}" alt="{{ photo.basename | replace: '-', ' ' }}" loading="lazy"></a>
    <figcaption>{{ photo.basename | replace: "-", " " }}</figcaption>
  </figure>
{% endif %}{% endfor %}
</div>

## Reading

Books that stayed with me long after the last page.

- *Meditations* — Marcus Aurelius
- *Man's Search for Meaning* — Viktor Frankl
- *The Stranger* — Albert Camus <span class="note">short, strange, and it lingers</span>

## Watching

Stories I keep coming back to — animated or otherwise.

<p class="now-showing">Now watching — Steins;Gate</p>

<p class="line"><span class="line-label">Anime</span> Death Note · Hunter × Hunter · One Piece</p>
<p class="line"><span class="line-label">Films</span> Fight Club · Se7en · Interstellar · Parasite</p>
<p class="line"><span class="line-label">Series</span> Dark · Prison Break</p>

## Art

Paintings I never get tired of.

<div class="photo-grid art-grid">
  <figure><img src="/assets/art/great-wave.jpg" alt="The Great Wave off Kanagawa by Hokusai" loading="lazy"><figcaption><strong>The Great Wave off Kanagawa</strong>Hokusai</figcaption></figure>
  <figure><img src="/assets/art/starry-night.jpg" alt="The Starry Night by Van Gogh" loading="lazy"><figcaption><strong>The Starry Night</strong>Van Gogh</figcaption></figure>
  <figure><img src="/assets/art/wanderer.jpg" alt="Wanderer above the Sea of Fog by Friedrich" loading="lazy"><figcaption><strong>Wanderer above the Sea of Fog</strong>Friedrich</figcaption></figure>
  <figure><img src="/assets/art/pearl-earring.jpg" alt="Girl with a Pearl Earring by Vermeer" loading="lazy"><figcaption><strong>Girl with a Pearl Earring</strong>Vermeer</figcaption></figure>
  <figure><img src="/assets/art/scream.jpg" alt="The Scream by Munch" loading="lazy"><figcaption><strong>The Scream</strong>Munch</figcaption></figure>
  <figure><img src="/assets/art/the-kiss.jpg" alt="The Kiss by Klimt" loading="lazy"><figcaption><strong>The Kiss</strong>Klimt</figcaption></figure>
</div>

> We suffer more often in imagination than in reality — Seneca

[← Back home](/)
