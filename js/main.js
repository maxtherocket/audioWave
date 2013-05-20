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

var controls = null;

var config = {
	maxLines: 50,
	fftSize: 512,
	peakXSpacing: 1
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
		console.log('analyser: ', analyser);
	} catch(e) {
		alert('Web Audio API is not supported in this browser');
	}
});

var initScene = function(){
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( '#ECD078', 0, 500 );
	camera = new THREE.PerspectiveCamera( 75, $(document).width() / $(document).height(), 0.1, 1000 );

	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColorHex( 0xECD078, 1 );
	document.body.appendChild( renderer.domElement );

	controls = new THREE.OrbitControls( camera, renderer.domElement );

	linesHolder = new THREE.Object3D();
	linesHolder.position.x = -(config.peakXSpacing*analyser.frequencyBinCount)/2 + 20;
	linesHolder.position.y = -30;

	scene.add( linesHolder );

	lineMaterial = new THREE.LineBasicMaterial({color:'#C02942'}); 

	camera.position.z = 100;
	camera.position.y = 0;

	render();
}

function render() {
	requestAnimationFrame(render);

	controls.update();

	createLine();
	renderer.render(scene, camera);
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


