(function(window) {
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

  var clear = function(node){
    while (node.lastChild) node.removeChild(node.lastChild);
  }

  var curvedConnection = function(from, to, offset) {
    var deltaX = to.x - from.x;
    var deltaY = to.y - from.y;

    var rad = Math.atan2(deltaX, deltaY);
    var radExit = rad * (1 + 0.2*Math.sin(rad));
    var radEnter = rad * (1 - 0.2*Math.sin(rad));

    var offsetExitX = Math.sin(radExit) * offset;
    var offsetExitY = Math.cos(radExit) * offset;
    var offsetEnterX = Math.sin(radEnter) * (offset + 20);
    var offsetEnterY = Math.cos(radEnter) * (offset + 20);

    var adjustedDeltaX = deltaX-offsetEnterX-offsetExitX;
    var adjustedDeltaY = deltaY-offsetEnterY-offsetExitY;

    var distance = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
    var bending = distance/(8000);


    return [
      from.x+offsetExitX, from.y+offsetExitY,
      (adjustedDeltaX/2+deltaY*bending), (adjustedDeltaY/2-deltaX*bending),
      adjustedDeltaX, adjustedDeltaY
    ];
  };

  var interpQuadratric = function(t, s, c, e) {
    var tInv = (1 - t);
    return tInv * tInv * s + 2 * tInv * t * c + t * t * e;
  }

  var curveArrowHead = function(curve, length) {

    var totalLength = Math.sqrt(curve[4]*curve[4] + curve[5]*curve[5]);

    if(totalLength < length * 1.3*1.3) {
      length /= 1.3;
    }


    var cx = interpQuadratric(0.8, 0, curve[2], curve[4]);
    var cy = interpQuadratric(0.8, 0, curve[3], curve[5]);

    var angle = Math.atan2(curve[4] - cx, curve[5] - cy);
    var extend = Math.PI/4;

    var angleA = angle + extend / 2;
    var angleB = angle - extend / 2;
    var tipX = curve[0] + curve[4] + Math.sin(angle) * length/2;
    var tipY = curve[1] + curve[5] + Math.cos(angle) * length/2;

    return [
      tipX,
      tipY,
      tipX - Math.sin(angleA) * length,
      tipY - Math.cos(angleA) * length,
      tipX - Math.sin(angleB) * length,
      tipY - Math.cos(angleB) * length,
    ];
  }

  var quadraticString = function(startX, startY, ctrlX, ctrlY, endX, endY) {
    return [
      "M",
      [startX, startY].join(','),
      "q",
      [ctrlX, ctrlY].join(','),
      [endX, endY].join(','),
    ].join(' ');
  };


  var clamp = function(v, min, max) {
    return Math.min(Math.max(min, v), max);
  };

  window.clamp = clamp;
  window.curvedConnection = curvedConnection;
  window.quadraticString = quadraticString;
  window.curveArrowHead = curveArrowHead;
  window.setStageSize = setSize;
  window.appendToSVG = appendTo;
  window.clearSVG = clear;
})(window);
