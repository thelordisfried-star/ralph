export interface SetupItem {
  id: string;
  title: string;
  description: string;
  why: string;
  command?: string;
  code?: string;
  link?: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export interface SetupSection {
  id: string;
  title: string;
  emoji: string;
  description: string;
  color: string;
  items: SetupItem[];
}

export const setupSections: SetupSection[] = [
  {
    id: 'skills',
    title: 'Essential Skills',
    emoji: '🎯',
    description: 'Supercharge Claude with powerful skill extensions',
    color: '#6366f1',
    items: [
      {
        id: 'commit-skill',
        title: 'Commit Skill',
        description: 'Smart git commits with AI-generated messages',
        why: 'Automatically creates meaningful commit messages following conventions. Saves time and ensures consistent git history.',
        command: 'cp -r ~/.claude/examples/skills/commit ~/.claude/skills/',
        link: 'https://docs.claude.ai/skills/commit',
        priority: 'essential'
      },
      {
        id: 'review-pr-skill',
        title: 'Review PR Skill',
        description: 'AI-powered code review for pull requests',
        why: 'Get instant, thorough PR reviews checking for bugs, security issues, and best practices before human review.',
        command: 'cp -r ~/.claude/examples/skills/review-pr ~/.claude/skills/',
        link: 'https://docs.claude.ai/skills/review-pr',
        priority: 'essential'
      },
      {
        id: 'test-skill',
        title: 'Test Runner Skill',
        description: 'Run and analyze test results',
        why: 'Quickly run tests and get AI analysis of failures. Claude can suggest fixes for failing tests.',
        command: 'cp -r ~/.claude/examples/skills/test ~/.claude/skills/',
        priority: 'recommended'
      },
      {
        id: 'plan-skill',
        title: 'Planning Skill',
        description: 'Break down complex tasks into actionable steps',
        why: 'Transform vague requests into detailed implementation plans. Essential for large features.',
        command: 'cp -r ~/.claude/examples/skills/plan ~/.claude/skills/',
        priority: 'recommended'
      }
    ]
  },
  {
    id: 'mcp-servers',
    title: 'MCP Servers',
    emoji: '🔌',
    description: 'Connect Claude to external tools and services',
    color: '#8b5cf6',
    items: [
      {
        id: 'filesystem-mcp',
        title: 'Filesystem MCP',
        description: 'Enhanced file system operations',
        why: 'Gives Claude safer, more powerful file operations. Essential for most development work.',
        command: 'npx @modelcontextprotocol/create-server filesystem',
        link: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        priority: 'essential'
      },
      {
        id: 'github-mcp',
        title: 'GitHub MCP',
        description: 'Full GitHub integration - issues, PRs, repos',
        why: 'Manage GitHub directly from Claude. Create issues, review PRs, search code across repos.',
        command: 'npx @modelcontextprotocol/create-server github',
        link: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
        priority: 'essential'
      },
      {
        id: 'postgres-mcp',
        title: 'PostgreSQL MCP',
        description: 'Direct database access and queries',
        why: 'Query databases, inspect schemas, and generate migrations. Perfect for backend work.',
        command: 'npx @modelcontextprotocol/create-server postgres',
        priority: 'recommended'
      },
      {
        id: 'web-search-mcp',
        title: 'Web Search MCP',
        description: 'Search the web for current information',
        why: 'Get latest docs, check current best practices, find solutions to new problems.',
        command: 'npx @modelcontextprotocol/create-server brave-search',
        priority: 'recommended'
      },
      {
        id: 'slack-mcp',
        title: 'Slack MCP',
        description: 'Send messages and manage Slack channels',
        why: 'Post updates, notify teams, search message history. Great for team communication.',
        command: 'npx @modelcontextprotocol/create-server slack',
        priority: 'optional'
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings & Config',
    emoji: '⚙️',
    description: 'Optimize your Claude Code configuration',
    color: '#14b8a6',
    items: [
      {
        id: 'auto-handoff',
        title: 'Auto Handoff',
        description: 'Automatically continue when context fills up',
        why: 'Enables Claude to work on large tasks that exceed a single context window. Critical for big refactors.',
        code: `{
  "amp.experimental.autoHandoff": {
    "context": 90
  }
}`,
        priority: 'essential'
      },
      {
        id: 'model-selection',
        title: 'Model Selection',
        description: 'Set default models for different tasks',
        why: 'Use Opus for complex work, Sonnet for speed, Haiku for simple tasks. Optimize cost and performance.',
        code: `{
  "amp.defaultModel": "claude-sonnet-4-5",
  "amp.agents.explore.model": "claude-haiku-4-5",
  "amp.agents.bash.model": "claude-haiku-4-5"
}`,
        priority: 'recommended'
      },
      {
        id: 'keyboard-shortcuts',
        title: 'Custom Keyboard Shortcuts',
        description: 'Speed up your workflow with keybindings',
        why: 'Access common commands instantly. Muscle memory makes you 10x faster.',
        code: `{
  "keybindings": {
    "ctrl+enter": "submit",
    "ctrl+shift+c": "skill:commit",
    "ctrl+shift+r": "skill:review-pr"
  }
}`,
        link: 'Use the keybindings-help skill to customize',
        priority: 'recommended'
      }
    ]
  },
  {
    id: 'hooks',
    title: 'Hooks & Automation',
    emoji: '🪝',
    description: 'Automate workflows with powerful hooks',
    color: '#f59e0b',
    items: [
      {
        id: 'pre-commit-hook',
        title: 'Pre-commit Hook',
        description: 'Run linters and formatters before commits',
        why: 'Catch errors before they reach git history. Enforce code quality automatically.',
        code: `#!/bin/bash
# ~/.claude/hooks/pre-commit

# Run linter
npm run lint || exit 1

# Run formatter
npm run format || exit 1

# Run tests
npm test || exit 1`,
        priority: 'essential'
      },
      {
        id: 'session-start-hook',
        title: 'Session Start Hook',
        description: 'Set up environment when Claude starts',
        why: 'Install dependencies, start dev servers, set environment variables automatically.',
        code: `#!/bin/bash
# ~/.claude/hooks/session-start

# Install dependencies
npm install

# Start dev server in background
npm run dev &`,
        link: 'Use the session-start-hook skill to set up',
        priority: 'recommended'
      },
      {
        id: 'post-tool-hook',
        title: 'Post-tool Hook',
        description: 'Run commands after tool executions',
        why: 'Auto-save files, update indexes, trigger builds after changes.',
        code: `#!/bin/bash
# ~/.claude/hooks/post-tool

# Auto-format changed files
if [[ "$TOOL_NAME" == "Edit" ]]; then
  prettier --write "$FILE_PATH"
fi`,
        priority: 'optional'
      }
    ]
  },
  {
    id: 'git',
    title: 'Git Best Practices',
    emoji: '📁',
    description: 'Master git workflows with Claude',
    color: '#ec4899',
    items: [
      {
        id: 'claude-md',
        title: 'CLAUDE.md File',
        description: 'Project-specific instructions for Claude',
        why: 'Tell Claude about your project conventions, architecture, and preferences. Makes every session better.',
        code: `# Project: My Awesome App

## Architecture
- Next.js 14 with App Router
- TypeScript strict mode
- Tailwind CSS for styling
- PostgreSQL database

## Conventions
- Use functional components
- Prefer server components
- Test with Jest and Testing Library

## Common Commands
- \`npm run dev\` - Start dev server
- \`npm test\` - Run tests
- \`npm run db:migrate\` - Run migrations`,
        priority: 'essential'
      },
      {
        id: 'gitignore-claude',
        title: '.gitignore Claude entries',
        description: 'Ignore Claude-specific files',
        why: 'Keep Claude\'s working files out of your repo. Avoid committing temporary artifacts.',
        code: `# Claude Code
.claude/
*.claude-workspace
.claude-session`,
        priority: 'essential'
      },
      {
        id: 'branch-workflow',
        title: 'Feature Branch Workflow',
        description: 'Use branches for Claude work',
        why: 'Keep main clean, review changes, and rollback easily. Professional git workflow.',
        command: 'git checkout -b claude/feature-name',
        priority: 'recommended'
      }
    ]
  },
  {
    id: 'agents',
    title: 'Agent Templates',
    emoji: '🤖',
    description: 'Pre-configured agents for common tasks',
    color: '#10b981',
    items: [
      {
        id: 'explore-agent',
        title: 'Explore Agent',
        description: 'Deep codebase exploration and search',
        why: 'Finds patterns across your codebase. Use for "find all usages" or "how does X work" questions.',
        code: `{
  "name": "explore",
  "model": "claude-haiku-4-5",
  "description": "Explore codebase thoroughly",
  "tools": ["Glob", "Grep", "Read"]
}`,
        priority: 'recommended'
      },
      {
        id: 'test-agent',
        title: 'Test Runner Agent',
        description: 'Run tests and analyze failures',
        why: 'Automatically runs tests, interprets failures, and suggests fixes. Essential for TDD.',
        code: `{
  "name": "test-runner",
  "model": "claude-sonnet-4-5",
  "description": "Run tests and fix failures",
  "tools": ["Bash", "Read", "Edit"]
}`,
        priority: 'recommended'
      },
      {
        id: 'review-agent',
        title: 'Code Review Agent',
        description: 'Thorough code review',
        why: 'Catches bugs, security issues, and style problems. Like having a senior dev review your code.',
        code: `{
  "name": "reviewer",
  "model": "claude-opus-4-6",
  "description": "Comprehensive code review",
  "tools": ["Read", "Grep", "Bash"]
}`,
        priority: 'optional'
      }
    ]
  },
  {
    id: 'productivity',
    title: 'Productivity Tips',
    emoji: '⚡',
    description: 'Get the most out of Claude Code',
    color: '#f43f5e',
    items: [
      {
        id: 'use-skills',
        title: 'Use Skills Instead of Asking',
        description: 'Type /commit instead of "create a commit"',
        why: 'Skills are faster and more consistent. They\'re designed for specific tasks.',
        priority: 'essential'
      },
      {
        id: 'memory-files',
        title: 'Create Memory Files',
        description: 'Use AGENTS.md and MEMORY.md',
        why: 'Claude learns from these files. Document patterns, gotchas, and decisions for future sessions.',
        code: `# AGENTS.md

## Database
- Use Prisma ORM
- Migrations in \`prisma/migrations\`
- Run \`npx prisma generate\` after schema changes

## Common Issues
- Remember to restart dev server after env changes
- Use \`npm run db:push\` for quick schema updates in dev`,
        priority: 'essential'
      },
      {
        id: 'specific-requests',
        title: 'Be Specific',
        description: 'Say "add TypeScript types to auth.ts" not "improve auth"',
        why: 'Specific requests get better results. Claude knows exactly what you want.',
        priority: 'recommended'
      },
      {
        id: 'iterate',
        title: 'Iterate on Results',
        description: 'Ask for refinements instead of starting over',
        why: 'Claude learns from context. "Make it faster" works better than "rewrite it to be fast".',
        priority: 'recommended'
      }
    ]
  }
];

export const getCompletedItems = (): Set<string> => {
  const stored = localStorage.getItem('claudeSetupCompleted');
  return stored ? new Set(JSON.parse(stored)) : new Set();
};

export const setItemCompleted = (itemId: string, completed: boolean) => {
  const completedItems = getCompletedItems();
  if (completed) {
    completedItems.add(itemId);
  } else {
    completedItems.delete(itemId);
  }
  localStorage.setItem('claudeSetupCompleted', JSON.stringify([...completedItems]));
};

export const getProgress = () => {
  const completedItems = getCompletedItems();
  const totalItems = setupSections.reduce((acc, section) => acc + section.items.length, 0);
  const completedCount = completedItems.size;
  return {
    completed: completedCount,
    total: totalItems,
    percentage: Math.round((completedCount / totalItems) * 100)
  };
};
