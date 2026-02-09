export interface Feature {
  id: string;
  name: string;
  category: string;
  what: string;
  why: string;
  icon: string;
  examples?: string[];
}

export const featureCategories = [
  { id: 'code', name: 'Coding & Development', color: '#6366f1', emoji: '💻' },
  { id: 'analysis', name: 'Analysis & Research', color: '#8b5cf6', emoji: '🔍' },
  { id: 'creative', name: 'Creative & Writing', color: '#ec4899', emoji: '✨' },
  { id: 'productivity', name: 'Productivity & Planning', color: '#14b8a6', emoji: '🎯' },
  { id: 'advanced', name: 'Advanced Capabilities', color: '#f59e0b', emoji: '🚀' },
];

export const features: Feature[] = [
  // Coding & Development
  {
    id: 'code-generation',
    name: 'Code Generation',
    category: 'code',
    what: 'Write complete functions, classes, and even entire applications in any programming language',
    why: 'Save hours of typing and avoid boilerplate. Focus on architecture while Claude handles implementation details.',
    icon: '⚡',
    examples: ['Build a REST API', 'Create React components', 'Write database migrations']
  },
  {
    id: 'bug-fixing',
    name: 'Bug Detection & Fixing',
    category: 'code',
    what: 'Identify bugs in your code and provide fixes with detailed explanations',
    why: 'Spend less time debugging and more time building. Learn from each fix to become a better developer.',
    icon: '🐛',
    examples: ['Find race conditions', 'Fix memory leaks', 'Resolve type errors']
  },
  {
    id: 'code-review',
    name: 'Code Review',
    category: 'code',
    what: 'Get detailed feedback on code quality, security, and best practices',
    why: 'Improve code quality before it reaches production. Learn industry best practices from every review.',
    icon: '👀',
    examples: ['Security audits', 'Performance optimization', 'Clean code suggestions']
  },
  {
    id: 'refactoring',
    name: 'Code Refactoring',
    category: 'code',
    what: 'Restructure existing code to improve readability and maintainability',
    why: 'Keep your codebase healthy and scalable. Make future changes easier and reduce technical debt.',
    icon: '♻️',
    examples: ['Extract functions', 'Simplify logic', 'Update patterns']
  },
  {
    id: 'testing',
    name: 'Test Generation',
    category: 'code',
    what: 'Generate unit tests, integration tests, and test scenarios automatically',
    why: 'Increase code coverage without the tedium. Catch bugs before they reach users.',
    icon: '🧪',
    examples: ['Unit tests', 'E2E tests', 'Edge cases']
  },
  {
    id: 'documentation',
    name: 'Code Documentation',
    category: 'code',
    what: 'Generate clear documentation, comments, and README files',
    why: 'Make your code accessible to others (and your future self). Save time onboarding new team members.',
    icon: '📝',
    examples: ['API docs', 'Code comments', 'Architecture guides']
  },

  // Analysis & Research
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    category: 'analysis',
    what: 'Analyze datasets, identify patterns, and generate insights from complex data',
    why: 'Turn raw data into actionable insights. Make data-driven decisions with confidence.',
    icon: '📊',
    examples: ['Trend analysis', 'Statistical summaries', 'Pattern detection']
  },
  {
    id: 'research',
    name: 'Research & Synthesis',
    category: 'analysis',
    what: 'Synthesize information from multiple sources and provide comprehensive summaries',
    why: 'Save hours of reading and research. Get to the key insights faster.',
    icon: '📚',
    examples: ['Literature reviews', 'Competitive analysis', 'Market research']
  },
  {
    id: 'problem-solving',
    name: 'Problem Solving',
    category: 'analysis',
    what: 'Break down complex problems into manageable steps with clear solutions',
    why: 'Tackle challenges systematically. Get unstuck when facing difficult problems.',
    icon: '🧩',
    examples: ['Algorithm design', 'System architecture', 'Debugging strategies']
  },
  {
    id: 'comparison',
    name: 'Comparison & Evaluation',
    category: 'analysis',
    what: 'Compare technologies, approaches, or solutions with pros/cons analysis',
    why: 'Make informed decisions faster. Understand tradeoffs before committing.',
    icon: '⚖️',
    examples: ['Tech stack selection', 'Tool comparisons', 'Approach evaluation']
  },

  // Creative & Writing
  {
    id: 'content-writing',
    name: 'Content Creation',
    category: 'creative',
    what: 'Write blog posts, articles, marketing copy, and other content',
    why: 'Overcome writer\'s block and produce engaging content faster. Focus on ideas while Claude handles the prose.',
    icon: '✍️',
    examples: ['Blog posts', 'Marketing copy', 'Social media content']
  },
  {
    id: 'editing',
    name: 'Editing & Proofreading',
    category: 'creative',
    what: 'Improve grammar, clarity, and style in your writing',
    why: 'Polish your writing to professional standards. Communicate more effectively.',
    icon: '📖',
    examples: ['Grammar fixes', 'Clarity improvements', 'Tone adjustments']
  },
  {
    id: 'brainstorming',
    name: 'Brainstorming & Ideas',
    category: 'creative',
    what: 'Generate creative ideas, concepts, and solutions for any challenge',
    why: 'Expand your creative horizons. Get unstuck when you need fresh perspectives.',
    icon: '💡',
    examples: ['Product ideas', 'Feature concepts', 'Marketing campaigns']
  },
  {
    id: 'storytelling',
    name: 'Storytelling & Narrative',
    category: 'creative',
    what: 'Craft compelling narratives, stories, and scenarios',
    why: 'Engage your audience emotionally. Make your message memorable and impactful.',
    icon: '📖',
    examples: ['User stories', 'Case studies', 'Brand narratives']
  },

  // Productivity & Planning
  {
    id: 'task-planning',
    name: 'Task Planning',
    category: 'productivity',
    what: 'Break down projects into actionable tasks with clear priorities',
    why: 'Stop feeling overwhelmed. Know exactly what to do next and why it matters.',
    icon: '✅',
    examples: ['Sprint planning', 'Project roadmaps', 'Task breakdowns']
  },
  {
    id: 'workflow-optimization',
    name: 'Workflow Optimization',
    category: 'productivity',
    what: 'Identify inefficiencies and suggest improvements to your processes',
    why: 'Work smarter, not harder. Free up time for high-impact work.',
    icon: '⚙️',
    examples: ['Process automation', 'Tool recommendations', 'Efficiency tips']
  },
  {
    id: 'decision-making',
    name: 'Decision Support',
    category: 'productivity',
    what: 'Provide frameworks and analysis to help make better decisions',
    why: 'Reduce decision paralysis. Feel confident in your choices.',
    icon: '🎲',
    examples: ['Decision matrices', 'Risk analysis', 'Option evaluation']
  },
  {
    id: 'learning',
    name: 'Learning & Teaching',
    category: 'productivity',
    what: 'Explain complex topics in simple terms or create learning materials',
    why: 'Learn faster and retain more. Share knowledge effectively with others.',
    icon: '🎓',
    examples: ['ELI5 explanations', 'Tutorial creation', 'Concept breakdowns']
  },

  // Advanced Capabilities
  {
    id: 'context-awareness',
    name: 'Long Context Understanding',
    category: 'advanced',
    what: 'Maintain understanding across long conversations and large codebases',
    why: 'Work on complex projects without repeating yourself. Get consistent help across multiple sessions.',
    icon: '🧠',
    examples: ['Multi-file refactoring', 'Codebase navigation', 'Project continuity']
  },
  {
    id: 'multimodal',
    name: 'Image Understanding',
    category: 'advanced',
    what: 'Analyze images, diagrams, screenshots, and visual content',
    why: 'Show instead of describe. Get help with UI, diagrams, or any visual content.',
    icon: '🖼️',
    examples: ['Screenshot debugging', 'Diagram analysis', 'UI feedback']
  },
  {
    id: 'reasoning',
    name: 'Advanced Reasoning',
    category: 'advanced',
    what: 'Handle complex logical reasoning and multi-step problem solving',
    why: 'Tackle sophisticated challenges. Get help with problems that require deep thinking.',
    icon: '🤔',
    examples: ['Algorithm design', 'System architecture', 'Complex debugging']
  },
  {
    id: 'automation',
    name: 'Tool Use & Automation',
    category: 'advanced',
    what: 'Interact with external tools, APIs, and systems autonomously',
    why: 'Automate repetitive tasks. Let Claude handle the tedious work while you focus on strategy.',
    icon: '🤖',
    examples: ['API integration', 'Data fetching', 'System automation']
  },
  {
    id: 'collaboration',
    name: 'Collaborative Development',
    category: 'advanced',
    what: 'Work alongside you through multiple iterations to achieve complex goals',
    why: 'Build ambitious projects faster. Have a coding partner available 24/7.',
    icon: '🤝',
    examples: ['Feature development', 'Architecture design', 'System building']
  },
];
