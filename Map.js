var _SPDEV = {};
var geolat = null;
var geolon = null;

var geoPoints = null;

var geoPointsSEA = null;

var _surveyPointLayer = null;
var _MexicosurveyPointLayerCircles = null;

var _SEAsurveyPointLayerCircles;

var SEAmarkers = null;

var Mexicomarkers = null;

var stringlineArray = [];

var _keycount = 0;

var _geoJSONLine = null;

var _RouteGeoJSON;

_SPDEV.State = {
	currentRegion: 'sea',
	currentBasemap: 'streets',
	selectedMarkerId: null,
	pointsByRegion: {
		sea: [],
		mexico: []
	},
	pointsById: {}
};

function dispatchAppEvent(name, detail) {
	if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent === 'function') {
		window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
	}
}

function setCurrentRegion(region, silent) {
	_SPDEV.State.currentRegion = region;
	if (!silent) {
		dispatchAppEvent('travel:statechange', getShareableState());
	}
}

function setCurrentBasemap(basemapKey, silent) {
	_SPDEV.State.currentBasemap = basemapKey;
	if (!silent) {
		dispatchAppEvent('travel:statechange', getShareableState());
	}
}

function setSelectedMarker(markerId, silent) {
	_SPDEV.State.selectedMarkerId = markerId || null;
	if (!silent) {
		dispatchAppEvent('travel:statechange', getShareableState());
	}
}

function resetRegionPoints(region) {
	_SPDEV.State.pointsByRegion[region] = [];
	var pointsById = _SPDEV.State.pointsById;
	for (var markerId in pointsById) {
		if (Object.prototype.hasOwnProperty.call(pointsById, markerId) && pointsById[markerId].region === region) {
			delete pointsById[markerId];
		}
	}
}

function parseDateValue(rawValue) {
	if (!rawValue) {
		return null;
	}
	var parsed = Date.parse(rawValue);
	if (!isNaN(parsed)) {
		return parsed;
	}
	var matched = String(rawValue).match(/^(\d{4})[-_/](\d{1,2})[-_/](\d{1,2})/);
	if (!matched) {
		return null;
	}
	return Date.UTC(parseInt(matched[1], 10), parseInt(matched[2], 10) - 1, parseInt(matched[3], 10));
}

function registerPoint(region, feature, layer, markerId) {
	var properties = feature.properties || {};
	var point = {
		id: markerId,
		region: region,
		comment: String(properties.comment || ''),
		timestamp: String(properties.timestamp || ''),
		dateValue: parseDateValue(properties.timestamp),
		lat: feature.geometry.coordinates[1],
		lng: feature.geometry.coordinates[0],
		layer: layer
	};
	_SPDEV.State.pointsByRegion[region].push(point);
	_SPDEV.State.pointsById[markerId] = point;
	layer._markerId = markerId;
}

function getShareableState() {
	var map = _SPDEV.Map && _SPDEV.Map.map;
	var center = map ? map.getCenter() : { lat: null, lng: null };
	var zoom = map ? map.getZoom() : null;
	return {
		region: _SPDEV.State.currentRegion,
		basemap: _SPDEV.State.currentBasemap,
		selected: _SPDEV.State.selectedMarkerId,
		center: center,
		zoom: zoom
	};
}

function getFilteredPoints(filters) {
	filters = filters || {};
	var query = String(filters.query || '').toLowerCase();
	var region = filters.region || 'all';
	var fromDate = filters.fromDate ? Date.parse(filters.fromDate) : null;
	var toDate = filters.toDate ? Date.parse(filters.toDate) : null;
	if (toDate !== null && !isNaN(toDate)) {
		toDate += 86399999;
	}

	var base = [];
	if (region === 'all') {
		base = _SPDEV.State.pointsByRegion.sea.concat(_SPDEV.State.pointsByRegion.mexico);
	} else if (_SPDEV.State.pointsByRegion[region]) {
		base = _SPDEV.State.pointsByRegion[region].slice();
	}

	return base.filter(function (point) {
		var matchesText = !query || point.comment.toLowerCase().indexOf(query) !== -1;
		var hasDate = point.dateValue !== null;
		var matchesFrom = fromDate === null || !hasDate || point.dateValue >= fromDate;
		var matchesTo = toDate === null || !hasDate || point.dateValue <= toDate;
		return matchesText && matchesFrom && matchesTo;
	});
}

function focusMarkerById(markerId, options) {
	options = options || {};
	var point = _SPDEV.State.pointsById[markerId];
	if (!point || !point.layer || !_SPDEV.Map || !_SPDEV.Map.map) {
		return false;
	}

	if (point.region === 'sea') {
		removeMexicoPoints();
		addSEAPoints();
	} else {
		removeThailandPoints();
		addMexicoPoints();
	}
	setCurrentRegion(point.region, true);

	var map = _SPDEV.Map.map;
	var latLng = L.latLng(point.lat, point.lng);
	map.setView(latLng, Math.max(map.getZoom(), 8));
	if (typeof point.layer.getLatLng === 'function') {
		var parent = point.region === 'sea' ? SEAmarkers : Mexicomarkers;
		if (parent && typeof parent.zoomToShowLayer === 'function') {
			parent.zoomToShowLayer(point.layer, function () {
				closeAllPreviewTooltips();
				point.layer.openPopup();
			});
		} else {
			closeAllPreviewTooltips();
			point.layer.openPopup();
		}
	}

	setSelectedMarker(markerId, !!options.silent);
	dispatchAppEvent('travel:markerfocus', { markerId: markerId, region: point.region });
	return true;
}

_SPDEV.Search = {
	getFilteredPoints: getFilteredPoints,
	focusMarkerById: focusMarkerById,
	getShareableState: getShareableState
};

function closeAllPreviewTooltips() {
	var regions = ['sea', 'mexico'];
	for (var regionIndex = 0; regionIndex < regions.length; regionIndex++) {
		var points = _SPDEV.State.pointsByRegion[regions[regionIndex]] || [];
		for (var pointIndex = 0; pointIndex < points.length; pointIndex++) {
			if (points[pointIndex].layer && typeof points[pointIndex].layer.closeTooltip === 'function') {
				points[pointIndex].layer.closeTooltip();
			}
		}
	}
}


function init(){
	
	//$("#sidebarOff").click(slideLocationPanelWrapperOut);
	
	$('#individualPlot').click(clickDetailPanelTab2);
	
	$('#districtLevel').click(clickDetailPanelTab2);
	
	
}

function clickDetailPanelTab2() {
	$(this).addClass('active1').siblings().removeClass('active1');
	
	viewIndividualPlotsStats();

}

function viewIndividualPlotsStats() {
	
	

    if ($('#individualPlot').hasClass('active1')) {
    	setCurrentRegion('sea');
    

        removeMexicoPoints();

        //getSEAPoints();
        
        if (!geoPointsSEA) {
        	getSEAPoints();
        	console.log("getting SEA Observations");
	    } else {
	        addSEAPoints();
	        console.log("getting SEA Layer");
	        _SPDEV.Map.map.fitBounds(SEAmarkers.getBounds());
	        dispatchAppEvent('travel:statechange', getShareableState());
	    }





    } else {
    	setCurrentRegion('mexico');
        
        //getMexicoPoints();
        
        removeThailandPoints();
        
        if (!geoPoints) {
        getMexicoPoints();
        console.log("getting Mexico Observations");
	    } else {
	        addMexicoPoints();
	        console.log("getting Mexico Layer");
	        _SPDEV.Map.map.fitBounds(Mexicomarkers.getBounds());
	        dispatchAppEvent('travel:statechange', getShareableState());
	    }

  
    }
}

function addMexicoPoints(){
	
	_SPDEV.Map.map.addLayer(Mexicomarkers);
	//_SPDEV.Map.map.addLayer(_RouteGeoJSON);
	//addOutlineDistrictsBoundaries();
}

function removeMexicoPoints(){
	if (Mexicomarkers && _SPDEV.Map.map.hasLayer(Mexicomarkers)) {
		_SPDEV.Map.map.removeLayer(Mexicomarkers);
	}
	//_SPDEV.Map.map.removeLayer(_RouteGeoJSON);
}

function addSEAPoints(){
	
	_SPDEV.Map.map.addLayer(SEAmarkers);
	//_SPDEV.Map.map.addLayer(_RouteGeoJSON);
	//addOutlineDistrictsBoundaries();
}

function removeThailandPoints(){
	if (SEAmarkers && _SPDEV.Map.map.hasLayer(SEAmarkers)) {
		_SPDEV.Map.map.removeLayer(SEAmarkers);
	}
	//_SPDEV.Map.map.removeLayer(_RouteGeoJSON);
}



function slideLocationPanelWrapperOut(){
	
	$("#locationPanelWrapper").animate({"right":"0px"}, "slow");
	
}

function slideLocationPanelWrapperIn(){
	
	$("#locationPanelWrapper").animate({"right":"-320px"}, "slow");
	
}

/*
function locateMe (position) {
	console.log(position);
  geolat = position.coords.latitude;
  geolon =  position.coords.longitude;
}
*/

function onPointResults(data)  {
	
	
	
	stringlineArray = [];
	
	//var topGeoJson = '{ "type": "FeatureCollection","features": [{ "type": "Feature","geometry": {"type": "LineString","coordinates":[';
	
	var topGeoJson = ['{"type": "LineString","coordinates": ['];
	
	stringlineArray.push(topGeoJson);
	
	var pointdata = data.features;
	pointdata = pointdata.reverse();
	var numberOfPoints = data.features.length;
	console.log(numberOfPoints);

	if(numberOfPoints === 0) {
		return;
	}
	
	for(var i=0; i < numberOfPoints; i++) {
		var pointData = pointdata[i];
		//console.log(pointData);
		var lat = pointData.geometry.coordinates[1];
		var lng = pointData.geometry.coordinates[0];
		//console.log("lat: ",lat);
		//console.log("lng: ", lng);
		
		if (lat && lng){
			
			var pointItem = "[" + lng + ", " + lat + "],";
		
			//console.log(pointItem);
			
			stringlineArray.push(pointItem);
			
		}
		
		
		
		
		
	}
	
	//SEAPointArray.shift();
	
	//var bottomGeoJson = [']}'];
	
	stringlineArray.push(']}');
	
	//var GeoJSONLineString = topGeoJson.concat(SEAPointArray, bottomGeoJson);
	
	//console.log(GeoJSONLineString);
	
	
	
	var myVar = stringlineArray.join("");
	myVar = myVar.replace(/,(?=[^,]*$)/, '');
	
	
	console.log(myVar);
	
	_geoJSONLine = jQuery.parseJSON(myVar);
	
	
	
	console.log(_geoJSONLine);
	
	
	var myStyle = {
		"color" : "#000000",
		"weight" : 2,
		"opacity" : 0.55,
		"dashArray": 15
	}; 

	
	_RouteGeoJSON = new L.GeoJSON(_geoJSONLine, {
		    style: myStyle
		});
       _SPDEV.Map.map.addLayer(_RouteGeoJSON);
	
	
}


//Load points GeoJSON and add to map
function getSEAPoints(){
	
	 var postArgs = {
               
               
            };
            
            
            var url = 'https://s3-us-west-2.amazonaws.com/travels2013/Observations_SEA.json';

            //Send POST, using JSONP
            $.getJSON(url, postArgs).done(function (data) {
            	resetRegionPoints('sea');
            	var markerIndex = 0;
           
                geoPointsSEA = data;
                
                console.log(geoPointsSEA); 
                
                //_surveyPointLayer = L.geoJson(data.features).addTo(_SPDEV.Map.map);
                if (_RouteGeoJSON && _SPDEV.Map.map.hasLayer(_RouteGeoJSON)) {
                	_SPDEV.Map.map.removeLayer(_RouteGeoJSON);
                }
                 onPointResults(geoPointsSEA);
                 
                 //var image = "https://s3-us-west-2.amazonaws.com/travels2013/" + feature.properties.timestamp;
                 
                 function onEachFeature(feature, layer) {
                 	
                 	var counts = new String(_keycount--);
                 	var panelDiv = '';
                 	var markerId = 'sea-' + markerIndex++;
                 	
                 	counts = (counts.split('-')[1]);
                 	registerPoint('sea', feature, layer, markerId);
                 	 
                 	 var image = buildPopupImageHtml(feature);
					
					
					
					
                 	//var image = '<img src="https://s3-us-west-2.amazonaws.com/travels2013/' + feature.properties.timestamp + '.jpg" height="100" width="100">';
				    var safeComment = escapeHtml(feature.properties.comment || '');
				    var safeTimestamp = escapeHtml(feature.properties.timestamp || '');
				    layer.bindPopup('<h2>' + counts + " - " + safeComment + '</h2>' + '<br />' + 
				      '<span class="comments">Time Stamp: ' + safeTimestamp + '</span><br />' + 
				      '<span class="comments">lat/lng: ' + feature.geometry.coordinates[1] + "," + feature.geometry.coordinates[0] + '</span><br />' + 
				      image || ""
				      );
				    layer.bindTooltip(buildHoverPreviewHtml(feature), {
						direction: 'right',
						offset: [18, 0],
				    	opacity: 0.97,
						sticky: false,
				    	className: 'hover-image-tooltip'
				    });
				    
				      
				    /*  
				    _surveyPointLayerCircles.on("mouseover", function(e) {
			
					$("#cropText").html(feature.properties.crop);
				      
					console.log(feature.properties.crop);
					});
					*/
					
					layer.on("mouseover", function(e) {
						
						panelDiv = feature.properties.timestamp;
						
						$("#" + panelDiv).addClass("activepanel");
						
						console.log(panelDiv);
						//$("#" + markerid).animate({scrollTop:$("#" + markerid).position().top}, 'slow');
				
						
						
						//$("#" + markerid).css("color","#009fe4");
						
					});
					
					layer.on("click", function () {
						closeAllPreviewTooltips();
						setSelectedMarker(markerId);
					});
					
						layer.on("mouseout", function(e) {
			            $("#" + panelDiv).removeClass("activepanel");
			            
			            console.log(panelDiv);
	            
	        		});
				      
				      
				  }
				  
				 var treeIcon = L.icon({
				      iconUrl: 'images/tree_small.png'
				    });

                
                var geojsonMarkerOptions = {
				    radius: 8,
				    fillColor: "#d24a46",
				    color: "#000",
				    weight: 1,
				    opacity: 1,
				    fillOpacity: 0.8
				};
				
				_SEAsurveyPointLayerCircles = L.geoJson(data.features, {
				    pointToLayer: function (feature, latlng) {
				        return L.circleMarker(latlng, geojsonMarkerOptions);
				    },
				    
				    onEachFeature: onEachFeature
				
				});
				
				SEAmarkers = L.markerClusterGroup({showCoverageOnHover: false,maxClusterRadius: 40});
				    SEAmarkers.addLayer(_SEAsurveyPointLayerCircles);
    				_SPDEV.Map.map.addLayer(SEAmarkers);
    				
    				
    			_SPDEV.Map.map.fitBounds(SEAmarkers.getBounds());
    			setCurrentRegion('sea', true);
    			dispatchAppEvent('travel:regionloaded', { region: 'sea' });
    			dispatchAppEvent('travel:statechange', getShareableState());
    			
    			
    			
				
				
                
                
                
            }).fail(function (jqxhr, textStatus, error) {
                var err = textStatus + ', ' + error;
                console.log("Request Failed: " + err);
                showStatusMessage("Could not load Southeast Asia points. Please retry.");
            });
            
           
			    
}

//Load points GeoJSON and add to map
function getMexicoPoints(){
	
	 var postArgs = {
               
               
            };
            
            
            var url = 'https://s3-us-west-2.amazonaws.com/travels2013/Observations_Mexico.json';

            //Send POST, using JSONP
            $.getJSON(url, postArgs).done(function (data) {
            	resetRegionPoints('mexico');
            	var markerIndex = 0;
           
                geoPoints = data;
                
                console.log(geoPoints);
                
                onPointResults(data);
                
                //_surveyPointLayer = L.geoJson(data.features).addTo(_SPDEV.Map.map);
                
                 //onPointResults(geoPoints);
                 
                 //var image = "https://s3-us-west-2.amazonaws.com/travels2013/" + feature.properties.timestamp;
                 
                 function onEachFeature(feature, layer) {
                 	 var panelDiv = '';
                 	 var markerId = 'mexico-' + markerIndex++;
                 	 registerPoint('mexico', feature, layer, markerId);
                 	 var image = buildPopupImageHtml(feature);

                 	//var image = '<img src="https://s3-us-west-2.amazonaws.com/travels2013/' + feature.properties.timestamp + '.jpg" height="100" width="100">';
				    var safeComment = escapeHtml(feature.properties.comment || '');
				    var safeTimestamp = escapeHtml(feature.properties.timestamp || '');
				    layer.bindPopup('<h2>' + safeComment + '</h2>' + '<br />' + 
				      '<span class="comments">Time Stamp: ' + safeTimestamp + '</span><br />' + 
				      '<span class="comments">lat/lng: ' + feature.geometry.coordinates[1] + "," + feature.geometry.coordinates[0] + '</span><br />' + 
				      image || ""
				      );
				    layer.bindTooltip(buildHoverPreviewHtml(feature), {
						direction: 'right',
						offset: [18, 0],
				    	opacity: 0.97,
						sticky: false,
				    	className: 'hover-image-tooltip'
				    });
				     
				      
				    /*  
				    _surveyPointLayerCircles.on("mouseover", function(e) {
			
					$("#cropText").html(feature.properties.crop);
				      
					console.log(feature.properties.crop);
					});
					*/
					
					layer.on("mouseover", function(e) {
						
						panelDiv = feature.properties.timestamp;
						
						$("#" + panelDiv).addClass("activepanel");
						
						console.log(panelDiv);
						//$("#" + markerid).animate({scrollTop:$("#" + markerid).position().top}, 'slow');
				
						
						
						//$("#" + markerid).css("color","#009fe4");
						
					});
					
					layer.on("click", function () {
						closeAllPreviewTooltips();
						setSelectedMarker(markerId);
					});
					
					layer.on("mouseout", function(e) {
			            $("#" + panelDiv).removeClass("activepanel");
			            
			            console.log(panelDiv);
	            
	        		});
				      
				      
				  }
				  
				 var treeIcon = L.icon({
				      iconUrl: 'images/tree_small.png'
				    });

                
                var geojsonMarkerOptions = {
				    radius: 8,
				    fillColor: "#d24a46",
				    color: "#000",
				    weight: 1,
				    opacity: 1,
				    fillOpacity: 0.8
				};
				
				_MexicosurveyPointLayerCircles = L.geoJson(data.features, {
				    pointToLayer: function (feature, latlng) {
				        return L.circleMarker(latlng, geojsonMarkerOptions);
				    },
				    
				    onEachFeature: onEachFeature
				
				});
				
				Mexicomarkers = L.markerClusterGroup({showCoverageOnHover: false,maxClusterRadius: 40});
				    Mexicomarkers.addLayer(_MexicosurveyPointLayerCircles);
    				_SPDEV.Map.map.addLayer(Mexicomarkers);
    				
    				
    			_SPDEV.Map.map.fitBounds(Mexicomarkers.getBounds());
    			setCurrentRegion('mexico', true);
    			dispatchAppEvent('travel:regionloaded', { region: 'mexico' });
    			dispatchAppEvent('travel:statechange', getShareableState());
    			
    			
    			
				
				
                
                
                
            }).fail(function (jqxhr, textStatus, error) {
                var err = textStatus + ', ' + error;
                console.log("Request Failed: " + err);
                showStatusMessage("Could not load Mexico points. Please retry.");
            });
            
           
			    
}






function imageLoader(comments, timestamp){
	
	//var imageSize = '<img width="70" height="60" src="https://s3-us-west-2.amazonaws.com/travels2013/' + timestamp + '.jpg" />'
	
	var imageSize = '<img src="https://s3-us-west-2.amazonaws.com/travels2013/' + timestamp + '.jpg" >';

	
	console.log(imageSize);
	
	var imageDiv = document.createElement("div");
        imageDiv.id = "image_" + timestamp;
        imageDiv.className = "imageThumbnail";
        //imageDiv.innerHTML = '<img src="https://s3-us-west-2.amazonaws.com/travels2013/' + timestamp + '.jpg" height="60" width="70">';
        
        imageDiv.innerHTML = '<A HREF="https://s3-us-west-2.amazonaws.com/travels2013/' + timestamp + '.jpg" TARGET="NEW"><img width="70" height="60" src="https://s3-us-west-2.amazonaws.com/travels2013/' + timestamp + '.jpg" /></A>';
        
        
        $("#locationPanelWrapper").append(imageDiv);  
	
}



function loadLeafMaps(){
	
	_SPDEV.Map = new _SPDEV.LeafletMap("map", {
			basemapUrl:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
			attributionTxt: '&copy; OpenStreetMap contributors',
			scrollWheelZoom: true,
			latitude: 47.6029766,
		    longitude: -122.30845169999999,
		    loadZoom: 4

			});
	
	
	_SPDEV.Map.addBasemap('terrain', 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
		attributionTxt: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
	});
	_SPDEV.Map.addBasemap('streets', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attributionTxt: '&copy; OpenStreetMap contributors'
	});
	_SPDEV.Map.addBasemap('darkCanvas', 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
		attributionTxt: '&copy; OpenStreetMap contributors &copy; CARTO'
	});
	_SPDEV.Map.addBasemap('aerial', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		attributionTxt: 'Tiles &copy; Esri'
	});
	setCurrentBasemap('streets', true);
	
	//getMexicoPoints();
	getSEAPoints();
}




_SPDEV.LeafletMap = function(mapId, options) {	
		// set up the map options or defaults
		var scrollWheelZoom = options.scrollWheelZoom || false;
		var keyboard = options.keyboard || false;			
		this.minZoom = options.minZoom || 0;
		this.maxZoom = options.maxZoom || 18;
		var loadZoom = options.loadZoom || 10;
		var attributionTxt = options.attributionTxt || '';
		this.tileSize = options.tileSize || 256;
		this.continuousWorld = options.continuousWorld || false;
		var centerLatitude = options.latitude || -16.5;
		var centerLongitude = options.longitude || -67;
		var basemapUrl = options.basemapUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';


		this.map  = new L.Map(mapId, {
				'keyboard': keyboard,
				'scrollWheelZoom': scrollWheelZoom,
								});

		// create the basemap layer
		this.basemaps = {};
		this.basemaps.mapDefault = L.tileLayer(basemapUrl,
			{
			    minZoom: this.minZoom, 
			    maxZoom: this.maxZoom, 
			    attribution: attributionTxt,
			    tileSize: this.tileSize,
				continuousWorld: this.continuousWorld
			});

		// Set the map view
		this.map.setView(new L.LatLng(centerLatitude, centerLongitude),loadZoom);

		// Add the basemap
		this.map.addLayer(this.basemaps.mapDefault);

		this.currentBasemap = this.basemaps.mapDefault;
		
		//this.geoJson( geoPoints ).addTo(Map);
		
		


		return this;
};

_SPDEV.LeafletMap.prototype.addBasemap = function(key, basemapUrl, options) {
		options = options || {};
		var minZoom = options.minZoom || this.minZoom;
		var maxZoom = options.maxZoom || this.maxZoom ;
		var attributionTxt = options.attributionTxt || '';
		var tileSize = options.tileSize || 		this.tileSize;
		var continuousWorld = options.continuousWorld || this.continuousWorld;

		this.basemaps[key] = L.tileLayer(basemapUrl,
			{
			    'minZoom': minZoom, 
			    'maxZoom': maxZoom, 
			    'attribution': attributionTxt,
			    'tileSize': tileSize,
				'continuousWorld': continuousWorld
			});

};

_SPDEV.LeafletMap.prototype.changeBasemap  = function(basemapKey) {

	this.map.removeLayer(this.currentBasemap);
	this.map.addLayer(this.basemaps[basemapKey]);
	this.currentBasemap = this.basemaps[basemapKey];
	setCurrentBasemap(basemapKey);
};

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function showStatusMessage(message) {
	var status = document.getElementById("status-message");
	if (status) {
		status.textContent = message;
	}
}

function getImageCandidates(feature) {
	var baseUrl = 'https://s3-us-west-2.amazonaws.com/travels2013/';
	var properties = (feature && feature.properties) || {};
	var candidates = [];
	var sourceKeys = ['image', 'imageUrl', 'photo', 'filename', 'file', 'img', 'timestamp'];

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
		var url = isAbsolute ? cleanValue : (baseUrl + cleanValue);
		var encodedUrl = isAbsolute ? encodeURI(cleanValue) : (baseUrl + encodeURIComponent(cleanValue));

		if (!hasExtension) {
			pushUnique(url + '.jpg');
			pushUnique(url + '.JPG');
			pushUnique(encodedUrl + '.jpg');
			pushUnique(encodedUrl + '.JPG');
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
	var matched = String(timestamp || '').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) PST$/);
	if (!matched) {
		return '';
	}

	var date = new Date(Date.UTC(
		parseInt(matched[1], 10),
		parseInt(matched[2], 10) - 1,
		parseInt(matched[3], 10),
		parseInt(matched[4], 10) + 2,
		parseInt(matched[5], 10),
		parseInt(matched[6], 10)
	));

	return [
		date.getUTCFullYear(),
		padDatePart(date.getUTCMonth() + 1),
		padDatePart(date.getUTCDate())
	].join('-') + ' ' + [
		padDatePart(date.getUTCHours()),
		padDatePart(date.getUTCMinutes()),
		padDatePart(date.getUTCSeconds())
	].join(':') + ' CST';
}

function padDatePart(value) {
	return value < 10 ? '0' + value : String(value);
}

function buildPopupImageHtml(feature) {
	var candidates = getImageCandidates(feature);
	if (candidates.length === 0) {
		return '';
	}
	return '<button type="button" class="popup-image-link" onclick="return openFullscreenImageFromPopup(event, this);" ontouchend="return openFullscreenImageFromPopup(event, this);" onpointerup="return openFullscreenImageFromPopup(event, this);">' +
		buildImageTag('imageThumbnail', candidates, '180') +
		'</button>';
}

function buildHoverPreviewHtml(feature) {
	var candidates = getImageCandidates(feature);
	if (candidates.length === 0) {
		return '<span class="hover-image-empty">No image available</span>';
	}
	return '<button type="button" class="popup-image-link hover-preview-link" onclick="return openFullscreenImageFromPopup(event, this);" ontouchend="return openFullscreenImageFromPopup(event, this);" onpointerup="return openFullscreenImageFromPopup(event, this);">' +
		buildImageTag('hoverPreviewImage', candidates, '') +
		'</button>';
}

function escapeHtmlAttribute(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function buildImageTag(cssClass, candidates, width) {
	if (!candidates || candidates.length === 0) {
		return '';
	}

	var widthAttr = width ? ' width="' + width + '"' : '';
	var serialized = escapeHtmlAttribute(candidates.join('|'));
	return '<img' + widthAttr +
		' class="' + cssClass + '"' +
		' src="' + escapeHtmlAttribute(candidates[0]) + '"' +
		' data-candidates="' + serialized + '"' +
		' data-candidate-index="0"' +
		' onerror="handleImageError(this)" />';
}

function handleImageError(imgElement) {
	var serialized = imgElement.getAttribute('data-candidates') || '';
	if (!serialized) {
		imgElement.style.display = 'none';
		return;
	}

	var candidates = serialized.split('|');
	var currentIndex = parseInt(imgElement.getAttribute('data-candidate-index') || '0', 10);
	var nextIndex = currentIndex + 1;

	if (nextIndex < candidates.length) {
		imgElement.setAttribute('data-candidate-index', String(nextIndex));
		imgElement.src = candidates[nextIndex];
		return;
	}

	imgElement.style.display = 'none';
}
