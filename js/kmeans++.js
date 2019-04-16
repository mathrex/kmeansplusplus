Array.prototype.choice = function () {
	var len = this.length;
	var choiceIndex = Math.floor(Math.random() * len)
	return this[choiceIndex];
};

var Point = function(x, y, group, title){
	/*Init default values*/
	x = typeof x !== 'undefined' ? x : 0.0;
   	y = typeof y !== 'undefined' ? y : 0.0;	
   	group = typeof group !== 'undefined' ? group : 0;
	title = typeof title !== 'undefined' ? title : "";
	
	this.x = x;
	this.y = y;
	this.group = group;
	this.title = title;
}

function generatePoints(npoints, radius){
	var points = [];	
	for(i= 0; i < npoints; i++){
		var r = Math.random() * radius,
		ang = Math.random() * 2 * Math.PI;
		var point = new Point( r * Math.cos(ang), r * Math.sin(ang));
		points.push(point);
	}
	return points;
}

function getPoints(urlOrNr, callback){
	if(isNaN(urlOrNr)){
		var points;
		
		$.getJSON(urlOrNr, function(json) {
			points = [];
			json.forEach(function(dp){
			points.push(new Point(dp.long, dp.lat, 0, dp.name));
			});
			callback(points);
		});
	}
	else{
		var npoints = +urlOrNr;
		var points = generatePoints(npoints, 10);
		callback(points);
	}
}
function generateEmptyPoints(npoints){
	var points = [];	
	for(i= 0; i < npoints; i++){
		var point = new Point();
		points.push(point);
	}
	return points;
}

function dist2D(a, b){
	return Math.sqrt( (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) );
}
	
function nearestClusterCenter(point, clusterCenters){
	
	
	var minIndex = point.group,
		minDist = Infinity;
	clusterCenters.forEach(function(clusterCenter, i){
		var dist = dist2D(point, clusterCenter);
		if(minDist > dist){
			minDist = dist;
			minIndex = i;
		}
	});

	return [minIndex, minDist];
}

function kpp(points, clusterCenters){
	var randChoice = clusterCenters.choice();
	clusterCenters[0] = new Point(randChoice.x, randChoice.y, randChoice.group, randChoice.title);
	var dists = [];
	for( var i=0; i < points.length; i++){
		dists.push(0.0);	
	}

	for( var i = 1; i < clusterCenters.length; i++){
		var sum = 0;
		points.forEach(function(p, j){
			dists[j] = nearestClusterCenter(p, clusterCenters.slice(0, i))[1];
			sum += dists[j];
		});

		sum *= Math.random();
		for(var j = 0; j < dists.length; j++){
			sum -= dists[j];
			if(sum > 0)
				continue;
			clusterCenters[i] = new Point(points[j].x, points[j].y, points[j].group, points[j].title);
			break;
		}
	}

	points.forEach(function(point){
		point.group = nearestClusterCenter(point, clusterCenters)[0];
	});
	
}

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

function random(points, nclusters){
	shuffle(points);
	
	clusterCenters = points.slice(0, nclusters);
	points.forEach(function(p){
		var minIndex = nearestClusterCenter(p, clusterCenters)[0];
		if(minIndex != p.group){
			p.group = minIndex;
		}
	});
	return clusterCenters;
}
function lloyd(points, nclusters, type){
	var clusterCenters = generateEmptyPoints(nclusters);
	if(type == "random")
		clusterCenters = random(points, nclusters);
	else
		kpp(points, clusterCenters);
	
		
	var lenpts10 = points.length >> 10;
	
	var changed = 0;
	var iteration = 0;
	d3.select("#next").attr("value", iteration + " Next")
	d3.select("#next").on("click", function(){
		iteration++;
		d3.select("#next").attr("value", iteration + " Next")
		
		clusterCenters.forEach(function(cc){
			cc.x = 0;
			cc.y = 0;
			cc.group = 0;
		});
		
		points.forEach(function(p){
			clusterCenters[p.group].group += 1;
			clusterCenters[p.group].x += p.x;
			clusterCenters[p.group].y += p.y;			
		});
		
		clusterCenters.forEach(function(cc){
			cc.x /= cc.group;
			cc.y /= cc.group;
		});
		
		changed = 0;
		points.forEach(function(p){
			var minIndex = nearestClusterCenter(p, clusterCenters)[0];
			if(minIndex != p.group){
				changed++;
				p.group = minIndex;
			}
		});
		
		clusterCenters.forEach(function(cc, i){
		cc.group = i;
		});
		removePoints();
		showPoints(points, clusterCenters);
		if(changed <= lenpts10)
			console.log("Not changed");
		
	});
	
	clusterCenters.forEach(function(cc, i){
		cc.group = i;
	});
	
	return clusterCenters;
}

function printPoints(points){
	points.forEach(function(p){
		console.log(p.x + " " + p.y + " " + p.group);
	})
}

function computePhi(points, clusterCenters){
	var phi = 0;
	points.forEach(function(p){
		var d = dist2D(p, clusterCenters[p.group]);
		phi += d;
	});
	document.getElementById("info").innerHTML = "Phi: " + phi;
}
function showPoints(points, clusterCenters){
	computePhi(points, clusterCenters);
	var maxX = -Infinity, minX = Infinity,
	maxY = -Infinity, minY = Infinity;
	points.forEach(function(p){
		if(+p.x < minX)
			minX = p.x;
		if(+p.x > maxX)
			maxX = p.x;
		if(+p.y < minY)
			minY = p.y;
		if(+p.y > maxY)
			maxY = p.y;
	});
	
	var width = d3.select("#visualisation").style("width");
	
	width = parseInt(width);
	var height = width * (maxY - minY) / (maxX - minX);
	
	var sh = screen.height/1.2;
	if(height > sh){
		var ratio = sh/height;
		height *= ratio;
		width *= ratio;
	}
	
	var scaleX = d3.scale.linear()
	            .domain([minX, maxX])
	            .range([width/20, width]);
				
	var scaleY = d3.scale.linear()
	            .domain([minY, maxY])
	            .range([height, height/20]);
				
	d3.select("#visualisation")
		.attr("width", width)
		.attr("height", height);
	// console.log(maxX, minX, minY, maxY);
	
	var color = d3.scale.category10();
	var vis = svg;
	points.forEach(function(p){
		var g = vis.append("g");
		g.append('circle')
		.attr("cx", scaleX(p.x))
		.attr("cy", scaleY(p.y))
		.attr("r", "3")
		.style("fill", color(p.group));
		
		g.append("title")
		.text(p.title);	
	})
	clusterCenters.forEach(function(p){
		vis
		.append('circle')
		.attr("cx", scaleX(p.x))
		.attr("cy", scaleY(p.y))
		.attr("r", "10")
		.style("fill", color(p.group))
		.style("stroke", "black")
		.style("stroke-width", "2px");
		
	});
	vis.call(zoom);
}

function removePoints(){
	d3.selectAll("svg circle").remove();
}

function main(npoints, k, type, seed){
	Math.seedrandom(seed);
	//var points = generatePoints(npoints, 10);
	
	getPoints(npoints, function(points){
		Math.seedrandom();
		var clusterCenters = lloyd(points, k, type);
		showPoints(points, clusterCenters);
	});
	
	//printPoints(points);
	//console.log("12345");
	//printPoints(clusterCenters);
	
}
function testKpp(){
	var points = generatePoints(10, 10);
	var clusterCenters = generateEmptyPoints(4);
	kpp(points, clusterCenters);
	console.log(points);
	console.log(clusterCenters);
	
}

var zoom = d3.behavior.zoom()
	.scaleExtent([0.5, 10])
	.on("zoom", zoomed);

function zoomed() {
	container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

var svg = d3.select("#visualisation").call(zoom);
var container = svg.append("g");
svg = container;

d3.select("#init-vis").on("click", function(){
	removePoints();
	var npoints = d3.select("#url-or-nr").node().value; 
	var k = d3.select("#k").node().value;
	var type = d3.select("#type").node().value; 
	var seed = d3.select("#seed").node().value; 
	
	main(npoints, +k, type, seed);
});