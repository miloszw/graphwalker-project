var editor = (function($, jsPlumb) {
  var jsp; // jsPlumbInstance

  // ====================  EXTEND jQUERY ==================== //
  $.fn.hasFocus = function() {
    return this.get(0) === document.activeElement;
  }

  $.fn.setEditLabelHandler = function() {
    this.each(function() {
      editLabel.attachHandlerOn(this);
    })
  }

  // ====================  VERTICE OPS  ===================== //

  // Default vertex properties
  var vertexDefaults = {
    label: "New Vertex",
    width: 120,
    height: 80
  };

  var Vertex = function(label, width, height) {
    this.label = label || this.defaults.label;
    this.width = width || this.defaults.width;
    this.height = height || this.defaults.height;
  };
  Vertex.prototype.defaults = vertexDefaults;
  Vertex.prototype.createElement = function() {
    var vertex = $("<div/>").addClass("vertex").attr("tabindex","0");
    var label = $("<p/>").text(this.label).addClass("label");
    $("<div/>").addClass("label-div").append(label).appendTo(vertex);

    vertex.attr({
      "data-width": this.width,
      "data-height": this.height
    });

    vertex.css({
      "width": this.width,
      "height": this.height,
    });

    vertex.vertexObject = this;

    return vertex;
  };

  // append new vertex to graph
  var addVertex = function(mouseEvent) {
    var vertex = new Vertex().createElement();

    // set correct position within the graph
    vertex.css({
      "left": mouseEvent.pageX - this.offsetLeft - (vertex.vertexObject.width / 2),
      "top": mouseEvent.pageY - this.offsetTop - (vertex.vertexObject.height / 2)
    });

    // append vertex to graph
    $(this).append(vertex);

    // set label edit handler
    vertex.find(".label").setEditLabelHandler();

    // properly handle click and drag events
    (function(vertex) {
      var isDragEvent = false;
      vertex.on("mousedown", function(evt) {
        evt.preventDefault(); // don't set focus yet
        if (isDragEvent || $(this).hasClass("vertex-selected")) {
          isDragEvent = false;
          return;
        }
        evt.stopImmediatePropagation();
        $(this).on("mouseup mouseleave", function handler(e) {
          if (e.type == "mouseup") { // click
            // if clicked when holding down meta key add vertex to
            // current selection, otherwise simply set focus
            var selection = e.metaKey ? $(".vertex-selected").add(this) : this;
            selectVertex(selection);
          } else { // drag
            isDragEvent = true;
            var msdwn = new MouseEvent("mousedown", {
              clientX: e.clientX,
              clientY: e.clientY
            });
            this.dispatchEvent(msdwn);
          }
          $(this).off("mouseup mouseleave", handler)
        });
      });
    })(vertex);

    vertex
      .on("focus", selectVertex)
      .on("keydown", function(e) {
        var selected = $(".vertex-selected");
        if (e.which === 8 || e.which === 46) {
          // remove all selected vertices by pressing backspace or delete
          jsp.remove(selected);
        } else if (e.which === 13 && selected.length == 1) {
          // enter label editing mode on enter press
          e.preventDefault();
          editLabel.handler.call($(this).find(".label").get(0));
        };
      });

    jsp.draggable(vertex, {
      containment: true,
      filter: ".ui-resizable-handle"
      });
    jsp.setDraggable(vertex, false);

    jsp.makeSource(vertex, {
      anchor: "Continuous",
      connector: ["StateMachine", {
        curviness: 0,
        proximityLimit: 260 }],
    })
    jsp.makeTarget(vertex, {
      dropOptions: { hoverClass: "drag-hover" },
      anchor: "Continuous",
      allowLoopback: true
    });
  };
  var selectVertex = function(vertex) {
    // If called inline from an event handler first argument will be an
    // event object and the vertex will be the caller (this).
    if (vertex.target) vertex = this;
    // assert vertex is a jQuery object
    if (!(vertex instanceof jQuery)) vertex = $(vertex);
    // prevent infinite call loop triggered by focus listener
    if (vertex.length == 1 && vertex.hasClass("vertex-selected")) return;
    // if (vertex.hasClass("vertex-selected")) return;
    // first deselect all and remove resize handler in case
    deselectVertex($(".vertex-selected"));
    vertex.toggleClass("vertex-selected");
    jsp.setDraggable(vertex, true);
    jsp.setSourceEnabled(vertex, false);
    if (vertex.length > 1) {
      jsp.addToDragSelection(vertex);
    } else {
      vertex.focus();
      vertex.resizable({
        resize: function(e, ui) {
          jsp.revalidate(ui.element.get(0));
        }
      });
    }
  };
  var deselectVertex = function(vertex) {
    // If called inline from an event handler first argument will be an
    // event object and the vertex will be the caller (this).
    if (vertex.target) vertex = this;
    // assert vertex is a jQuery object
    if (!(vertex instanceof jQuery)) vertex = $(vertex);
    // if no vertices are selected do nothing
    if (vertex.length == 0 || !vertex.hasClass("vertex-selected")) return;
    vertex.toggleClass("vertex-selected");
    jsp.clearDragSelection();
    jsp.setDraggable(vertex, false);
    jsp.setSourceEnabled(vertex, true);
    if (vertex.length == 1) vertex.resizable("destroy");
  };

  var editLabel = (function() {
    var oldValue;
    return {
      handler: function() {
        // If the element already is editable do nothing. This event might
        // fire when user tries to select a word in the label by dblclick.
        if ($(this).attr("contenteditable") === "true") {
          return;
        };
        // Disable noselect class and enable editing the element
        $("#container").toggleClass("noselect");
        $(this).attr("contenteditable","true");
        // Stash away old value in order to be able to restore it if user
        // presses escape, and preselect all text on focus.
        var range = document.createRange(),
            sel = window.getSelection();
        range.selectNodeContents(this);
        sel.removeAllRanges();
        sel.addRange(range);
        oldValue = sel.getRangeAt(0).startContainer.textContent;
      },
      attachHandlerOn: function(el) {
        $(el).on("mousedown", function(e) {
          // Keep focus on clicks to allow normal mouse interaction with
          // the text selection by preventing the event from bubbling
          e.stopPropagation();
        })
        .on("dblclick", this.handler)
        .on("keydown blur", function(e) {
          // Turn off editing mode on escape, enter or mouseclick outside
          switch(e.which) {
            case 27:  // escape
              // Discard changes and restore old value
              $(this).text(oldValue);
            case 13:  // enter
              // Remove focus from element -- will call handler again
              // due to the break statement preventing fallthrough
              this.blur();
              break;
            case 0:   // blur
              // Disable editing mode
              $(this).attr("contenteditable","false");
              $("#container").toggleClass("noselect");
              // return focus to parent vertex
              $(this).parents(".vertex").focus();
          }
          // Prevent keypresses bubbling to div (eg. prevent remove on del/bksp)
          e.stopPropagation();
        });
      }
    };
  })();

  // ====================  INIT ==================== //
  var init = function(jsPlumbInstance) {
    jsp = jsPlumbInstance;

    $("div#container")
      // Add new vertices on double click
      .on("dblclick", function(e) {
        if (e.target === this) addVertex(e);
      })
      // Deselect vertices on click
      .on("click", function(e) {
        var selectedVertices = $(".vertex-selected");
        if (e.target === this && selectedVertices.length > 0) {
          deselectVertex(selectedVertices);
        }
      })
      // Disable text selection to prevent vertex labels
      // getting highlighted when creating new vertices
      .addClass("noselect");

    // Bind the target DOM of addVertex
    addVertex = addVertex.bind($("#container").get(0));

    // on new connection
    jsp.bind("connection", function(info) {
      var label = info.connection.getOverlay("label").getElement();
      editLabel.attachHandlerOn(label);
    });

    // Fix setDraggable not handling arrays of
    // elements correctly (see jsPlumb #383)
    jsp._setDraggable = jsp.setDraggable;
    jsp.setDraggable = function(elems, draggable) {
      if (!(elems instanceof jQuery)) elems = [elems];
      $.each(elems, function(_, el) {
        jsp._setDraggable(el, draggable);
      });
    }

    // Extend jsPlumb.remove to handle multiple elements
    jsp._remove = jsp.remove;
    jsp.remove = function(elems) {
      if (!(elems instanceof jQuery)) elems = [elems];
      $.each(elems, function(_, el) {
        jsp._remove(el);
      });
    }
  };

  return {
    init: init
  };
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
        [ "Label", { label: "Label", id: "label", cssClass: "edge-label" }]
    ],
  });

  // dbg: export jsp instance
  window.jsp = jsp;

  editor.init(jsp);
});
