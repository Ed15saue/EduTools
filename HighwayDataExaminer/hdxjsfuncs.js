//
// HDX-specific Javascript functions
//
// Load and view data files related to Travel Mapping (TM), formerly
// Clinched Highway Mapping (CHM), related academic data sets.
//
// Primary author: Jim Teresco, Siena College, The College of Saint Rose
//
// Additional authors: Razie Fathi, Arjol Pengu, Maria Bamundo, Clarice Tarbay,
// Michael Dagostino, Abdul Samad, Eric Sauer

// some globals used here (map, waypoints, markers, etc) come from
// tmjsfuncs.js

// variables declared here are HDX-specific global variables

// Essentially an enum of possible states of the simulation, used to
// ensure that only things that should be done are permitted in a
// given state.  Any AV_ state implies that a graph is loaded.  
var hdxStates = {

    NO_DATA: 1,
    GRAPH_LOADED: 2,
    WPT_LOADED: 3,
    NMP_LOADED: 4,
    WPL_LOADED: 5,
    PTH_LOADED: 6,
    AV_SELECTED: 7,
    AV_RUNNING: 8,
    AV_PAUSED: 9,
    AV_COMPLETE: 10
};

// group of variables used by many or all algorithm visualizations
var hdxAV = {
    // current state of HDX
    status: hdxStates.NO_DATA,

    // delay (in ms) between visualization steps
    // default delay 50 should match the selected option in the speedChanger
    // and delay should be used for the amount of time in the future to use
    // for setTimeout calls
    delay: 50,

    // list of available AVs
    avList: [],
    
    // remember the currently-selected AV
    currentAV: null,
    
    // what was the most recent algorithm?
    previousAlgorithm: null,

    // reset values
    reset: function() {
	this.previousAlgorithm = null;
    },

    // some commonly-used document elements
    algStat: null,
    algOptions: null,
    startPause: null,
    
    // set the status and do any needed cleanup for that change
    setStatus(newStatus) {
	
	if (this.status == newStatus) {
	    return;
	}

	this.status = newStatus;
	switch (newStatus) {
	case hdxStates.GRAPH_LOADED:
	case hdxStates.WPT_LOADED:
	case hdxStates.PTH_LOADED:
	case hdxStates.NMP_LOADED:
	case hdxStates.WPL_LOADED:
	    this.algStat.innerHTML = "";
	    this.algOptions.innerHTML = "";
	    break;

	case hdxStates.AV_COMPLETE:
	    this.startPause.disabled = true;
	    this.startPause.innerHTML = "Start";
	    break;
	}
    },
    
    // are we paused?
    paused() {
	return this.status == hdxStates.AV_PAUSED;
    },

    // all setup that needs to happen on page load for HDX
    initOnLoad() {
	
	// populate the list of algorithms -- add new entries here
	this.avList.push(hdxNoAV);
	this.avList.push(hdxVertexExtremesSearchAV);
	this.avList.push(hdxEdgeExtremesSearchAV);
	this.avList.push(hdxGraphTraversalsAV);
	this.avList.push(hdxDijkstraAV);
	this.avList.push(hdxBFConvexHullAV);
	
	// populate the algorithm selection select with options
	// from the avList
	let s = document.getElementById("AlgorithmSelection");
	s.innerHTML = "";
	for (var i = 0; i < this.avList.length; i++) {
	    let av = this.avList[i];
	    s.innerHTML += '<option value="' + av.value +
		'">' + av.name + '</option>';	    
	}

	// make the "selected" div resizable, was function makeResize()
	$( "#selected" ).resizable();
	var div = document.createElement("div");
	div.setAttribute("id", "resize");
	document.getElementById("selected").appendChild(div);
	$( "#contents_table" ).resizable();

	// initalize table for upper right side dropdown
	toggleTable();

	// set up side panel
	sidePanel();

	// set up main area, was function mainArea()
	var main = document.createElement("div");
	main.setAttribute("id", "main");
	main.appendChild(document.getElementById("map"));
	main.appendChild(document.getElementById("togglecontents_table"));
	//main.appendChild(document.getElementById("distUnits"));
	main.appendChild(document.getElementById("selected"));
	main.appendChild(document.getElementById("options"));
	main.appendChild(document.getElementById("pointbox"));
	main.appendChild(document.getElementById("AlgorithmVisualization"));
	main.appendChild(document.getElementById("controlbox"));
	main.appendChild(document.getElementById("contents_table"));
	main.appendChild(document.getElementById("panelBtn"));
	main.appendChild(document.getElementById("toggleselected"));
	document.body.appendChild(main);

	// set up some references to commonly-used document elements
	this.algStat = document.getElementById("algorithmStatus");
	this.algOptions = document.getElementById("algorithmOptions");
	this.startPause = document.getElementById("startPauseButton");

	// register the HDX-specific event handler for waypoint clicks
	registerMarkerClickListener(labelClickHDX);
    }
};

/**********************************************************************
 * General AV functions
 **********************************************************************/
// speedChanger dropdown callback
function highlighter (x, color){
    document.getElementById(x).style.color = color;
}
function resetHighlight(x){
    highlighter(x, "black");
}
function clearForm(f){
    //enables the the start/pause and algorithm selection buttons/drop down
    document.getElementById("startPauseButton").disabled = false;
    document.getElementById("AlgorithmSelection").disabled = false;
    var frm_elements = f.elements;
    
    //clears the form
    for (i = 0; i < frm_elements.length; i++)
{
    field_type = frm_elements[i].type.toLowerCase();
    switch (field_type)
    {
    case "text":
    case "password":
    case "textarea":
    case "hidden":
        frm_elements[i].value = "";
        break;
    case "radio":
    case "checkbox":
        if (frm_elements[i].checked)
        {
            frm_elements[i].checked = false;
        }
        break;
    case "select-one":
    case "select-multi":
    
        frm_elements[i].selectedIndex = -1;
        break;
    default:
        break;
    }
}
    if(hdxAV.status == hdxStates.AV_COMPLETE || hdxAV.paused() == true){
    
    //clearrs the ui
     hdxAV.setStatus(hdxStates.GRAPH_LOADED);
     hdxVertexExtremesSearchAV.cleanupUI();
     hdxBFConvexHullAV.cleanupUI();
     hdxDijkstraAV.cleanupUI();
     hdxGraphTraversalsAV.cleanupUI();
     hdxEdgeExtremesSearchAV.cleanupUI();
     document.getElementById("connection").style.display = "table-row";
        //resets the table of waypoints
     for (var i = 0; i < waypoints.length; i++) {
            var row = document.getElementById("waypoint"+i);
            markers[i].addTo(map);
            updateMarkerAndTable(i, visualSettings.reset, 0, false);
    }
        
    }
    
}
function speedChanged() {

    var speedChanger = document.getElementById("speedChanger");
    hdxAV.delay = speedChanger.options[speedChanger.selectedIndex].value;
}

// algorithm visualization color settings and other parameters
var visualSettings = {
    // first, some used by many algorithms
    reset: {
      color: "#ffffff",
        textColor: "black",
        scale: 2,
        name: "Vertices",
        value: 0,
        weight: 5,
        opacity: .6
    },
    undiscovered: {
        color: "#202020",
        textColor: "#e0e0e0",
        scale: 4,
	name: "undiscovered", 
	value: 0,
	weight: 5,
	opacity: 0.6
    },
    visiting: {
        color: "yellow",
        textColor: "black",
        scale: 8,
	name: "visiting",
	value: 0,
	weight: 8,
	opacity: 0.8
    },
    leader: {
        color: "red",
        textColor: "white",
        scale: 6,
	name: "leader",
	value: 0
    },
    discarded: {
        color: "#a0a0a0",
        textColor: "black",
        scale: 2,
	name: "discarded",
	value: 0,
	weight: 5,
	opacity: 0.5
    },

    // these are in graph traversals and Dijkstra's so far
    discardedOnDiscovery: {
        color: "#f0a0a0",
        textColor: "black",
        scale: 4,
	name: "discardedOnDiscovery",
	value: 0,
	weight: 5,
	opacity: 0.6
    },
    startVertex: {
        color: "purple",
        textColor: "white",
        scale: 6,
	name: "startVertex",
	value: 0
    },
    endVertex: {
        color: "violet",
        textColor: "white",
        scale: 6,
	name: "endVertex",
	value: 0
    },

    // both vertex and edge search
    shortLabelLeader: {
        color: "#654321",
        textColor: "white",
        scale: 6,
	name: "shortLabelLeader",
	value: 0,
	weight: 8,
	opacity: 0.6
    },
    longLabelLeader: {
        color: "#006400",
        textColor: "white",
        scale: 6,
	name: "longLabelLeader",
	value: 0,
	weight: 8,
	opacity: 0.6
    },
    spanningTree: {
        color: "#0000a0",
        textColor: "white",
        scale: 4,
	name: "spanningTree",
	value: 0,
	weight: 4,
	opacity: 0.6
    },
    discovered: {
        color: "#00a000",
        textColor: "white",
        scale: 4,
	name: "discovered",
	value: 0
    },
    hoverV: {
	color: "#a0036b",
	textColor: "white",
	scale: 6,
	name: "hoverV",
	value: 0
    }
};

/* functions for algorithm visualization control panel */
var AVCPsuffix = "AVCPEntry";

/* add entry to the algorithm visualization control panel */
function addEntryToAVControlPanel(namePrefix, vs) {
    
    let avControlTbody = document.getElementById('AVControlPanel');
    let infoBox = document.createElement('td');
    let infoBoxtr= document.createElement('tr');
    infoBox.setAttribute('id', namePrefix + AVCPsuffix);
    infoBox.setAttribute('style', "color:" + vs.textColor +
			 "; background-color:" + vs.color);
    infoBoxtr.appendChild(infoBox);
    avControlTbody.appendChild(infoBoxtr);
}

/* remove entry from algorithm visualization control panel */
function removeEntryFromAVControlPanel(namePrefix) {

    let avControlTbody = document.getElementById('AVControlPanel');
    let infoBox = document.getElementById(namePrefix + AVCPsuffix);
    if (infoBox != null) {
	let infoBoxtr= infoBox.parentNode;
	avControlTbody.removeChild(infoBoxtr);
    }
}

/* set the HTML of an AV control panel entry */
function updateAVControlEntry(namePrefix, text) {

    document.getElementById(namePrefix + AVCPsuffix).innerHTML = text;
}

/* set the visualSettings of an AV control panel entry */
function updateAVControlVisualSettings(namePrefix, vs) {

    let infoBox = document.getElementById(namePrefix + AVCPsuffix);
    infoBox.setAttribute('style', "color:" + vs.textColor +
			 "; background-color:" + vs.color);
}

/* get the document element of an AV control entry */
function getAVControlEntryDocumentElement(namePrefix) {

    return document.getElementById(namePrefix + AVCPsuffix);
}

/* Support for selection of a vertex (such as a starting or ending
   vertex for a traversal or search) by clicking on a waypoint on
   the map or an entry in the waypoint table.  The startSelection
   method should be set as the onfocus event handler for a selector
   used to store vertex numbers for any purpose in an algorithm.

   Based on code originally developed by Arjol Pengu, Summer 2017. 
*/
var hdxVertexSelector = {

    // the string to find the selector to fill in with
    // a vertex number, if null, no selection is in process
    selector: "",

    // function to call to start the selection (when the
    // selector is clicked)
    startSelection(label) {
	//alert("startSelection: " + label);
	this.selector = label;
    },

    // the actual event handler function to set the value
    select(vNum) {
	//alert("select: " + vNum);
	if (this.selector != "") {
	    let v = document.getElementById(this.selector);
	    v.value = vNum;
	    // and update the label
	    waypointSelectorChanged(this.selector);
	}
	this.selector = "";
    }
};

// a function to build HTML to insert a vertex/waypoint selector
// component
// id is the HTML element id for the input
// label is the label for the control
// initVal is the waypoint number to use for initialization
function buildWaypointSelector(id,label,initVal) {

    return label + ' <input id="' + id +
	'" onfocus="hdxVertexSelector.startSelection(\'' + id +
	'\')" type="number" value="' + initVal + '" min="0" max="' +
	(waypoints.length-1) + '" size="6" style="width: 7em" ' +
	'onchange="waypointSelectorChanged(\'' + id + '\')"' +
	'/><span id="' + id + 'Label">' + waypoints[initVal].label +
	'</span>';
}

// event handler for waypoint selectors
function waypointSelectorChanged(id) {

    let vNum = document.getElementById(id).value;
    //let vNum = document.querySelector(id).value;
    document.getElementById(id + "Label").innerHTML = waypoints[vNum].label;
}

// variables and functions to highlight waypoints and connections
// when the mouse hovers over them
// TODO: these can go into an object
var vcolor, vtext, vicon;
var ecolor, etext, edge, edgew;

function hoverV(i, bool) {
    if ((bool && hdxAV.paused()) || !bool) {
	vicon = markers[i].options.icon;
	vcolor = document.getElementById("waypoint"+i).style.backgroundColor;
	vtext = document.getElementById("waypoint"+i).style.color;
	updateMarkerAndTable(i, visualSettings.hoverV, 0, false);
    }
}

function hoverEndV(i, bool) {
    if ((bool && hdxAV.paused()) || !bool) {
	markers[i].setIcon(vicon);
	document.getElementById("waypoint"+i).style.backgroundColor = vcolor;
	document.getElementById("waypoint"+i).style.color = vtext;
	if ($("#l"+i).length > 0) {
	    document.getElementById("l"+i).style.backgroundColor = vcolor;
	}
	if ($("#di"+i).length > 0) {
	    document.getElementById("di"+i).style.backgroundColor = vcolor;
	    document.getElementById("di"+i).style.color = vtext;
	}
    }
}

function hoverE(event, i) {
    ecolor = event.target.parentNode.style.backgroundColor;
    etext = event.target.parentNode.style.color;
    event.target.parentNode.style.color = visualSettings.hoverV.textColor;
    event.target.parentNode.style.backgroundColor = visualSettings.hoverV.color
    edge = connections[i].options.color;
    edgew = connections[i].options.opacity;
    connections[i].setStyle({
        color: visualSettings.hoverV.color,
	opacity: 0.7
    });
}

function hoverEndE(event, i) {
    connections[i].setStyle({
        color: edge,
	opacity: edgew
    });
    event.target.parentNode.style.color = etext;
    event.target.parentNode.style.backgroundColor = ecolor;
}

// special HDX version of the label click event handler that is
// called by the general TM addMarker, as it is registered
// by the registerMarkerClickListener call in updateMap
function labelClickHDX(i) {

    // handle vertex control selection
    hdxVertexSelector.select(i);

    // standard map center/infowindow display
    map.panTo([waypoints[i].lat, waypoints[i].lon]);
}


function changeUnits(event) {
    prevUnit = curUnit;
    curUnit = event.target.value;
    if (event.target.value == "miles") {
	changeUnitsInner("feet", "km", "meters", .000189394, .621371, .000621371);
    }
    else if (event.target.value == "feet") {
	changeUnitsInner("miles", "km", "meters", 5280, 3280.84, 3.28084);
    }
    else if (event.target.value == "meters") {
	changeUnitsInner("feet", "km", "miles", .3048, 1000, 1609.34);	
    }
    else if (event.target.value == "km") {
	changeUnitsInner("feet", "meters", "miles", .0003048, .001, 1.60934);
    }
}

function changeUnitsInner(un1, un2, un3, mult1, mult2, mult3) {
    loopChangeUnits(un1, mult1);
    loopChangeUnits(un2, mult2);
    loopChangeUnits(un3, mult3);
}

function loopChangeUnits(oldUnit, mult) {
    var arr = document.getElementsByClassName(oldUnit);
    for (var i = arr.length-1; i >= 0; i--) {
	if (arr[i].innerHTML.indexOf(oldUnit) == -1)
	    arr[i].innerHTML =
	    Math.round(parseFloat(arr[i].innerHTML)*mult*1000)/1000;
	else
	    arr[i].innerHTML =
	    Math.round(parseFloat(arr[i].innerHTML.substring(0, (arr[i].innerHTML.length-1-oldUnit.length)))*mult*1000)/1000+" "+curUnit;
	arr[i].classList.add(curUnit);
	arr[i].classList.remove(oldUnit);		
    }	
}
var curUnit = "miles";
var prevUnit;

function generateUnit(lat1, lon1, lat2, lon2) {
    prevUnit = curUnit;
    curUnit = document.getElementById("distUnits").value;
    if (curUnit == "miles") {
	return Math.round(distanceInMiles(lat1, lon1, lat2, lon2)*1000)/1000 +
	    " miles";
    }
    else if (curUnit == "feet") {
	return Math.round(distanceInFeet(lat1, lon1, lat2, lon2)*1000)/1000 +
	    " feet";
    }
    else if (curUnit == "meters") {
	return Math.round(distanceInFeet(lat1, lon1, lat2, lon2)*.3048*1000)/1000
	    + " meters";
    }
    else if (curUnit == "km") {
	return Math.round(distanceInFeet(lat1, lon1, lat2, lon2)*.0003048*1000)/1000
	    + " km";
    }
}

function convertMiles(num) {
    if (curUnit == "feet") {
	return Math.round(num*5280*1000)/1000;
    }
    else if (curUnit == "meters") {
	return Math.round(num*1609.34*1000)/1000;
    }
    else if (curUnit == "km") {
	return Math.round(num*1.60934*1000)/1000;
    }
    else {
	return Math.round(num*1000)/1000;
    }
}

// function to set the waypoint color, scale, and table entry
// using an entry passed in from the visualSettings
// optionally hide also by setting display to none
function updateMarkerAndTable(waypointNum, vs, zIndex, hideTableLine) {

   var options = {
       iconShape: 'circle-dot',
       iconAnchor: [vs.scale/2, vs.scale/2],
       borderWidth: vs.scale,
       borderColor: vs.color
       };

    var icon = L.BeautifyIcon.icon(options);
    markers[waypointNum].setIcon(icon);
    markers[waypointNum].setZIndexOffset(2000+zIndex);
    var row = document.getElementById("waypoint"+waypointNum);
    row.style.backgroundColor = vs.color;
    row.style.color = vs.textColor;
    if (hideTableLine) {
        row.style.display = "none";
    }
    else if(hideTableLine == false){
       row.style.display = "table-row";
   }

    // remaining code belongs elsewhere or is now obsolete...
    /*
    if ($("#l"+waypointNum).length > 0) {
	document.getElementById("l"+(waypointNum)).style.backgroundColor = vs.color;
    }
    if ($("#di"+waypointNum).length > 0) {
	document.getElementById("di"+waypointNum).style.backgroundColor = vs.color;
	document.getElementById("di"+waypointNum).style.color = vs.textColor;
    }
    if (vs.color == "#0000a0") {
	var clone = row.cloneNode(true);
	clone.className = "blueRow";
	row.parentNode.appendChild(clone);
	row.parentNode.removeChild(row);		
    }
    if (vs.color == "#00a000") {
	var clone = row.cloneNode(true);
	row.parentNode.insertBefore(clone, row.parentNode.childNodes[1]);
	row.parentNode.removeChild(row);		
    }
    */
}

// function to set the edge color and table entry information
// based on the visual settings, optionally hide line
function updatePolylineAndTable(edgeNum, vs, hideTableLine) {

    let edge = graphEdges[edgeNum];
    connections[edgeNum].setStyle({
	color: vs.color,
	weight: vs.weight,
	opacity: vs.opacity});

    let row = document.getElementById("connection" + edgeNum);
    row.style.backgroundColor = vs.color;
    row.style.color = vs.textColor;
    if (hideTableLine) {
	row.style.display = "none";
    } 
}

// dummy AV entry for main menu
var hdxNoAV = {

    // entries for list of AVs
    value: "NONE",
    name: "Select an Algorithm",
    description: "No algorithm is selected, please select.",

    code: "Select an algorithm to view pseudocode.",
    
    // provide start, nextStep, setupUI, just in case buttons are
    // somehow active when this option is selected
    start() {

	alert("Please select an algorithm first.");
    },
    
    nextStep() {

	alert("Please select an algorithm first.");
    },

    setupUI() {},

    cleanupUI() {}
};

// vertex extremes search

// helper functions

// function to create the table entry for the leader for extreme points
function extremePointLeaderString(label, waypointNum) {
    
    return label + ':<br />#' + waypointNum +
        ' (' + waypoints[waypointNum].lat + ',' +
        waypoints[waypointNum].lon +
        ') ' + waypoints[waypointNum].label;
}

// function to create the table entry for the leader for
// label-based comparisons
function vertexLabelLeaderString(label, waypointNum) {
    
    return label + ':<br />#' + waypointNum +
        ' (length ' + waypoints[waypointNum].label.length + ') ' +
        waypoints[waypointNum].label;
}

var hdxVertexExtremesSearchAV = {

    // entries for list of AVs
    value: "vertex",
    name: "Vertex Extremes Search",
    description: "Search for extreme values based on vertex (waypoint) locations and labels.",

    // pseudocode
    code: `
<pre>longest <- 0
shortest <- 0
north <- 0
south <- 0
east <- 0
west <- 0
for (checkIndex <- 1 to |V|-1) {
  if (len(v[checkIndex].label) > len(v[longest].label))) {
    longest <- checkIndex
  }
  if (len(v[checkIndex].label) < len(v[shortest].label))) {
    shortest <- checkIndex
  }
  if (v[checkIndex].lat > v[north].lat) {
    north <- checkIndex
  }
  if (v[checkIndex].lat < v[south].lat) {
    south <- checkIndex
  }
  if (v[checkIndex].lng < v[west].lng) {
    west <- checkIndex
  }
  if (v[checkIndex].lng > v[east].lng) {
    east <- checkIndex
  }
}</pre>
`,
    
    // state variables for vertex extremes search
    nextToCheck: 0,
    discarded: 0,

    // the categories for which we are finding our extremes,
    // with names for ids, labels to display, indicies of leader,
    // comparison function to determine if we have a new leader,
    // and visual settings for the display
    categories: [
	{
	    name: "north",
	    label: "North extreme",
	    index: -1,

	    newLeader: function() {
		return (parseFloat(waypoints[hdxVertexExtremesSearchAV.nextToCheck].lat) >
			parseFloat(waypoints[this.index].lat));
	    },

	    leaderString: extremePointLeaderString,

	    visualSettings: {
		color: "#8b0000",
		textColor: "white",
		scale: 6,
		name: "northLeader",
		value: 0
	    }
	},

	{
	    name: "south",
	    label: "South extreme",
	    index: -1,

	    newLeader: function() {
		return (parseFloat(waypoints[hdxVertexExtremesSearchAV.nextToCheck].lat) <
			parseFloat(waypoints[this.index].lat));
	    },
	    leaderString: extremePointLeaderString,
	    
	    visualSettings: {
		color: "#ee0000",
		textColor: "white",
		scale: 6,
		name: "southLeader",
		value: 0
	    }
	},

	{
	    name: "east",
	    label: "East extreme",
	    index: -1,

	    newLeader: function() {
		return (parseFloat(waypoints[hdxVertexExtremesSearchAV.nextToCheck].lon) >
			parseFloat(waypoints[this.index].lon));
	    },
	    leaderString: extremePointLeaderString,
	    visualSettings: {
		color: "#000080",
		textColor: "white",
		scale: 6,
		name: "eastLeader",
		value: 0
	    }
	},

	{
	    name: "west",
	    label: "West extreme",
	    index: -1,

	    newLeader: function() {
		return (parseFloat(waypoints[hdxVertexExtremesSearchAV.nextToCheck].lon) <
			parseFloat(waypoints[this.index].lon));
	    },
	    leaderString: extremePointLeaderString,
	    visualSettings: {
		color: "#551A8B",
		textColor: "white",
		scale: 6,
		name: "westLeader",
		value: 0
	    }
	},

	{
	    name: "shortest",
	    label: "Shortest vertex label",
	    index: -1,
	    
	    newLeader: function() {
		return (waypoints[hdxVertexExtremesSearchAV.nextToCheck].label.length <
			waypoints[this.index].label.length);
	    },
	    leaderString: vertexLabelLeaderString,
	    visualSettings: visualSettings.shortLabelLeader
	},
	
	{
	    name: "longest",
	    label: "Longest vertex label",
	    index: -1,
	    
	    newLeader: function() {
		return (waypoints[hdxVertexExtremesSearchAV.nextToCheck].label.length >
			waypoints[this.index].label.length);
	    },
	    leaderString: vertexLabelLeaderString,
	    visualSettings: visualSettings.longLabelLeader
	},
    ],
    
    // required start function
    // initialize a vertex-based search
    start() {

	hdxAV.algStat.innerHTML = "Initializing";
	// start by showing all existing markers, even hidden
	for (var i = 0; i < waypoints.length; i++) {
            markers[i].addTo(map);
            updateMarkerAndTable(i, visualSettings.undiscovered, 0, false);
	}
	// we don't need edges here, so we remove those
	for (var i = 0; i < connections.length; i++) {
            connections[i].remove();
	}
	//we don't need connections table here, so we remove those
	document.getElementById("connection").style.display = "none";
	
	document.getElementById("waypoints").style.display = "";
	var pointRows = document.getElementById("waypoints").getElementsByTagName("*");
	for (var i = 0; i < pointRows.length; i++) {
	    pointRows[i].style.display = "";
	}
	
	// start the search by initializing with the value at pos 0
	updateMarkerAndTable(0, visualSettings.visiting, 40, false);
	
	this.nextToCheck = 0;
	this.discarded = 0;
	
	hdxAV.algStat.innerHTML = "In Progress";
	updateAVControlEntry("undiscovered", waypoints.length + "vertices not yet visited");
	updateAVControlEntry("visiting", "Preparing to visit: #0 " + waypoints[0].label);
	updateAVControlEntry("discarded", "0 vertices discarded");
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	if (!hdxAV.paused() && hdxAV.delay != -1) {
	    var self = this;
	    setTimeout(function() { self.nextStep() }, hdxAV.delay);
	}
    },

    // required nextStep function
    // do an iteration of vertex-based search
    nextStep() {

	// if the simulation is paused, we can do nothing, as this function
	// will be called again when we restart
	if (hdxAV.paused()) {
            return;
	}
	
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	
	if (hdxAV.delay == -1) {
		hdxAV.setStatus(hdxStates.AV_PAUSED);
	}
	this.oneIteration();
	if (this.moreWork()) {
            updateMarkerAndTable(this.nextToCheck, visualSettings.visiting,
				 30, false);
	    updateAVControlEntry("undiscovered", (waypoints.length - this.nextToCheck) + " vertices not yet visited");
	    updateAVControlEntry("visiting", "Visiting: #" + this.nextToCheck + " " + waypoints[this.nextToCheck].label);
	    updateAVControlEntry("discarded", this.discarded + " vertices discarded");
	
            var self = this;
            setTimeout(function() { self.nextStep() }, hdxAV.delay);
	}
	else {
	    	this.finishUpdates();
	}
    },
	finishUpdates()
	{
		hdxAV.setStatus(hdxStates.AV_COMPLETE);
            hdxAV.algStat.innerHTML =
		"Done! Visited " + markers.length + " waypoints.";
	    updateAVControlEntry("undiscovered", "0 vertices not yet visited");
	    updateAVControlEntry("visiting", "");
	    updateAVControlEntry("discarded", this.discarded + " vertices discarded");
	},
	oneIteration()
	{
			// keep track of points that were leaders but got beaten to be
	// colored grey if they are no longer a leader in any category
	var defeated = [];
	
	// keep track of whether this point is a new leader
        let foundNewLeader = false;

	// special case of first checked
	if (this.nextToCheck == 0) {
            // this was our first check, so this point wins all to start
	    for (var i = 0; i < this.categories.length; i++) {
		this.categories[i].index = 0;
	    }
            foundNewLeader = true;
	}
	// we have to do real work to see if we have new winners
	else {
	    // check each category
	    for (var i = 0; i < this.categories.length; i++) {
		if (this.categories[i].newLeader()) {
		    foundNewLeader = true;
		    if (defeated.indexOf(this.categories[i].index) == -1) {
			defeated.push(this.categories[i].index);
		    }
		    this.categories[i].index = this.nextToCheck;
		}
	    }
	}
	
	// any point that was a leader but is no longer gets
	// discarded, but need to check that it's not still a leader
	// in another category
	while (defeated.length > 0) {
            let toCheck = defeated.pop();
	    let discard = true;
	    for (var i = 0; i < this.categories.length; i++) {
		if (toCheck == this.categories[i].index) {
		    discard = false;
		    break;
		}
	    }
            if (discard) {
		updateMarkerAndTable(toCheck, visualSettings.discarded,
				     20, true);
		this.discarded++;
            }
	}
	
	// the leader in each category is now highlighted in the tables and
	// on the map
	
	// TODO: handle better the situations where the same vertex
	// becomes the leader in multiple categories, as right now
	// it just gets colored with the last in this list
	if (foundNewLeader) {
	    
	    // this work will often be redundant but it's probably easier
	    // than trying to avoid it
	    
	    for (var i = 0; i < this.categories.length; i++) {
		updateMarkerAndTable(this.categories[i].index, this.categories[i].visualSettings, 
				     40, false);
		updateAVControlEntry(
		    this.categories[i].name, 
		    this.categories[i].leaderString(this.categories[i].label,
						    this.categories[i].index)
		);
	    }
	}
	else {
            // we didn't have a new leader, just discard this one
            updateMarkerAndTable(this.nextToCheck, visualSettings.discarded,
				 20, true);
	    this.discarded++;
	}
	
	// prepare for next iteration
	this.nextToCheck++;
	},
	

    // required nextStep function
    // do an iteration of vertex-based search
    

    // set up UI for the start of this algorithm
    setupUI() {

	hdxAV.algStat.style.display = "";
	hdxAV.algStat.innerHTML = "Setting up";
        hdxAV.algOptions.innerHTML = '';

	addEntryToAVControlPanel("undiscovered", visualSettings.undiscovered);
	addEntryToAVControlPanel("visiting", visualSettings.visiting);
	addEntryToAVControlPanel("discarded", visualSettings.discarded);
	for (var i = 0; i < this.categories.length; i++) {
	    addEntryToAVControlPanel(this.categories[i].name,
				     this.categories[i].visualSettings);
	}
    },
	
	runToCompletion(){
		while (this.moreWork()) {
			this.oneIteration();
			}
		this.finishUpdates();
		
	},
	
	moreWork()
	{
		return (this.nextToCheck < markers.length);
	},
	
    // remove UI modifications made for vertex extremes search
    cleanupUI() {

	removeEntryFromAVControlPanel("undiscovered");
	removeEntryFromAVControlPanel("visiting");
	removeEntryFromAVControlPanel("discared");
	for (var i = 0; i < this.categories.length; i++) {
	    removeEntryFromAVControlPanel(this.categories[i].name);
	}
    }
};

// edge extremes search

// function to create the table entry for the leader for
// label-based comparisons for edges
function edgeLabelLeaderString(label, edgeNum) {
    
    return label + ':<br />#' + edgeNum +
        ' (length ' + graphEdges[edgeNum].label.length + ') ' +
        graphEdges[edgeNum].label;
}

// function to create the table entry for the leader for
// edge-length-based comparisons for edges
function edgeLengthLeaderString(label, edgeNum) {
    
    return label + ': ' +
	edgeLengthInMiles(graphEdges[edgeNum]).toFixed(3) + ' mi<br />#' +
	edgeNum + ' ' + graphEdges[edgeNum].label + " " +
	waypoints[graphEdges[edgeNum].v1].label + ' <-> ' +
	waypoints[graphEdges[edgeNum].v2].label;
}

var hdxEdgeExtremesSearchAV = {

    // entries for list of AVs
    value: "edge",
    name: "Edge Extremes Search",
    description: "Search for extreme values based on edge (connection) lengths and labels.",

    // pseudocode
    code:`
<pre>longestLabel <- 0
shortestLabel <- 0
longestEdge <- 0
shortestEdge <- 0
for (checkIndex <- 1 to |E|-1) {
  if (len(e[checkIndex].label) > len(e[longestLabel].label))) {
    longestLabel <- checkIndex
  }
  if (len(e[checkIndex].label) < len(e[shortestLabel].label))) {
    shortestLabel <- checkIndex
  }
  if (e[checkIndex].len > e[longestEdge].len) {
    longestEdge <- checkIndex
  }
  if (e[checkIndex].len < e[shortestEdge].len) {
    shortestEdge <- checkIndex
  }
}</pre>
`,
    
    // state variables for edge search
    // next to examine
    nextToCheck: -1,
    discarded: 0,

    // the categories for which we are finding our extremes,
    // with names for ids, labels to display, indicies of leader,
    // comparison function to determine if we have a new leader,
    // and visual settings for the display
    categories: [
	{
	    name: "shortestLabel",
	    label: "Shortest edge label",
	    index: -1,
	    
	    newLeader: function() {
		return (graphEdges[hdxEdgeExtremesSearchAV.nextToCheck].label.length <
			graphEdges[this.index].label.length);
	    },
	    leaderString: edgeLabelLeaderString,
	    visualSettings: visualSettings.shortLabelLeader
	},
	
	{
	    name: "longestLabel",
	    label: "Longest edge label",
	    index: -1,
	    
	    newLeader: function() {
		return (graphEdges[hdxEdgeExtremesSearchAV.nextToCheck].label.length >
			graphEdges[this.index].label.length);
	    },
	    leaderString: edgeLabelLeaderString,
	    visualSettings: visualSettings.longLabelLeader
	},

    	{
	    name: "shortestEdge",
	    label: "Shortest edge length",
	    index: -1,
	    
	    newLeader: function() {
		return (edgeLengthInMiles(graphEdges[hdxEdgeExtremesSearchAV.nextToCheck]) <
			edgeLengthInMiles(graphEdges[this.index]));
	    },
	    leaderString: edgeLengthLeaderString,
	    visualSettings: {
		color: "#8b0000",
		textColor: "white",
		scale: 6,
		name: "shortEdgeLeader",
		value: 0,
		weight: 8,
		opacity: 0.6
	    }
	},
	
	{
	    name: "longestEdge",
	    label: "Longest edge length",
	    index: -1,
	    
	    newLeader: function() {
		return (edgeLengthInMiles(graphEdges[hdxEdgeExtremesSearchAV.nextToCheck]) >
			edgeLengthInMiles(graphEdges[this.index]));
	    },
	    leaderString: edgeLengthLeaderString,
	    visualSettings: {
		color: "#ee0000",
		textColor: "white",
		scale: 6,
		name: "longEdgeLeader",
		value: 0,
		weight: 8,
		opacity: 0.6
	    }
	}
    ],
    

		// keep track of edges that were leaders but got beaten to be
    // required start function
    start() {

	hdxAV.algStat.innerHTML = "Initializing";

	document.getElementById("connection").style.display = "";
	// initialize all edges to have the "undiscovered" color
	for (var i = 0; i < connections.length; i++) {
	    updatePolylineAndTable(i, visualSettings.undiscovered, false);
	}

	// waypoints not needed, so remove from the map
	for (var i = 0; i < waypoints.length; i++) {
            markers[i].remove();
	}
	
	//we don't need waypoints table here, so we remove those
	document.getElementById("waypoints").style.display = "none";

	// initialize to start looking at edge 0
	this.nextToCheck = 0;
	this.discarded = 0;

	hdxAV.algStat.innerHTML = "In Progress";
	updateAVControlEntry("undiscovered", graphEdges.length + "edges not yet visited");
	updateAVControlEntry("visiting", "Preparing to visit: #0 " + graphEdges[0].label);
	updateAVControlEntry("discarded", "0 edges discarded");
	
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	if (!hdxAV.paused() && hdxAV.delay != -1) {
	    var self = this;
	    setTimeout(function() { self.nextStep(); }, hdxAV.delay);
	}
    },

    // required nextStep function for edge search
    nextStep() {
    if (hdxAV.paused()) {
            return;
	}
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	if (hdxAV.delay == -1) {
		hdxAV.setStatus(hdxStates.AV_PAUSED);
	}
		this.oneIteration();
	if (this.moreWork) {
	    updatePolylineAndTable(this.nextToCheck,
				   visualSettings.visiting, false);
            var self = this;
            setTimeout(function() { self.nextStep() }, hdxAV.delay);
	}
	else {
	    this.finishUpdates();
	}
    },
	
	finishUpdates()
	{
		hdxAV.setStatus(hdxStates.AV_COMPLETE);
            hdxAV.algStat.innerHTML =
		"Done! Visited " + graphEdges.length + " edges.";
	    updateAVControlEntry("undiscovered", "0 edges not yet visited");
	    updateAVControlEntry("visiting", "");
	    updateAVControlEntry("discarded", this.discarded + " edges discarded");
	},
	oneIteration()
	{

	// keep track of edges that were leaders but got beaten to be
	// colored grey if they are no longer a leader in any category
	var defeated = [];
	
	// keep track of whether the current edge becomes a new leader
        var foundNewLeader = false;
	
	// special case of first checked
	if (this.nextToCheck == 0) {
            // this was our first check, so this edge wins all to start
	    for (var i = 0; i < this.categories.length; i++) {
		this.categories[i].index = 0;
	    }
            foundNewLeader = true;
	}
	// we have to do real work to see if we have new winners
	else {
	    // check each category
	    for (var i = 0; i < this.categories.length; i++) {
		if (this.categories[i].newLeader()) {
		    foundNewLeader = true;
		    if (defeated.indexOf(this.categories[i].index) == -1) {
			defeated.push(this.categories[i].index);
		    }
		    this.categories[i].index = this.nextToCheck;
		}
	    }
	}

	// any edge that was a leader but is no longer gets
	// discarded, but need to check that it's not still a leader
	// in another category
	while (defeated.length > 0) {
            let toCheck = defeated.pop();
	    let discard = true;
	    for (var i = 0; i < this.categories.length; i++) {
		if (toCheck == this.categories[i].index) {
		    discard = false;
		    break;
		}
	    }
            if (discard) {
		updatePolylineAndTable(toCheck, visualSettings.discarded,
				       true);
		this.discarded++;
            }
	}

	// if we found a new leader, update leader edges and table entries
	if (foundNewLeader) {

	    for (var i = 0; i < this.categories.length; i++) {
		updatePolylineAndTable(this.categories[i].index,
				       this.categories[i].visualSettings,
				       false);
		updateAVControlEntry(
		    this.categories[i].name, 
		    this.categories[i].leaderString(this.categories[i].label,
						    this.categories[i].index)
		);
	    }
	}
	else {
	    // no new leader, this edge gets discarded
	    updatePolylineAndTable(this.nextToCheck,
				   visualSettings.discarded, true);
	    this.discarded++;
	}
	
	updateAVControlEntry("undiscovered", (graphEdges.length - this.nextToCheck) + " edges not yet visited");
	updateAVControlEntry("visiting", "Visiting: #" + this.nextToCheck + " " + graphEdges[this.nextToCheck].label);
	updateAVControlEntry("discarded", this.discarded + " edges discarded");
	
	// prepare for next iteration
	this.nextToCheck++;
	
	},
		
    runToCompletion()
	{
		while(this.moreWork()) {
			this.oneIteration();	
		}
		this.finishUpdates();
	},
	
    // set up UI for the start of edge search
    setupUI() {

	hdxAV.algStat.style.display = "";
	hdxAV.algStat.innerHTML = "Setting up";
        hdxAV.algOptions.innerHTML = '';
	addEntryToAVControlPanel("undiscovered", visualSettings.undiscovered);
	addEntryToAVControlPanel("visiting", visualSettings.visiting);
	addEntryToAVControlPanel("discarded", visualSettings.discarded);
	for (var i = 0; i < this.categories.length; i++) {
	    addEntryToAVControlPanel(this.categories[i].name,
				     this.categories[i].visualSettings);
	}

    },
	
	moreWork()
	{
		return (this.nextToCheck < graphEdges.length);
	},

    // clean up edge search UI
    cleanupUI() {

    	removeEntryFromAVControlPanel("undiscovered");
	removeEntryFromAVControlPanel("visiting");
	removeEntryFromAVControlPanel("discared");
	for (var i = 0; i < this.categories.length; i++) {
	    removeEntryFromAVControlPanel(this.categories[i].name);
	}
    }
};

// ********************************************************************
// graph traversals, with option to find connected components
// ********************************************************************

var hdxGraphTraversalsAV = {

    // entries for list of AVs
    value: "traversals",
    name: "Graph Traversal/Connected Components",
    description: "Perform graph traversal using breadth-first, depth-first, or random-first traversals, with the option of repeating to find all connected components of the graph.",

    // pseudocode
    code:`
<pre>unmark all vertices
s <- starting vertex
mark s as visited
list LDV <- s
tree T <- s
while LDV nonempty {
   remove vertex v from LDV
   mark v as visited
   for each unmarked neighbor w of v {
      LDV.add(w)
      T.add(edge vw)
   }
}
</pre>
`,

    // list of vertices discovered but not yet visited
    // a stack for DFS, queue for BFS, just an
    // arbirtrary list for RFS
    
    // elements here are objects with fields vIndex for the index of
    // this vertex and connection for the Polyline connection followed
    // to get here (so it can be colored appropriately when the
    // element comes out)
    // this is the "list of discovered vertices" or "LDV"
    ldv: null,

    // arrays of booleans to indicate if we've visited/discovered
    // vertices and edges
    // should these just be attached to the Waypoint and GraphEdge objects?
    visitedV: [],
    discoveredV: [],
    discoveredE: [],

    // are we finding all components?
    findingAllComponents: false,

    // when finding all, track the lists of vertices and edges that are
    // forming the current spanning tree
    componentVList: [],
    componentEList: [],

    // where to start the search for an unvisited vertex that will be
    // the starting vertex for the next component
    startUnvisitedVSearch: 0,
    
    // vertex visited on the previous iteration to be updated
    lastVisitedVertex: -1,

    // where did we start?
    startingVertex: -1,

    // what is our traversal discipline, i.e., is ldv to be
    // treated as a stack, queue, or something else
    // values are currently "BFS" or "DFS" or "RFS"
    traversalDiscipline: "TBD",

    // some additional stats to maintain and display
    numVSpanningTree: 0,
    numESpanningTree: 0,
    numVUndiscovered: 0,
    numEUndiscovered: 0,
    numEDiscardedOnDiscovery: 0,
    numEDiscardedOnRemoval: 0,
    componentNum: 0,
    
    // color items specific to graph traversals
    visualSettings: {
	visitedEarlier: {
            color: "orange",
            textColor: "black",
            scale: 4,
	    name: "visitedEarlier",
	    value: 0
	},
	completedComponent: {
	    color: "white",
	    textColor: "black",
	    scale: 3,
	    name: "completedComponent",
	    value: 0,
	    weight: 3,
	    opacity: 0.6
	}
    },

    // list of colors to fill in for completed components
    componentColors: [
	"orange",
	"darkCyan",
	"brown",
	"crimson",
	"lightCoral",
	"moccasin",
	"orchid",
	"sienna",
	"violet",
	"yellowGreen",
    "gold",
	"aqua",
	"dodgerblue",
	"lawngreen",
	"khaki",
	"lime",
	"firebrick",
	"indianred",
	"indigo",
	"goldenrod"
    ],
    
    // initialize graph traversal process, required for all algorithms
    start() {

	let d = document.getElementById("traversalDiscipline");
	this.traversalDiscipline = d.options[d.selectedIndex].value;
	if (this.traversalDiscipline == "BFS") {
            this.ldv = new HDXLinear(hdxLinearTypes.QUEUE,
				     "BFS Discovered Queue");
	}
	else if (this.traversalDiscipline == "DFS") {
            this.ldv = new HDXLinear(hdxLinearTypes.STACK,
				     "DFS Discovered Stack");
	}
	else if (this.traversalDiscipline == "RFS") {
            this.ldv = new HDXLinear(hdxLinearTypes.RANDOM,
				     "RFS Discovered List");
	}

	// TODO: make the callback function display more interesting
	// information and possibly a "hover" information box and
	// opening the waypoint's infowindow if clicked
	this.ldv.setDisplay(
	    getAVControlEntryDocumentElement("discovered"),
	    function(item) {
		return item.vIndex;
	    });
	
	d.style.disabled = true;
	let c = document.getElementById("findConnected");
	this.findingAllComponents = c.checked;
	c.style.disabled = true;

	document.getElementById("connection").style.display = "";
	document.getElementById("waypoints").style.display = "";
	var pointRows = document.getElementById("waypoints").getElementsByTagName("*");
	for (var i = 0; i < pointRows.length; i++) {
	    pointRows[i].style.display = "";
	}
	
	// initialize our visited/discovered arrays
	this.visitedV = new Array(waypoints.length).fill(false);
	this.discoveredV = new Array(waypoints.length).fill(false);
	this.discoveredE = new Array(connections.length).fill(false);

	// replace all markers with circles in the undiscovered color
	for (var i = 0; i < markers.length; i++) {
            updateMarkerAndTable(i, visualSettings.undiscovered, 0, false);
	}
	
	// color all edges in the undiscovered color also
	for (var i = 0; i < connections.length; i++) {
	    updatePolylineAndTable(i, visualSettings.undiscovered, false);
	}
	
	this.numVSpanningTree = 0;
	this.numESpanningTree = 0;
	this.numVUndiscovered = waypoints.length;
	this.numEUndiscovered = connections.length;
	this.numEDiscardedOnDiscovery = 0;
	this.numEDiscardedOnRemoval = 0;
	this.componentNum = 0;

	// for the search for starting vertices for multiple component
	// traversals
	this.startUnvisitedVSearch = 0;

	// vertex index to start the traversal
	this.startingVertex = document.getElementById("startPoint").value;

	// common to starting first and subsequent components
	this.startNewComponent();
	
	
    },

    // common code for starting search for the first or subsequent
    // components
    startNewComponent() {

	// create new empty lists for the vertices and edges of the
	// current component
	this.componentVList = [];
	this.componentEList = [];
	
	this.discoveredV[this.startingVertex] = true;
	this.numVUndiscovered--;
	
	// initialize the process with this value
	this.ldv.add({
            vIndex: this.startingVertex,
            connection: -1
	});
	
	// mark as discovered, will be redrawn as starting vertex
	// color in nextStep
	updateMarkerAndTable(this.startingVertex,
			     visualSettings.discovered, 10, false);

	this.updateControlEntries();
	
	// nothing to update this first time
	this.lastVisitedVertex = -1;
	hdxAV.algStat.innerHTML = "Finding spanning tree";
	if (this.findingAllComponents) {
	    hdxAV.algStat.innerHTML += " for component " + (this.componentNum+1);
	}
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	if (!hdxAV.paused() && hdxAV.delay != -1) {
	    var self = this;
	    setTimeout(function() { self.nextStep(); }, hdxAV.delay);
	}
	
	
    },

    // helper function to redraw all variable values
    updateControlEntries() {
	
	updateAVControlEntry("undiscovered", "Undiscovered: " +
			     this.numVUndiscovered + " V, " +
			     this.numEUndiscovered + " E");
	let label;
	if (this.findingAllComponents) {
	    label = "Spanning Trees: ";
	}
	else {
	    label = "Spanning Tree: "
	}
	updateAVControlEntry("currentSpanningTree", label +
			     this.numVSpanningTree + " V, " +
			     this.numESpanningTree + " E");
	updateAVControlEntry("discardedOnDiscovery", "Discarded on discovery: " +
			     this.numEDiscardedOnDiscovery + " E");
	updateAVControlEntry("discardedOnRemoval", "Discarded on removal: " +
			     this.numEDiscardedOnRemoval + " E");
    },

    // function to process one vertex from the ldv in the
    // graph traversal process
    nextStep() {
    
	// if we're paused, do nothing for now
	if (hdxAV.paused()) {
            return;
	}
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	if (hdxAV.delay == -1) {
		hdxAV.setStatus(hdxStates.AV_PAUSED);
	}	

	// the last visited vertex is still drawn as the one being visited,
	// so first recolor it as appropriate, if it exists
	if (this.lastVisitedVertex != -1) {
            if (this.lastVisitedVertex == this.startingVertex) {
		// always leave the starting vertex colored appropriately
		// and in the table
		updateMarkerAndTable(this.startingVertex,
				     visualSettings.startVertex,
				     10, false);
		this.componentVList.push(this.startingVertex);
            }
	    else if (!this.ldv.containsFieldMatching("vIndex", this.lastVisitedVertex)) {
		// not in the list, this vertex gets marked as in the
		// spanning tree
		updateMarkerAndTable(this.lastVisitedVertex,
				     visualSettings.spanningTree,
				     1, false);
            }
	    else {
		// still in the list, color with the "discovered" style
		updateMarkerAndTable(this.lastVisitedVertex,
				     visualSettings.discovered,
				     5, false);
            }
	}
	
	this.oneIteration();
	this.updateControlEntries();
	let self = this;
	setTimeout(function() { self.nextStep(); }, hdxAV.delay);
    },
	
	runToCompletion()
	{
		while(this.moreWork())
		{
			// the last visited vertex is still drawn as the one being visited,
	// so first recolor it as appropriate, if it exists
	if (this.lastVisitedVertex != -1) {
            if (this.lastVisitedVertex == this.startingVertex) {
		// always leave the starting vertex colored appropriately
		// and in the table
		updateMarkerAndTable(this.startingVertex,
				     visualSettings.startVertex,
				     10, false);
		this.componentVList.push(this.startingVertex);
            }
	    else if (!this.ldv.containsFieldMatching("vIndex", this.lastVisitedVertex)) {
		// not in the list, this vertex gets marked as in the
		// spanning tree
		updateMarkerAndTable(this.lastVisitedVertex,
				     visualSettings.spanningTree,
				     1, false);
            }
	    else {
		// still in the list, color with the "discovered" style
		updateMarkerAndTable(this.lastVisitedVertex,
				     visualSettings.discovered,
				     5, false);
            }
	}
			this.oneIteration();
		}
		
		this.updateControlEntries();
		this.finishUpdates();
	},

	finishUpdates()
	{
		hdxAV.setStatus(hdxStates.AV_COMPLETE);
		    hdxAV.algStat.innerHTML = "Done.  Found " +
			(this.componentNum+1) + " components";
		    updateAVControlEntry("visiting", "Last visited #" +
					 this.lastVisitedVertex + " " +
					 waypoints[this.lastVisitedVertex].label);
	},
    // set up UI components for traversals
    setupUI() {

	hdxAV.algStat.style.display = "";
	hdxAV.algStat.innerHTML = "Setting up";
        hdxAV.algOptions.innerHTML = 'Order: <select id="traversalDiscipline"><option value="BFS">Breadth First</option><option value="DFS">Depth First</option><option value="RFS">Random</option></select>' +
	    '<br /><input id="findConnected" type="checkbox" name="Find all connected components">&nbsp;Find all connected components' +
	    '<br />' + buildWaypointSelector("startPoint", "Start Vertex", 0);
//            '<br /><input id="showDataStructure" type="checkbox" onchange="toggleDS()" name="Show Data Structure">Show Data Structure';
	addEntryToAVControlPanel("visiting", visualSettings.visiting);
	addEntryToAVControlPanel("currentSpanningTree", visualSettings.spanningTree);
	addEntryToAVControlPanel("undiscovered", visualSettings.undiscovered);
	addEntryToAVControlPanel("discovered", visualSettings.discovered);
	addEntryToAVControlPanel("discardedOnDiscovery", visualSettings.discardedOnDiscovery);
	addEntryToAVControlPanel("discardedOnRemoval", visualSettings.discarded);

    },
	
	oneIteration()
	{
		// check if done with current component
	if (this.ldv.isEmpty()) {

	    // if we are finding all components, either move on to
	    // next component or be done
	    if (this.findingAllComponents) {
		// recolor all vertices and edges in the most recent
		// component with a new color
		if (this.componentNum < this.componentColors.length) {
		    this.visualSettings.completedComponent.color =
			this.componentColors[this.componentNum];
		}
		else {
		    // credit https://www.paulirish.com/2009/random-hex-color-code-snippets/
		    this.visualSettings.completedComponent.color =
			'#'+Math.floor(Math.random()*16777215).toString(16);
		}
		for (var i = 0; i < this.componentVList.length; i++) {
		    updateMarkerAndTable(this.componentVList[i],
					 this.visualSettings.completedComponent, false);
		}
		for (var i = 0; i < this.componentEList.length; i++) {
		    updatePolylineAndTable(this.componentEList[i],
					   this.visualSettings.completedComponent, false);
		}
		
		// done?
		if (this.numVUndiscovered == 0) {
		    this.finshUpdates();
		    return;
		}
		// set up to start next component
		else {
		    this.componentNum++;

		    // find an unvisited vertex to start next search
		    while ((this.startUnvisitedVSearch < waypoints.length) &&
			   this.visitedV[this.startUnvisitedVSearch]) {
			this.startUnvisitedVSearch++;
		    }
		    if (this.startUnvisitedVSearch == waypoints.length) {
			console.log("Unexpected termination of multi-component graph traversal.");
			hdxAV.setStatus(hdxStates.AV_COMPLETE);
			hdxAV.algStat.innerHTML = "Done with error condition.  Found " +
			    this.componentNum + " components";
			return;
		    }
		    else {
			// ready to start next component
			this.startingVertex = this.startUnvisitedVSearch;
			this.startNewComponent();
		    }

		}
		return;
	    }
	    else {
		hdxAV.setStatus(hdxStates.AV_COMPLETE);
		hdxAV.algStat.innerHTML = "Done.";
		updateAVControlEntry("visiting", "Last visited #" +
				     this.lastVisitedVertex + " " +
				     waypoints[this.lastVisitedVertex].label);
		return;
	    }
	}
	
		// LDV not empty, so select the next vertex to visit and remove it
	let nextToVisit = this.ldv.remove();
	this.lastVisitedVertex = nextToVisit.vIndex;
	let vIndex = nextToVisit.vIndex;
	let edgeLabel;
	if (nextToVisit.connection == -1) {
	    edgeLabel = ", the starting vertex";
	}
	else {
	    edgeLabel = " found via " +
		graphEdges[nextToVisit.connection].label;
	}
	updateAVControlEntry("visiting", "Visiting #" + vIndex +
			     " " + waypoints[vIndex].label + edgeLabel);

	// now decide what to do with this vertex -- depends on whether it
	// had been previously visited
	if (this.visitedV[vIndex]) {
            this.numEDiscardedOnRemoval++;
            // we've been here before, but is it still in the list?
            if (this.ldv.containsFieldMatching("vIndex", vIndex)) {
		// not there anymore, indicated this as visitedEarlier, and
		// will be discarded or marked as discoveredEarlier on the
		// next iteration
		updateMarkerAndTable(vIndex, this.visualSettings.visitedEarlier,
				     4, false);
            }
	    else {
		// still to be seen again, so mark is as discovered on
		// removal
		updateMarkerAndTable(vIndex, visualSettings.discarded,
				     5, false);
            }
	    
            // in either case here, the edge that got us here is not
            // part of the ultimate spanning tree, so it should be the
            // "discardedOnRemoval" color
            if (nextToVisit.connection != -1) {
		updatePolylineAndTable(nextToVisit.connection,
				       visualSettings.discarded,
				       false);
            }
	}
	// visiting for the first time
	else {
            this.visitedV[vIndex] = true;
            updateMarkerAndTable(vIndex, visualSettings.visiting,
				 10, false);
	    // was just discovered, now part of spanning tree
	    this.componentVList.push(vIndex);
	    this.numVSpanningTree++;
	    
            // we used the edge to get here, so let's mark it as such
            if (nextToVisit.connection != -1) {
		this.numESpanningTree++;
		this.componentEList.push(nextToVisit.connection);
		updatePolylineAndTable(nextToVisit.connection,
				       visualSettings.spanningTree, false);
            }

            // discover any new neighbors
            let neighbors = getAdjacentPoints(vIndex);
            for (var i = 0; i < neighbors.length; i++) {
                let connection = waypoints[vIndex].edgeList[i].edgeListIndex;
		// First, check if this is the edge we just traversed
		// to get here, and if so, ignore it
		if (connection == nextToVisit.connection) {
		    continue;
		}

		// it's a different edge, let's see where we can go
		
		if (this.visitedV[neighbors[i]]) {
		    // been here before, so just note that this is
		    // an edge we discard before adding
		    this.numEDiscardedOnDiscovery++;
		    if (!this.discoveredE[connection]) {
			this.numEUndiscovered--;
			this.discoveredE[connection] = true;
		    }
		    updatePolylineAndTable(connection,
					   visualSettings.discardedOnDiscovery,
					   false);
		}
		else {
		    // not been here, we've discovered somewhere new
		    // possibly discovered a new vertex and
		    // definitely discovered a new edge
		    if (!this.discoveredV[neighbors[i]]) {
			this.numVUndiscovered--;
			this.discoveredV[neighbors[i]] = true;
		    }
		    this.numEUndiscovered--;
		    this.discoveredE[connection] = true;
                    this.ldv.add({
			vIndex: neighbors[i],
			connection: connection
                    });
		    updateMarkerAndTable(neighbors[i],
					 visualSettings.discovered,
					 5, false);

                    // also color the edge we followed to get to this
                    // neighbor as the same color to indicate it's a candidate
                    // edge followed to find a current discovered but
                    // unvisited vertex
                    if (connection != -1) {
			updatePolylineAndTable(connection,
					       visualSettings.discovered,
					       false);
                    }
		    else {
			console.log("Unexpected -1 connection, vIndex=" + vIndex +
				    ", i=" + i);
                    }
		}
            }
	}
	},
	
	finishUpdates()
	{
		hdxAV.setStatus(hdxStates.AV_COMPLETE);
		    hdxAV.algStat.innerHTML = "Done.  Found " +
			(this.componentNum+1) + " components";
		    updateAVControlEntry("visiting", "Last visited #" +
					 this.lastVisitedVertex + " " +
					 waypoints[this.lastVisitedVertex].label);
	},
	
	moreWork()
	{
		if (this.ldv.isEmpty()) {

	    // if we are finding all components, either move on to
	    // next component or be done
	    if (this.findingAllComponents) {
		// recolor all vertices and edges in the most recent
		// component with a new color
		if (this.componentNum < this.componentColors.length) {
		    this.visualSettings.completedComponent.color =
			this.componentColors[this.componentNum];
		}
		else {
		    // credit https://www.paulirish.com/2009/random-hex-color-code-snippets/
		    this.visualSettings.completedComponent.color =
			'#'+Math.floor(Math.random()*16777215).toString(16);
		}
		for (var i = 0; i < this.componentVList.length; i++) {
		    updateMarkerAndTable(this.componentVList[i],
					 this.visualSettings.completedComponent, false);
		}
		for (var i = 0; i < this.componentEList.length; i++) {
		    updatePolylineAndTable(this.componentEList[i],
					   this.visualSettings.completedComponent, false);
		}
		
		// done?
		if (this.numVUndiscovered == 0) {
		    this.finishUpdates();
		    return false;
		}
		// set up to start next component
		else {
		    this.componentNum++;

		    // find an unvisited vertex to start next search
		    while ((this.startUnvisitedVSearch < waypoints.length) &&
			   this.visitedV[this.startUnvisitedVSearch]) {
			this.startUnvisitedVSearch++;
		    }
		    if (this.startUnvisitedVSearch == waypoints.length) {
			console.log("Unexpected termination of multi-component graph traversal.");
			hdxAV.setStatus(hdxStates.AV_COMPLETE);
			hdxAV.algStat.innerHTML = "Done with error condition.  Found " +
			    this.componentNum + " components";
			return false;
		    }
		    else {
			// ready to start next component
			this.startingVertex = this.startUnvisitedVSearch;
			this.startNewComponent();
		    }

		}
		return false;
	    }
	    else {
		hdxAV.setStatus(hdxStates.AV_COMPLETE);
		hdxAV.algStat.innerHTML = "Done.";
		updateAVControlEntry("visiting", "Last visited #" +
				     this.lastVisitedVertex + " " +
				     waypoints[this.lastVisitedVertex].label);
		return false;
	    }
	}
	return true;
	},

    // clean up traversals UI
    cleanupUI() {

	removeEntryFromAVControlPanel("visiting");
	removeEntryFromAVControlPanel("currentSpanningTree");
    	removeEntryFromAVControlPanel("undiscovered");
    	removeEntryFromAVControlPanel("discovered");
	removeEntryFromAVControlPanel("discardedOnDiscovery");
	removeEntryFromAVControlPanel("discardedOnRemoval");
    }
};

// Dijkstra's algorithm for single-source shortest paths
// initial code by Clarice Tarbay

// object type to track entries in the table of shortest paths found
function DijkstraSP(vIndex, d, connection) {

    this.vIndex = vIndex;
    this.dist = d;
    this.connection = connection;
    // compute the other vertex of the endpoint as we'll need
    // it in a couple places
    this.fromVIndex = -1;
    if (connection != -1) {
	if (graphEdges[connection].v1 == vIndex) {
	    this.fromVIndex = graphEdges[connection].v2;
	}
	else {
	    this.fromVIndex = graphEdges[connection].v1;
	}
    }
    
    return this;
}
// core Dijkstra's algorithm code
var hdxDijkstraAV = {
    
    // entries for list of AVs
    value: "dijkstra",
    name: "Dijkstra's Algorithm",
    description: "Dijkstra's algorithm for single-source shortest paths.",

    // pseudocode change to &emscp;
    code:`
<div>
<div id = 1> G = (V,E) is the graph</div>
<div id = 2>s <- starting vertex</div>
<div id = 3>e <- ending vertex</div>
<div id = 4>T <- table of places found</div>
<div id = 5>PQ <- priority queue of candidates</div>
<div id = 5>PQ.add(0, (s, null))</div>
<div id = 6>while (PQ.notEmpty() and e not in T) {</div>
  <div id = 7>&nbsp;&nbsp;&nbsp;&nbsp;(dist, (to, via)) <- PQ.remove()</div>
  <div id = 7>&nbsp;&nbsp;&nbsp;&nbsp;if (to not in T) {</div>
     <div id = 9>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;T.add(to, via)</div>
     <div id = 10>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;for each neighbor w of to {</div>
        <div id = 11>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (w not visited) {</div>
           <div id = 12>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;PQ.add(dist+len(to,w), (w, edge(to-w)))</div>
        }
     } 
  }
}
<div id = 13>if (e in T) {</div>
   <div id = 14>&nbsp;&nbsp;&nbsp;&nbsp;use T to report shortest path</div>
}
<div id = 15>else {</div>
   <div id = 16>&nbsp;&nbsp;&nbsp;&nbsp;report no path exists</div>
}
</div>`,

    // the priority queue at the heart of Dijkstra's algorithm
    pq: null,

    // array of booleans to determine if we have found a path to
    // each vertex
    visitedVertices: [],
    
    // array of places to which we have found shortest paths
    shortestPaths: [],
	
	//to help us stop the function
    work: false,
    // where do we start and end?
    startingVertex: -1,
    endingVertex: -1,

    // information about the previous iteration to be updated at
    // the start of each
    lastIteration: null,

    // some stats to track
    numVisited: -1,
    previouslyVisited: 0,

    // visual settings for shortest path
    visualSettings: {
	shortestPath: {
	    color: "darkRed",
	    textColor: "white",
	    scale: 4,
	    name: "shortestPath",
	    weight: 4,
	    opacity: 0.6
	}
    },

    // required algorithm start method for Dijkstra's
    start() {
        resetHighlight(1);
        highlighter(1, "blue");
        highlighter(2, "blue");
        highlighter(3,"blue");
	// vertex indices for the start and end of the traversal
	this.startingVertex = document.getElementById("startPoint").value;
        
	this.endingVertex = document.getElementById("endPoint").value;
	        
	if (this.startingVertex == this.endingVertex) {
	    alert("Start and End vertices must be different!");
	    return;
	}

	// construct the priority queue
	this.pq = new HDXLinear(hdxLinearTypes.PRIORITY_QUEUE,
				"Priority Queue");
        highlighter(4,"blue");
        highlighter(5,"blue");
        highlighter(6,"blue");

	this.pq.setComparator(
	    function(a, b) {
		return a.dist < b.dist;
	    });
	
	this.pq.setDisplay(
	    getAVControlEntryDocumentElement("discovered"),
	    function(item) {
		let edgeLabel = "START";
		if (item.connection != -1) {
		    edgeLabel = graphEdges[item.connection].label;
		}
		return item.vIndex + "<br />" + edgeLabel + "<br />" +
		    item.dist.toFixed(3);
	    });

	// show both waypoint and connections tables
	document.getElementById("connection").style.display = "";
	document.getElementById("waypoints").style.display = "";
	
	// initialize our visited array to indicate which
	// vertices to which we have a shortest path
	this.visitedVertices = new Array(waypoints.length).fill(false);
	
	// indicate that all waypoints start out as undiscovered
	for (var i = 0; i < markers.length; i++) {
            updateMarkerAndTable(i, visualSettings.undiscovered, 0, false);
	}
	
	// all edges undiscovered also
	for (var i = 0; i < connections.length; i++) {
	    updatePolylineAndTable(i, visualSettings.undiscovered, false);
	}
	
	// initialize the process with this value
	this.pq.add(new DijkstraSP(this.startingVertex, 0, -1));

	this.numVisited = 0;
	this.numEDiscardedOnDiscovery = 0;
	this.numEDiscardedOnRemoval = 0;

	// initialize our table of shortest paths found
	this.shortestPaths = [];
	
	updateMarkerAndTable(this.startingVertex,
			     visualSettings.startVertex, 10, false);
	
	updateMarkerAndTable(this.endingVertex,
			     visualSettings.endVertex, 10, false);
	
	// nothing to update this first time
	this.lastIteration = {
	    vIndex: -1,
	    connection: -1,
	    used: false
	};
	
	if (!hdxAV.paused()&& hdxAV.delay != -1) {
	    let self = this;
	    setTimeout(function() { self.nextStep(); }, hdxAV.delay);
	}
	if (hdxAV.delay == 0)
	{
		this.runToCompletion();		
	}
    },

    // additional helper functions
    findNextV(edge, vnum) {
	if (edge.v1 == vnum) {
	    return edge.v2;
	}
	else {
	    return edge.v1;
	}
    },

    // add a DijkstraSP to the list of shortest paths and to
    // the table of shortest path entries
    addToShortestPaths(v) {
        resetHighlight(1);
        
	
	let newtr = document.createElement("tr");
	newtr.setAttribute("id", "dijkstraSP" + this.shortestPaths.length);
	let fromLabel = "";
	let via = "";
	let vLabel = waypoints[v.vIndex].label;
	if (vLabel.length > 20) {
	    vLabel = vLabel.substr(0,17) + "...";
	}
	if (v.connection != -1) {
	    via = graphEdges[v.connection].label;
	    //let otherV;
	    //if (graphEdges[v.connection].v1 == v.vIndex) {
		//otherV = graphEdges[v.connection].v2;
	    //}
	    //else {
	//	otherV = graphEdges[v.connection].v1;
	  //  }
	    fromLabel = waypoints[v.fromVIndex].label;
	    if (fromLabel.length > 20) {
		fromLabel = fromLabel.substr(0,17) + "...";
	    }
	}
	newtr.innerHTML =
	    '<td>' + vLabel + '</td>' +
	    '<td>' + v.dist.toFixed(3) + '</td>' +
	    '<td>' + fromLabel + '</td>' +
	    '<td>' + via + '</td>';
	
	this.foundTBody.appendChild(newtr);
        
	this.shortestPaths.push(v);
        if(document.getElementById("tableSize") == null){
	document.getElementById("foundLabel").innerHTML = this.shortestPaths.length + " (number of paths found so far)";
        }
    },

    // continue next step of Dijkstra's algorithm
    nextStep() {
	
	// if we're paused, do nothing for now
	if (hdxAV.paused()) {
            return;
	}
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	if (hdxAV.delay == -1) {
		hdxAV.setStatus(hdxStates.AV_PAUSED);
	}	
	
	
	
	this.oneIteration();
	if(this.moreWork)
	{
		let self = this;
		setTimeout(function() { self.nextStep(); }, hdxAV.delay);
	}
	
    },
	
	runToCompletion()
	{
		
		while(this.moreWork())//do
		{
			this.oneIteration();
		}//while(this.moreWork());		
	},

	moreWork()
	{
		return (!this.work);
	},
	
	oneIteration()
	{
		
		// maybe we have a last visited vertex to update
	if (this.lastIteration.vIndex != -1) {
            if (this.lastIteration.vIndex == this.startingVertex) {
		// always leave the starting vertex colored appropriately
		// and in the table
		updateMarkerAndTable(this.startingVertex,
				     visualSettings.startVertex,
				     10, false);
            }
	    else {
		updateMarkerAndTable(this.lastIteration.vIndex,
				     visualSettings.spanningTree,
				     1, false);
            }
	}
	// and maybe a last visited edge to update
	if (this.lastIteration.connection != -1) {
	    if (this.lastIteration.used) {
		updatePolylineAndTable(this.lastIteration.connection,
				       visualSettings.spanningTree,
				       false);
	    }
	    else {
		updatePolylineAndTable(this.lastIteration.connection,
				       visualSettings.discarded,
				       false);
	    }
	}

	// from here, there are three possibilities:
	// 1) we have now visited the endingVertex, so we report the path
	// 2) we have an empty pq, which means no path exists, report that
	// 3) we need to continue on to the next place out of the pq

	// case 1: we have a path
	
	
	if (this.visitedVertices[this.endingVertex]) {

	    // we're done!
	    updateAVControlVisualSettings("found",
					  this.visualSettings.shortestPath);
	    this.foundLabel.innerHTML = "Shortest path found:";
        hdxAV.setStatus(hdxStates.AV_COMPLETE);
	    
	    // build the shortest path from end to start, showing
	    // each on the map, in the tables

	    let place = this.endingVertex;
	    let spIndex = this.shortestPaths.length - 1;
	    // work our way back up the table from vertex to vertex
	    // along the shortest path
	    while (place != this.startingVertex) {
            highlighter(6,"blue");
		let spEntry = this.shortestPaths[spIndex];
		while (place != spEntry.vIndex) {
		    // hide line, it's not part of the path
		    if (place != this.endingVertex) {
			let tr = document.getElementById("dijkstraSP" + spIndex);
                
			tr.style.display = "none";
		    }
            resetHighlight(6);
            highlighter(7, "red");
            
		    spIndex--;
		    spEntry = this.shortestPaths[spIndex];
		}

		// we are at the next place on the path, update vertex
		updateMarkerAndTable(place, this.visualSettings.shortestPath,
				     5, false);
            
		// and update edge to get here
		updatePolylineAndTable(spEntry.connection,
				       this.visualSettings.shortestPath,
				       false);

		// update place to the previous in the path
		spIndex--;
		place = spEntry.fromVIndex;
	    }
	    hdxAV.algStat.innerHTML = "Shortest path found!  Entries below are the path.";
	    hdxAV.setStatus(hdxStates.AV_COMPLETE);
	    this.work = true;
        return;


	}

	// case 2: failed search
	if (this.pq.isEmpty()) {

	    hdxAV.algStat.innerHTML = "No path exists!";
	    hdxAV.setStatus(hdxStates.AV_COMPLETE);
	    this.work = true;
		return;

	}
    
	// case 3: continue the search at the next place from the pq
	let nextToVisit = this.pq.remove();
        resetHighlight(6);
        highlighter(8, "red");

	// mark the vertex and edge to it as being visited
	updateMarkerAndTable(nextToVisit.vIndex, visualSettings.visiting,
			     10, false);
	
	if (nextToVisit.connection != -1) {
	    updatePolylineAndTable(nextToVisit.connection,
				   visualSettings.visiting, false);
	}

	let edgeLabel;
	if (nextToVisit.connection == -1) {
	    edgeLabel = ", the starting vertex";
	}
	else {
	    edgeLabel = " found via " +
		graphEdges[nextToVisit.connection].label;
	}
	let prevVisit;
	if (this.visitedVertices[nextToVisit.vIndex]) {
	    prevVisit = "previously visited";
	}
	else {
	    prevVisit = "first visit";
	}
	updateAVControlEntry("visiting", "Visiting #" + nextToVisit.vIndex +
			     " " + waypoints[nextToVisit.vIndex].label +
			     edgeLabel + ", " + prevVisit);

	// if we have been here previously, just report as such and
	// continue with the next iteration
	if (this.visitedVertices[nextToVisit.vIndex]) {

	    // remember to color as appropriate on next iteration
	    this.lastIteration = {
		vIndex: nextToVisit.vIndex,
		connection: nextToVisit.connection,
		used: false
	    }

	    this.numEDiscardedOnRemoval++;
	}
	// we found a path to a previously unvisited place, so there's
	// some work to do
	else {
	    // remember to color as appropriate on next iteration
	    this.lastIteration = {
		vIndex: nextToVisit.vIndex,
		connection: nextToVisit.connection,
		used: true
	    }

	    // mark as visited
	    this.visitedVertices[nextToVisit.vIndex] = true;

	    // add entry to table of shortest paths
	    this.addToShortestPaths(nextToVisit);
	    
            // look at neighboring vertices
            let neighbors = getAdjacentPoints(nextToVisit.vIndex);
            for (var i = 0; i < neighbors.length; i++) {
                let connection =
		    waypoints[nextToVisit.vIndex].edgeList[i].edgeListIndex;

		// First, check if this is the edge we just traversed
		// to get here, and if so, ignore it
		if (connection == nextToVisit.connection) {
		    continue;
		}
		
		if (this.visitedVertices[neighbors[i]]) {
		    // been here before, so just note that this is
		    // an edge we discard before adding and color it as such
		    this.numEDiscardedOnDiscovery++;
		    updatePolylineAndTable(connection,
					   visualSettings.discardedOnDiscovery,
					   false);
		}
		else {
		    // not been here, we've discovered somewhere new
		    // possibly discovered a new vertex and
		    // definitely discovered a new edge

		    this.pq.add(
			new DijkstraSP(neighbors[i],
				       edgeLengthInMiles(graphEdges[connection]) + nextToVisit.dist,
				       connection));

		    updateMarkerAndTable(neighbors[i],
					 visualSettings.discovered,
					 5, false);

                    // also color the edge we followed to get to this
                    // neighbor as the same color to indicate it's a candidate
                    // edge followed to find a current discovered but
                    // unvisited vertex
                    if (connection != -1) {
			updatePolylineAndTable(connection,
					       visualSettings.discovered,
					       false);
                    }
		    else {
			console.log("Unexpected null connection, vIndex=" + nextToVisit.vIndex + ", i=" + i);
                    }
		}
            }
	}
	},
	
    // set up UI for Dijkstra's
    setupUI() {
	
	hdxAV.algStat.style.display = "";
	hdxAV.algStat.innerHTML = "Setting up";
        hdxAV.algOptions.innerHTML =
	    buildWaypointSelector("startPoint", "Start Vertex", 0) +
	    "<br />" + buildWaypointSelector("endPoint", "End Vertex", 1);
	addEntryToAVControlPanel("visiting", visualSettings.visiting);
	addEntryToAVControlPanel("undiscovered", visualSettings.undiscovered);
	addEntryToAVControlPanel("discovered", visualSettings.discovered);
	addEntryToAVControlPanel("found", visualSettings.spanningTree);
	updateAVControlEntry("found", `
<span id="foundLabel">Table of shortest paths found: <span id="tableSize">0 (number of paths found so far)</span></span><br />
<table class="gratable"><thead>
<tr style="text-align:center"><th>Place</th><th>Distance</th><th>Arrive From</th><th>Via</th></tr>
</thead><tbody id="dijkstraEntries"></tbody></table>
`);
	this.foundTBody = document.getElementById("dijkstraEntries");
	this.foundLabel = document.getElementById("foundLabel");
    },

    // clean up Dijkstra's UI
    cleanupUI() {

	removeEntryFromAVControlPanel("visiting");
    	removeEntryFromAVControlPanel("undiscovered");
    	removeEntryFromAVControlPanel("discovered");
	removeEntryFromAVControlPanel("found");
        
    }
};

// get a list of adjacent vertices by index into waypoints array
function getAdjacentPoints(pointIndex) {
    var resultArray = [];
    var edgeList = waypoints[pointIndex].edgeList;
    for (var i = 0; i < edgeList.length; i++) {
        var adjacentIndex;
        if (edgeList[i].v1 == pointIndex) {
            adjacentIndex = edgeList[i].v2;
        }
	else {
            adjacentIndex = edgeList[i].v1;
        }
        resultArray.push(adjacentIndex);
    }
    
    return resultArray;
}

// Brute-force convex hull AV
// based on original code by Arjol Pengu and Maria Bamundo
var hdxBFConvexHullAV = {

    // entries for list of AVs
    value: "bfhull",
    name: "Brute-Force Convex Hull",
    description: "Compute the convex hull of the waypoints using the brute-force algorithm.",
    
    // pseudocode
    code:`<pre>
for (i <- 1 to n–1)
  for (j <- i+1 to n)
     L <- line through waypoints[i] and waypoints[j]
       if (all other points lie on the same side of L)
          add L to hull
</pre>`,
    
    // the list of points in the convex hull being computed
    hull: [],

    // the list of Polylines that make up the hull so far
    hullSegments: [],

    // the i and j loop indices for our deconstructed nested loop
    hullI: 0,
    hullJ: 0,
    
    convexLineHull: [],
    visitingLine: [],
    currentSegment: null,
 
    // boolean to determine whether to set up or do an iteration of
    // the inner loop, to allow the candidate line to be seen on
    // the map before it is determined to be part of the hull or not
    setupNewLine: false,

    visualSettings: {
        hullI: {
            color: "darkRed",
            textColor: "white",
            scale: 6,
	    name: "hullI",
	    value: 0
	},
        hullJ: {
            color: "red",
            textColor: "white",
            scale: 6,
	    name: "hullJ",
	    value: 0
	},
	discardedInner: {
	    color: "green",
	    textColor: "black",
	    scale: 2,
	    name: "discardedInner",
	    value: 0
	},
	hullComponent: visualSettings.spanningTree
    },

    // helper function to draw and set the current segment, i to j
    mapCurrentSegment() {

	let visitingLine = [];
	visitingLine[0] = [waypoints[this.hullI].lat, waypoints[this.hullI].lon];
	visitingLine[1] = [waypoints[this.hullJ].lat, waypoints[this.hullJ].lon];
	this.currentSegment = L.polyline(visitingLine, {
	    color: visualSettings.visiting.color,
	    opacity: 0.6,
	    weight: 4
	});
	this.currentSegment.addTo(map);
    },

    // required start method for brute force convex hull
    // TODO: where do we know we're done?
    start() {

	// clear connections from the map, as this is a vertex-only
	// algorithm
	for (var outerLoop = 0; outerLoop < connections.length; outerLoop++) {
	    connections[outerLoop].remove();
	}

	// also no need for connections table
	document.getElementById("connection").style.display = "none";

	// mark all vertices as "undiscovered"
	for (var i = 0; i < waypoints.length; i++) {
            updateMarkerAndTable(i, visualSettings.undiscovered, 30, false);
	}

	// initialize our i and j for the main n^2 loop which forms
	// the granularity of our visualization at this point
	
	this.hullI = 0;
	this.hullJ = 1;
	this.setupNewLine = true;
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	
	if (!hdxAV.paused()&& hdxAV.delay != -1) {
	    let self = this;
	    setTimeout(function() { self.nextStep(); }, hdxAV.delay);
	}
    },

    // update display elements for a new i, j combination
    updateIJDisplayElements() {

	updateMarkerAndTable(this.hullI, this.visualSettings.hullI,
			     30, false);
	updateMarkerAndTable(this.hullJ, this.visualSettings.hullJ,
			     30, false);

	updateAVControlEntry("hullI", "Outer loop: #" + this.hullI + " " +
			     waypoints[this.hullI].label);
	updateAVControlEntry("hullJ", "Inner loop: #" + this.hullJ + " " +
			     waypoints[this.hullJ].label);
    },

    // required nextStep function for brute-force convex hull
    nextStep() {
	
	if (hdxAV.paused()) {
           return;
	}
	
	if (hdxAV.delay == 0) {
		this.runToCompletion();
	}
	
	if (hdxAV.delay == -1) {
		hdxAV.setStatus(hdxStates.AV_PAUSED);
	}
	
	// depending on the value of setupNewLine, we either draw a
	// line from the hullI to hullJ to show the next segment to
	// be considered, or we actually consider that segment (and
	// either remove it or add it to the hull, then advance to
	// the next hullI, hullJ
	
	this.oneIteration();
	if(this.moreWork())
	{
		let self = this;
		setTimeout(function() { self.nextStep(); }, hdxAV.delay);
	}
	
	},
		
	oneIteration()
	{
		
		if (this.setupNewLine) {
	    // formerly "innerLoopConvexHull()"
	    
	    this.updateIJDisplayElements();
	
	    // draw the line
	    this.mapCurrentSegment();
	    
	    //if (!hdxAV.paused()){ //&& hdxAV.delay != -1) {
		this.setupNewLine = false;
	    //}
	}
	else {

	    // was: "innerLoop2()"

	    let pointI = waypoints[this.hullI];
	    let pointJ = waypoints[this.hullJ];
    
	    // from here, we need to see if all other points are
	    // on the same side of the line connecting pointI and pointJ
	    // the coefficients for ax + by = c
	    let a = pointJ.lat - pointI.lat;
	    let b = pointI.lon - pointJ.lon;
	    let c = pointI.lon * pointJ.lat - pointI.lat * pointJ.lon;

	    updateAVControlEntry("checkingLine",
				 "Considering line: " + a.toFixed(3) + "lat + " +
				 b.toFixed(3) + "lng = " + c.toFixed(3));
	    // now check all other points to see if they're on the
	    // same side -- stop as soon as we find they're not
	    let lookingForPositive = false;
	    let foundProblem = false;
	    let firstTestPoint = true;
	    
	    for (var k = 0; k < waypoints.length; k++) {	
		let pointK = waypoints[k];

		// make sure point is not one of the endpoints
		// of the line being considered for inclusion
		// in the hull
		if (pointI === pointK || pointJ === pointK) {
		    continue;
		}

		let checkVal = a * pointK.lon + b * pointK.lat - c;
		
		if (checkVal === 0) {
		    if (isBetween(pointI, pointJ, pointK)) {
			continue;
		    } else {
			foundProblem = true;
			break;
		    }
		}
		if (firstTestPoint) {
		    lookingForPositive = (checkVal > 0);
		    firstTestPoint = false;
		}
		else {
		    if ((lookingForPositive && (checkVal < 0) ||
			 (!lookingForPositive && (checkVal > 0)))) {
			// segment not on hull, jump out of innermost loop
			foundProblem = true;
			break;
			//possibly end 3rd for loop here
		    }
		}
	    }

	    if (foundProblem) {
		// remove the candidate segment from the map
		this.currentSegment.remove();
		hdxAV.algStat.innerHTML = "Discarding segment between # " +
		    this.hullI + " and #" + this.hullJ;
	    }
	    else {
		hdxAV.algStat.innerHTML = "Adding to hull segment between # " +
		    this.hullI + " and #" + this.hullJ;
		// it's part of the hull, so let's remember the points
		if (!this.hull.includes(this.hullI)) {
		    this.hull.push(this.hullI);
		}
		if (!this.hull.includes(this.hullJ)) {
		    this.hull.push(this.hullJ);
		}

		// add to the list of hull segments
		this.hullSegments.push(this.currentSegment);
		this.currentSegment.setStyle({
		    color: this.visualSettings.hullComponent.color
		});
	    }

	    // before we update j, see if we should color as part of the
	    // hull or as part of the inner loop discarded
	    if (this.hull.includes(this.hullJ)) {
		updateMarkerAndTable(this.hullJ,
				     this.visualSettings.hullComponent,
				     20, false);
	    }
	    else {
		updateMarkerAndTable(this.hullJ,
				     this.visualSettings.discardedInner,
				     10, false);
	    }
	    this.hullJ++;
	    if (this.hullJ == waypoints.length) {

		// before we update i, see if it should be colored as part
		// of the hull or if it should be discarded permanently
		if (this.hull.includes(this.hullI)) {
		    updateMarkerAndTable(this.hullI,
					 this.visualSettings.hullComponent,
					 20, false);
		}
		else {
		    updateMarkerAndTable(this.hullI,
					 visualSettings.discarded,
					 20, true);
		}
		this.hullI++;
		// all points for the next inner loop back to undiscovered
		// unless already part of the hull
		for (var i = this.hullI + 1; i < waypoints.length; i++) {
		    if (this.hull.includes(i)) {
			updateMarkerAndTable(i,
					     this.visualSettings.hullComponent,
					     20, false);
		    }
		    else {
			updateMarkerAndTable(i, visualSettings.undiscovered,
					     30, false);
		    }
		}
		// initialize next hullJ loop
		this.hullJ = this.hullI + 1;
	    }
		
	    // more to do?
	    if (this.moreWork()) {	    
		//if (!hdxAV.paused()&& hdxAV.delay != -1) {
		    this.setupNewLine = true;
		//}
	    }
	    else {
		// done
		// update last points in case they are part of the hull		    
		this.finishUpdates();
	    }
		}
		
	},	
	
	moreWork()
	{
		return (this.hullI < waypoints.length - 1)
	},

	runToCompletion()
	{
		while(this.moreWork())
		{
			this.oneIteration();
		}
				    
		this.finishUpdates();
	},
	
	finishUpdates()
	{
		if (this.hull.includes(waypoints.length - 2)) {
			updateMarkerAndTable(waypoints.length - 2,
					     this.visualSettings.hullComponent,
					     20, false);
		}
		else {
		    updateMarkerAndTable(waypoints.length - 2,
					 visualSettings.discarded,
					 20, true);
		}
		if (this.hull.includes(waypoints.length - 1)) {
			updateMarkerAndTable(waypoints.length - 1,
					     this.visualSettings.hullComponent,
					     20, false);
		}
		else {
		    updateMarkerAndTable(waypoints.length - 1,
					 visualSettings.discarded,
					 20, true);
		}
		hdxAV.setStatus(hdxStates.AV_COMPLETE);
		hdxAV.algStat.innerHTML = "Done.  Convex hull contains " +
		    this.hull.length + " points and segments.";
	},
    // set up UI for convex hull
    setupUI() {
	
	if (waypoints.length > 100) {
	    alert("This is an O(n^3) algorithm in the worst case, so you might wish to choose a smaller graph.");
	}
	hdxAV.algStat.style.display = "";
	hdxAV.algStat.innerHTML = "Setting up";
        hdxAV.algOptions.innerHTML = '';
	addEntryToAVControlPanel("hullI", this.visualSettings.hullI);
	addEntryToAVControlPanel("hullJ", this.visualSettings.hullJ);
	addEntryToAVControlPanel("checkingLine", visualSettings.visiting);
    },

    // clean up convex hull UI
    cleanupUI() {

    	removeEntryFromAVControlPanel("hullI");
    	removeEntryFromAVControlPanel("hullJ");
    	removeEntryFromAVControlPanel("checkingLine");
	for (var i = 0; i < this.hullSegments.length; i++) {
	    this.hullSegments[i].remove();
	}
    }
};

/**
    Check if this point is directly in between the two given
    points.  Note: the assumption is that they are colinear.

    @param o1 one of the points
    @param o2 the other point
    @return whether this point is between the two given points
    */

function isBetween(o1, o2, o3) {
    var sqDisto1o2 = squaredDistance(o1,o2);
    //alert("isBetween" + (squaredDistance(o3,o2) < sqDisto1o2) &&
    //      (squaredDistance(o3,o2) < sqDisto1o2));
    return (squaredDistance(o3,o2) < sqDisto1o2) &&
        (squaredDistance(o3,o2) < sqDisto1o2);
}

// Creates the TOSLabels for the different map tiles and appends them
// to a div which is returned
function TOSLabel() {
    var menubar = document.querySelector(".menubar");
    
    var label = document.createElement("a");
    label.setAttribute("id", "ReferenceLink");
    label.setAttribute("href", "http://tm.teresco.org/credits.php");
    label.setAttribute("target", "_blank");
    label.innerHTML = "Credits and Sources";
    
    return label;
}


/*
  Linear structure that can be displayed in a collapsed form
*/
var hdxLinearTypes = {

    // constants to refer to these, if new ones are added,
    // place before UNKNOWN and increment UNKNOWN's value
    STACK: 1,
    QUEUE: 2,
    RANDOM: 3,
    PRIORITY_QUEUE:4,
    UNKNOWN: 5
};

// to generate unique document element ids
var HDXLinearCounter = 1;

function HDXLinear(type, displayName) {

    // supported types listed above
    if (type < hdxLinearTypes.STACK || type >= hdxLinearTypes.UNKNOWN) {
	console.log("Invalid type of HDXLinear!");
    }
    this.type = type;
    this.displayName = displayName;
    this.idNum = HDXLinearCounter;
    HDXLinearCounter++;

    // the actual array representing this linear structure
    this.items = [];

    // some stats about it
    this.addCount = 0;
    this.removeCount = 0;

    // the document element in which to display the contents
    this.docElement = null;

    // the callback to use to get the actual text to
    // display for each displayed element
    this.elementHTMLCallback = null;

    // default comparator function for priority queues
    this.comesBefore = function(a, b) {

	return a < b;
    };

    // set custom comparator for priority queues
    this.setComparator = function(c) {

	this.comesBefore = c;
    };
    
    // set the element and callback
    this.setDisplay = function(dE, eC) {

	this.docElement = dE;
	this.elementHTMLCallback = eC;
	let t = this.displayName + ' (size <span id="HDXLinear' +
	    this.idNum + 'Span">'+ this.items.length +
	    '</span>)&nbsp;&nbsp;&nbsp;<input id="HDXLinear' +
	    this.idNum + 'Limit" type="checkbox" checked /> ' +
	    ' limit display to <input id="HDXLinear' + this.idNum +
	    'LimitVal" type="number" value="10" min="1" max="1000000" ' +
	    'size="3" style="width: 3em" /> entries' +
	    '<br /><table><tbody id="HDXLinear' + this.idNum + 'TBody">' +
	    '</tbody></table>';
	this.docElement.innerHTML = t;
	this.lengthSpan = document.getElementById("HDXLinear" + this.idNum + "Span");
	this.tbody = document.getElementById("HDXLinear" + this.idNum + "TBody");
	this.limitCheck = document.getElementById("HDXLinear" + this.idNum + "Limit");
	this.limit = document.getElementById("HDXLinear" + this.idNum + "LimitVal");
	this.redraw();
    };
    
    // add a item to this linear structure
    this.add = function(e) {

	if ((this.type == hdxLinearTypes.PRIORITY_QUEUE) &&
	    this.items.length > 0) {
	    // need to maintain in order
	    // does e come first?
	    let i = 0;
	    while ((i < this.items.length) &&
		   this.comesBefore(e, this.items[i])) {
		i++;
	    }
	    this.items.splice(i, 0, e);
	}
	else {
	    this.items.push(e);
	}
	this.addCount++;
	
	this.redraw();
    };

    // remove next based on type
    this.remove = function() {

	this.removeCount++;
	let retval = null;
	switch(this.type) {

	case hdxLinearTypes.STACK:
	case hdxLinearTypes.PRIORITY_QUEUE:
	    retval = this.items.pop();
	    break;
	    
	case hdxLinearTypes.QUEUE:
	    retval = this.items.shift();
	    break;
	    
	case hdxLinearTypes.RANDOM:
            let index = Math.floor(Math.random() * this.items.length);
            retval = this.items[index];
            this.items.splice(index, 1);
	    break;
	}

	this.redraw();
	return retval;
    };
    
    // search for an entry with the given field having the given value
    this.containsFieldMatching = function(field, value) {

	for (var i = 0; i < this.items.length; i++) {
	    if (this.items[i][field] == value) {
		return true;
	    }
	}
	return false;
    };

    // check for empty list
    this.isEmpty = function() {

	return this.items.length == 0;
    };

    // redraw in the HTML element
    this.redraw = function() {

	if (this.docElement != null) {
	    this.lengthSpan.innerHTML = this.items.length;
	    let t = "<tr>";
	    let maxDisplay = Number.MAX_VALUE;
	    if (this.limitCheck.checked) {
		maxDisplay = this.limit.value;
	    }
	    if (maxDisplay >= this.items.length) {
		for (var i = 0; i < this.items.length; i++) {
		    t += "<td>" + this.elementHTMLCallback(this.items[i]) + "</td>";
		}
	    }
	    else {
		// we have to limit: with stacks and randoms, we
		// ignore the initial entries
		if (this.type == hdxLinearTypes.STACK ||
		    this.type == hdxLinearTypes.RANDOM) {
		    // first a placeholder entry
		    t += "<td>...</td>";
		    for (var i = this.items.length - maxDisplay;
			 i < this.items.length; i++) {
			t += "<td>" + this.elementHTMLCallback(this.items[i]) + "</td>";
		    }
		}
		// queues will ignore the middle
		else if ((this.type == hdxLinearTypes.QUEUE) ||
			 (this.type == hdxLinearTypes.PRIORITY_QUEUE)) {
		    // half of the displayable elements from the front
		    let firstChunk = Math.floor(maxDisplay / 2);
		    for (var i = 0; i < firstChunk; i++) {
			t += "<td>" + this.elementHTMLCallback(this.items[i]) + "</td>";
		    }
		    // next a placeholder entry
		    t += "<td>...</td>";
		    // half of the displayable elements from the end
		    for (var i = this.items.length -
			     (maxDisplay - firstChunk);
			 i < this.items.length; i++) {
			t += "<td>" + this.elementHTMLCallback(this.items[i]) + "</td>";
		    }
		}
	    }
	    t += "</tr>";
	    this.tbody.innerHTML = t;
	}
    };
    
    return this;
}

/* object to display the value of a variable (which should be
   a number or string) with a given label and in the given
   document element's innerHTML, beginning with the given
   initial value */
function HDXDisplayVariable(displayLabel,docElement,initVal) {

    this.value = initVal;
    this.label = displayLabel;
    this.docElement = docElement;

    // set to a new value
    this.set = function(newVal) {
	
	this.value = newVal;
	this.paint();
    };

    // increment
    this.increment = function() {

	this.value++;
	this.paint();
    };
    
    // redraw in the document element
    this.paint = function() {

	this.docElement.innerHTML = this.label + this.value;
    };

    this.paint();
    return this;
}

/*
function createSidePanelBtn() {
    //Creates the menu icon
    var showPanel = document.createElement("button");
    showPanel.setAttribute("id", "panelBtn");
    showPanel.innerHTML = '<i id="menuIcon" xxxclass="material-icons">menu</i>';
    showPanel.setAttribute("title", "Menu");
    showPanel.addEventListener("click", openSidePanel);
    document.body.appendChild(showPanel);
}
*/

var sidePanelContent = ["Legend"];
function sidePanel() {

    var div = document.createElement("div");
    div.setAttribute("id", "sidePanel");
    var xButton = document.createElement("a");
    xButton.setAttribute("id", "closeButton");
    xButton.setAttribute("href", "javascript:void(0)");
    xButton.innerHTML = "&times;";
    xButton.addEventListener("click", closeSidePanel);
    div.appendChild(xButton);
    for (var i = 0; i < sidePanelContent.length; i++) {
	var contentArea = document.createElement("div");
	contentArea.setAttribute("id", "contentArea_" + sidePanelContent[i]);
	
	var panelContentLabels = document.createElement("a");
	panelContentLabels.setAttribute("id", sidePanelContent[i]);
	panelContentLabels.innerHTML = sidePanelContent[i];
	contentArea.appendChild(panelContentLabels);
	div.appendChild(contentArea);
    }
    div.appendChild(TOSLabel());
    document.body.appendChild(div);
}

function openSidePanel() {

    if (document.getElementById("sidePanel") != null) {
	document.getElementById("sidePanel").style.width = "250px";
	document.getElementById("main").style.marginLeft = "250px";
    }
}

function closeSidePanel() {

    document.getElementById("sidePanel").style.width = "0";
    document.getElementById("main").style.marginLeft= "0";
}

var legendArray = [
    "undiscovered",
    "visiting",
    "leader",
    "discarded",
    "northLeader",
    "southLeader",
    "eastLeader",
    "westLeader",
    "shortLabelLeader",
    "longLabelLeader",
    "startVertex",
    "discoveredEarlier",
    "visitedEarlier",
    "spanningTree",
    "discovered",
    "hoverV",
    "hullK",
    "hullI"
];

function legendArea(vis) {
    var legendDiv = document.getElementById("contentArea_Legend");
    for (var i = 0; i < legendArray.length; i++) {
	if (vis.name == legendArray[i] && vis.name != null) {
	    if (vis.value == 1) {
		continue;
	    }
	    else {
		vis.value = 1;
		var boxContainer = document.createElement("div");
		boxContainer.setAttribute("id", "boxContainer");
		var box = document.createElement("div");
		var label = document.createElement("span");
		label.setAttribute("id", legendArray[i]);
		label.innerHTML = legendArray[i];
		box.setAttribute("class", "box");
		box.style.backgroundColor =  vis.color;
		boxContainer.appendChild(box);
		boxContainer.appendChild(label);
		legendDiv.appendChild(boxContainer);
	    }
	}
    }
}

// loadfromqs used to be part of loadmap, likely to be replaced with
// code generated by PHP later
function loadfromqs() {
    
    // check for a load query string parameter
    var qs = location.search.substring(1);
    //DBG.write("qs: " + qs);
    var qsitems = qs.split('&');
    for (var i = 0; i < qsitems.length; i++) {
	//DBG.write("qsitems[" + i + "] = " + qsitems[i]);
	var qsitem = qsitems[i].split('=');
	//DBG.write("qsitem[0] = " + qsitem[0]);
	if (qsitem[0] == "load") {
	    var request = new XMLHttpRequest();
	    //DBG.write("qsitem[1] = " + qsitem[1]);
	    document.getElementById('filename').innerHTML = qsitem[1];
	    request.open("GET", qsitem[1], false);
	    request.setRequestHeader("User-Agent", navigator.userAgent);
	    request.send(null);
	    if (request.status == 200) {
		processContents(request.responseText);
	    }
	}
    }
}

// shortcut function to display errors
function pointboxErrorMsg(msg) {
    pointbox = document.getElementById("pointbox");
    selected = document.getElementById("selected");
    
    pointbox.innerHTML = "<table class=\"gratable\"><thead><tr><th style=\"color: red\">" + msg + "</th></thead></table>";
    selected.innerHTML = pointbox.innerHTML;
    
}

// when a file is selected, this will be called
function startRead() {

    clearTables();
    // first, retrieve the selected file (as a File object)
    // which must be done before we toggle the table to force
    // the pointbox to be displayed
    var file = document.getElementById('filesel').files[0];
    
    // force highway data box to be displayed
    var menu = document.getElementById("showHideMenu");
    // menu.options[2].selected = true;
    // toggleTable();

    if (file) {
	//DBG.write("file: " + file.name);
	document.getElementById('filename').innerHTML = file.name;
	if ((file.name.indexOf(".wpt") == -1) &&
	    (file.name.indexOf(".pth") == -1) &&
	    (file.name.indexOf(".nmp") == -1) &&
	    (file.name.indexOf(".gra") == -1) &&
	    (file.name.indexOf(".tmg") == -1) &&
	    (file.name.indexOf(".wpl") == -1)) {
	    pointboxErrorMsg("Unrecognized file type!");
	    return;
	}
	if (file.name.includes("OCE-continent")) {
	    alert("This graph cannot be used with the Convex Hull algorithm as currently implemented, as it spans the international date line.");
	}
	// pointboxErrorMsg("Loading... (" + file.size + " bytes)");
	var reader;
	try {
	    reader = new FileReader();
	}
	catch(e) {
	    pointboxErrorMsg("Error: unable to access file (Perhaps no browser support?  Try recent Firefox or Chrome releases.).");
	    return;
	}
	reader.readAsText(file, "UTF-8");
	reader.onload = fileLoaded;
	//reader.onerror = fileLoadError;
    }
}

function readServer(event) {
    clearTables();
    var index = document.getElementById("graphList").selectedIndex;
    var value = document.getElementById("graphList").options[index].value;
    
    if (value != "") {
 	// document.getElementById("test").innerHTML = value;
 	
 	var xmlhttp = new XMLHttpRequest();
 	xmlhttp.onreadystatechange = function() {
 	    if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
 		
 		var file = new Blob([xmlhttp.responseText], {type : "text/plain"});
 		file.name = value;
 		
 		// force highway data box to be displayed
 		var menu = document.getElementById("showHideMenu");
 		// menu.options[2].selected = true;
 		// toggleTable();
		
 		if (file) {
 		    //DBG.write("file: " + file.name);
 		    document.getElementById('filename').innerHTML = file.name;
 		    if ((file.name.indexOf(".wpt") == -1) &&
 			(file.name.indexOf(".pth") == -1) &&
 			(file.name.indexOf(".nmp") == -1) &&
 			(file.name.indexOf(".gra") == -1) &&
 			(file.name.indexOf(".tmg") == -1) &&
 			(file.name.indexOf(".wpl") == -1)) {
 			pointboxErrorMsg("Unrecognized file type!");
 			return;
 		    }
 		    // pointboxErrorMsg("Loading... (" + file.size + " bytes)");
 		    var reader;
 		    try {
 			reader = new FileReader();
 		    }
 		    catch(e) {
 			pointboxErrorMsg("Error: unable to access file (Perhaps no browser support?  Try recent Firefox or Chrome releases.).");
 			return;
 		    }
 		    reader.readAsText(file, "UTF-8");
 		    reader.onload = fileLoaded;
 		    //reader.onerror = fileLoadError;
 		}
 	    }
 	};
 	xmlhttp.open("GET", "http://courses.teresco.org/metal/graphdata/"+value, true);
 	xmlhttp.send();	
    }
}

// when the FileReader created in startRead has finished, this will be called
// to process the contents of the file
function fileLoaded(event) {
    // file done loading, read the contents
    processContents(event.target.result);
}

// event handler for "Show Load Options" button
// which replaces it with the load options panels
function undoCollapse(event) {
    var container = event.target.parentNode;
    var clss = "."+container.id.substring(0,container.id.indexOf("btn"));
    var elems = document.querySelectorAll(clss);
    for (var i = 0; i < elems.length; i++) {
	elems[i].style.display = "";
    }
    container.style.display = "none";
}

// function to hide the load options and show the "Show Load Options"
// button in the AV control panel
function collapseElements(clss) {
    var elems = document.querySelectorAll("."+clss);
    var btn = document.getElementById(clss+"btn");
    for (var i = 0; i < elems.length; i++) {
	elems[i].style.display = "none";
    }
    btn.style.display = "";
}

// process the contents of a String which came from a file or elsewhere
function processContents(fileContents) {
    collapseElements("loadcollapse");
    
    // place the contents into the file contents area (will improve later)
    // document.getElementById('pointbox').innerHTML = "<pre>" + fileContents + "</pre>";
    // document.getElementById('selected').innerHTML = "<pre>" + fileContents + "</pre>";
    
    var pointboxContents = "";
    
    // parse the file and process as appropriate
    // TODO: check that this is always still here when we ask, might be
    // better to store the filename in a variable for safe keeping
    var fileName = document.getElementById('filename').innerHTML;
    if (fileName.indexOf(".wpt") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Waypoint File)";
	pointboxContents = parseWPTContents(fileContents);
    }
    else if (fileName.indexOf(".pth") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Waypoint Path File)";
	pointboxContents = parsePTHContents(fileContents);
    }
    else if (fileName.indexOf(".nmp") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Near-Miss Point File)";
	pointboxContents = parseNMPContents(fileContents);
    }
    else if (fileName.indexOf(".wpl") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Waypoint List File)";
	pointboxContents = parseWPLContents(fileContents);
    }
    else if (fileName.indexOf(".gra") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Highway Graph File)";
	pointboxContents = parseGRAContents(fileContents);
    }
    else if (fileName.indexOf(".tmg") >= 0) {
	document.getElementById('filename').innerHTML = fileName + " (Highway Graph File)";
	pointboxContents = parseTMGContents(fileContents);
    }
    
    // document.getElementById('pointbox').innerHTML = pointboxContents;
    var newEle = document.createElement("div");
    newEle.setAttribute("id", "newEle");
    newEle.innerHTML = pointboxContents;
    document.getElementById('contents_table').appendChild(newEle);
    createDataTable("#waypoints");
    createDataTable("#connection");
    updateMap();   
}

// TODO: make sure maps cannot be selected when an AV is running
function fillGraphList(e) {
    
    var sels = document.getElementById("selects");
    var orderSel = document.getElementById("orderOptions").value;
    var resSel = document.getElementById("restrictOptions").value;
    var cateSel = document.getElementById("categoryOptions").value;
    var min = document.getElementById("minVertices").value;
    var max = document.getElementById("maxVertices").value;
    if (max < 0 || min < 0 || min > max) {
	return;
    }
    if ($("#graphList").length != 0) {
	sels.removeChild(document.getElementById("graphList"));
    }
    var mapSel = document.createElement("select");
    mapSel.setAttribute("id", "graphList");
    mapSel.setAttribute("onchange", "readServer(event)");
    var init = document.createElement("option");
    init.innerHTML = "Choose a Graph";
    init.value = "init";
    mapSel.appendChild(init);		
    sels.appendChild(mapSel);
    var params = {
	order:orderSel,
	restrict:resSel,
	category:cateSel,
	min:min,
	max:max
    };
    var jsonParams = JSON.stringify(params);
    $.ajax({
        type: "POST",
        url: "./generateGraphList.php",
	datatype: "json",
        data: {"params":jsonParams},
        success: function(data) {
            var opts = $.parseJSON(data);
	    var txt = opts['text'];
	    var values = opts['values'];
	    var vertices = opts['vertices'];
	    var edges = opts['edges'];
	    var opt;
	    var str = "";
	    if (txt.length == 0) {
		alert("No graphs matched!  Please choose less restrictive filters.");
	    }
	    for (var i = 0; i < txt.length; i++) {
		opt = document.createElement("option");
		if (values[i].indexOf("simple") != -1) {
		    str = txt[i] + " (simple), size: (" + vertices[i] + ", " + edges[i] + ")";
		}
		else {
		    str = txt[i] + ", size: (" + vertices[i] + ", " + edges[i] + ")" ;
		}
		opt.innerHTML = str;
		opt.value = values[i];
		document.getElementById("graphList").appendChild(opt);
	    }
	}
    });
}

function clearTables() {
    if ($("#waypoints").length != 0) {
	document.getElementById("waypoints_wrapper").parentNode.parentNode.removeChild(document.getElementById("waypoints_wrapper").parentNode);
    }
    if ($("#connection").length!=0) {
	document.getElementById("connection_wrapper").parentNode.parentNode.removeChild(document.getElementById("connection_wrapper").parentNode);
    }
}

function createDataTable(id) {

    if ($(id).length > 0) {
	$(id).dataTable({
	    "destroy":true,
	    "paging":false,
	    "searching":false,
	    "info":false
	});
    }	
}

// in case we get an error from the FileReader
function errorHandler(evt) {

    if (evt.target.error.code == evt.target.error.NOT_READABLE_ERR) {
	// The file could not be read
	document.getElementById('filecontents').innerHTML = "Error reading file...";
    }
}

// parse the contents of a .tmg file
//
// First line specifies TMG and version number (expected to be 1.0),
// followed by the word "collapsed" (only supported option so far)
// indicating that the hidden vertices in the graph are collapsed
// into intermediate points along edges.
//
// Second line specifies the number of vertices, numV, and the number
// of edges, numE
//
// Next numV lines are a waypoint name (a String) followed by two
// floating point numbers specifying the latitude and longitude
//
// Next numE lines are vertex numbers (based on order in the file)
// that are connected by an edge followed by a String listing the
// highway names that connect those points, followed by pairs of
// floating point numbers, all space-separated, indicating the
// coordinates of any shaping points along the edge
//
function parseTMGContents(fileContents) {
    
    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    var header = lines[0].split(' ');
    if (header[0] != "TMG") {
	return '<table class="gratable"><thead><tr><th>Invalid TMG file (missing TMG marker on first line)</th></tr></table>';
    }
    if (header[1] != "1.0") {
	return '<table class="gratable"><thead><tr><th>Unsupported TMG file version (' + header[1] + ')</th></tr></table>';
    }
    if ((header[2] != "simple") && (header[2] != "collapsed")) {
	return '<table class="gratable"><thead><tr><th>Unsupported TMG graph format (' + header[2] + ')</th></tr></table>';
    }
    var counts = lines[1].split(' ');
    var numV = parseInt(counts[0]);
    var numE = parseInt(counts[1]);
    var summaryInfo = '<table class="gratable"><thead><tr><th>' + numV + " waypoints, " + numE + " connections.</th></tr></table>";
    
    var vTable = '<table id="waypoints" class="gratable"><thead><tr><th colspan="3">Waypoints</th></tr><tr><th>#</th><th>Coordinates</th><th>Waypoint Name</th></tr></thead><tbody>';
    
    waypoints = new Array(numV);
    for (var i = 0; i < numV; i++) {
	var vertexInfo = lines[i+2].split(' ');
	waypoints[i] = new Waypoint(vertexInfo[0], vertexInfo[1], vertexInfo[2], "", new Array());
	vTable += '<tr id="waypoint' + i +'" onmouseover = "hoverV('+i+', false)" onmouseout = "hoverEndV('+i+', false)" onclick = "labelClickHDX('+i+')" ><td>' + i +
	    '</td><td>(' + parseFloat(vertexInfo[1]).toFixed(3) + ',' +
	    parseFloat(vertexInfo[2]).toFixed(3) + ')</td><td>'
	    + waypoints[i].label + '</td></tr>';
    }
    vTable += '</tbody></table>';
    
    var eTable = '<table  id="connection" class="gratable"><thead><tr  ><th colspan="3">Connections</th></tr><tr><th>#</th><th>Route Name(s)</th><th>Endpoints</th></tr></thead><tbody>';
    graphEdges = new Array(numE);
    for (var i = 0; i < numE; i++) {
	var edgeInfo = lines[i+numV+2].split(' ');
	var newEdge;
	if (edgeInfo.length > 3) {
            newEdge = new GraphEdge(edgeInfo[0], edgeInfo[1], edgeInfo[2], edgeInfo.slice(3));
	}
	else {
            newEdge = new GraphEdge(edgeInfo[0], edgeInfo[1], edgeInfo[2], null);
	}
	var firstNode = Math.min(parseInt(newEdge.v1), parseInt(newEdge.v2));
	var secondNode = Math.max(parseInt(newEdge.v1), parseInt(newEdge.v2));
	// add this new edge to my endpoint vertex adjacency lists
	waypoints[newEdge.v1].edgeList.push(newEdge);
	waypoints[newEdge.v2].edgeList.push(newEdge);
	
	eTable += '<tr onmouseover="hoverE(event,'+i+')" onmouseout="hoverEndE(event,'+i+')" onclick="edgeClick('+i+')" id="connection' + i + '" class="v_' + firstNode + '_' + secondNode + '"><td>' + i + '</td><td>' + edgeInfo[2] + '</td><td>'
	    + edgeInfo[0] + ':&nbsp;' + waypoints[newEdge.v1].label +
	    ' &harr; ' + edgeInfo[1] + ':&nbsp;'
	    + waypoints[newEdge.v2].label + '</td></tr>';
	
	graphEdges[i] = newEdge;
	// record edge index in GraphEdge structure
	newEdge.edgeListIndex = i;
    }
    eTable += '</tbody></table>';
    genEdges = false;
    usingAdjacencyLists = true;
    hdxAV.setStatus(hdxStates.GRAPH_LOADED);
    document.getElementById("AlgorithmSelection").disabled = false;
    return summaryInfo + '<p />' + vTable + '<p />' + eTable;
}

// parse the contents of a .gra file
//
// First line specifies the number of vertices, numV, and the number
// of edges, numE
// Next numV lines are a waypoint name (a String) followed by two
// floating point numbers specifying the latitude and longitude
// Next numE lines are vertex numbers (based on order in the file)
// that are connected by an edge followed by a String listing the
// highway names that connect those points
function parseGRAContents(fileContents) {

    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    var counts = lines[0].split(' ');
    var numV = parseInt(counts[0]);
    var numE = parseInt(counts[1]);
    var sideInfo = '<table  class="gratable"><thead><tr><th>' + numV + " waypoints, " + numE + " connections.</th></tr></table>";

    var vTable = '<table class="gratable"><thead><tr><th colspan="3">Waypoints</th></tr><tr><th>#</th><th>Coordinates</th><th>Waypoint Name</th></tr></thead><tbody>';

    waypoints = new Array(numV);
    for (var i = 0; i < numV; i++) {
	var vertexInfo = lines[i+1].split(' ');
	waypoints[i] = new Waypoint(vertexInfo[0], vertexInfo[1], vertexInfo[2], "", "");
	vTable += '<tr><td>' + i +
	    '</td><td>(' + parseFloat(vertexInfo[1]).toFixed(3) + ',' +
	    parseFloat(vertexInfo[2]).toFixed(3) + ')</td><td>'
	    + "<a onclick=\"javascript:labelClickHDX(" + i + ");\">"
	    + waypoints[i].label + "</a></td></tr>"
    }
    vTable += '</tbody></table>';

    var eTable = '<table class="gratable"><thead><tr><th colspan="3">Connections</th></tr><tr><th>#</th><th>Route Name(s)</th><th>Endpoints</th></tr></thead><tbody>';
    graphEdges = new Array(numE);
    for (var i = 0; i < numE; i++) {
	var edgeInfo = lines[i+numV+1].split(' ');
	graphEdges[i] = new GraphEdge(edgeInfo[0], edgeInfo[1], edgeInfo[2], null);
	eTable += '<tr><td>' + i + '</td><td>' + edgeInfo[2] + '</td><td>'
	    + edgeInfo[0] + ':&nbsp;' + waypoints[graphEdges[i].v1].label +
	    ' &harr; ' + edgeInfo[1] + ':&nbsp;'
	    + waypoints[graphEdges[i].v2].label + '</td></tr>';
    }
    eTable += '</tbody></table>';
    genEdges = false;
    hdxAV.setStatus(hdxStates.GRAPH_LOADED);
    document.getElementById("AlgorithmSelection").disabled = false;
    return sideInfo + '<p />' + vTable + '<p />' + eTable;
}

// parse the contents of a .wpt file
//
// Consists of a series of lines each containing a waypoint name
// and an OSM URL for that point's location:
//
/*
YT1_S http://www.openstreetmap.org/?lat=60.684924&lon=-135.059652
MilCanRd http://www.openstreetmap.org/?lat=60.697199&lon=-135.047250
+5 http://www.openstreetmap.org/?lat=60.705383&lon=-135.054932
4thAve http://www.openstreetmap.org/?lat=60.712623&lon=-135.050619
*/
function parseWPTContents(fileContents) {

    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    graphEdges = new Array();
    waypoints = new Array();
    for (var i = 0; i < lines.length; i++) {
	if (lines[i].length > 0) {
	    waypoints[waypoints.length] = WPTLine2Waypoint(lines[i]);
	}
    }
    genEdges = true;
    hdxAV.setStatus(hdxStates.WPT_LOADED);
    return "<h2>Raw file contents:</h2><pre>" + fileContents + "</pre>";
}

// parse the contents of a .pth file
//
// Consists of a series of lines each containing a route name, zero or
// more intermediate points (latitude, longitude pairs), then a
// waypoint name and a latitude and a longitude, all space-separated,
// or a line containing a route name and waypoint name followed by a
// lat,lng pair in parens
//
/*
START YT2@BorRd (60.862343,-135.196595)
YT2 YT2@TakHSRd (60.85705,-135.202029)
YT2 (60.849881,-135.203934) (60.844649,-135.187111) (60.830141,-135.187454) YT1_N/YT2_N (60.810264,-135.205286)
YT1,YT2 (60.79662,-135.170288) YT1/YT2@KatRd (60.788579,-135.166302)
YT1,YT2 YT1/YT2@WannRd (60.772479,-135.15044)
YT1,YT2 YT1/YT2@CenSt (60.759893,-135.141191)

or

START YT2@BorRd 60.862343 -135.196595
YT2 YT2@TakHSRd 60.85705 -135.202029
YT2 60.849881 -135.203934 60.844649 -135.187111 60.830141 -135.187454 YT1_N/YT2_N 60.810264 -135.205286
YT1,YT2 60.79662 -135.170288 YT1/YT2@KatRd 60.788579 -135.166302
YT1,YT2 YT1/YT2@WannRd 60.772479 -135.15044
YT1,YT2 YT1/YT2@CenSt 60.759893 -135.141191

*/
function parsePTHContents(fileContents) {

    var table = '<table class="pthtable"><thead><tr><th>Route</th><th>To Point</th><th>Seg.<br>Miles</th><th>Cumul.<br>Miles</th></tr></thead><tbody>';
    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    graphEdges = new Array();
    waypoints = new Array();
    var totalMiles = 0.0;
    var segmentMiles = 0.0;
    var previousWaypoint = null;
    for (var i = 0; i < lines.length; i++) {
	if (lines[i].length > 0) {
	    // standardize first
	    var line = standardizePTHLine(lines[i]);
	    var info = PTHLineInfo(line, previousWaypoint);
	    waypoints[waypoints.length] = info.waypoint;
	    totalMiles += info.mileage;
	    // this will display as a graph, so create and assign the
	    // graph edges
	    if (previousWaypoint != null) {
		var newEdge = new GraphEdge(i-1, i, info.waypoint.elabel, info.via);
		previousWaypoint.edgeList[previousWaypoint.edgeList.length] = newEdge;
		info.waypoint.edgeList[0] = newEdge;
	    }
	    previousWaypoint = info.waypoint;
	    table += '<tr><td>' + waypoints[waypoints.length-1].elabel +
		"</td><td><a onclick=\"javascript:labelClickHDX(0);\">" + waypoints[waypoints.length-1].label +
		'</a></td><td style="text-align:right">' + info.mileage.toFixed(2) +
		'</td><td style="text-align:right">' + totalMiles.toFixed(2) +
		'</td></tr>';
	}
    }
    table += '</tbody></table>';
    //genEdges = true;
    usingAdjacencyLists = true;
    hdxAV.setStatus(hdxStates.PTH_LOADED);
    return table;
}

// parse the contents of a .nmp file
//
// Consists of a series of lines, each containing a waypoint name
// followed by two floating point numbers representing the point's
// latitude and longitude
//
// Entries are paired as "near-miss" points, and a graph edge is
// added between each pair for viewing.
//
function parseNMPContents(fileContents) {

    var table = '<table class="nmptable"><thead /><tbody>';
    // all lines describe waypoints
    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    waypoints = new Array();
    for (var i = 0; i < lines.length; i++) {
	if (lines[i].length > 0) {
	    var xline = lines[i].split(' ');
	    if (xline.length == 3) {
		waypoints[waypoints.length] = new Waypoint(xline[0], xline[1], xline[2], "", "");
	    }
	}
    }
    // graph edges between pairs, will be drawn as connections
    var numE = waypoints.length/2;
    graphEdges = new Array(numE);
    for (var i = 0; i < numE; i++) {
	// add the edge
	graphEdges[i] = new GraphEdge(2*i, 2*i+1, "", null);

	// add an entry to the table to be drawn in the pointbox
	var miles = distanceInMiles(waypoints[2*i].lat, waypoints[2*i].lon,
				    waypoints[2*i+1].lat,
				    waypoints[2*i+1].lon).toFixed(4);
	var feet = distanceInFeet(waypoints[2*i].lat, waypoints[2*i].lon,
				  waypoints[2*i+1].lat,
				  waypoints[2*i+1].lon).toFixed(2);
	table += "<tr><td><table class=\"nmptable2\"><thead /><tbody><tr><td>"
	    + "<a onclick=\"javascript:labelClickHDX(" + 2*i + ");\">"
	    + waypoints[2*i].label + "</a></td><td>("
	    + waypoints[2*i].lat + ","
	    + waypoints[2*i].lon + ")</td></tr><tr><td>"
	    + "<a onclick=\"javascript:labelClickHDX(" + 2*i+1 + ");\">"
	    + waypoints[2*i+1].label + "</a></td><td>("
	    + waypoints[2*i+1].lat + ","
	    + waypoints[2*i+1].lon + ")</td></tr>"
	    + "</tbody></table></td><td>"
	    + miles  + " mi/"
	    + feet + " ft</td></tr>";
    }

    table += "</tbody></table>";
    genEdges = false;
    hdxAV.setStatus(hdxStates.NMP_LOADED);
    return table;
}

// parse the contents of a .wpl file
//
// Consists of a series of lines, each containing a waypoint name
// followed by two floating point numbers representing the point's
// latitude and longitude
//
function parseWPLContents(fileContents) {

    var vTable = '<table class="gratable"><thead><tr><th colspan="2">Waypoints</th></tr><tr><th>Coordinates</th><th>Waypoint Name</th></tr></thead><tbody>';

    // all lines describe waypoints
    var lines = fileContents.replace(/\r\n/g,"\n").split('\n');
    waypoints = new Array();
    for (var i = 0; i < lines.length; i++) {
	if (lines[i].length > 0) {
	    var vertexInfo = lines[i].split(' ');
	    if (vertexInfo.length == 3) {
		var w = new Waypoint(vertexInfo[0], vertexInfo[1], vertexInfo[2], "", "");
		waypoints[waypoints.length] = w;
		vTable += '<tr><td>(' + parseFloat(vertexInfo[1]).toFixed(3) + ',' +
		    parseFloat(vertexInfo[2]).toFixed(3) + ')</td><td>'
		    + "<a onclick=\"javascript:labelClickHDX(" + i + ");\">"
		    + w.label + "</a></td></tr>"
	    }
	}
    }
    vTable += '</tbody></table>';
    // no edges here
    graphEdges = new Array();
    genEdges = false;
    var summaryInfo = '<table class="gratable"><thead><tr><th>' + waypoints.length + " waypoints.</th></tr></table>";
    hdxAV.setStatus(hdxStates.WPL_LOADED);
    return summaryInfo + '<p />' + vTable;
}

function WPTLine2Waypoint(line) {

    // remove extraneous spaces in the line
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');

    var xline = line.split(' ');
    if (xline.length < 2) {
	return Waypoint('bad-line', 0, 0);
    }
    var label = xline[0];
    var url = xline[1];
    var latlon = Url2LatLon(url);
    return new Waypoint(label, latlon[0], latlon[1], 0, "");
}

// convert an openstreetmap URL to a latitude/longitude
function Url2LatLon(url) {

    var latlon = new Array(0., 0.);
    var floatpattern = '([-+]?[0-9]*\.?[0-9]+)';
    var latpattern = 'lat=' + floatpattern;
    var lonpattern = 'lon=' + floatpattern;

    //search for lat
    var matches = url.match(latpattern);
    if (matches != null) {
	latlon[0] = parseFloat(matches[1]).toFixed(6);
    }

    //search for lon
    matches = url.match(lonpattern);
    if (matches != null) {
	latlon[1] = parseFloat(matches[1]).toFixed(6);
    }

    return latlon;
}

// "standardize" a PTH line so it has coordinates separated by a space
// instead of in parens and with any extraneous spaces removed
function standardizePTHLine(line) {

    // remove extraneous spaces
    var newline = line;
    do {
	line = newline;
	newline = line.replace('  ',' ');
    } while (line != newline);


    // if this doesn't end in a paren, we should be good
    if (!line.endsWith(')')) {
	return line;
    }

    // this ends in a paren, so we convert each "(lat,lng)" group to
    // simply "lat lng"
    var xline = line.split(' ');
    line = xline[0];
    for (var pos = 1; pos < xline.length; pos++) {
	var newlatlng = xline[pos];
	if ((xline[pos].charAt(0) == '(') &&
	    (xline[pos].indexOf(',') > 0) &&
	    (xline[pos].charAt(xline[pos].length-1) == ')')) {
	    newlatlng = xline[pos].replace('(', '');
	    newlatlng = newlatlng.replace(',', ' ');
	    newlatlng = newlatlng.replace(')', '');
	}
	line += " " + newlatlng;
    }
    return line;
}

// convert a "standardized" PTH line to a Waypoint object with support
// for intermediate points along a segment
function PTHLine2Waypoint(line) {

    var xline = line.split(' ');
    if (xline.length < 4) {
	return Waypoint('bad-line', 0, 0);
    }
    return new Waypoint(xline[xline.length-3], xline[xline.length-2], xline[xline.length-1], 0, xline[0]);

}

// OLD: convert PTH line to a Waypoint object
function PTHLine2WaypointOLD(line) {

    // remove any extraneous spaces in the line
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');
    line = line.replace('  ', ' ');

    var xline = line.split(' ');
    // check for and convert a (lat,lng) format
    if ((xline.length == 3) &&
	(xline[2].charAt(0) == '(') &&
	(xline[2].indexOf(',') > 0) &&
	(xline[2].charAt(xline[2].length-1) == ')')) {
	newlatlng = xline[2].replace('(', '');
	newlatlng = newlatlng.replace(',', ' ');
	newlatlng = newlatlng.replace(')', '');
	return PTHLine2Waypoint(xline[0] + " " + xline[1] + " " + newlatlng);
    }
    if (xline.length < 4) {
	return Waypoint('bad-line', 0, 0);
    }
    return new Waypoint(xline[1], xline[2], xline[3], 0, xline[0]);
}

// mileage with a "standardized" PTH line that could have intermediate points
// to include
function mileageWithPTHLine(from, to, line) {

    var xline = line.split(' ');
    if (xline.length == 4) {
	// no intermediate points, so just compute mileage
	return distanceInMiles(from.lat, from.lon, to.lat, to.lon);
    }

    // we have more points, compute sum of segments
    var total = 0.0;
    var last_lat = from.lat;
    var last_lon = from.lon;
    var num_points = (xline.length - 4) / 2;
    for (var i = 0; i < num_points; i++) {
	var this_lat = parseFloat(xline[2*i+1]).toFixed(6);
	var this_lon = parseFloat(xline[2*i+2]).toFixed(6);
	total += distanceInMiles(last_lat, last_lon, this_lat, this_lon);
	last_lat = this_lat;
	last_lon = this_lon;
    }
    total += distanceInMiles(last_lat, last_lon, to.lat, to.lon);
    return total;
}

// parse all useful info from a "standardized" PTH file line and
// return in an object with fields for waypoint (a Waypoint object),
// mileage (a number), and via, an array of lat/lng values the
// path passes through that will be used to construct the edge
// that this line represents in the path
// extra parameter is the previous waypoint for mileage computation
function PTHLineInfo(line, from) {

    var xline = line.split(' ');
    if (xline.length < 4) {
	return {
	    waypoint: Waypoint('bad-line', 0, 0),
	    mileage: 0.0,
	    via: null};
    }
    var result = {
	waypoint: new Waypoint(xline[xline.length-3], xline[xline.length-2],
			       xline[xline.length-1], xline[0], new Array()),
	mileage: 0.0,
	via: null
    };

    if (xline.length == 4) {
	// no intermediate points, so just compute mileage and have a
	// null "via" list
	if (from != null) {
	    result.mileage = distanceInMiles(from.lat, from.lon,
					     result.waypoint.lat,
					     result.waypoint.lon);
	}
	result.via = null;
    }
    else {
	// we have more points, compute sum of segments
	// and remember our list of lat/lng points in via
	var total = 0.0;
	var last_lat = from.lat;
	var last_lon = from.lon;
	var num_points = (xline.length - 4) / 2;
	for (var i = 0; i < num_points; i++) {
	    var this_lat = parseFloat(xline[2*i+1]).toFixed(6);
	    var this_lon = parseFloat(xline[2*i+2]).toFixed(6);
	    total += distanceInMiles(last_lat, last_lon, this_lat, this_lon);
	    last_lat = this_lat;
	    last_lon = this_lon;
	}
	total += distanceInMiles(last_lat, last_lon,
				 result.waypoint.lat, result.waypoint.lon);
	result.mileage = total;
	result.via = xline.slice(1,xline.length-3);
    }
    return result;
}

function toggleTable() {
    var menu = document.getElementById("showHideMenu");
    var index = menu.selectedIndex;
    var value = menu.options[index].value;
    //  var algoTable = menu.algorithmbased.value;
    var pointbox = document.getElementById("pointbox");
    var options = document.getElementById("options");
    var selected = document.getElementById("selected");
    var algorithmVisualization =
	document.getElementById("AlgorithmVisualization");
    // show only table (or no table) based on value
    if (value == "pointbox") {
	selected.removeChild(selected.childNodes[selected.childNodes.length-1]);
	var newEle = document.createElement("div");
	newEle.setAttribute("id", "newEle");
	newEle.innerHTML = pointbox.innerHTML;
	if ($("#connection").length != 0 || $("#waypoints").length != 0)
	    document.getElementById("connection").parentNode.parentNode.style.display = "";
	selected.appendChild(newEle);
    }
    else if (value == "options") {
	selected.removeChild(selected.childNodes[selected.childNodes.length-1]);
	var newEle = document.createElement("div");
	newEle.setAttribute("id", "newEle");
	newEle.innerHTML = options.innerHTML;
	selected.appendChild(newEle);
	if ($("#connection").length != 0 || $("#waypoints").length != 0)
	    document.getElementById("connection").parentNode.parentNode.style.display = "";
	if (document.querySelector(".loadcollapse").style.display == "none")
	    document.getElementById("loadcollapsebtn").style.display = "";
    }
    else if (value =="AlgorithmVisualization") {
	selected.removeChild(selected.childNodes[selected.childNodes.length-1]);
	var newEle = document.createElement("div");
	newEle.setAttribute("id", "newEle");
	newEle.innerHTML = algorithmVisualization.innerHTML;
	selected.appendChild(newEle);
	if ($("#connection").length != 0 || $("#waypoints").length != 0)
	    document.getElementById("connection").parentNode.parentNode.style.display = "";
	if (document.querySelector(".loadcollapse").style.display == "none")
	    document.getElementById("loadcollapsebtn").style.display = "";
    }
    else {  
	selected.removeChild(selected.childNodes[selected.childNodes.length-1]);
	var newEle = document.createElement("div");
	newEle.setAttribute("id", "newEle");
	selected.appendChild(newEle);
	if ($("#connection").length != 0 || $("#waypoints").length != 0)
	    document.getElementById("connection").parentNode.parentNode.style.display = "none";
    }
}

// get the selected algorithm from the AlgorithmSelection menu
// (factored out here to avoid repeated code)
function getCurrentAlgorithm() {
    var menuSelection = document.getElementById("AlgorithmSelection");
    var selectionIndex = menuSelection.selectedIndex;
    return menuSelection.options[selectionIndex].value;
}

// pseudocode display event handler
function showHidePseudocode() {

    let show = document.getElementById("pseudoCheckbox").checked;
    document.getElementById("pseudoText").style.display =
	(show ? "" : "none");
}

// generic event handler for start/pause/resume button
function startPausePressed() {
    
    switch (hdxAV.status) {

    case hdxStates.AV_SELECTED:
	// if we have selected but not yet started an algorithm,
	// this is a start button
	hdxAV.setStatus(hdxStates.AV_RUNNING);
	if ( hdxAV.delay == -1)
	{
		hdxAV.startPause.innerHTML = "Next Step";
	}
	else
	{
		hdxAV.startPause.innerHTML = "Pause";
	}
	document.getElementById("AlgorithmSelection").disabled = true;
	selectAlgorithmAndStart();
	break;

    case hdxStates.AV_RUNNING:
	// if we are in a running algorithm, this is a pause button
	// the running algorithm will pause when its next
	// timer event fires	
	hdxAV.setStatus(hdxStates.AV_PAUSED);
	if ( hdxAV.delay == -1)
	{
		hdxAV.startPause.innerHTML = "Next Step";
	}
	else
	{
		hdxAV.startPause.innerHTML = "Resume";
	}
	break;
	
    case hdxStates.AV_PAUSED:
	if ( hdxAV.delay == -1)
	{
		hdxAV.setStatus(hdxStates.AV_RUNNING);
		hdxAV.startPause.innerHTML = "Next Step";
		continuePausedAlgorithm();
	}
	else
	{
		// if we are in paused algorithm, this is a resume button
		hdxAV.setStatus(hdxStates.AV_RUNNING);
		hdxAV.startPause.innerHTML = "Pause";
		continuePausedAlgorithm();
	}
	break;

    default:
	alert("startPausePressed, unexpected status=" + hdxAV.status);
    }
}


// function to resume a paused algorithm
function continuePausedAlgorithm() {

    hdxAV.currentAV.nextStep();
}

// function to begin the execution of a new AV
function selectAlgorithmAndStart() {

    resetVars();
    hdxAV.currentAV.start();
}

function showLegend() {
    var show = document.getElementById("showLegend").checked;
    var value = getCurrentAlgorithm();
    if (show) {
        if (value == "vertexSearch") {
            document.getElementById('legends').innerHTML = "<pre> Longest Label : green \n " +
                "Shortest Label: brown \n" + " Vertex winners in the table and map: red \n" +
                " Current vertex in the table and map : yellow \n</pre>";
        }
	else if (value == "DFS") {
            document.getElementById('legends').innerHTML = "<pre> Starting vertex : green\n" + " Vertex visiting for the first time : yellow\n" + " Edges got used before visiting the candidate : red\n" +
                " Neighbor edges and possible next candidate: purple\n" + " Vertex in the stack : blue\n" + " Vertex that no be in the stack anymore : gray\n </pre>";
        }
	else if (value == "BFS") {
            document.getElementById('legends').innerHTML = "<pre> Starting vertex : green\n" + "<i>show the yellow</i> \n" + "Edges got used before visiting the candidate : red\n" +
                " Neighbor edges and possible next candidate: purple\n" + " Vertex in the queue : blue\n" + " Vertex that no be in the queue anymore : gray\n </pre>";
        }
	else if (value == "EdgeSearch") {
            document.getElementById('legends').innerHTML = "<pre>// fill in for real later \n</pre>";
        }
	else if (value == "RFS") {
            document.getElementById('legends').innerHTML = "<pre> Starting vertex : green\n" + " Vertex visiting for the first time : yellow\n" + " Edges got used before visiting the candidate : red\n" +
                " Neighbor edges and possible next candidate: purple\n" + " Vertex in the list : blue\n" + " Vertex that no be in the list anymore : gray\n </pre>";
        }
    }
    else {
        document.getElementById('legends').innerHTML = "";
    }
}

// Event handler for state change on the algorithm selection select control
function algorithmSelected() {

    // if we have an algorithm already selected, clean up its
    // UI first
    if (hdxAV.currentAV != null) {

	hdxAV.currentAV.cleanupUI();
    }
    
    var value = getCurrentAlgorithm();

    // if we selected a valid algorithm, enable the start button
    if (value != hdxNoAV.value) {
	hdxAV.setStatus(hdxStates.AV_SELECTED);
	hdxAV.startPause.disabled = false;
    }

    // set the current algorithm
    for (var i = 1; i < hdxAV.avList.length; i++) {
	if (value == hdxAV.avList[i].value) {
	    hdxAV.currentAV = hdxAV.avList[i];
	    break;
	}
    }

    // set pseudocode
    document.getElementById("pseudoText").innerHTML = hdxAV.currentAV.code;

    // call its function to set up its status and options
    hdxAV.currentAV.setupUI();
}

//function toggleDS() {
//    if (hdxAV.algStat.style.display == "none") {/
//	hdxAV.algStat.style.display = "";
//    }
//    else {
//	hdxAV.algStat.style.display = "none";
//   }
//}

/* SEEMS TO BE UNUSED
function selectAlgorithmAndReset() {
    for (var i = 0; i < connections.length; i++) {
        connections[i].remove();
        document.getElementById('connection' + i).style.backgroundColor = "white";
    }
    connections = new Array();
    polypoints = new Array();
    for (var i = 0; i < markers.length; i++) {
        markers[i].remove();
        document.getElementById('waypoint' + i).style.backgroundColor = "white";
    }
    markers = new Array();
    markerinfo = new Array();
}
*/

function drag(event) {
    var x = event.target.style.left;
    var y = event.target.style.top;
    event.dataTransfer.setData("id",event.target.id);
    if (x == "70%") {		
	event.dataTransfer.setData("x",document.documentElement.clientWidth*.7-event.clientX);
    }
    else {
	event.dataTransfer.setData("x",parseInt(x.substring(0,x.length-2))-event.clientX);
    }
    event.dataTransfer.setData("y",parseInt(y.substring(0,y.length-2))-event.clientY);
}

function drop(event) {
    event.preventDefault();
    var de = document.getElementById(event.dataTransfer.getData("id"));
    de.style.left =
	(event.clientX+parseInt(event.dataTransfer.getData("x"))) + 'px';
    de.style.top =
	(event.clientY+parseInt(event.dataTransfer.getData("y"))) + 'px';
}

function allowdrop(event) {
    event.preventDefault();
}   

function toggleUI(event) {
    var button = event.target;
    var panel1 = document.getElementById(button.id.substring(6));
    if (button.value.substring(0,4) == "Hide") {
	button.value = "Show"+ button.value.substring(4);
	panel1.style.display = "none";
    }
    else {
	button.value = "Hide"+button.value.substring(4);
	panel1.style.display = "";
    }
}


// moved to the end for now, until all variables are grouped by algorithm
function resetVars() {
    if (hdxAV.status == hdxStates.AV_COMPLETE ||
	hdxAV.previousAlgorithm != document.getElementById("AlgorithmSelection").value) {
	//hdxAV.done = false;
	hdxAV.reset();
	updateMap();
	
	if ($("#piecesTD").length > 0) {
	    document.getElementById("piecesTD").parentNode.parentNode.removeChild(document.getElementById("piecesTD").parentNode);
	}
	hdxAV.algStat.innerHTML = "";
    }
}


/**********************************************************************
 * General utility functions
 **********************************************************************/

// print a list to the console
function printList(items) {

    console.log(listToVIndexString(items));
}

// return a String containing the objects in a list
function listToVIndexString(items) {
    if (items.length == 0) {
        return "[]";
    }
    else {
        var line = `[`;
        for (var i = 0; i < items.length; i++) {
            if (i == items.length - 1) {
                line += items[i].vIndex;
            } else {
                line += items[i].vIndex + `, `;
            }	    
        }
        line += ` ]`;
        return line;
    }
}

// Compute Squared Distance 
function squaredDistance(o1, o2) {
    var dx, dy;
    dx = o1.lon - o2.lon;
    dy = o1.lat - o2.lat;
    return dx * dx + dy * dy;
}
