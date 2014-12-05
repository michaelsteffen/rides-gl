(function() {
	"use strict";

	rideMap.buildGraph = buildGraph;

	var margin;
	var width;
	var height;
	var x, xAxis, gXAxis;
	var y, yAxis, gYAxis;
	var allBars;
	var rightBuffer;
	var dayWidth;
	var rides, dates;
	var rangeSlider;

	var formatDate = d3.time.format("%b %-d");
	var barID = d3.time.format("bar-%Y%m%d");

	/**
	 * Builds the base DOM structure for the Graph.
	 * Loads the data and populates the UI when ready.
	 */
	function buildGraph() {
		// Set the dimensions of the canvas / graph
		margin = {top: 0, right: 45, bottom: 30, left: 45};
		width = $(window).width() - margin.left - margin.right;
		height = 110 - margin.top - margin.bottom;
		
		// since the rightmost bar has an actual width, we need a small buffer after axis end
		rightBuffer = 5;
		
		rides = rideMap.rides;
		dates = rideMap.dates;

		// calculate the width of each bar
		dayWidth = (width-rightBuffer)/dates.length;

		// Add an SVG element with the desired dimensions and margin.
		var canvas = d3.select("#map-controls")
			.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.attr("id", "graph")
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var axesLayer = canvas.append("g").attr("class", "axes-layer");
		var sliderLayer = canvas.append("g").attr("class", "slider-layer");
		var graphLayer = canvas.append("g").attr("class", "graph-layer");

		// Set the scales
		x = d3.time.scale()
			.range([0, width-rightBuffer])
			.domain(d3.extent(rides, function(d) { return d.date; }))
			.nice(d3.time.hour);

		y = d3.scale.linear()
			.range([height, 0])
			.domain([0, d3.max(dates, function(d) { return d.length; })])
			.nice();

		// Define the axes
		xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom")
			.tickSize(4)
			.tickFormat(_xTickFormat)
			.ticks(d3.time.months);

		yAxis = d3.svg.axis()
			.scale(y)
			.tickSize(width)
			.orient("right")
			.tickFormat(function(d) { 
				if ( d > 0 && d % 100 == 0) {
					return d + " miles";
				} else if ( d > 0 && d % 50 == 0) {
					return d;
				} else {
					return "";
				}
			})
			.tickValues([0,25,50,75,100]);

		// Add the X Axis
		gXAxis = axesLayer.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);

		// Add the Y Axis
		gYAxis = axesLayer.append("g")
			.attr("class", "y axis")
			.call(yAxis)
			.call(_customYTicks);
				
		// add the bars
		allBars = graphLayer.selectAll(".bar")
      .data(dates)
			.enter().append("rect")
			.attr("class", "bar")
			.attr("id", function(d) { return barID(d.date); })
      .attr("x", function(d) { return x(d.date)-dayWidth/2; })
      .attr("width", dayWidth)
      .attr("y", height)
      .attr("height", 0)
      .on("mouseenter", _barOnMouseEnter)
      .on("mouseleave", _barOnMouseLeave);
    
    // animate the bar entry
    var maxLen = d3.max(dates, function(d) { return d.length; });
    graphLayer.selectAll(".bar")
      .transition()
      .duration( function(d) { return 1500*d.length/maxLen; } )
      .delay( function(d,i) { return i/dates.length * 1000; } )
      .attr("y", function(d) { return y(d.length); })
      .attr("height", function(d) { return height - y(d.length); });

		// build the range slider
	  rangeSlider = rideMap.rangeSlider = _buildRangeSlider(sliderLayer);

		// accept highlight events thrown by the map
		$(document).bind("map-add-highlight", function(event, rideNames) {
			var bars = _getBarsFromRideNames(rideNames);
			_addHighlight(bars);
		});
		
		$(document).bind("map-set-highlight", function(event, rideNames) {
			var bars = _getBarsFromRideNames(rideNames);
			_setHighlight(bars);
		});

		// update the graph on resize
		d3.select(window).on('resize', function() {
			width = $(window).width() - margin.left - margin.right;
			dayWidth = (width-rightBuffer)/dates.length;

			// get the slider positions before we update the x axis
			var startDate = rangeSlider.start().value();
			var endDate = rangeSlider.end().value();

			// update the X axis
			x.range([0, width-rightBuffer]);
			gXAxis.call(xAxis);
			
			// update the y axis (really, the 'ticks' that form the grid)
			yAxis.tickSize(width)
			gYAxis.call(yAxis).call(_customYTicks);

			// update the slider
			rangeSlider.slideTo(startDate, endDate);
			
			// update the bars
			graphLayer.selectAll(".bar")
				.attr("width", dayWidth)
				.attr("x", function(d) { return x(d.date); });
		});
	}

	/**
	 * Adjusts the position of the ticks on the Y axis
	 */
	function _customYTicks(g) {
	  g.selectAll("text")
		  .attr("x", 2)
		  .attr("dy", -3);
	}
	
	function _xTickFormat(d) {
		if (width >= 750) {
			if (d.getMonth() == 0) return (d3.time.format("Jan '%y"))(d);
			return (d3.time.format("%b"))(d);
		} else {
			if (d.getMonth() == 0) return (d3.time.format("'%y"))(d);
			return (d3.time.format("%b"))(d)[0];
		}
	}
	
	function _barOnMouseEnter(d) {
		if (d3.event.shiftKey) {
			_addHighlight(['#' + this.id]);
			$(document).trigger("graph-add-highlight", [d.rides]);
		} else {
			_setHighlight(['#' + this.id]);
			$(document).trigger("graph-set-highlight", [d.rides]);
		}
	}
	
	function _barOnMouseLeave(d) {
		if (!d3.event.shiftKey) {
			_setHighlight([]);
			$(document).trigger("graph-set-highlight", [[]]);
		}
	}

	function _addHighlight(bars) {
		// update the graph
		var barList = bars.join(', ');
		d3.selectAll(barList).classed("highlight", true);
	}
	
	function _setHighlight(bars) {
		// update the graph
		d3.selectAll(".bar").classed("highlight", false);
		if (bars.length) {
			var barList = bars.join(', ');
			d3.selectAll(barList).classed("highlight", true);
		}
	}
	
	function _getBarsFromRideNames(rideNames) {
		var bars = [];
		for (var i=0; i<rideNames.length; i++) {
			var rideName = rideNames[i];
			var id = barID(rideMap.rideToDate[rideName]);
			bars.push('#' + id);
		}
		
		return bars;
	}
		
	function _buildRangeSlider(canvas) {
		var startDate = d3.time.day.offset(dates[dates.length-1].date, -90);
		var endDate = dates[dates.length-1].date;
		
		// build the brush
		var brush = d3.svg.brush()
  		.x(x)
    	.extent([startDate, endDate])
    	.on("brush", updateSelection);
    	
    var brushg = canvas.append("g")
    	.attr("class", "range-slider")
    	.call(brush);
		
		// build the selection window
		var selection =	brushg.selectAll("rect")
			.attr("height", height + margin.top);
		
		// build the drag handles 
		var startSlider = _buildSlider("range-start", startDate);
		var endSlider = _buildSlider("range-end", endDate);
		var lastUpdateStart, lastUpdateEnd;

		// initialize the selected bars and rides
		updateSelection();

		/**
		 * Slides the selector to a new position using a transition.
		 * Callback, optional, is called at the end of the transition.
		 * Tween, also optional, is called at each frame in the transition with value
		 *  t, which varies between 0 and 1.
		 * Accepts either date objects or strings for start and end date so it 
		 * can easily be called directly from the webpage
		 */
		function slideTo(newStartDate, newEndDate, duration, ease, callback, customTween) {
			var ease = ease || "cubic-in-out";
			var customTween = customTween || null;

			newStartDate = _resolveDate(newStartDate);
			newEndDate = _resolveDate(newEndDate);
			
			if (!(newStartDate && newEndDate)) return;
			
			if (duration) {
				brushg.transition()
					.duration(duration)
					.ease(ease)
					.call(brush.extent([newStartDate,newEndDate]))
					.call(brush.event)
					.tween("customTween", function () { return customTween; })
					.each("end", callback);
			} else {
				brushg.call(brush.extent([newStartDate, newEndDate]));
				updateSelection();
			}
		}
		
		/**
		 * Updates the bar colors based on the selection marquee
		 */
		function updateSelection() {
			var startDate = startSlider.value();
			var endDate = endSlider.value();
			
			if (lastUpdateStart === startDate && lastUpdateEnd === endDate) return;	
			allBars.classed("select", function(d) { return startDate <= d.date && d.date <= endDate; });
				
			startSlider.update();
			endSlider.update();	
			
			lastUpdateStart = startDate;
			lastUpdateEnd = endDate; 
			
			// fire update event
			$(document).trigger("graph-slider-move", [startDate, endDate]);
		}
		
		function _resolveDate(inDate) {
			var dates = rideMap.dates;
			
			if (typeof inDate === 'number' && Math.abs(inDate) < dates.length) {
				if (inDate > dates.length) inDate = -1;
				if (inDate < -dates.length) inDate = 0;
				if (inDate >= 0 ) {
					return dates[inDate].date;
				} else {
					return dates[dates.length + inDate].date;
				} 
			} else if (typeof inDate === 'string' || inDate instanceof Date) {
				var date = (typeof inDate === 'string') ? new Date(inDate) : inDate;
				if (date > dates[dates.length-1].date) date = dates[dates.length-1].date;
				if (date < dates[0].date) date = dates[0].date;
				return date;
			}
			
			return;
		}

		function _buildSlider(sliderName, date) {
			if (sliderName === "range-start") {
				var handleSelector = ".w";
				var extentIndex = 0;
				var translate = "translate(-40," + height + ")";
				var flipH = "";
				var textTranslate = "translate(-20," + (height+14) + ")";
			} else if (sliderName === "range-end") {
				var handleSelector = ".e";
				var extentIndex = 1;
				var translate = "translate(40," + height + ")";
				var flipH = " scale(-1,1)";
				var textTranslate = "translate(20," + (height+14) + ")";
			} else {
				return;
			}
			
			// path for the slider shape
			var path = "m0,0l40,0l0,30l-40,-10l0,-20z"
			
			var sliderg = brushg.selectAll(".resize"+handleSelector).append("g");
			
			sliderg.append("path")
				.attr("id", sliderName)
				.attr("transform", translate + flipH)
				.attr("d", path);
			
			var sliderText = sliderg.append("text")
				.attr("class", "slider-date")
				.attr("transform", textTranslate)
				.attr("text-anchor", "middle")

			// init the marker:
			updateSlider();
			
			/**
			 * Updates the slider text to match the current position.
			 */
			function updateSlider() {
				sliderText.text(formatDate(value()));
			}

			function value() {
				return (brush.extent())[extentIndex];
			}

			return {
				update: updateSlider,
				value: value
			};
			
		} //_buildSlider

		// RangeSlider interface
		return {
			updateSelection: updateSelection,
			slideTo: slideTo,
			start: function() { return startSlider; },
			end: function() { return endSlider; }
		}
	} // _buildRangeSlider
})();