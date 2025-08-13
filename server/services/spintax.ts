export function parseSpintax(text: string): string {
  // Find spintax patterns like {option1|option2|option3}
  const spintaxPattern = /\{([^{}]*\|[^{}]*)\}/g;
  
  let result = text;
  let match;
  
  while ((match = spintaxPattern.exec(result)) !== null) {
    const fullMatch = match[0];
    const options = match[1].split('|');
    
    // Select random option
    const randomOption = options[Math.floor(Math.random() * options.length)];
    
    // Replace the spintax with the selected option
    result = result.replace(fullMatch, randomOption.trim());
    
    // Reset regex to start from beginning since we modified the string
    spintaxPattern.lastIndex = 0;
  }
  
  return result;
}

export function validateSpintax(text: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for balanced braces
  let braceCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount < 0) {
        errors.push('Unmatched closing brace }');
        break;
      }
    }
  }
  
  if (braceCount > 0) {
    errors.push('Unmatched opening brace {');
  }
  
  // Check for valid spintax patterns
  const spintaxPattern = /\{([^{}]*)\}/g;
  let match;
  
  while ((match = spintaxPattern.exec(text)) !== null) {
    const content = match[1];
    
    if (!content.includes('|')) {
      errors.push(`Invalid spintax pattern: ${match[0]} (missing pipe separator)`);
    } else {
      const options = content.split('|');
      if (options.some(option => option.trim() === '')) {
        errors.push(`Empty option in spintax pattern: ${match[0]}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function countSpintaxVariations(text: string): number {
  const spintaxPattern = /\{([^{}]*\|[^{}]*)\}/g;
  let totalVariations = 1;
  let match;
  
  while ((match = spintaxPattern.exec(text)) !== null) {
    const options = match[1].split('|');
    totalVariations *= options.length;
  }
  
  return totalVariations;
}

export function generateAllSpintaxVariations(text: string, maxVariations: number = 100): string[] {
  const variations: string[] = [];
  const spintaxPattern = /\{([^{}]*\|[^{}]*)\}/g;
  
  function generateVariation(inputText: string): string {
    let result = inputText;
    let match;
    
    while ((match = spintaxPattern.exec(result)) !== null) {
      const fullMatch = match[0];
      const options = match[1].split('|');
      const randomOption = options[Math.floor(Math.random() * options.length)];
      
      result = result.replace(fullMatch, randomOption.trim());
      spintaxPattern.lastIndex = 0;
    }
    
    return result;
  }
  
  // Generate unique variations
  const uniqueVariations = new Set<string>();
  let attempts = 0;
  const maxAttempts = maxVariations * 10; // Prevent infinite loops
  
  while (uniqueVariations.size < maxVariations && attempts < maxAttempts) {
    const variation = generateVariation(text);
    uniqueVariations.add(variation);
    attempts++;
  }
  
  return Array.from(uniqueVariations);
}
