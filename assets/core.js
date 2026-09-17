(function (global) {
  'use strict';

  var registry = [];

  function hashString(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var state = (typeof seed === 'number' ? seed : hashString(String(seed))) >>> 0;
    return function () {
      state += 0x6D2B79F5;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffled(list, random) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(random() * (i + 1));
      var temp = copy[i]; copy[i] = copy[j]; copy[j] = temp;
    }
    return copy;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.indexOf('on') === 0) node.addEventListener(key.slice(2), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function register(game) {
    if (!game || !game.id || typeof game.mount !== 'function') throw new Error('Invalid game registration');
    registry.push(game);
  }

  function hydrateSukakuStartingCandidates(root) {
    if (!root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll('.sukaku-cell[data-candidates]'), function (cell) {
      if (cell.textContent.trim() || cell.querySelector('.sukaku-start-candidates')) return;
      var allowed = Object.create(null);
      String(cell.dataset.candidates || '').trim().split(/\s+/).forEach(function (value) {
        if (value) allowed[value] = true;
      });
      var grid = document.createElement('span');
      grid.className = 'sukaku-start-candidates';
      grid.setAttribute('aria-hidden', 'true');
      for (var value = 1; value <= 9; value += 1) {
        var mark = document.createElement('span');
        mark.className = 'sukaku-start-candidate';
        mark.textContent = allowed[String(value)] ? String(value) : '';
        grid.appendChild(mark);
      }
      cell.appendChild(grid);
    });
  }

  function installSukakuCandidateHydrator() {
    var stage = document.getElementById('game-stage');
    if (!stage || stage.__ildiSukakuCandidateObserver || typeof MutationObserver === 'undefined') return;
    var scheduled = false;
    function refresh() {
      if (scheduled) return;
      scheduled = true;
      Promise.resolve().then(function () {
        scheduled = false;
        hydrateSukakuStartingCandidates(stage);
      });
    }
    var observer = new MutationObserver(refresh);
    observer.observe(stage, { childList: true, subtree: true });
    stage.__ildiSukakuCandidateObserver = observer;
    refresh();
  }

  function installSudokuNavigationHardening() {
    var familySelect = document.getElementById('category-select');
    var variantSelect = document.getElementById('variant-select');
    if (!familySelect || !variantSelect || familySelect.__ildiNavigationHardening) return;

    global.SudokuLibraryState = global.SudokuLibraryState || {};
    var state = global.SudokuLibraryState;
    var desiredCategory = typeof state.currentCategory === 'string' ? state.currentCategory : (familySelect.value || '');
    var sorting = false;

    function optionExists(select, value) {
      return Array.prototype.some.call(select.options || [], function (option) { return option.value === value; });
    }

    function restoreDesiredCategory() {
      if (desiredCategory && optionExists(familySelect, desiredCategory)) familySelect.value = desiredCategory;
      state.currentCategory = familySelect.value || desiredCategory || '';
    }

    var nativeReplaceChildren = familySelect.replaceChildren;
    familySelect.replaceChildren = function () {
      desiredCategory = state.currentCategory || this.value || desiredCategory || '';
      nativeReplaceChildren.apply(this, arguments);
      restoreDesiredCategory();
    };

    var nativeAppendChild = familySelect.appendChild;
    familySelect.appendChild = function (node) {
      var out = nativeAppendChild.call(this, node);
      restoreDesiredCategory();
      return out;
    };

    function localizedTitle(variant) {
      var translated = global.SudokuI18n && global.SudokuI18n.variant ? global.SudokuI18n.variant(variant) : variant;
      return translated && translated.title ? translated.title : (variant.title || variant.id || '');
    }

    function compareLabels(a, b) {
      var lang = global.SudokuI18n && global.SudokuI18n.lang === 'hu' ? 'hu' : 'en';
      return String(a).localeCompare(String(b), lang, { sensitivity: 'base', numeric: true });
    }

    function sortVariantOptions() {
      if (sorting || !variantSelect.options || variantSelect.options.length < 2) return;
      var selected = variantSelect.value;
      var currentOptions = Array.prototype.slice.call(variantSelect.options);
      var sortedOptions = currentOptions.slice().sort(function (a, b) { return compareLabels(a.textContent, b.textContent); });
      var alreadySorted = currentOptions.every(function (option, index) { return option === sortedOptions[index]; });
      if (alreadySorted) return;
      sorting = true;
      variantSelect.replaceChildren.apply(variantSelect, sortedOptions);
      if (selected && optionExists(variantSelect, selected)) variantSelect.value = selected;
      sorting = false;
    }

    function isSkyscraperVariant(v) {
      return ['classic-skyscrapers','skyscraper','skyscraper-sums','skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','sum-skyscraper-parks','inside-skyscrapers','diagonal-skyscrapers','product-skyscrapers','killer-skyscrapers','domino-skyscrapers','skyscraper-parks2','evenodd-skyscrapers','toroidal-skyscrapers','double-skyscrapers'].indexOf(v.id) !== -1;
    }

    function groupIdFor(v) {
      if (!v) return '';
      if (v.family === 'Core' || v.id === 'mini' || v.id === 'mini-6') return 'classics';
      if (isSkyscraperVariant(v)) return 'skyscrapers';
      if (v.family === 'Japanese logic') return 'japanese';
      if (v.family === 'Lines') return 'lines';
      if (!isSkyscraperVariant(v) && (v.family === 'Cages' || v.family === 'Outside clues')) return 'sums';
      if (v.family === 'Anti-constraints' || v.family === 'Cell relations') return 'anti';
      if (v.family === 'Extra regions' || v.family === 'Cell marks') return 'patterns';
      if (!isSkyscraperVariant(v) && v.family === 'Grid' && v.id !== 'mini' && v.id !== 'mini-6') return 'structural';
      if (!isSkyscraperVariant(v) && v.family === 'Combinations') return 'combinations';
      return 'classics';
    }

    function rebuildVariantOptionsForCategory(category, selectedId) {
      if (!global.SudokuBank || !category) return;
      var list = global.SudokuBank.filter(function (v) { return groupIdFor(v) === category; });
      list.sort(function (a, b) { return compareLabels(localizedTitle(a), localizedTitle(b)); });
      variantSelect.replaceChildren.apply(variantSelect, list.map(function (v) {
        return el('option', { value: v.id, text: localizedTitle(v) });
      }));
      if (selectedId && optionExists(variantSelect, selectedId)) variantSelect.value = selectedId;
      var count = document.getElementById('variant-count');
      if (count) count.textContent = list.length + ' ' + (global.SudokuI18n ? global.SudokuI18n.t('variantCount') : 'variants');
      Array.prototype.forEach.call(document.querySelectorAll('#category-list .category-button'), function (button) {
        button.classList.toggle('active', button.getAttribute('data-family') === category);
      });
    }

    function afterCurrentTurn(fn) {
      if (typeof queueMicrotask === 'function') queueMicrotask(fn);
      else Promise.resolve().then(fn);
    }

    familySelect.addEventListener('change', function () {
      desiredCategory = familySelect.value || '';
      state.currentCategory = desiredCategory;
      afterCurrentTurn(sortVariantOptions);
    });

    variantSelect.addEventListener('change', function () {
      var selectedId = variantSelect.value;
      afterCurrentTurn(function () {
        if (!selectedId || !global.SudokuBank) { sortVariantOptions(); return; }
        if (!familySelect.value) {
          var selectedVariant = global.SudokuBank.find(function (v) { return v.id === selectedId; });
          var category = groupIdFor(selectedVariant);
          if (category && optionExists(familySelect, category)) {
            desiredCategory = category;
            state.currentCategory = category;
            familySelect.value = category;
            rebuildVariantOptionsForCategory(category, selectedId);
            return;
          }
        }
        desiredCategory = familySelect.value || desiredCategory || '';
        state.currentCategory = desiredCategory;
        sortVariantOptions();
      });
    });

    if (typeof MutationObserver === 'function') {
      var observer = new MutationObserver(function () { afterCurrentTurn(sortVariantOptions); });
      observer.observe(variantSelect, { childList: true });
    }

    familySelect.__ildiNavigationHardening = true;
  }

  installSudokuNavigationHardening();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installSukakuCandidateHydrator, { once: true });
  else installSukakuCandidateHydrator();

  global.LogicRoom = {
    games: registry,
    register: register,
    rng: rng,
    shuffled: shuffled,
    el: el,
    hashString: hashString
  };
}(window));
