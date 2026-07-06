---
title: Art
permalink: /art/
layout: beyond
vibe: art
---

# Art

Galleries visited, exhibitions loved, and the occasional attempt of my own. Here are some paintings I never get tired of:

<figure class="painting">
  <img src="/assets/art/great-wave.jpg" alt="The Great Wave off Kanagawa by Hokusai" loading="lazy">
  <figcaption><strong>The Great Wave off Kanagawa</strong> — Katsushika Hokusai, c. 1831<br>
  A woodblock print from <em>Thirty-six Views of Mount Fuji</em>, made when Hokusai was around seventy. Its deep blue came from Prussian blue pigment, newly imported into Japan, and the image went on to become one of the most reproduced artworks in history — look closely and Mount Fuji is the small peak under the wave.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/starry-night.jpg" alt="The Starry Night by Vincent van Gogh" loading="lazy">
  <figcaption><strong>The Starry Night</strong> — Vincent van Gogh, 1889<br>
  Painted in June 1889 from the window of his room at the asylum in Saint-Rémy-de-Provence; the village below is partly imagined. Van Gogh himself wasn't convinced by it — today it anchors the collection at MoMA in New York.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/wanderer.jpg" alt="Wanderer above the Sea of Fog by Caspar David Friedrich" loading="lazy">
  <figcaption><strong>Wanderer above the Sea of Fog</strong> — Caspar David Friedrich, c. 1818<br>
  The icon of German Romanticism. Friedrich turns his subject away from us — the <em>Rückenfigur</em> — so we stand inside the painting, contemplating the sublime with him. A painting philosophy students never stop putting on book covers. It hangs in the Hamburger Kunsthalle.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/pearl-earring.jpg" alt="Girl with a Pearl Earring by Johannes Vermeer" loading="lazy">
  <figcaption><strong>Girl with a Pearl Earring</strong> — Johannes Vermeer, c. 1665<br>
  Not a portrait but a <em>tronie</em> — a study of a face in costume. Almost nothing is known about the sitter, which is half the magic. Often called the Mona Lisa of the North; it lives at the Mauritshuis in The Hague.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/scream.jpg" alt="The Scream by Edvard Munch" loading="lazy">
  <figcaption><strong>The Scream</strong> — Edvard Munch, 1893<br>
  Munch described walking at sunset when "the sky turned blood red" and he sensed "an infinite scream passing through nature." He made several versions in paint and pastel; this one hangs in the National Museum in Oslo.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/mona-lisa.jpg" alt="Mona Lisa by Leonardo da Vinci" loading="lazy">
  <figcaption><strong>Mona Lisa</strong> — Leonardo da Vinci, c. 1503–1506<br>
  Likely Lisa Gherardini, wife of a Florentine merchant, painted with Leonardo's smoke-soft <em>sfumato</em>. It was admired but not world-famous until 1911, when a museum worker stole it from the Louvre — the theft made it the most recognized painting on Earth.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/the-kiss.jpg" alt="The Kiss by Gustav Klimt" loading="lazy">
  <figcaption><strong>The Kiss</strong> — Gustav Klimt, 1907–1908<br>
  The peak of Klimt's Golden Phase, with real gold leaf worked into the robes. The Austrian state bought it before it was even finished; it has never left Vienna's Belvedere since.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/birth-of-venus.jpg" alt="The Birth of Venus by Sandro Botticelli" loading="lazy">
  <figcaption><strong>The Birth of Venus</strong> — Sandro Botticelli, c. 1485<br>
  Painted for the Medici family — unusually on canvas rather than wood panel — reviving the classical nude a millennium after antiquity. At the Uffizi in Florence.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/night-watch.jpg" alt="The Night Watch by Rembrandt" loading="lazy">
  <figcaption><strong>The Night Watch</strong> — Rembrandt van Rijn, 1642<br>
  A group portrait of an Amsterdam militia company that Rembrandt turned into a scene of motion and drama. It is actually a daytime scene — centuries of darkened varnish earned it the wrong name. At the Rijksmuseum.</figcaption>
</figure>

<figure class="painting">
  <img src="/assets/art/impression-sunrise.jpg" alt="Impression, Sunrise by Claude Monet" loading="lazy">
  <figcaption><strong>Impression, Sunrise</strong> — Claude Monet, 1872<br>
  The harbor of Le Havre at dawn. A critic mocked the title — "Impression!" — and accidentally named the entire Impressionist movement. At the Musée Marmottan Monet in Paris.</figcaption>
</figure>

{% assign entries = site.art | where_exp: "doc", "doc.url != page.url" | reverse %}
{% if entries.size > 0 %}
<h2>Pieces & Visits</h2>
<ul class="entry-list">
{% for e in entries %}  <li><a href="{{ e.url | relative_url }}">{{ e.title }}</a>{% if e.date %}<span class="entry-date">{{ e.date | date: "%b %Y" }}</span>{% endif %}</li>
{% endfor %}</ul>
{% endif %}

> Art enables us to find ourselves and lose ourselves at the same time -- Thomas Merton

[← Beyond](/beyond/) · [Home](/)
