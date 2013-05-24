var context;

var gui = null;

var player = null;
var analyser = null;

var scene = null;
var camera = null;
var renderer = null;
var cube = null;

var lineMeshes = [];
var linesHolder = null;
var lineMaterial = null;

var planeMesh = null;
var spotLight = null;

var controls = null;

var config = {
	maxLines: 100,
	fftSize: 64,
	peakXSpacing: 10,
	peakZSpacing: 10
}

var SoundControl = function(src){
	var source = src;

	this.play = function(){
		source.start(0);
	}

	this.stop = function(){
		source.stop(0);
	}

}
var soundControl = null;

var songLoadError = function(err){
	console.log('err: ', err);
}

var loadSong = function(url) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  // Decode asynchronously
  request.onload = function() {
    context.decodeAudioData(request.response, songLoaded, songLoadError);
  }
  request.send();
}

var songLoaded = function(){
	gui.add(player, 'play');
  	gui.add(player, 'stop');
  	player.source.connect(analyser);
  	player.play();
  	initScene();
}

function playSong(buffer) {
  var source = context.createBufferSource(); // creates a sound source
  source.buffer = buffer;                    // tell the source which sound to play
  source.connect(context.destination);       // connect the source to the context's destination (the speakers)
  soundControl = new SoundControl(source);
}

$(function(){
	gui = new dat.GUI();
	try {
	// Fix up for prefixing
		window.AudioContext = window.AudioContext||window.webkitAudioContext;
		context = new AudioContext();
		player = new RemoteAudioPlayer(context, 'audio/Star Guitar.mp3');
		player.load(songLoaded);
		analyser = context.createAnalyser();
		analyser.fftSize = config.fftSize;
		analyser.smoothingTimeConstant = 0.5;
		console.log('analyser: ', analyser);
	} catch(e) {
		console.log('e: ', e);
		alert('Web Audio API is not supported in this browser');
	}
});

var initScene = function(){
	scene = new THREE.Scene();
	//scene.fog = new THREE.Fog( '#ECD078', 0, 500 );
	camera = new THREE.PerspectiveCamera( 75, $(document).width() / $(document).height(), 0.1, 1000 );

	// Renderer
	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xECD078, 1 );
	renderer.shadowMapEnabled = true;
	document.body.appendChild( renderer.domElement );

	// orbit control
	controls = new THREE.OrbitControls( camera, renderer.domElement );

	linesHolder = new THREE.Object3D();
	linesHolder.position.x = -(config.peakXSpacing*analyser.frequencyBinCount)/2 + 20;
	linesHolder.position.y = -50;

	spotLight = new THREE.SpotLight( 0xD95B43 );
	spotLight.castShadow = true;
	//spotLight.shadowCameraVisible = true;
	spotLight.position.set( -56, 250, -121 );

	spotLight.shadowMapWidth = 1024;
	spotLight.shadowMapHeight = 1024;

	spotLight.shadowCameraNear = 500;
	spotLight.shadowCameraFar = 4000;
	spotLight.shadowCameraFov = 30;

	scene.add( spotLight );
	gui.add(spotLight.position, 'x', -500, 500);
	gui.add(spotLight.position, 'y', -500, 500);
	gui.add(spotLight.position, 'z', -500, 500);
	//gui.add(spotLight, 'shadowMapWidth', 0, 1500);
	//gui.add(spotLight, 'shadowMapHeight', 0, 1500);

	// Create plane
	//var basicMaterial = new THREE.MeshPhongMaterial( {color:'#D95B43', wireframe:false, shading:THREE.FlatShading} );
	//var basicMaterial = new THREE.MeshLambertMaterial( {color:'#D95B43', wireframe:false, shading:THREE.FlatShading} );
	var basicMaterial = new THREE.MeshLambertMaterial( {wireframe:false, shading: THREE.FlatShading } );
	//var basicMaterial = new THREE.MeshNormalMaterial( {wireframe:false, shading: THREE.FlatShading } );
	//basicMaterial.vertexColors = true;
	var planeGeometry = new THREE.Geometry();

	var freqBinCount = analyser.frequencyBinCount;
	for (var i = 0, len = config.maxLines; i < len; i += 1) {
		// Generate vertices
		for (var j = 0; j < freqBinCount; j += 1) {
			planeGeometry.vertices.push( new THREE.Vector3( config.peakXSpacing*j, 0, -config.peakZSpacing*i ) );
			//planeGeometry.colors.push( 0xD95B43 );
		}
		// Generate faces
		if (i > 0){
			var curRowStartIndex = freqBinCount*i;
			var prevRowStartIndex = freqBinCount*(i-1);
			for (var k = 0; k < freqBinCount-1; k += 1) {
				var a = prevRowStartIndex + k; 
				var b = curRowStartIndex + k;
				var c = curRowStartIndex + k+1;
				var d = prevRowStartIndex + k+1;
				planeGeometry.faces.push( new THREE.Face3( a, c, b) );
				planeGeometry.faces.push( new THREE.Face3( d, c, a) );
			}
		}
	}
	planeMesh = new THREE.Mesh(planeGeometry, basicMaterial);
	planeMesh.castShadow = true;
	planeMesh.receiveShadow = true;
	planeMesh.position.x = -(config.peakXSpacing*freqBinCount)/2;
	planeMesh.position.y = -20;
	planeMesh.position.z = 10;
	scene.add( planeMesh );

	camera.position.z = 100;

	render();
}

function render() {
	requestAnimationFrame(render);

	controls.update();

	raiseVertices();

	renderer.render(scene, camera);
}

var raiseVertices = function(){
	var freqBinCount = analyser.frequencyBinCount;
	for (var i = config.maxLines-1; i > 0; i -= 1) {
		// Generate vertices
		var curRowStartIndex = freqBinCount*i;
		var prevRowStartIndex = freqBinCount*(i-1);
		for (var j = 0; j < freqBinCount; j += 1) {
			planeMesh.geometry.vertices[curRowStartIndex+j].y = planeMesh.geometry.vertices[prevRowStartIndex+j].y;
		}
	}
	// Current row data
	freqData = new Uint8Array(analyser.frequencyBinCount);
  	analyser.getByteFrequencyData(freqData);
  	for (var i = 0, len = freqData.length; i < len; i += 1) {
  		//if (freqData[i]===0) break;
  		var y = (freqData[i]/255)*90;
  		planeMesh.geometry.vertices[i].y = y;
  	}

  	planeMesh.geometry.computeFaceNormals();
	planeMesh.geometry.verticesNeedUpdate = true;
	planeMesh.geometry.normalsNeedUpdate = true;
}

var createLine = function(){
	if (lineMeshes.length > 0){
		linesHolder.remove(lineMeshes[0]);
	}
  	for (var i = 0, len = lineMeshes.length-1; i < len; i += 1) {
  		lineMeshes[i] = lineMeshes[i+1];
  		lineMeshes[i].position.z -= 3 + (i*0.5);
  		//lineMeshes[i].position.y += 3;
  	}

	var geometry = new THREE.Geometry()
	freqData = new Uint8Array(analyser.frequencyBinCount);
  	analyser.getByteFrequencyData(freqData);
  	for (var i = 0, len = freqData.length; i < len; i += 1) {
  		if (freqData[i]===0) break;
  		geometry.vertices.push( new THREE.Vector3( i*config.peakXSpacing, (freqData[i]/255)*90, 0 ) );
  	}
  	var line = new THREE.Line( geometry, lineMaterial );

  	linesHolder.add( line );
  	if (lineMeshes.length < config.maxLines){
		lineMeshes.push( line );
	} else {
		lineMeshes[config.maxLines-1] = line;
	}
}


