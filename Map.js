/* Map rendering is kept separate from journal navigation and selection. */
window.TravelMap = (() => {
  const map = L.map("map", {
    zoomControl: false,
    keyboard: true,
    worldCopyJump: true,
  }).setView([15, 102], 5);
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
  const layers = {
    streets: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution,
      maxZoom: 19,
    }),
    darkCanvas: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution,
      maxZoom: 19,
    }),
    aerial: L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri", maxZoom: 18 },
    ),
    terrain: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap, SRTM | &copy; OpenTopoMap (CC-BY-SA)",
      maxZoom: 17,
    }),
  };
  let basemap = "streets",
    cluster,
    route,
    points = [],
    selected;
  const markers = new Map();
  const normalStyle = {
    radius: 6,
    color: "#ffffff",
    weight: 2,
    fillColor: "#7160c5",
    fillOpacity: 1,
  };
  layers[basemap].addTo(map);
  function fit() {
    if (points.length)
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), {
        padding: [65, 65],
        maxZoom: 13,
      });
  }
  function clear() {
    if (cluster) map.removeLayer(cluster);
    if (route) map.removeLayer(route);
    markers.clear();
    points = [];
    selected = null;
  }
  function show(nextPoints, onSelect) {
    if (cluster) map.removeLayer(cluster);
    if (route) map.removeLayer(route);
    markers.clear();
    selected = null;
    points = nextPoints;
    cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 32,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (group) =>
        L.divIcon({
          html: "<div>" + group.getChildCount() + "</div>",
          className: "marker-cluster",
          iconSize: [42, 42],
        }),
    });
    points.forEach((point) => {
      const marker = L.circleMarker([point.lat, point.lng], normalStyle);
      const tip = document.createElement("span");
      tip.textContent = point.comment || "A moment along the way";
      marker.bindTooltip(tip, { direction: "top", offset: [0, -8] });
      marker.on("click", () => onSelect(point.id));
      markers.set(point.id, marker);
      cluster.addLayer(marker);
    });
    // Split at the date line so trans-Pacific flights do not cross the whole map.
    const segments = [[]];
    points.forEach((point, index) => {
      if (index && Math.abs(point.lng - points[index - 1].lng) > 180)
        segments.push([]);
      segments[segments.length - 1].push([point.lat, point.lng]);
    });
    route = L.polyline(segments, {
      color: "#7966c3",
      weight: 2,
      opacity: 0.7,
      dashArray: "5 6",
      interactive: false,
    }).addTo(map);
    cluster.addTo(map);
    const regional = points.filter((p) =>
      p.id.startsWith("sea-")
        ? p.lng > 60 && p.lng < 150 && p.lat > -15 && p.lat < 50
        : p.lng > -120 && p.lng < -85 && p.lat > 14 && p.lat < 33,
    );
    if (regional.length)
      map.fitBounds(L.latLngBounds(regional.map((p) => [p.lat, p.lng])), {
        padding: [65, 65],
        maxZoom: 12,
      });
    else fit();
  }
  function focus(id, move = true) {
    if (selected && markers.has(selected))
      markers.get(selected).setStyle(normalStyle);
    selected = id;
    const marker = markers.get(id);
    if (!marker) return;
    marker.setStyle({
      radius: 9,
      fillColor: "#44318d",
      color: "#fff",
      weight: 3,
    });
    if (move) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 9), {
        animate: false,
      });
      cluster.zoomToShowLayer(marker, () => marker.bringToFront());
    }
  }
  function changeBasemap(key) {
    if (!layers[key]) return false;
    map.removeLayer(layers[basemap]);
    layers[key].addTo(map);
    basemap = key;
    document.getElementById("map").dataset.basemap = key;
    return true;
  }
  return {
    map,
    show,
    clear,
    focus,
    fit,
    changeBasemap,
    get basemap() {
      return basemap;
    },
  };
})();
function getImageCandidates(feature) {
  var baseUrl = "https://s3-us-west-2.amazonaws.com/travels2013/";
  var properties = (feature && feature.properties) || {};
  var candidates = [];
  var sourceKeys = [
    "image",
    "imageUrl",
    "photo",
    "filename",
    "file",
    "img",
    "timestamp",
  ];

  function addCandidate(value) {
    if (!value) {
      return;
    }
    var cleanValue = String(value).trim();
    if (!cleanValue) {
      return;
    }

    var isAbsolute = /^https?:\/\//i.test(cleanValue);
    var hasExtension = /\.[a-zA-Z0-9]{2,5}$/.test(cleanValue);
    var url = isAbsolute ? cleanValue : baseUrl + cleanValue;
    var encodedUrl = isAbsolute
      ? encodeURI(cleanValue)
      : baseUrl + encodeURIComponent(cleanValue);

    if (!hasExtension) {
      pushUnique(url + ".jpg");
      pushUnique(url + ".JPG");
      pushUnique(encodedUrl + ".jpg");
      pushUnique(encodedUrl + ".JPG");
    }
    pushUnique(url);
    pushUnique(encodedUrl);
  }

  function pushUnique(url) {
    if (url && candidates.indexOf(url) === -1) {
      candidates.push(url);
    }
  }

  for (var i = 0; i < sourceKeys.length; i++) {
    addCandidate(properties[sourceKeys[i]]);
  }
  addCandidate(convertPstTimestampToCst(properties.timestamp));

  return candidates;
}

function convertPstTimestampToCst(timestamp) {
  var matched = String(timestamp || "").match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) PST$/,
  );
  if (!matched) {
    return "";
  }

  var date = new Date(
    Date.UTC(
      parseInt(matched[1], 10),
      parseInt(matched[2], 10) - 1,
      parseInt(matched[3], 10),
      parseInt(matched[4], 10) + 2,
      parseInt(matched[5], 10),
      parseInt(matched[6], 10),
    ),
  );

  return (
    [
      date.getUTCFullYear(),
      padDatePart(date.getUTCMonth() + 1),
      padDatePart(date.getUTCDate()),
    ].join("-") +
    " " +
    [
      padDatePart(date.getUTCHours()),
      padDatePart(date.getUTCMinutes()),
      padDatePart(date.getUTCSeconds()),
    ].join(":") +
    " CST"
  );
}

function padDatePart(value) {
  return value < 10 ? "0" + value : String(value);
}
