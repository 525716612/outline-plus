import * as vscode from 'vscode';

// C/C++ 系列语言的 ID
const C_FAMILY_LANGUAGES = new Set(['c', 'cpp', 'cuda-cpp', 'objective-c', 'objective-cpp']);

/**
 * 判断符号是否为声明（而非定义/实现）。
 * 目前仅对 C/C++ 系列语言生效，其他语言返回 `undefined`。
 *
 * C/C++ 中声明/原型以分号结尾，定义有函数体 `{ }`。
 */
export function isDeclaration(
	symbol: vscode.DocumentSymbol,
	document: vscode.TextDocument
): boolean | undefined {
	if (!C_FAMILY_LANGUAGES.has(document.languageId)) {
		return undefined;
	}
	try {
		const text = document.getText(symbol.range).trimEnd();
		return text.endsWith(';');
	} catch {
		return undefined;
	}
}
