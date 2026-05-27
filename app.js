$(document).ready(function () {
  var isApplyingUrlState = false;
  var pendingSelectedMarker = null;
  var initialUrlState = readUrlState();
  var imageViewerOpenedAt = 0;
  var currentTimelinePoints = [];

  init();

  var $info = $("#infoback");
  var smallScreenQuery = window.matchMedia("(max-width: 900px)");
  openDrawer();

  $("#sidebar-close").on("click", function () {
    closeDrawer();
  });

  $("#sidebar-open").on("click", function () {
    openDrawer();
  });

  $("#districtLevel, #individualPlot").on("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      $(this).trigger("click");
    }
  });

  $("#map-panel .mapicons").on("click", function () {
    var basemapKey = this.id;
    _SPDEV.Map.changeBasemap(basemapKey);
    setBasemapButtonState(basemapKey);
  });

  $("#map-panel .mapicons").on("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      $(this).trigger("click");
    }
  });

  $("#search-comment").on("input", renderSearchResults);
  $("#timeline-prev").on("click", function () {
    focusRelativeTimelinePoint(-1);
  });
  $("#timeline-next").on("click", function () {
    focusRelativeTimelinePoint(1);
  });
  $("#fit-trip").on("click", fitCurrentTrip);
  bindPopupImageActivation();
  $(document).on("click touchend", ".popup-image-link", function (event) {
    event.preventDefault();
    event.stopPropagation();
    openImageViewer(getPopupImageUrl(this));
  });
  $("#image-viewer-close").on("click touchend", function (event) {
    event.preventDefault();
    closeImageViewer();
  });
  $("#image-viewer").on("click touchend", function (event) {
    if (event.target === this) {
      event.preventDefault();
      if (Date.now() - imageViewerOpenedAt < 600) {
        return;
      }
      closeImageViewer();
    }
  });
  $(document).on("keydown", function (event) {
    if (event.key === "Escape") {
      closeImageViewer();
    }
  });

  window.addEventListener("travel:regionloaded", function (event) {
    renderSearchResults();
    renderTimeline();
    tryApplyPendingSelected(event.detail && event.detail.region);
  });

  window.addEventListener("travel:markerfocus", function (event) {
    var region = event.detail && event.detail.region;
    if (region) {
      setRegionTab(region);
      renderTimeline(region);
    }
    setActiveTimelineItem(event.detail && event.detail.markerId);
    updateUrlState();
  });

  window.addEventListener("travel:statechange", function () {
    renderTimeline();
    if (!isApplyingUrlState) {
      updateUrlState();
    }
  });

  loadLeafMaps();

  if (_SPDEV.Map && _SPDEV.Map.map) {
    _SPDEV.Map.map.on("moveend zoomend", function () {
      if (!isApplyingUrlState) {
        updateUrlState();
      }
    });
  }

  applyInitialUrlState();

  function setBasemapButtonState(activeKey) {
    $("#map-panel .mapicons").removeClass("activeicon");
    $("#" + activeKey).addClass("activeicon");
  }

  function setRegionTab(region) {
    if (region === "sea") {
      $("#individualPlot").addClass("active1");
      $("#districtLevel").removeClass("active1");
    } else if (region === "mexico") {
      $("#districtLevel").addClass("active1");
      $("#individualPlot").removeClass("active1");
    }
  }

  function openDrawer() {
    $info.addClass("is-open").attr("aria-hidden", "false");
    $("#sidebar-open").prop("hidden", true);
    refreshMapSizeAfterDrawerChange();
  }

  function closeDrawer() {
    $info.removeClass("is-open").attr("aria-hidden", "true");
    $("#sidebar-open").prop("hidden", false);
    refreshMapSizeAfterDrawerChange();
  }

  function closeDrawerAfterSelection() {
    if (smallScreenQuery.matches) {
      closeDrawer();
    }
  }

  function refreshMapSizeAfterDrawerChange() {
    if (!_SPDEV.Map || !_SPDEV.Map.map || typeof _SPDEV.Map.map.invalidateSize !== "function") {
      return;
    }
    _SPDEV.Map.map.invalidateSize();
    window.setTimeout(function () {
      _SPDEV.Map.map.invalidateSize();
    }, 220);
  }

  function getSearchFilters() {
    return {
      query: $("#search-comment").val()
    };
  }

  function renderSearchResults() {
    if (!_SPDEV.Search) {
      return;
    }

    var matches = _SPDEV.Search.getFilteredPoints(getSearchFilters());
    $("#search-count").text(matches.length + " results");

    var html = matches.slice(0, 150).map(function (point) {
      var safeComment = escapeHtml(point.comment || "(No comment)");
      var safeTimestamp = escapeHtml(point.timestamp || "Unknown date");
      var regionLabel = point.region === "sea" ? "Southeast Asia" : "Mexico";
      return (
        '<div class="search-result-item" role="button" tabindex="0" data-marker-id="' + point.id + '">' +
          '<div class="search-result-title">' + safeComment + '</div>' +
          '<div class="search-result-meta">' + regionLabel + " - " + safeTimestamp + "</div>" +
        "</div>"
      );
    }).join("");

    $("#search-results").html(html || '<div class="search-result-meta">No matches</div>');
    $("#search-results .search-result-item").on("click", onResultSelect);
    $("#search-results .search-result-item").on("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        $(this).trigger("click");
      }
    });
  }

  function onResultSelect() {
    var markerId = $(this).data("markerId");
    if (_SPDEV.Search && markerId) {
      _SPDEV.Search.focusMarkerById(markerId);
      updateUrlState();
      closeDrawerAfterSelection();
    }
  }

  function readUrlState() {
    var params = new URLSearchParams(window.location.search);
    return {
      region: params.get("r"),
      basemap: params.get("b"),
      zoom: params.get("z"),
      lat: params.get("lat"),
      lng: params.get("lng"),
      selected: params.get("m")
    };
  }

  function applyInitialUrlState() {
    isApplyingUrlState = true;
    if (initialUrlState.basemap) {
      _SPDEV.Map.changeBasemap(initialUrlState.basemap);
      setBasemapButtonState(initialUrlState.basemap);
    }

    if (initialUrlState.region === "mexico") {
      $("#districtLevel").trigger("click");
    } else if (initialUrlState.region === "sea") {
      $("#individualPlot").trigger("click");
    }

    if (initialUrlState.lat && initialUrlState.lng && initialUrlState.zoom) {
      _SPDEV.Map.map.setView(
        [parseFloat(initialUrlState.lat), parseFloat(initialUrlState.lng)],
        parseInt(initialUrlState.zoom, 10)
      );
    }

    if (initialUrlState.selected) {
      pendingSelectedMarker = initialUrlState.selected;
      tryApplyPendingSelected(initialUrlState.region || null);
    }
    isApplyingUrlState = false;
    renderSearchResults();
    renderTimeline();
    updateUrlState();
  }

  function tryApplyPendingSelected(regionHint) {
    if (!pendingSelectedMarker || !_SPDEV.Search) {
      return;
    }
    if (regionHint) {
      setRegionTab(regionHint);
    }
    var didFocus = _SPDEV.Search.focusMarkerById(pendingSelectedMarker, { silent: true });
    if (didFocus) {
      pendingSelectedMarker = null;
      updateUrlState();
    }
  }

  function updateUrlState() {
    if (!_SPDEV.Search) {
      return;
    }

    var state = _SPDEV.Search.getShareableState();
    var params = new URLSearchParams(window.location.search);

    if (state.region) params.set("r", state.region);
    if (state.basemap) params.set("b", state.basemap);
    if (state.zoom !== null && state.zoom !== undefined) params.set("z", String(state.zoom));
    if (state.center && state.center.lat !== null) params.set("lat", state.center.lat.toFixed(5));
    if (state.center && state.center.lng !== null) params.set("lng", state.center.lng.toFixed(5));
    if (state.selected) params.set("m", state.selected);
    else params.delete("m");

    var nextUrl = window.location.pathname + "?" + params.toString();
    window.history.replaceState({}, "", nextUrl);
  }

  function getCurrentRegion() {
    return (_SPDEV.State && _SPDEV.State.currentRegion) || "sea";
  }

  function getTimelinePoints(region) {
    if (!_SPDEV.State || !_SPDEV.State.pointsByRegion) {
      return [];
    }

    var points = (_SPDEV.State.pointsByRegion[region] || []).slice();
    points.sort(function (pointA, pointB) {
      var dateA = pointA.dateValue === null ? Number.MAX_SAFE_INTEGER : pointA.dateValue;
      var dateB = pointB.dateValue === null ? Number.MAX_SAFE_INTEGER : pointB.dateValue;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      return String(pointA.timestamp || "").localeCompare(String(pointB.timestamp || ""));
    });
    return points;
  }

  function renderTimeline(regionOverride) {
    if (!_SPDEV.State) {
      return;
    }

    var region = regionOverride || getCurrentRegion();
    currentTimelinePoints = getTimelinePoints(region);
    var regionLabel = region === "sea" ? "Southeast Asia" : "Mexico";
    $("#timeline-count").text(currentTimelinePoints.length ? currentTimelinePoints.length + " stops in " + regionLabel : "No stops loaded yet");
    $("#timeline-prev, #timeline-next, #fit-trip").prop("disabled", currentTimelinePoints.length === 0);

    var html = currentTimelinePoints.map(function (point, index) {
      return buildTimelineItem(point, index);
    }).join("");
    $("#timeline-list").html(html || '<div class="timeline-empty">Stops will appear after the trip loads.</div>');

    $("#timeline-list .timeline-item").on("click", onTimelineSelect);
    $("#timeline-list .timeline-item").on("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        $(this).trigger("click");
      }
    });

    setActiveTimelineItem(_SPDEV.State.selectedMarkerId);
  }

  function buildTimelineItem(point, index) {
    var safeComment = escapeHtml(point.comment || "(No comment)");
    var safeDate = escapeHtml(formatTimelineDate(point.timestamp));
    var safeMarkerId = escapeHtmlAttribute(point.id);
    var thumbnail = buildTimelineThumbnail(point);

    return (
      '<div class="timeline-item" role="button" tabindex="0" data-marker-id="' + safeMarkerId + '">' +
        '<div class="timeline-index">' + (index + 1) + "</div>" +
        '<div class="timeline-body">' +
          '<div class="timeline-date">' + safeDate + "</div>" +
          '<div class="timeline-comment">' + safeComment + "</div>" +
        "</div>" +
        thumbnail +
      "</div>"
    );
  }

  function buildTimelineThumbnail(point) {
    if (typeof getImageCandidates !== "function") {
      return "";
    }

    var feature = {
      properties: {
        timestamp: point.timestamp
      }
    };
    var candidates = getImageCandidates(feature);
    if (!candidates.length) {
      return "";
    }

    return '<img class="timeline-thumb" loading="lazy" alt="" src="' + escapeHtmlAttribute(candidates[0]) +
      '" data-candidates="' + escapeHtmlAttribute(candidates.join("|")) +
      '" data-candidate-index="0" onerror="handleImageError(this)" />';
  }

  function formatTimelineDate(timestamp) {
    if (!timestamp) {
      return "Unknown date";
    }
    var parsed = Date.parse(timestamp);
    if (isNaN(parsed)) {
      return timestamp;
    }
    return new Date(parsed).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function onTimelineSelect() {
    var markerId = $(this).data("markerId");
    if (_SPDEV.Search && markerId) {
      _SPDEV.Search.focusMarkerById(markerId);
      updateUrlState();
      closeDrawerAfterSelection();
    }
  }

  function focusRelativeTimelinePoint(direction) {
    if (!currentTimelinePoints.length || !_SPDEV.Search) {
      return;
    }

    var selectedId = _SPDEV.State && _SPDEV.State.selectedMarkerId;
    var selectedIndex = -1;
    for (var index = 0; index < currentTimelinePoints.length; index++) {
      if (currentTimelinePoints[index].id === selectedId) {
        selectedIndex = index;
        break;
      }
    }

    var nextIndex = selectedIndex === -1 ? 0 : selectedIndex + direction;
    if (nextIndex < 0) {
      nextIndex = currentTimelinePoints.length - 1;
    } else if (nextIndex >= currentTimelinePoints.length) {
      nextIndex = 0;
    }
    _SPDEV.Search.focusMarkerById(currentTimelinePoints[nextIndex].id);
  }

  function fitCurrentTrip() {
    if (!_SPDEV.Map || !_SPDEV.Map.map || typeof L === "undefined") {
      return;
    }

    var bounds = L.latLngBounds([]);
    for (var index = 0; index < currentTimelinePoints.length; index++) {
      bounds.extend([currentTimelinePoints[index].lat, currentTimelinePoints[index].lng]);
    }

    if (bounds.isValid()) {
      _SPDEV.Map.map.fitBounds(bounds, { padding: [28, 28] });
    }
  }

  function setActiveTimelineItem(markerId) {
    $("#timeline-list .timeline-item").removeClass("is-active").attr("aria-current", "false");
    if (!markerId) {
      return;
    }

    var $activeItem = $('#timeline-list .timeline-item[data-marker-id="' + escapeSelectorValue(markerId) + '"]');
    $activeItem.addClass("is-active").attr("aria-current", "true");
    if ($activeItem.length && typeof $activeItem[0].scrollIntoView === "function") {
      $activeItem[0].scrollIntoView({ block: "nearest" });
    }
  }

  function openImageViewer(imageUrl) {
    if (!imageUrl) {
      return;
    }
    $("#image-viewer-img").attr("src", imageUrl);
    $("body").addClass("image-viewer-open");
    $("#image-viewer").addClass("is-open").attr("aria-hidden", "false");
    imageViewerOpenedAt = Date.now();
    $("#image-viewer-close").trigger("focus");
  }

  function closeImageViewer() {
    $("#image-viewer").removeClass("is-open").attr("aria-hidden", "true");
    $("#image-viewer-img").attr("src", "");
    $("body").removeClass("image-viewer-open");
  }

  function bindPopupImageActivation() {
    var events = ["pointerup", "touchend", "click"];
    for (var eventIndex = 0; eventIndex < events.length; eventIndex++) {
      document.addEventListener(events[eventIndex], handlePopupImageActivation, true);
    }
  }

  function handlePopupImageActivation(event) {
    var target = event.target;
    if (!target || !target.closest) {
      return;
    }

    var link = target.closest(".popup-image-link");
    var image = target.closest("img.imageThumbnail, img.hoverPreviewImage");
    var popupContent = target.closest(".leaflet-popup-content");
    var previewContent = target.closest(".hover-image-tooltip");
    if ((!popupContent && !previewContent) || (!link && !image)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }

    openImageViewer(getPopupImageUrl(link || image));
  }

  window.openFullscreenImageFromPopup = function (event, linkElement) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    openImageViewer(getPopupImageUrl(linkElement));
    return false;
  };

  function getPopupImageUrl(element) {
    if (!element) {
      return "";
    }
    var image = element.tagName && element.tagName.toLowerCase() === "img" ? element : element.querySelector("img");
    return (image && image.currentSrc) || (image && image.src) || "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlAttribute(value) {
    return escapeHtml(value);
  }

  function escapeSelectorValue(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(String(value));
    }
    return String(value).replace(/"/g, '\\"');
  }
});
