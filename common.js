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
    var radExit = rad * (1 + 0.1*Math.sin(rad));
    var radEnter = rad * (1 - 0.1*Math.sin(rad));

    var offsetExitX = Math.sin(radExit) * offset;
    var offsetExitY = Math.cos(radExit) * offset;
    var offsetEnterX = Math.sin(radEnter) * offset;
    var offsetEnterY = Math.cos(radEnter) * offset;

    var adjustedDeltaX = deltaX-offsetEnterX-offsetExitX;
    var adjustedDeltaY = deltaY-offsetEnterY-offsetExitY;

    return [
      from.x+offsetExitX, from.y+offsetExitY,
      (adjustedDeltaX/2+deltaY/8), (adjustedDeltaY/2-deltaX/8),
      adjustedDeltaX, adjustedDeltaY
    ];
  };

  var quadraticString = function(startX, startY, ctrlX, ctrlY, endX, endY) {
    return [
      "M",
      [startX, startY].join(','),
      "q",
      [ctrlX, ctrlY].join(','),
      [endX, endY].join(','),
    ].join(' ');
  };


  window.curvedConnection = curvedConnection;
  window.quadraticString = quadraticString;
  window.setStageSize = setSize;
  window.appendToSVG = appendTo;
  window.clearSVG = clear;
})(window);
