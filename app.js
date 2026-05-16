$(document).ready(function () {
  var isApplyingUrlState = false;
  var pendingSelectedMarker = null;
  var initialUrlState = readUrlState();
  var imageViewerOpenedAt = 0;

  init();

  var $info = $("#infoback");
  var isSmallScreen = window.matchMedia("(max-width: 900px)").matches;
  $info.css("width", isSmallScreen ? "100%" : "320px");
  $info.show();
  $("#sidebar-on").prop("checked", true);

  $("#sidebar-off").on("click", function () {
    $info.hide("slow");
  });

  $("#sidebar-on").on("click", function () {
    $info.show("slow");
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

  $("#search-comment, #filter-from, #filter-to").on("input", renderSearchResults);
  $("#filter-region").on("change", renderSearchResults);
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
    tryApplyPendingSelected(event.detail && event.detail.region);
  });

  window.addEventListener("travel:markerfocus", function (event) {
    var region = event.detail && event.detail.region;
    if (region) {
      setRegionTab(region);
    }
    updateUrlState();
  });

  window.addEventListener("travel:statechange", function () {
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
      $("#individualPlot").addClass("active1").siblings().removeClass("active1");
    } else if (region === "mexico") {
      $("#districtLevel").addClass("active1").siblings().removeClass("active1");
    }
  }

  function getSearchFilters() {
    return {
      query: $("#search-comment").val(),
      region: $("#filter-region").val(),
      fromDate: $("#filter-from").val(),
      toDate: $("#filter-to").val()
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
});
