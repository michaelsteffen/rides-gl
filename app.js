var rideMap = {
	rides: [],
	dates: [],
	rideToDate: {},
	containerDiv: '#map',
	map: {},
	rangeSlider: {}
};

mapboxgl.accessToken = 'pk.eyJ1IjoibWFzMjIyIiwiYSI6Ikc2STF6MzAifQ.rRkEFqc17IcaQesSHxUV1w';

(function() {
	'use strict';

	rideMap.bootstrap = bootstrap;
	rideMap.getRideList = getRideList;
	rideMap.normDate = normDate;
	rideMap.dateIndex = dateIndex;
	rideMap.animateBuild = animateBuild;
	rideMap.animateSlidingWindow = animateSlidingWindow;
	
	var firstDate;

	/**
	 * Boostraps the ride map
	 */
	function bootstrap() {		
		if (mapboxgl.util.supported()) { 
			$.when(rideMap.getRideList())
				.then(rideMap.buildMap)
				.then(rideMap.buildGraph);
		} else {
			$('html').addClass('not-supported');
		}
	}
	
	function getRideList() {
		var dfd = new jQuery.Deferred();
		
		d3.json("rides.json", function(err, data) {
			if (err) throw err;
			
			// initialize rides array with the data
			var rides = rideMap.rides = data;
			
			// set firstDate
			// (here an immediately below we are trusting that the input data is sorted by date)
			firstDate = normDate(new Date(data[0].date));
 
 			// set up rideMap.dates as an array;
			// the index is the # of days after the firstDate
			for (var i=0; i < rides.length; i++) {
				var ride = rides[i];
				var date = normDate(new Date(ride.date));
				ride.date = date;
				var index = dateIndex(date);
				if (!rideMap.dates[index]) {
					rideMap.dates[index] = { 
						date: date,
						length: 0, 
						rides: [] 
					}; 
				}
				rideMap.dates[index].length += ride.length;
				rideMap.dates[index].rides.push(ride.name);
			}
			
			// fill in empty days to make sure there are no nulls
			for (var i=0; i < rideMap.dates.length; i++) {
				if (rideMap.dates[i] == null) {
					rideMap.dates[i] = { 
						date: d3.time.day.offset(firstDate, i),
						length: 0, 
						rides: [] 
					}; 
				}
			}
			
			// build ride->date crosswalk
			for (var i=0; i < data.length; i++) {
				var ride = data[i];
				rideMap.rideToDate[ride.name] = ride.date;
			}
			
			dfd.resolve(data);
		}); 
		
		return dfd.promise();
	}
	
	/**
	* Takes an arbitrary date and normalizes it to the prior midnight boundary. 
	*/
	function normDate(date) {
		return d3.time.day.floor(date);
	}
	
	/**
	* Takes a normalized date and returns the index in the dates array.
	* If the date is not normalized, the index may be off by one.
	*/
	function dateIndex(date) {
		// commenting out error checking for now to save a little time (probably silly)
		// if (!firstDate) return; 
		return d3.time.days(firstDate, date).length;
	}
	
	function animateBuild(duration, trailingRides) {
		var duration = duration || 60000;
		if (duration < 2000) duration = 2000;
		var dates = rideMap.dates;
		var interpIndex = d3.interpolateRound(0, dates.length-1);
		var lastIndex;
		
		rideMap.rangeSlider.slideTo(0, 1, 500, null, function() {
			window.setTimeout(function() {
				rideMap.rangeSlider.slideTo(0, -1, duration-1000, "linear", null, function(t) {
					// get the date based on where we are in the transition (t)
					var index = interpIndex(t);
					
					// bail if we haven't advanced a full date
					if (index === lastIndex) return;
					
					var startIndex = index - trailingRides;
					if (startIndex < 0) startIndex = 0;
					var rides = [];
					for (var i = startIndex; i <= index; i++) { 
						var rides = rides.concat(dates[i].rides);
					}
					
					// create mock highlight events from the graph and the map to cause
					// highlight updates on the other
					$(document).trigger("graph-set-highlight", [rides]);
					$(document).trigger("map-set-highlight", [rides]);
					lastIndex = index;
				});
			}, 500);
		});
	}
	
	function animateSlidingWindow(days, duration) {
		var days = days || 30;
		var duration = duration || 20000;
		if (duration < 2000) duration = 2000;
		
		rideMap.rangeSlider.slideTo(0, days, 500, null, function() {
			window.setTimeout(function() {
				rideMap.rangeSlider.slideTo(-(days+1), -1, duration-1000, "linear");
			}, 500);
		});
	}
})();