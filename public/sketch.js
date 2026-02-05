// Create connection to Node.js Server
const socket = io();

let canvas;

let randomX;
let randomY;

let me; // for storing my socket.id
let experienceState = {
  users: {}            // socket.id -> movement data
};

// Permission button (iOS)
let askButton;
let isMobileDevice = true;
let hasPermission = false;

// Device motion
let accX = 0;
let accY = 0;
let accZ = 0;
let rrateX = 0;
let rrateY = 0;
let rrateZ = 0;

// Device orientation
let rotateDegrees = 0;
let frontToBack = 0;
let leftToRight = 0;

let x, y;
let maxSnotSpeed = 8;
let coinX,coinY;

let coinSize = 40;
let snotSize = 10;

let count = 0;

// throttle device motion sending
let lastSent = 0;
const SEND_RATE = 30; // ms (~33 fps)

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("sketch-container"); 

  //random position used for visualisation

  x = width/2;
  y = height/2;
  coinX = random(0,width);
  coinY = random(0, height);

  rectMode(CENTER);
  angleMode(DEGREES);
  //text styling
  textSize(16);
  textWrap(WORD);

  // simplified DESKTOP vs. MOBILE DETECTION
  isMobileDevice = checkMobileDevice();

  // iOS permission handling
  if (
    typeof DeviceMotionEvent.requestPermission === "function" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    //add a button for permissions
    askButton = createButton("Enable Motion Sensors");
    askButton.parent("sketch-container");
    askButton.id("permission-button"); // to add special styling for this button in style.css
    askButton.mousePressed(handlePermissionButtonPressed);
  } else {
    // Android / non-permission devices
    window.addEventListener("devicemotion", deviceMotionHandler, true);
    window.addEventListener("deviceorientation", deviceOrientationHandler, true);
    hasPermission = true;
  }
}

function draw() {
  background(255);

  //draw movers for everyone
  // console.log(experienceState.users);
  // draw all users including myself
  for (let id in experienceState.users) {
    //if I'm a moving device not a PC / laptop
  //   if(experienceState.users[id].deviceMoves){
  //     drawOthers(id);
  //   }
  // }

  // DESKTOP MESSAGE 
  if (!isMobileDevice) {
    displayDesktopMessage();
  }else{

    // WAITING FOR PERMISSION 
    if (!hasPermission) {
      displayPermissionMessage();
    }else{

      // MY MOBILE DEVICE
      //debug / show my own data
      visualiseMyData();

      // Send my data to the server (throttle via frameRate if needed)
      emitData();
    }
  }

}

// --------------------
// Custom Functions
// --------------------

visualise other drawing
function drawOthers(id){
  circle(coinX, coinY, coinSize);
//   pop();
  
  push();
  stroke('rgb(217,238,171)');
  strokeWeight(snotSize);
  line(width/2, height/2, x,y);
  pop();
 
  
  //Creating a tilt sensor mechanic that has a sort of boolean logic (on or off)
  //if the phone is rotated front/back/left/right we will get an arrow point in that direction 
  push();
  translate(width/2,height/2);


  
  x = x + constrain(map(leftToRight,-50,50,-maxSnotSpeed,maxSnotSpeed), -maxSnotSpeed, maxSnotSpeed);
  
   y = y + constrain(map(frontToBack,-30,50,-maxSnotSpeed,maxSnotSpeed), -maxSnotSpeed, maxSnotSpeed);
  
  
  pop();

}


function visualiseMyData(){
   // Simple movement threshold visualisation
  let totalMovement =
    Math.abs(accX) + Math.abs(accY) + Math.abs(accZ);

  background(255);

//   push();
  circle(coinX, coinY, coinSize);
//   pop();
  
  push();
  stroke('rgb(217,238,171)');
  strokeWeight(snotSize);
  line(width/2, height/2, x,y);
  pop();
 
  
  //Creating a tilt sensor mechanic that has a sort of boolean logic (on or off)
  //if the phone is rotated front/back/left/right we will get an arrow point in that direction 
  push();
  translate(width/2,height/2);


  
  x = x + constrain(map(leftToRight,-50,50,-maxSnotSpeed,maxSnotSpeed), -maxSnotSpeed, maxSnotSpeed);
  
   y = y + constrain(map(frontToBack,-30,50,-maxSnotSpeed,maxSnotSpeed), -maxSnotSpeed, maxSnotSpeed);
  
  
  pop();

  
  
  
  
  //Debug text
  fill(0);
  textSize(15);
  

  text("count: "+count,10,150); 
  
  checkCollision();
}

function checkCollision() {
  if(dist(coinX, coinY, x, y)< coinSize/2 + snotSize/2){
  coinX = random(0,width);
  coinY = random(0, height);
  count = count+1;
  }
}

// SEND DATA TO SERVER
function emitData(){
  //throttle
  let now = millis();
  if (now - lastSent < SEND_RATE){
    return;
  } 
  lastSent = now;

  let myMotionData = {
    screenPosition: { 
      x: randomX,
      y: randomY
    },
    acceleration: {
      x: accX,
      y: accY,
      z: accZ,
    },
    rotationRate: {
      alpha: rrateZ,
      beta: rrateX,
      gamma: rrateY,
    },
    orientation: {
      alpha: rotateDegrees,
      beta: frontToBack,
      gamma: leftToRight,
    }
  };

  // update experience state in my browser 
  experienceState.users[me].deviceMoves = true;
  experienceState.users[me].motionData = myMotionData;

  socket.emit("motionData", myMotionData);
}

//not mobile message
function displayDesktopMessage() {
  fill(0);
  textAlign(CENTER);
  let message = "This is a mobile experience. Please also open this URL on your phone’s browser.";
  text(message, width / 2, 30, width);//4th parameter to get text to wrap to new line if wider than canvas
}

function displayPermissionMessage() {
  fill(0);
  textAlign(CENTER);
  let message = "Waiting for motion sensor permission, click the button to allow.";
  text(message, width / 2, 30, width);//4th parameter to get text to wrap to new line if wider than canvas
}

// --------------------
// Socket events
// --------------------

// initial full state
socket.on("init", (data) => {
  me = data.id;
  experienceState = data.state;
  console.log(experienceState);
});

// someone joined
socket.on("userJoined", (data) => {
  experienceState.users[data.id] = data.user;
});

// someone left
socket.on("userLeft", (id) => {
  delete experienceState.users[id];
});

// someone moved
socket.on("userMoved", (data) => {
  let id = data.id;
  // console.log(data.id,experienceState.users[id]);
  if (experienceState.users[id]) {
    // console.log(data);
    experienceState.users[id].deviceMoves = data.deviceMoves;
    experienceState.users[id].motionData = data.motion;
  }
});

// --------------------
// Permission handling
// --------------------

function handlePermissionButtonPressed() {
  DeviceMotionEvent.requestPermission()
    .then((response) => {
      if (response === "granted") {
        //permission granted
        hasPermission = true;

        window.addEventListener(
          "devicemotion",
          deviceMotionHandler,
          true
        );
      }
    })
    .catch(console.error);

  DeviceOrientationEvent.requestPermission()
    .then((response) => {
      if (response === "granted") {
        window.addEventListener(
          "deviceorientation",
          deviceOrientationHandler,
          true
        );
      }
    })
    .catch(console.error);

  askButton.remove();
}

// --------------------
// Window Resize
// --------------------


function windowResized() {

  resizeCanvas(windowWidth, windowHeight);

}


// --------------------
// Sensor handlers
// --------------------
// https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event
function deviceMotionHandler(event) {
  if (!event.acceleration || !event.rotationRate){
    return;
  }

  //acceleration in meters per second
  accX = event.acceleration.x || 0;
  accY = event.acceleration.y || 0;
  accZ = event.acceleration.z || 0;

  //degrees per second
  rrateZ = event.rotationRate.alpha || 0;
  rrateX = event.rotationRate.beta || 0;
  rrateY = event.rotationRate.gamma || 0;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Window/deviceorientation_event
// https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Orientation_and_motion_data_explained
function deviceOrientationHandler(event) {
  rotateDegrees = event.alpha || 0;
  frontToBack = event.beta || 0;
  leftToRight = event.gamma || 0;
}


// --------------------
// Mobile Device Check
// --------------------


// Simple mobile device check using the browser's userAgent string
// This is fast and easy, but not 100% reliable for all devices
function checkMobileDevice() {

  // The userAgent is a long string that describes the browser and device
  let userAgent = navigator.userAgent;

  // This regular expression checks for common mobile keywords
  // like Android phones, iPhones, iPads, etc.
  let mobileRegex = /Mobi|Android|iPhone|iPad|iPod/i;

  // test() returns true if the pattern is found, false otherwise
  return mobileRegex.test(userAgent);
}

/*
  Note on device detection for more professional / production-level projects:
  - Modernizr:
    Instead of guessing the device type, Modernizr checks for features
    (like touch support, orientation sensors, WebGL, etc.).
    This is often a better approach for responsive and accessible design.
  - device-detector-js or UAParser.js:
    These libraries properly parse the userAgent and can tell you
    whether the device is a phone, tablet, or desktop with much
    higher accuracy than a simple regex.
*/