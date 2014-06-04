var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var sampleRate;

app.use(express.static(__dirname));

app.get('/', function (req, res) {
  res.sendfile('index.html');
});

var buffer = new Buffer(0);

io.on('connection', function (socket) {
  console.log('a user connected');
  socket.on('disconnect', function () {
    console.log('user disconnected');
  });
  socket.on('metadata', function (msg) {
    sampleRate = msg.sampleRate;
  });
  socket.on('record', function (msg) {
    var buf = msg.data;
    buffer = Buffer.concat([buffer, buf]);
    console.log(buffer.length);
  });
  socket.on('flush', function (msg) {
    var wavFile = Buffer.concat([createWaveHeader(), buffer]);
    fs.writeFile('test.wav', wavFile, null, function (err) {
      if (err) {
        console.error(err);
      } else {
        console.log("The file was saved!");
        buffer.length = 0;
      }
    });
  });
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});

function createWaveHeader(){
  var header = new Buffer(44);

  /* RIFF identifier */
  header.write('RIFF', 0);
  /* file length */
  header.writeUInt32LE(32 + buffer.length, 4);
  /* RIFF type */
  header.write('WAVE', 8);
  /* format chunk identifier */
  header.write('fmt ', 12);
  /* format chunk length */
  header.writeUInt32LE(16, 16);
  /* sample format (raw) */
  header.writeUInt16LE(1, 20);
  /* channel count */
  header.writeUInt16LE(1, 22);
  /* sample rate */
  header.writeUInt32LE(sampleRate, 24);
  /* byte rate (sample rate * block align) */
  header.writeUInt32LE(sampleRate * 4, 28);
  /* block align (channel count * bytes per sample) */
  header.writeUInt16LE(4, 32);
  /* bits per sample */
  header.writeUInt16LE(16, 34);
  /* data chunk identifier */
  header.write('data', 36);
  /* data chunk length */
  header.writeUInt32LE(buffer.length, 40);

  return header;
}
