(function ($) {
  $.fn.moveUp = function() {
    $.each(this, function() {
         $(this).after($(this).prev());   
    });
  };

  $.fn.moveDown = function() {
    $.each(this, function() {
         $(this).before($(this).next());   
    });
  };

  $.fn.conditionsBuilder = function (options) {
    if (options == "data") {
      var builder = $(this).eq(0).data("conditionsBuilder");
      return builder.collectData();
    } else {
      return $(this).each(function () {
        var builder = new ConditionsBuilder(this, options);
        $(this).data("conditionsBuilder", builder);
      });
    }
  };

  function ConditionsBuilder(element, options) {
    this.element = $(element);
    this.options = options || {};
    this.init();
  }

  ConditionsBuilder.prototype = {
    init: function () {
      this.fields = this.options.fields;
      this.data = this.options.data || {
        "all": []
      };
      var rules = this.buildRules(this.data);
      this.element.html(rules);
    },

    collectData: function () {
      return this.collectDataFromNode(this.element.find("> .conditional"));
    },

    collectDataFromNode: function (element) {
      var klass = null;
      var _this = this;
      if (element.is(".conditional")) {
        klass = element.find("> .all-any-none-wrapper > .all-any-none").val();
      }

      if (klass) {
        var out = {};
        out[klass] = [];
        out.name = element.find(".name").val();
        out.error = element.find(".error").val();
        element.find("> .conditional, > .rule").each(function () {
          out[klass].push(_this.collectDataFromNode($(this)));
        });
        return out;
      } else {
        return {
          name: element.find(".field").val(),
          operator: element.find(".operator").val(),
          value: element.find(".value").val(),
          error: element.find(".error").val(),
          meta: element.find(".meta").val(),
        };
      }
    },

    buildRules: function (ruleData) {
      return this.buildConditional(ruleData) || this.buildRule(ruleData);
    },

    buildConditional: function (ruleData) {
      var kind;
      if (ruleData.all) {
        kind = "all";
      } else if (ruleData.any) {
        kind = "any";
      } else if (ruleData.none) {
        kind = "none";
      }
      if (!kind) {
        return;
      }

      var div = $("<div>", {
        "class": "conditional " + kind
      });
      var selectWrapper = $("<div>", {
        "class": "all-any-none-wrapper"
      });
      var select = $("<select>", {
        "class": "all-any-none"
      });
      select.append($("<option>", {
        "value": "all",
        "text": "All",
        "selected": kind == "all"
      }));
      select.append($("<option>", {
        "value": "any",
        "text": "Any",
        "selected": kind == "any"
      }));
      select.append($("<option>", {
        "value": "none",
        "text": "None",
        "selected": kind == "none"
      }));
      selectWrapper.append(select);
      selectWrapper.append($("<span>", {
        text: "rules:"
      }));
      div.append(selectWrapper);

      selectWrapper.append($("<input>", {
        "class": "name",
        "placeholder": "name"
      }));
      div.append(selectWrapper);

      selectWrapper.append($("<textarea>", {
        "class": "error",
        "placeholder": "error"
      }));
      div.append(selectWrapper);

      var addRuleLink = $("<a>", {
        "href": "#",
        "class": "add-rule button",
        "title": "Add Rule",
        "text": "+"
      });
      var _this = this;
      addRuleLink.click(function (e) {
        e.preventDefault();
        var f = _this.fields[0];
        var newField = {
          name: f.value,
          operator: f.operators[0],
          value: null,
          error: null,
          meta: null
        };
        div.append(_this.buildRule(newField));
      });
      div.append(addRuleLink);

      var addConditionLink = $("<a>", {
        "href": "#",
        "class": "add-condition button",
        "title": "Add Sub Condition",
        "text": "+_"
      });
      addConditionLink.click(function (e) {
        e.preventDefault();
        var f = _this.fields[0];
        var newField = {
          "all": [{
            name: f.value,
            operator: f.operators[0],
            value: null,
            error: null,
            meta: null
          }],
          name: null,
          error: null
        };
        div.append(_this.buildConditional(newField));
      });
      div.append(addConditionLink);

      var removeLink = $("<a>", {
        "class": "remove button",
        "href": "#",
        "title": "Remove this Sub Condition",
        "text": "-"
      });
      removeLink.click(function (e) {
        e.preventDefault();
        div.remove();
      });
      div.append(removeLink);

      var moveUpLink = $("<a>", {
        "class": "moveUp button",
        "href": "#",
        "text": "↑",
        "title": "Move Up"
      });
      moveUpLink.click(function(e) {
      e.preventDefault();
      var cl = div.prev().attr('class');
      if (cl === "rule")
        div.moveUp();
      });
      div.append(moveUpLink);
      
      var moveDownLink = $("<a>", {
        "class": "moveDown button",
        "href": "#",
        "text": "↓",
        "title": "Move Down"
      });
      moveDownLink.click(function(e) {
      e.preventDefault();
      var cl = div.next().attr('class');
      if (cl === "rule")
        div.moveDown();
      });
      div.append(moveDownLink);

      var rules = ruleData[kind];
      for (var i = 0; i < rules.length; i++) {
        div.append(this.buildRules(rules[i]));
      }

      if (ruleData.error) div.find("> .error").val(ruleData.error);
      if (ruleData.name) div.find("> .name").val(ruleData.name);

      return div;
    },

    buildRule: function (ruleData) {
      var ruleDiv = $("<div>", {
        "class": "rule"
      });
      var fieldSelect = getFieldSelect(this.fields, ruleData);
      var ruleMeta = getruleMeta();
      var ruleError = getruleError();
      var operatorSelect = getOperatorSelect();

      fieldSelect.change(onFieldSelectChanged.call(this, operatorSelect, ruleData));

      ruleDiv.append(fieldSelect);
      ruleDiv.append(operatorSelect);
      ruleDiv.append(ruleMeta);
      ruleDiv.append(ruleError);
      ruleDiv.append(removeLink());
      ruleDiv.append(moveUpLink());
      ruleDiv.append(moveDownLink());

      fieldSelect.change();
      ruleDiv.find("> .value").val(ruleData.value);
      if (ruleData.error) ruleDiv.find("> .error").val(ruleData.error);
      if (ruleData.meta) ruleDiv.find("> .meta").val(ruleData.meta);
      return ruleDiv;
    },

    operatorsFor: function (fieldName) {
      for (var i = 0; i < this.fields.length; i++) {
        var field = this.fields[i];
        if (field.name == fieldName) {
          return field.operators;
        }
      }
    }
  };

  function getruleError() {
    var error = $("<textarea>", {
      "class": "error",
      "placeholder": "error"
    });
    return error;
  }

  function getruleMeta() {
    var meta = $("<input>", {
      "class": "meta",
      "placeholder": "meta"
    });
    return meta;
  }

  function getFieldSelect(fields, ruleData) {
    var select = $("<select>", {
      "class": "field"
    });
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var option = $("<option>", {
        text: field.label,
        value: field.name,
        selected: ruleData.name == field.name
      });
      option.data("options", field.options);
      select.append(option);
    }
    return select;
  }

  function getOperatorSelect() {
    var select = $("<select>", {
      "class": "operator"
    });
    select.change(onOperatorSelectChange);
    return select;
  }

  function removeLink() {
    var removeLink = $("<a>", {
      "class": "remove button",
      "href": "#",
      "text": "-",
      "title": "Remove"
    });
    removeLink.click(onRemoveLinkClicked);
    return removeLink;
  }

  function onRemoveLinkClicked(e) {
    e.preventDefault();
    $(this).parents(".rule").remove();
  }

  function moveUpLink() {
    var moveUpLink = $("<a>", {
      "class": "moveUp button",
      "href": "#",
      "text": "↑",
      "title": "Move Up"
    });
    moveUpLink.click(onMoveUpLinkClicked);
    return moveUpLink;
  }

  function onMoveUpLinkClicked(e) {
    e.preventDefault();
    var cl = $(this).parents(".rule").prev().attr('class');
    if (cl === "rule")
      $(this).parents(".rule").moveUp();
  }

  function moveDownLink() {
    var moveDownLink = $("<a>", {
      "class": "moveDown button",
      "href": "#",
      "text": "↓",
      "title": "Move Down"
    });
    moveDownLink.click(onMoveDownLinkClicked);
    return moveDownLink;
  }

  function onMoveDownLinkClicked(e) {
    e.preventDefault();
    var cl = $(this).parents(".rule").next().attr('class');
    if (cl === "rule")
      $(this).parents(".rule").moveDown();
  }

  function onFieldSelectChanged(operatorSelect, ruleData) {
    var builder = this;
    return function (e) {
      var operators = builder.operatorsFor($(e.target).val());
      operatorSelect.empty();
      for (var i = 0; i < operators.length; i++) {
        var operator = operators[i];
        var option = $("<option>", {
          text: operator.label || operator.name,
          value: operator.name,
          selected: ruleData.operator == operator.name
        });
        option.data("fieldType", operator.fieldType);
        operatorSelect.append(option);
      }
      operatorSelect.change();
    }
  }

  function onOperatorSelectChange(e) {
    var $this = $(this);
    var option = $this.find("> :selected");
    var container = $this.parents(".rule");
    var fieldSelect = container.find(".field");
    var currentValue = container.find(".value");
    var val = currentValue.val();

    switch (option.data("fieldType")) {
    case "none":
      $this.after($("<input>", {
        "type": "hidden",
        "class": "value"
      }));
      break;
    case "text":
      $this.after($("<input>", {
        "type": "text",
        "class": "value"
      }));
      break;
    case "textarea":
      $this.after($("<textarea>", {
        "class": "value"
      }));
    case "select":
      var select = $("<select>", {
        "class": "value"
      });
      var options = fieldSelect.find("> :selected").data("options");
      for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        select.append($("<option>", {
          "text": opt.label || opt.name,
          "value": opt.name
        }));
      }
      $this.after(select);
      break;
    }
    currentValue.remove();
  }

})(jQuery);
