var raspi = require('raspi-io').RaspiIO;
var five = require('johnny-five');
var board = new five.Board({io: new raspi()});

// Diagnostics - for switch testing
// sudo node diag.js

var CONFIG = {
    META: {
      runStarted: false
    },
    RELEASE: {
            pin: "GPIO6",
            human_name: "Release",
            startTime: '',
            ctl: {}
    },
    RESET: {
            pin: "GPIO12",
            human_name: "Reset",
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
            human_name: "Slot 1",
            endTime: '',
            computedTimeSeconds: '',
            ctl: {}
        },
        {
            id: 2,
            pin: "GPIO19",
            human_name: "Slot 2",
            endTime: '',
            computedTimeSeconds: '',
            ctl: {}
        },
        {
            id: 3,
            pin: "GPIO26",
            human_name: "Slot 3",
	    endTime: '',
            computedTimeSeconds: '',
            ctl: {}
        }
    ],
    HTTP_PORT: 8080
};

board.on("ready", function() {
  parseConfig();

  console.log("Blinking LED");
  CONFIG.LED_INDICATOR.ctl.blink(300);

  CONFIG.RELEASE.ctl.on("up", function() {
      console.log("RELEASE is UP.");
  }).on("down", function(){
      console.log("RELEASE is DOWN.");
  }).on("hold", function(){
      console.log("RELEASE is HELD.");
  });

  CONFIG.RESET.ctl.on("down", function() {
     console.log("RESET is DOWN.");
  }).on("up", function(){
     console.log("RESET is UP.");
  });

  CONFIG.TRACKS[0].ctl.on("down", function() {
     console.log("Track 1 is DOWN.");
  }).on("up", function(){
     console.log("Track 1 is UP.");
  });

  CONFIG.TRACKS[1].ctl.on("down", function() {
     console.log("Track 2 is DOWN.");
  }).on("up", function(){
     console.log("Track 2 is UP.");
  });

  CONFIG.TRACKS[2].ctl.on("down", function() {
     console.log("Track 3 is DOWN.");
  }).on("up", function(){
     console.log("Track 3 is UP.");
  });

});

// Parses configuration and instantiates all relevant track components
function parseConfig() {

    CONFIG.LED_INDICATOR.ctl = new five.Led(CONFIG.LED_INDICATOR.pin);
    CONFIG.RELEASE.ctl = new five.Button({pin: CONFIG.RELEASE.pin, holdtime: 1000});
    CONFIG.RESET.ctl = new five.Button(CONFIG.RESET.pin);

    for (var i = 0; i < CONFIG.TRACKS.length; i++) {
        CONFIG.TRACKS[i].ctl = new five.Button({pin: CONFIG.TRACKS[i].pin});
    }

}

// @params state - 1 or 0 for on or off, respectively.
function updateLEDState(state) {
  return state === 0 ? CONFIG.LED_INDICATOR.ctl.off() : CONFIG.LED_INDICATOR.ctl.on();
}
