'use strict';

$(function() {
  var gameVars = JSON.parse($('#game-vars').text());

  $('body').removeClass('nojs');

  var socket = io('//' + window.location.hostname + ':3000');

  var ttsVoiceSelect = $('#tts-voice');
  var ttsVoices;
  window.speechSynthesis.onvoiceschanged = function () {
    if (ttsVoices) {
      return;
    }

    ttsVoices = window.speechSynthesis.getVoices();
    for (var i = 0; i < ttsVoices.length; i++) {
      var selected = gameVars.ttsVoice === ttsVoices[i].name ? ' selected' : '';
      ttsVoiceSelect.append('<option' + selected + '>' + ttsVoices[i].name + '</option>');
    }
  };

  var autoCallTimer;
  var autoCallUpdateTimer;

  socket.on('connect', function() {
    socket.emit('getgame', gameVars.gameToken, function(gameName, ended) {
      console.log('joined game ' + gameName);
      $('#connection-status span').text('Connected');

      if (!ended) {
        $('#call-number').prop('disabled', false);
      }

      $('#create-game').prop('disabled', false);
    });
  });

  socket.on('disconnect', function() {
    console.warn('socket connection lost');
    $('#connection-status span').text('Disconnected');
    $('#call-number').prop('disabled', true);
    $('#create-game').prop('disabled', true);
  });

  socket.on('numbercalled', function(letter, number) {
    console.log('called ' + letter + number);
    $('.latest').removeClass('latest');
    $('#board td[data-cell=' + number + ']').addClass('marked').addClass('latest');
    $('#last-number').text(letter + number);
  });

  socket.on('addplayer', function () {
    gameVars.cardCount++;
    var count = gameVars.cardCount + ' ' + (gameVars.cardCount === 1 ? ' Player' : ' Players');
    $('#card-count').text(count);
  })

  socket.on('gameover', function(gameName, winner) {
    console.log('game ended');
    if (winner) {
      console.log('congrats ' + winner + '!');
      $('.game-winner').text(winner);
    }

    $('#call-number').prop('disabled', true);
  });

  socket.on('resetgame', function() {
    console.log('reset game');
    $('#board td').removeClass('marked');
    $('#last-number').text('--');
    $('#game-winner').text('--');
    $('#card-count').text('0 Players');
    $('#call-number').prop('disabled', false);
    $('#create-game').prop('disabled', false);
  });

  $('#create-game').click(function() {
    if (window.confirm('Create a new game?')) {
      $('#call-number').prop('disabled', true);
      $('#create-game').prop('disabled', true);

      var postData = {
        json: true,
        action: 'createGame',
        autoCall: $('#auto-call').prop('checked') ? $('#auto-call-interval').val() : 0
      };
      $.post(window.location, postData);
    }
  });

  $('#call-number').click(function() {
    callNumber();
  });

  $('#auto-call').change(function() {
    updateAutoCall();
  });

  $('#auto-call-interval').change(function() {
    if (autoCallUpdateTimer) {
      clearInterval(autoCallUpdateTimer);
      autoCallUpdateTimer = undefined;
    }

    autoCallUpdateTimer = setTimeout(function () {
      updateGameSettings();
      updateAutoCall();
      autoCallUpdateTimer = null;
    }, 3000);
  });

  $('#tts').change(function () {
    updateGameSettings();
  });

  $('#tts-voice').change(function () {
    updateGameSettings();
  });

  $('#source-url').click(function() {
    $(this).select();
  });

  $('#copy-source-url').click(function() {
    $('#source-url').select();
    document.execCommand('copy');
  });

  function callNumber() {
    if (autoCallTimer) {
      clearInterval(autoCallTimer);
      autoCallTimer = undefined;
    }

    $('#call-number').prop('disabled', true);
    $('#create-game').prop('disabled', true);

    var postData = {
      json: true,
      action: 'callNumber'
    };
    $.post(window.location, postData, function() {
      $('#create-game').prop('disabled', false);
      setTimeout(function() {
        $('#call-number').prop('disabled', false);
      }, 10000);
      updateAutoCall();
    }, 'json');
  }

  function updateAutoCall() {
    if (autoCallTimer) {
      clearInterval(autoCallTimer);
      autoCallTimer = undefined;
    }

    if ($('#auto-call').prop('checked')) {
      autoCallTimer = setInterval(function() {
        callNumber();
      }, gameVars.autoCall * 1000);
    }
  }

  function updateGameSettings() {
    gameVars.autoCall = $('#auto-call-interval').val();
    gameVars.tts = $('#tts').prop('checked');
    gameVars.ttsVoice = ttsVoiceSelect.val();

    var postData = {
      json: true,
      action: 'updateGameSettings',
      autoCallInterval: gameVars.autoCall,
      tts: gameVars.tts,
      ttsVoice: gameVars.ttsVoice
    };
    $.post(window.location, postData);
  }
});
