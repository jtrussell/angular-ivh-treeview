
/**
 * The iVantage Treeview module
 *
 * @package ivh.treeview
 */

angular.module('ivh.treeview', []);


/**
 * Selection management logic for treeviews with checkboxes
 *
 * @private
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewCheckbox', ['$timeout', function($timeout) {
  'use strict';
  return {
    link: function(scope, element, attrs) {
      var itm = scope.$eval(attrs.ivhTreeviewCheckbox)
        , indeterminateAttr = attrs.ivhTreeviewIndeterminateAttribute;

      element.bind('change', function() {
        scope.$broadcast('event_ivhTreeviewSelectAll', element.prop('checked'));
        $timeout(function() {
          scope.$parent.$emit('event_ivhTreeviewValidate');
        });
      });
      
      /**
       * Checkbox click handler
       *
       * Note that this fires *after* the change event
       */
      element.bind('click', function(event) {
        var isIndeterminate = itm[indeterminateAttr];
        if(isIndeterminate) {
          element.prop('checked', false);
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      });
      
      var validateCb = function() {
        $timeout(function() {
          var isIndeterminate = itm.__ivhTreeviewIntermediate;
          element.prop('indeterminate', isIndeterminate);
        });
      };

      var makeDeterminate = function() {
        element.prop('indeterminate', false);
      };

      scope.$on('event_ivhTreeviewValidate', validateCb);
      scope.$on('event_ivhTreeviewSelectAll', makeDeterminate);
    }
  };
}]);


/**
 * Treeview tree node directive
 *
 * Handles filtering.
 *
 * @private
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewNode', ['$compile', function($compile) {
  'use strict';
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var nodeAttr = attrs.ivhTreeviewNode
        , filterAttr = attrs.ivhTreeviewFilter
        , visibleAttr = attrs.ivhTreeviewNodeVisibleAttribute
        , node = scope.$eval(attrs.ivhTreeviewNode);

      // Nothing to do if we don't have a filter
      if(!filterAttr || filterAttr === 'undefined') {
        node[visibleAttr] = true;
        return;
      }
      
      var map = Array.prototype.map || function(fn) {
        var mapped = [];
        angular.forEach(this, function(item) {
          mapped.push(fn(item));
        });
        return mapped;
      };
      
      var filters = map.call(filterAttr.split('|'), function(filterStr) {
        var parts = filterStr.split(':');
        return parts;
      });
      
      var filterVars = [];
      angular.forEach(filters, function(f) {
        Array.prototype.push.apply(filterVars, f.slice(1));
      });
      
      var filterString = '[' + nodeAttr + '] | ' + filterAttr;
      var applyFilters = function() {
        var filtered = scope.$eval(filterString);
        node[visibleAttr] = filtered.length > 0;
      };
      
      angular.forEach(filterVars, function(f) {
        scope.$watch(f, applyFilters);
      });
    }
  };
}]);


/**
 * Toggle logic for treeview nodes
 *
 * Handles expand/collapse on click. Does nothing for leaf nodes.
 *
 * @private
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeviewNodeToggle', ['$timeout', function($timeout) {
  'use strict';
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var canToggle = scope.$eval(attrs.ivhTreeviewNodeToggle);

      var $li = element.parent();

      while($li && $li.prop('nodeName') !== 'LI') {
        $li = $li.parent();
      }

      element.bind('click', function() {
        if(!$li.hasClass('ivh-treeview-node-leaf')) {
          $li.toggleClass('ivh-treeview-node-collapsed');
        }
      });
    }
  };
}]);


/**
 * The `ivh-treeview` directive
 *
 * A filterable tree view with checkbox support.
 *
 * Example:
 *
 * ```
 * <div
 *   ivh-treeview="myHierarchicalData">
 *   ivh-treeview-filter="filter:myFilterText | filter:myOtherFilterText">
 * </div>
 * ```
 *
 * @package <package-name>
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').directive('ivhTreeview', ['$compile', 'ivhTreeviewSettings', function($compile, ivhTreeviewSettings) {
  'use strict';
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      var settings = ivhTreeviewSettings.get()
        , ivhTreeviewAttr = attrs.ivhTreeview
        , filterAttr = attrs.ivhTreeviewFilter
        , labelAttr = scope.$eval(attrs.ivhTreeviewLabelAttribute) || settings.labelAttribute
        , childrenAttr = scope.$eval(attrs.ivhTreeviewChildrenAttribute) || settings.childrenAttribute
        , selectedAttr = scope.$eval(attrs.ivhTreeviewSelectedAttribute) || settings.selectedAttribute
        , indeterminateAttr = attrs.ivhTreeviewIndeterminateAttribute || settings.indeterminateAttribute
        , visibleAttr = attrs.ivhTreeviewVisibleAttribute || settings.visibleAttribute
        , useCheckboxes = angular.isDefined(attrs.ivhTreeviewUseCheckboxes) ? scope.$eval(attrs.ivhTreeviewUseCheckboxes) : settings.useCheckboxes;

      var getTreeview = function() {
        return scope.$eval(ivhTreeviewAttr);
      };

      var getParent = function() {
        return scope.$eval(attrs.ivhTreeviewParent);
      };

      var tplCheckbox = [
        '<input',
          'ivh-treeview-checkbox="itm"',
          'ivh-treeview-indeterminate-attribute="' + indeterminateAttr + ']"',
          'class="ivh-treeview-checkbox"',
          'type="checkbox"',
          'ng-model="itm[\'' + selectedAttr + '\']" />',
      ].join('\n');

      var tpl = [
        '<ul class="ivh-treeview">',
          '<li ng-repeat="itm in ' + ivhTreeviewAttr + '"',
              /**
               * @todo check settings.expandByDefaultDepth
               */
              'ng-class="{\'ivh-treeview-node-leaf\': !itm[\''+childrenAttr+'\'].length, \'ivh-treeview-node-collapsed\': itm[\''+childrenAttr+'\'].length}"',
              'ivh-treeview-node="itm"',
              'ivh-treeview-node-visible-attribute="' + visibleAttr + '"',
              'ivh-treeview-node-hook="itm"', // Hook for external use
              'ivh-treeview-filter="' + filterAttr + '"',
              'ng-show="itm.' + visibleAttr + '">',
            '<div ivh-treeview-node-hook class="ivh-treeview-node">',
              '<span ivh-treeview-node-toggle class="ivh-treeview-toggle ivh-treeview-toggle-right glyphicon glyphicon-chevron-right"></span>',
              '<span ivh-treeview-node-toggle class="ivh-treeview-toggle ivh-treeview-toggle-down glyphicon glyphicon-chevron-down"></span>',
              '<span class="ivh-treeview-toggle ivh-treeview-toggle-leaf">&#9679;</span>',
              useCheckboxes ? tplCheckbox : '',
              '<span ivh-treeview-node-toggle="true" class="ivh-treeview-node-label">',
                '{{itm.' + labelAttr + '}}',
              '</span>',
            '</div>',
            '<div',
              'ivh-treeview="itm[\'' + childrenAttr + '\']"',
              'ivh-treeview-parent="itm"',
              filterAttr ? 'ivh-treeview-filter="' + filterAttr + '"' : '',
              'ivh-treeview-label-attribute="' + labelAttr + '"',
              'ivh-treeview-children-attribute="' + childrenAttr + '"',
              'ivh-treeview-selected-attribute="' + selectedAttr + '"',
              'ivh-treeview-visible-attribute="' + visibleAttr + '"',
              'ivh-treeview-use-checkboxes="' + useCheckboxes + '"',
              '></div>',
          '</li>',
        '</ul>'
      ].join('\n');


      var link = function() {
        var ivhTreeview = getTreeview();
        if(ivhTreeview && ivhTreeview.length) {
          var $el = $compile(tpl)(scope);
          element.html('').append($el);
        }
      };

      scope.$watch(attrs.ivhTreeview, link);

      scope.$on('event_ivhTreeviewSelectAll', function(event, isSelected) {
        var ivhTreeview = getTreeview()
          , parent = getParent();

        angular.forEach(getTreeview(), function(node) {
          node[selectedAttr] = isSelected;
          node[indeterminateAttr] = false;
        });

        if(parent) {
          parent[selectedAttr] = isSelected;
          parent[indeterminateAttr] = false;
        }
      });

      scope.$on('event_ivhTreeviewValidate', function() {
        var ivhTreeview = getTreeview()
          , parent = getParent()
          , numNodes = ivhTreeview.length
          , numSelected = 0
          , numIndeterminate = 0;

        if(!ivhTreeview || !ivhTreeview.length || !parent) {
          return;
        }

        angular.forEach(ivhTreeview, function(node) {
          if(node[selectedAttr]) { numSelected++; }
          if(node[indeterminateAttr]) { numIndeterminate++; }
        });

        if(0 === numSelected) {
          parent[selectedAttr] = false;
          parent[indeterminateAttr] = !!numIndeterminate;
        } else if(numSelected === numNodes) {
          parent[selectedAttr] = true;
          parent[indeterminateAttr] = false;
        } else {
          parent[selectedAttr] = false;
          parent[indeterminateAttr] = true;
        }

      });
    }
  };
}]);



/**
 * Configurable settings for `ivh-treeview`
 *
 * @package ivh.treeview
 * @copyright 2014 iVantage Health Analytics, Inc.
 */

angular.module('ivh.treeview').provider('ivhTreeviewSettings', function() {
  'use strict';
  var settings = {
    /**
     * Collection item attribute to use for labels
     */
    labelAttribute: 'label',

    /**
     * Collection item attribute to use for child nodes
     */
    childrenAttribute: 'children',

    /**
     * Collection item attribute to use for selected state
     */
    selectedAttribute: 'selected',

    /**
     * Controls whether branches are initially expanded or collapsed
     *
     * A value of `0` means the tree will be entirely collapsd (the default
     * state) otherwise branches will be expanded up to the specified depth. Use
     * `-1` to have the tree entirely expanded.
     *
     * @todo Implement handling non-zero values
     */
    expandByDefaultDepth: 0,

    /**
     * Whether or not to use checkboxes
     *
     * If `false` the markup to support checkboxes is not included in the
     * directive.
     */
    useCheckboxes: true,

    /**
     * (internal) Collection item attribute to track intermediate states
     */
    indeterminateAttribute: '__ivhTreeviewIntermediate',

    /**
     * (internal) Collection item attribute to track visible states
     */
    visibleAttribute: '__ivhTreeviewVisible'
  };

  this.set = function(opts) {
    angular.extend(settings, opts);
  };

  this.$get = function() {
    return {
      get: function() {
        return angular.copy(settings);
      }
    };
  };
});
