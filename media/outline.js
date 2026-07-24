(function() {
	const vscode = acquireVsCodeApi();
	const searchInput = document.getElementById('searchInput');
	const outlineList = document.getElementById('outlineList');
	let allItems = [];
	let filteredItems = [];
	let flatItems = [];
	let previewIndex = -1;
	let selectedIndex = -1;
	function isOutlineFocused() {
		return document.activeElement === outlineList || outlineList.contains(document.activeElement);
	}
	let lastCursorLine = -1;
	let shortcutMode = false;
	let navLockTimer = null;
	let skipNextCursorLine = false;
	let mouseDownOnList = false;

	const toggleCase = document.getElementById('toggleCase');
	const toggleFuzzy = document.getElementById('toggleFuzzy');
	let caseSensitive = false;
	let fuzzyMatch = false;
	toggleCase.addEventListener('click', function() {
		caseSensitive = !caseSensitive;
		this.classList.toggle('active', caseSensitive);
		filterItems(searchInput.value);
		previewIndex = 0; selectedIndex = -1; render();
	});
	toggleFuzzy.addEventListener('click', function() {
		fuzzyMatch = !fuzzyMatch;
		this.classList.toggle('active', fuzzyMatch);
		filterItems(searchInput.value);
		previewIndex = 0; selectedIndex = -1; render();
	});

	function lockNav() {
		if (navLockTimer) { clearTimeout(navLockTimer); }
		navLockTimer = setTimeout(function() { navLockTimer = null; }, 300);
	}

	const SHORTCUT_KEYS = '123456789abcdefghijklmnopqrstuvwxyz';
	let shortcutMap = {};

	const kindCodicons = {
		1:'\ueb60',2:'\uea8b',3:'\uea8b',4:'\uea8b',
		5:'\ueb5b',6:'\uea8c',7:'\ueb65',8:'\ueb5f',
		9:'\uea8c',10:'\uea95',11:'\ueb61',12:'\uea8c',
		13:'\uea88',14:'\ueb5d',15:'\ueb8d',16:'\uea90',
		17:'\uea8f',18:'\uea8a',19:'\uea8b',20:'\uea93',
		21:'\uea8f',22:'\ueb5e',23:'\uea91',24:'\uea86',
		25:'\ueb64',26:'\uea92'
	};

	const kindNames = {
		1:'file',2:'module',3:'namespace',4:'package',5:'class',6:'method',
		7:'property',8:'field',9:'constructor',10:'enum',11:'interface',
		12:'function',13:'variable',14:'constant',15:'string',16:'number',
		17:'boolean',18:'array',19:'object',20:'key',21:'null',
		22:'enum-member',23:'struct',24:'event',25:'operator',26:'type-parameter'
	};

	function flattenItems(items, depth) {
		depth = depth || 0;
		const result = [];
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			var copy = Object.assign({}, item);
			copy.depth = depth;
			result.push(copy);
			if (item.children && item.children.length > 0) {
				var childFlat = flattenItems(item.children, depth + 1);
				for (var j = 0; j < childFlat.length; j++) { result.push(childFlat[j]); }
			}
		}
		return result;
	}

	function render() {
		// 保存滚动位置和焦点，防止 innerHTML 替换导致跳动
		var oldScrollTop = outlineList.scrollTop;
		if (flatItems.length === 0) {
			outlineList.innerHTML = '<div class="empty-state">未找到符号</div>';
			outlineList.scrollTop = 0;
			return;
		}
		var html = '';
		for (var i = 0; i < flatItems.length; i++) {
			var item = flatItems[i];
			var symClass = 'sym-' + (kindNames[item.symbolKind] || 'variable');
			var codiconChar = kindCodicons[item.symbolKind] || '\ueb63';
			var indent = item.depth * 16;
			var isPreview = i === previewIndex;
			var isSelected = i === selectedIndex;
			var cls = 'outline-item';
			if (isSelected) {
				cls += ' selected';
				if (!isOutlineFocused()) { cls += ' unfocused'; }
			}
			if (isPreview) { cls += ' preview'; }
			html += '<div class="' + cls + '" data-index="' + i + '" data-line="' + item.line + '" data-uri="' + item.uri + '" style="padding-left:' + (4 + indent) + 'px;">';
			html += '<span class="codicon ' + symClass + '">' + codiconChar + '</span>';
			html += '<span class="name">' + escapeHtml(item.name) + '</span>';
			if (shortcutMode && shortcutMap[i] !== undefined) {
				html += '<span class="shortcut-label">' + shortcutMap[i] + '</span>';
			}
			html += '</div>';
		}
		outlineList.innerHTML = html;
		var items = outlineList.querySelectorAll('.outline-item');
		for (var k = 0; k < items.length; k++) {
			(function(el) {
				el.addEventListener('click', function() {
					previewIndex = parseInt(this.getAttribute('data-index'));
					skipNextCursorLine = true;
					confirmSelection();
				});
			})(items[k]);
		}
		// 恢复滚动位置
		outlineList.scrollTop = oldScrollTop;
	}

	function escapeHtml(text) {
		var div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	function scrollToCenter(el) {
		if (!el) return;
		var ch = outlineList.clientHeight;
		var ih = el.offsetHeight;
		outlineList.scrollTop = el.offsetTop - (ch / 2) + (ih / 2);
	}

	function confirmSelection() {
		var flat = flatItems;
		if (previewIndex < 0 || previewIndex >= flat.length) return;
		selectedIndex = previewIndex;
		var item = flat[previewIndex];
		// 同步更新 lastCursorLine，防止后续 update 消息用旧位置重置大纲选中项
		lastCursorLine = item.line;
		vscode.postMessage({
			type: 'select', line: item.line, uri: item.uri,
			nameLine: item.nameLine, nameStartChar: item.nameStartChar, nameEndChar: item.nameEndChar
		});
		render();
	}

	function movePreview(index) {
		var flat = flatItems;
		if (flat.length === 0) return;
		var oldIndex = previewIndex;
		var newIndex = Math.max(0, Math.min(index, flat.length - 1));
		if (oldIndex === newIndex) return;
		// 只更新两个项的 CSS 类，不重建整个列表
		var oldEl = oldIndex >= 0 ? outlineList.querySelector('[data-index="' + oldIndex + '"]') : null;
		if (oldEl) {
			oldEl.classList.remove('preview');
			if (oldIndex === selectedIndex) {
				if (!isOutlineFocused()) { oldEl.classList.add('unfocused'); }
			}
		}
		previewIndex = newIndex;
		var newEl = outlineList.querySelector('[data-index="' + newIndex + '"]');
		if (newEl) {
			newEl.classList.add('preview');
			newEl.classList.remove('unfocused');
			scrollToCenter(newEl);
		}
	}

	function enterShortcutMode() {
		var flat = flatItems;
		if (flat.length === 0) return;
		shortcutMap = {};
		var count = Math.min(flat.length, SHORTCUT_KEYS.length);
		for (var i = 0; i < count; i++) { shortcutMap[i] = SHORTCUT_KEYS[i]; }
		shortcutMode = true;
		searchInput.readOnly = true;
		render();
		outlineList.focus();
	}

	function exitShortcutMode() {
		if (!shortcutMode) return;
		shortcutMode = false;
		shortcutMap = {};
		searchInput.readOnly = false;
		render();
	}

	function selectByLine(line) {
		var flat = flatItems;
		if (flat.length === 0) return;
		var best = 0;
		for (var i = 0; i < flat.length; i++) {
			if (flat[i].line <= line) { best = i; } else { break; }
		}
		// 如果已经有选中项，先清除它的 preview/selected 状态
		if (selectedIndex >= 0) {
			var oldEl = outlineList.querySelector('[data-index="' + selectedIndex + '"]');
			if (oldEl) {
				oldEl.classList.remove('selected', 'preview', 'unfocused');
			}
		}
		if (previewIndex >= 0 && previewIndex !== selectedIndex) {
			var prevEl = outlineList.querySelector('[data-index="' + previewIndex + '"]');
			if (prevEl) { prevEl.classList.remove('preview'); }
		}
		previewIndex = best;
		selectedIndex = best;
		// 给新选中项添加类
		var newEl = outlineList.querySelector('[data-index="' + best + '"]');
		if (newEl) {
			newEl.classList.add('selected');
			if (!isOutlineFocused()) { newEl.classList.add('unfocused'); }
			newEl.classList.add('preview');
			scrollToCenter(newEl);
		}
	}

	function filterItems(query) {
		if (!query) { filteredItems = allItems; flatItems = flattenItems(filteredItems); return; }
		var q = caseSensitive ? query : query.toLowerCase();
		function matchName(name) {
			var n = caseSensitive ? name : name.toLowerCase();
			if (fuzzyMatch) {
				var qi = 0;
				for (var ni = 0; ni < n.length && qi < q.length; ni++) {
					if (n[ni] === q[qi]) qi++;
				}
				return qi === q.length;
			}
			return n.indexOf(q) !== -1;
		}
		function filterRecursive(items) {
			var result = [];
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var nameMatch = matchName(item.name);
				var childMatch = filterRecursive(item.children || []);
				if (nameMatch || childMatch.length > 0) {
					var copy = Object.assign({}, item);
					copy.children = nameMatch ? (item.children || []) : childMatch;
					result.push(copy);
				}
			}
			return result;
		}
		filteredItems = filterRecursive(allItems);
		flatItems = flattenItems(filteredItems);
	}

	searchInput.addEventListener('input', function() {
		exitShortcutMode();
		filterItems(this.value);
		if (this.value) {
			previewIndex = 0;
			selectedIndex = -1;
		} else {
			previewIndex = -1;
			selectedIndex = -1;
			render();
			vscode.postMessage({ type: 'getCursorLine' });
			return;
		}
		render();
		// 滚动到第一项
		scrollToCenter(outlineList.querySelector('[data-index="0"]'));
	});

	searchInput.addEventListener('blur', function(e) {
		// 焦点移到 webview 内其他元素时不清除
		var related = e.relatedTarget;
		if (related && (outlineList.contains(related) || toggleCase.contains(related) || toggleFuzzy.contains(related) || related === searchInput)) {
			return;
		}
		// 焦点移出 webview，清除搜索内容
		if (searchInput.value) {
			searchInput.value = '';
			filterItems('');
			previewIndex = -1;
			render();
			vscode.postMessage({ type: 'getCursorLine' });
		}
	});

	searchInput.addEventListener('keydown', function(e) {
		if (e.key === 'Escape') {
			if (shortcutMode) exitShortcutMode();
			else if (searchInput.value) { searchInput.value = ''; filterItems('');
                                        render();
                                        selectByLine(lastCursorLine);
                                        outlineList.focus(); render(); }
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault(); exitShortcutMode();
			outlineList.focus(); movePreview(previewIndex < 0 ? 0 : previewIndex + 1);
			return;
		}
		if (e.key === 'Enter') {
			e.preventDefault();
			if (shortcutMode) exitShortcutMode();
			else {
				var flat = flatItems;
				if (flat.length === 1) { confirmSelection(); }
				else if (flat.length > 1) { enterShortcutMode(); }
			}
			return;
		}
	});

	outlineList.addEventListener('mousedown', function() { mouseDownOnList = true; });
	outlineList.addEventListener('focus', function() {
		if (mouseDownOnList) {
			mouseDownOnList = false;
			var selected = outlineList.querySelector('.outline-item.selected');
			if (selected) { selected.classList.remove('unfocused'); }
			return;
		}
		render();
		if (!shortcutMode) vscode.postMessage({ type: 'getCursorLine' });
	});
	outlineList.addEventListener('blur', function(e) {
                render(); exitShortcutMode();
                // 焦点移出 webview 时清除搜索
                var related = e.relatedTarget;
                if (!related || (!outlineList.contains(related) && !searchInput.contains(related) && related !== searchInput && !toggleCase.contains(related) && !toggleFuzzy.contains(related))) {
                        if (searchInput.value) { searchInput.value = ''; filterItems(''); render(); selectByLine(lastCursorLine); }
                }
        });

document.addEventListener('keydown', function(e) {
		if (shortcutMode && e.target !== searchInput) {
			var key = e.key.toLowerCase();
			if (SHORTCUT_KEYS.indexOf(key) !== -1) {
				e.preventDefault();
				var idx = SHORTCUT_KEYS.indexOf(key);
				if (shortcutMap[idx] !== undefined) {
					previewIndex = idx; exitShortcutMode(); confirmSelection();
					// 快捷键选中跳转后清除搜索
					searchInput.value = ''; filterItems('');
                                        render();
                                        selectByLine(lastCursorLine);
                                        outlineList.focus();
				}
				return;
			}
			if (e.key.length === 1) exitShortcutMode();
		}
		if (e.target === outlineList || outlineList.contains(e.target)) {
			var flat = flatItems;
			if (flat.length === 0) return;
			if (e.key === 'ArrowDown') {
				e.preventDefault(); exitShortcutMode(); lockNav(); movePreview(previewIndex + 1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault(); exitShortcutMode(); lockNav();
				if (previewIndex <= 0) { movePreview(0); }
				else movePreview(previewIndex - 1);
			} else if (e.key === 'Enter') {
				e.preventDefault(); exitShortcutMode(); confirmSelection();
			} else if (e.key === '/') {
				e.preventDefault(); searchInput.focus(); searchInput.select();
			}
		}
	});

	document.addEventListener('mousedown', function(e) {
		if (!outlineList.contains(e.target) && e.target !== searchInput) exitShortcutMode();
	});

	window.addEventListener('message', function(event) {
		var message = event.data;
		switch (message.type) {
			case 'update':
				allItems = message.items || [];
				filterItems(searchInput.value);
				if (allItems.length > 0 && lastCursorLine >= 0) {
					// 设置选中变量，render() 会使用它们
					var flat = flatItems;
					var best = 0;
					for (var bi = 0; bi < flat.length; bi++) {
						if (flat[bi].line <= lastCursorLine) { best = bi; } else { break; }
					}
					previewIndex = best; selectedIndex = best;
				} else if (allItems.length > 0) {
					vscode.postMessage({ type: 'getCursorLine' });
					previewIndex = -1; selectedIndex = -1;
				} else {
					previewIndex = -1; selectedIndex = -1;
				}
				render();
				// 延迟滚动，确保在所有同步 render() 完成后执行
				requestAnimationFrame(function() {
					if (selectedIndex >= 0) {
						scrollToCenter(outlineList.querySelector('[data-index="' + selectedIndex + '"]'));
					}
				});
				break;
			case 'cursorLine':
                                if (skipNextCursorLine) { skipNextCursorLine = false; }
                                else if (!isOutlineFocused()) { lastCursorLine = message.line; selectByLine(message.line); }
                                else { lastCursorLine = message.line; }
                                break;
                        case 'cursorChanged':
				lastCursorLine = message.line;
				// 仅当焦点不在大纲列表时清除搜索（如用户点击编辑器）
				if (!isOutlineFocused() && searchInput.value) {
					searchInput.value = '';
					filterItems('');
				}
				if (!navLockTimer && !shortcutMode) selectByLine(message.line);
				break;
			case 'editorClicked':
                                // 仅当焦点不在大纲列表时清除搜索
                                if (!isOutlineFocused()) {
                                        searchInput.value = ''; exitShortcutMode(); filterItems('');
                                        previewIndex = -1; render();
                                }
                                break;
                        case 'focusSearch':
				searchInput.focus();
				searchInput.select();
				break;
			case 'keybindingChanged':
				searchInput.placeholder = '搜索大纲 (' + message.keybinding + ')';
				break;
		}
	});

	vscode.postMessage({ type: 'getCursorLine' });
	vscode.postMessage({ type: 'refresh' });
})();
