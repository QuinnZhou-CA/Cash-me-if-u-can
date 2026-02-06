// Create connection to Node.js Server
const socket = io();

let canvas;

let myCount = 0;
let onlineTotal = 0;

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

let flashTimer = 0;

let x, y;
let maxSnotSpeed = 8;
let coinX,coinY;


let coinSize = 40;
let snotSize = 10;

let count = 0;
let totalCount = 0;
let coinsmallSize = 30;

// throttle device motion sending
let lastSent = 0;
const SEND_RATE = 30; // ms (~33 fps)

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("sketch-container"); 

  //random position used for visualisation

  x = width/2;
  y = height/2;
  coinX = random(coinSize / 2, width - coinSize / 2);
  coinY = random(coinSize / 2, height - coinSize / 2);
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
    if(experienceState.users[id].deviceMoves){
      drawOthers(id);
    } 
  }

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

  drawScores();

};



// --------------------
// Custom Functions
// --------------------

//visualise other drawing
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

  if (flashTimer > 0) {
  background(0, 225, 0);   
  flashTimer=flashTimer-1;          
} else {
  background(0, 18, 255); 
}

push();
  fill("yellow");
  stroke("rgb(65,65,65)");
  circle(coinX, coinY, coinSize);
  circle(coinX, coinY, coinsmallSize);
  textAlign(CENTER, CENTER);
  textFont("Lower Pixel");
  textSize(16);
  fill("rgb(65,65,65)");
  text(1, coinX, coinY + 1.5);
  pop();

  push();
  stroke("white");
  strokeWeight(snotSize);
  textSize(40);
  textAlign(CENTER, CENTER);
  line(width / 2, height / 2, x, y);
  text("👄", width / 2, height / 2);
  pop();

  push();
  textAlign(CENTER, CENTER);
  textSize(32);
  text("👅", x, y);
  pop();
  
// ---- Pretty HUD (Top-right) ----

  push();

const pad = 12;
const hudW = 100;
const hudH = 78;

const hudX = width - hudW - pad;   // left of HUD box
const hudY = pad;                  // top of HUD box


// icon
textAlign(LEFT, TOP);
textSize(35);
text("💴", hudX, hudY - 9);

// text styles
textFont("Lower Pixel");
textAlign(LEFT, TOP);

// big title (My coins)
fill(255);
textSize(9);
text("My Coins", hudX, hudY + 25);

noStroke();
fill(255);
textSize(45);
text(myCount, hudX+45, hudY-6);

// small lines (online + history)
fill(255);
textSize(12);
text("Online People:  " + onlineTotal, hudX-270, hudY + 10);
text("Total Coins: " + totalCount,  hudX-160, hudY+10);

pop();

push();
// // background panel

const FrameLeft = 20;
const FrameTop = 45;
const FrameRight = windowWidth - 40;
const FrameDown = windowHeight - 70;
  
rect(FrameLeft,FrameTop,FrameRight,FrameDown);

pop();

  //Creating a tilt sensor mechanic that has a sort of boolean logic (on or off)
  //if the phone is rotated front/back/left/right we will get an arrow point in that direction 
  push();
  translate(width/2,height/2);

  x = x + constrain(map(leftToRight,-50,50,-maxSnotSpeed,maxSnotSpeed), -maxSnotSpeed, maxSnotSpeed);
  y = y + constrain(map(frontToBack,-30,50,-maxSnotSpeed,maxSnotSpeed), -maxSnotSpeed, maxSnotSpeed);
  
  x = constrain(x, 0, width);
  y = constrain(y, 0, height);
  pop();

  checkCollision();
}

function checkCollision() {
  if(dist(coinX, coinY, x, y)< coinSize/2 + snotSize/2){
  coinX = random(coinSize / 2, width - coinSize / 2);
  coinY = random(coinSize / 2, height - coinSize / 2);
  socket.emit("coinCollected");
  }
}

function drawScores() {
  myCount = 0;
  onlineTotal = 0;

  for (let id in experienceState.users) {
    onlineTotal += experienceState.users[id].count || 0;

    if (id === me) {
      myCount = experienceState.users[id].count || 0;
    }
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
    // screenPosition: { 
    //   x: randomX,
    //   y: randomY
    // },
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

socket.on("scoreUpdate", (data) => {
  experienceState.users = data.users;
  totalCount = data.totalCount;
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