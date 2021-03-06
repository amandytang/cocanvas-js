import Cable from 'actioncable';
import getUserFromToken from './getUserFromToken';
import App from './App';

///////////////////////////////////////
/*!
*
* ColorPick jQuery plugin
* https://github.com/philzet/ColorPick.js
*
* Copyright (c) 2017 Phil Zet (a.k.a. Philipp Zakharchenko)
* Licensed under the MIT License
*
*/
(function($) {
  $.fn.colorPick = function(config) {
    return this.each(function() {
      new $.colorPick(this, config || {});
    });
  };

  $.colorPick = function(element, options) {
    options = options || {};
    this.options = $.extend({}, $.fn.colorPick.defaults, options);
    if (options.str) {
      this.options.str = $.extend({}, $.fn.colorpickr.defaults.str, options.str);
    }
    $.fn.colorPick.defaults = this.options;
    this.color = this.options.initialColor.toUpperCase();
    this.element = $(element);

    var dataInitialColor = this.element.data('initialcolor');
    if (dataInitialColor) {
      this.color = dataInitialColor;
      this.appendToStorage(this.color);
    }

    var uniquePalette = [];
    $.each(
      $.fn.colorPick.defaults.palette.map(function(x) {
        return x.toUpperCase();
      }),
      function(i, el) {
        if ($.inArray(el, uniquePalette) === -1) uniquePalette.push(el);
      }
    );

    this.palette = uniquePalette;

    return this.element.hasClass(this.options.pickrclass) ? this : this.init();
  };

  $.fn.colorPick.defaults = {
    initialColor: '#3498db',
    paletteLabel: 'Choose Colour:',
    allowRecent: true,
    recentMax: 5,
    allowCustomColor: false,
    palette: [
      '#1abc9c',
      '#16a085',
      '#2ecc71',
      '#27ae60',
      '#3498db',
      '#2980b9',
      '#9b59b6',
      '#8e44ad',
      '#34495e',
      '#2c3e50',
      '#f1c40f',
      '#f39c12',
      '#e67e22',
      '#d35400',
      '#e74c3c',
      '#c0392b',
      '#ecf0f1',
      '#bdc3c7',
      '#95a5a6',
      '#7f8c8d'
    ],
    onColorSelected: function() {
      this.element.css({ backgroundColor: this.color, color: this.color });
    }
  };

  $.colorPick.prototype = {
    init: function() {
      var self = this;
      var o = this.options;
      $.proxy($.fn.colorPick.defaults.onColorSelected, this)();
      self.show(80, 165);
      // $('.customColorHash').val(self.color);

      $('.colorPickButton').click(function(event) {
        self.color = $(event.target).attr('hexValue');
        self.appendToStorage($(event.target).attr('hexValue'));
        $.proxy(self.options.onColorSelected, self)();
        return false;
      });

      this.element
        .click(function(event) {
          event.preventDefault();
          self.show(event.pageX, event.pageY);

          $('.customColorHash').val(self.color);

          $('.colorPickButton').click(function(event) {
            self.color = $(event.target).attr('hexValue');
            self.appendToStorage($(event.target).attr('hexValue'));
            $.proxy(self.options.onColorSelected, self)();
            return false;
          });
          $('.customColorHash')
            .click(function(event) {
              return false;
            })
            .keyup(function(event) {
              var hash = $(this).val();
              if (hash.indexOf('#') !== 0) {
                hash = '#' + hash;
              }
              if (/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hash)) {
                self.color = hash;
                self.appendToStorage(hash);
                $.proxy(self.options.onColorSelected, self)();
                $(this).removeClass('error');
              } else {
                $(this).addClass('error');
              }
            });

          return false;
        })
        .blur(function() {
          self.element.val(self.color);
          $.proxy(self.options.onColorSelected, self)();
          return false;
        });

      $(document).on('click', function(event) {
        return true;
      });

      return this;
    },

    appendToStorage: function(color) {
      if ($.fn.colorPick.defaults.allowRecent === true) {
        var storedColors = JSON.parse(localStorage.getItem('colorPickRecentItems'));
        if (storedColors == null) {
          storedColors = [];
        }
        if ($.inArray(color, storedColors) == -1) {
          storedColors.unshift(color);
          storedColors = storedColors.slice(0, $.fn.colorPick.defaults.recentMax);
          localStorage.setItem('colorPickRecentItems', JSON.stringify(storedColors));
        }
      }
    },

    show: function(left, top) {
      $('#colorPick').remove();

      $('body').append(
        '<div id="colorPick" style="display:none;top:' +
          top +
          'px;left:' +
          left +
          'px"><span id="chooseColor">' +
          $.fn.colorPick.defaults.paletteLabel +
          '</span></div>'
      );
      jQuery.each(this.palette, function(index, item) {
        $('#colorPick').append(
          '<div class="colorPickButton" hexValue="' + item + '" style="background:' + item + '"></div>'
        );
      });
      if ($.fn.colorPick.defaults.allowCustomColor === true) {
        $('#colorPick').append('<input type="text" style="margin-top:5px" class="customColorHash" />');
      }
      if ($.fn.colorPick.defaults.allowRecent === true) {
        $('#colorPick').append('<span style="margin-top:5px">Recent:</span>');
        if (
          JSON.parse(localStorage.getItem('colorPickRecentItems')) == null ||
          JSON.parse(localStorage.getItem('colorPickRecentItems')) == []
        ) {
          $('#colorPick').append('<div class="colorPickButton colorPickDummy"></div>');
        } else {
          jQuery.each(JSON.parse(localStorage.getItem('colorPickRecentItems')), (index, item) => {
            $('#colorPick').append(
              '<div class="colorPickButton" hexValue="' + item + '" style="background:' + item + '"></div>'
            );
            if (index == $.fn.colorPick.defaults.recentMax - 1) {
              return false;
            }
          });
        }
      }
      $('#colorPick').fadeIn(200);
    }
  };
})(jQuery);

/////////////////////////////////////////

const serverUrl = 'https://cocanvas-server.herokuapp.com';

$(document).ready(function() {
  let canvas = document.getElementById('canvas');

  if (!canvas.getContext) {
    console.log('sorry your browser sucks'); //TODO work out fallback
  }
  var ctx = canvas.getContext('2d');

  let columns = 80;
  let rows = 60;
  let w = (canvas.width = 800);
  let h = (canvas.height = 600);
  let tileWidth = w / columns;
  let tileHeight = h / rows;
  let userColour = '#f70';

  // color of the lines making up the grid
  ctx.strokeStyle = '#e3e3e3';
  // color when the small squares are filled (this will need to be changeable later)
  // ctx.fillStyle = '#f70';

  // array of user's filled squares - relevant if we want to limit squares filled per turn. Otherwise, irrelevant.
  let filledSquares = [];

  $('.colorPickSelector').colorPick();

  $('.colorPickSelector').colorPick({
    initialColor: '#f1c40f',
    allowRecent: true,
    recentMax: 8,
    palette: [
      '#1abc9c',
      '#16a085',
      '#2ecc71',
      '#27ae60',
      '#63DDDD',
      '#3498db',
      '#2980b9',
      '#295B88',
      '#9b59b6',
      '#8e44ad',
      '#A5567C',
      '#602650',
      '#7B1A34',
      '#8A2755',
      '#CC647B',
      '#FF747C',
      '#002642',
      '#34495e',
      '#2c3e50',
      '#000000',
      '#FFF07C',
      '#f1c40f',
      '#f39c12',
      '#e67e22',
      '#d35400',
      '#f70',
      '#e74c3c',
      '#c0392b',
      '#ffffff',
      '#bdc3c7',
      '#95a5a6',
      '#7f8c8d'
    ],
    onColorSelected: function() {
      this.element.css({ backgroundColor: this.color, color: this.color });
      ctx.fillStyle = this.color;
      userColour = this.color;
    }
  });

  // render function creates 80 vertical lines and 60 horizontal lines to create grid
  function render() {
    // below: if statement for distinguishing btw hover and click (bonus for later)
    // if (clicked) {
    //
    // } else {
    //   ctx.clearRect(0, 0, w, h);
    // }

    ctx.beginPath();

    for (let x = 0; x < columns; x++) {
      ctx.moveTo(x * tileWidth, 0);
      ctx.lineTo(x * tileWidth, h);
    }
    for (let y = 0; y < rows; y++) {
      ctx.moveTo(0, y * tileHeight);
      ctx.lineTo(w, y * tileHeight);
    }
    ctx.stroke();
  }
  // calling the render function to draw grid
  render();

  // defining fetchCoords function
  const fetchCoords = () => {
    $.ajax(`${serverUrl}/coordinates.json`, {
      method: 'get',
      headers: { Authorization: `Bearer ${window.localStorage.cocanvasAuthToken}` },
      dataType: 'json' // data type you want back
    }).done(function(response) {
      for (let i = 0; i < response.length; i++) {
        ctx.fillStyle = response[i].colour;
        ctx.fillRect(response[i].x, response[i].y, tileWidth, tileHeight);
      }
    });
  };

  fetchCoords();

  const createSocket = () => {
    let cable = Cable.createConsumer('wss://cocanvas-server.herokuapp.com/cable');

    return cable.subscriptions.create(
      {
        channel: 'CoordChannel'
      },
      {
        connected: () => {
          console.log('connected to coord channel!');
        },
        received: (data) => {
          ctx.fillStyle = data.colour;
          ctx.fillRect(data.x, data.y, tileWidth, tileHeight);

          ctx.fillStyle = userColour;
        },
        create: function(data) {
          this.perform('create', {
            coordinate: { x: data.x, y: data.y, colour: data.colour, user_id: data.user_id }
          });
        }
      }
    );
  };

  const coordSocket = createSocket();

  // below: bonus feature for showing colour on hover
  // let currentParams = [];
  // canvas.onmousemove = highlight;
  // function highlight(e) {
  //
  //   if (filledSquares.length > 0) {
  //     for (let i = 0; i < filledSquares.length; i++) {
  //       if (filledSquares[i] === currentParams) {
  //         return;
  //       } else {
  //         ctx.clearRect(currentParams[0], currentParams[1], currentParams[2], currentParams[3]);
  //       }
  //     }
  //   } else {
  //     ctx.clearRect(currentCoords.xCoord, currentCoords.yCoord, tileWidth, tileHeight);
  //   }
  //
  //   render();
  //
  //   var rect = canvas.getBoundingClientRect(),
  //       mx = e.clientX - rect.left,
  //       my = e.clientY - rect.top,
  //
  //       /// get index from mouse position
  //       xIndex = Math.round((mx - tileWidth * 0.5) / tileWidth),
  //       yIndex = Math.round((my - tileHeight * 0.5) / tileHeight);
  //
  //   currentCoords = {
  // xCoord: xIndex * tileWidth,
  // yCoord: yIndex * tileHeight
  // }
  //   console.log(currentParams);
  //   ctx.fillRect(xIndex * tileWidth, yIndex * tileHeight, tileWidth, tileHeight);
  //
  // }

  canvas.onmousedown = fill;
  function fill(e) {
    console.log(userColour);

    let rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;

    /// get index from mouse position
    let xIndex = Math.round((mx - tileWidth * 0.5) / tileWidth);
    let yIndex = Math.round((my - tileHeight * 0.5) / tileHeight);

    // render(); // not sure this render is needed
    const fillDeets = {
      x: xIndex * tileWidth,
      y: yIndex * tileHeight,
      colour: userColour
    };

    filledSquares.push(fillDeets);
    ctx.fillRect(xIndex * tileWidth, yIndex * tileHeight, tileWidth, tileHeight);
    sendCoordDeets(fillDeets);
  }

  const sendCoordDeets = function(deets) {
    const user = getUserFromToken();

    coordSocket.create({ x: deets.x, y: deets.y, colour: deets.colour, user_id: user.user_id });

    // fetch('https://cocanvas-server.herokuapp.com/coordinates', {
    //   method: 'POST',
    //   headers: {
    //     authorization: `Bearer ${token}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     coordinate: { x: deets.x, y: deets.y, colour: deets.colour, user_id: user.user_id }
    //   })
    // }).then((res) => {
    //   fetchCoords();
    // });
    // $.ajax('https://cocanvas-server.herokuapp.com/coordinates', {
    //   method: 'post',
    //   headers: {
    //     authorization: `Bearer ${token}`
    //   },
    //   dataType: 'json', // data type you want back
    //   data: { coordinate: { x: deets.x, y: deets.y, colour: deets.colour, user_id: user.user_id } } // what you're sending - needs to be a json object? needs a madeup key for each value
    // }).done((res) => {
    //   console.log(res);

    //   fetchCoords();
    // });
  };

  // Modal Overlay
  $('.login-modal-overlay').click(function() {
    $(this).fadeOut(200);
  });
  $('.open-login').click(function() {
    $('.login-modal-overlay').fadeIn(200);
  });
  $('.login-modal').click(function(event) {
    event.stopPropagation();
  });

  // Input label for modal
  $('input').blur(function() {
    var $this = $(this);
    if ($this.val()) $this.addClass('used');
    else $this.removeClass('used');
  });

  $('.register-modal-overlay').click(function() {
    $(this).fadeOut(200);
  });
  $('.open-register').click(function() {
    $('.register-modal-overlay').fadeIn(200);
  });
  $('.register-modal').click(function(event) {
    event.stopPropagation();
  });

  $('.info-modal-overlay').click(function() {
    $(this).fadeOut(200);
  });
  $('#info-button').click(function() {
    $('.info-modal-overlay').fadeIn(200);
  });

  $('#register-form').on('submit', sendRegisterForm);

  $('#login-form').on('submit', sendLoginForm);

  $('#logout-link').click(function(event) {
    event.stopPropagation();
    window.localStorage.cocanvasAuthToken = '';
    window.location.reload(false);
  });
}); // end of DOCREADY

const sendRegisterForm = function(e) {
  e.preventDefault();
  const registerUsername = $('#register-username').val();
  const registerPassword = $('#register-password').val();
  const registerPwConfirmation = $('#register-password-conf').val();

  // AJAX/fetch call for registering user
  fetch('https://cocanvas-server.herokuapp.com/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: {
        username: registerUsername,
        password: registerPassword,
        password_confirmation: registerPwConfirmation
      }
    })
  }).then((res) =>
    res.json().then((data) => {
      if (data.username) {
        if (data.username[0] === 'has already been taken') {
          $('#username-label-register').css('color', 'red');
          $('#register-modal').addClass('animated shake');
          let temp_username_input = $('#register-username').val();
          $('#username-label-register')
            .html(`${temp_username_input} has already been taken.`)
            .css('margin', '-10px')
            .css('padding-top', '10px');

          setTimeout(function() {
            $('#register-modal').removeClass('animated shake');
          }, 900);
        }
      }
      if (data.password_confirmation) {
        $('#password-label-register').css('color', 'red');
        $('#conf-pw-label-register').css('color', 'red');
        $('#register-modal').addClass('animated shake');

        setTimeout(function() {
          $('#register-modal').removeClass('animated shake');
        }, 900);
      }
      loginRequest(registerUsername, registerPassword);
    })
  );
};

const loginRequest = (username, password) => {
  // AJAX/fetch call for user login
  fetch('https://cocanvas-server.herokuapp.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: username,
      password: password
    })
  }).then((res) =>
    res.json().then((data) => {
      console.log(data);
      window.localStorage.cocanvasAuthToken = data.access_token;
      if (window.localStorage.cocanvasAuthToken !== 'undefined') {
        window.location.reload(false);
      } else {
        console.log('login failed');
        $('#username-label-login').css('color', 'red');
        $('#password-label-login').css('color', 'red');
        $('#login-modal').addClass('animated shake');
      }
      setTimeout(function() {
        $('#login-modal').removeClass('animated shake');
      }, 900);
    })
  );
};

// Conditional render of login elements
if (window.localStorage.cocanvasAuthToken === 'undefined') {
  // Require undefined if statement otherwise any input logged results as undefined and is considered "logged in"
} else if (window.localStorage.cocanvasAuthToken) {
  $('#logout-link').css('display', 'inline-block');
  $('#login-link').css('display', 'none');
  $('#register-link').css('display', 'none');
}

const sendLoginForm = function(e) {
  e.preventDefault();
  const loginUsername = $('#login-username').val();
  const loginPassword = $('#login-password').val();
  loginRequest(loginUsername, loginPassword);
};
