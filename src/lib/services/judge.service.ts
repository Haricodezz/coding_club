// ============================================================
// Judge Service — Orchestrates test case execution & verdicts
// SECURITY: This runs SERVER-SIDE ONLY. Never import in client components.
// ============================================================

import { executePiston, type PistonResult } from '@/lib/piston';

export type Verdict = 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | 'MLE' | 'JUDGE_ERROR';

export interface Testcase {
  id:              string;
  input:           string;
  expected_output: string;
  is_hidden:       boolean;
}

export interface TestcaseResult {
  testcase_id:  string;
  passed:       boolean;
  verdict:      Verdict;
  actual_output: string;
  expected_output: string;
  runtime_ms:   number;
  is_hidden:    boolean;
}

export interface JudgeResult {
  verdict:           Verdict;
  testcases_total:   number;
  testcases_passed:  number;
  runtime_ms:        number;      // max across all testcases
  results:           TestcaseResult[];
  error_message?:    string;
  compile_output?:   string;
}

// -----------------------------------------------
// Compare outputs (trimmed, normalized newlines)
// -----------------------------------------------
function compareOutputs(actual: string, expected: string): boolean {
  const normalize = (s: string) =>
    s.replace(/\r\n/g, '\n').trim().split('\n').map(l => l.trimEnd()).join('\n');
  return normalize(actual) === normalize(expected);
}

// -----------------------------------------------
// Map Piston verdict to our verdict type
// -----------------------------------------------
function mapVerdict(pistonResult: PistonResult, expected: string): Verdict {
  if (pistonResult.verdict === 'CE')           return 'CE';
  if (pistonResult.verdict === 'TLE')          return 'TLE';
  if (pistonResult.verdict === 'RE')           return 'RE';
  if (pistonResult.verdict === 'JUDGE_ERROR')  return 'JUDGE_ERROR';
  if (!pistonResult.success)                   return 'RE';
  if (!compareOutputs(pistonResult.output, expected)) return 'WA';
  return 'AC';
}

// -----------------------------------------------
// Run code against a list of testcases
// Stops on first non-AC verdict (ICPC style)
// -----------------------------------------------
export async function runAgainstTestcases(
  code:         string,
  language:     string,
  testcases:    Testcase[],
  timeLimitMs:  number = 2000,
): Promise<JudgeResult> {
  const results: TestcaseResult[] = [];
  let maxRuntime = 0;

  const sorted = [...testcases].sort((a, b) => {
    // Run visible testcases first for better UX feedback
    if (!a.is_hidden && b.is_hidden) return -1;
    if (a.is_hidden && !b.is_hidden) return 1;
    return 0;
  });

  for (const tc of sorted) {
    let pistonResult: PistonResult;
    
    // Retry once on JUDGE_ERROR
    pistonResult = await executePiston(code, language, tc.input, timeLimitMs);
    if (pistonResult.verdict === 'JUDGE_ERROR') {
      await new Promise(r => setTimeout(r, 500));
      pistonResult = await executePiston(code, language, tc.input, timeLimitMs);
    }

    maxRuntime = Math.max(maxRuntime, pistonResult.runtime_ms);
    const verdict = mapVerdict(pistonResult, tc.expected_output);

    results.push({
      testcase_id:     tc.id,
      passed:          verdict === 'AC',
      verdict,
      actual_output:   pistonResult.output,
      expected_output: tc.is_hidden ? '(hidden)' : tc.expected_output,
      runtime_ms:      pistonResult.runtime_ms,
      is_hidden:       tc.is_hidden,
    });

    // On CE: stop immediately, no point running more
    if (verdict === 'CE') {
      return {
        verdict: 'CE',
        testcases_total:  sorted.length,
        testcases_passed: 0,
        runtime_ms:       maxRuntime,
        results,
        error_message:    pistonResult.error,
        compile_output:   pistonResult.stderr,
      };
    }

    // On non-AC: stop (ICPC/LeetCode style short-circuit)
    if (verdict !== 'AC') {
      const remaining = sorted.slice(results.length);
      return {
        verdict,
        testcases_total:  sorted.length,
        testcases_passed: results.filter(r => r.passed).length,
        runtime_ms:       maxRuntime,
        results,
        error_message:    pistonResult.error || pistonResult.stderr,
      };
    }
  }

  const passed = results.filter(r => r.passed).length;
  return {
    verdict:          passed === sorted.length ? 'AC' : 'WA',
    testcases_total:  sorted.length,
    testcases_passed: passed,
    runtime_ms:       maxRuntime,
    results,
  };
}

// -----------------------------------------------
// Run against visible sample testcases only (for "Run" button)
// -----------------------------------------------
export async function runSamples(
  code:      string,
  language:  string,
  testcases: Testcase[],
  timeLimitMs: number = 5000,
): Promise<JudgeResult> {
  const visible = testcases.filter(t => !t.is_hidden);
  return runAgainstTestcases(code, language, visible, timeLimitMs);
}
