// ORBIT CONTROLS LEGACY
// https://raw.githubusercontent.com/mrdoob/three.js/501c06b6cbf07ff72c82def54e2d39d5a7e3a7d6/examples/js/controls/OrbitControls.js

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finger swipe

THREE.OrbitControls = function (object, domElement) {

  this.object = object;

  this.domElement = domElement !== undefined ? domElement : document;

  // Set to false to disable this control
  this.enabled = true;

  // "target" sets the location of focus, where the object orbits around
  this.target = new THREE.Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  this.minDistance = 0;
  this.maxDistance = Infinity;

  // How far you can zoom in and out ( OrthographicCamera only )
  this.minZoom = 0;
  this.maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
  this.minAzimuthAngle = -Infinity; // radians
  this.maxAzimuthAngle = Infinity; // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  this.enableDamping = false;
  this.dampingFactor = 0.25;

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  this.enableZoom = true;
  this.zoomSpeed = 1.0;

  // Set to false to disable rotating
  this.enableRotate = true;
  this.rotateSpeed = 1.0;

  // Set to false to disable panning
  this.enablePan = true;
  this.keyPanSpeed = 7.0; // pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  this.enableKeys = true;

  // The four arrow keys
  this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

  // Mouse buttons
  this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

  // for reset
  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom;

  //
  // public methods
  //

  this.getPolarAngle = function () {

    return spherical.phi;

  };

  this.getAzimuthalAngle = function () {

    return spherical.theta;

  };

  this.saveState = function () {

    scope.target0.copy(scope.target);
    scope.position0.copy(scope.object.position);
    scope.zoom0 = scope.object.zoom;

  };

  this.reset = function () {

    scope.target.copy(scope.target0);
    scope.object.position.copy(scope.position0);
    scope.object.zoom = scope.zoom0;

    scope.object.updateProjectionMatrix();
    scope.dispatchEvent(changeEvent);

    scope.update();

    state = STATE.NONE;

  };

  // this method is exposed, but perhaps it would be better if we can make it private...
  this.update = function () {

    var offset = new THREE.Vector3();

    // so camera.up is the orbit axis
    var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    var quatInverse = quat.clone().inverse();

    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();

    return function update() {

      var position = scope.object.position;

      offset.copy(position).sub(scope.target);

      // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion(quat);

      // angle from z-axis around y-axis
      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {

        rotateLeft(getAutoRotationAngle());

      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi;

      // restrict theta to be between desired limits
      spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));

      // restrict phi to be between desired limits
      spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));

      spherical.makeSafe();


      spherical.radius *= scale;

      // restrict radius to be between desired limits
      spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

      // move target to panned location
      scope.target.add(panOffset);

      offset.setFromSpherical(spherical);

      // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion(quatInverse);

      position.copy(scope.target).add(offset);

      scope.object.lookAt(scope.target);

      if (scope.enableDamping === true) {

        sphericalDelta.theta *= 1 - scope.dampingFactor;
        sphericalDelta.phi *= 1 - scope.dampingFactor;

      } else {

        sphericalDelta.set(0, 0, 0);

      }

      scale = 1;
      panOffset.set(0, 0, 0);

      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if (zoomChanged ||
      lastPosition.distanceToSquared(scope.object.position) > EPS ||
      8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {

        scope.dispatchEvent(changeEvent);

        lastPosition.copy(scope.object.position);
        lastQuaternion.copy(scope.object.quaternion);
        zoomChanged = false;

        return true;

      }

      return false;

    };

  }();

  this.dispose = function () {

    scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
    scope.domElement.removeEventListener('mousedown', onMouseDown, false);
    scope.domElement.removeEventListener('wheel', onMouseWheel, false);

    scope.domElement.removeEventListener('touchstart', onTouchStart, false);
    scope.domElement.removeEventListener('touchend', onTouchEnd, false);
    scope.domElement.removeEventListener('touchmove', onTouchMove, false);

    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    window.removeEventListener('keydown', onKeyDown, false);

    //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

  };

  //
  // internals
  //

  var scope = this;

  var changeEvent = { type: 'change' };
  var startEvent = { type: 'start' };
  var endEvent = { type: 'end' };

  var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5 };

  var state = STATE.NONE;

  var EPS = 0.000001;

  // current position in spherical coordinates
  var spherical = new THREE.Spherical();
  var sphericalDelta = new THREE.Spherical();

  var scale = 1;
  var panOffset = new THREE.Vector3();
  var zoomChanged = false;

  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();

  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();

  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {

    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

  }

  function getZoomScale() {

    return Math.pow(0.95, scope.zoomSpeed);

  }

  function rotateLeft(angle) {

    sphericalDelta.theta -= angle;

  }

  function rotateUp(angle) {

    sphericalDelta.phi -= angle;

  }

  var panLeft = function () {

    var v = new THREE.Vector3();

    return function panLeft(distance, objectMatrix) {

      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
      v.multiplyScalar(-distance);

      panOffset.add(v);

    };

  }();

  var panUp = function () {

    var v = new THREE.Vector3();

    return function panUp(distance, objectMatrix) {

      v.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
      v.multiplyScalar(distance);

      panOffset.add(v);

    };

  }();

  // deltaX and deltaY are in pixels; right and down are positive
  var pan = function () {

    var offset = new THREE.Vector3();

    return function pan(deltaX, deltaY) {

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if (scope.object instanceof THREE.PerspectiveCamera) {

        // perspective
        var position = scope.object.position;
        offset.copy(position).sub(scope.target);
        var targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan(scope.object.fov / 2 * Math.PI / 180.0);

        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
        panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);

      } else if (scope.object instanceof THREE.OrthographicCamera) {

        // orthographic
        panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
        panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);

      } else {

        // camera neither orthographic nor perspective
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
        scope.enablePan = false;

      }

    };

  }();

  function dollyIn(dollyScale) {

    if (scope.object instanceof THREE.PerspectiveCamera) {

      scale /= dollyScale;

    } else if (scope.object instanceof THREE.OrthographicCamera) {

      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;

    }

  }

  function dollyOut(dollyScale) {

    if (scope.object instanceof THREE.PerspectiveCamera) {

      scale *= dollyScale;

    } else if (scope.object instanceof THREE.OrthographicCamera) {

      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;

    }

  }

  //
  // event callbacks - update the object state
  //

  function handleMouseDownRotate(event) {

    //console.log( 'handleMouseDownRotate' );

    rotateStart.set(event.clientX, event.clientY);

  }

  function handleMouseDownDolly(event) {

    //console.log( 'handleMouseDownDolly' );

    dollyStart.set(event.clientX, event.clientY);

  }

  function handleMouseDownPan(event) {

    //console.log( 'handleMouseDownPan' );

    panStart.set(event.clientX, event.clientY);

  }

  function handleMouseMoveRotate(event) {

    //console.log( 'handleMouseMoveRotate' );

    rotateEnd.set(event.clientX, event.clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart);

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

    rotateStart.copy(rotateEnd);

    scope.update();

  }

  function handleMouseMoveDolly(event) {

    //console.log( 'handleMouseMoveDolly' );

    dollyEnd.set(event.clientX, event.clientY);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {

      dollyIn(getZoomScale());

    } else if (dollyDelta.y < 0) {

      dollyOut(getZoomScale());

    }

    dollyStart.copy(dollyEnd);

    scope.update();

  }

  function handleMouseMovePan(event) {

    //console.log( 'handleMouseMovePan' );

    panEnd.set(event.clientX, event.clientY);

    panDelta.subVectors(panEnd, panStart);

    pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    scope.update();

  }

  function handleMouseUp(event) {

    // console.log( 'handleMouseUp' );

  }

  function handleMouseWheel(event) {

    // console.log( 'handleMouseWheel' );

    if (event.deltaY < 0) {

      dollyOut(getZoomScale());

    } else if (event.deltaY > 0) {

      dollyIn(getZoomScale());

    }

    scope.update();

  }

  function handleKeyDown(event) {

    //console.log( 'handleKeyDown' );

    switch (event.keyCode) {

      case scope.keys.UP:
        pan(0, scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.BOTTOM:
        pan(0, -scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.LEFT:
        pan(scope.keyPanSpeed, 0);
        scope.update();
        break;

      case scope.keys.RIGHT:
        pan(-scope.keyPanSpeed, 0);
        scope.update();
        break;}



  }

  function handleTouchStartRotate(event) {

    //console.log( 'handleTouchStartRotate' );

    rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);

  }

  function handleTouchStartDolly(event) {

    //console.log( 'handleTouchStartDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    dollyStart.set(0, distance);

  }

  function handleTouchStartPan(event) {

    //console.log( 'handleTouchStartPan' );

    panStart.set(event.touches[0].pageX, event.touches[0].pageY);

  }

  function handleTouchMoveRotate(event) {

    //console.log( 'handleTouchMoveRotate' );

    rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    rotateDelta.subVectors(rotateEnd, rotateStart);

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

    rotateStart.copy(rotateEnd);

    scope.update();

  }

  function handleTouchMoveDolly(event) {

    //console.log( 'handleTouchMoveDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    dollyEnd.set(0, distance);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {

      dollyOut(getZoomScale());

    } else if (dollyDelta.y < 0) {

      dollyIn(getZoomScale());

    }

    dollyStart.copy(dollyEnd);

    scope.update();

  }

  function handleTouchMovePan(event) {

    //console.log( 'handleTouchMovePan' );

    panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

    panDelta.subVectors(panEnd, panStart);

    pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    scope.update();

  }

  function handleTouchEnd(event) {

    //console.log( 'handleTouchEnd' );

  }

  //
  // event handlers - FSM: listen for events and reset state
  //

  function onMouseDown(event) {

    if (scope.enabled === false) return;

    event.preventDefault();

    switch (event.button) {

      case scope.mouseButtons.ORBIT:

        if (scope.enableRotate === false) return;

        handleMouseDownRotate(event);

        state = STATE.ROTATE;

        break;

      case scope.mouseButtons.ZOOM:

        if (scope.enableZoom === false) return;

        handleMouseDownDolly(event);

        state = STATE.DOLLY;

        break;

      case scope.mouseButtons.PAN:

        if (scope.enablePan === false) return;

        handleMouseDownPan(event);

        state = STATE.PAN;

        break;}



    if (state !== STATE.NONE) {

      document.addEventListener('mousemove', onMouseMove, false);
      document.addEventListener('mouseup', onMouseUp, false);

      scope.dispatchEvent(startEvent);

    }

  }

  function onMouseMove(event) {

    if (scope.enabled === false) return;

    event.preventDefault();

    switch (state) {

      case STATE.ROTATE:

        if (scope.enableRotate === false) return;

        handleMouseMoveRotate(event);

        break;

      case STATE.DOLLY:

        if (scope.enableZoom === false) return;

        handleMouseMoveDolly(event);

        break;

      case STATE.PAN:

        if (scope.enablePan === false) return;

        handleMouseMovePan(event);

        break;}



  }

  function onMouseUp(event) {

    if (scope.enabled === false) return;

    handleMouseUp(event);

    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    scope.dispatchEvent(endEvent);

    state = STATE.NONE;

  }

  function onMouseWheel(event) {

    if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE && state !== STATE.ROTATE) return;

    event.preventDefault();
    event.stopPropagation();

    handleMouseWheel(event);

    scope.dispatchEvent(startEvent); // not sure why these are here...
    scope.dispatchEvent(endEvent);

  }

  function onKeyDown(event) {

    if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;

    handleKeyDown(event);

  }

  function onTouchStart(event) {

    if (scope.enabled === false) return;

    switch (event.touches.length) {

      case 1: // one-fingered touch: rotate

        if (scope.enableRotate === false) return;

        handleTouchStartRotate(event);

        state = STATE.TOUCH_ROTATE;

        break;

      case 2: // two-fingered touch: dolly

        if (scope.enableZoom === false) return;

        handleTouchStartDolly(event);

        state = STATE.TOUCH_DOLLY;

        break;

      case 3: // three-fingered touch: pan

        if (scope.enablePan === false) return;

        handleTouchStartPan(event);

        state = STATE.TOUCH_PAN;

        break;

      default:

        state = STATE.NONE;}



    if (state !== STATE.NONE) {

      scope.dispatchEvent(startEvent);

    }

  }

  function onTouchMove(event) {

    if (scope.enabled === false) return;

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {

      case 1: // one-fingered touch: rotate

        if (scope.enableRotate === false) return;
        if (state !== STATE.TOUCH_ROTATE) return; // is this needed?...

        handleTouchMoveRotate(event);

        break;

      case 2: // two-fingered touch: dolly

        if (scope.enableZoom === false) return;
        if (state !== STATE.TOUCH_DOLLY) return; // is this needed?...

        handleTouchMoveDolly(event);

        break;

      case 3: // three-fingered touch: pan

        if (scope.enablePan === false) return;
        if (state !== STATE.TOUCH_PAN) return; // is this needed?...

        handleTouchMovePan(event);

        break;

      default:

        state = STATE.NONE;}



  }

  function onTouchEnd(event) {

    if (scope.enabled === false) return;

    handleTouchEnd(event);

    scope.dispatchEvent(endEvent);

    state = STATE.NONE;

  }

  function onContextMenu(event) {

    event.preventDefault();

  }

  //

  scope.domElement.addEventListener('contextmenu', onContextMenu, false);

  scope.domElement.addEventListener('mousedown', onMouseDown, false);
  scope.domElement.addEventListener('wheel', onMouseWheel, false);

  scope.domElement.addEventListener('touchstart', onTouchStart, false);
  scope.domElement.addEventListener('touchend', onTouchEnd, false);
  scope.domElement.addEventListener('touchmove', onTouchMove, false);

  window.addEventListener('keydown', onKeyDown, false);

  // force an update at start

  this.update();

};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

Object.defineProperties(THREE.OrbitControls.prototype, {

  center: {

    get: function () {

      console.warn('THREE.OrbitControls: .center has been renamed to .target');
      return this.target;

    } },



  // backward compatibility

  noZoom: {

    get: function () {

      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      return !this.enableZoom;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      this.enableZoom = !value;

    } },



  noRotate: {

    get: function () {

      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      return !this.enableRotate;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      this.enableRotate = !value;

    } },



  noPan: {

    get: function () {

      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      return !this.enablePan;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      this.enablePan = !value;

    } },



  noKeys: {

    get: function () {

      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      return !this.enableKeys;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      this.enableKeys = !value;

    } },



  staticMoving: {

    get: function () {

      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      return !this.enableDamping;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      this.enableDamping = !value;

    } },



  dynamicDampingFactor: {

    get: function () {

      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      return this.dampingFactor;

    },

    set: function (value) {

      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      this.dampingFactor = value;

    } } });







/**
 * THREE.JS
 * TODO
 * add plane to see only one part of the sphere
 * add proper explanation of the pen
 * show a few interesting combinations
 * add gif export
 * KNOWN BUGS
 * n must be multiple of 2... for some reason
 * "incomplete" circle bug --> the camera has depth
 */
console.clear();


let scene, camera, renderer, controls;
const width = 500,
height = 500;


/**
 * Camera setup
 */
scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(
10,
width / height,
1,
1000);

camera.position.set(0, 12, 10);
camera.lookAt(scene.position);



/**
 * Renderer setup
 */
renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);

document.getElementById('container').appendChild(renderer.domElement);



/**
 * Controller setup
 */
controls = new THREE.OrbitControls(camera, document.getElementById('container'));
controls.rotateSpeed = 0.5;
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.autoRotate = false;
controls.autoRotateSpeed = 1;



/**
 * UI objects
 */
// Options
let opts = {
  ce: true, // Circle enable
  n: 16, // Number of circles & dots
  s: 0.02, // Speed
  p: false, // Pause/Unpause
  k: 1, // Multiplier, full amplitude
  aki: 0.01, // Auto multiplier incrementation
  ake: false, // Auto multiplier enable
  at: [0, 16, 0], // Align view to top
  af: [16, 0, 0], // Align view to front
  as: [0, 0, 16], // Align view to side
  ad: [0, 12, 10], // Align view to default
  ENDOFOPTIONS: null, // Placeholder
  t: 0, // Time
  elmts: {
    ce: document.getElementById('ce'),
    n: document.getElementById('n'),
    s: document.getElementById('s'),
    p: document.getElementById('p'),
    k: document.getElementById('k'),
    aki: document.getElementById('aki'),
    ake: document.getElementById('ake'),
    at: document.getElementById('at'),
    af: document.getElementById('af'),
    as: document.getElementById('as'),
    ad: document.getElementById('ad') },

  handlers: {
    ce: function () {
      // Set the visibility of all circles
      opts.ce = this.checked;
      for (let i = 0; i < circles.length; i++) {
        circles[i].visible = opts.ce;
      }
    },
    n: function () {
      let value = parseInt(this.value);
      // Set minimum value for k
      value = Math.max(1, Math.min(value, 10000));
      // Apply the value
      generateMeshes(value, opts.n);
      // Set the value
      opts.n = value;
      this.value = value;
    },
    s: function () {
      // Pause comes before speed modification
      if (opts.p === true) return;

      let value = parseFloat(this.value);
      // Clamp the value between 0.01 and 1
      value = Math.max(0.001, Math.min(1, value));
      // Set the value
      opts.s = value;
      this.value = value;
    },
    p: function () {
      // Toggle pause state
      opts.p = !opts.p;
      // Apply pause
      if (opts.p) {
        opts.s = 0;
        this.value = 'Unpause';
      } else {
        // Update the speed value
        // Call the event handler for the speed input with context
        opts.handlers.s.call(opts.elmts.s);
        this.value = 'Pause';
      }
    },
    k: function () {
      let value = parseFloat(this.value);
      // Set minimum value for k
      value = Math.max(0, value);
      // Set the value
      opts.k = value;
      this.value = value;
    },
    aki: function () {
      let value = parseFloat(this.value);
      // Set minimum value for k
      value = Math.max(0, Math.min(value, 1));
      // Set the value
      opts.aki = value;
      this.value = value;
    },
    ake: function () {
      opts.ake = this.checked;
    },
    at: function () {
      camera.position.set(...opts.at);
    },
    af: function () {
      camera.position.set(...opts.af);
    },
    as: function () {
      camera.position.set(...opts.as);
    },
    ad: function () {
      camera.position.set(...opts.ad);
    } },

  init: function () {
    let keys = Object.keys(this),
    elmt,type;

    for (let i of keys) {
      // Stop when you arrive at the end of the option list
      if (i === 'ENDOFOPTIONS') break;

      elmt = this.elmts[i];
      type = elmt.type;

      if (type === 'checkbox' || type === 'button') {
        elmt.checked = this[i];
        elmt.onclick = this.handlers[i];
      }
      if (type === 'number') {
        elmt.value = this[i];
        elmt.onchange = this.handlers[i];
      }
    }
  } };


opts.init();

// Interesting combinations
let cbs = {
  values: [
  ['One synced arc', 16, 0, 0.02],
  ['Nearly a spiral', 16, 0.5, 0.02],
  ['Repulsive circle', 16, 43, 0.02],
  ['2 dancing arcs', 16, 47.8, 0.02],
  ['3 dancing arcs', 16, 42.8, 0.02],
  ['2 rotating circles', 32, 33, 0.02],
  ['Clover', 32, 34, 0.02],
  ['Rotor, 3 blades', 128, 3, 0.02],
  ['Rotor, 5 blades', 256, 5, 0.02],
  ['Rotating flower', 800, 43, 0.01],
  ['Rotating flower with waves', 800, 53, 0.01],
  ['Switching halves', 800, 64, 0.01],
  ['Glitchy flower, 4 petals', 800, 79.8, 0.01],
  ['Glitchy flower, 5 petals', 1000, 105, 0.01],
  ['Tripping flower', 1000, 33, 0.005]],

  handler: function () {
    let i = this.i;
    opts.elmts.n.value = cbs.values[i][1];
    opts.elmts.k.value = cbs.values[i][2];
    opts.elmts.s.value = cbs.values[i][3];
    opts.handlers.n.call(opts.elmts.n);
    opts.handlers.k.call(opts.elmts.k);
    opts.handlers.s.call(opts.elmts.s);
  },
  init: function () {
    let tbody = document.getElementById('cbs');

    let value, tr, td, btn;
    for (let i = 0; i < cbs.values.length; i++) {
      // Values
      value = cbs.values[i];
      tr = document.createElement('tr');
      for (let j = 0; j < value.length; j++) {
        td = document.createElement('td');
        td.innerHTML = value[j];
        tr.appendChild(td);
      }
      // Button
      td = document.createElement('td');
      btn = document.createElement('button');
      btn.classList.add('btn');
      btn.innerHTML = 'Load';
      btn.i = i;
      btn.onclick = cbs.handler;
      td.appendChild(btn);
      tr.appendChild(td);
      // Append
      tbody.appendChild(tr);
    }
  } };


cbs.init();



/**
 * Meshes
 */
// Global variables for the meshes
let dots = [],circles = [];
function generateMeshes(newN = 0, oldN = 0) {
  // Return if no changes have happened
  if (newN === oldN) return;

  // Construction variables
  let c = {},d = {};
  c.material = new THREE.LineBasicMaterial({ color: 0xcccccc });
  c.geometry = new THREE.CircleGeometry(1, 64);
  c.geometry.vertices.shift(); // Remove center vertex

  d.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
  d.geometry = new THREE.SphereGeometry(.02, 8, 8);

  // Check if meshes need to be added or removed
  if (newN > oldN) {
    // Meshes need to be added
    let diff = newN - oldN; // # to be added

    for (let i = 0; i < diff; i++) {
      c.mesh = new THREE.Line(c.geometry, c.material);
      c.mesh.visible = opts.ce; // Set visibility (while adding circles live)
      circles.push(c.mesh);
      scene.add(c.mesh);

      d.mesh = new THREE.Mesh(d.geometry, d.material);
      dots.push(d.mesh);
      scene.add(d.mesh);
    }
  } else {
    // Meshes need to be removed
    let diff = oldN - newN; // # to be removed

    let circle, dot;
    for (let i = 0; i < diff; i++) {
      // Last elements of the arrays
      circle = circles[oldN - i - 1];
      dot = dots[oldN - i - 1];

      // Clean memory and remove meshes
      circle.material.dispose();
      circle.geometry.dispose();
      circles.pop();
      scene.remove(circle);
      dot.material.dispose();
      dot.geometry.dispose();
      dots.pop();
      scene.remove(dot);
    }
  }

  // Changes have been made, so we need to update the rotation
  for (let i = 0, rot; i < newN; i++) {
    rot = i / newN * Math.PI;

    circles[i].rotation.y = rot;
    dots[i].delay = rot; // The dot's delay and rotation
  }
}
generateMeshes(opts.n, 0);



/**
 * Rendering
 */
let nextframe;
function loop() {
  opts.t += opts.s;

  let _time, _rot, _dot;
  for (let i = 0; i < dots.length; i++) {
    _dot = dots[i]; // The current dot

    _time = opts.t + _dot.delay * opts.k; // The actual time for the dot
    _rot = _dot.delay; // The actual rotation of the dot

    _dot.position.x = Math.sin(_rot) * Math.sin(_time);
    _dot.position.y = Math.cos(_time);
    _dot.position.z = Math.cos(_rot) * Math.sin(_time);
  }

  if (opts.ake) {
    opts.k += opts.aki;
    opts.k = Math.round(opts.k * 1000) / 1000; // Because of rounding imprecisions
    opts.elmts.k.value = opts.k;
  }


  controls.update();
  renderer.render(scene, camera);

  nextframe = requestAnimationFrame(loop);
}

loop();