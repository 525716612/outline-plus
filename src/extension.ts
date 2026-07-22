import * as vscode from 'vscode';
import { OutlineViewProvider } from './outlineViewProvider';

export function activate(context: vscode.ExtensionContext) {
	const outlineProvider = new OutlineViewProvider(context.extensionUri);

	// Register the webview view provider
	const viewRegistration = vscode.window.registerWebviewViewProvider(
		OutlineViewProvider.viewType,
		outlineProvider,
		{ webviewOptions: { retainContextWhenHidden: true } }
	);
	context.subscriptions.push(viewRegistration);

	// Register refresh command
	const refreshCmd = vscode.commands.registerCommand('c-outline-map.refresh', () => {
		outlineProvider.refresh();
	});
	context.subscriptions.push(refreshCmd);

	// 注册搜索框聚焦命令（支持 Alt+L 快捷键）
	const focusSearchCmd = vscode.commands.registerCommand('c-outline-map.focusSearch', () => {
		outlineProvider.focusSearch();
	});
	context.subscriptions.push(focusSearchCmd);

	// 激活时自动显示侧边栏
	vscode.commands.executeCommand('workbench.view.extension.outline-map');

	// 文档内容变化时自动刷新（编辑器切换已在 Provider 内部处理）
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(() => {
			outlineProvider.refresh();
		})
	);
}

export function deactivate() {}
