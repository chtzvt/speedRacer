// WIFI PW is chimchim
var raspi = require('raspi-io');
var five = require('johnny-five');
var board = new five.Board({io: new raspi()});
var http = require('http');
var url = require('url');

var CONFIG = {
    RELEASE: {
            pin: "GPIO6",
            human_name: "Release Mechanism",
            startTime: '',
            ctl: {}
    },
    RESET: {
            pin: "GPIO12",
            human_name: "Reset Button",
            ctl: {}
    },
    LED_INDICATOR: {
            pin: "GPIO5",
            human_name: "LED Indicator",
            ctl: {}
    },
    TRACKS: [
        {
            id: 1,
            pin: "GPIO13",
            human_name: "Track 1",
            endTime: '',
            computedTimeSeconds: '',
            ctl: {}
        },
        {
            id: 2,
            pin: "GPIO19",
            human_name: "Track 2",
            endTime: '',
            computedTimeSeconds: '',
            ctl: {}
        },
        {
            id: 3,
            pin: "GPIO26",
            human_name: "Track 3",
	          endTime: '',
            computedTimeSeconds: '',
            ctl: {}
        }
    ],
    HTTP_PORT: 8080
};

board.on("ready", function() {

  // Parse configuration, set LED to solid green to indicate that track is ready.
  parseConfig();
  updateLEDState(1);

  // Monitor events from track release mechanism
  CONFIG.RELEASE.ctl.on("up", function() {
    // Only record start time if no start time has yet been written.
    if(CONFIG.RELEASE.startTime === ""){ // Never overwrite existing start times
      CONFIG.RELEASE.startTime = Date.now(); // Record time
      CONFIG.LED_INDICATOR.ctl.blink(500); // Blink until reset
    }
  }).on("hold", function(){
      // Reset application state when mechanism is loaded with new vehicles.
      resetState();
      CONFIG.LED_INDICATOR.ctl.stop();
  });

  // Resets track state (clears all records)
  // Will also blink light to indicate that the track has been reset.
  CONFIG.RESET.ctl.on("down", function() {
    CONFIG.LED_INDICATOR.ctl.stop();
    resetState();
    updateLEDState(0);
  }).on("up", function(){
    updateLEDState(1);
  });

  // Only records end time if one hasn't been recorded yet
  // Will maintain first recorded time until track is reset to prevent accidental overwrites.
  CONFIG.TRACKS[0].ctl.on("down", function() {
    if(CONFIG.TRACKS[0].endTime === ""){
      CONFIG.TRACKS[0].endTime = Date.now();
      CONFIG.TRACKS[0].computedTimeSeconds = computeElapsedTime(CONFIG.RELEASE.startTime, CONFIG.TRACKS[0].endTime);
    }
  });

  CONFIG.TRACKS[1].ctl.on("down", function() {
    if(CONFIG.TRACKS[1].endTime === ""){
      CONFIG.TRACKS[1].endTime = Date.now();
      CONFIG.TRACKS[1].computedTimeSeconds = computeElapsedTime(CONFIG.RELEASE.startTime, CONFIG.TRACKS[1].endTime);
    }
  });

  CONFIG.TRACKS[2].ctl.on("down", function() {
    if(CONFIG.TRACKS[2].endTime === ""){
      CONFIG.TRACKS[2].endTime = Date.now();
      CONFIG.TRACKS[2].computedTimeSeconds = computeElapsedTime(CONFIG.RELEASE.startTime, CONFIG.TRACKS[2].endTime);
    }
  });
});

http.createServer(function(req, res) {

    if (req.method === "GET") {

        var call = url.parse(req.url, true);

        // allow any origin to make API calls.
        res.setHeader('Access-Control-Allow-Origin', '*');

        processRequest(call.pathname, req, res);

    } else {
        res.writeHead(400);
        res.end(JSON.stringify({
            error: "method not implemented"
        }));
    }

}.bind({
    CONFIG: CONFIG
})).listen(CONFIG.HTTP_PORT);

function processRequest(method, req, res) {

    switch (method) {
        case "/get/state": // Retrieve track/application state
            res.writeHead(200);
            res.end(JSON.stringify(strip_gpioCtl(CONFIG, null, '\n')));
            break;

        case "/set/led": // Manually toggle LED state
            res.writeHead(200);
            res.end(JSON.stringify({
                command_sent: true
            }));
            CONFIG.LED_INDICATOR.ctl.toggle();
            break;

        case "/set/reset": // Soft reset button (in addition to physical one)
            res.writeHead(200);
            res.end(JSON.stringify({
                command_sent: true
            }));
            resetState();
            break;

        default: // Unhandled API method
            res.writeHead(400);
            res.end(JSON.stringify({
                error: "method not implemented"
            }));
    }

}

// Parses configuration and instantiates all relevant track components
function parseConfig() {

    CONFIG.LED_INDICATOR.ctl = new five.Led(CONFIG.LED_INDICATOR.pin);
    CONFIG.RELEASE.ctl = new five.Button({pin: CONFIG.RELEASE.pin, holdtime: 1000});
    CONFIG.RESET.ctl = new five.Button(CONFIG.RESET.pin);

    for (var i = 0; i < CONFIG.TRACKS.length; i++) {
        CONFIG.TRACKS[i].ctl = new five.Button({pin: CONFIG.TRACKS[i].pin});
    }

}

// Reads application state and removes j5 related properties.
function strip_gpioCtl(config) {

    var stripped = {};

    stripped.RELEASE = JSON.parse(JSON.stringify(config.RELEASE, GPIOreplacer));
    delete stripped.RELEASE.ctl;

    stripped.TRACKS = [];
    for (var i = 0; i < config.TRACKS.length; i++) {
        var newCar = JSON.parse(JSON.stringify(config.TRACKS[i], GPIOreplacer));
        delete newCar.ctl;
        stripped.TRACKS[i] = newCar;
    }

    return stripped;
}

// Helper function for strip_gpioCtl, removes circular structures from status output
function GPIOreplacer(key,value) {
    return key == "ctl" ? undefined : value;
}

// Reset all recorded and computed times, for all tracks
function resetState(){
  CONFIG.RELEASE.startTime = '';
  for (var i = 0; i < CONFIG.TRACKS.length; i++) {
    CONFIG.TRACKS[i].endTime = '';
    CONFIG.TRACKS[i].computedTimeSeconds = '';
  }
}

// @params startTime - initial time at which car was released
// @params endTime - time at which car reached the end of the track
function computeElapsedTime(startTime, endTime){
  return ((endTime-startTime)/1000);
}

// @params state - 1 or 0 for on or off, respectively.
function updateLEDState(state) {
  return state === 0 ? CONFIG.LED_INDICATOR.ctl.off() : CONFIG.LED_INDICATOR.ctl.on();
}

// Blink LED indicator rapidly (every 100ms) on uncaught exceptions.
process.on('uncaughtException', function() {
  CONFIG.LED_INDICATOR.ctl.blink(100);
});
