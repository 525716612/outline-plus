import * as vscode from 'vscode';
import { OutlineItem } from './types';
import { getWebviewContent } from './webviewContent';

export class OutlineViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'c-outline-map.outlineView';
	private _view?: vscode.WebviewView;
	private _outlineItems: OutlineItem[] = [];
	private _disposed = false;
	private _subscriptions: vscode.Disposable[] = [];
	private _currentUri: string | undefined;
	private _cursorLine = 0;
	private _diagnosticsReadyUris = new Set<string>();
	private _debounceTimer: ReturnType<typeof setTimeout> | undefined;
	private _fallbackTimer: ReturnType<typeof setTimeout> | undefined;
	private _fallbackRetries = 0;
	private _skipNextSelectionChange = false;
	private _skipEditorClicked = false;
	private static readonly FALLBACK_MAX_RETRIES = 20;
	private static readonly FALLBACK_INTERVAL = 500;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void {
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};
		webviewView.webview.html = getWebviewContent(webviewView.webview, this._extensionUri);

		webviewView.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.type) {
					case 'select':
						await this._selectItem(message.line, message.uri, message.nameLine, message.nameStartChar, message.nameEndChar);
						break;
					case 'refresh':
						await this._refreshOutline();
						break;
					case 'getCursorLine':
						this._sendCursorLine();
						break;
				}
			},
			undefined,
			this._subscriptions
		);

		this._subscriptions.push(
			vscode.window.onDidChangeTextEditorSelection((e) => {
				const line = e.selections[0].active.line;
				if (this._skipNextSelectionChange) {
					this._skipNextSelectionChange = false;
					return;
				}
				this._cursorLine = line;
				if (this._view) {
					this._view.webview.postMessage({ type: 'cursorChanged', line });
				}
			})
		);

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				this._refreshOutline();
			}
		}, undefined, this._subscriptions);

		this._subscriptions.push(
			vscode.languages.onDidChangeDiagnostics((e) => {
				for (const uri of e.uris) {
					const uriStr = uri.toString();
					this._diagnosticsReadyUris.add(uriStr);
					if (uriStr === this._currentUri) {
						this._debouncedRefresh();
					}
				}
			})
		);

		this._subscriptions.push(
			vscode.window.onDidChangeActiveTextEditor((editor) => {
				if (editor) {
					this._currentUri = editor.document.uri.toString();
					const diags = vscode.languages.getDiagnostics(editor.document.uri);
					if (diags.length > 0) {
						this._diagnosticsReadyUris.add(this._currentUri);
					}
				}
				if (this._skipEditorClicked) {
					this._skipEditorClicked = false;
					return;
				}
				if (this._view) {
					this._view.webview.postMessage({ type: 'editorClicked' });
				}
				this._refreshOutline();
			})
		);

		const editor = vscode.window.activeTextEditor;
		if (editor) {
			this._currentUri = editor.document.uri.toString();
			const diags = vscode.languages.getDiagnostics(editor.document.uri);
			if (diags.length > 0) {
				this._diagnosticsReadyUris.add(this._currentUri);
			}
		}
		this._refreshOutline();
	}

	public async refresh(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			this._currentUri = editor.document.uri.toString();
			const diags = vscode.languages.getDiagnostics(editor.document.uri);
			if (diags.length > 0) {
				this._diagnosticsReadyUris.add(this._currentUri);
			}
		}
		await this._refreshOutline();
	}

	public focusSearch(): void {
		if (this._view) {
			this._view.webview.postMessage({ type: 'focusSearch' });
		}
	}

	private _debouncedRefresh(): void {
		if (this._debounceTimer !== undefined) {
			clearTimeout(this._debounceTimer);
		}
		this._debounceTimer = setTimeout(() => {
			this._debounceTimer = undefined;
			this._refreshOutline();
		}, 300);
	}

	private _sendLoading(loading: boolean): void {
		if (this._view) {
			this._view.webview.postMessage({ type: 'loading', loading });
		}
	}

	private async _refreshOutline(): Promise<void> {
		if (this._disposed) { return; }
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			this._cancelFallback();
			this._sendOutline([]);
			return;
		}
		const docUri = editor.document.uri;
		const uriStr = docUri.toString();
		if (this._currentUri !== uriStr) { this._currentUri = uriStr; }

		const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider', docUri
		);
		if (symbols === undefined) {
			this._cancelFallback();
			this._sendLoading(false);
			this._sendOutline([]);
			return;
		}
		if (symbols.length > 0) {
			this._cancelFallback();
			this._sendLoading(false);
			this._outlineItems = symbols.map((sym, index) =>
				this._convertSymbol(sym, index, uriStr)
			);
			this._sendOutline(this._outlineItems);
			return;
		}
		if (!this._diagnosticsReadyUris.has(uriStr)) {
			this._cancelFallback();
			this._sendLoading(true);
		} else {
			this._sendLoading(true);
			this._startFallback();
		}
	}

	private _startFallback(): void {
		if (this._fallbackTimer !== undefined) { return; }
		this._fallbackRetries = OutlineViewProvider.FALLBACK_MAX_RETRIES;
		this._scheduleFallbackTick();
	}

	private _scheduleFallbackTick(): void {
		this._fallbackTimer = setTimeout(async () => {
			this._fallbackTimer = undefined;
			this._fallbackRetries--;
			const editor = vscode.window.activeTextEditor;
			if (!editor) { this._sendOutline([]); return; }
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				'vscode.executeDocumentSymbolProvider', editor.document.uri
			);
			if (symbols && symbols.length > 0) {
				this._sendLoading(false);
				this._outlineItems = symbols.map((sym, index) =>
					this._convertSymbol(sym, index, editor.document.uri.toString())
				);
				this._sendOutline(this._outlineItems);
				return;
			}
			if (this._fallbackRetries > 0) {
				this._scheduleFallbackTick();
			} else {
				this._sendLoading(false);
				this._sendOutline([]);
			}
		}, OutlineViewProvider.FALLBACK_INTERVAL);
	}

	private _cancelFallback(): void {
		if (this._fallbackTimer !== undefined) {
			clearTimeout(this._fallbackTimer);
			this._fallbackTimer = undefined;
		}
	}

	private _convertSymbol(symbol: vscode.DocumentSymbol, id: number, uri: string): OutlineItem {
		return {
			id: `${id}`,
			name: symbol.name,
			symbolKind: symbol.kind,
			line: symbol.range.start.line,
			column: symbol.range.start.character,
			nameLine: symbol.selectionRange.start.line,
			nameStartChar: symbol.selectionRange.start.character,
			nameEndChar: symbol.selectionRange.end.character,
			uri: uri,
			children: symbol.children.map((child, i) =>
				this._convertSymbol(child, id * 100 + i, uri)
			)
		};
	}

	private async _selectItem(line: number, uri: string, nameLine?: number, nameStartChar?: number, nameEndChar?: number): Promise<void> {
		this._skipNextSelectionChange = true;
		this._skipEditorClicked = true;
		const documentUri = vscode.Uri.parse(uri);
		const doc = await vscode.workspace.openTextDocument(documentUri);
		const editor = await vscode.window.showTextDocument(doc, { preserveFocus: true });
		if (nameLine !== undefined && nameStartChar !== undefined && nameEndChar !== undefined) {
			const start = new vscode.Position(nameLine, nameStartChar);
			const end = new vscode.Position(nameLine, nameEndChar);
			editor.selection = new vscode.Selection(start, end);
			editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
		} else {
			const position = new vscode.Position(line, 0);
			editor.selection = new vscode.Selection(position, position);
			editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
		}
	}

	private _sendOutline(items: OutlineItem[]): void {
		if (this._view) {
			this._view.webview.postMessage({ type: 'update', items });
		}
	}

	private _sendCursorLine(): void {
		const editor = vscode.window.activeTextEditor;
		const line = editor ? editor.selection.active.line : this._cursorLine;
		this._cursorLine = line;
		if (this._view) {
			this._view.webview.postMessage({ type: 'cursorLine', line });
		}
	}

	public dispose(): void {
		this._disposed = true;
		if (this._debounceTimer !== undefined) { clearTimeout(this._debounceTimer); }
		this._cancelFallback();
		for (const sub of this._subscriptions) { sub.dispose(); }
	}
}
