/*
   RemoteAudioPlayer - Loads a remote audio resource into a Web Audio buffer.
   Mohit Muthanna Cheppudira - http://0xfe.blogspot.com
 */
RemoteAudioPlayer = function(context, url) {
  this.url = url;
  this.source = context.createBufferSource();
  this.buffer = 0;
  this.context = context;
}

RemoteAudioPlayer.prototype.getSource = function() {
  return this.source;
}

RemoteAudioPlayer.prototype.load = function(callback) {
  var request = new XMLHttpRequest();
  var that = this;
  request.open("GET", this.url, true);
  request.responseType = "arraybuffer";
  request.onload = function() {
    that.buffer = that.context.createBuffer(request.response, true);
    that.reload();
    that.source.connect(context.destination); 
    callback(request.response);
  }

  request.send();
}

RemoteAudioPlayer.prototype.reload = function(callback) {
  this.source.buffer = this.buffer;
}

RemoteAudioPlayer.prototype.play = function() {
  if (this.source){
    this.source.start(0);
  }
}

RemoteAudioPlayer.prototype.stop = function() {
  if (this.source){
    this.source.stop(0);
  }
}