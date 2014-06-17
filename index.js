var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var bodyParser = require('body-parser');
var sampleRate, audioDir = './audio/', fileId = 0;

app.use(express.static(__dirname));
app.use(bodyParser());

app.get('/', function (req, res) {
  res.sendfile('index.html');
});

app.get('/audio/:id', function (req, res) {
  var id = req.params.id;
  res.type('audio/wave');
  res.sendfile(audioDir + id);
});

app.get('/list', function (req, res) {
  var allFiles = fs.readdirSync(audioDir), file, list = [];
  for (var i = 0, il = allFiles.length; i < il; i++) {
    file = allFiles[i];
    if (file.indexOf('.wav', file.length - 4) !== -1) {
      list.push(file);
    }
  }
  res.json(list);
});

app.post('/mix', function (req, res) {
  var args = req.body.mix || [];
  if (args.length < 2) {
    res.redirect('/');
    return;
  }

  for (var i = 0, il = args.length; i < il; i++) {
    args[i] = audioDir + args[i];
  }
  args.unshift('-m');
  args.push(audioDir + 'beketa-' + (fileId++) + '.wav');

  var spawn = require('child_process').spawn;
  var sox    = spawn('sox', args);
  sox.on('close', function(code) {
    console.log('[from sox] : child process exited with code ' + code);
    //res.redirect(303, '/');
    if (code) {
      res.json({result: 'failed'});
    } else {
      res.json({result: 'success'});
    }
  });
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
    //console.log(buffer.length);
  });
  socket.on('flush', function (msg, callback) {
    console.log("Received 'flush' message");
    var wavFile = Buffer.concat([createWaveHeader(), buffer]);
    var fileName = audioDir + 'beketa-' + (fileId++) + '.wav';
    //var err = fs.writeFileSync(fileName, wavFile, null);
    fs.writeFile(fileName, wavFile, null, function (err) {
      if (err) {
        console.error(err);
        callback('error');
      } else {
        console.log("The file was saved as ", fileName);
        buffer.length = 0;
        callback('success');
      }
    });
    socket.emit('reuslt', {data: 'success'});
  });
  socket.on('delete', function (msg, callback) {
    console.log("Received 'delete' message");
    var list = msg.list, err, result = true;
    for (var i = 0, il = list.length; i < il; i++) {
      err = fs.unlinkSync(audioDir + list[i]);
      if (err) {
        result = false;
      }
    }
    callback(result ? 'success' : 'error');
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
