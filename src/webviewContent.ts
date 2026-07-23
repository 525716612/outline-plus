import * as vscode from 'vscode';

export function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
	const nonce = getNonce();
	const codiconUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'media', 'codicon.ttf')
	);

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<title>Outline Map</title>
	<style>${getCSS(codiconUri.toString())}</style>
</head>
<body>
	<div class="search-box">
		<input type="text" class="search-input" id="searchInput" placeholder="Search outline..." />
		<button class="search-toggle" id="toggleCase" title="Case Sensitive">Aa</button>
		<button class="search-toggle" id="toggleFuzzy" title="Fuzzy Match">.*</button>
	</div>
	<div class="outline-list" id="outlineList" tabindex="0"></div>
	<script nonce="${nonce}">${getJS()}</script>
</body>
</html>`;
}

function getCSS(codiconUri: string): string {
	return `
		@font-face {
			font-family: 'codicon';
			font-weight: normal;
			font-style: normal;
			src: url('${codiconUri}') format('truetype');
		}
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background: var(--vscode-sideBar-background);
			padding: 4px 0 0 0;
			outline: none;
			height: 100vh;
			display: flex;
			flex-direction: column;
		}
		.search-box {
			position: sticky; top: 0; z-index: 10;
			background: var(--vscode-sideBar-background);
			padding: 0 4px 8px 4px; display: flex; gap: 4px;
		}
		.search-input {
			flex: 1; padding: 3px 8px;
			border: 1px solid var(--vscode-input-border, transparent);
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border-radius: 2px; outline: none;
			font-size: inherit; font-family: inherit;
		}
		.search-input:focus { border-color: var(--vscode-focusBorder); }
		.search-toggle {
			display: flex; align-items: center; justify-content: center;
			width: 24px; height: 24px;
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 2px; background: var(--vscode-input-background);
			color: var(--vscode-descriptionForeground);
			cursor: pointer; font-size: 11px; font-family: inherit;
			flex-shrink: 0; user-select: none;
		}
		.search-toggle:hover { background: var(--vscode-list-hoverBackground); }
		.search-toggle.active {
			background: var(--vscode-inputOption-activeBackground);
			color: var(--vscode-inputOption-activeForeground);
			border-color: var(--vscode-inputOption-activeBorder);
		}
		.outline-list { overflow-y: auto; flex: 1; outline: none; }
		.outline-list:focus .outline-item.selected { border-left: 2px solid var(--vscode-focusBorder); }
		.outline-item {
			display: flex; align-items: center; padding: 2px 4px;
			cursor: pointer; border-radius: 2px; border-left: 2px solid transparent;
			white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 22px;
		}
		.outline-item:hover { background: var(--vscode-list-hoverBackground); }
		.outline-item.selected { background: var(--vscode-list-activeSelectionBackground); }
		.outline-item.preview { background: var(--vscode-list-hoverBackground); border-left: 2px solid var(--vscode-focusBorder); }
		.outline-item.selected.preview { background: var(--vscode-list-activeSelectionBackground); }
		.outline-item.selected.unfocused { background: var(--vscode-list-inactiveSelectionBackground); }
		.shortcut-label {
			margin-left: 4px; padding: 0 4px; border-radius: 2px;
			background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
			font-size: 11px; line-height: 18px; flex-shrink: 0; min-width: 18px; text-align: center;
		}
		.outline-item .codicon {
			font-family: 'codicon'; font-size: 16px; font-style: normal; font-weight: normal;
			margin-right: 6px; flex-shrink: 0; width: 16px; height: 16px;
			display: flex; align-items: center; justify-content: center;
			text-rendering: auto; -webkit-font-smoothing: antialiased;
		}
		.sym-file { color: #4fc1ff; } .sym-module { color: #4fc1ff; }
		.sym-namespace { color: #4fc1ff; } .sym-package { color: #4fc1ff; }
		.sym-class { color: #dcdcaa; } .sym-method { color: #c586c0; }
		.sym-property { color: #9cdcfe; } .sym-field { color: #9cdcfe; }
		.sym-constructor { color: #dcdcaa; } .sym-enum { color: #4ec9b0; }
		.sym-interface { color: #4ec9b0; } .sym-function { color: #dcdcaa; }
		.sym-variable { color: #9cdcfe; } .sym-constant { color: #4fc1ff; }
		.sym-string { color: #ce9178; } .sym-number { color: #b5cea8; }
		.sym-boolean { color: #569cd6; } .sym-array { color: #4ec9b0; }
		.sym-object { color: #dcdcaa; } .sym-key { color: #9cdcfe; }
		.sym-null { color: #569cd6; } .sym-enum-member { color: #4fc1ff; }
		.sym-struct { color: #4ec9b0; } .sym-event { color: #dcdcaa; }
		.sym-operator { color: #d4d4d4; } .sym-type-parameter { color: #4ec9b0; }
		.outline-item .name { overflow: hidden; text-overflow: ellipsis; }
		.empty-state { text-align: center; color: var(--vscode-descriptionForeground); padding: 20px 0; }
		.loading-state { text-align: center; color: var(--vscode-descriptionForeground); padding: 20px 0; }
		.loading-spinner {
			display: inline-block; width: 16px; height: 16px;
			border: 2px solid var(--vscode-descriptionForeground);
			border-top-color: transparent; border-radius: 50%;
			animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 6px;
		}
		@keyframes spin { to { transform: rotate(360deg); } }`;
}

function getJS(): string {
	return `
		(function() {
			const vscode = acquireVsCodeApi();
			const searchInput = document.getElementById('searchInput');
			const outlineList = document.getElementById('outlineList');
			let allItems = [];
			let filteredItems = [];
			let previewIndex = -1;
			let selectedIndex = -1;
			let isListFocused = false;
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
				1:'\\ueb60',2:'\\uea8b',3:'\\uea8b',4:'\\uea8b',
				5:'\\ueb5b',6:'\\uea8c',7:'\\ueb65',8:'\\ueb5f',
				9:'\\uea8c',10:'\\uea95',11:'\\ueb61',12:'\\uea8c',
				13:'\\uea88',14:'\\ueb5d',15:'\\ueb8d',16:'\\uea90',
				17:'\\uea8f',18:'\\uea8a',19:'\\uea8b',20:'\\uea93',
				21:'\\uea8f',22:'\\ueb5e',23:'\\uea91',24:'\\uea86',
				25:'\\ueb64',26:'\\uea92'
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
				var flat = flattenItems(filteredItems);
				// 保存滚动位置和焦点，防止 innerHTML 替换导致跳动
				var oldScrollTop = outlineList.scrollTop;
				if (flat.length === 0) {
					outlineList.innerHTML = '<div class="empty-state">No symbols found</div>';
					outlineList.scrollTop = 0;
					return;
				}
				var html = '';
				for (var i = 0; i < flat.length; i++) {
					var item = flat[i];
					var symClass = 'sym-' + (kindNames[item.symbolKind] || 'variable');
					var codiconChar = kindCodicons[item.symbolKind] || '\\ueb63';
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

			function confirmSelection() {
				var flat = flattenItems(filteredItems);
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
				var flat = flattenItems(filteredItems);
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
					// 滚动到新位置
					var containerHeight = outlineList.clientHeight;
					var itemTop = newEl.offsetTop;
					var itemHeight = newEl.offsetHeight;
					outlineList.scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
				}
			}

			function enterShortcutMode() {
				var flat = flattenItems(filteredItems);
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
				var flat = flattenItems(filteredItems);
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
					// 滚动到新位置
					var containerHeight = outlineList.clientHeight;
					var itemTop = newEl.offsetTop;
					var itemHeight = newEl.offsetHeight;
					outlineList.scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
				}
			}

			function scrollToItem(index, attempt) {
				if (attempt > 10) return;
				var el = outlineList.querySelector('[data-index="' + index + '"]');
				if (el) {
					// 使用 scrollTop 计算直接定位，避免 scrollIntoView 的动画导致整个面板抖动
					var containerHeight = outlineList.clientHeight;
					var itemTop = el.offsetTop;
					var itemHeight = el.offsetHeight;
					outlineList.scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
				} else {
					setTimeout(function() { scrollToItem(index, attempt + 1); }, 50);
				}
			}

			function filterItems(query) {
				if (!query) { filteredItems = allItems; return; }
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
			}

			searchInput.addEventListener('input', function() {
				exitShortcutMode();
				filterItems(this.value);
				if (this.value) {
					previewIndex = 0;
					selectedIndex = -1;
				} else {
					vscode.postMessage({ type: 'getCursorLine' });
					return;
				}
				render();
				// 滚动到第一项
				var first = outlineList.querySelector('[data-index="0"]');
				if (first) {
					var ch = outlineList.clientHeight;
					var ih = first.offsetHeight;
					outlineList.scrollTop = first.offsetTop - (ch / 2) + (ih / 2);
				}
			});

			searchInput.addEventListener('keydown', function(e) {
				if (e.key === 'Escape') {
					if (shortcutMode) exitShortcutMode();
					else if (searchInput.value) { searchInput.value = ''; filterItems(''); previewIndex = -1; render(); }
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
					else { var flat = flattenItems(filteredItems); if (flat.length > 0) enterShortcutMode(); }
					return;
				}
			});

			outlineList.addEventListener('mousedown', function() { mouseDownOnList = true; });
			outlineList.addEventListener('focus', function() {
				isListFocused = true;
				if (mouseDownOnList) {
					mouseDownOnList = false;
					var selected = outlineList.querySelector('.outline-item.selected');
					if (selected) { selected.classList.remove('unfocused'); }
					return;
				}
				render();
				if (!shortcutMode) vscode.postMessage({ type: 'getCursorLine' });
			});
			outlineList.addEventListener('blur', function() {
				isListFocused = false;
				render(); exitShortcutMode();
			});

			document.addEventListener('keydown', function(e) {
				if (shortcutMode && e.target !== searchInput) {
					var key = e.key.toLowerCase();
					if (SHORTCUT_KEYS.indexOf(key) !== -1) {
						e.preventDefault();
						var idx = SHORTCUT_KEYS.indexOf(key);
						if (shortcutMap[idx] !== undefined) {
							previewIndex = idx; exitShortcutMode(); confirmSelection();
						}
						return;
					}
					if (e.key.length === 1) exitShortcutMode();
				}
				if (e.target === outlineList || outlineList.contains(e.target)) {
					var flat = flattenItems(filteredItems);
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
							var flat = flattenItems(filteredItems);
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
						render(); break;
					case 'cursorLine':
						if (skipNextCursorLine) { skipNextCursorLine = false; }
						else { lastCursorLine = message.line; selectByLine(message.line); }
						break;
					case 'cursorChanged':
						lastCursorLine = message.line;
						// 编辑器有焦点时，清除搜索并重置到大纲跟踪状态
						if (searchInput.value) {
							searchInput.value = '';
							filterItems('');
						}
						if (!navLockTimer && !shortcutMode) selectByLine(message.line);
						break;
					case 'editorClicked':
						searchInput.value = ''; exitShortcutMode(); filterItems('');
						previewIndex = -1; render(); break;
					case 'focusSearch':
						searchInput.focus();
						searchInput.select();
						break;
				}
			});

			vscode.postMessage({ type: 'getCursorLine' });
			vscode.postMessage({ type: 'refresh' });
		})();`;
}
