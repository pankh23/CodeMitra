export interface LanguageBoilerplate {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  code: string;
  description: string;
  isCompiled: boolean;
  executionTimeout: number; // in seconds
  memoryLimit: number; // in MB
}

export const LANGUAGE_BOILERPLATES: LanguageBoilerplate[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    mimeType: 'text/javascript',
    code: `// Welcome to JavaScript!
// Write your code below

function greet(name) {
  return \`Hello, \${name}!\`;
}

// Example usage
console.log(greet('World'));

// Your code here
function main() {
  // Add your logic here
  console.log('Code executed successfully!');
}

main();`,
    description: 'JavaScript runtime environment',
    isCompiled: false,
    executionTimeout: 10,
    memoryLimit: 128
  },
  {
    id: 'python',
    name: 'Python',
    extension: 'py',
    mimeType: 'text/x-python',
    code: `# Welcome to Python!
# Write your code below

def greet(name):
    return f"Hello, {name}!"

# Example usage
print(greet('World'))

# Your code here
def main():
    # Add your logic here
    print("Code executed successfully!")

if __name__ == "__main__":
    main()`,
    description: 'Python interpreter',
    isCompiled: false,
    executionTimeout: 10,
    memoryLimit: 256
  },
  {
    id: 'java',
    name: 'Java',
    extension: 'java',
    mimeType: 'text/x-java-source',
    code: `// Welcome to Java!
// Write your code below

public class Main {
    public static void main(String[] args) {
        // Add your logic here
        System.out.println("Code executed successfully!");
        
        // Example method call
        String result = greet("World");
        System.out.println(result);
    }
    
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}`,
    description: 'Java with JVM compilation',
    isCompiled: true,
    executionTimeout: 20,
    memoryLimit: 512
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: 'cpp',
    mimeType: 'text/x-c++src',
    code: `// Welcome to C++!
// Write your code below

#include <iostream>
#include <string>

using namespace std;

string greet(string name) {
    return "Hello, " + name + "!";
}

int main() {
    // Add your logic here
    cout << "Code executed successfully!" << endl;
    
    // Example function call
    string result = greet("World");
    cout << result << endl;
    
    return 0;
}`,
    description: 'C++ with GCC compilation',
    isCompiled: true,
    executionTimeout: 15,
    memoryLimit: 256
  },
  {
    id: 'c',
    name: 'C',
    extension: 'c',
    mimeType: 'text/x-csrc',
    code: `// Welcome to C!
// Write your code below

#include <stdio.h>
#include <string.h>

char* greet(char* name) {
    static char result[100];
    sprintf(result, "Hello, %s!", name);
    return result;
}

int main() {
    // Add your logic here
    printf("Code executed successfully!\\n");
    
    // Example function call
    char* result = greet("World");
    printf("%s\\n", result);
    
    return 0;
}`,
    description: 'C with GCC compilation',
    isCompiled: true,
    executionTimeout: 15,
    memoryLimit: 256
  },
  {
    id: 'php',
    name: 'PHP',
    extension: 'php',
    mimeType: 'text/x-php',
    code: `<?php
// Welcome to PHP!
// Write your code below

function greet($name) {
    return "Hello, " . $name . "!";
}

// Example usage
echo greet('World') . PHP_EOL;

// Your code here
function main() {
    // Add your logic here
    echo "Code executed successfully!" . PHP_EOL;
}

main();
?>`,
    description: 'PHP interpreter',
    isCompiled: false,
    executionTimeout: 10,
    memoryLimit: 128
  }
];

export function getBoilerplate(languageId: string): LanguageBoilerplate | undefined {
  return LANGUAGE_BOILERPLATES.find(lang => lang.id === languageId);
}

export function getSupportedLanguages(): LanguageBoilerplate[] {
  return LANGUAGE_BOILERPLATES;
}

export function getLanguageById(languageId: string): LanguageBoilerplate | undefined {
  return LANGUAGE_BOILERPLATES.find(lang => lang.id === languageId);
}

export function getDefaultLanguage(): LanguageBoilerplate {
  return LANGUAGE_BOILERPLATES[0]; // JavaScript as default
}
