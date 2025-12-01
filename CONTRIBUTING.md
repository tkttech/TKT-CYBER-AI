# Contributing to Vesperr WhatsApp Bot

Thank you for considering contributing to Vesperr! This document provides guidelines for contributing to the project.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

- **Check existing issues** first to avoid duplicates
- **Use the bug report template** when creating a new issue
- **Include details**: OS, Node.js version, steps to reproduce, expected vs actual behavior

### Suggesting Enhancements

- **Check existing feature requests** first
- **Be specific** about the feature and its use case
- **Explain why** this feature would be useful to most users

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding standards** (ESLint + Prettier)
3. **Write clear commit messages**
4. **Add tests** for new features
5. **Update documentation** if needed
6. **Ensure tests pass** before submitting

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Vesperr.git
cd Vesperr

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run in development mode
npm run dev
```

## Coding Standards

- Use ES6+ features and modules
- Follow the ESLint configuration provided
- Format code with Prettier
- Write meaningful variable and function names
- Add JSDoc comments for functions
- Keep functions small and focused

### Naming Conventions

- **Files**: camelCase (e.g., `sessionManager.js`)
- **Classes**: PascalCase (e.g., `PluginManager`)
- **Functions/Variables**: camelCase (e.g., `loadPlugins`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

## Creating a Plugin

1. Create a new file in the `plugins/` directory
2. Follow the plugin template:

```javascript
export default {
  name: 'PluginName',
  command: ['cmd', 'alias'],
  description: 'What it does',
  usage: '!cmd [args]',
  category: 'general', // info, utility, media, ai, admin, fun
  permission: 'user', // user, mod, admin, owner
  cooldown: 3, // seconds

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    
    try {
      // Your plugin logic here
      await sock.sendMessage(chatId, {
        text: 'Response',
      });
    } catch (error) {
      context.logger.error('Plugin error', { error: error.message });
      throw error;
    }
  },
};
```

3. Test your plugin thoroughly
4. Add documentation in the README

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Commiting Changes

- Use conventional commits format:
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation changes
  - `style:` formatting, missing semi-colons, etc
  - `refactor:` code changes that neither fix bugs nor add features
  - `test:` adding or updating tests
  - `chore:` updating build tasks, package manager configs, etc

Example: `feat: add YouTube downloader plugin`

## Project Structure

```
Vesperr/
├── src/                    # Source code
│   ├── config/            # Configuration
│   ├── core/              # Core managers
│   ├── database/          # Database and models
│   └── utils/             # Utility functions
├── plugins/               # Bot plugins
├── tests/        # Test files
├── docs/                  # Documentation
├── index.js               # Entry point
└── package.json
```

## Questions?

Feel free to open an issue for questions or join discussions!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
