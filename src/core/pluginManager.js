import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CooldownManager } from '../utils/rateLimiter.js';
import { PermissionError } from '../utils/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced Plugin Manager with recursive loading, hooks, hot-reload, permissions, and cooldowns
 */
class PluginManager {
  constructor(config, logger, permissionManager = null) {
    this.config = config;
    this.logger = logger;
    this.permissionManager = permissionManager;
    this.plugins = new Map();
    this.commands = new Map();
    this.cooldownManager = new CooldownManager();
    this.loadedFiles = new Map(); // Track loaded files for hot-reload
  }

  /**
     * Recursively find .js files in folders
     */
  getAllPluginFiles(dir) {
    const results = [];

    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      // If folder → recurse
      if (stat.isDirectory()) {
        results.push(...this.getAllPluginFiles(fullPath));
        continue;
      }

      // Load *.js except *.disabled.js
      if (file.endsWith('.js') && !file.endsWith('.disabled.js')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
     * Load all plugins from the plugins directory recursively
     */
  async loadPlugins() {
    const pluginsDir = path.resolve(this.config.pluginsDir);

    if (!fs.existsSync(pluginsDir)) {
      this.logger.warn('Plugins directory not found, creating...', { dir: pluginsDir });
      fs.mkdirSync(pluginsDir, { recursive: true });
      return;
    }

    const files = this.getAllPluginFiles(pluginsDir);

    this.logger.info(`📦 Loading ${files.length} plugin(s)...`);

    for (const filePath of files) {
      await this.loadPlugin(filePath);
    }

    this.logger.info(`✅ Loaded ${this.plugins.size} plugin(s)`);
  }

  /**
     * Load a single plugin
     */
  async loadPlugin(filePath) {
    try {
      // Use dynamic import with timestamp to bypass cache for hot-reload
      const timestamp = Date.now();
      const pluginModule = await import(`file://${filePath}?t=${timestamp}`);
      const pluginDef = pluginModule.default;

      if (!pluginDef) {
        this.logger.warn(`  ⚠️  Skipped: ${path.basename(filePath)} (no default export)`);
        return;
      }

      // Normalize exports (similar to user's normalizeExports)
      const plugin = {
        name: pluginDef.name || path.basename(filePath, '.js'),
        command: pluginDef.command || null,
        alias: Array.isArray(pluginDef.alias) ? pluginDef.alias : [],
        init: typeof pluginDef.init === 'function' ? pluginDef.init : null,
        onMessage: typeof pluginDef.onMessage === 'function' ? pluginDef.onMessage : null,
        onPresence: typeof pluginDef.onPresence === 'function' ? pluginDef.onPresence : null,
        onGroupUpdate: typeof pluginDef.onGroupUpdate === 'function' ? pluginDef.onGroupUpdate : null,
        onStatus: typeof pluginDef.onStatus === 'function' ? pluginDef.onStatus : null,
        // Keep existing metadata
        category: pluginDef.category || (pluginDef.command && pluginDef.command.category) || 'general',
        permission: pluginDef.permission || 'user',
        cooldown: pluginDef.cooldown || 0,
        enabled: pluginDef.enabled !== undefined ? pluginDef.enabled : true,
        fileName: filePath,
        ctx: {} // Context for the plugin
      };

      // Register plugin
      this.registerPlugin(plugin);

      this.loadedFiles.set(path.basename(filePath), {
        path: filePath,
        lastModified: fs.statSync(filePath).mtimeMs,
      });

      // Run init hook if present
      if (plugin.init) {
        try {
          await plugin.init({
            ctx: plugin.ctx,
            config: this.config,
            logger: this.logger,
            pluginManager: this
          });
        } catch (e) {
          this.logger.error(`Plugin "${plugin.name}" init error:`, { error: e.message });
        }
      }

      this.logger.info(`  ✅ Loaded: ${plugin.name}`, { file: path.basename(filePath) });

    } catch (error) {
      this.logger.error(`  ❌ Failed to load ${path.basename(filePath)}`, { error: error.message });
    }
  }

  /**
     * Register a plugin
     */
  registerPlugin(plugin) {
    this.plugins.set(plugin.name, plugin);

    // Register command pattern
    if (plugin.command && plugin.command.pattern) {
      this.commands.set(plugin.command.pattern.toLowerCase(), plugin);
    }

    // Register aliases
    if (Array.isArray(plugin.alias)) {
      plugin.alias.forEach(alias => {
        this.commands.set(alias.toLowerCase(), plugin);
      });
    }
  }

  /**
     * Run a hook across all plugins
     */
  async runHook(hookName, data) {
    for (const plugin of this.plugins.values()) {
      if (!plugin.enabled) continue;
      if (typeof plugin[hookName] !== 'function') continue;

      try {
        await plugin[hookName]({
          ...data,
          pluginContext: plugin.ctx,
          config: this.config,
          logger: this.logger
        });
      } catch (err) {
        this.logger.error(`Error in hook ${hookName} for plugin ${plugin.name}`, { error: err.message });
      }
    }
  }

  /**
     * Execute a command
     */
  async executeCommand(command, sock, message, args, context = {}) {
    const cmd = command.toLowerCase();
    const plugin = this.commands.get(cmd);

    if (!plugin) {
      return false;
    }

    // Check if plugin is enabled
    if (!plugin.enabled) {
      this.logger.debug(`Plugin ${plugin.name} is disabled`);
      return false;
    }

    const userJid = message.key.remoteJid;

    try {
      // Check permissions
      if (this.permissionManager && plugin.permission) {
        const hasPermission = await this.permissionManager.checkPermission(
          userJid,
          plugin.permission
        );

        if (!hasPermission) {
          throw new PermissionError(
            `🔒 This command requires ${plugin.permission} permission.`
          );
        }
      }

      // Check cooldown
      if (plugin.cooldown > 0) {
        this.cooldownManager.check(userJid, cmd, plugin.cooldown);
      }

      // Execute plugin
      this.logger.info(`Executing plugin: ${plugin.name}`, {
        user: userJid,
        command: cmd,
        args,
      });

      // React if specified
      if (plugin.command.react) {
        await sock.sendMessage(userJid, { react: { text: plugin.command.react, key: message.key } });
      }

      // Execute with new signature
      await plugin.command.run({
        sock,
        msg: message,
        message,
        args,
        pluginContext: plugin.ctx,
        ...context
      });

      return true;
    } catch (error) {
      this.logger.error(`Error executing plugin ${plugin.name}`, {
        error: error.message,
        stack: error.stack,
      });

      // Send user-friendly error message
      const errorMessage = error.message || 'An error occurred while executing this command.';
      await sock.sendMessage(userJid, {
        text: `❌ ${errorMessage}`
      });

      throw error;
    }
  }

  /**
     * Reload a plugin (hot-reload)
     */
  async reloadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);

    if (!plugin || !plugin.fileName) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Unload plugin
    this.unloadPlugin(pluginName);

    // Reload plugin
    await this.loadPlugin(plugin.fileName);

    this.logger.info(`🔄 Reloaded plugin: ${pluginName}`);
    return true;
  }

  /**
     * Unload a plugin
     */
  unloadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      return false;
    }

    // Remove command mappings
    if (plugin.command && plugin.command.pattern) {
      this.commands.delete(plugin.command.pattern.toLowerCase());
    }
    if (Array.isArray(plugin.alias)) {
      plugin.alias.forEach(alias => {
        this.commands.delete(alias.toLowerCase());
      });
    }

    // Remove plugin
    this.plugins.delete(pluginName);

    if (plugin.fileName) {
      this.loadedFiles.delete(path.basename(plugin.fileName));
    }

    this.logger.info(`🗑️ Unloaded plugin: ${pluginName}`);
    return true;
  }

  /**
     * Enable/disable a plugin
     */
  togglePlugin(pluginName, enabled) {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    plugin.enabled = enabled;
    this.logger.info(`${enabled ? '✅ Enabled' : '⏸️ Disabled'} plugin: ${pluginName}`);

    return true;
  }

  /**
     * Get all registered plugins
     */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
     * Get plugins by category
     */
  getPluginsByCategory(category) {
    return Array.from(this.plugins.values()).filter(p => p.category === category);
  }

  /**
     * Get all plugin categories
     */
  getCategories() {
    const categories = new Set(
      Array.from(this.plugins.values()).map(p => p.category || 'general')
    );
    return Array.from(categories);
  }

  /**
     * Get all commands
     */
  getCommands() {
    return Array.from(this.commands.keys());
  }

  /**
     * Get plugin by command
     */
  getPluginByCommand(command) {
    return this.commands.get(command.toLowerCase());
  }
}

export default PluginManager;
