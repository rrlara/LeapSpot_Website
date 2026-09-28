(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const trips = {
    sea: {
      title: "Southeast Asia",
      description: "A new year. A different corner of the world.",
      number: "01",
      cover: "Angkor Wat center",
    },
    mexico: {
      title: "Mexico",
      description: "Home for the holidays. Adventure in between.",
      number: "02",
      cover: "pyramid",
    },
  };
  const cache = {},
    params = new URLSearchParams(location.search);
  let region = params.get("r") === "mexico" ? "mexico" : "sea";
  let points = [],
    selected = null,
    loadVersion = 0,
    imageReturnFocus;
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const dayLabel = (timestamp) => {
    const date = new Date(timestamp.slice(0, 10) + "T12:00:00");
    return isNaN(date)
      ? "Date unknown"
      : date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };
  function setImage(image, point) {
    const candidates = getImageCandidates({ properties: point.properties });
    let index = 0;
    image.hidden = false;
    image.onerror = () => {
      if (++index < candidates.length) image.src = candidates[index];
      else {
        image.hidden = true;
        image.onerror = null;
      }
    };
    if (candidates.length) image.src = candidates[0];
    else image.hidden = true;
  }
  function updateUrl() {
    const url = new URL(location.href),
      center = TravelMap.map.getCenter();
    url.searchParams.set("r", region);
    url.searchParams.set("b", TravelMap.basemap);
    url.searchParams.set("lat", center.lat.toFixed(5));
    url.searchParams.set("lng", center.lng.toFixed(5));
    url.searchParams.set("z", TravelMap.map.getZoom());
    if (selected) url.searchParams.set("m", selected);
    else url.searchParams.delete("m");
    history.replaceState({}, "", url);
  }
  function mobileView(journal) {
    document.body.classList.toggle("journal-open", journal);
    $("view-map").classList.toggle("active", !journal);
    $("view-map").setAttribute("aria-pressed", !journal);
    $("view-journal").classList.toggle("active", journal);
    $("view-journal").setAttribute("aria-pressed", journal);
    TravelMap.map.invalidateSize();
  }
  function renderTimeline() {
    const query = $("search").value.trim().toLowerCase();
    const filtered = points.filter((p) =>
      (p.comment + " " + dayLabel(p.timestamp)).toLowerCase().includes(query),
    );
    $("timeline-count").textContent = query
      ? filtered.length + " matches"
      : points.length + " memories";
    let lastDay = "";
    $("timeline-list").innerHTML =
      filtered
        .map((point) => {
          const day = dayLabel(point.timestamp),
            heading =
              day !== lastDay
                ? '<div class="day-heading">' +
                  escape(day.toUpperCase()) +
                  "</div>"
                : "";
          lastDay = day;
          return (
            heading +
            '<button class="timeline-item' +
            (point.id === selected ? " active" : "") +
            '" data-id="' +
            point.id +
            '" aria-current="' +
            (point.id === selected) +
            '"><span class="timeline-dot">' +
            (point.index + 1) +
            '</span><span class="timeline-body"><span class="timeline-comment">' +
            escape(point.comment || "A moment along the way") +
            '</span><span class="timeline-time">' +
            escape(point.timestamp.slice(11, 16)) +
            " · Moment " +
            String(point.index + 1).padStart(2, "0") +
            '</span></span><img class="timeline-thumb" loading="lazy" alt=""></button>'
          );
        })
        .join("") ||
      '<p class="empty-state">No memories found. Try a different word or date.</p>';
    $("timeline-list")
      .querySelectorAll(".timeline-item")
      .forEach((button) => {
        const point = points.find((p) => p.id === button.dataset.id);
        setImage(button.querySelector("img"), point);
        button.onclick = () => selectPoint(point.id);
      });
  }
  function selectPoint(id, move = true) {
    const point = points.find((p) => p.id === id);
    if (!point) return;
    selected = id;
    $("moment-card").hidden = false;
    $("moment-date").textContent = dayLabel(point.timestamp);
    $("moment-comment").textContent = point.comment || "A moment along the way";
    $("moment-position").textContent =
      String(point.index + 1).padStart(2, "0") +
      " / " +
      points.length +
      " memories";
    $("moment-prev").disabled = point.index === 0;
    $("moment-next").disabled = point.index === points.length - 1;
    $("moment-image").alt = point.comment || "Travel photograph";
    setImage($("moment-image"), point);
    $("timeline-list")
      .querySelectorAll(".timeline-item")
      .forEach((button) => {
        const active = button.dataset.id === id;
        button.classList.toggle("active", active);
        button.setAttribute("aria-current", active);
      });
    const active = $("timeline-list").querySelector(".active");
    if (active) active.scrollIntoView({ block: "nearest" });
    mobileView(false);
    TravelMap.focus(id, move);
    updateUrl();
  }
  function closeMoment() {
    selected = null;
    $("moment-card").hidden = true;
    TravelMap.focus(null, false);
    $("timeline-list")
      .querySelectorAll(".active")
      .forEach((el) => {
        el.classList.remove("active");
        el.setAttribute("aria-current", "false");
      });
    updateUrl();
  }
  async function loadTrip(nextRegion, initial = false) {
    const version = ++loadVersion;
    region = nextRegion;
    selected = null;
    points = [];
    TravelMap.clear();
    $("moment-card").hidden = true;
    $("search").value = "";
    $("status").hidden = true;
    $("timeline-list").innerHTML =
      '<p class="empty-state">Unfolding the map…</p>';
    $("timeline-count").textContent = "Loading…";
    $("stat-stops").textContent = "—";
    $("stat-days").textContent = "—";
    $("fit-trip").disabled = true;
    $("map-fit").disabled = true;
    const trip = trips[region];
    $("trip-title").textContent = trip.title;
    $("map-region").textContent = trip.title;
    $("trip-description").textContent = trip.description;
    $("trip-number").textContent = trip.number;
    $("trip-dates").textContent = "LOADING JOURNEY";
    $("cover-image").hidden = true;
    document.querySelectorAll("[data-region]").forEach((button) => {
      const active = button.dataset.region === region;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active);
    });
    try {
      if (!cache[nextRegion]) {
        const response = await fetch("data/" + nextRegion + ".json");
        if (!response.ok) throw new Error("Trip unavailable");
        const data = await response.json();
        cache[nextRegion] = data.features
          .map((feature, index) => ({
            id: nextRegion + "-" + index,
            properties: feature.properties,
            comment: feature.properties.comment || "",
            timestamp: feature.properties.timestamp || "",
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
          }))
          .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
          .map((point, index) => ({ ...point, index }));
      }
      if (version !== loadVersion) return;
      points = cache[region];
      if (!points.length) throw new Error("No moments");
      const first = points[0],
        last = points[points.length - 1];
      $("trip-dates").textContent = (
        dayLabel(first.timestamp) +
        " — " +
        dayLabel(last.timestamp)
      ).toUpperCase();
      $("stat-stops").textContent = points.length;
      $("stat-days").textContent =
        Math.round(
          (Date.parse(last.timestamp.slice(0, 10)) -
            Date.parse(first.timestamp.slice(0, 10))) /
            86400000,
        ) + 1;
      const cover =
        points.find((p) =>
          p.comment.toLowerCase().includes(trip.cover.toLowerCase()),
        ) || points[Math.floor(points.length / 2)];
      setImage($("cover-image"), cover);
      TravelMap.show(points, selectPoint);
      renderTimeline();
      $("fit-trip").disabled = false;
      $("map-fit").disabled = false;
      if (initial) {
        const lat = Number(params.get("lat")),
          lng = Number(params.get("lng")),
          zoom = Number(params.get("z"));
        if (
          params.has("lat") &&
          params.has("lng") &&
          params.has("z") &&
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -85 &&
          lat <= 85 &&
          lng >= -180 &&
          lng <= 180 &&
          zoom >= 1 &&
          zoom <= 19
        )
          TravelMap.map.setView([lat, lng], zoom);
        if (params.get("m")) selectPoint(params.get("m"));
      }
      updateUrl();
    } catch (error) {
      if (version !== loadVersion) return;
      $("timeline-count").textContent = "Unavailable";
      $("timeline-list").innerHTML =
        '<p class="empty-state">This journey couldn’t load. Check your connection and try again.</p>';
      $("status").hidden = false;
      $("status").innerHTML =
        'Couldn’t load this journey. <button id="retry">Try again</button>';
      $("retry").onclick = () => loadTrip(region);
    }
  }
  document
    .querySelectorAll("[data-region]")
    .forEach(
      (button) => (button.onclick = () => loadTrip(button.dataset.region)),
    );
  document.querySelectorAll("button[data-basemap]").forEach(
    (button) =>
      (button.onclick = () => {
        setBasemap(button.dataset.basemap);
        updateUrl();
      }),
  );
  function setBasemap(key) {
    if (TravelMap.changeBasemap(key))
      document.querySelectorAll("button[data-basemap]").forEach((button) => {
        const active = button.dataset.basemap === key;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active);
      });
  }
  $("search").oninput = renderTimeline;
  $("fit-trip").onclick = $("map-fit").onclick = () => {
    closeMoment();
    mobileView(false);
    TravelMap.fit();
  };
  $("zoom-in").onclick = () => TravelMap.map.zoomIn();
  $("zoom-out").onclick = () => TravelMap.map.zoomOut();
  $("view-map").onclick = () => mobileView(false);
  $("view-journal").onclick = () => mobileView(true);
  $("moment-close").onclick = closeMoment;
  function step(direction) {
    const index = points.findIndex((p) => p.id === selected);
    if (points[index + direction]) selectPoint(points[index + direction].id);
  }
  $("moment-prev").onclick = () => step(-1);
  $("moment-next").onclick = () => step(1);
  $("moment-photo").onclick = () => {
    if ($("moment-image").hidden) return;
    imageReturnFocus = document.activeElement;
    $("full-photo").src = $("moment-image").currentSrc;
    $("full-photo").alt = $("moment-comment").textContent;
    $("photo-caption").textContent = $("moment-comment").textContent;
    $("photo-viewer").showModal();
    $("photo-close").focus();
  };
  $("photo-close").onclick = () => $("photo-viewer").close();
  $("photo-viewer").addEventListener("click", (event) => {
    if (event.target === $("photo-viewer")) $("photo-viewer").close();
  });
  $("photo-viewer").addEventListener("close", () => {
    if (imageReturnFocus) imageReturnFocus.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) &&
      !$("photo-viewer").open
    ) {
      event.preventDefault();
      mobileView(true);
      $("search").focus();
    }
    if (event.key === "Escape" && !$("photo-viewer").open) closeMoment();
  });
  TravelMap.map.on("moveend", () => {
    if (points.length) updateUrl();
  });
  new ResizeObserver(() => TravelMap.map.invalidateSize()).observe($("map"));
  if (params.get("b")) setBasemap(params.get("b"));
  loadTrip(region, true);
})();
