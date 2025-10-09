# Code Block Test

This document tests various code block rendering scenarios.

## JavaScript Example

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return true;
}

greet('World');
```

## Python Example

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

## No Language Specified

```
This is a code block
without any language
specified
```

## Bash Script

```bash
#!/bin/bash
echo "Running deployment..."
npm run build
npm run deploy
```

## JSON Data

```json
{
  "name": "splitmark",
  "version": "1.0.0",
  "dependencies": {
    "ink": "^6.3.1",
    "marked": "^15.0.12"
  }
}
```

That's all the code block tests!
