(function() {
	'use strict';

	rideMap.buildMap = buildMap;

	/**
	 * Loads the style and builds the mapbox gl map
	 *
	 * returns promise
	 */
	function buildMap() {

		var map,
		    dfd = new jQuery.Deferred();
		
		mapboxgl.util.getJSON('rides_electric_base.json', function (err, style) {
			if (err) throw err;
	
			// add ride layers
			style.layers = style.layers.concat(_createAllRideLayers());

			// init the map
			map = rideMap.map = new mapboxgl.Map({
				container: 'map',
				style: style,
				center: [29.8752, -95.9683],
				zoom: 9
			});
			
			// add the compass
			map.addControl(new mapboxgl.Navigation());

			// Update the map, when the time period has been changed
			/* ToDo: 
			var startYear = minYear,
				endYear = minYear,
				updateTimeout;

			$(document).bind("slider-range-end", function(event, year) {
				endYear = year;
				// prevent updates if the slider moves too fast
				clearTimeout(updateTimeout);
				updateTimeout = setTimeout(function() {
					showAllBetween(startYear, endYear);
				}, 1);
			});

			$(document).bind("slider-range-start", function(event, year) {
				startYear = year;
				// prevent updates if the slider moves too fast
				clearTimeout(updateTimeout);
				updateTimeout = setTimeout(function() {
					showAllBetween(startYear, endYear);
				}, 1);
			});
			*/

			dfd.resolve(map);
		});

		return dfd.promise();
	}

	/**
	 * Generates the layers for a given ride
	 */
	function _createRideLayers(rideName) {
		var baseLayer = {
			"id": rideName,
			"type": "line",
			"source": "vector",
			"source-layer": "ride_gpx_tracks",
			"filter": ["==", "name", rideName],
			"paint": {
				"line-color": "rgb(67, 222, 252)",
				"line-opacity": 0
			}
		};
	
		var topLayer = {
			"id": rideName + "-heat",
			"type": "line",
			"source": "vector",
			"source-layer": "ride_gpx_tracks",
			"filter": ["==", "name", rideName],
			"paint": {
				"line-color": "rgb(255, 255, 255)",
				"line-opacity": 0
			}
		};
	
		var highlightLayer = {
			"id": rideName + "-highlight",
			"type": "line",
			"source": "vector",
			"source-layer": "ride_gpx_tracks",
			"filter": ["==", "name", rideName],
			"paint": {
				"line-color": "rgb(250, 35, 241)",
				"line-width": 3,
				"line-blur": 2,
				"line-opacity": 0
			}
		};
	
		// add the active classes
		baseLayer["paint." + rideName + "_active"] = {"line-opacity": 0.4}
		topLayer["paint." + rideName + "_active"] = {"line-opacity": 0.1}
		highlightLayer["paint." + rideName + "_highlight"] = {"line-opacity": 1}
	
		return { 
			"baseLayer": baseLayer, 
			"topLayer": topLayer, 
			"highlightLayer": highlightLayer
		};
	}

	/**
	 * Create all ride layers
	 */
	function _createAllRideLayers() {
		var 
		    rideBaseLayers = [],
		    rideTopLayers = [],
		    rideHighlightLayers = [],
		    allLayers = [];
		
		for (var i=0;i<rideMap.rides.length;i++) {
			var rideName = rideMap.rides[i];
			var rideLayers = _createRideLayers(rideName);
			
			rideBaseLayers.push(rideLayers.baseLayer);
			rideTopLayers.push(rideLayers.topLayer);
			rideHighlightLayers.push(rideLayers.highlightLayer);
		}
		
		allLayers = allLayers.concat(rideBaseLayers, rideTopLayers, rideHighlightLayers);
	
		return allLayers;
	}

	var updateTimeout,
	    needsUpdate = true,
	    lastEndYear,
	    lastStartYear;

	/**
	 * Shows all rides for the specified period
	 */
	/* ToDo:
	function showAllBetween(startDate, endDate) {

		// ensure updates at a max of 100ms frequency
		lastStartDate = startDate;
		lastEndDate = endDate;
		if (!needsUpdate) return;
		needsUpdate = false;

		updateTimeout = setTimeout(function() {
			needsUpdate = true;

			if (lastStartDate != startDate || lastEndDate != endDate) {
				showAllBetween(lastStartDate, lastEndDate);
			}
		}, 100);

		var classes = [];
		for(var i = startYear; i <= endYear; i++) {
			classes.push("active-" + i);
		}

		// show the selected layers 
		classes = [];
		for(var j = minYear; j < startYear; j++) {
			classes.push("active-" + j);
		}
		for(var j = endYear+1; j < maxYear; j++) {
			classes.push("active-" + j);
		}

		map.style.setClasses(classes); 
	} */
})();