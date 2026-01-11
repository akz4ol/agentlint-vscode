import * as vscode from 'vscode';
import * as path from 'path';
import { Scanner, DEFAULT_POLICY } from 'agentlint';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  console.log('AgentLint extension activated');

  diagnosticCollection = vscode.languages.createDiagnosticCollection('agentlint');
  context.subscriptions.push(diagnosticCollection);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('agentlint.scan', () => scanWorkspace()),
    vscode.commands.registerCommand('agentlint.scanFile', () => scanCurrentFile())
  );

  // Scan on file save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (isAgentConfigFile(document.uri.fsPath)) {
        scanFile(document.uri);
      }
    })
  );

  // Scan on file open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isAgentConfigFile(document.uri.fsPath)) {
        scanFile(document.uri);
      }
    })
  );

  // Initial scan of open files
  vscode.workspace.textDocuments.forEach((document) => {
    if (isAgentConfigFile(document.uri.fsPath)) {
      scanFile(document.uri);
    }
  });
}

function isAgentConfigFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  return (
    normalized.includes('.claude/') ||
    normalized.endsWith('.cursorrules') ||
    normalized.endsWith('claude.md') ||
    normalized.endsWith('agents.md')
  );
}

async function scanWorkspace() {
  const config = vscode.workspace.getConfiguration('agentlint');
  if (!config.get('enable')) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  diagnosticCollection.clear();

  for (const folder of workspaceFolders) {
    await scanFolder(folder.uri.fsPath);
  }

  vscode.window.showInformationMessage('AgentLint scan complete');
}

async function scanCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No file open');
    return;
  }

  await scanFile(editor.document.uri);
}

async function scanFile(uri: vscode.Uri) {
  const config = vscode.workspace.getConfiguration('agentlint');
  if (!config.get('enable')) {
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    return;
  }

  await scanFolder(workspaceFolder.uri.fsPath, uri.fsPath);
}

async function scanFolder(folderPath: string, specificFile?: string) {
  try {
    const config = vscode.workspace.getConfiguration('agentlint');
    const failOn = config.get<string>('failOn') || 'high';
    const warnOn = config.get<string>('warnOn') || 'medium';

    const policy = {
      ...DEFAULT_POLICY,
      policy: {
        ...DEFAULT_POLICY.policy,
        fail_on: failOn as 'none' | 'low' | 'medium' | 'high',
        warn_on: warnOn as 'none' | 'low' | 'medium' | 'high',
      },
    };

    const scanner = new Scanner({
      root: folderPath,
      include: specificFile ? [specificFile] : [],
      exclude: [],
      policy,
      ciMode: false,
    });

    const result = await scanner.scan();

    // Group findings by file
    const findingsByFile = new Map<string, vscode.Diagnostic[]>();

    for (const finding of result.findings) {
      const filePath = path.join(folderPath, finding.path);
      const uri = vscode.Uri.file(filePath);

      if (!findingsByFile.has(filePath)) {
        findingsByFile.set(filePath, []);
      }

      const startLine = Math.max(0, (finding.anchors?.start_line || 1) - 1);
      const endLine = Math.max(0, (finding.anchors?.end_line || startLine + 1) - 1);

      const range = new vscode.Range(startLine, 0, endLine, 1000);

      const severity = getSeverity(finding.severity, failOn, warnOn);
      const diagnostic = new vscode.Diagnostic(
        range,
        `[${finding.rule_id}] ${finding.title}: ${finding.message}`,
        severity
      );
      diagnostic.source = 'agentlint';
      diagnostic.code = finding.rule_id;

      findingsByFile.get(filePath)!.push(diagnostic);
    }

    // Update diagnostics
    for (const [filePath, diagnostics] of findingsByFile) {
      const uri = vscode.Uri.file(filePath);
      diagnosticCollection.set(uri, diagnostics);
    }

    // Clear diagnostics for files with no findings
    if (specificFile && !findingsByFile.has(specificFile)) {
      diagnosticCollection.delete(vscode.Uri.file(specificFile));
    }
  } catch (error) {
    console.error('AgentLint scan error:', error);
  }
}

function getSeverity(
  findingSeverity: string,
  failOn: string,
  warnOn: string
): vscode.DiagnosticSeverity {
  const severityOrder = ['low', 'medium', 'high'];
  const findingLevel = severityOrder.indexOf(findingSeverity);
  const failLevel = severityOrder.indexOf(failOn);
  const warnLevel = severityOrder.indexOf(warnOn);

  if (findingLevel >= failLevel) {
    return vscode.DiagnosticSeverity.Error;
  }
  if (findingLevel >= warnLevel) {
    return vscode.DiagnosticSeverity.Warning;
  }
  return vscode.DiagnosticSeverity.Information;
}

export function deactivate() {
  diagnosticCollection?.dispose();
}
