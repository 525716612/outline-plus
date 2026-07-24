import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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
	const cssUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'media', 'outline.css')
	);
	const jsUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'media', 'outline.js')
	);

	const htmlPath = path.join(extensionUri.fsPath, 'media', 'outline.html');
	let html = fs.readFileSync(htmlPath, 'utf-8');

	html = html.replace(/\{\{nonce\}\}/g, nonce);
	html = html.replace(/\{\{cspSource\}\}/g, webview.cspSource);
	html = html.replace(/\{\{codiconUri\}\}/g, codiconUri.toString());
	html = html.replace(/\{\{cssUri\}\}/g, cssUri.toString());
	html = html.replace(/\{\{jsUri\}\}/g, jsUri.toString());

	return html;
}
