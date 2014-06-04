var socket;

importScripts('/socket.io/socket.io.js');

this.onmessage = function (e) {
  var command = e.data.command;
  if (command === 'init') {
    init(e.data.config);
  } else if (command === 'record') {
    record(e.data.buffer);
  } else if (command === 'clear') {
    clear();
  }
};

function init(config) {
  socket = io();
  socket.emit('metadata', {
    sampleRate:config.sampleRate 
  });
}

function record(inputBuffer) {
  // Float32Array -> Int16Array
  var sampleNum = inputBuffer.length;
  var buffer = new ArrayBuffer(sampleNum * 2);
  var view = new DataView(buffer);
  for (var i = 0, il = sampleNum, offset = 0; i < il; i++, offset += 2){
    var s = Math.max(-1, Math.min(1, inputBuffer[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  socket.emit('record', {
    data: view.buffer
  });
}

function clear() {
  socket.emit('flush', {
  });
}
