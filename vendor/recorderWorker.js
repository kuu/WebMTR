var sampleRate, socket;

importScripts('/socket.io/socket.io.js');

this.onmessage = function(e){
  switch(e.data.command){
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
    case 'clear':
      clear();
      break;
  }
};

function init(config){
  sampleRate = config.sampleRate;
  socket = io();
  socket.emit('metadata', {
    sampleRate: sampleRate
  });
}

function record(inputBuffer){
  socket.emit('record', {
    L: inputBuffer[0],
    R: inputBuffer[1],
  });
}

function clear(){
  //
}
