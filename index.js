var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var sampleRate, audioDir = './audio/', fileId = 0;
var buffer = null;

app.use(express.static(__dirname));
app.use(require('body-parser')());

if (!fs.existsSync(audioDir)) {
  try {
    fs.mkdirSync(audioDir);
  } catch (e) {
    console.error('Unable to create "audio" dir. Exit.');
    return;
  }
}

app.get('/', function (req, res) {
  res.sendfile('index.html');
});

app.get('/audio/:id', function (req, res) {
  var id = req.params.id;
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
    console.error('Invalid argument.');
    res.json({result: 'failed'});
    return;
  }

  for (var i = 0, il = args.length; i < il; i++) {
    args[i] = audioDir + args[i];
  }
  args.unshift('-m');
  args.push(audioDir + 'track-' + (fileId++) + '.wav');

  var spawn = require('child_process').spawn;
  var sox    = spawn('sox', args);
  console.log('Executing SoX with args: ' + args);
  sox.on('close', function(code) {
    console.log('child process exited with code ' + code);
    if (code) {
      res.json({result: 'failed'});
    } else {
      res.json({result: 'success'});
      io.emit('server', {message: 'updateList'});
    }
  });
});

app.post('/delete', function (req, res) {
  var args = req.body.list || [], success = true;

  if (args.length === 0) {
    console.error('Invalid argument.');
    res.json({result: 'failed'});
    return;
  }

  for (var i = 0, il = args.length; i < il; i++) {
    err = fs.unlinkSync(audioDir + args[i]);
    if (err) {
      success = false;
    }
  }

  if (success) {
    res.json({result: 'success'});
    io.emit('server', {message: 'updateList'});
    console.log('File deleted: ', args);
  } else {
    res.json({result: 'failed'});
  }
});

io.on('connection', function (socket) {
  console.log('a user connected');
  socket.on('disconnect', function () {
    console.log('user disconnected');
  });
  socket.on('metadata', function (msg) {
    sampleRate = msg.sampleRate;
  });
  socket.on('start', function () {
    buffer = new Buffer(0);
  });
  socket.on('record', function (msg) {
    var buf = msg.data;
    buffer = Buffer.concat([buffer, buf]);
    //console.log(buffer.length);
  });
  socket.on('flush', function (msg) {
    console.log("Received 'flush' message");
    var wavFile = Buffer.concat([createWaveHeader(), buffer]);
    var fileName = audioDir + 'track-' + (fileId++) + '.wav';
    fs.writeFile(fileName, wavFile, null, function (err) {
      if (err) {
        console.error('An error occured in writing buffer');
      } else {
        console.log("The file was saved as ", fileName);
        //buffer.length = 0;
        io.emit('server', {message: 'updateList'});
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
