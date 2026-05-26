// ============================================================
// Piston API Wrapper — TRUE Piston (emkc.org/api/v2/piston)
// Free, unlimited, no API key required, self-hostable
// Docs: https://piston.readthedocs.io/en/latest/api-v2/
// ============================================================

import type { Language } from '@/types';

const PISTON_BASE = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';
const DEFAULT_TIMEOUT_MS = 10_000;

// -----------------------------------------------
// Supported Languages
// -----------------------------------------------
export const LANGUAGES: Language[] = [
  { id: 'cpp',        version: '10.2.0',   displayName: 'C++17',       monacoLanguage: 'cpp',        judgeId: 54 },
  { id: 'c',          version: '10.2.0',   displayName: 'C',           monacoLanguage: 'c',          judgeId: 50 },
  { id: 'python',     version: '3.10.0',   displayName: 'Python 3',    monacoLanguage: 'python',     judgeId: 71 },
  { id: 'java',       version: '15.0.2',   displayName: 'Java',        monacoLanguage: 'java',       judgeId: 62 },
  { id: 'javascript', version: '18.15.0',  displayName: 'JavaScript',  monacoLanguage: 'javascript', judgeId: 63 },
  { id: 'go',         version: '1.16.2',   displayName: 'Go',          monacoLanguage: 'go',         judgeId: 60 },
];

export function getLanguageById(id: string): Language | undefined {
  return LANGUAGES.find((l) => l.id === id);
}

// -----------------------------------------------
// Source file names per language
// -----------------------------------------------
const FILE_NAMES: Record<string, string> = {
  cpp:        'solution.cpp',
  c:          'solution.c',
  python:     'solution.py',
  java:       'Main.java',
  javascript: 'solution.js',
  go:         'solution.go',
};

// -----------------------------------------------
// Starter templates
// -----------------------------------------------
export const STARTER_CODE: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    
    return 0;
}
`,
  c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Write your solution here
    return 0;
}
`,
  python: `import sys
input = sys.stdin.readline

def solve():
    # Write your solution here
    pass

solve()
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // Write your solution here
    }
}
`,
  javascript: `const lines = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split('\\n');
let idx = 0;
const rl = () => lines[idx++];

// Write your solution here
`,
  go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

var reader = bufio.NewReader(os.Stdin)

func main() {
    // Write your solution here
    fmt.Println()
}
`,
};

// -----------------------------------------------
// Types
// -----------------------------------------------
export interface PistonResult {
  success:    boolean;
  output:     string;
  stderr:     string;
  exit_code:  number;
  runtime_ms: number;
  verdict?:   'AC' | 'TLE' | 'RE' | 'CE' | 'JUDGE_ERROR';
  error?:     string;
}

// -----------------------------------------------
// Fallback code execution using public Judge0 CE API
// -----------------------------------------------
export async function executeJudge0(
  code:      string,
  language:  string,
  stdin:     string = '',
  timeLimitMs: number = 5000,
): Promise<PistonResult> {
  const lang = getLanguageById(language);
  if (!lang || !lang.judgeId) {
    return { success: false, output: '', stderr: '', exit_code: -1, runtime_ms: 0, verdict: 'JUDGE_ERROR', error: `Unsupported language for Judge0: ${language}` };
  }

  const startTime = Date.now();
  try {
    const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: lang.judgeId,
        stdin: stdin,
        cpu_time_limit: Math.max(1, Math.min(15, timeLimitMs / 1000)),
      })
    });

    const elapsed = Date.now() - startTime;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        success: false, output: '', stderr: body, exit_code: -1,
        runtime_ms: elapsed, verdict: 'JUDGE_ERROR',
        error: `Judge0 API returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const statusId = data.status?.id || 3;
    const stdout = (data.stdout || '').trim();
    const stderr = (data.stderr || '').trim();
    const compileOutput = (data.compile_output || '').trim();
    const exitCode = data.exit_code ?? 0;
    const timeSec = parseFloat(data.time || '0');
    const runtimeMs = Math.round(timeSec * 1000) || elapsed;

    // Status: 3 - Accepted (AC)
    if (statusId === 3) {
      return {
        success: true,
        output: stdout,
        stderr: stderr,
        exit_code: 0,
        runtime_ms: runtimeMs,
      };
    }

    // Status: 6 - Compilation Error (CE)
    if (statusId === 6) {
      return {
        success: false, output: '', stderr: compileOutput || stderr || 'Compilation failed',
        exit_code: exitCode || -1, runtime_ms: runtimeMs, verdict: 'CE',
        error: compileOutput || stderr || 'Compilation failed',
      };
    }

    // Status: 5 - Time Limit Exceeded (TLE)
    if (statusId === 5) {
      return {
        success: false, output: stdout, stderr: stderr || 'Time Limit Exceeded',
        exit_code: exitCode || -1, runtime_ms: runtimeMs, verdict: 'TLE',
        error: 'Time Limit Exceeded',
      };
    }

    // Status: 7 to 12 - Runtime Errors (RE)
    if (statusId >= 7 && statusId <= 12) {
      return {
        success: false, output: stdout, stderr: stderr || data.message || `Runtime Error (Status ${statusId})`,
        exit_code: exitCode || -1, runtime_ms: runtimeMs, verdict: 'RE',
        error: stderr || data.message || `Runtime error (Status ${statusId})`,
      };
    }

    // Default error
    return {
      success: false, output: stdout, stderr: stderr || data.message || 'Execution failed',
      exit_code: exitCode || -1, runtime_ms: runtimeMs, verdict: 'RE',
      error: stderr || data.message || 'Execution failed',
    };

  } catch (err: unknown) {
    const elapsed = Date.now() - startTime;
    return { success: false, output: '', stderr: '', exit_code: -1, runtime_ms: elapsed, verdict: 'JUDGE_ERROR', error: String(err) };
  }
}

// -----------------------------------------------
// Core execution function — uses TRUE Piston API with Judge0 fallback
// -----------------------------------------------
export async function executePiston(
  code:      string,
  language:  string,
  stdin:     string = '',
  timeLimitMs: number = 5000,
): Promise<PistonResult> {
  const lang = getLanguageById(language);
  if (!lang) {
    return { success: false, output: '', stderr: '', exit_code: -1, runtime_ms: 0, verdict: 'JUDGE_ERROR', error: `Unsupported language: ${language}` };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const startTime = Date.now();

  try {
    const res = await fetch(`${PISTON_BASE}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: language === 'cpp' ? 'c++' : language,
        version:  lang.version,
        files: [{
          name:    FILE_NAMES[language] || 'solution.txt',
          content: code,
        }],
        stdin:             stdin,
        args:              [],
        compile_timeout:   10000,
        run_timeout:       timeLimitMs,
        compile_memory_limit: -1,
        run_memory_limit:  -1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const elapsed = Date.now() - startTime;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 401) {
        console.warn('Piston API returned 401 Unauthorized (public service closed). Falling back to Judge0 CE...');
        return await executeJudge0(code, language, stdin, timeLimitMs);
      }
      return {
        success: false, output: '', stderr: body, exit_code: -1,
        runtime_ms: elapsed, verdict: 'JUDGE_ERROR',
        error: `Piston API returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const run     = data.run     || {};
    const compile = data.compile || {};

    const stdout   = (run.stdout   || '').trim();
    const stderr   = (run.stderr   || '').trim();
    const exitCode = run.code ?? 0;

    // Compilation error
    if (compile.code !== undefined && compile.code !== 0) {
      return {
        success: false, output: '', stderr: compile.stderr || compile.output || '',
        exit_code: compile.code, runtime_ms: elapsed, verdict: 'CE',
        error: compile.stderr || compile.output || 'Compilation failed',
      };
    }

    // Time limit exceeded
    if (run.signal === 'SIGKILL' || stderr.includes('Killed') || elapsed >= timeLimitMs + 2000) {
      return {
        success: false, output: stdout, stderr,
        exit_code: exitCode, runtime_ms: elapsed, verdict: 'TLE',
        error: 'Time Limit Exceeded',
      };
    }

    // Runtime error
    if (exitCode !== 0) {
      return {
        success: false, output: stdout, stderr,
        exit_code: exitCode, runtime_ms: elapsed, verdict: 'RE',
        error: stderr || `Process exited with code ${exitCode}`,
      };
    }

    return {
      success: true, output: stdout, stderr,
      exit_code: 0, runtime_ms: elapsed,
    };

  } catch (err: unknown) {
    clearTimeout(timeout);
    const elapsed = Date.now() - startTime;

    // Fall back to Judge0 if fetching Piston fails overall
    console.warn('Piston API request failed. Falling back to Judge0 CE...', err);
    try {
      return await executeJudge0(code, language, stdin, timeLimitMs);
    } catch (fallbackErr) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, output: '', stderr: '', exit_code: -1, runtime_ms: elapsed, verdict: 'TLE', error: 'Request timed out' };
      }
      return { success: false, output: '', stderr: '', exit_code: -1, runtime_ms: elapsed, verdict: 'JUDGE_ERROR', error: String(err) };
    }
  }
}

