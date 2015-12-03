(function(window) {

  // set the width and height of an DOM Element
  var setSize = function(stage, w, h) {
    stage.setAttribute('width', w);
    stage.setAttribute('height', h);
  }

  // Create a named SVG element on a node, with attributes and optional text
  var appendTo = function(node,name,attrs,text){
    var p,ns=appendTo.ns,svg=node,doc=node.ownerDocument;
    if (!ns){ // cache namespaces by prefix once
      while (svg&&svg.tagName!='svg') svg=svg.parentNode;
      ns=appendTo.ns={svg:svg.namespaceURI};
      for (var a=svg.attributes,i=a.length;i--;){
        if (a[i].namespaceURI) ns[a[i].localName]=a[i].nodeValue;
      }
    }
    var el = doc.createElementNS(ns.svg,name);
    for (var attr in attrs){
      if (!attrs.hasOwnProperty(attr)) continue;
      if (!(p=attr.split(':'))[1]) el.setAttribute(attr,attrs[attr]);
      else el.setAttributeNS(ns[p[0]]||null,p[1],attrs[attr]);
    }
    if (text) el.appendChild(doc.createTextNode(text));
    return node.appendChild(el);
  }

  // remove all child element of a DOM Node
  var clear = function(node){
    while (node.lastChild) node.removeChild(node.lastChild);
  }

  // create a cubic bezier path between two points
  // from and to are {x:,y:}, offset is a radius around
  // the points that should not be crossed by the line
  // returns [startx, starty, ctrlX, ctrlY, endX, endY]
  var curvedConnection = function(from, to, offset) {
    var deltaX = to.x - from.x;
    var deltaY = to.y - from.y;
    var distance = Math.sqrt(deltaX*deltaX + deltaY*deltaY);

    var rad = Math.atan2(deltaX, deltaY);
    var radExit = rad + 0.25;
    var radEnter = rad - 0.25;

    var offsetMultiplierEnter = 1;
    var offsetMultiplierExit = 1;
    var reflexive = distance < offset*2;

    if (distance < offset*2) {
      offsetMultiplierEnter = 0.2;
      offsetMultiplierExit = 0.5;
    } else if (distance-40 < offset*2) {
      offsetMultiplierEnter = 0.7;
      offsetMultiplierExit = 0.7;
    }

    var offsetExitX = Math.sin(radExit) * offset * offsetMultiplierExit;
    var offsetExitY = Math.cos(radExit) * offset * offsetMultiplierExit;
    var offsetEnterX = Math.sin(radEnter) * (offset + 20) * offsetMultiplierEnter;
    var offsetEnterY = Math.cos(radEnter) * (offset + 20) * offsetMultiplierEnter;

    var adjustedDeltaX = deltaX-offsetEnterX-offsetExitX;
    var adjustedDeltaY = deltaY-offsetEnterY-offsetExitY;

    var bending = Math.sqrt(distance)/(400);

    var ctrlPointX = (adjustedDeltaX/2+adjustedDeltaY*bending);
    var ctrlPointY = (adjustedDeltaY/2-adjustedDeltaX*bending);

    var startX = from.x+offsetExitX;
    var startY = from.y+offsetExitY;
    var ctrlAX = ctrlPointX;
    var ctrlAY = ctrlPointY;
    var ctrlBX = ctrlPointX;
    var ctrlBY = ctrlPointY;
    var endX = adjustedDeltaX;
    var endY = adjustedDeltaY;

    if(reflexive) {
      var samePoint = Math.abs(distance) < 1;
      var rotatedDeltaX = !samePoint ? -deltaY / distance : -1;
      var rotatedDeltaY = !samePoint ?  deltaX / distance : 0;
      var refOffsetX = rotatedDeltaX * offset;
      var refOffsetY = rotatedDeltaY * offset;

      var extraX = deltaX*offset/(distance||1)/2;
      var extraY = deltaY*offset/(distance||1)/2;

      if (samePoint) {
        deltaY += offset;
        extraY += offset;
      }

      startX = from.x + refOffsetX;
      startY = from.y + refOffsetY - (samePoint ? offset/2 : 0);
      ctrlAX = refOffsetX - extraX;
      ctrlAY = refOffsetY - extraY;
      ctrlBX = deltaX + refOffsetX + extraX;
      ctrlBY = deltaY + refOffsetY + extraY;
      endX = deltaX + rotatedDeltaX*(!samePoint ? 20 : 10) ;
      endY = deltaY + rotatedDeltaY*20;
    }

    return [
      startX, startY,
      ctrlAX, ctrlAY,
      ctrlBX, ctrlBY,
      endX, endY
    ];
  };

  // One Dimensional Cubic Bezier interpolation
  // t: parameter btween 0 and 1
  // s: start value
  // c: control value
  // e: end value
  var interpCubic = function(t, s, c1, c2, e) {
    var tInv = (1 - t);
    return tInv * tInv * tInv * s
      + 3 * tInv * tInv * t * c1
      + 3 * tInv * t * t * c2
      + t * t * t * e;
  }

  // create a triangle of given length(=height) for the given curve
  // curve is expetec to be a qudratic bezier curve array:
  // [startx, starty, ctrlX, ctrlY, endX, endY]
  // returns [x1,y1,x2,y2,x3,y3]
  var curveArrowHead = function(curve, length) {

    var totalLength = Math.sqrt(curve[6]*curve[6] + curve[7]*curve[7]);

    if(totalLength < length * 1.3*1.3) {
      length /= 1.3;
    }

    var cx = interpCubic(0.9, 0, curve[2], curve[4], curve[6]);
    var cy = interpCubic(0.9, 0, curve[3], curve[5], curve[7]);

    var angle = Math.atan2(curve[6] - cx, curve[7] - cy);
    var extend = Math.PI/4;

    var angleA = angle + extend / 2;
    var angleB = angle - extend / 2;
    var tipX = curve[0] + curve[6] + Math.sin(angle) * length/2;
    var tipY = curve[1] + curve[7] + Math.cos(angle) * length/2;

    return [
      tipX,
      tipY,
      tipX - Math.sin(angleA) * length,
      tipY - Math.cos(angleA) * length,
      tipX - Math.sin(angleB) * length,
      tipY - Math.cos(angleB) * length,
    ];
  };

  var curveLabelPosition = function(curve, offset) {
    var t = 0.5;
    var cx = curve[0] + interpCubic(t, 0, curve[2], curve[4], curve[6]);
    var cy = curve[1] + interpCubic(t, 0, curve[3], curve[5], curve[7]);

    var rcx = curve[0] + curve[6]/2;
    var rcy = curve[1] + curve[7]/2;

    var offsetx = cx - rcx;
    var offsety = cy - rcy;
    var offsetLength = Math.sqrt(offsetx*offsetx + offsety*offsety);
    var offsetNormX = offsetx/offsetLength;
    var offsetNormY = offsety/offsetLength;

    return {x: cx + offsetNormX * offset, y: cy + offsetNormY * offset};
  };

  // convert the given cubic bezier points into a a string usable in SVG paths
  var cubicString = function(startX, startY, ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY) {
    return [
      "M",
      [startX, startY].join(','),
      "c",
      [ctrl1X, ctrl1Y].join(','),
      [ctrl2X, ctrl2Y].join(','),
      [endX, endY].join(','),
    ].join(' ');
  };

  // clamp the value v between min and max
  var clamp = function(v, min, max) {
    return Math.min(Math.max(min, v), max);
  };

  // setup mouse event handler to enable drag drop behaviour
  // target: the element to bind the listeners to
  // pos: a function (evt)->{x,y} the convert the event into a position
  // hit: a function (evt, {x,y}) -> int to convert a position into an identifier, -1 for camera panning
  // start: a callback function which is called when the dragging starts
  // move: a callback function which is called when the mouse moves during dragging
  // end: a callback function which is called when dragging stops
  var setupDrag = function(target, pos, hit, start, move, end) {
    var dragState = {
      activeState : null,
    };

    var mouseOffset = {x:0,y:0};
    var moveListener = function(evtMove) {
      evtMove.preventDefault();
      var cursor = pos(evtMove);

      move(dragState.activeState, cursor.x - mouseOffset.x, cursor.y - mouseOffset.y);
      var cursorNew = pos(evtMove);
      mouseOffset.x = cursorNew.x;
      mouseOffset.y = cursorNew.y;
    };

    var releaseListener = function(evtUp) {
      evtUp.preventDefault();

      dragState.activeState = null;
      mouseOffset.x = 0;
      mouseOffset.y = 0;

      document.removeEventListener('mousemove', moveListener);
      document.removeEventListener('mouseup', releaseListener);

      end();
    };

    target.addEventListener('mousedown', function(evtDown) {
      evtDown.preventDefault();

      var cursor = pos(evtDown);
      var stateIdx = hit(evtDown, cursor);
      if(stateIdx !== null) {
        dragState.activeState = stateIdx;
        mouseOffset.x = cursor.x;
        mouseOffset.y = cursor.y;

        start(stateIdx);

        document.addEventListener('mouseup', releaseListener);
        document.addEventListener('mousemove', moveListener);
      }
    });

    return dragState;
  };

  // calulate diagonal distance between point a and b
  // a and b are {x,y}
  var vecDistance = function(a,b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx*dx+dy*dy);
  }

  // return some test graph to render
  var loadFSM = function() {
    return [
      {
        pos: {x: 200, y: 200},
        transitions: [
          {target: 1, condition: 0},
          {target: 0, condition: 1}
        ]
      },
      {
        pos: {x: 500, y: 480},
        transitions: [
          {target: 2, condition: 1},
          {target: 0, condition: 0}
        ]
      },
      {
        pos: {x: 900, y: 280},
        transitions: [
          {target: 1, condition: 1}
        ]
      },
      {
        pos: {x: 600, y: 80},
        transitions: [
          {target: 0, condition: 0},
          {target: 2, condition: 1}
        ]
      }
      ,
      {
        pos: {x: 1000, y: 80},
        transitions: [
          {target: 0, condition: 1},
          {target: 2, condition: 0}
        ]
      }
    ];
  };

  // creates a callback function to be used as move callback in setupDrag
  // states: the graph object containing the draggable states
  // render: the render function to be called after data changes
  // pan: the callback being called for panning the camera
  var createDragMoveHandler = function(states, render, pan) {
    return function(element, deltaX, deltaY) {
      if(element === -1) {
        pan && pan(deltaX, deltaY);
        return;
      }

      var state = states[element];
      state.pos.x = clamp(state.pos.x + deltaX, 0, 1200);
      state.pos.y = clamp(state.pos.y + deltaY, 0, 600);

      render();
    };
  };

  // create a callback function to be used in createDragMoveHandler for panning
  // cam: object which x and y properties should be set
  // render: render function to be called when data changes
  var createPanHandler = function(cam, render) {
    return function(dx, dy) {
      cam.x -= dx;
      cam.y -= dy;
      render();
    };
  };

  window.curveLabelPosition = curveLabelPosition;
  window.createPanHandler = createPanHandler;
  window.createDragMoveHandler = createDragMoveHandler;
  window.loadFSM = loadFSM;
  window.vecDistance = vecDistance;
  window.setupDrag = setupDrag;
  window.clamp = clamp;
  window.curvedConnection = curvedConnection;
  window.cubicString = cubicString;
  window.curveArrowHead = curveArrowHead;
  window.setStageSize = setSize;
  window.appendToSVG = appendTo;
  window.clearSVG = clear;
})(window);
