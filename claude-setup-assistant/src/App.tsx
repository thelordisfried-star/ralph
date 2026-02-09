import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setupSections, getCompletedItems, setItemCompleted, getProgress } from './setupData';
import './App.css';

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setCompletedItems(getCompletedItems());
  }, []);

  const currentSection = setupSections[currentStep];
  const progress = getProgress();

  const handleCheckbox = (itemId: string) => {
    const isCompleted = completedItems.has(itemId);
    setItemCompleted(itemId, !isCompleted);
    setCompletedItems(getCompletedItems());
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'essential': return '#ef4444';
      case 'recommended': return '#f59e0b';
      case 'optional': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'essential': return '🔴 Essential';
      case 'recommended': return '🟡 Recommended';
      case 'optional': return '⚪ Optional';
      default: return priority;
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="header-content"
        >
          <h1 className="title">
            <span className="gradient-text">Claude Code Setup Assistant</span>
          </h1>
          <p className="subtitle">
            Your guide to becoming a Claude Code power user
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="progress-section"
        >
          <div className="progress-info">
            <span className="progress-text">
              {progress.completed} of {progress.total} items completed
            </span>
            <span className="progress-percent">{progress.percentage}%</span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      </header>

      {/* Dashboard Navigation */}
      <div className="dashboard-nav">
        {setupSections.map((section, index) => {
          const sectionItems = section.items;
          const completedInSection = sectionItems.filter(item => completedItems.has(item.id)).length;
          const isActive = index === currentStep;

          return (
            <motion.button
              key={section.id}
              className={`nav-card ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentStep(index)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                '--section-color': section.color,
              } as React.CSSProperties}
            >
              <div className="nav-card-emoji">{section.emoji}</div>
              <div className="nav-card-content">
                <h3 className="nav-card-title">{section.title}</h3>
                <div className="nav-card-progress">
                  {completedInSection}/{sectionItems.length}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Main Content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="section-content"
          >
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-emoji">{currentSection.emoji}</span>
                {currentSection.title}
              </h2>
              <p className="section-description">{currentSection.description}</p>
            </div>

            <div className="items-list">
              {currentSection.items.map((item, index) => {
                const isCompleted = completedItems.has(item.id);
                const isCopied = copiedId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`item-card ${isCompleted ? 'completed' : ''}`}
                  >
                    <div className="item-header">
                      <div className="item-title-row">
                        <label className="checkbox-container">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleCheckbox(item.id)}
                          />
                          <span className="checkmark"></span>
                        </label>
                        <div>
                          <h3 className="item-title">{item.title}</h3>
                          <span
                            className="item-priority"
                            style={{ color: getPriorityColor(item.priority) }}
                          >
                            {getPriorityLabel(item.priority)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="item-description">{item.description}</p>

                    <div className="item-why">
                      <strong>💡 Why:</strong> {item.why}
                    </div>

                    {item.command && (
                      <div className="item-code-block">
                        <div className="code-header">
                          <span className="code-label">📋 Command</span>
                          <button
                            className="copy-btn"
                            onClick={() => copyToClipboard(item.command!, item.id)}
                          >
                            {isCopied ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <code className="code-content">{item.command}</code>
                      </div>
                    )}

                    {item.code && (
                      <div className="item-code-block">
                        <div className="code-header">
                          <span className="code-label">📝 Code</span>
                          <button
                            className="copy-btn"
                            onClick={() => copyToClipboard(item.code!, item.id)}
                          >
                            {isCopied ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <pre className="code-content">{item.code}</pre>
                      </div>
                    )}

                    {item.link && (
                      <div className="item-link">
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          📚 Learn more →
                        </a>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation Buttons */}
      <div className="nav-buttons">
        <button
          className="nav-btn"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          ← Previous
        </button>
        <div className="step-indicator">
          Step {currentStep + 1} of {setupSections.length}
        </div>
        <button
          className="nav-btn"
          onClick={() => setCurrentStep(Math.min(setupSections.length - 1, currentStep + 1))}
          disabled={currentStep === setupSections.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default App;
