var editor = (function($, jsPlumb) {
  var jsp; // jsPlumbInstance

  // Default node properties
  var nodeDefaults = {
    label: "New Node",
    width: 120,
    height: 80
  };

  var Node = function(label, width, height) {
    this.label = label || this.defaults.label;
    this.width = width || this.defaults.width;
    this.height = height || this.defaults.height;
  };
  Node.prototype.defaults = nodeDefaults;
  Node.prototype.createElement = function() {
    var node = $("<div/>").addClass("node");
    $("<p></p>").text(this.label).addClass("label").appendTo(node);

    node.attr({
      "data-width": this.width,
      "data-height": this.height
    });

    node.css({
      "width": this.width,
      "height": this.height,
    });

    node.nodeObject = this;

    return node;
  };

  // append new node to graph
  var addNode = function(e) {
    var node = new Node().createElement();

    // set correct position within the graph
    node.css({
      "left": e.pageX - this.offsetLeft - (node.nodeObject.width / 2),
      "top": e.pageY - this.offsetTop - (node.nodeObject.height / 2)
    });

    // append node to graph
    $(this).append(node);

    // properly handle click and drag events
    (function(node) {
      var isDragEvent = false;
      node.addEventListener("mousedown", function(evt) {
        // TODO check the node object for selected attr instead of hasClass
        if (isDragEvent || $(this).hasClass("selected")) {
          isDragEvent = false;
          return;
        }
        evt.stopImmediatePropagation();
        $(this).on("mouseup mouseleave", function handler(e) {
          if (e.type == "mouseup") {
            // click
            selectNode.call(this);
          } else {
            // drag
            isDragEvent = true;
            var msdwn = new MouseEvent("mousedown", {
              clientX: e.clientX,
              clientY: e.clientY
            });
            this.dispatchEvent(msdwn);
          }
          $(this).off("mouseup mouseleave", handler)
        });
      }, true); // use capture
    })(node.get(0));

    jsp.draggable(node, {
      containment: true,
      filter: ".ui-resizable-handle"
      });
    jsp.setDraggable(node, false);

    jsp.makeSource(node, {
      anchor: "Continuous",
      connector: ["StateMachine", {
        curviness: 0,
        proximityLimit: 260 }],
    })
    jsp.makeTarget(node, {
      dropOptions: { hoverClass: "dragHover" },
      anchor: "Continuous",
      allowLoopback: true
    });
  };
  var selectNode = function() {
    deselectAll();
    var $this = $(this);
    $this.addClass("selected");
    $this.resizable({
      resize: function(e, ui) {
        jsp.revalidate(ui.element.get(0));
      }
    });
    jsp.setDraggable($this, true);
    jsp.setSourceEnabled($this, false);

    return false; // don't propagate - otherwise addNode is called
  };
  var deselectAll = function() {
    var selected = $(".node.selected");
    if (selected.length > 0) {
      jsp.setDraggable(selected, false);
      jsp.setSourceEnabled(selected, true);
      selected.removeClass("selected");
      selected.resizable("destroy");
    }
  };

  var init = function(jsPlumbInstance) {
    jsp = jsPlumbInstance;

    $("div#container")
      .on("dblclick", addNode)    // add new nodes on double click
      .on("click", function(e) {  // clear selected nodes on click
        // only when clicked directly on the container
        if (e.target === this) deselectAll();
      });
  }

  return {
    init: init
  }
})(jQuery, jsPlumb)

jsPlumb.ready(function() {
  var jsp = jsPlumb.getInstance({
    Container: "container",
    Endpoint: ["Dot", {radius: 2}],
    HoverPaintStyle: {strokeStyle: "#1e8151", lineWidth: 3 },
    PaintStyle: {strokeStyle: "#000000", lineWidth: 1 },
    ConnectionOverlays: [
        [ "Arrow", {
            location: 1,
            id: "arrow",
            length: 12,
            foldback: 0.1
        } ],
        [ "Label", { label: "Label", id: "label", cssClass: "edgeLabel" }]
    ],
  });

  // dbg: export jsp instance
  window.jsp = jsp;

  editor.init(jsp);
});