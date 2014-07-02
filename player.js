(function () {

  var Player = function () {
    this.elements = {};
  };

  Player.prototype.update = function (list) {
    var tSelf = this;

    return new Promise(function (resolve, reject) {
      var item, promiseList = [];

      if (!list) {
        reject(new Error('invalid args'));
        return;
      }

      for (var i = 0, il = list.length; i < il; i++) {
        item = list[i];
        if (item in tSelf.elements) {
          break;
        }
        promiseList.push(tSelf.request(item));
      }
      resolve(Promise.all(promiseList));
    });
  };

  Player.prototype.request = function (item) {
    var tSelf = this;

    return new Promise(function (resolve, reject) {
      var audio = new Audio();
      audio.src = '/audio/' + item;
      audio.addEventListener('canplay', function onCanPlay() {
        audio.removeEventListener('canplay', onCanPlay, false);
        audio.volume = 0.5;
        resolve(audio);
      }, false);
      audio.addEventListener('error', function onError() {
        audio.removeEventListener('error', onError, false);
        reject(new Error('Something wrong happened in fetching audio data.'));
      }, false);
    }).then(function (elem) {
      tSelf.elements[item] = elem;
    }, function (e) {
      throw e;
    });
  };

  Player.prototype.play = function (list) {
    var tSelf = this;

    return new Promise(function (resolve, reject) {
      var tElem, promiseList = [];

      if (!list) {
        reject(new Error('invalid args'));
        return;
      }

      for (var i = 0, il = list.length; i < il; i++) {
        tElem = tSelf.elements[list[i]];
        if (tElem) {
          promiseList.push(tSelf.playItem(tElem));
        }
      }
      resolve(Promise.all(promiseList));
    });
  };

  Player.prototype.playItem = function (item) {
    var tSelf = this;

    return new Promise(function (resolve, reject) {
      item.play();
      item.addEventListener('ended', function onEnded() {
        item.removeEventListener('ended', onEnded, false);
        resolve();
      }, false);
      item.addEventListener('error', function onError() {
        item.removeEventListener('error', onError, false);
        reject(new Error('Something wrong happened in playback.'));
      }, false);
    });
  };

  Player.prototype.stop = function () {
    var tElem;
    for (var k in this.elements) {
      tElem = this.elements[k];
      if (tElem) {
        tElem.pause();
        tElem.currentTime = 0;
      }
    }
  };

  Player.prototype.clear = function () {
    this.elements = {};
  };

  Player.prototype.setVolume = function (value) {
    var tElem;
    for (var k in this.elements) {
      tElem = this.elements[k];
      if (tElem) {
        tElem.volume = value;
      }
    }
  };

  window.Player = Player;

}());
