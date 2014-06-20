(function () {

  var WORKER_PATH = 'recorderWorker.js';
  var BUFFER_LENGTH = 4096; // number of samples to send at a time.

  function Recorder(source, callback) {
    var context = source.context;
    var node = context.createScriptProcessor(BUFFER_LENGTH, 1, 1);
    var worker = this.worker = new Worker(WORKER_PATH);
    var self = this;

    this.recording = false;

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
      if (!self.recording) return;
      worker.postMessage({
        command: 'record',
        buffer: e.inputBuffer.getChannelData(0)
      });
    }

    source.connect(node);
    node.connect(context.destination);
  }

  Recorder.prototype.record = function () {
    this.recording = true;
  };

  Recorder.prototype.stop = function () {
    this.recording = false;
  };

  Recorder.prototype.save = function () {
    this.worker.postMessage({ command: 'save' });
  };

  Recorder.prototype.disconnect = function () {
    this.worker.postMessage({ command: 'disconnect' });
  };

  window.Recorder = Recorder;

}());
