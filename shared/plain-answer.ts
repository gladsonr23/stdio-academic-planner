const latexWords: Record<string, string> = {
  alpha: 'alpha', beta: 'beta', gamma: 'gamma', delta: 'delta', epsilon: 'epsilon', theta: 'theta',
  lambda: 'lambda', mu: 'mu', pi: 'pi', sigma: 'sigma', tau: 'tau', phi: 'phi', omega: 'Omega',
  Alpha: 'Alpha', Beta: 'Beta', Gamma: 'Gamma', Delta: 'Delta', Theta: 'Theta', Lambda: 'Lambda',
  Pi: 'Pi', Sigma: 'Sigma', Phi: 'Phi', Omega: 'Omega', infty: 'infinity', partial: 'partial',
  nabla: 'gradient', sum: 'sum', prod: 'product', times: 'times', cdot: 'times', div: 'divided by',
  le: '<=', leq: '<=', ge: '>=', geq: '>=', neq: '!=', approx: 'approximately', to: '->', rightarrow: '->',
  leftarrow: '<-', therefore: 'therefore', text: '', mathrm: '', operatorname: '', mathit: '',
  displaystyle: '', left: '', right: '', quad: ' ', qquad: ' ',
}

/** Convert common model-emitted LaTeX into readable text, retaining useful math notation. */
export function plainAnswerText(input: string) {
  return input
    .replace(/\\(?:begin|end)\{[^}]+\}/g, '')
    .replace(/\\(?:text|mathrm|operatorname|mathit|mathbf|mathsf|mathtt)\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
    .replace(/\\([A-Za-z]+)\b/g, (command, word: string) => latexWords[word] ?? word)
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\\\/g, '\n')
    .replace(/\${1,2}|\\\(|\\\)|\\\[|\\\]/g, '')
    .replace(/\\?([{}])/g, '')
    .replace(/\^\{([^{}]+)\}/g, '^$1')
    .replace(/_\{([^{}]+)\}/g, '_$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}
