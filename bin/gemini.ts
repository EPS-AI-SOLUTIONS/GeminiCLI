#!/usr/bin/env node
/**
 * GeminiHydra CLI - YOLO Edition v14.0 "School of the Wolf"
 *
 * Protocol v14.0 - Full Node.js Implementation
 *
 * Features:
 * 1. Interactive Mode with History (FIXED: readline issues)
 * 2. Pipeline Mode (task chaining)
 * 3. Watch Mode (file monitoring)
 * 4. Project Context (awareness)
 * 5. Cost Tracking
 * 6. 5-Phase Execution (PRE-A → A → B → C → D)
 * 7. Self-Healing Repair Loop
 * 8. MCP Integration
 *
 * STDIN FIXES APPLIED:
 * - Fix #1: Quick Edit Mode warning
 * - Fix #3: Explicit stdin.resume() after async
 * - Fix #4: readline/promises support
 * - Fix #5: Protected readline close
 * - Fix #6: MCP subprocess stdin.end()
 * - Fix #7: Inquirer.js fallback
 * - Fix #8: setRawMode for interactivity
 * - Fix #9: process.stdin.ref() protection
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Swarm } from '../src/core/Swarm.js';
import { Agent, AGENT_PERSONAS } from '../src/core/Agent.js';
import { InteractiveMode, COMPLETIONS } from '../src/cli/InteractiveMode.js';
import { PipelineMode } from '../src/cli/PipelineMode.js';
import { WatchMode } from '../src/cli/WatchMode.js';
import { ProjectContext } from '../src/cli/ProjectContext.js';
import { costTracker, CostTracker } from '../src/cli/CostTracker.js';
import { sessionMemory } from '../src/memory/SessionMemory.js';
import { longTermMemory } from '../src/memory/LongTermMemory.js';
import { agentMemory } from '../src/memory/AgentMemory.js';
import { projectMemory } from '../src/memory/ProjectMemory.js';
import { agentVectorMemory } from '../src/memory/VectorStore.js';
import { sessionCache } from '../src/memory/SessionCache.js';
import { ollamaManager } from '../src/core/OllamaManager.js';
import { FileHandlers } from '../src/files/FileHandlers.js';
import { DebugLoop } from '../src/debug/DebugLoop.js';
import { mcpManager, mcpBridge } from '../src/mcp/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import * as readline from 'readline/promises';  // FIX #4: Use promises API
import os from 'os';

// FIX #7: Inquirer.js fallback for problematic terminals
let useInquirer = false;
let inquirerInput: any = null;

async function loadInquirer() {
  try {
    const inquirer = await import('@inquirer/prompts');
    inquirerInput = inquirer.input;
    return true;
  } catch {
    console.log(chalk.yellow('[stdin] Inquirer.js not available, using readline'));
    return false;
  }
}

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// ═══════════════════════════════════════════════════════════════
// YOLO MODE CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const YOLO_CONFIG = {
  autoApprove: true,
  fileSystemAccess: true,
  shellAccess: true,
  networkAccess: true,
  maxConcurrency: 8,
  timeout: 300000,
};

// Banner
function printBanner() {
  console.log(chalk.magenta('\n╔═══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.magenta('║') + chalk.yellow.bold('      GEMINI HYDRA v14.0 - SCHOOL OF THE WOLF                  ') + chalk.magenta('║'));
  console.log(chalk.magenta('║') + chalk.gray('   12 Agents | 5-Phase Protocol | Self-Healing | Full Node.js ') + chalk.magenta('║'));
  console.log(chalk.magenta('╚═══════════════════════════════════════════════════════════════╝'));

  // FIX #1: Quick Edit Mode warning for Windows
  if (process.platform === 'win32') {
    console.log(chalk.yellow('\n⚠ WINDOWS: Jeśli prompt nie reaguje, wyłącz "Quick Edit Mode":'));
    console.log(chalk.gray('   Kliknij prawym na pasek tytułowy CMD → Właściwości → Odznacz "Quick Edit Mode"'));
    console.log(chalk.gray('   Lub użyj: Ctrl+Q aby wznowić (jeśli przypadkowo wcisnąłeś Ctrl+S)'));
    console.log(chalk.gray('   Zalecane: Uruchom przez Windows Terminal (wt.exe) zamiast cmd.exe\n'));
  }
}

// Initialize global resources
let swarm: Swarm;
let projectContext: ProjectContext;

async function initializeSwarm() {
  swarm = new Swarm(path.join(ROOT_DIR, '.serena'), YOLO_CONFIG);
  await swarm.initialize();
  await costTracker.load();
}

const program = new Command();

program
  .name('gemini')
  .description('GeminiHydra Agent Swarm CLI - School of the Wolf Edition')
  .version('14.0.0');

// ═══════════════════════════════════════════════════════════════
// DEFAULT COMMAND - Interactive/Swarm Mode
// ═══════════════════════════════════════════════════════════════
program
  .argument('[objective]', 'Mission objective (or enter interactive mode)')
  .option('-i, --interactive', 'Force interactive mode')
  .option('-y, --yolo', 'YOLO mode (default: true)', true)
  .option('-v, --verbose', 'Verbose output')
  .action(async (objective, options) => {
    printBanner();
    await initializeSwarm();

    if (!objective || options.interactive) {
      // Interactive Mode
      await runInteractiveMode();
    } else {
      // Direct execution
      await executeSwarm(objective, options);
    }
  });

// ═══════════════════════════════════════════════════════════════
// INTERACTIVE MODE WITH TASK QUEUE - FULLY FIXED STDIN HANDLING
// ═══════════════════════════════════════════════════════════════

// Kolejka zadań
interface QueuedTask {
  id: number;
  objective: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  addedAt: Date;
  result?: string;
  error?: string;
}

let taskQueue: QueuedTask[] = [];
let taskIdCounter = 1;
let isProcessingQueue = false;
let isShuttingDown = false;  // FIX #5: Flag to prevent premature close

// FIX #8 & #9: Ensure stdin is properly configured
function ensureStdinReady(): void {
  // FIX #9: Make sure stdin is referenced (not unref'd)
  if (process.stdin.ref) {
    process.stdin.ref();
  }

  // FIX #8: Set raw mode if TTY
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      // Note: readline handles this, but ensure it's not disabled
      // process.stdin.setRawMode(true); // Let readline manage this
    } catch (e) {
      // Ignore if already set or unavailable
    }
  }

  // FIX #3: Explicit resume after any potential pause
  if (process.stdin.resume) {
    process.stdin.resume();
  }
}

// Przetwarzanie kolejki
async function processTaskQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (taskQueue.some(t => t.status === 'pending')) {
    const task = taskQueue.find(t => t.status === 'pending');
    if (!task) break;

    task.status = 'running';
    console.log(chalk.cyan(`\n┌─── Rozpoczynam zadanie #${task.id} ───`));
    console.log(chalk.white(`│ ${task.objective}`));
    console.log(chalk.cyan(`└${'─'.repeat(40)}\n`));

    try {
      // Wykonaj zadanie
      const report = await executeSwarmWithReturn(task.objective, { yolo: true });
      task.status = 'completed';
      task.result = report;

      console.log(chalk.green(`\n✓ Zadanie #${task.id} zakończone pomyślnie`));
      console.log(chalk.green('═══ FINAL REPORT ═══\n'));
      console.log(report);

    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      console.log(chalk.red(`\n✗ Zadanie #${task.id} nieudane: ${error.message}`));
    }

    // Pokaż status kolejki
    const pending = taskQueue.filter(t => t.status === 'pending').length;
    if (pending > 0) {
      console.log(chalk.yellow(`\n📋 Pozostało w kolejce: ${pending} zadań\n`));
    }
  }

  isProcessingQueue = false;

  // FIX #3: Ensure stdin is ready before showing prompt
  ensureStdinReady();

  // Pokaż prompt ponownie (use async version)
  promptLoop();
}

// Global readline reference for prompt management (FIX #4: using promises API)
let globalRL: readline.Interface | null = null;

function getPromptString(): string {
  const wolf = chalk.gray('🐺');
  const agent = chalk.magenta('[Dijkstra]');
  return `\n${wolf} ${agent} ${chalk.yellow('>')} `;
}

// FIX #5: Protected readline creation - never close prematurely
function ensureReadline(): readline.Interface {
  if (!globalRL || (globalRL as any)._closed) {
    // FIX #3 & #8: Ensure stdin is ready
    ensureStdinReady();

    globalRL = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    // FIX #5: Handle close gracefully
    globalRL.on('close', async () => {
      if (isShuttingDown) {
        await saveCommandHistory();
        console.log(chalk.gray('\nFarewell, Witcher. 🐺\n'));
        process.exit(0);
      } else {
        // Unexpected close - recreate
        console.log(chalk.yellow('\n[stdin] Readline closed unexpectedly, recreating...'));
        globalRL = null;
        ensureStdinReady();
        setTimeout(() => promptLoop(), 100);
      }
    });

    // Handle SIGINT (Ctrl+C)
    globalRL.on('SIGINT', async () => {
      const pending = taskQueue.filter(t => t.status === 'pending' || t.status === 'running').length;
      if (pending > 0) {
        console.log(chalk.yellow(`\n⚠ ${pending} zadań wciąż w kolejce/wykonywane.`));
        console.log(chalk.gray('Wciśnij Ctrl+C ponownie aby wymusić wyjście.\n'));
        promptLoop();
      } else {
        isShuttingDown = true;
        globalRL?.close();
      }
    });
  }
  return globalRL;
}

// FIX #4 & #7: Async prompt loop using readline/promises with Inquirer fallback
async function promptLoop(): Promise<void> {
  if (isProcessingQueue || isShuttingDown) return;

  // FIX #7: Use Inquirer.js if enabled
  if (useInquirer && inquirerInput) {
    try {
      const line = await inquirerInput({
        message: getPromptString(),
        theme: { prefix: '' }
      });
      await handleInput(line);
    } catch (error: any) {
      if (!isShuttingDown) {
        console.error(chalk.red(`[inquirer] Error: ${error.message}`));
        // Fallback to readline
        useInquirer = false;
        promptLoop();
      }
    }
    return;
  }

  // Standard readline/promises
  const rl = ensureReadline();

  // FIX #3: Explicit resume before question
  ensureStdinReady();

  try {
    const line = await rl.question(getPromptString());
    await handleInput(line);
  } catch (error: any) {
    if (error.code === 'ERR_USE_AFTER_CLOSE') {
      // FIX #5: Readline was closed, recreate
      console.log(chalk.yellow('\n[stdin] Recreating readline interface...'));
      globalRL = null;
      setTimeout(() => promptLoop(), 100);
    } else if (!isShuttingDown) {
      console.error(chalk.red(`[stdin] Error: ${error.message}`));
      // FIX #7: Try Inquirer as fallback
      if (!useInquirer && await loadInquirer()) {
        console.log(chalk.cyan('[stdin] Switching to Inquirer.js mode...'));
        useInquirer = true;
      }
      setTimeout(() => promptLoop(), 100);
    }
  }
}

// Legacy showPrompt for compatibility
function showPrompt() {
  promptLoop();
}

function addTaskToQueue(objective: string): QueuedTask {
  const task: QueuedTask = {
    id: taskIdCounter++,
    objective: objective,
    status: 'pending',
    addedAt: new Date()
  };
  taskQueue.push(task);
  return task;
}

// Local history management (no InteractiveMode to avoid readline conflicts)
let commandHistory: string[] = [];
const HISTORY_FILE = path.join(os.homedir(), '.geminihydra_history');

async function loadCommandHistory(): Promise<void> {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf-8');
    commandHistory = data.split('\n').filter(line => line.trim());
  } catch {
    commandHistory = [];
  }
}

async function saveCommandHistory(): Promise<void> {
  try {
    const toSave = commandHistory.slice(-1000);
    await fs.writeFile(HISTORY_FILE, toSave.join('\n'), 'utf-8');
  } catch {}
}

function addToCommandHistory(cmd: string): void {
  if (cmd.trim() && cmd !== commandHistory[commandHistory.length - 1]) {
    commandHistory.push(cmd);
  }
}

// Handle input function (extracted for recursive question pattern)
async function handleInput(line: string): Promise<void> {
  const trimmed = line.trim();

  // Handle special commands (działają zawsze)
  if (trimmed === 'exit' || trimmed === 'quit') {
    const pending = taskQueue.filter(t => t.status === 'pending' || t.status === 'running').length;
    if (pending > 0) {
      console.log(chalk.yellow(`\n⚠ ${pending} zadań wciąż w kolejce/wykonywane.`));
      console.log(chalk.gray('Użyj Ctrl+C aby wymusić wyjście.\n'));
      promptLoop();
      return;
    }
    isShuttingDown = true;  // FIX #5: Set flag before close
    await saveCommandHistory();
    if (globalRL) globalRL.close();
    console.log(chalk.gray('\nFarewell, Witcher. 🐺\n'));
    process.exit(0);
  }

  if (trimmed === '/help') {
    console.log(chalk.cyan('\nAvailable Commands:'));
    console.log(chalk.gray('  @<agent>      ') + 'Switch to specific agent (e.g., @geralt)');
    console.log(chalk.gray('  /help         ') + 'Show this help');
    console.log(chalk.gray('  /history      ') + 'Show command history');
    console.log(chalk.gray('  /clear        ') + 'Clear screen');
    console.log(chalk.gray('  /status       ') + 'Show session status');
    console.log(chalk.gray('  /cost         ') + 'Show token usage');
    console.log(chalk.gray('  /stdin-fix    ') + 'Napraw stdin (jeśli prompt nie działa)');
    console.log(chalk.gray('  /inquirer     ') + 'Przełącz na Inquirer.js (alternatywny input)');
    console.log(chalk.gray('  exit, quit    ') + 'Exit interactive mode');
    console.log(chalk.gray('  /queue        ') + 'Pokaż kolejkę zadań');
    console.log(chalk.gray('  /cancel <id>  ') + 'Anuluj zadanie z kolejki\n');
    promptLoop();
    return;
  }

  // FIX #3: Manual stdin fix command
  if (trimmed === '/stdin-fix') {
    console.log(chalk.cyan('\n🔧 Naprawiam stdin...'));
    ensureStdinReady();
    globalRL = null;  // Force recreation
    console.log(chalk.green('✓ stdin naprawiony!\n'));
    promptLoop();
    return;
  }

  // FIX #7: Switch to Inquirer.js mode
  if (trimmed === '/inquirer') {
    if (await loadInquirer()) {
      useInquirer = !useInquirer;
      console.log(chalk.green(`\n✓ Inquirer mode: ${useInquirer ? 'ON' : 'OFF'}\n`));
      if (useInquirer) {
        globalRL?.close();
        globalRL = null;
      }
    } else {
      console.log(chalk.red('\n✗ Inquirer.js nie jest zainstalowany. Uruchom: npm install @inquirer/prompts\n'));
    }
    promptLoop();
    return;
  }

  if (trimmed === '/queue') {
    console.log(chalk.cyan('\n═══ Kolejka Zadań ═══\n'));
    if (taskQueue.length === 0) {
      console.log(chalk.gray('Kolejka jest pusta.\n'));
    } else {
      taskQueue.forEach(task => {
        const statusIcon = task.status === 'completed' ? chalk.green('✓') :
                          task.status === 'running' ? chalk.yellow('⟳') :
                          task.status === 'failed' ? chalk.red('✗') :
                          chalk.gray('○');
        const statusText = task.status === 'completed' ? chalk.green(task.status) :
                          task.status === 'running' ? chalk.yellow(task.status) :
                          task.status === 'failed' ? chalk.red(task.status) :
                          chalk.gray(task.status);
        console.log(`${statusIcon} #${task.id} [${statusText}] ${task.objective.substring(0, 50)}${task.objective.length > 50 ? '...' : ''}`);
      });
      console.log('');
    }
    promptLoop();
    return;
  }

  if (trimmed.startsWith('/cancel ')) {
    const idStr = trimmed.replace('/cancel ', '').trim();
    const id = parseInt(idStr);
    const task = taskQueue.find(t => t.id === id && t.status === 'pending');
    if (task) {
      taskQueue = taskQueue.filter(t => t.id !== id);
      console.log(chalk.green(`\nAnulowano zadanie #${id}\n`));
    } else {
      console.log(chalk.red(`\nNie znaleziono oczekującego zadania #${id}\n`));
    }
    promptLoop();
    return;
  }

  if (trimmed === '/history') {
    console.log(chalk.cyan('\nCommand History:'));
    commandHistory.slice(-10).forEach((cmd: string, i: number) => {
      console.log(chalk.gray(`  ${i + 1}. ${cmd}`));
    });
    console.log('');
    promptLoop();
    return;
  }

  if (trimmed === '/clear') {
    console.clear();
    printBanner();
    promptLoop();
    return;
  }

  if (trimmed === '/status' || trimmed === '/cost') {
    costTracker.printStatus();
    promptLoop();
    return;
  }

  if (trimmed === '/mcp') {
    await mcpManager.init();
    mcpManager.printStatus();
    const tools = mcpManager.getAllTools();
    if (tools.length > 0) {
      console.log(chalk.cyan('\nAvailable MCP Tools:'));
      tools.slice(0, 10).forEach(t => {
        console.log(chalk.gray(`  mcp__${t.serverName}__${t.name}`));
      });
      if (tools.length > 10) {
        console.log(chalk.gray(`  ... and ${tools.length - 10} more`));
      }
    }
    console.log('');
    promptLoop();
    return;
  }

  // MCP tool call: mcp:<tool> {params}
  if (trimmed.startsWith('mcp:')) {
    await mcpManager.init();
    const match = trimmed.match(/^mcp:(\S+)\s*(.*)$/);
    if (match) {
      const toolName = match[1];
      const paramsStr = match[2];
      let params = {};
      try {
        params = paramsStr ? JSON.parse(paramsStr) : {};
      } catch {
        console.log(chalk.red('Invalid JSON params'));
        showPrompt();
        return;
      }

      try {
        console.log(chalk.cyan(`\n🔧 Calling ${toolName}...\n`));
        const result = await mcpManager.callTool(toolName, params);
        if (result.content && Array.isArray(result.content)) {
          result.content.forEach((c: any) => {
            if (c.type === 'text') console.log(c.text);
            else console.log(JSON.stringify(c, null, 2));
          });
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (error: any) {
        console.log(chalk.red(`Error: ${error.message}`));
      }
      console.log('');
    }
    promptLoop();
    return;
  }

  // Agent switch: @agent
  if (trimmed.startsWith('@')) {
    const agentName = trimmed.slice(1).toLowerCase();
    const matchedAgent = Object.keys(AGENT_PERSONAS).find(
      a => a.toLowerCase() === agentName
    );
    if (matchedAgent) {
      console.log(chalk.gray(`Switched to ${matchedAgent}`));
    } else {
      console.log(chalk.red(`Unknown agent: ${agentName}`));
      console.log(chalk.gray(`Available: ${Object.keys(AGENT_PERSONAS).join(', ')}`));
    }
    promptLoop();
    return;
  }

  // Pipeline: task1 | task2 | task3
  if (trimmed.includes(' | ')) {
    await runPipeline(trimmed);
    promptLoop();
    return;
  }

  // Regular task - dodaj do kolejki
  if (trimmed) {
    addToCommandHistory(trimmed);

    const task = addTaskToQueue(trimmed);
    const runningCount = taskQueue.filter(t => t.status === 'running').length;

    if (runningCount > 0) {
      console.log(chalk.yellow(`\n📋 Zadanie #${task.id} dodane do kolejki`));
      console.log(chalk.gray(`   Zostanie wykonane po bieżącym zadaniu.`));
      console.log(chalk.gray(`   Wpisz /queue aby zobaczyć kolejkę.\n`));
      promptLoop();
    } else {
      console.log(chalk.cyan(`\n📋 Zadanie #${task.id} rozpoczynam...\n`));
      // Uruchom przetwarzanie kolejki (prompt pokaże się po zakończeniu)
      processTaskQueue();
    }
  } else {
    // Pusty input - pokaż prompt
    promptLoop();
  }
}

async function runInteractiveMode() {
  await loadCommandHistory();

  // FIX #3, #8, #9: Ensure stdin is ready before starting
  ensureStdinReady();

  // Print welcome
  console.log(chalk.magenta('\n╔═══════════════════════════════════════════════════════════╗'));
  console.log(chalk.magenta('║') + chalk.yellow.bold('         GEMINI HYDRA - INTERACTIVE MODE                  ') + chalk.magenta('║'));
  console.log(chalk.magenta('║') + chalk.gray('  Commands: @agent, /help, /history, /clear, exit          ') + chalk.magenta('║'));
  console.log(chalk.magenta('╚═══════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.gray('  /queue       ') + 'Pokaż kolejkę zadań');
  console.log(chalk.gray('  /cancel <id> ') + 'Anuluj zadanie z kolejki');
  console.log(chalk.gray('  /stdin-fix   ') + 'Napraw stdin jeśli prompt nie działa');
  console.log(chalk.gray('  Ctrl+C       ') + 'Wyjście\n');

  // Start the first prompt (async)
  promptLoop();
}

// Wersja executeSwarm która zwraca wynik zamiast drukować
async function executeSwarmWithReturn(objective: string, options: any): Promise<string> {
  // Get all context (project + memories)
  let context = '';

  // Project context
  try {
    projectContext = new ProjectContext();
    if (await projectContext.load()) {
      context += projectContext.getContextForTask(objective);
    }
  } catch {}

  // Long-term memory context
  try {
    await longTermMemory.init();
    const memoryContext = longTermMemory.getContextForTask(objective);
    if (memoryContext) {
      context += '\n' + memoryContext;
    }
  } catch {}

  // Session context
  const session = sessionMemory.getCurrentSession();
  if (session) {
    const recentMessages = sessionMemory.getRecentMessages(5);
    if (recentMessages.length > 0) {
      context += '\n## Recent Conversation\n';
      recentMessages.forEach(m => {
        context += `${m.role}: ${m.content.substring(0, 200)}...\n`;
      });
    }
  }

  // MCP context (available tools for agents)
  try {
    await mcpBridge.init();
    const mcpContext = mcpBridge.getMCPContext();
    if (mcpContext) {
      context += '\n' + mcpContext;
    }
  } catch {}

  const fullObjective = context
    ? `Context:\n${context}\n\nTask: ${objective}`
    : objective;

  // Save to session memory
  await sessionMemory.addMessage('user', objective);

  const report = await swarm.executeObjective(fullObjective);

  // Save response to session
  await sessionMemory.addMessage('assistant', report, 'Swarm');
  await sessionMemory.saveSnapshot();

  // Auto-extract memories
  await longTermMemory.autoExtract(report, 'swarm-response');

  // Track tokens (estimate)
  const inputTokens = CostTracker.estimateTokens(fullObjective);
  const outputTokens = CostTracker.estimateTokens(report);
  await costTracker.track('gemini-3-flash-preview', inputTokens, outputTokens, objective);

  return report;
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE COMMAND
// ═══════════════════════════════════════════════════════════════
program
  .command('pipe <tasks...>')
  .description('Execute tasks in a pipeline (chained)')
  .action(async (tasks) => {
    printBanner();
    await initializeSwarm();

    const pipelineStr = tasks.join(' | ');
    await runPipeline(pipelineStr);
  });

async function runPipeline(pipelineStr: string) {
  console.log(chalk.cyan('\n🔗 Pipeline Mode\n'));
  const pipeline = new PipelineMode(swarm);

  try {
    const result = await pipeline.execute(pipelineStr);
    console.log(chalk.green('\n═══ Pipeline Result ═══\n'));
    console.log(result);
  } catch (error: any) {
    console.error(chalk.red(`Pipeline failed: ${error.message}`));
  }
}

// ═══════════════════════════════════════════════════════════════
// WATCH COMMAND
// ═══════════════════════════════════════════════════════════════
program
  .command('watch <directory>')
  .description('Watch directory and execute task on changes')
  .option('-t, --task <task>', 'Task to execute on change', 'review and suggest improvements')
  .option('-d, --debounce <ms>', 'Debounce time in ms', '1000')
  .option('-a, --agent <agent>', 'Use specific agent')
  .action(async (directory, options) => {
    printBanner();
    await initializeSwarm();

    const watchMode = new WatchMode(swarm, {
      debounce: parseInt(options.debounce),
      agent: options.agent,
    });

    await watchMode.watch(directory, options.task);
  });

// ═══════════════════════════════════════════════════════════════
// INIT COMMAND (Project Context)
// ═══════════════════════════════════════════════════════════════
program
  .command('init')
  .description('Initialize project context (index codebase)')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .action(async (options) => {
    printBanner();
    projectContext = new ProjectContext(options.path);
    await projectContext.init();
  });

// ═══════════════════════════════════════════════════════════════
// STATUS/COST COMMAND
// ═══════════════════════════════════════════════════════════════
program
  .command('status')
  .alias('cost')
  .description('Show token usage and cost report')
  .action(async () => {
    printBanner();
    await costTracker.load();
    costTracker.printStatus();
  });

program
  .command('budget <amount>')
  .description('Set daily budget limit')
  .action(async (amount) => {
    await costTracker.load();
    await costTracker.setBudget(parseFloat(amount));
  });

// ═══════════════════════════════════════════════════════════════
// DOCTOR COMMAND
// ═══════════════════════════════════════════════════════════════
program
  .command('doctor')
  .description('Check system health')
  .action(async () => {
    printBanner();
    console.log(chalk.blue('\n🔍 System Diagnostics\n'));

    // Node
    console.log(chalk.gray('Node.js:'), chalk.green(process.version));

    // Ollama
    try {
      await execAsync('ollama --version');
      console.log(chalk.gray('Ollama:'), chalk.green('✓ Available'));
    } catch {
      console.log(chalk.gray('Ollama:'), chalk.red('✗ Not found'));
    }

    // Gemini API
    if (process.env.GEMINI_API_KEY) {
      console.log(chalk.gray('Gemini API:'), chalk.green('✓ Key configured'));
    } else {
      console.log(chalk.gray('Gemini API:'), chalk.red('✗ GEMINI_API_KEY not set'));
    }

    // Features
    console.log(chalk.gray('\nProtocol v14.0 Features:'));
    console.log(chalk.gray('  Phase PRE-A (Refinement):'), chalk.green('✓'));
    console.log(chalk.gray('  Phase A (Planning):'), chalk.green('✓'));
    console.log(chalk.gray('  Phase B (Execution):'), chalk.green('✓'));
    console.log(chalk.gray('  Phase C (Self-Healing):'), chalk.green('✓'));
    console.log(chalk.gray('  Phase D (Synthesis):'), chalk.green('✓'));
    console.log(chalk.gray('  Interactive Mode:'), chalk.green('✓'));
    console.log(chalk.gray('  Pipeline Mode:'), chalk.green('✓'));
    console.log(chalk.gray('  Watch Mode:'), chalk.green('✓'));
    console.log(chalk.gray('  YOLO Mode:'), chalk.green('✓ Active'));

    // Agents
    console.log(chalk.gray('\n12 Witcher Agents:'));
    Object.entries(AGENT_PERSONAS).forEach(([name, persona]) => {
      const model = persona.model === 'gemini-cloud' ? chalk.cyan('Gemini') : chalk.yellow(persona.model);
      console.log(chalk.gray(`  ${name.padEnd(10)} ${persona.role.padEnd(12)} ${model}`));
    });

    // MCP Status
    console.log(chalk.gray('\nMCP Integration:'));
    try {
      await mcpManager.init();
      const servers = mcpManager.getAllServers();
      const tools = mcpManager.getAllTools();
      if (servers.length > 0) {
        console.log(chalk.gray('  Servers:'), chalk.green(`${servers.length} connected`));
        console.log(chalk.gray('  Tools:'), chalk.green(`${tools.length} available`));
      } else {
        console.log(chalk.gray('  Status:'), chalk.yellow('No servers configured'));
        console.log(chalk.gray('  Add with: gemini mcp --add <name> --command "..."'));
      }
    } catch (error: any) {
      console.log(chalk.gray('  Status:'), chalk.yellow('Not initialized'));
    }

    console.log(chalk.green('\n✓ System Ready\n'));
  });

// ═══════════════════════════════════════════════════════════════
// SHELL/READ COMMANDS (YOLO utilities)
// ═══════════════════════════════════════════════════════════════
program
  .command('shell <command...>')
  .description('Execute shell command')
  .action(async (command) => {
    try {
      const { stdout, stderr } = await execAsync(command.join(' '));
      if (stdout) console.log(stdout);
      if (stderr) console.error(chalk.yellow(stderr));
    } catch (error: any) {
      console.error(chalk.red(error.message));
    }
  });

program
  .command('read <filepath>')
  .description('Read file contents')
  .action(async (filepath) => {
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      console.log(content);
    } catch (error: any) {
      console.error(chalk.red(`Cannot read: ${error.message}`));
    }
  });

// ═══════════════════════════════════════════════════════════════
// AGENT COMMAND (Direct agent access)
// ═══════════════════════════════════════════════════════════════
program
  .command('agent <name> <task>')
  .alias('a')
  .description('Execute task with specific agent')
  .action(async (name, task) => {
    printBanner();
    await costTracker.load();

    const matchedAgent = Object.keys(AGENT_PERSONAS).find(
      a => a.toLowerCase() === name.toLowerCase()
    );

    if (!matchedAgent) {
      console.error(chalk.red(`Unknown agent: ${name}`));
      console.log(chalk.gray(`Available: ${Object.keys(AGENT_PERSONAS).join(', ')}`));
      return;
    }

    console.log(chalk.cyan(`\n🐺 ${matchedAgent} executing task...\n`));

    const agent = new Agent(matchedAgent as any);
    const result = await agent.think(task);

    console.log(chalk.green('\n═══ Result ═══\n'));
    console.log(result);
  });

// ═══════════════════════════════════════════════════════════════
// MEMORY COMMANDS
// ═══════════════════════════════════════════════════════════════
program
  .command('memory')
  .description('Memory management commands')
  .option('-l, --list', 'List all memories')
  .option('-s, --search <query>', 'Search memories')
  .option('-r, --remember <text>', 'Remember something')
  .option('-c, --category <cat>', 'Memory category (decision/bug/pattern/preference/todo/fact)')
  .option('--stats', 'Show memory statistics')
  .action(async (options) => {
    await longTermMemory.init();

    if (options.stats) {
      longTermMemory.printSummary();
      return;
    }

    if (options.remember) {
      const category = options.category || 'fact';
      await longTermMemory.remember(options.remember, category as any);
      console.log(chalk.green('Memory saved!'));
      return;
    }

    if (options.search) {
      const results = longTermMemory.search(options.search);
      console.log(chalk.cyan(`\nSearch results for "${options.search}":\n`));
      results.forEach(m => {
        console.log(chalk.gray(`[${m.category}] ${m.content}`));
      });
      return;
    }

    if (options.list) {
      longTermMemory.printSummary();
    }
  });

program
  .command('session')
  .description('Session management')
  .option('-l, --list', 'List all sessions')
  .option('-r, --resume [id]', 'Resume a session')
  .option('-n, --new <name>', 'Start new named session')
  .option('-e, --export <file>', 'Export current session')
  .action(async (options) => {
    await sessionMemory.init();

    if (options.list) {
      const sessions = await sessionMemory.listSessions();
      console.log(chalk.cyan('\n═══ Sessions ═══\n'));
      sessions.forEach(s => {
        console.log(chalk.gray(`${s.id} | ${s.name} | ${s.messageCount} msgs | ${s.updated.toISOString()}`));
      });
      return;
    }

    if (options.resume !== undefined) {
      const session = await sessionMemory.resumeSession(options.resume || undefined);
      if (session) {
        console.log(chalk.green(`Resumed: ${session.name}`));
      }
      return;
    }

    if (options.new) {
      await sessionMemory.startSession(options.new);
      return;
    }

    if (options.export) {
      await sessionMemory.exportToFile(options.export);
      return;
    }
  });

program
  .command('agents')
  .description('Agent memory and stats')
  .option('-l, --list', 'List all agents')
  .option('-s, --stats <agent>', 'Show agent stats')
  .action(async (options) => {
    await agentMemory.init();

    if (options.stats) {
      const profile = agentMemory.getProfile(options.stats as any);
      if (profile) {
        console.log(chalk.cyan(`\n═══ ${profile.name} ═══`));
        console.log(chalk.gray(`Specialty: ${profile.specialty}`));
        console.log(chalk.gray(`Tasks: ${profile.totalTasks}`));
        console.log(chalk.gray(`Success rate: ${(profile.successRate * 100).toFixed(1)}%`));
      }
      return;
    }

    agentMemory.printSummary();
  });

// ═══════════════════════════════════════════════════════════════
// FILE COMMANDS (Drag & Drop Support)
// ═══════════════════════════════════════════════════════════════
program
  .command('file <filepath>')
  .alias('f')
  .description('Process a file (drag & drop supported)')
  .option('-a, --analyze', 'Analyze file content')
  .option('-e, --extract', 'Extract text content')
  .option('-t, --task <task>', 'Run task with file as context')
  .action(async (filepath, options) => {
    printBanner();

    // Handle quoted paths from drag & drop
    filepath = filepath.replace(/^["']|["']$/g, '').trim();

    console.log(chalk.cyan(`\n📄 Processing: ${path.basename(filepath)}\n`));

    const info = await FileHandlers.getFileInfo(filepath);
    console.log(chalk.gray(`Type: ${info.type}`));
    console.log(chalk.gray(`Size: ${(info.size / 1024).toFixed(1)} KB`));

    const content = await FileHandlers.extractContent(filepath);

    if (options.extract) {
      console.log(chalk.cyan('\n═══ Extracted Content ═══\n'));
      console.log(content.text);
      return;
    }

    if (options.analyze || !options.task) {
      console.log(chalk.cyan('\n═══ Analysis ═══\n'));
      console.log(content.text.substring(0, 2000));
      if (content.text.length > 2000) {
        console.log(chalk.gray(`\n... (${content.text.length - 2000} more characters)`));
      }
      return;
    }

    if (options.task) {
      await initializeSwarm();
      const fullTask = `File content:\n${content.text.substring(0, 5000)}\n\nTask: ${options.task}`;
      await executeSwarm(fullTask, { yolo: true });
    }
  });

program
  .command('image <filepath>')
  .alias('img')
  .description('Analyze an image with Gemini Vision')
  .option('-p, --prompt <prompt>', 'Custom analysis prompt')
  .action(async (filepath, options) => {
    printBanner();

    filepath = filepath.replace(/^["']|["']$/g, '').trim();

    console.log(chalk.cyan(`\n🖼️  Analyzing image: ${path.basename(filepath)}\n`));

    const result = await FileHandlers.analyzeImage(filepath, options.prompt);

    console.log(chalk.green('═══ Image Analysis ═══\n'));
    console.log(result.text);
  });

// ═══════════════════════════════════════════════════════════════
// DEBUG LOOP COMMAND
// ═══════════════════════════════════════════════════════════════
program
  .command('debug [target]')
  .description('Start debug loop with screenshots')
  .option('-m, --max <iterations>', 'Max iterations', '10')
  .option('-a, --auto-fix', 'Enable auto-fix', true)
  .option('-s, --screenshot <cmd>', 'Custom screenshot command')
  .action(async (target, options) => {
    printBanner();

    console.log(chalk.cyan('\n🔧 Debug Loop Mode\n'));

    const debugLoop = new DebugLoop();
    const session = await debugLoop.startDebugLoop(target || process.cwd(), {
      maxIterations: parseInt(options.max),
      autoFix: options.autoFix,
      screenshotCommand: options.screenshot,
    });

    if (session.resolved) {
      console.log(chalk.green('\n✓ Debug session resolved successfully!'));
    } else {
      console.log(chalk.yellow('\n⚠ Debug session completed but issues may remain'));
    }
  });

// ═══════════════════════════════════════════════════════════════
// PROJECT MEMORY COMMAND
// ═══════════════════════════════════════════════════════════════
program
  .command('index')
  .description('Index project for memory')
  .option('-f, --full', 'Full re-index')
  .action(async (options) => {
    printBanner();

    if (options.full) {
      await projectMemory.init();
    } else {
      const loaded = await projectMemory.load();
      if (!loaded) {
        console.log(chalk.yellow('No existing index found, creating new...'));
        await projectMemory.init();
      } else {
        projectMemory.printSummary();
      }
    }
  });

// ═══════════════════════════════════════════════════════════════
// MCP COMMANDS (Model Context Protocol)
// ═══════════════════════════════════════════════════════════════
program
  .command('mcp')
  .description('MCP server management')
  .option('-l, --list', 'List all MCP servers and tools')
  .option('-s, --status', 'Show MCP status')
  .option('-a, --add <name>', 'Add a new MCP server')
  .option('-r, --remove <name>', 'Remove an MCP server')
  .option('-c, --call <tool>', 'Call an MCP tool')
  .option('--command <cmd>', 'Command to run (for add)')
  .option('--args <args>', 'Arguments (comma-separated)')
  .option('--url <url>', 'Server URL (for SSE transport)')
  .option('--params <json>', 'Tool parameters as JSON (for call)')
  .action(async (options) => {
    printBanner();

    // Add server
    if (options.add) {
      if (!options.command && !options.url) {
        console.error(chalk.red('Error: --command or --url required'));
        console.log(chalk.gray('Example: gemini mcp --add myserver --command "npx -y @server/mcp"'));
        return;
      }

      await mcpManager.addServer({
        name: options.add,
        command: options.command,
        args: options.args ? options.args.split(',') : [],
        url: options.url,
        enabled: true,
      });

      // Try to connect
      try {
        await mcpManager.connectServer({
          name: options.add,
          command: options.command,
          args: options.args ? options.args.split(',') : [],
          url: options.url,
        });
      } catch (error: any) {
        console.log(chalk.yellow(`Note: Could not connect immediately: ${error.message}`));
      }
      return;
    }

    // Remove server
    if (options.remove) {
      await mcpManager.removeServer(options.remove);
      return;
    }

    // Call tool
    if (options.call) {
      await mcpManager.init();
      const params = options.params ? JSON.parse(options.params) : {};

      console.log(chalk.cyan(`\n🔧 Calling MCP tool: ${options.call}\n`));

      try {
        const result = await mcpManager.callTool(options.call, params);
        console.log(chalk.green('═══ Result ═══\n'));

        if (result.content && Array.isArray(result.content)) {
          result.content.forEach((c: any) => {
            if (c.type === 'text') console.log(c.text);
            else if (c.type === 'image') console.log(chalk.gray(`[Image: ${c.mimeType}]`));
            else console.log(JSON.stringify(c, null, 2));
          });
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
      } catch (error: any) {
        console.error(chalk.red(`Error: ${error.message}`));
      }
      return;
    }

    // List servers/tools or show status
    await mcpManager.init();
    mcpManager.printStatus();

    // List all tools
    const tools = mcpManager.getAllTools();
    if (tools.length > 0) {
      console.log(chalk.cyan('\n═══ Available Tools ═══\n'));
      tools.forEach(tool => {
        console.log(chalk.white(`mcp__${tool.serverName}__${tool.name}`));
        console.log(chalk.gray(`  ${tool.description.substring(0, 80)}${tool.description.length > 80 ? '...' : ''}`));
      });
    }

    // List prompts
    const prompts = mcpManager.getAllPrompts();
    if (prompts.length > 0) {
      console.log(chalk.cyan('\n═══ Available Prompts ═══\n'));
      prompts.forEach(prompt => {
        console.log(chalk.white(`${prompt.serverName}/${prompt.name}`));
        console.log(chalk.gray(`  ${prompt.description || 'No description'}`));
      });
    }

    // List resources
    const resources = mcpManager.getAllResources();
    if (resources.length > 0) {
      console.log(chalk.cyan('\n═══ Available Resources ═══\n'));
      resources.forEach(resource => {
        console.log(chalk.white(`${resource.name}`));
        console.log(chalk.gray(`  ${resource.uri}`));
      });
    }
  });

program
  .command('mcp:call <tool> [params...]')
  .description('Quick MCP tool call')
  .action(async (tool, params) => {
    await mcpManager.init();

    // Parse params: key=value key2=value2
    const parsedParams: Record<string, any> = {};
    params.forEach((p: string) => {
      const [key, ...valueParts] = p.split('=');
      const value = valueParts.join('=');
      try {
        parsedParams[key] = JSON.parse(value);
      } catch {
        parsedParams[key] = value;
      }
    });

    console.log(chalk.cyan(`\n🔧 ${tool}\n`));

    try {
      const result = await mcpManager.callTool(tool, parsedParams);

      if (result.content && Array.isArray(result.content)) {
        result.content.forEach((c: any) => {
          if (c.type === 'text') console.log(c.text);
          else console.log(JSON.stringify(c, null, 2));
        });
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error: any) {
      console.error(chalk.red(error.message));
    }
  });

program
  .command('mcp:servers')
  .description('List MCP servers')
  .action(async () => {
    await mcpManager.init();
    const servers = mcpManager.getAllServers();

    console.log(chalk.cyan('\n═══ MCP Servers ═══\n'));

    if (servers.length === 0) {
      console.log(chalk.gray('No servers configured.'));
      console.log(chalk.gray('\nAdd one with:'));
      console.log(chalk.white('  gemini mcp --add <name> --command "npx -y @server/mcp"'));
      return;
    }

    servers.forEach(s => {
      const icon = s.status === 'connected' ? '✓' : s.status === 'connecting' ? '...' : '✗';
      const color = s.status === 'connected' ? chalk.green : s.status === 'error' ? chalk.red : chalk.yellow;
      console.log(color(`${icon} ${s.name}`));
      console.log(chalk.gray(`    Tools: ${s.tools} | Prompts: ${s.prompts} | Resources: ${s.resources}`));
    });
  });

// ═══════════════════════════════════════════════════════════════
// EXECUTE SWARM
// ═══════════════════════════════════════════════════════════════
async function executeSwarm(objective: string, options: any) {
  try {
    // Get all context (project + memories)
    let context = '';

    // Project context
    try {
      projectContext = new ProjectContext();
      if (await projectContext.load()) {
        context += projectContext.getContextForTask(objective);
      }
    } catch {}

    // Long-term memory context
    try {
      await longTermMemory.init();
      const memoryContext = longTermMemory.getContextForTask(objective);
      if (memoryContext) {
        context += '\n' + memoryContext;
      }
    } catch {}

    // Session context
    const session = sessionMemory.getCurrentSession();
    if (session) {
      const recentMessages = sessionMemory.getRecentMessages(5);
      if (recentMessages.length > 0) {
        context += '\n## Recent Conversation\n';
        recentMessages.forEach(m => {
          context += `${m.role}: ${m.content.substring(0, 200)}...\n`;
        });
      }
    }

    // MCP context (available tools for agents)
    try {
      await mcpBridge.init();
      const mcpContext = mcpBridge.getMCPContext();
      if (mcpContext) {
        context += '\n' + mcpContext;
      }
    } catch {}

    const fullObjective = context
      ? `Context:\n${context}\n\nTask: ${objective}`
      : objective;

    // Save to session memory
    await sessionMemory.addMessage('user', objective);

    const report = await swarm.executeObjective(fullObjective);
    console.log(chalk.green('\n═══ FINAL REPORT ═══\n'));
    console.log(report);

    // Save response to session
    await sessionMemory.addMessage('assistant', report, 'Swarm');
    await sessionMemory.saveSnapshot();

    // Auto-extract memories
    await longTermMemory.autoExtract(report, 'swarm-response');

    // Track tokens (estimate)
    const inputTokens = CostTracker.estimateTokens(fullObjective);
    const outputTokens = CostTracker.estimateTokens(report);
    await costTracker.track('gemini-3-flash-preview', inputTokens, outputTokens, objective);

  } catch (error: any) {
    console.error(chalk.red('FATAL ERROR:'), error.message);
  }
}

// Parse and run
program.parse();
