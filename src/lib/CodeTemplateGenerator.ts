export interface FunctionParam {
  name: string;
  type: string; // Universal internal type e.g., 'integer_array'
}

export type FunctionReturnType = string;

export interface GeneratedTemplates {
  starter: string;
  driver: string;
}

export const UNIVERSAL_TYPES = [
  'integer',
  'string',
  'boolean',
  'integer_array',
  'string_array',
  'matrix',
  'linked_list',
  'tree'
];

const TYPE_MAP: Record<string, Record<string, string>> = {
  'integer': { cpp: 'int', java: 'int', python: 'int', javascript: 'number', go: 'int', c: 'int' },
  'string': { cpp: 'string', java: 'String', python: 'str', javascript: 'string', go: 'string', c: 'char*' },
  'boolean': { cpp: 'bool', java: 'boolean', python: 'bool', javascript: 'boolean', go: 'bool', c: 'bool' },
  'integer_array': { cpp: 'vector<int>', java: 'int[]', python: 'list[int]', javascript: 'number[]', go: '[]int', c: 'int*' },
  'string_array': { cpp: 'vector<string>', java: 'String[]', python: 'list[str]', javascript: 'string[]', go: '[]string', c: 'char**' },
  'matrix': { cpp: 'vector<vector<int>>', java: 'int[][]', python: 'list[list[int]]', javascript: 'number[][]', go: '[][]int', c: 'int**' },
  'linked_list': { cpp: 'ListNode*', java: 'ListNode', python: 'Optional[ListNode]', javascript: 'ListNode', go: '*ListNode', c: 'struct ListNode*' },
  'tree': { cpp: 'TreeNode*', java: 'TreeNode', python: 'Optional[TreeNode]', javascript: 'TreeNode', go: '*TreeNode', c: 'struct TreeNode*' }
};

function getLanguageType(internalType: string, language: string): string {
  if (TYPE_MAP[internalType] && TYPE_MAP[internalType][language]) {
    return TYPE_MAP[internalType][language];
  }
  return internalType; // Fallback to raw string if not mapped
}

export class CodeTemplateGenerator {
  
  static generate(language: string, params: FunctionParam[], returnType: FunctionReturnType, functionName: string = 'solve'): GeneratedTemplates {
    switch(language) {
      case 'cpp':
        return this.generateCpp(params, returnType, functionName);
      case 'c':
        return this.generateC(params, returnType, functionName);
      case 'python':
        return this.generatePython(params, returnType, functionName);
      case 'java':
        return this.generateJava(params, returnType, functionName);
      case 'javascript':
        return this.generateJavascript(params, returnType, functionName);
      case 'go':
        return this.generateGo(params, returnType, functionName);
      default:
        // Fallback for languages without driver support
        return { starter: '', driver: '' };
    }
  }

  private static generateC(params: FunctionParam[], returnType: string, functionName: string): GeneratedTemplates {
    const signatureParams = params.map(p => `${getLanguageType(p.type, 'c')} ${p.name}`).join(', ');
    const retTypeC = getLanguageType(returnType, 'c');
    const starter = `${retTypeC} ${functionName}(${signatureParams}) {\n    \n}`;
    
    const isVoid = returnType === 'void' || returnType === '';
    
    const driver = `
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

// USER_CODE_HERE

int main() {
    ${params.map((p, i) => {
        let t = getLanguageType(p.type, 'c');
        let fmt = t === 'int' ? '%d' : (t === 'float' || t === 'double') ? '%lf' : (t === 'char*' ? '%ms' : '%d');
        return `${t} p${i};\n    if (scanf("${fmt}", &p${i}) != 1) return 0;`;
    }).join('\n    ')}
    
    ${isVoid ? `${functionName}(${params.map((p, i) => `p${i}`).join(', ')});` : `${retTypeC} res = ${functionName}(${params.map((p, i) => `p${i}`).join(', ')});\n    printf(res == (bool)res ? "%s\\n" : "%d\\n", res ? "true" : "false");`}
    return 0;
}
`;
    // Note: C printing dynamic types easily is tricky, above is basic primitive handling.
    return { starter, driver };
  }

  private static generateCpp(params: FunctionParam[], returnType: string, functionName: string): GeneratedTemplates {
    const signatureParams = params.map(p => `${getLanguageType(p.type, 'cpp')} ${p.name}`).join(', ');
    const retTypeCpp = getLanguageType(returnType, 'cpp');
    const starter = `class Solution {\npublic:\n    ${retTypeCpp} ${functionName}(${signatureParams}) {\n        \n    }\n};`;
    
    const isVoid = returnType === 'void' || returnType === '';
    
    const driver = `
#include <iostream>
#include <vector>
#include <string>

using namespace std;

// USER_CODE_HERE

int main() {
    Solution sol;
    ${params.map((p, i) => `${getLanguageType(p.type, 'cpp')} p${i};\n    if (!(cin >> p${i})) return 0;`).join('\n    ')}
    
    ${isVoid ? `sol.${functionName}(${params.map((p, i) => `p${i}`).join(', ')});` : `auto res = sol.${functionName}(${params.map((p, i) => `p${i}`).join(', ')});\n    cout << res << endl;`}
    return 0;
}
`;
    return { starter, driver };
  }

  private static generatePython(params: FunctionParam[], returnType: string, functionName: string): GeneratedTemplates {
    const signatureParams = params.map(p => p.name).join(', ');
    const starter = `class Solution:\n    def ${functionName}(self, ${signatureParams}):\n        pass`;
    
    const driver = `
import sys
import json

# USER_CODE_HERE

if __name__ == '__main__':
    sol = Solution()
    input_data = sys.stdin.read().strip()
    if not input_data:
        sys.exit(0)
        
    try:
        lines = [line.strip() for line in input_data.split('\\n') if line.strip()]
        args = [json.loads(line) for line in lines]
        res = sol.${functionName}(*args)
        if res is not None:
            print(json.dumps(res))
    except Exception as e:
        print(f"Driver Error: {str(e)}", file=sys.stderr)
`;
    return { starter, driver };
  }

  private static generateJava(params: FunctionParam[], returnType: string, functionName: string): GeneratedTemplates {
    const signatureParams = params.map(p => `${getLanguageType(p.type, 'java')} ${p.name}`).join(', ');
    const retTypeJava = getLanguageType(returnType, 'java');
    const starter = `class Solution {\n    public ${retTypeJava} ${functionName}(${signatureParams}) {\n        \n    }\n}`;
    
    const isVoid = returnType === 'void' || returnType === '';

    const driver = `
import java.util.*;
import java.io.*;

// USER_CODE_HERE

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution sol = new Solution();
        
        ${params.map((p, i) => {
            const t = getLanguageType(p.type, 'java');
            if (t === 'int') return `if (!scanner.hasNextInt()) return;\n        int p${i} = scanner.nextInt();`;
            if (t === 'double') return `if (!scanner.hasNextDouble()) return;\n        double p${i} = scanner.nextDouble();`;
            if (t === 'boolean') return `if (!scanner.hasNextBoolean()) return;\n        boolean p${i} = scanner.nextBoolean();`;
            if (t === 'String') return `if (!scanner.hasNext()) return;\n        String p${i} = scanner.next();`;
            return `// complex type parsing not fully supported in stub\n        ${t} p${i} = null;`;
        }).join('\n        ')}
        
        ${isVoid ? `sol.${functionName}(${params.map((p, i) => `p${i}`).join(', ')});` : `${retTypeJava} res = sol.${functionName}(${params.map((p, i) => `p${i}`).join(', ')});\n        System.out.println(res);`}
    }
}
`;
    return { starter, driver };
  }
  
  private static generateJavascript(params: FunctionParam[], returnType: string, functionName: string): GeneratedTemplates {
    const signatureParams = params.map(p => p.name).join(', ');
    const starter = `/**\n${params.map(p => ` * @param {${getLanguageType(p.type, 'javascript')}} ${p.name}`).join('\n')}\n * @return {${getLanguageType(returnType, 'javascript')}}\n */\nvar ${functionName} = function(${signatureParams}) {\n    \n};`;
    
    const driver = `
const fs = require('fs');

// USER_CODE_HERE

function main() {
    const input = fs.readFileSync('/dev/stdin', 'utf-8').trim();
    if (!input) return;
    
    const lines = input.split('\\n').filter(l => l.trim().length > 0);
    try {
        const args = lines.map(line => JSON.parse(line));
        const res = ${functionName}(...args);
        if (res !== undefined) {
            console.log(JSON.stringify(res));
        }
    } catch (e) {
        console.error("Driver Error:", e);
    }
}
main();
`;
    return { starter, driver };
  }

  private static generateGo(params: FunctionParam[], returnType: string, functionName: string): GeneratedTemplates {
    const signatureParams = params.map(p => `${p.name} ${getLanguageType(p.type, 'go')}`).join(', ');
    const retTypeGo = getLanguageType(returnType, 'go');
    const starter = `func ${functionName}(${signatureParams}) ${retTypeGo} {\n    \n}`;
    
    const isVoid = returnType === 'void' || returnType === '';

    const driver = `
package main

import (
	"fmt"
)

// USER_CODE_HERE

func main() {
    ${params.map((p, i) => {
        const t = getLanguageType(p.type, 'go');
        return `var p${i} ${t}\n    if _, err := fmt.Scan(&p${i}); err != nil { return }`;
    }).join('\n    ')}
    
    ${isVoid ? `${functionName}(${params.map((p, i) => `p${i}`).join(', ')})` : `res := ${functionName}(${params.map((p, i) => `p${i}`).join(', ')})\n    fmt.Println(res)`}
}
`;
    return { starter, driver };
  }
}
