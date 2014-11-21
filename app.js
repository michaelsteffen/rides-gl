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
	rideMap.animateBuild = animateBuild;
	rideMap.animateSlidingWindow = animateSlidingWindow;

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
			
			rideMap.rides = data;
			
			// set up rideMap.dates as an array;
			// the index is the # of days after the first ride
			// (we are trusting that the input data is sorted by date)
			
			// midnight on the day of the first ride . . .
			var firstDate = d3.time.day.floor(new Date(data[0].date));
 
			for (var i=0; i < data.length; i++) {
				var ride = data[i];
				var date = d3.time.day.floor(new Date(ride.date));
				ride.date = date;
				// number of midnights since the firstDate
				var index = d3.time.days(firstDate, date).length;
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
					if (index == lastIndex) return;
					
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
	
	function _doBigButton() {
		if (rideMap.mapState == 'clear') {
			rideMap.mapState = 'playing';
			$('#bigbutton')
				.removeClass('pure-button-primary')
				.html('Playing . . .');
			console.time("animation");
			_showNextRide();
		} else if (rideMap.mapState == 'complete') {
			rideMap.map.style.setClassList([]);
			rideMap.mapState = 'clear';
			rideMap.currentRide = -1;
			$('#bigbutton').html('Play');
		}
	}
	
	function _showNextRide() {
		if (rideMap.currentRide < rideMap.rides.length - 1) {
			rideMap.currentRide++;
		
			// use getClassList and setClassList to change multiple classes at once 
			var classes = rideMap.map.style.getClassList();	  
			
			/* if (rideMap.currentRide >= 0) {
				index = classes.indexOf(rideMap.rides[rideMap.currentRide-1] + '_highlight');
				classes.splice(index, 1);
			} 
			classes.push(rideMap.rides[rideMap.currentRide] + '_highlight'); */
			classes.push(rideMap.rides[rideMap.currentRide].name + '_active');
			rideMap.map.style.setClassList(classes);
			window.setTimeout(_showNextRide, 1);
		} else {
			//rideMap.map.style.removeClass(rideMap.rides[rideMap.currentRide] + '_highlight');
			console.timeEnd("animation");
			rideMap.mapState = 'complete';
			$('#bigbutton')
				.addClass('pure-button-primary')
				.html('Clear');
		}
	}
})();