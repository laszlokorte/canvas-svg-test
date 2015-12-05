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
  var curvedConnection = function(from, to, offset, preferredAngle, streight) {
    if (typeof preferredAngle === 'undefined') {
      preferredAngle = Math.PI;
    }
    var deltaX = to.x - from.x;
    var deltaY = to.y - from.y;
    var distance = Math.sqrt(deltaX*deltaX + deltaY*deltaY);

    var rad = Math.atan2(deltaY, deltaX);
    var radExit = rad - 0.25;
    var radEnter = rad + 0.25;

    var offsetMultiplierEnter = 1;
    var offsetMultiplierExit = 1;
    var compact = distance < offset*2 && !streight;

    if (compact) {
      offsetMultiplierEnter = 0.2;
      offsetMultiplierExit = 0.5;
    } else if (streight) {
      offsetMultiplierEnter = 0;
      offsetMultiplierExit = 0.2;
    } else if (distance-40 < offset*2) {
      offsetMultiplierEnter = 0.7;
      offsetMultiplierExit = 0.7;
    }

    var offsetExitX = Math.cos(radExit) * offset * offsetMultiplierExit;
    var offsetExitY = Math.sin(radExit) * offset * offsetMultiplierExit;
    var offsetEnterX = Math.cos(radEnter) * (offset + 20) * offsetMultiplierEnter;
    var offsetEnterY = Math.sin(radEnter) * (offset + 20) * offsetMultiplierEnter;

    var adjustedDeltaX = deltaX-offsetEnterX-offsetExitX;
    var adjustedDeltaY = deltaY-offsetEnterY-offsetExitY;

    var adjustedDistance = Math.sqrt(adjustedDeltaX*adjustedDeltaX+adjustedDeltaY*adjustedDeltaY);
    var bending = (Math.log(adjustedDistance)+20) / adjustedDistance;

    var ctrlPointX = (adjustedDeltaX / 2 + adjustedDeltaY * bending);
    var ctrlPointY = (adjustedDeltaY / 2 - adjustedDeltaX * bending);

    var startX = from.x + offsetExitX;
    var startY = from.y + offsetExitY;
    var ctrlAX = ctrlPointX;
    var ctrlAY = ctrlPointY;
    var ctrlBX = ctrlPointX;
    var ctrlBY = ctrlPointY;
    var endX = adjustedDeltaX;
    var endY = adjustedDeltaY;

    if(compact) {
      var fromX = from.x;
      var fromY = from.y;
      var reflexive = Math.abs(distance) < 1;
      if (reflexive) {
        distance = offset;
        deltaX = -distance*Math.sin(preferredAngle);
        deltaY = distance*Math.cos(preferredAngle);
        fromX -= deltaX/2;
        fromY -= deltaY/2;
      }
      var rotatedDeltaX = deltaY / distance;
      var rotatedDeltaY =  -deltaX / distance;
      var refOffsetX = rotatedDeltaX * offset;
      var refOffsetY = rotatedDeltaY * offset;

      var extraX = deltaX * offset / (distance || 1) / 2;
      var extraY = deltaY * offset / (distance || 1) / 2;

      startX = fromX + refOffsetX;
      startY = fromY + refOffsetY;
      ctrlAX = refOffsetX - extraX;
      ctrlAY = refOffsetY - extraY;
      ctrlBX = refOffsetX + extraX + deltaX;
      ctrlBY = refOffsetY + extraY + deltaY;
      endX = deltaX + rotatedDeltaX * 10;
      endY = deltaY + rotatedDeltaY * 20;
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

    var angle = Math.atan2(curve[7] - cy, curve[6] - cx);
    var extend = Math.PI/4;

    var angleA = angle + extend / 2;
    var angleB = angle - extend / 2;
    var tipX = curve[0] + curve[6] + Math.cos(angle) * length/2;
    var tipY = curve[1] + curve[7] + Math.sin(angle) * length/2;

    return [
      tipX,
      tipY,
      tipX - Math.cos(angleA) * length,
      tipY - Math.sin(angleA) * length,
      tipX - Math.cos(angleB) * length,
      tipY - Math.sin(angleB) * length,
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

    return {
      x: cx + offsetNormX * offset,
      y: cy + offsetNormY * offset,
      align: Math.abs(offsetNormY/offsetNormX) > 3 ? 0 : (offsetNormX >= 0 ? -1:1)
    };
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
  var setupMouseHandler = function(target, pos, hit, dragHandler, zoom, doubleClick) {
    var dragState = {
      mode: null,
      position: {
        x: 0,
        y: 0,
      }
    };

    var mouseOffset = {x:0,y:0};
    var moveListener = function(evtMove) {
      evtMove.preventDefault();
      var cursor = pos(evtMove);
      dragHandler.move(evtMove, cursor, dragState.mode);
      var cursorNew = pos(evtMove);
      mouseOffset.x = cursorNew.x;
      mouseOffset.y = cursorNew.y;
    };

    var releaseListener = function(evtUp) {
      evtUp.preventDefault();

      var mode = dragState.mode;
      var cursor = pos(evtUp);

      dragState.mode = null;

      mouseOffset.x = 0;
      mouseOffset.y = 0;

      document.removeEventListener('mousemove', moveListener);
      document.removeEventListener('mouseup', releaseListener);

      dragHandler.end(evtUp, cursor, mode);
    };

    target.addEventListener('mousedown', function(evtDown) {
      evtDown.preventDefault();

      var cursor = pos(evtDown);
      var dragMode = (dragHandler.start(evtDown, cursor)) || null;
      if(dragMode !== null) {
        dragState.mode = dragMode;

        mouseOffset.x = cursor.x;
        mouseOffset.y = cursor.y;

        document.addEventListener('mouseup', releaseListener);
        document.addEventListener('mousemove', moveListener);

        moveListener(evtDown);
      }
    });

    target.addEventListener('wheel', function(zoomEvt) {
      zoomEvt.preventDefault();

      var cursorNew = pos(zoomEvt);
      var wheel = zoomEvt.deltaY / -40;
      var factor = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1);

      zoom(factor, cursorNew);
    });

    target.addEventListener('dblclick', function(dblClickEvt) {
      dblClickEvt.preventDefault();
      var cursor = pos(dblClickEvt);

      doubleClick && doubleClick(dblClickEvt, cursor);
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
        name: "A",
        pos: {x: -400, y: -100},
        transitions: [
          {target: 1, condition: 0},
          {target: 0, condition: 1}
        ]
      },
      {
        name: "B",
        pos: {x: -100, y: 180},
        transitions: [
          {target: 2, condition: 1},
          {target: 0, condition: 0},
          {target: 1, condition: '?'}
        ]
      },
      {
        name: "C",
        pos: {x: 300, y: -20},
        transitions: [
          {target: 1, condition: 1}
        ]
      },
      {
        name: "D",
        pos: {x: 0, y: -220},
        transitions: [
          {target: 0, condition: 0},
          {target: 2, condition: 1}
        ]
      },
      {
        name: "E",
        pos: {x: 400, y: -220},
        transitions: [
          {target: 4, condition: 1},
          {target: 0, condition: 1},
          {target: 2, condition: 0}
        ]
      }
    ];
  };

  var createDragHandler = function(hitTest, states, createNode, createConnection, connector, render, pan) {
    return {
      start: function(evt, pos) {
        var stateIdx = hitTest(evt, pos);

        if(stateIdx === null) {
          if(evt.metaKey || evt.ctrlKey) {
            var newState = createNode(pos);
            return {
              type: 'move',
              state: newState,
              initialPos: {
                x: pos.x,
                y: pos.y
              },
              offset: {
                x: 0,
                y: 0,
              }
            };
          } else {
            return {
              type: 'pan',
              initialPos: {
                x: pos.x,
                y: pos.y,
              },
            };
          }
        } else if(evt.shiftKey) {
          return {
            type: 'pan',
            initialPos: {
              x: pos.x,
              y: pos.y,
            },
          };
        } else if(evt.altKey) {
          return {
            type: 'connect',
            state: stateIdx,
          };
        } else {
          var state = states[stateIdx];
          return {
            type: 'move',
            state: stateIdx,
            initialPos: {
              x: state.pos.x,
              y: state.pos.y
            },
            offset: {
              x: pos.x - state.pos.x,
              y: pos.y - state.pos.y,
            }
          };
        }

        return null;
      },
      move: function(evt, pos, mode) {
        if(mode.type === 'pan') {
          pan && pan(pos.x - mode.initialPos.x, pos.y - mode.initialPos.y);
        } else if(mode.type === 'move') {
          var state = states[mode.state];
          state.pos.x = pos.x - mode.offset.x;
          state.pos.y = pos.y - mode.offset.y;
        } else if(mode.type === 'connect') {
          connector.pos.x = pos.x;
          connector.pos.y = pos.y;
          connector.source = mode.state;
          connector.target = hitTest(evt, pos);
        }
        render();
      },
      end: function(evt, pos, mode) {
        if(mode.type === 'connect') {
          var target = hitTest(evt, pos);

          if(target !== null) {
            createConnection(mode.state, target);
          }

          connector.pos.x = null;
          connector.pos.y = null;
          connector.source = null;
          connector.target = null;
        }
        render();
      },
    };
  };

  // cam: object which x and y properties should be set
  // render: render function to be called when data changes
  var createPanHandler = function(cam, render, clamp) {
    return function(dx, dy) {
      var clamped = clamp(cam.x - dx, cam.y - dy);
      cam.x = clamped.x;
      cam.y = clamped.y;
      render();
    };
  };

  var calculateBoundingBox = function(states, minWidth, minHeight) {
    minWidth = minWidth || 0;
    minHeight = minHeight || 0;

    var xInterval = states.reduce(function(prev, state) {
      return {
        max: Math.max(prev.max, state.pos.x),
        min: Math.min(prev.min, state.pos.x),
      };
    }, {min: -minWidth/2, max: minWidth/2});

    var yInterval = states.reduce(function(prev, state) {
      return {
        max: Math.max(prev.max, state.pos.y),
        min: Math.min(prev.min, state.pos.y),
      };
    }, {min: -minHeight/2, max: minHeight/2});

    return {
      minX: xInterval.min,
      minY: yInterval.min,
      maxX: xInterval.max,
      maxY: yInterval.max,
    };
  }

  var createDynamicClamper = function(states, minWidth, minHeight) {
    return function(x,y) {
      var box = calculateBoundingBox(states, minWidth, minHeight);

      return {
        x: clamp(x, box.minX, box.maxX),
        y: clamp(y, box.minY, box.maxY),
      };
    }
  }

  var createCamera = function() {
    return {x:0,y:0,zoom:1};
  };

  var createConnector = function() {
    return {
      pos: {x:null,y:null},
      source: null,
      target: null,
    };
  };

  var calculateTransitionPivotAngle = function(states, stateIdx) {
    var state = states[stateIdx];
    var outgoingTrans = state.transitions.filter(function(transition) {
      return transition.target !== stateIdx;
    })
    var avoidAngleOutgoing = outgoingTrans.reduce(function(prev, outgoing) {
      var target = states[outgoing.target];
      return prev + Math.atan2(target.pos.y - state.pos.y, target.pos.x - state.pos.x);
    }, 0) / (outgoingTrans.length||1);

    var incomingTrans = states.filter(function(otherState, idx) {
      return idx !== stateIdx &&
        otherState.transitions.some(function(backTrans) {
        return backTrans.target === stateIdx;
      });
    });

    var avoidAngleOutgoing = outgoingTrans.map(function(outgoing) {
      var target = states[outgoing.target];
      return Math.atan2(target.pos.y - state.pos.y, target.pos.x - state.pos.x);
    }).reduce(function(prev, angle) {
      return {cos: prev.cos + Math.cos(angle), sin: prev.sin + Math.sin(angle)};
    }, {cos: 0, sin: 0});

    var avoidAngleIncoming = incomingTrans.map(function(source) {
      return Math.atan2(source.pos.y - state.pos.y, source.pos.x - state.pos.x);
    }).reduce(function(prev, angle) {
      return {cos: prev.cos + Math.cos(angle), sin: prev.sin + Math.sin(angle)};
    }, {cos: 0, sin: 0});

    var angleSum = Math.atan2(
      avoidAngleOutgoing.sin + avoidAngleIncoming.sin,
      avoidAngleOutgoing.cos + avoidAngleIncoming.cos);

    return angleSum;
  };

  var createZoomHandler = function(cam, render, min, max, panHandler) {
    return function(factor, pos) {
      var oldZoom = cam.zoom;
      var newZoom = clamp(cam.zoom*factor, min, max);

      var moveFactor = 1 - (oldZoom / newZoom);

      cam.zoom = newZoom;
      if (panHandler) {
        panHandler(-(pos.x - cam.x) * moveFactor, -(pos.y - cam.y) * moveFactor);
      } else {
        render();
      }
    };
  };

  var arangeStates = function(states) {
    var count = states.length;

    var stateIds = Array.apply(null, {length: count}).map(Number.call, Number);
    stateIds.sort(function(a,b) {
      var stateA = states[a];
      var stateB = states[b];
      var angleA = Math.atan2(-(stateA.pos.y), -(stateA.pos.x));
      var angleB = Math.atan2(-(stateB.pos.y), -(stateB.pos.x));

      return Math.sign(
        angleB
       -angleA
      );
    });

    var firstState = states[stateIds[0]];
    for(var i=0;i<count;i++) {
      var state = states[stateIds[i]];
      var angle = -Math.PI/count/2 - Math.PI * 2 * i / count;
      state.pos.x = Math.cos(angle) * 300;
      state.pos.y = Math.sin(angle) * 300;
    }
  };

  var requestFrame = window.requestAnimationFrame.bind(window);

  var throttle = (function() {
    var id = null;
    var frame = function(func) {
      id = null;
      func();
    }
    return function(func) {
      if(id !== null) {
        return;
      }
      id = requestFrame(frame.bind(null, func));
    };
  })();

  var makeRenderer = function(renderFunction, sync) {
    return sync ? renderFunction :
      throttle.bind(null, renderFunction);
  };

  var createStateAt = function(pos) {
    return {
      name: "X",
      pos: {x: pos.x, y: pos.y},
      transitions: []
    };
  };

  var makeNodeCreator = function(states) {
    return function(pos) {
      states.push(createStateAt(pos));
      return states.length-1;
    };
  };

  var makeConnectionCreator = function(states) {
    return function(from, to) {
      if(states[from].transitions.some(function(t) {
        return t.target === to;
      })) {
        return;
      }
      states[from].transitions.push({
        target: to,
        condition: 1,
      });
    };
  };

  var removeState = function(states, element) {
    states.splice(element, 1);
    for(var i=0;i<states.length;i++) {
      var state = states[i];
      state.transitions = state.transitions.filter(function(t) {
        return t.target !== element;
      });

      state.transitions.forEach(function(t) {
        if(t.target > element) {
          t.target -= 1;
        }
      })
    }
  }

  window.createDynamicClamper = createDynamicClamper;
  window.removeState = removeState;
  window.makeNodeCreator = makeNodeCreator;
  window.makeConnectionCreator = makeConnectionCreator;
  window.createStateAt = createStateAt;
  window.makeRenderer = makeRenderer;
  window.arangeStates = arangeStates;
  window.createZoomHandler = createZoomHandler;
  window.calculateTransitionPivotAngle = calculateTransitionPivotAngle;
  window.createCamera = createCamera;
  window.createConnector = createConnector;
  window.curveLabelPosition = curveLabelPosition;
  window.createPanHandler = createPanHandler;
  window.createDragHandler = createDragHandler;
  window.loadFSM = loadFSM;
  window.vecDistance = vecDistance;
  window.setupMouseHandler = setupMouseHandler;
  window.clamp = clamp;
  window.curvedConnection = curvedConnection;
  window.cubicString = cubicString;
  window.curveArrowHead = curveArrowHead;
  window.setStageSize = setSize;
  window.appendToSVG = appendTo;
  window.clearSVG = clear;
})(window);
