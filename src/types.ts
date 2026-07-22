import * as vscode from 'vscode';

export interface OutlineItem {
	id: string;
	name: string;
	symbolKind: vscode.SymbolKind;
	line: number;
	column: number;
	/** 符号名称的选区范围（用于编辑器高亮） */
	nameLine: number;
	nameStartChar: number;
	nameEndChar: number;
	uri: string;
	children: OutlineItem[];
}
