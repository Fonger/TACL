// Initialize Firebase
var config = {
  apiKey: "AIzaSyA7t-70TsjQO9vvEYC0jrhOtAe8JbgjHmk",
  authDomain: "tacl-79682.firebaseapp.com",
  databaseURL: "https://tacl-79682.firebaseio.com",
  storageBucket: "tacl-79682.appspot.com",
};
firebase.initializeApp(config);
var database = firebase.database();
var game = { season: '' };
// Calculate width of text from DOM element or string. By Phil Freo <http://philfreo.com>
$.fn.textWidth = function(text, font) {
    if (!$.fn.textWidth.fakeEl) $.fn.textWidth.fakeEl = $('<span>').hide().appendTo(document.body);
    $.fn.textWidth.fakeEl.text(text || this.val() || this.text()).css('font', font || this.css('font'));
    return $.fn.textWidth.fakeEl.width();
};

$.fn.prevOrLast = function(selector)
{
  var prev = this.prev(selector);
  return (prev.length) ? prev : this.nextAll(selector).last();
};

$(function() {
  var now = new Date();
  var scoreBoard = $('#scoreboard');
  var mainDate = $('#date');
  var bgVideo = $('#bg_video');
  var bgAudio = $('#bg_audio');
  var ingameOverlay = $('#ingame_overlay');
  var ingameScoreboard = $('#ingame_scoreboard')

  var ingame = $('.ingame');
  var waiting = $('.waiting');
  var first = $('.first');
  var second = $('.second');
  var fireStates = database.ref('states');

  var monthArr = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  var musicArr = ['firefly.mp3', 'spectre.mp3', 'eclipse.mp3', 'letgo.mp3'];

  var waitingCounter = 0;
  var noSoundTime = 0;

  bgAudio.prop('volume', 0);

  var audioSource = new AudioSource('bg_audio');

  var power, energy, scale = 1, decayScale = 0, smoothedScale = 0, decayScale = 0;
  var careFreq = 80;
  audioSource.onUpdate = function(data) {
    var final = 0;
    for(var bin = 0; bin < careFreq; bin++) {
        var val = data[bin];
        final += val;
    }

    var energy = final / careFreq / 256;

    scale = 1;
    power = Math.exp(energy);
    scale = scale * power;
    decayScale = Math.max(decayScale, scale);

    smoothedScale += (decayScale - smoothedScale) * 0.3;

    decayScale = decayScale * 0.985;

    $('.audioscale').filter(':visible').css('transform', 'scale(' + smoothedScale + ')');
  }

  function playNextSong() {
    bgAudio[0].pause();
    bgAudio[0].src='https://tacl.github.io/manager/assets/musics/' + musicArr[waitingCounter++ % musicArr.length]
    bgAudio[0].crossOrigin = 'anonymous';
    bgAudio[0].load();
    bgAudio[0].oncanplaythrough = function() {
      bgAudio[0].play();
      bgAudio.stop(true, false).animate({volume: 0.15}, 3000);
    }
  }
  var defaultCardStyle = {
    display: 'none'
  };
  fireStates.child('scene').on('value', function(result) {
    game.scene = result.val();
    switch (game.scene) {
      case 'waiting':
        if (Date.now() - noSoundTime > 15000) {
          playNextSong();
        } else {
          if (!bgAudio[0].src || bgAudio[0].src === '') {
            playNextSong();
          } else {
            bgAudio[0].play();
            bgAudio.stop(true, false).animate({volume: 0.15}, 3000);
          }
        }
        bgVideo[0].play();
        waiting.velocity('fadeIn');
        ingame.fadeOut();
        break;
      case 'ingame':
        waiting.velocity('fadeOut', 400, function() {
          bgVideo[0].pause();
        });

        bgAudio.stop(true, false).animate({volume: 0}, 5000, function() {
          bgAudio[0].pause();
        });

        ingame.velocity('fadeIn');

        var year = $('.ingame .season .year');
        var date = $('.ingame .season .date');

        year.html(now.getFullYear() + ' <span class="lightblue">S<span class="season-number">' + game.season + '</span></span>');
        date.html(monthArr[now.getMonth()] + ' ' + pad(now.getDate(), 2));

        year.css('transform', 'scaleX(' + 180 / year.textWidth() + ') translateY(10px)');
        year.css('transform-origin', '100% 50%')
        date.css('transform', 'scaleX(' + 180 / date.textWidth() + ') translateY(-5px)');
        date.css('transform-origin', (date.textWidth() > 180 ? '0' : '100') + '% 50%')
        noSoundTime = new Date().getTime();
        break;
      default:
        waiting.velocity('fadeOut', 400, function() {
          bgVideo[0].pause();
        });
        ingame.velocity('fadeOut');
        bgAudio.stop(true, false).animate({volume: 0}, 5000, function() {
          bgAudio[0].pause();
        });
        noSoundTime = new Date().getTime();
        break;
    }
  });
  if (window.obsstudio) {
    window.obsstudio.onVisibilityChange = function(visiblity) {
      if (visiblity) {
        if (game.scene === 'waiting') {
          bgAudio[0].play();
          bgAudio.stop(true, false).animate({volume: 0.15}, 1500);
        }
      } else {
        bgAudio.stop(true, false).animate({volume: 0}, 700, function() {
          bgAudio[0].pause();
        });
      }
    };
  }
  fireStates.child('half').on('value', function(result) {
    game.half = result.val();
    switch (game.half) {
      case 'first':
        first.removeClass('semitrans');
        second.addClass('semitrans');
        break;
      case 'second':
        first.addClass('semitrans');
        second.removeClass('semitrans');
        break;
      default:
        first.removeClass('semitrans');
        second.removeClass('semitrans');
        break;
    }
  });
  var countdown = false;
  var destDate;
  fireStates.child('card').on('value', function(result) {
    $('.card').not('.removed').addClass('removing');
    var card = result.val();
    countdown = false;
    switch (card.type) {
      case 'thanks':
        var newCard = $('<div class="card infotext"/>').css(defaultCardStyle)
          .html('<div class="bottom-spacing">感謝您的收看 每週六日晚上八點</div>' +
            '<div class="bottom-spacing">敬請鎖定 TACL Twitch 頻道直播</div>');
        newCard.appendTo($('#waiting_overlay'));
        break;
      case 'custom':
        var message = card.message && card.message !== '' ?
                        htmlEscape(card.message) : '無訊息';
        countdown = false;
        if (message.indexOf('@cd') !== -1) {
          destDate = new Date();
          var arr = card.time.split(':');
          destDate.setHours(arr[0], arr[1], 0, 0);
          var milliTime = destDate.getTime();
          if (isNaN(milliTime)) {
            message = message.replace('@cd', '<span class="lightgreen">時間格式錯誤</span>')
          } else {
            var initCount = toHHMMSS(milliTime - Date.now());
            message = message.replace('@cd', '&nbsp;&nbsp;&nbsp;<span class="countdown audioscale lightblue">' + initCount + '</span>&nbsp;&nbsp;&nbsp;');
            countdown = true;
          }
        }

        var newCard = $('<div class="card infotext"/>').css(defaultCardStyle)
          .html('<div class="bottom-spacing">' + message + '</div>')
        newCard.appendTo($('#waiting_overlay'));
        updateCountdown();
        break;
      default:
        break;
    }

  })

  var fireScore = database.ref('score');
  fireScore.on('value', function(result) {
    var score = result.val();
    game.score = score;
    //scoreBoard.text(JSON.stringify(score));
    //ingameScoreboard.text(JSON.stringify(score));

    $.each(['first', 'second'], function(i, halfkey) {
      var half = score[halfkey];
      var halftext = (i === 0 ? '上' : '下') + '半場';

      scoreBoard.children('.' + halfkey + '.halftext').html(halftext + ' 賽制 #' + half.rule);

      scoreBoard.children('.' + halfkey + '.score').html(
        pad(half.clan1.name, 7, '&nbsp;') +
        '&nbsp;&nbsp;&nbsp;&nbsp;<span class="audioscale"><span class="lightblue">' + half.clan1.score + '</span>：<span class="lightblue">' + half.clan2.score + '</span></span>&nbsp;&nbsp;&nbsp;&nbsp;' +
        pad(half.clan2.name, 7, '&nbsp;', true)
      );

      ingameOverlay.find('.' + halfkey).html(
        '<span class="lightblue">' + halftext + '</span>&nbsp;&nbsp;&nbsp;&nbsp;' +
        pad(half.clan1.name, 7, '&nbsp;') + ' [' + half.clan1.score + ']' +
        '<span class="lightblue"> vs </span>' +
        pad(half.clan2.name, 7, '&nbsp;') + ' [' + half.clan2.score + ']' +
        '&nbsp;&nbsp;&nbsp;<span class="lightblue">賽制</span> #' + half.rule
      )
    });
  });

  var fireInfo = database.ref('info');
  fireInfo.on('value', function(result) {
    var info = result.val();
    $('.info').not('.removed').addClass('removing');
    var spaces = Math.max(8, spaceLength(info.refuree), spaceLength(info.caster), spaceLength(info.broadcaster)) + 1;
    var newCard = $('<div class="info infotext"/>')
      .css(defaultCardStyle)
      .html('<div class="bottom-spacing">裁判 ' + htmlEscape(pad(info.refuree, spaces, ' ')) + '</div>' +
        '<div class="bottom-spacing">賽評 ' + htmlEscape(pad(info.caster, spaces, ' ')) + '</div>' +
        '<div class="bottom-spacing">轉播 ' + htmlEscape(pad(info.broadcaster, spaces, ' ')) + '</div>');
    newCard.appendTo($('#waiting_overlay'));
  });

  var fireGame = database.ref('game');
  fireGame.on('value', function(result) {
    var fireResult = result.val();
    game.season = fireResult.season;
    game.title = fireResult.title;
    $('.season-number').text(game.season);
    mainDate.text('TACL ' + now.getFullYear() + ' S' + game.season + ' ' + pad(now.getMonth() + 1, 2) + '/' + pad(now.getDate(), 2));
  });

  var firstLoaded = true;;
  database.ref('reload').on('value', function(result) {
    if (!firstLoaded) {
      location.reload();
    }
    firstLoaded = false;
  });

  //var canvas = $('#canvas')[0];
  //var ctx = canvas.getContext('2d');
  function redraw() {
    if (!game.score) return;
    if (game.half === 'final') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var centerX = 650;
    ctx.save();
    ctx.font = "bold 80px 'Times New Roman', '微軟正黑體'";
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top';

    var halfSpace = -70;
    var playerSpace = 80;
    var half = game.score[game.half];
    ctx.font = "bold 50px 'Times New Roman'";
    ctx.textAlign = 'right';
    textGlow(half.clan1.name + ' [' + half.clan1.score + ']', centerX-80, 0, 'white', '#00ccff', 30, 1);
    ctx.textAlign = 'left';
    textGlow('[' + half.clan2.score + '] ' + half.clan2.name, centerX+80, 0, 'white', '#00ccff', 30, 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#11cfff';
    textGlow('vs', centerX, 0, '11ccff', '#00f', 50, 1);

    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = 'white';
      ctx.font = "46px '微軟正黑體'";
      ctx.textAlign = 'right';
      var player1 = half.clan1.players[i];
      textGlow(player1.name, centerX - playerSpace, 80 + i * 80, 'white', '#00ccff', 30, 1);
      drawImage(getRaceImg(player1.race), { left: centerX - playerSpace, top: 80 + i * 80, width:65, height: 65, opacity: 0.85, glow: '#fff'})();
      ctx.textAlign = 'left';
      var player2 = half.clan2.players[i];
      textGlow(player2.name, centerX + playerSpace, 80 + i * 80, 'white', '#00ccff', 30, 1);
      drawImage(getRaceImg(player2.race), { left: centerX + playerSpace - 65, top: 80 + i * 80, width:65, height: 65, opacity: 0.85, glow: '#fff'})();

      ctx.textAlign = 'left';
      ctx.font = "38px '微軟正黑體'";
      textGlow(half.maps[i], centerX + 400, 80 + i * 80, '#11ccff', '#00e', 25, 1);
    }
  }

  $("#ingame_overlay > div:gt(0)").hide();

  setInterval(function() {
    var banner = $('#ingame_overlay > div:first');
    if (!banner.is(':visible')) return;
    banner
      .velocity('fadeOut', 1500)
      .next()
      .velocity('fadeIn', 1500)
      .end()
      .appendTo('#ingame_overlay');
  }, 15000);

  function updateCountdown() {
    if (countdown) {
      $('.countdown').html(toHHMMSS(destDate.getTime() - Date.now()));
    }
  }

  function textGlow(text, x, y, color, glowColor, blur, level) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    for (var i = 0; i < level; i++) {
      ctx.fillText(text, x, y);
    }
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function getRaceImg(race) {
    return '../assets/images/race' + race + '.png';
  }

  function drawImage(url, options) {
    return function() {
      var deferred = $.Deferred();
      var img = new Image;
      if (!options) options = {};
      img.onload = function(){
        ctx.save();
        if (options.opacity) {
          ctx.globalAlpha = options.opacity;
        }
        if (options.glow) {
          ctx.shadowColor = options.glow;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = 20;
        }
        ctx.drawImage(img, options.left || 0, options.top || 0, options.width || 1920, options.height || 1080);
        ctx.restore();
        deferred.resolve();
      };
      img.src = url;
      return deferred.promise();
    }
  }

  setInterval(updateCountdown, 1000);

    $("#waiting_overlay > div:gt(0)")
    .css(defaultCardStyle);
    var i = 0;
    setInterval(function() {
      var stack = $('#waiting_overlay > div').not('.removed')
      if (stack.length === 1 || !stack.is(':visible')) return;
      stack.first()
        .velocity('fadeOut', 1500)
        .velocity({
          scale: [1.5, 1]
        }, {
          complete: function() {
              $(this).filter('.removing').addClass('removed').removeClass('removing');
          },
          duration: 1500,
          queue: false
        }, 'swing')
        .nextAll(':not(.removed):first')
        .velocity('fadeIn', 1500)
        .velocity({
          scale: [1, 0.7]
        }, {
          duration: 1500,
          queue: false
        }, 'swing')
        .end()
        .appendTo('#waiting_overlay');
    }, 8000);

  function pad(n, width, z, reverse) {
    z = z || '0';
    n = n + '';
    var length = spaceLength(n);
    if (length >= width) return n;
    var p = new Array(width - length + 1).join(z);
    return reverse ? n + p : p + n;
  }

  function spaceLength(str) {
    // returns the byte length of an utf8 string
    var s = str.length;
    for (var i=str.length-1; i>=0; i--) {
      var code = str.charCodeAt(i);
      if (code > 0x7f && code <= 0x7ff) s++;
      else if (code > 0x7ff && code <= 0xffff) s++;
      if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
    }
    return s;
  }

  function toHHMMSS(milliseconds) {
		if(milliseconds < 0) milliseconds = 0;
    var second = Math.floor(milliseconds / 1000);
    if (second < 3600) {
		  return [parseInt(second / 60, 10), second % 60].join(":").replace(/\b(\d)\b/g, "0$1");
    } else {
      return [parseInt(second / 3600, 10), parseInt(second / 60 % 60,10), second % 60].join(":").replace(/\b(\d)\b/g, "0$1");
    }
  }

  function htmlEscape(str) {
      return str
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\s/g, '&nbsp;');
  }
});
