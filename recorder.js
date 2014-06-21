(function () {

  var worker, recording = false;

  function Recorder(source, callback) {
    var context = source.context;
    var node = context.createScriptProcessor(4096, 1, 1);
    worker = new Worker('recorderWorker.js');

    recording = false;

    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: context.sampleRate
      }
    });

    worker.onmessage = function (e) {
      if (callback) {
        callback(e.data);
      }
    };

    node.onaudioprocess = function (e) {
      if (!recording) return;
      worker.postMessage({
        command: 'record',
        buffer: e.inputBuffer.getChannelData(0)
      });
    }

    source.connect(node);
    node.connect(context.destination);
  }

  Recorder.prototype.record = function () {
    worker.postMessage({ command: 'start' });
    recording = true;
  };

  Recorder.prototype.stop = function () {
    recording = false;
  };

  Recorder.prototype.save = function () {
    worker.postMessage({ command: 'save' });
  };

  Recorder.prototype.disconnect = function () {
    worker.postMessage({ command: 'disconnect' });
  };

  window.Recorder = Recorder;

}());
