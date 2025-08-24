export interface LanguageBoilerplate {
  id: string;
  name: string;
  extension: string;
  code: string;
  description: string;
  category: 'basic' | 'intermediate' | 'advanced';
}

export const LANGUAGE_BOILERPLATES: LanguageBoilerplate[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    category: 'basic',
    description: 'Basic JavaScript function with console output',
    code: `// Welcome to CodeMitra JavaScript Editor!
// This is a basic JavaScript template to get you started

function greetUser(name) {
  return \`Hello, \${name}! Welcome to collaborative coding.\`;
}

// Example usage
const userName = "Developer";
const message = greetUser(userName);
console.log(message);

// You can add more functions and logic here
function calculateSum(a, b) {
  return a + b;
}

console.log("Sum of 5 + 3 =", calculateSum(5, 3));

// Try running this code to see the output!`
  },
  {
    id: 'python',
    name: 'Python',
    extension: 'py',
    category: 'basic',
    description: 'Basic Python function with print output',
    code: `# Welcome to CodeMitra Python Editor!
# This is a basic Python template to get you started

def greet_user(name):
    return f"Hello, {name}! Welcome to collaborative coding."

# Example usage
user_name = "Developer"
message = greet_user(user_name)
print(message)

# You can add more functions and logic here
def calculate_sum(a, b):
    return a + b

print("Sum of 5 + 3 =", calculate_sum(5, 3))

# List comprehension example
numbers = [1, 2, 3, 4, 5]
squares = [x**2 for x in numbers]
print("Squares:", squares)

# Try running this code to see the output!`
  },
  {
    id: 'java',
    name: 'Java',
    extension: 'java',
    category: 'basic',
    description: 'Basic Java class with main method',
    code: `// Welcome to CodeMitra Java Editor!
// This is a basic Java template to get you started

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Developer! Welcome to collaborative coding.");
        
        // Example method calls
        String message = greetUser("Developer");
        System.out.println(message);
        
        int result = calculateSum(5, 3);
        System.out.println("Sum of 5 + 3 = " + result);
        
        // Array example
        int[] numbers = {1, 2, 3, 4, 5};
        System.out.println("Array elements:");
        for (int num : numbers) {
            System.out.print(num + " ");
        }
        System.out.println();
    }
    
    public static String greetUser(String name) {
        return "Hello, " + name + "! Welcome to collaborative coding.";
    }
    
    public static int calculateSum(int a, int b) {
        return a + b;
    }
}`
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: 'cpp',
    category: 'basic',
    description: 'Basic C++ program with main function',
    code: `// Welcome to CodeMitra C++ Editor!
// This is a basic C++ template to get you started

#include <iostream>
#include <vector>
#include <string>
using namespace std;

// Function declarations
string greetUser(string name);
int calculateSum(int a, int b);
void printArray(vector<int>& arr);

int main() {
    cout << "Hello, Developer! Welcome to collaborative coding." << endl;
    
    // Example method calls
    string message = greetUser("Developer");
    cout << message << endl;
    
    int result = calculateSum(5, 3);
    cout << "Sum of 5 + 3 = " << result << endl;
    
    // Vector example
    vector<int> numbers = {1, 2, 3, 4, 5};
    cout << "Vector elements: ";
    printArray(numbers);
    
    return 0;
}

string greetUser(string name) {
    return "Hello, " + name + "! Welcome to collaborative coding.";
}

int calculateSum(int a, int b) {
    return a + b;
}

void printArray(vector<int>& arr) {
    for (int num : arr) {
        cout << num << " ";
    }
    cout << endl;
}`
  }
];

/**
 * Get boilerplate code for a specific language
 */
export function getBoilerplate(languageId: string): LanguageBoilerplate | null {
  return LANGUAGE_BOILERPLATES.find(bp => bp.id === languageId) || null;
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): LanguageBoilerplate[] {
  return LANGUAGE_BOILERPLATES;
}

/**
 * Get languages by category
 */
export function getLanguagesByCategory(category: 'basic' | 'intermediate' | 'advanced'): LanguageBoilerplate[] {
  return LANGUAGE_BOILERPLATES.filter(bp => bp.category === category);
}

/**
 * Get language by extension
 */
export function getLanguageByExtension(extension: string): LanguageBoilerplate | null {
  return LANGUAGE_BOILERPLATES.find(bp => bp.extension === extension) || null;
}

/**
 * Get supported language IDs (for backward compatibility)
 */
export function getSupportedLanguages(): string[] {
  return LANGUAGE_BOILERPLATES.map(lang => lang.id);
}
