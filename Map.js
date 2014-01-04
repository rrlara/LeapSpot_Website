_SPDEV = {};
var geolat = null;
var geolon = null;

var geoPoints = null;

var geoPointsSEA = null;

var _surveyPointLayer = null;
var _MexicosurveyPointLayerCircles = null;

var _SEAsurveyPointLayerCircles

var SEAmarkers = null;

var Mexicomarkers = null;


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
    

        removeMexicoPoints();

        //getSEAPoints();
        
        if (!geoPointsSEA) {
        	getSEAPoints();
        	console.log("getting SEA Observations");
	    } else {
	        addSEAPoints();
	        console.log("getting SEA Layer");
	        _SPDEV.Map.map.fitBounds(SEAmarkers);
	    }





    } else {
        
        //getMexicoPoints();
        
        removeThailandPoints();
        
        if (!geoPoints) {
        getMexicoPoints();
        console.log("getting Mexico Observations");
	    } else {
	        addMexicoPoints();
	        console.log("getting Mexico Layer");
	        _SPDEV.Map.map.fitBounds(Mexicomarkers);
	    }

  
    }
}

function addMexicoPoints(){
	
	_SPDEV.Map.map.addLayer(Mexicomarkers);
	//addOutlineDistrictsBoundaries();
}

function removeMexicoPoints(){
	_SPDEV.Map.map.removeLayer(Mexicomarkers);
}

function addSEAPoints(){
	
	_SPDEV.Map.map.addLayer(SEAmarkers);
	//addOutlineDistrictsBoundaries();
}

function removeThailandPoints(){
	_SPDEV.Map.map.removeLayer(SEAmarkers);
}



function slideLocationPanelWrapperOut(){
	
	$("#locationPanelWrapper").animate({"right":"0px"}, "slow");
	
}

function slideLocationPanelWrapperOut(){
	
	$("#locationPanelWrapper").animate({"right":"-320px"}, "slow");
	
}

/*
function locateMe (position) {
	console.log(position);
  geolat = position.coords.latitude;
  geolon =  position.coords.longitude;
}
*/


//Load points GeoJSON and add to map
function getSEAPoints(){
	
	 var postArgs = {
               
               
            };
            
            
            var url = 'https://s3-us-west-2.amazonaws.com/travels2013/Observations.json';

            //Send POST, using JSONP
            $.getJSON(url, postArgs).done(function (data) {
           
                geoPointsSEA = data;
                
                console.log(geoPointsSEA);
                
                //_surveyPointLayer = L.geoJson(data.features).addTo(_SPDEV.Map.map);
                
                 //onPointResults(geoPointsSEA);
                 
                 //var image = "https://s3-us-west-2.amazonaws.com/travels2013/" + feature.properties.timestamp;
                 
                 function onEachFeature(feature, layer) {
                 	 var image = '<A HREF="https://s3-us-west-2.amazonaws.com/travels2013/' + feature.properties.timestamp + '.jpg" TARGET="NEW"><img width="100" height="100" class="imageThumbnail" src="https://s3-us-west-2.amazonaws.com/travels2013/' + feature.properties.timestamp + '.jpg" /></A>';

                 	//var image = '<img src="https://s3-us-west-2.amazonaws.com/travels2013/' + feature.properties.timestamp + '.jpg" height="100" width="100">';
				    layer.bindPopup('<h2>' + feature.properties.comment + '</eh2>' + '<br />' + 
				      '<span class="comments">Time Stamp: ' + feature.properties.timestamp + '</span><br />' + 
				      '<span class="comments">lat/lng: ' + feature.geometry.coordinates[1] + "," + feature.geometry.coordinates[0] + '</span><br />' + 
				      image || ""
				      );
				     
				      
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
					
					layer.on("mouseout", function(e) {
			            $("#" + panelDiv).removeClass("activepanel");
			            
			            console.log(panelDiv);
	            
	        		});
				      
				      
				  }
				  
				 var treeIcon = L.icon({
				      iconUrl: 'images/tree_small.png'
				    });

                
                var geojsonMarkerOptions = {
				    radius: 4,
				    fillColor: "#028bb0",
				    color: "#000",
				    weight: 1,
				    opacity: 1,
				    fillOpacity: 0.8
				};
				
				_SEAsurveyPointLayerCircles = L.geoJson(data.features, {
				    pointToLayer: function (feature, latlng) {
				        return L.marker(latlng);
				    },
				    
				    onEachFeature: onEachFeature
				
				});
				
				SEAmarkers = L.markerClusterGroup({showCoverageOnHover: false,maxClusterRadius: 40});
				    SEAmarkers.addLayer(_SEAsurveyPointLayerCircles);
    				_SPDEV.Map.map.addLayer(SEAmarkers);
    				
    				
    			_SPDEV.Map.map.fitBounds(SEAmarkers);
    			
    			
    			
				
				
                
                
                
            }).fail(function (jqxhr, textStatus, error) {
                var err = textStatus + ', ' + error;
                console.log("Request Failed: " + err);
            });
            
           
			    
}

//Load points GeoJSON and add to map
function getMexicoPoints(){
	
	 var postArgs = {
               
               
            };
            
            
            var url = 'https://s3-us-west-2.amazonaws.com/travels2013/Observations_Mexico.json';

            //Send POST, using JSONP
            $.getJSON(url, postArgs).done(function (data) {
           
                geoPoints = data;
                
                console.log(geoPoints);
                
                //_surveyPointLayer = L.geoJson(data.features).addTo(_SPDEV.Map.map);
                
                 //onPointResults(geoPoints);
                 
                 //var image = "https://s3-us-west-2.amazonaws.com/travels2013/" + feature.properties.timestamp;
                 
                 function onEachFeature(feature, layer) {
                 	 var image = '<A HREF="https://s3-us-west-2.amazonaws.com/travels2013/' + feature.properties.timestamp + '.jpg" TARGET="NEW"><img width="100" height="100" class="imageThumbnail" src="https://s3-us-west-2.amazonaws.com/travels2013/' + feature.properties.timestamp + '.jpg" /></A>';

                 	//var image = '<img src="https://s3-us-west-2.amazonaws.com/travels2013/' + feature.properties.timestamp + '.jpg" height="100" width="100">';
				    layer.bindPopup('<h2>' + feature.properties.comment + '</eh2>' + '<br />' + 
				      '<span class="comments">Time Stamp: ' + feature.properties.timestamp + '</span><br />' + 
				      '<span class="comments">lat/lng: ' + feature.geometry.coordinates[1] + "," + feature.geometry.coordinates[0] + '</span><br />' + 
				      image || ""
				      );
				     
				      
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
					
					layer.on("mouseout", function(e) {
			            $("#" + panelDiv).removeClass("activepanel");
			            
			            console.log(panelDiv);
	            
	        		});
				      
				      
				  }
				  
				 var treeIcon = L.icon({
				      iconUrl: 'images/tree_small.png'
				    });

                
                var geojsonMarkerOptions = {
				    radius: 4,
				    fillColor: "#028bb0",
				    color: "#000",
				    weight: 1,
				    opacity: 1,
				    fillOpacity: 0.8
				};
				
				_MexicosurveyPointLayerCircles = L.geoJson(data.features, {
				    pointToLayer: function (feature, latlng) {
				        return L.marker(latlng);
				    },
				    
				    onEachFeature: onEachFeature
				
				});
				
				Mexicomarkers = L.markerClusterGroup({showCoverageOnHover: false,maxClusterRadius: 40});
				    Mexicomarkers.addLayer(_MexicosurveyPointLayerCircles);
    				_SPDEV.Map.map.addLayer(Mexicomarkers);
    				
    				
    			_SPDEV.Map.map.fitBounds(Mexicomarkers);
    			
    			
    			
				
				
                
                
                
            }).fail(function (jqxhr, textStatus, error) {
                var err = textStatus + ', ' + error;
                console.log("Request Failed: " + err);
            });
            
           
			    
}




/*
function onPointResults(data)  {
	
	var pointdata = geoPoints.features;
	var numberOfPoints = geoPoints.features.length;
	//console.log(numberOfPoints);

	if(numberOfPoints === 0) {
		return;
	}
	
	for(var i=0; i < numberOfPoints; i++) {
		var pointData = pointdata[i];
		//console.log(pointData);
		//var lat = pointData.coordinates[1];
		//var lng = pointData.geometry.coordinates[0];
		//console.log("lat: ",lat);
		//console.log("lng: ", lng);
		//var comments = pointData.properties.comment;
		//console.log(cropType);
		//var timestamp = pointData.properties.timestamp;		
		
		//locationsPanels(comments,timestamp);
		
		//imageLoader(comments, timestamp);
		
		

		
	}
}
*/





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
			basemapUrl:'http://{s}.tiles.mapbox.com/v3/spatialdev.map-rpljvvub/{z}/{x}/{y}.png',
			latitude: 47.6029766,
		    longitude: -122.30845169999999,
		    zoom: 4

			});
	
	
	_SPDEV.Map.addBasemap('terrain', 'http://{s}.tiles.mapbox.com/v3/spatialdev.map-4o51gab2/{z}/{x}/{y}.png', {});
	_SPDEV.Map.addBasemap('streets', 'http://{s}.tiles.mapbox.com/v3/spatialdev.map-rpljvvub/{z}/{x}/{y}.png', {});
	_SPDEV.Map.addBasemap('darkCanvas', 'http://{s}.tiles.mapbox.com/v3/spatialdev.map-c9z2cyef/{z}/{x}/{y}.png', {});
	_SPDEV.Map.addBasemap('aerial', 'http://{s}.tiles.mapbox.com/v3/spatialdev.map-hozgh18d/{z}/{x}/{y}.png', {});
	
	getMexicoPoints();
	//getSEAPoints();
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
		var basemapUrl = options.basemapUrl || 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';


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
};

