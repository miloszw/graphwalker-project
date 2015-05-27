var editor = (function($, jsPlumb) {
  var jsp; // jsPlumbInstance

  // ====================  EXTEND jQUERY ==================== //
  $.fn.hasFocus = function() {
    return this.get(0) === document.activeElement;
  }

  // ====================   VERTICE OPS  ==================== //

  // Default vertice properties
  var verticeDefaults = {
    label: "New Vertice",
    width: 120,
    height: 80
  };

  var Vertice = function(label, width, height) {
    this.label = label || this.defaults.label;
    this.width = width || this.defaults.width;
    this.height = height || this.defaults.height;
  };
  Vertice.prototype.defaults = verticeDefaults;
  Vertice.prototype.createElement = function() {
    var vertice = $("<div/>").addClass("vertice").attr("tabindex","0");
    var label = $("<p/>").text(this.label).addClass("label");
    $("<div/>").addClass("label-div").append(label).appendTo(vertice);

    vertice.attr({
      "data-width": this.width,
      "data-height": this.height
    });

    vertice.css({
      "width": this.width,
      "height": this.height,
    });

    vertice.verticeObject = this;

    return vertice;
  };

  // append new vertice to graph
  var addVertice = function(e) {
    var vertice = new Vertice().createElement();

    // set correct position within the graph
    vertice.css({
      "left": e.pageX - this.offsetLeft - (vertice.verticeObject.width / 2),
      "top": e.pageY - this.offsetTop - (vertice.verticeObject.height / 2)
    });

    // append vertice to graph
    $(this).append(vertice);

    var oldValue;
    vertice.find(".label")
      .on("mousedown", function(e) {
        e.stopPropagation();
      })
      .on("dblclick", function(e) {
        if ($(this).attr("contenteditable") == true) return;
        $("#container").toggleClass("noselect");
        $(this).attr("contenteditable","true");
        // stash away old value in order to be able to
        // restore it if user presses escape
        var range = document.createRange(),
            sel = window.getSelection();
        range.selectNodeContents(this);
        sel.removeAllRanges();
        sel.addRange(range);
        oldValue = sel.getRangeAt(0).startContainer.textContent;
      })
      .on("keydown blur", function(e) {
        // on enter key press or blur
        switch(e.which) {
          case 27:  // escape
            $(this).text(oldValue);
          case 13:  // enter
            this.blur();
            break;
          case 0:   // blur
            $(this).attr("contenteditable","false");
            $("#container").toggleClass("noselect");
          default:
            // prevent keypresses bubbling to div (eg. prevent remove on del/bksp)
            e.stopPropagation();
        }
      });


    // properly handle click and drag events
    (function(vertice) {
      var isDragEvent = false;
      vertice.on("mousedown", function(evt) {
        evt.preventDefault(); // don't set focus yet
        if (isDragEvent || $(this).hasFocus()) {
          isDragEvent = false;
          return;
        }
        evt.stopImmediatePropagation();
        $(this).on("mouseup mouseleave", function handler(e) {
          if (e.type == "mouseup") {
            // click
            this.focus();
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
      });
    })(vertice);

    vertice
      .on("focus", function(e) {
        selectVertice.call(this);
      })
      .on("blur", function(e) {
        deselectVertice.call(this);
      })
      .on("keydown", function(e) {
        // remove vertice by pressing backspace or delete
        if (e.which === 8 || e.which === 46) jsp.remove(this);
      });

    jsp.draggable(vertice, {
      containment: true,
      filter: ".ui-resizable-handle"
      });
    jsp.setDraggable(vertice, false);

    jsp.makeSource(vertice, {
      anchor: "Continuous",
      connector: ["StateMachine", {
        curviness: 0,
        proximityLimit: 260 }],
    })
    jsp.makeTarget(vertice, {
      dropOptions: { hoverClass: "drag-hover" },
      anchor: "Continuous",
      allowLoopback: true
    });
  };
  var selectVertice = function() {
    $(this).resizable({
      resize: function(e, ui) {
        jsp.revalidate(ui.element.get(0));
      }
    });
    jsp.setDraggable(this, true);
    jsp.setSourceEnabled(this, false);
  };
  var deselectVertice = function() {
    jsp.setDraggable(this, false);
    jsp.setSourceEnabled(this, true);
    $(this).resizable("destroy");
  };


  // ====================  INIT ==================== //
  var init = function(jsPlumbInstance) {
    jsp = jsPlumbInstance;

    $("div#container")
      // add new vertices on double click
      .on("dblclick", function(e) {
        if (e.target === this) addVertice.call(this, e);
      })
      .addClass("noselect");
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
        [ "Label", { label: "Label", id: "label", cssClass: "edge-label" }]
    ],
  });

  // dbg: export jsp instance
  window.jsp = jsp;

  editor.init(jsp);
});
