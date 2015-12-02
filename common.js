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


  window.setStageSize = setSize;
  window.appendToSVG = appendTo;
  window.clearSVG = clear;
})(window);
