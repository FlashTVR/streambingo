/**
 * This file is part of StreamBingo.
 *
 * @copyright (c) 2020, Steve Guidetti, https://github.com/stevotvr
 * @license GNU General Public License, version 3 (GPL-3.0)
 *
 * For full license information, see the LICENSE file included with the source.
 */

'use strict';

$(function() {
  $('body').removeClass('nojs');

  var voices = ['en-GB/f', 'en-GB/m', 'en-US/f', 'en-US/m'];

  var gameVars = JSON.parse($('#game-vars').text());

  var autoRestartTimer;
  var autoRestartCountdown;
  var autoEndTimer;
  var autoEndCountdown;

  var calledNumbers = [];

  var socket = io('//' + window.location.hostname + ':3000');

  var bingoBall = $('.bingo-ball.template');
  bingoBall.removeClass('template').remove();

  socket.on('connect', function() {
    socket.emit('getgame', gameVars.gameToken, function(gameName, settings, called, ended, winner) {
      console.log('joined game ' + gameName);

      gameVars.tts = settings.tts;
      gameVars.ttsVoice = settings.ttsVoice;
      gameVars.ended = ended;
      gameVars.winner = winner;

      calledNumbers = called;

      $('#main-container').prop('class', settings.background);

      $('#board .marked').removeClass('marked').removeClass('latest');
      if (called.length) {
        for (var i = 0; i < called.length; i++) {
          var cell = $('#board td[data-cell=' + called[i] + ']');
          cell.addClass('marked');

          if (called.length - i <= 5) {
            cell.addClass('recent');
          }
        }

        var latest = called[called.length - 1];
        $('#board td[data-cell=' + latest + ']').removeClass('recent').addClass('latest');
        $('#last-number').text(getLetter(latest) + latest);
      }

      updateEndgamePanel();
    });
  });

  socket.on('disconnect', function() {
    console.warn('socket connection lost');

    clearTimers();
  });

  socket.on('numbercalled', function(number) {
    var letter = getLetter(number);
    console.log('called ' + letter + number);

    calledNumbers.push(number);

    $('.latest').removeClass('latest').addClass('recent');
    $('#board td[data-cell=' + number + ']').addClass('marked').addClass('latest');

    if (calledNumbers.length >= 5) {
      $('#board td[data-cell=' + calledNumbers[calledNumbers.length - 6] + ']').removeClass('recent');
    }

    var ball = bingoBall.clone();
    ball.addClass(letter.toLowerCase());
    ball.find('.letter').text(letter);
    ball.find('.number').text(number);
    $('#inner-container').append(ball);
    setTimeout(function() {
      ball.remove();
    }, 8000);

    if (gameVars.tts) {
      var voice = gameVars.ttsVoice;
      if (voice === 'random') {
        voice = voices[parseInt(Math.random() * voices.length)];
      }

      new Audio('../../audio/' + voice + '/' + letter.toLowerCase() + number + '.ogg').play();
    }
  });

  socket.on('gamesettings', function (settings) {
    gameVars.tts = settings.tts;
    gameVars.ttsVoice = settings.ttsVoice;

    $('#main-container').prop('class', settings.background);
  });

  socket.on('addplayer', function () {
    gameVars.cardCount++;
    var count = gameVars.cardCount + ' ' + (gameVars.cardCount === 1 ? ' Player' : ' Players');
    $('#card-count').text(count);
  })

  socket.on('gameover', function(gameName, winner) {
    if (!gameVars.ended && gameVars.tts) {
      var voice = gameVars.ttsVoice;
      if (voice === 'random') {
        voice = voices[parseInt(Math.random() * voices.length)];
      }

      new Audio('../../audio/' + voice + '/gameover.ogg').play();
    }

    gameVars.ended = true;
    gameVars.winner = winner;
    updateEndgamePanel();
  });

  socket.on('resetgame', function() {
    console.log('reset game');

    $('#board td').removeClass('marked');
    $('#card-count').text('0 Players');

    gameVars.ended = false;
    gameVars.winner = '';
    gameVars.cardCount = 0;
    calledNumbers = [];
    updateEndgamePanel();
  });

  socket.on('timer', function (name, running, value) {
    if (name === 'end') {
      if (autoEndTimer) {
        clearInterval(autoEndTimer);
        autoEndTimer = undefined;
      }

      if (running) {
        autoEndCountdown = value;
        $('#end-countdown').removeClass('hidden').find('strong').text(formatTime(autoEndCountdown));
        autoEndTimer = setInterval(function () {
          autoEndCountdown--;
          $('#end-countdown strong').text(formatTime(autoEndCountdown));
          if (!autoEndCountdown) {
            clearInterval(autoEndTimer);
            autoEndTimer = undefined;
            $('#end-countdown').addClass('hidden');
          }
        }, 1000);
      } else {
        $('#end-countdown').addClass('hidden');
      }
    } else if (name === 'restart') {
      if (autoRestartTimer) {
        clearInterval(autoRestartTimer);
        autoRestartTimer = undefined;
      }

      if (running) {
        autoRestartCountdown = value;
        $('#restart-countdown').show().find('strong').text(formatTime(autoRestartCountdown));
        autoRestartTimer = setInterval(function () {
          autoRestartCountdown--;
          $('#restart-countdown strong').text(formatTime(autoRestartCountdown));
          if (!autoRestartCountdown) {
            clearInterval(autoRestartTimer);
            autoRestartTimer = undefined;
            $('#restart-countdown').hide();
          }
        }, 1000);
      } else {
        $('#restart-countdown').hide();
      }
    }
  });

  function updateEndgamePanel() {
    if (gameVars.ended) {
      console.log('game ended');

      $('#end-game').show();

      if (gameVars.winner) {
        console.log('congrats ' + gameVars.winner + '!');
        $('#winner-display').show().find('strong').text(gameVars.winner);
      }
    } else {
      $('#end-game, #winner-display').hide();
    }
  }

  function clearTimers() {
    if (autoRestartTimer) {
      clearInterval(autoRestartTimer);
      autoRestartTimer = undefined;
    }

    if (autoEndTimer) {
      clearInterval(autoEndTimer);
      autoEndTimer = undefined;
    }
  }

  function getLetter(number) {
    if (number <= 15) {
      return 'B';
    } else if (number <= 30) {
      return 'I';
    } else if (number <= 45) {
      return 'N';
    } else if (number <= 60) {
      return 'G';
    }
    return 'O';
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;

    return m + ':' + (s < 10 ? '0' + s : s);
  }
});
